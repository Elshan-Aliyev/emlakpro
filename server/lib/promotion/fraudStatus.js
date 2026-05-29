'use strict';

const FRAUD_STATUSES = Object.freeze({
  NORMAL:    'NORMAL',
  WARNING:   'WARNING',
  REVIEW:    'REVIEW',
  SUSPENDED: 'SUSPENDED',  // terminal state — listing hidden from public
});

// Report count thresholds (inclusive lower bounds)
const THRESHOLDS = Object.freeze({
  SUSPENDED: 8,
  REVIEW:    5,
  WARNING:   3,
});

/**
 * Derive fraud status from a raw report count.
 * Pure function — no DB access, no side effects.
 *
 * @param {number} reportCount
 * @returns {'NORMAL'|'WARNING'|'REVIEW'|'SUSPENDED'}
 */
function getFraudStatus(reportCount) {
  const count = reportCount || 0;
  if (count >= THRESHOLDS.SUSPENDED) return FRAUD_STATUSES.SUSPENDED;
  if (count >= THRESHOLDS.REVIEW)    return FRAUD_STATUSES.REVIEW;
  if (count >= THRESHOLDS.WARNING)   return FRAUD_STATUSES.WARNING;
  return FRAUD_STATUSES.NORMAL;
}

module.exports = { getFraudStatus, FRAUD_STATUSES, THRESHOLDS };
