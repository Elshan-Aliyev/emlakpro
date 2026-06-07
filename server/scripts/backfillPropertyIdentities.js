'use strict';
/**
 * One-time backfill: resolve PropertyIdentity for all existing listings.
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   node server/scripts/backfillPropertyIdentities.js
 *
 * Logs: properties processed, identities created, identities matched, errors.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const BATCH_SIZE = 100;

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('[backfill] MONGO_URI / MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[backfill] Connected to MongoDB');

  const Property         = require('../models/Property');
  const PropertyIdentity = require('../models/PropertyIdentity');
  const { resolvePropertyIdentity } = require('../lib/reputation/resolveIdentity');

  let processed = 0, created = 0, matched = 0, errors = 0;
  const startTime = Date.now();

  // Reset all listingCounts to 0 before recomputing
  await PropertyIdentity.updateMany({}, { $set: { listingCount: 0 } });
  console.log('[backfill] Reset all listingCounts to 0');

  // Stream all properties in batches
  const total = await Property.countDocuments();
  console.log(`[backfill] Processing ${total} properties in batches of ${BATCH_SIZE}…`);

  const cursor = Property.find({}).lean().cursor({ batchSize: BATCH_SIZE });

  for await (const property of cursor) {
    try {
      const before  = await PropertyIdentity.countDocuments();
      const identity = await resolvePropertyIdentity(property);
      const after   = await PropertyIdentity.countDocuments();

      if (after > before) {
        created++;
      } else {
        matched++;
      }

      await identity.updateOne({ $inc: { listingCount: 1 } });

      // Link property to identity if not already linked correctly
      if (!property.propertyIdentityId || String(property.propertyIdentityId) !== String(identity._id)) {
        await Property.updateOne({ _id: property._id }, { propertyIdentityId: identity._id });
      }

      processed++;

      if (processed % BATCH_SIZE === 0) {
        console.log(`[backfill] Processed ${processed}/${total} properties…`);
      }
    } catch (err) {
      errors++;
      console.error(`[backfill] Error on property ${property._id}:`, err.message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('[backfill] ─── Complete ─────────────────────────────────────');
  console.log(`[backfill]   properties processed : ${processed}`);
  console.log(`[backfill]   identities created   : ${created}`);
  console.log(`[backfill]   identities matched   : ${matched}`);
  console.log(`[backfill]   errors               : ${errors}`);
  console.log(`[backfill]   elapsed              : ${elapsed}s`);
  console.log('[backfill] ─────────────────────────────────────────────────');

  if (errors > 0) {
    console.warn(`[backfill] WARNING: ${errors} properties failed to process. Re-run to retry.`);
  }

  await mongoose.disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});
