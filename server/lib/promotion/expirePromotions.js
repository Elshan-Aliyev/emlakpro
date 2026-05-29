'use strict';

const Property = require('../../models/Property');

/**
 * Find all listings whose promotionEndDate has passed and reset them to FREE.
 *
 * Safe to call on every admin listing fetch — uses a targeted index query
 * (promotionTier + isPromoted + promotionEndDate) and bulk-updates in one round-trip.
 *
 * Returns the count of listings that were reset.
 * Phase 5.3: replace the manual call with a scheduled cron job.
 *
 * @returns {Promise<number>} count of expired listings reset to FREE
 */
async function expireStalePromotions() {
  const now = new Date();

  const result = await Property.updateMany(
    {
      isPromoted:       true,
      promotionEndDate: { $ne: null, $lt: now },
    },
    {
      $set: {
        promotionTier:      'FREE',
        promotionScore:     1,
        isPromoted:         false,
        promotionStartDate: null,
        promotionEndDate:   null,
        // finalScore is zeroed here; the ranking engine will recompute it
        // on the next admin promotion action or quality rescore.
        finalScore: 0,
      },
    },
  );

  const count = result.modifiedCount || 0;
  if (count > 0) {
    console.log(`[expirePromotions] Reset ${count} expired listing(s) to FREE`);
  }
  return count;
}

module.exports = { expireStalePromotions };
