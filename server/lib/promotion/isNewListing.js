'use strict';

const NEW_LISTING_DAYS = 14;

/**
 * Returns true if the listing was published within the last 14 days.
 * Powers: homepage new-listings section, future filter badge, future UI badge.
 *
 * @param {Date|string} createdAt
 * @returns {boolean}
 */
function isNewListing(createdAt) {
  if (!createdAt) return false;
  const cutoffMs = NEW_LISTING_DAYS * 24 * 60 * 60 * 1000;
  return (Date.now() - new Date(createdAt).getTime()) < cutoffMs;
}

module.exports = { isNewListing, NEW_LISTING_DAYS };
