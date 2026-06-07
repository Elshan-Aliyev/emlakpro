'use strict';
const PropertyIdentity = require('../../models/PropertyIdentity');

/**
 * Build a stable fingerprint from a property document.
 * Rules:
 *   - lowercase, remove punctuation (keep digits — apt 5 ≠ apt 8)
 *   - collapse whitespace
 *   - roomCount 0 → 1 (studio = 1 room)
 */
function buildFingerprint(property) {
  const raw = (property.fullAddress || property.location || '').trim();
  const normalizedAddress = raw
    .toLowerCase()
    .replace(/[^\w\s\d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    normalizedAddress,
    roomCount:    (!property.bedrooms || property.bedrooms === 0) ? 1 : property.bedrooms,
    propertyType: property.propertyType || 'unknown',
  };
}

/**
 * Find or create the PropertyIdentity for the given property.
 * Does NOT modify the property document — caller is responsible.
 * @param {Object} property - Mongoose document or plain object
 * @returns {Promise<PropertyIdentity>}
 */
async function resolvePropertyIdentity(property) {
  const fp = buildFingerprint(property);
  let identity = await PropertyIdentity.findOne({ fingerprint: fp });
  if (!identity) {
    identity = await PropertyIdentity.create({
      fingerprint:        fp,
      fingerprintVersion: 1,
    });
  }
  return identity;
}

module.exports = { buildFingerprint, resolvePropertyIdentity };
