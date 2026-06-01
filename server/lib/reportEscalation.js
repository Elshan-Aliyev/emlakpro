const Report = require('../models/Report');

// ─── Thresholds ───────────────────────────────────────────────────────────────
const TRUSTED_REPORTER_MIN_UPHELD = 3;  // resolved reports needed to count as trusted
const URGENT_REPORT_COUNT   = 5;
const ELEVATED_REPORT_COUNT = 3;
const URGENT_TRUSTED_COUNT  = 2;
const ELEVATED_TRUSTED_COUNT = 1;

// Categories that escalate faster when combined with trusted reporters
const HIGH_SEVERITY_CATEGORIES = new Set(['scam-fraud', 'fake-listing', 'scam-attempt']);

/**
 * Return whether a reporter has had enough reports upheld to be "trusted".
 * Cached per call — not stored on User to avoid staleness.
 */
async function isTrustedReporter(reporterId) {
  const upheld = await Report.countDocuments({
    reporterId,
    status: 'resolved',
  });
  return upheld >= TRUSTED_REPORTER_MIN_UPHELD;
}

/**
 * Compute the escalation level for all open reports against a target.
 *
 * Returns:
 *   { level: 'normal'|'elevated'|'urgent', trustedCount: number, total: number }
 *
 * Used to:
 *  - Set `moderationPriority` bump on the Property
 *  - Drive admin queue sort order
 */
async function computeEscalation(targetId, targetType) {
  const openReports = await Report.find({
    targetId,
    targetType,
    status: { $in: ['open', 'reviewing'] },
  })
    .select('reporterId category')
    .lean();

  const total = openReports.length;
  if (total === 0) return { level: 'normal', trustedCount: 0, total: 0 };

  // Count trusted reporters among this target's reporters
  const trustedFlags = await Promise.all(
    openReports.map((r) => isTrustedReporter(r.reporterId))
  );
  const trustedCount = trustedFlags.filter(Boolean).length;

  const hasHighSeverity = openReports.some((r) => HIGH_SEVERITY_CATEGORIES.has(r.category));

  let level = 'normal';

  if (
    total >= URGENT_REPORT_COUNT ||
    trustedCount >= URGENT_TRUSTED_COUNT ||
    (hasHighSeverity && trustedCount >= 1 && total >= 3)
  ) {
    level = 'urgent';
  } else if (total >= ELEVATED_REPORT_COUNT || trustedCount >= ELEVATED_TRUSTED_COUNT) {
    level = 'elevated';
  }

  return { level, trustedCount, total };
}

/**
 * Apply escalation results to a property document.
 * Bumps moderationPriority proportionally.
 * Fire-and-forget safe.
 */
async function applyEscalationToProperty(propertyId, ownerId) {
  try {
    const Property = require('../models/Property');
    const { level, trustedCount, total } = await computeEscalation(propertyId, 'property');

    const bump = level === 'urgent' ? 3 : level === 'elevated' ? 1 : 0;
    const escalationLabel =
      level === 'urgent' ? 'Urgent: escalated reports' :
      level === 'elevated' ? 'Elevated: repeated reports' : null;

    const update = { reportEscalationLevel: level };
    if (bump > 0) {
      update.$inc = { moderationPriority: bump };
      if (escalationLabel) {
        update.$addToSet = { moderationReasons: escalationLabel };
      }
    }

    await Property.findByIdAndUpdate(propertyId, update);

    if (level !== 'normal') {
      console.log(`[reportEscalation] ${propertyId} → ${level} (${total} reports, ${trustedCount} trusted)`);
    }
  } catch (err) {
    console.error('[reportEscalation] error:', err.message);
  }
}

module.exports = { computeEscalation, applyEscalationToProperty };
