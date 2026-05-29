'use strict';

/**
 * Canonical promotion tier ordering.
 * All other promotion files import from here — never redeclare.
 */

const VALID_TIERS = Object.freeze(['FREE', 'FEATURED', 'PREMIUM', 'SPOTLIGHT']);

// Integer rank used for DB sort and display ordering
const TIER_SCORES = Object.freeze({
  FREE:      1,
  FEATURED:  2,
  PREMIUM:   3,
  SPOTLIGHT: 4,
});

// Search-rank multipliers applied to organicScore
// FEATURED = ×1.15: light search presence + homepage featured section
// PREMIUM  = ×1.5:  significant search boost
// SPOTLIGHT = ×3.0: dominant placement — homepage hero + search top
const PROMOTION_MULTIPLIERS = Object.freeze({
  FREE:      1.00,
  FEATURED:  1.15,
  PREMIUM:   1.50,
  SPOTLIGHT: 3.00,
});

// Fixed promotion duration presets (in days)
// Used by admin UI for quick date-range selection; future payment tiers map to these.
const PROMOTION_DURATIONS_DAYS = Object.freeze({
  WEEK:      7,
  BIWEEKLY: 14,
  MONTHLY:  30,
  QUARTERLY: 90,
});

module.exports = {
  VALID_TIERS,
  TIER_SCORES,
  PROMOTION_MULTIPLIERS,
  PROMOTION_DURATIONS_DAYS,
};
