'use strict';
const mongoose      = require('mongoose');
const PropertyReview   = require('../../models/PropertyReview');
const PropertyIdentity = require('../../models/PropertyIdentity');

/**
 * Recompute reputation aggregates for a PropertyIdentity and persist them.
 * Only status === 'active' reviews count toward aggregates.
 * Called after every review create / edit / delete / moderation.
 *
 * @param {string|ObjectId} propertyIdentityId
 */
async function updatePropertyReputationAggregates(propertyIdentityId) {
  const id = propertyIdentityId instanceof mongoose.Types.ObjectId
    ? propertyIdentityId
    : mongoose.Types.ObjectId.createFromHexString(String(propertyIdentityId));

  const agg = await PropertyReview.aggregate([
    { $match: { propertyIdentityId: id, status: 'active' } },
    { $group: {
      _id:            null,
      avgRating:      { $avg: '$rating' },
      reviewCount:    { $sum: 1 },
      recommendCount: { $sum: { $cond: ['$recommended', 1, 0] } },
      lastReviewAt:   { $max: '$createdAt' },
    }},
  ]);

  const r             = agg[0] || {};
  const reviewCount   = r.reviewCount   || 0;
  const recommendCount = r.recommendCount || 0;

  await PropertyIdentity.findByIdAndUpdate(propertyIdentityId, {
    avgRating:           reviewCount > 0 ? Math.round((r.avgRating || 0) * 100) / 100 : 0,
    reviewCount,
    recommendCount,
    recommendPercentage: reviewCount > 0 ? Math.round((recommendCount / reviewCount) * 100) : 0,
    lastReviewAt:        r.lastReviewAt || null,
  });
}

module.exports = { updatePropertyReputationAggregates };
