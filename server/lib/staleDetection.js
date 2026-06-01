const THRESHOLDS = {
  AGING:      30,   // days — show "aging" warning
  STALE:      60,   // days — show "stale" badge
  CRITICAL:   90,   // days — show "critical" banner
  RECONFIRM:  45,   // days — prompt owner "still available?"
};

function daysSince(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function computeStaleness(property) {
  const lastActivity = property.lastOwnerActivityAt || property.updatedAt || property.createdAt;
  const days = Math.floor(daysSince(lastActivity));

  let level = 'fresh';
  if (days >= THRESHOLDS.CRITICAL)     level = 'critical';
  else if (days >= THRESHOLDS.STALE)   level = 'stale';
  else if (days >= THRESHOLDS.AGING)   level = 'aging';

  const lastConfirmed = property.lastConfirmedAvailableAt;
  const needsReconfirm =
    (level !== 'fresh') &&
    (!lastConfirmed || daysSince(lastConfirmed) >= THRESHOLDS.RECONFIRM);

  return { level, days, needsReconfirm };
}

function computePhotoHygiene(property) {
  const count = Array.isArray(property.images) ? property.images.length : 0;
  let score = 0;
  let note = null;

  if (count === 0)       { score = 0;   note = 'No photos — listings with photos get far more views'; }
  else if (count < 3)    { score = 30;  note = 'Add more photos (at least 3 recommended)'; }
  else if (count < 6)    { score = 65;  note = '6+ photos recommended for best results'; }
  else if (count < 8)    { score = 85; }
  else                   { score = 100; }

  return { count, score, note };
}

function computePriceOutlier(property, cityAvg) {
  if (!cityAvg || !property.price) return { isOutlier: false, type: null };

  const ratio = property.price / cityAvg;

  if (ratio < 0.35) return { isOutlier: true, type: 'suspiciously-low', ratio: Math.round(ratio * 100) / 100 };
  if (ratio > 3.5)  return { isOutlier: true, type: 'suspiciously-high', ratio: Math.round(ratio * 100) / 100 };

  if (property.previousPrice && property.previousPrice > 0) {
    const drop = (property.previousPrice - property.price) / property.previousPrice;
    if (drop >= 0.30) {
      return {
        isOutlier: true,
        type: 'sudden-drop',
        ratio: Math.round(ratio * 100) / 100,
        delta: Math.round(drop * 100),
      };
    }
  }

  return { isOutlier: false, type: null, ratio: Math.round(ratio * 100) / 100 };
}

function computeVisibilityScore(property, staleness, photo) {
  const quality = property.qualityScore || 0;

  const stalenessPenalty =
    staleness.level === 'critical' ? 40 :
    staleness.level === 'stale'    ? 25 :
    staleness.level === 'aging'    ? 10 : 0;

  const moderationPenalty = property.flaggedForReview ? 20 : 0;

  return Math.max(0, Math.min(100, quality - stalenessPenalty - moderationPenalty));
}

module.exports = {
  computeStaleness,
  computePhotoHygiene,
  computePriceOutlier,
  computeVisibilityScore,
  THRESHOLDS,
};
