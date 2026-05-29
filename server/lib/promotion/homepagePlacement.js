'use strict';

const Property = require('../../models/Property');
const { NEW_LISTING_DAYS } = require('./isNewListing');

const MAX_SPOTLIGHT = 5;  // Maximum hero slots on homepage

// Shared projection for homepage cards
const HOMEPAGE_SELECT =
  'title price currency city location coordinates images listingStatus ' +
  'promotionTier promotionScore isPromoted createdAt qualityScore finalScore';

// Returns Mongoose $and condition ensuring promotion window is currently active
function activePromoFilter(now) {
  return {
    $and: [
      { $or: [{ promotionStartDate: null }, { promotionStartDate: { $lte: now } }] },
      { $or: [{ promotionEndDate:   null }, { promotionEndDate:   { $gte: now } }] },
    ],
  };
}

/**
 * Up to 5 SPOTLIGHT listings ordered by freshness.
 * These appear in the homepage hero placement slot.
 */
async function getSpotlightListings() {
  const now = new Date();
  const results = await Property.find({
    isApproved:    true,
    status:        'active',
    promotionTier: 'SPOTLIGHT',
    isPromoted:    true,
    ...activePromoFilter(now),
  })
    .sort({ createdAt: -1 })
    .limit(MAX_SPOTLIGHT)
    .select(HOMEPAGE_SELECT)
    .lean();

  console.log(`[homepagePlacement] spotlightListings: ${results.length} (max ${MAX_SPOTLIGHT})`);
  return results;
}

/**
 * Active FEATURED-tier listings for the homepage "Featured" section.
 * FEATURED gives a light search boost (×1.15) but its primary benefit
 * is homepage placement — this selector surfaces those listings.
 */
async function getFeaturedListings() {
  const now = new Date();
  const results = await Property.find({
    isApproved:    true,
    status:        'active',
    promotionTier: 'FEATURED',
    isPromoted:    true,
    ...activePromoFilter(now),
  })
    .sort({ finalScore: -1, createdAt: -1 })
    .select(HOMEPAGE_SELECT)
    .lean();

  console.log(`[homepagePlacement] featuredListings: ${results.length}`);
  return results;
}

/**
 * Listings published within the last 14 days.
 * Excludes SPOTLIGHT and FEATURED (they have dedicated sections).
 */
async function getNewListings({ limit = 20 } = {}) {
  const cutoff = new Date(Date.now() - NEW_LISTING_DAYS * 86_400_000);
  const results = await Property.find({
    isApproved:    true,
    status:        'active',
    createdAt:     { $gte: cutoff },
    promotionTier: { $nin: ['SPOTLIGHT', 'FEATURED'] },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(HOMEPAGE_SELECT)
    .lean();

  console.log(`[homepagePlacement] newListings: ${results.length}`);
  return results;
}

/**
 * Organic recent listings feed.
 * Excludes SPOTLIGHT and FEATURED (they have dedicated sections).
 */
async function getRecentListings({ limit = 20 } = {}) {
  const results = await Property.find({
    isApproved:    true,
    status:        'active',
    promotionTier: { $nin: ['SPOTLIGHT', 'FEATURED'] },
  })
    .sort({ finalScore: -1, qualityScore: -1, createdAt: -1 })
    .limit(limit)
    .select(HOMEPAGE_SELECT)
    .lean();

  console.log(`[homepagePlacement] recentListings: ${results.length}`);
  return results;
}

module.exports = {
  getSpotlightListings,
  getFeaturedListings,
  getNewListings,
  getRecentListings,
  MAX_SPOTLIGHT,
};
