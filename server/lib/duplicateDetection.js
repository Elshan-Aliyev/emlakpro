const crypto = require('crypto');
const Property = require('../models/Property');
const User     = require('../models/User');
const { hammingDistance, hashPropertyImages } = require('./imageHash');

// ─── Constants ────────────────────────────────────────────────────────────────
const WINDOW_DAYS     = 90;          // only compare against listings from last 90 days
const CANDIDATE_LIMIT = 100;         // max candidates per text/image check
const HASH_DISTANCE   = 10;          // max Hamming distance to flag image similarity (out of 64)
const TITLE_THRESHOLD = 0.60;        // Jaccard similarity to flag title match
const COORD_RADIUS_M  = 100;         // metres for coordinate proximity
const PRICE_BAND      = 0.20;        // ±20 % price band for coordinate check

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')   // strip punctuation (unicode-aware)
    .replace(/\s+/g, ' ')
    .trim();
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size && !setB.size) return 1;
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  setA.forEach(w => { if (setB.has(w)) intersection++; });
  return intersection / (setA.size + setB.size - intersection);
}

function tokenize(text) {
  return new Set(normalizeTitle(text).split(' ').filter(w => w.length > 2));
}

// Approximate distance in metres between two lat/lng points
function distanceMetres(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * 111_000;
  const dLng = (lng2 - lng1) * 111_000 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Build the scoped base query shared by all checks
function buildBaseQuery(property) {
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const q = {
    _id:       { $ne: property._id },
    createdAt: { $gte: cutoff },
  };
  if (property.city)         q.city         = property.city;
  if (property.propertyType) q.propertyType = property.propertyType;
  return q;
}

// ─── Individual checks ────────────────────────────────────────────────────────

/**
 * CHECK 1 — Shared phone number.
 * If the owner shares a phone with other users who also have listings in scope, flag it.
 */
async function checkPhone(property, ownerId, baseQuery) {
  const owner = await User.findById(ownerId).select('phone').lean();
  if (!owner?.phone) return [];

  const samePhoneUsers = await User.find({
    phone: owner.phone,
    _id: { $ne: ownerId },
  }).select('_id').lean();

  if (!samePhoneUsers.length) return [];

  const count = await Property.countDocuments({
    ...baseQuery,
    ownerId: { $in: samePhoneUsers.map(u => u._id) },
  });

  return count > 0 ? ['Shared phone number'] : [];
}

/**
 * CHECK 2 — Coordinate proximity.
 * Within ~100 m, same property type (already in baseQuery), price within ±20 %.
 */
async function checkCoordinates(property, baseQuery) {
  const { lat, lng } = property.coordinates || {};
  if (!lat || !lng || !property.price) return [];

  // Rough bounding box: 0.001° ≈ 111 m
  const delta = 0.001;
  const candidates = await Property.find({
    ...baseQuery,
    'coordinates.lat': { $gte: lat - delta, $lte: lat + delta },
    'coordinates.lng': { $gte: lng - delta, $lte: lng + delta },
    price: {
      $gte: property.price * (1 - PRICE_BAND),
      $lte: property.price * (1 + PRICE_BAND),
    },
  }).select('_id coordinates').lean();

  const within = candidates.filter(
    c =>
      c.coordinates?.lat &&
      c.coordinates?.lng &&
      distanceMetres(lat, lng, c.coordinates.lat, c.coordinates.lng) <= COORD_RADIUS_M
  );

  return within.length > 0 ? ['Nearby similar listing'] : [];
}

/**
 * CHECK 3 — Title similarity (Jaccard ≥ 60 %).
 * Scoped + limited to CANDIDATE_LIMIT most recent listings.
 */
async function checkTitle(property, baseQuery) {
  if (!property.title) return [];

  const tokens = tokenize(property.title);
  if (tokens.size < 3) return []; // too short to be meaningful

  const candidates = await Property.find(baseQuery)
    .select('title')
    .sort({ createdAt: -1 })
    .limit(CANDIDATE_LIMIT)
    .lean();

  const match = candidates.find(c => {
    if (!c.title) return false;
    return jaccardSimilarity(tokens, tokenize(c.title)) >= TITLE_THRESHOLD;
  });

  return match ? ['Similar title'] : [];
}

/**
 * CHECK 4 — Image hash similarity (dHash, Hamming distance ≤ HASH_DISTANCE).
 * Only runs if the property has imageHashes stored.
 * Scoped + limited.
 */
async function checkImages(property, baseQuery) {
  if (!property.imageHashes?.length) return [];

  const candidates = await Property.find({
    ...baseQuery,
    imageHashes: { $exists: true, $not: { $size: 0 } },
  })
    .select('imageHashes')
    .sort({ createdAt: -1 })
    .limit(CANDIDATE_LIMIT)
    .lean();

  outer: for (const candidate of candidates) {
    for (const h1 of property.imageHashes) {
      for (const h2 of candidate.imageHashes) {
        if (hammingDistance(h1, h2) <= HASH_DISTANCE) {
          break outer;     // one match is enough — fall through to return
        }
      }
    }
    continue;
    // eslint-disable-next-line no-unreachable
    return ['Similar images'];
  }

  // Cleaner loop
  for (const candidate of candidates) {
    for (const h1 of property.imageHashes) {
      for (const h2 of candidate.imageHashes || []) {
        if (hammingDistance(h1, h2) <= HASH_DISTANCE) {
          return ['Similar images'];
        }
      }
    }
  }

  return [];
}

// ─── Group ID resolution ──────────────────────────────────────────────────────

/**
 * If any matched listing already belongs to a group, reuse that group ID.
 * Otherwise mint a new one.
 * We don't update matched listings here — they'll pick up the group when rescored.
 */
async function resolveGroupId(existingGroupId, reasons) {
  if (!reasons.length) return null;
  if (existingGroupId) return existingGroupId;

  // Mint a short deterministic-looking ID
  return 'dup-' + crypto.randomBytes(6).toString('hex');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Step 1 — hash the property's images and store them.
 * Returns the array of computed hashes.
 * Call this BEFORE runDuplicateChecks so Check 4 has data to work with.
 */
async function computeAndStoreImageHashes(propertyId, images) {
  try {
    const hashes = await hashPropertyImages(images, 3);
    if (hashes.length) {
      await Property.findByIdAndUpdate(propertyId, { imageHashes: hashes });
    }
    return hashes;
  } catch (err) {
    console.error('[duplicateDetection] image hash error:', err.message);
    return [];
  }
}

/**
 * Step 2 — run all 4 checks and persist results.
 * @param {object} property - lean Property document (including any freshly stored imageHashes)
 * @param {string|ObjectId} ownerId
 */
async function runDuplicateChecks(property, ownerId) {
  try {
    const baseQuery = buildBaseQuery(property);

    const [phoneReasons, coordReasons, titleReasons, imageReasons] = await Promise.all([
      checkPhone(property, ownerId, baseQuery),
      checkCoordinates(property, baseQuery),
      checkTitle(property, baseQuery),
      checkImages(property, baseQuery),
    ]);

    const reasons = [...new Set([
      ...phoneReasons,
      ...coordReasons,
      ...titleReasons,
      ...imageReasons,
    ])];

    const suspected  = reasons.length > 0;
    const groupId    = await resolveGroupId(property.duplicateGroupId, reasons);

    await Property.findByIdAndUpdate(property._id, {
      suspectedDuplicate: suspected,
      duplicateReasons:   reasons,
      duplicateGroupId:   groupId,
    });

    if (suspected) {
      console.log(`[duplicateDetection] Flagged ${property._id}: ${reasons.join(', ')}`);
    }
  } catch (err) {
    console.error('[duplicateDetection] check error:', err);
  }
}

/**
 * Full pipeline: hash images → run checks.
 * Designed to run async (fire-and-forget) after listing save.
 */
async function detectDuplicatesAsync(propertyId, ownerId) {
  try {
    // Fetch fresh from DB so we always have the latest images
    const property = await Property.findById(propertyId)
      .select('city propertyType price title coordinates images imageHashes duplicateGroupId ownerId')
      .lean();

    if (!property) return;

    // Hash images if not yet done (or if images were updated)
    const freshHashes = await computeAndStoreImageHashes(propertyId, property.images);
    const propertyWithHashes = { ...property, imageHashes: freshHashes.length ? freshHashes : property.imageHashes };

    await runDuplicateChecks(propertyWithHashes, ownerId);
  } catch (err) {
    console.error('[duplicateDetection] pipeline error:', err);
  }
}

module.exports = { detectDuplicatesAsync };
