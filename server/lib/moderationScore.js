const Property = require('../models/Property');
const User = require('../models/User');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculates a moderation priority score for a listing.
 * Higher score = higher risk = should be reviewed first.
 * Internal only — never exposed in public API responses.
 *
 * @param {string|ObjectId} propertyId
 * @param {string|ObjectId} ownerId
 * @returns {Promise<{ score: number, reasons: string[] }>}
 */
async function calculateModerationPriority(propertyId, ownerId) {
  let score = 0;
  const reasons = [];

  const [property, owner] = await Promise.all([
    Property.findById(propertyId).select('price city reportCount createdAt ownerId').lean(),
    User.findById(ownerId).select('accountType verified phone createdAt').lean(),
  ]);

  if (!property || !owner) return { score: 0, reasons: [] };

  // +2 — owner not verified
  if (!owner.verified && owner.accountType === 'unverified-user') {
    score += 2;
    reasons.push('Owner not verified');
  }

  // +3 — high report count
  if ((property.reportCount || 0) >= 3) {
    score += 3;
    reasons.push(`High report count (${property.reportCount})`);
  }

  // +1 — new account (< 7 days old)
  const accountAgeDays = (Date.now() - new Date(owner.createdAt).getTime()) / MS_PER_DAY;
  if (accountAgeDays < 7) {
    score += 1;
    reasons.push('Account created within the last 7 days');
  }

  // +3 — listing burst: owner posted > 3 listings in the past 24h
  const oneDayAgo = new Date(Date.now() - MS_PER_DAY);
  const burstCount = await Property.countDocuments({
    ownerId,
    _id: { $ne: propertyId },
    createdAt: { $gte: oneDayAgo },
  });
  if (burstCount >= 3) {
    score += 3;
    reasons.push(`Listing burst: ${burstCount + 1} listings created in 24 hours`);
  }

  // +2 — phone number shared across 3+ accounts
  if (owner.phone) {
    const phoneAccounts = await User.countDocuments({ phone: owner.phone });
    if (phoneAccounts >= 3) {
      score += 2;
      reasons.push(`Phone number shared across ${phoneAccounts} accounts`);
    }
  }

  // +2 — price suspiciously below city average (< 40% of average, min 5 comparable listings)
  if (property.city && property.price) {
    const [agg] = await Property.aggregate([
      {
        $match: {
          city: property.city,
          status: 'active',
          isApproved: true,
          _id: { $ne: property._id },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
        },
      },
    ]);

    if (agg && agg.count >= 5 && property.price < agg.avgPrice * 0.4) {
      score += 2;
      reasons.push(
        `Price suspiciously low (${property.price.toLocaleString()} vs city avg ${Math.round(agg.avgPrice).toLocaleString()})`
      );
    }
  }

  return { score, reasons };
}

module.exports = { calculateModerationPriority };
