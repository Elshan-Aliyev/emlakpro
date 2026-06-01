const Property = require('../models/Property');
const User = require('../models/User');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MIN = 60 * 1000;

// ─── Trust level definitions ──────────────────────────────────────────────────
//
// Levels increase with verifiable account signals. Limits relax accordingly.
// Admins/professionals bypass checks entirely (level 4).
//
// level | dailyLimit | cooldownMin | label
// ────────────────────────────────────────
//   0   |     1      |      5      | new account (< 7 days)
//   1   |     2      |      3      | unverified (email only or none)
//   2   |     5      |      1      | phone-verified
//   3   |    10      |      0      | ownership-verified
//   4   |  unlimited |      0      | admin / realtor / premium

const TRUST_PROFILES = {
  0: { dailyLimit: 1,   cooldownMs: 5 * MS_PER_MIN },
  1: { dailyLimit: 2,   cooldownMs: 3 * MS_PER_MIN },
  2: { dailyLimit: 5,   cooldownMs: 1 * MS_PER_MIN },
  3: { dailyLimit: 10,  cooldownMs: 0               },
  4: { dailyLimit: 999, cooldownMs: 0               },
};

/**
 * Compute a 0–4 trust level for a user based on verifiable signals.
 */
async function computeTrustLevel(userId) {
  const user = await User.findById(userId)
    .select('role accountType phoneVerified ownershipVerified emailVerified createdAt subscriptionTier')
    .lean();

  if (!user) return 0;

  // Privileged roles: no restrictions
  if (['admin', 'superadmin', 'realtor', 'corporate'].includes(user.role)) return 4;
  if (['premium', 'corporate'].includes(user.subscriptionTier)) return 4;

  // Ownership verified — strong identity signal
  if (user.ownershipVerified) return 3;

  // Phone verified — medium signal
  if (user.phoneVerified) return 2;

  // New account regardless of email status: hardest limits
  const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / MS_PER_DAY;
  if (ageDays < 7) return 0;

  // Email verified or just an established account
  return 1;
}

/**
 * Check whether a user is allowed to create a new listing right now.
 *
 * Returns:
 *   { allowed: true, trustLevel, dailyUsed, dailyLimit }
 *   { allowed: false, reason: 'daily_limit'|'cooldown', retryAfterMs }
 */
async function checkListingQuota(userId) {
  const trustLevel = await computeTrustLevel(userId);
  const profile = TRUST_PROFILES[trustLevel];

  const oneDayAgo = new Date(Date.now() - MS_PER_DAY);

  // Count listings created in the past 24 hours
  const todayCount = await Property.countDocuments({
    ownerId: userId,
    createdAt: { $gte: oneDayAgo },
  });

  if (todayCount >= profile.dailyLimit) {
    const oldestToday = await Property.findOne({ ownerId: userId, createdAt: { $gte: oneDayAgo } })
      .sort({ createdAt: 1 })
      .select('createdAt')
      .lean();
    const earliestResetMs = oldestToday
      ? MS_PER_DAY - (Date.now() - new Date(oldestToday.createdAt).getTime())
      : MS_PER_DAY;

    return { allowed: false, reason: 'daily_limit', retryAfterMs: Math.max(0, earliestResetMs) };
  }

  // Submission cooldown
  if (profile.cooldownMs > 0) {
    const lastListing = await Property.findOne({ ownerId: userId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    if (lastListing) {
      const elapsed = Date.now() - new Date(lastListing.createdAt).getTime();
      if (elapsed < profile.cooldownMs) {
        return {
          allowed: false,
          reason: 'cooldown',
          retryAfterMs: profile.cooldownMs - elapsed,
        };
      }
    }
  }

  return { allowed: true, trustLevel, dailyUsed: todayCount, dailyLimit: profile.dailyLimit };
}

module.exports = { computeTrustLevel, checkListingQuota };
