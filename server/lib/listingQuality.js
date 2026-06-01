const Property = require('../models/Property');
const User     = require('../models/User');

// ─── Scoring rules ────────────────────────────────────────────────────────────

const POSITIVE = [
  {
    key:    'ownershipVerified',
    points: 3,
    label:  'Ownership verified (+3)',
    test:   (p) => p.ownershipVerificationStatus === 'approved',
  },
  {
    key:    'phoneVerified',
    points: 2,
    label:  'Phone verified (+2)',
    test:   (_, o) => o?.phoneVerified === true,
  },
  {
    key:    'manyImages',
    points: 2,
    label:  '8+ images (+2)',
    test:   (p) => (p.images?.length || 0) >= 8,
  },
  {
    key:    'richDescription',
    points: 2,
    label:  'Detailed description (+2)',
    test:   (p) => (p.description?.length || 0) > 300,
  },
  {
    key:    'detailedFields',
    points: 1,
    label:  'Key property fields completed (+1)',
    test:   (p) => p.bedrooms > 0 && p.bathrooms > 0 && p.builtUpArea > 0,
  },
  {
    key:    'verifiedAccount',
    points: 1,
    label:  'Verified account (+1)',
    test:   (_, o) => o?.verified === true,
  },
];

const NEGATIVE = [
  {
    key:    'duplicate',
    points: -4,
    label:  'Suspected duplicate (-4)',
    test:   (p) => p.suspectedDuplicate === true,
  },
  {
    key:    'flagged',
    points: -3,
    label:  'Flagged for review (-3)',
    test:   (p) => p.flaggedForReview === true,
  },
  {
    key:    'manyReports',
    points: -3,
    label:  '3+ unresolved reports (-3)',
    test:   (p) => (p.reportCount || 0) >= 3,
  },
  {
    key:    'highRisk',
    points: -2,
    label:  'High moderation risk (-2)',
    test:   (p) => (p.moderationPriority || 0) >= 5,
  },
  {
    key:    'singleImage',
    points: -2,
    label:  'Only 1 image (-2)',
    test:   (p) => (p.images?.length || 0) === 1,
  },
  {
    key:    'shortDescription',
    points: -1,
    label:  'Very short description (-1)',
    test:   (p) => (p.description?.length || 0) < 50,
  },
];

// ─── Pure scoring function ────────────────────────────────────────────────────

function calculateListingQuality(property, owner) {
  let score = 0;
  const reasons = [];

  for (const rule of POSITIVE) {
    if (rule.test(property, owner)) {
      score += rule.points;
      reasons.push(rule.label);
    }
  }

  for (const rule of NEGATIVE) {
    if (rule.test(property, owner)) {
      score += rule.points; // negative
      reasons.push(rule.label);
    }
  }

  return { score: Math.max(0, score), reasons };
}

// ─── DB-backed recalculation ─────────────────────────────────────────────────

async function recalculateAndStoreQuality(propertyId, ownerId) {
  const [property, owner] = await Promise.all([
    Property.findById(propertyId)
      .select('ownershipVerificationStatus images description bedrooms bathrooms builtUpArea suspectedDuplicate flaggedForReview reportCount moderationPriority')
      .lean(),
    User.findById(ownerId).select('phoneVerified verified').lean(),
  ]);

  if (!property) return null;

  const { score, reasons } = calculateListingQuality(property, owner);
  await Property.findByIdAndUpdate(propertyId, { qualityScore: score, qualityReasons: reasons });
  return { score, reasons };
}

module.exports = { calculateListingQuality, recalculateAndStoreQuality };
