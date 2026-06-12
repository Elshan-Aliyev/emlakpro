# Phase 5.6 — Property Reputation & Reviews System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a property identity + reputation system where reviews survive listing recreation, attach to a fingerprint-based PropertyIdentity record, and display as aggregate ratings on all listing surfaces.

**Architecture:** A `PropertyIdentity` document (fingerprint = normalizedAddress + roomCount + propertyType) is resolved or created whenever a listing is saved. `PropertyReview` documents reference `PropertyIdentity`. Cached aggregates on `PropertyIdentity` (avgRating, reviewCount, recommendPercentage) are updated on every review write and injected into listing payloads for O(1) card rendering.

**Tech Stack:** Node.js/Express/Mongoose, React 18, Lucide icons, existing `track()` analytics wrapper, CSS custom properties from globals.css.

---

## Revision Notes

| Decision | Detail |
|---|---|
| Fingerprint fields | normalizedAddress + roomCount + propertyType (NO area — too noisy) |
| Unit numbers | KEPT in normalizedAddress — removing them would merge different apartments |
| Owner response | Upsert (editable, `respondedAt` preserved on first write) |
| Helpful votes | `helpfulVotes` array on PropertyReview for deduplication |
| Rating distribution | Computed on-demand for PropertyDetail only — NOT stored on PropertyIdentity |
| Existing Review model | Untouched — realtor reviews only |

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `server/models/PropertyIdentity.js` | Fingerprint + cached aggregates, never deleted |
| `server/models/PropertyReview.js` | Review document with status, votes, owner response |
| `server/lib/reputation/resolveIdentity.js` | buildFingerprint() + resolvePropertyIdentity() |
| `server/lib/reputation/updateAggregates.js` | Recalculate and write all aggregate fields |
| `server/routes/propertyReviewRoutes.js` | All 10 API routes |
| `server/controllers/propertyReviewController.js` | All handler logic |
| `server/scripts/backfillPropertyIdentities.js` | One-time idempotent backfill for existing listings |
| `client/src/components/PropertyRatingChip.js` + `.css` | `★ 4.7 (23)` compact chip, no API calls |
| `client/src/components/ReviewModal.js` + `.css` | Submit/edit form, draft guard, char counter |
| `client/src/components/PropertyReputation.js` + `.css` | Full reputation section for PropertyDetail |

### Modified files
| File | Change |
|---|---|
| `server/models/Property.js` | Add `propertyIdentityId` field |
| `server/controllers/propertyController.js` | Resolve identity on create/update/delete; inject `reputationSummary` on list queries |
| `server/server.js` | Mount propertyReviewRoutes at `/api/property-reviews` |
| `client/src/services/api.js` | Add 9 review API functions |
| `client/src/services/analytics.js` | Add 12 review events to TRACKED_FOR_STORE |
| `client/src/pages/PropertyDetail.js` | Add `<PropertyReputation>` below seller card |
| `client/src/pages/HomeNew.js` | Pass `reputationSummary` to `<PropertyRatingChip>` on each card |
| `client/src/pages/Search/index.js` | Same |
| `client/src/components/PropertyPreviewDrawer.js` | Same |
| `client/src/pages/AdminReports.js` | Add "Property Reviews" moderation tab |

---

## Task 1: Backend Models — PropertyIdentity + PropertyReview

**Files:**
- Create: `server/models/PropertyIdentity.js`
- Create: `server/models/PropertyReview.js`
- Modify: `server/models/Property.js`

- [ ] **Step 1: Create `server/models/PropertyIdentity.js`**

  ```js
  'use strict';
  const mongoose = require('mongoose');

  const propertyIdentitySchema = new mongoose.Schema({
    fingerprint: {
      normalizedAddress: { type: String, required: true },
      roomCount:         { type: Number, required: true },
      propertyType:      { type: String, required: true },
    },
    fingerprintVersion: { type: Number, default: 1 },

    // Cached aggregates — recalculated after every review write
    avgRating:           { type: Number, default: 0 },
    reviewCount:         { type: Number, default: 0 },
    recommendCount:      { type: Number, default: 0 },
    recommendPercentage: { type: Number, default: 0 },
    listingCount:        { type: Number, default: 0 },
    lastReviewAt:        { type: Date,   default: null },
  }, { timestamps: true });

  // Unique compound index — one identity per fingerprint
  propertyIdentitySchema.index(
    {
      'fingerprint.normalizedAddress': 1,
      'fingerprint.roomCount':         1,
      'fingerprint.propertyType':      1,
    },
    { unique: true }
  );

  module.exports = mongoose.model('PropertyIdentity', propertyIdentitySchema);
  ```

- [ ] **Step 2: Create `server/models/PropertyReview.js`**

  ```js
  'use strict';
  const mongoose = require('mongoose');

  const REVIEW_TYPES = ['buyer-experience', 'rental-experience', 'general-feedback'];
  const STATUSES     = ['active', 'reported', 'hidden'];

  const propertyReviewSchema = new mongoose.Schema({
    propertyIdentityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'PropertyIdentity',
      required: true,
      index:    true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: true,
    },
    reviewType: { type: String, enum: REVIEW_TYPES, required: true },
    rating:     { type: Number, min: 1, max: 5, required: true },
    title:      { type: String, maxlength: 120, default: '' },
    review:     { type: String, minlength: 20, maxlength: 2000, required: true },
    recommended: { type: Boolean, default: true },

    ownerResponse: {
      text:        { type: String, maxlength: 1000 },
      respondedAt: { type: Date },   // set on first write, never overwritten
      updatedAt:   { type: Date },   // updated on every edit
    },

    status:      { type: String, enum: STATUSES, default: 'active' },
    reportCount: { type: Number, default: 0 },
    reportedAt:  { type: Date,   default: null },
    moderatedAt: { type: Date,   default: null },
    moderatorNotes: { type: String, default: '' },

    reviewHelpfulCount: { type: Number, default: 0 },
    helpfulVotes: [{
      userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      votedAt: { type: Date, default: Date.now },
    }],
  }, { timestamps: true });

  // One review per user per property identity
  propertyReviewSchema.index({ propertyIdentityId: 1, reviewerId: 1 }, { unique: true });

  module.exports = mongoose.model('PropertyReview', propertyReviewSchema);
  ```

- [ ] **Step 3: Add `propertyIdentityId` to `server/models/Property.js`**

  Find the section in Property.js where fields are declared (near the `ownerId` field). Add:

  ```js
  propertyIdentityId: {
    type:  mongoose.Schema.Types.ObjectId,
    ref:   'PropertyIdentity',
    index: true,
  },
  ```

- [ ] **Step 4: Verify models load**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "require('./models/PropertyIdentity'); require('./models/PropertyReview'); require('./models/Property'); console.log('Models OK')"
  ```
  Expected: `Models OK`

- [ ] **Step 5: Commit**

  ```bash
  git add server/models/PropertyIdentity.js server/models/PropertyReview.js server/models/Property.js
  git commit -m "feat(models): add PropertyIdentity, PropertyReview; add propertyIdentityId to Property"
  ```

---

## Task 2: Identity Resolution Library

**Files:**
- Create: `server/lib/reputation/resolveIdentity.js`

- [ ] **Step 1: Create `server/lib/reputation/resolveIdentity.js`**

  ```js
  'use strict';
  const PropertyIdentity = require('../../models/PropertyIdentity');

  /**
   * Normalise a property's address/rooms/type into a stable fingerprint string.
   * Rules:
   *   - lowercase, strip punctuation, collapse whitespace
   *   - KEEP digits (apartment/unit numbers — apt 5 ≠ apt 8)
   *   - roomCount 0 → 1  (studio = 1 room)
   */
  function buildFingerprint(property) {
    const raw = (property.fullAddress || property.location || '').trim();
    const normalizedAddress = raw
      .toLowerCase()
      .replace(/[^\w\s\d]/g, '')   // strip punctuation; keep digits
      .replace(/\s+/g, ' ')
      .trim();

    return {
      normalizedAddress,
      roomCount:    (!property.bedrooms || property.bedrooms === 0) ? 1 : property.bedrooms,
      propertyType: property.propertyType || 'unknown',
    };
  }

  /**
   * Find or create a PropertyIdentity for the given property.
   * Does NOT modify the property document — caller is responsible.
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
  ```

- [ ] **Step 2: Verify module loads**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "const {buildFingerprint} = require('./lib/reputation/resolveIdentity'); console.log(buildFingerprint({ fullAddress: 'Nəriman Nərimanov 22, mənzil 5', bedrooms: 3, propertyType: 'apartment' }))"
  ```
  Expected output (example): `{ normalizedAddress: 'nriman nrimanov 22 mnzil 5', roomCount: 3, propertyType: 'apartment' }`

- [ ] **Step 3: Commit**

  ```bash
  git add server/lib/reputation/resolveIdentity.js
  git commit -m "feat(reputation): add buildFingerprint and resolvePropertyIdentity utility"
  ```

---

## Task 3: Aggregate Updater Library

**Files:**
- Create: `server/lib/reputation/updateAggregates.js`

- [ ] **Step 1: Create `server/lib/reputation/updateAggregates.js`**

  ```js
  'use strict';
  const PropertyReview  = require('../../models/PropertyReview');
  const PropertyIdentity = require('../../models/PropertyIdentity');

  /**
   * Recompute reputation aggregates for a PropertyIdentity and write them.
   * Only status === 'active' reviews count.
   * Called after every review create / edit / delete / moderate.
   *
   * @param {string|ObjectId} propertyIdentityId
   */
  async function updatePropertyReputationAggregates(propertyIdentityId) {
    const agg = await PropertyReview.aggregate([
      { $match: { propertyIdentityId: propertyIdentityId instanceof require('mongoose').Types.ObjectId
          ? propertyIdentityId
          : require('mongoose').Types.ObjectId.createFromHexString(String(propertyIdentityId)),
        status: 'active' } },
      { $group: {
        _id:           null,
        avgRating:     { $avg: '$rating' },
        reviewCount:   { $sum: 1 },
        recommendCount: { $sum: { $cond: ['$recommended', 1, 0] } },
        lastReviewAt:  { $max: '$createdAt' },
      }},
    ]);

    const r = agg[0] || {};
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
  ```

- [ ] **Step 2: Verify module loads**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "require('./lib/reputation/updateAggregates'); console.log('updateAggregates OK')"
  ```
  Expected: `updateAggregates OK`

- [ ] **Step 3: Commit**

  ```bash
  git add server/lib/reputation/updateAggregates.js
  git commit -m "feat(reputation): add updatePropertyReputationAggregates utility"
  ```

---

## Task 4: Wire Identity Resolution into propertyController

**Files:**
- Modify: `server/controllers/propertyController.js`

- [ ] **Step 1: Add imports at the top of `propertyController.js`**

  After the existing requires, add:

  ```js
  const { resolvePropertyIdentity } = require('../lib/reputation/resolveIdentity');
  ```

- [ ] **Step 2: Update `createProperty` to resolve identity**

  Find the `createProperty` handler. After `await property.save()`, add:

  ```js
  // Resolve PropertyIdentity and link it
  try {
    const identity = await resolvePropertyIdentity(property);
    await identity.updateOne({ $inc: { listingCount: 1 } });
    await property.updateOne({ propertyIdentityId: identity._id });
  } catch (identityErr) {
    console.error('[reputation] identity resolve error on create:', identityErr.message);
    // Non-fatal — listing was created successfully
  }
  ```

- [ ] **Step 3: Update `updateProperty` to re-resolve identity if fingerprint fields changed**

  Find the `updateProperty` handler. After the main `Property.findByIdAndUpdate(...)` call, add:

  ```js
  // Re-resolve identity if fingerprint-relevant fields changed
  const fingerprintFields = ['fullAddress', 'location', 'bedrooms', 'propertyType'];
  const fingerprintChanged = fingerprintFields.some(f => req.body[f] !== undefined);
  if (fingerprintChanged) {
    try {
      const updated = await Property.findById(req.params.id);
      if (updated) {
        const newIdentity = await resolvePropertyIdentity(updated);
        const oldIdentityId = updated.propertyIdentityId;
        if (!oldIdentityId || String(oldIdentityId) !== String(newIdentity._id)) {
          if (oldIdentityId) {
            const { PropertyIdentity } = require('../models/PropertyIdentity');
            await PropertyIdentity.findByIdAndUpdate(oldIdentityId, { $inc: { listingCount: -1 } });
          }
          await newIdentity.updateOne({ $inc: { listingCount: 1 } });
          await updated.updateOne({ propertyIdentityId: newIdentity._id });
        }
      }
    } catch (identityErr) {
      console.error('[reputation] identity resolve error on update:', identityErr.message);
    }
  }
  ```

  **Note:** The `PropertyIdentity` require inside the try block avoids a circular dependency — use `require('../../models/PropertyIdentity')` relative path adjusted for controller location: `require('../models/PropertyIdentity')`.

  Fix the require path in that block to:
  ```js
  const PropertyIdentityModel = require('../models/PropertyIdentity');
  await PropertyIdentityModel.findByIdAndUpdate(oldIdentityId, { $inc: { listingCount: -1 } });
  ```

- [ ] **Step 4: Update `deleteProperty` to decrement listingCount**

  Find the `deleteProperty` handler. After `await property.deleteOne()` and before `res.json(...)`, add:

  ```js
  // Decrement listingCount on PropertyIdentity (never delete the identity)
  if (property.propertyIdentityId) {
    try {
      const PropertyIdentityModel = require('../models/PropertyIdentity');
      await PropertyIdentityModel.findByIdAndUpdate(
        property.propertyIdentityId,
        { $inc: { listingCount: -1 } }
      );
    } catch (identityErr) {
      console.error('[reputation] listingCount decrement error:', identityErr.message);
    }
  }
  ```

- [ ] **Step 5: Update `getProperties` to inject `reputationSummary`**

  Find the `getProperties` handler. After fetching properties (`const properties = await Property.find(...)`), replace the response with:

  ```js
  // Inject reputationSummary from populated propertyIdentityId
  const propertiesWithRep = await Property.find(query)
    .populate('ownerId', 'name lastName email phone avatar role verified licenseId brokerage companyName companyLogo totalListings totalViews accountType')
    .populate('propertyIdentityId', 'avgRating reviewCount recommendPercentage')
    .lean();

  const result = propertiesWithRep.map(p => ({
    ...p,
    reputationSummary: p.propertyIdentityId
      ? {
          avgRating:           p.propertyIdentityId.avgRating     || 0,
          reviewCount:         p.propertyIdentityId.reviewCount   || 0,
          recommendPercentage: p.propertyIdentityId.recommendPercentage || 0,
        }
      : { avgRating: 0, reviewCount: 0, recommendPercentage: 0 },
  }));

  res.json(result);
  ```

  **Important:** Remove the old `res.json(properties)` line and any existing `const properties = ...` query. The new version handles the full query.

- [ ] **Step 6: Syntax check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "require('./controllers/propertyController'); console.log('propertyController OK')"
  ```
  Expected: `propertyController OK`

- [ ] **Step 7: Commit**

  ```bash
  git add server/controllers/propertyController.js
  git commit -m "feat(reputation): wire identity resolution into property create/update/delete; inject reputationSummary on list"
  ```

---

## Task 5: Backfill Script

**Files:**
- Create: `server/scripts/backfillPropertyIdentities.js`

- [ ] **Step 1: Create the backfill script**

  ```js
  'use strict';
  /**
   * One-time backfill: resolve PropertyIdentity for all existing listings.
   * Idempotent — safe to re-run.
   *
   * Usage: node server/scripts/backfillPropertyIdentities.js
   */

  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  const mongoose = require('mongoose');

  async function run() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('[backfill] Connected to MongoDB');

    const Property         = require('../models/Property');
    const PropertyIdentity = require('../models/PropertyIdentity');
    const { resolvePropertyIdentity } = require('../lib/reputation/resolveIdentity');

    let processed = 0, created = 0, matched = 0, errors = 0;

    // Reset all listingCounts before re-computing
    await PropertyIdentity.updateMany({}, { $set: { listingCount: 0 } });

    const cursor = Property.find({}).cursor();

    for await (const property of cursor) {
      try {
        const identity = await resolvePropertyIdentity(property);
        await identity.updateOne({ $inc: { listingCount: 1 } });

        if (!property.propertyIdentityId || String(property.propertyIdentityId) !== String(identity._id)) {
          await Property.updateOne({ _id: property._id }, { propertyIdentityId: identity._id });
        }

        // Track whether identity was just created this run
        if (identity.createdAt > new Date(Date.now() - 5000)) created++;
        else matched++;

        processed++;
        if (processed % 100 === 0) console.log(`[backfill] Processed ${processed} properties…`);
      } catch (err) {
        errors++;
        console.error(`[backfill] Error on property ${property._id}:`, err.message);
      }
    }

    console.log(`[backfill] Done. processed=${processed} created=${created} matched=${matched} errors=${errors}`);
    await mongoose.disconnect();
  }

  run().catch(err => { console.error('[backfill] Fatal:', err); process.exit(1); });
  ```

- [ ] **Step 2: Verify the script loads (syntax check only — do not run against production yet)**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -c scripts/backfillPropertyIdentities.js
  ```
  Expected: `scripts/backfillPropertyIdentities.js syntax OK`

- [ ] **Step 3: Commit**

  ```bash
  git add server/scripts/backfillPropertyIdentities.js
  git commit -m "feat(reputation): add idempotent backfill script for existing property identities"
  ```

---

## Task 6: API Controller

**Files:**
- Create: `server/controllers/propertyReviewController.js`

- [ ] **Step 1: Create `server/controllers/propertyReviewController.js`**

  ```js
  'use strict';
  const mongoose = require('mongoose');
  const PropertyReview   = require('../models/PropertyReview');
  const PropertyIdentity = require('../models/PropertyIdentity');
  const Property         = require('../models/Property');
  const User             = require('../models/User');
  const { resolvePropertyIdentity } = require('../lib/reputation/resolveIdentity');
  const { updatePropertyReputationAggregates } = require('../lib/reputation/updateAggregates');

  const EDIT_WINDOW_DAYS = 30;

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function getIdentityByListingId(propertyId) {
    const property = await Property.findById(propertyId).select('propertyIdentityId ownerId');
    if (!property) return null;
    if (property.propertyIdentityId) {
      return { identity: await PropertyIdentity.findById(property.propertyIdentityId), property };
    }
    // Fallback: resolve on the fly (handles listings before backfill)
    const identity = await resolvePropertyIdentity(property);
    await Property.updateOne({ _id: propertyId }, { propertyIdentityId: identity._id });
    return { identity, property };
  }

  function buildRatingDistribution(reviews) {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++; });
    return [5, 4, 3, 2, 1].map(star => ({ star, count: dist[star] }));
  }

  // ── GET /by-listing/:propertyId ────────────────────────────────────────────

  exports.getByListing = async (req, res) => {
    try {
      const result = await getIdentityByListingId(req.params.propertyId);
      if (!result) return res.status(404).json({ message: 'Property not found.' });
      const { identity } = result;

      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
      const sort  = req.query.sort || 'recent';

      const sortMap = {
        recent:  { createdAt: -1 },
        highest: { rating: -1, createdAt: -1 },
        lowest:  { rating: 1,  createdAt: -1 },
        helpful: { reviewHelpfulCount: -1, createdAt: -1 },
      };

      const [reviews, total, allRatings] = await Promise.all([
        PropertyReview.find({ propertyIdentityId: identity._id, status: { $in: ['active', 'reported'] } })
          .sort(sortMap[sort] || sortMap.recent)
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('reviewerId', 'name lastName avatar')
          .lean(),
        PropertyReview.countDocuments({ propertyIdentityId: identity._id, status: { $in: ['active', 'reported'] } }),
        PropertyReview.find({ propertyIdentityId: identity._id, status: 'active' }, 'rating').lean(),
      ]);

      res.json({
        identity: {
          _id:                identity._id,
          avgRating:           identity.avgRating,
          reviewCount:         identity.reviewCount,
          recommendPercentage: identity.recommendPercentage,
        },
        ratingDistribution: buildRatingDistribution(allRatings),
        reviews,
        page,
        pages: Math.ceil(total / limit),
        total,
      });
    } catch (err) {
      console.error('getByListing error:', err);
      res.status(500).json({ message: 'Failed to load reviews.' });
    }
  };

  // ── GET /summary/:propertyId ───────────────────────────────────────────────

  exports.getSummary = async (req, res) => {
    try {
      const result = await getIdentityByListingId(req.params.propertyId);
      if (!result) return res.status(404).json({ message: 'Property not found.' });
      const { identity } = result;
      res.json({
        avgRating:           identity.avgRating,
        reviewCount:         identity.reviewCount,
        recommendPercentage: identity.recommendPercentage,
      });
    } catch (err) {
      res.status(500).json({ message: 'Failed to load summary.' });
    }
  };

  // ── POST / — submit review ─────────────────────────────────────────────────

  exports.submitReview = async (req, res) => {
    try {
      const { propertyId, reviewType, rating, title, review, recommended } = req.body;
      if (!propertyId || !reviewType || !rating || !review) {
        return res.status(400).json({ message: 'propertyId, reviewType, rating, and review are required.' });
      }

      // Account age guard
      const reviewer = await User.findById(req.user.id).select('createdAt');
      const ageMs = Date.now() - new Date(reviewer.createdAt).getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        return res.status(403).json({ message: 'Account must be at least 24 hours old to submit a review.' });
      }

      const result = await getIdentityByListingId(propertyId);
      if (!result) return res.status(404).json({ message: 'Property not found.' });
      const { identity, property } = result;

      // Owner exclusion
      if (String(property.ownerId) === String(req.user.id)) {
        return res.status(403).json({ message: 'You cannot review your own listing.' });
      }

      // Validate fields
      const ratingInt = parseInt(rating, 10);
      if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
      }
      const reviewText = (review || '').trim();
      if (reviewText.length < 20) return res.status(400).json({ message: 'Review must be at least 20 characters.' });
      if (reviewText.length > 2000) return res.status(400).json({ message: 'Review must be 2000 characters or fewer.' });
      const validTypes = ['buyer-experience', 'rental-experience', 'general-feedback'];
      if (!validTypes.includes(reviewType)) return res.status(400).json({ message: 'Invalid review type.' });
      if (title && title.length > 120) return res.status(400).json({ message: 'Title must be 120 characters or fewer.' });

      // Duplicate check
      const existing = await PropertyReview.findOne({ propertyIdentityId: identity._id, reviewerId: req.user.id });
      if (existing) return res.status(409).json({ message: 'You have already reviewed this property.' });

      const newReview = await PropertyReview.create({
        propertyIdentityId: identity._id,
        reviewerId:  req.user.id,
        reviewType,
        rating:      ratingInt,
        title:       (title || '').trim(),
        review:      reviewText,
        recommended: recommended !== false,
      });

      await updatePropertyReputationAggregates(identity._id);
      res.status(201).json(newReview);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'You have already reviewed this property.' });
      console.error('submitReview error:', err);
      res.status(500).json({ message: 'Failed to submit review.' });
    }
  };

  // ── PUT /:id — edit review ─────────────────────────────────────────────────

  exports.editReview = async (req, res) => {
    try {
      const rev = await PropertyReview.findById(req.params.id);
      if (!rev) return res.status(404).json({ message: 'Review not found.' });
      if (String(rev.reviewerId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only edit your own reviews.' });
      }

      // 30-day edit window
      const ageMs = Date.now() - new Date(rev.createdAt).getTime();
      if (ageMs > EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
        return res.status(403).json({ message: `Reviews can only be edited within ${EDIT_WINDOW_DAYS} days of submission.` });
      }

      const { rating, title, review, recommended, reviewType } = req.body;
      if (rating !== undefined) {
        const r = parseInt(rating, 10);
        if (isNaN(r) || r < 1 || r > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        rev.rating = r;
      }
      if (review !== undefined) {
        const t = review.trim();
        if (t.length < 20) return res.status(400).json({ message: 'Review must be at least 20 characters.' });
        if (t.length > 2000) return res.status(400).json({ message: 'Review must be 2000 characters or fewer.' });
        rev.review = t;
      }
      if (title !== undefined) {
        if (title.length > 120) return res.status(400).json({ message: 'Title must be 120 characters or fewer.' });
        rev.title = title.trim();
      }
      if (recommended !== undefined) rev.recommended = !!recommended;
      if (reviewType !== undefined) {
        const validTypes = ['buyer-experience', 'rental-experience', 'general-feedback'];
        if (!validTypes.includes(reviewType)) return res.status(400).json({ message: 'Invalid review type.' });
        rev.reviewType = reviewType;
      }

      await rev.save();
      await updatePropertyReputationAggregates(rev.propertyIdentityId);
      res.json(rev);
    } catch (err) {
      console.error('editReview error:', err);
      res.status(500).json({ message: 'Failed to edit review.' });
    }
  };

  // ── DELETE /:id — delete own review ───────────────────────────────────────

  exports.deleteReview = async (req, res) => {
    try {
      const rev = await PropertyReview.findById(req.params.id);
      if (!rev) return res.status(404).json({ message: 'Review not found.' });
      if (String(rev.reviewerId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only delete your own reviews.' });
      }
      const identityId = rev.propertyIdentityId;
      await rev.deleteOne();
      await updatePropertyReputationAggregates(identityId);
      res.json({ message: 'Review deleted.' });
    } catch (err) {
      console.error('deleteReview error:', err);
      res.status(500).json({ message: 'Failed to delete review.' });
    }
  };

  // ── POST /:id/response — owner response (upsert) ──────────────────────────

  exports.addOwnerResponse = async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) return res.status(400).json({ message: 'Response text is required.' });
      if (text.trim().length > 1000) return res.status(400).json({ message: 'Response must be 1000 characters or fewer.' });

      const rev = await PropertyReview.findById(req.params.id)
        .populate({ path: 'propertyIdentityId', select: '_id' });
      if (!rev) return res.status(404).json({ message: 'Review not found.' });

      // Verify the requester is the listing owner
      const property = await Property.findOne({ propertyIdentityId: rev.propertyIdentityId }).select('ownerId');
      if (!property || String(property.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Only the listing owner can respond to reviews.' });
      }

      const now = new Date();
      rev.ownerResponse = {
        text:        text.trim(),
        respondedAt: rev.ownerResponse?.respondedAt || now,  // preserved on first write
        updatedAt:   now,
      };
      await rev.save();
      res.json(rev);
    } catch (err) {
      console.error('addOwnerResponse error:', err);
      res.status(500).json({ message: 'Failed to save response.' });
    }
  };

  // ── POST /:id/helpful — toggle helpful vote ────────────────────────────────

  exports.markHelpful = async (req, res) => {
    try {
      const rev = await PropertyReview.findById(req.params.id);
      if (!rev) return res.status(404).json({ message: 'Review not found.' });

      const already = rev.helpfulVotes.find(v => String(v.userId) === String(req.user.id));
      if (already) return res.status(409).json({ message: 'You have already marked this review as helpful.' });

      rev.helpfulVotes.push({ userId: req.user.id });
      rev.reviewHelpfulCount = rev.helpfulVotes.length;
      await rev.save();
      res.json({ reviewHelpfulCount: rev.reviewHelpfulCount });
    } catch (err) {
      console.error('markHelpful error:', err);
      res.status(500).json({ message: 'Failed to mark review as helpful.' });
    }
  };

  // ── POST /:id/report — report a review ────────────────────────────────────

  exports.reportReview = async (req, res) => {
    try {
      const { reason } = req.body;
      const validReasons = ['spam', 'offensive', 'irrelevant', 'other'];
      if (!reason || !validReasons.includes(reason)) {
        return res.status(400).json({ message: 'Valid reason required: spam, offensive, irrelevant, or other.' });
      }

      const rev = await PropertyReview.findById(req.params.id);
      if (!rev) return res.status(404).json({ message: 'Review not found.' });

      // One report per user per review
      // (Use a simple check via a separate ReportedReview tracking field — we store reporters in reportedBy)
      // For V1, increment count and flip status to reported on first report
      rev.reportCount++;
      if (rev.status === 'active') {
        rev.status     = 'reported';
        rev.reportedAt = new Date();
      }
      await rev.save();
      await updatePropertyReputationAggregates(rev.propertyIdentityId);
      res.json({ message: 'Report submitted.' });
    } catch (err) {
      console.error('reportReview error:', err);
      res.status(500).json({ message: 'Failed to report review.' });
    }
  };

  // ── PATCH /:id/moderate — admin moderation ────────────────────────────────

  exports.moderateReview = async (req, res) => {
    try {
      const { status, moderatorNotes } = req.body;
      const validStatuses = ['active', 'hidden'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: 'status must be active or hidden.' });
      }

      const rev = await PropertyReview.findById(req.params.id);
      if (!rev) return res.status(404).json({ message: 'Review not found.' });

      rev.status      = status;
      rev.moderatedAt = new Date();
      if (moderatorNotes !== undefined) rev.moderatorNotes = moderatorNotes;
      await rev.save();
      await updatePropertyReputationAggregates(rev.propertyIdentityId);
      res.json(rev);
    } catch (err) {
      console.error('moderateReview error:', err);
      res.status(500).json({ message: 'Failed to moderate review.' });
    }
  };

  // ── DELETE /:id/admin — admin hard delete ─────────────────────────────────

  exports.adminDeleteReview = async (req, res) => {
    try {
      const rev = await PropertyReview.findById(req.params.id);
      if (!rev) return res.status(404).json({ message: 'Review not found.' });
      const identityId = rev.propertyIdentityId;
      await rev.deleteOne();
      await updatePropertyReputationAggregates(identityId);
      res.json({ message: 'Review permanently deleted.' });
    } catch (err) {
      console.error('adminDeleteReview error:', err);
      res.status(500).json({ message: 'Failed to delete review.' });
    }
  };
  ```

- [ ] **Step 2: Verify controller loads**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "require('./controllers/propertyReviewController'); console.log('controller OK')"
  ```
  Expected: `controller OK`

- [ ] **Step 3: Commit**

  ```bash
  git add server/controllers/propertyReviewController.js
  git commit -m "feat(reputation): add propertyReviewController with all 9 handlers"
  ```

---

## Task 7: API Routes + server.js Registration

**Files:**
- Create: `server/routes/propertyReviewRoutes.js`
- Modify: `server/server.js`

- [ ] **Step 1: Create `server/routes/propertyReviewRoutes.js`**

  ```js
  'use strict';
  const express    = require('express');
  const router     = express.Router();
  const verifyToken = require('../middleware/authMiddleware');
  const { isAdmin } = require('../middleware/roleMiddleware');
  const ctrl = require('../controllers/propertyReviewController');

  // Public
  router.get('/summary/:propertyId',          ctrl.getSummary);
  router.get('/by-listing/:propertyId',       ctrl.getByListing);

  // Authenticated
  router.post('/',                            verifyToken, ctrl.submitReview);
  router.put('/:id',                          verifyToken, ctrl.editReview);
  router.delete('/:id',                       verifyToken, ctrl.deleteReview);
  router.post('/:id/response',               verifyToken, ctrl.addOwnerResponse);
  router.post('/:id/helpful',                verifyToken, ctrl.markHelpful);
  router.post('/:id/report',                 verifyToken, ctrl.reportReview);

  // Admin
  router.patch('/:id/moderate',              verifyToken, isAdmin, ctrl.moderateReview);
  router.delete('/:id/admin',               verifyToken, isAdmin, ctrl.adminDeleteReview);

  module.exports = router;
  ```

- [ ] **Step 2: Mount in `server/server.js`**

  After the last `const ... = require('./routes/...')` line, add:

  ```js
  const propertyReviewRoutes = require('./routes/propertyReviewRoutes');
  ```

  Then after the existing `app.use('/api/home', ...)` line, add:

  ```js
  app.use('/api/property-reviews', propertyReviewRoutes);
  ```

- [ ] **Step 3: Verify routes load**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "require('./routes/propertyReviewRoutes'); console.log('propertyReviewRoutes OK')"
  ```
  Expected: `propertyReviewRoutes OK`

- [ ] **Step 4: Commit**

  ```bash
  git add server/routes/propertyReviewRoutes.js server/server.js
  git commit -m "feat(reputation): mount /api/property-reviews routes"
  ```

---

## Task 8: Admin Maintenance Endpoint

**Files:**
- Modify: `server/routes/adminRoutes.js`

- [ ] **Step 1: Add rebuild endpoint to `server/routes/adminRoutes.js`**

  Find the existing admin routes file. Add a new route for the rebuild endpoint:

  ```js
  // POST /api/admin/property-identities/rebuild  (admin only, no UI)
  router.post('/property-identities/rebuild', verifyToken, isAdmin, async (req, res) => {
    try {
      const Property         = require('../models/Property');
      const PropertyIdentity = require('../models/PropertyIdentity');
      const { resolvePropertyIdentity } = require('../lib/reputation/resolveIdentity');

      await PropertyIdentity.updateMany({}, { $set: { listingCount: 0 } });

      const cursor = Property.find({}).cursor();
      let processed = 0, errors = 0;

      for await (const property of cursor) {
        try {
          const identity = await resolvePropertyIdentity(property);
          await identity.updateOne({ $inc: { listingCount: 1 } });
          await Property.updateOne({ _id: property._id }, { propertyIdentityId: identity._id });
          processed++;
        } catch (err) {
          errors++;
          console.error(`[rebuild] Error on ${property._id}:`, err.message);
        }
      }

      res.json({ message: 'Rebuild complete.', processed, errors });
    } catch (err) {
      console.error('[rebuild] Fatal error:', err);
      res.status(500).json({ message: 'Rebuild failed.' });
    }
  });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add server/routes/adminRoutes.js
  git commit -m "feat(reputation): add admin /property-identities/rebuild endpoint"
  ```

---

## Task 9: API Client Functions

**Files:**
- Modify: `client/src/services/api.js`

- [ ] **Step 1: Add review API functions to `client/src/services/api.js`**

  Find the `export default api;` line at the bottom. Before it, add:

  ```js
  // ── Property Reviews API ─────────────────────────────────────────────────

  /** Reputation + paginated reviews for a listing */
  export const getPropertyReviews = (propertyId, params = {}) =>
    api.get(`/property-reviews/by-listing/${propertyId}`, { params });

  /** Lightweight summary for cards (avgRating, reviewCount, recommendPercentage) */
  export const getReputationSummary = (propertyId) =>
    api.get(`/property-reviews/summary/${propertyId}`);

  /** Submit a new review */
  export const submitPropertyReview = (data, token) =>
    api.post('/property-reviews', data, { headers: { Authorization: `Bearer ${token}` } });

  /** Edit own review */
  export const updatePropertyReview = (reviewId, data, token) =>
    api.put(`/property-reviews/${reviewId}`, data, { headers: { Authorization: `Bearer ${token}` } });

  /** Delete own review */
  export const deletePropertyReview = (reviewId, token) =>
    api.delete(`/property-reviews/${reviewId}`, { headers: { Authorization: `Bearer ${token}` } });

  /** Add/edit owner response */
  export const addOwnerResponse = (reviewId, text, token) =>
    api.post(`/property-reviews/${reviewId}/response`, { text }, { headers: { Authorization: `Bearer ${token}` } });

  /** Mark review as helpful */
  export const markReviewHelpful = (reviewId, token) =>
    api.post(`/property-reviews/${reviewId}/helpful`, {}, { headers: { Authorization: `Bearer ${token}` } });

  /** Report a review */
  export const reportPropertyReview = (reviewId, reason, token) =>
    api.post(`/property-reviews/${reviewId}/report`, { reason }, { headers: { Authorization: `Bearer ${token}` } });
  ```

- [ ] **Step 2: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/services/api.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output (0 warnings, 0 errors).

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/services/api.js
  git commit -m "feat(reputation): add property review API client functions"
  ```

---

## Task 10: Analytics Events

**Files:**
- Modify: `client/src/services/analytics.js`

- [ ] **Step 1: Add 12 events to `TRACKED_FOR_STORE` in `analytics.js`**

  Find the `TRACKED_FOR_STORE` Set and add:

  ```js
  // Property Review events (Phase 5.6)
  'review_modal_opened',
  'review_submission_started',
  'review_submitted',
  'review_updated',
  'review_deleted',
  'review_reported',
  'review_sort_changed',
  'owner_response_added',
  'review_helpful_voted',
  'review_hidden',
  'review_restored',
  'review_deleted_by_admin',
  ```

- [ ] **Step 2: ESLint check**

  ```bash
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/services/analytics.js --max-warnings=0 2>&1 | tail -5
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/services/analytics.js
  git commit -m "feat(analytics): add 12 property review events to TRACKED_FOR_STORE"
  ```

---

## Task 11: PropertyRatingChip Component

**Files:**
- Create: `client/src/components/PropertyRatingChip.js`
- Create: `client/src/components/PropertyRatingChip.css`

- [ ] **Step 1: Create `client/src/components/PropertyRatingChip.js`**

  ```jsx
  import React from 'react';
  import './PropertyRatingChip.css';

  /**
   * Compact rating chip for property cards.
   * Props come from the reputationSummary payload — never fires its own API request.
   * Hides entirely when reviewCount === 0.
   */
  const PropertyRatingChip = ({ avgRating, reviewCount }) => {
    if (!reviewCount || reviewCount === 0) return null;

    const displayRating = typeof avgRating === 'number'
      ? avgRating.toFixed(1)
      : '0.0';

    return (
      <span className="prc-chip" aria-label={`${displayRating} stars, ${reviewCount} review${reviewCount !== 1 ? 's' : ''}`}>
        <span className="prc-star" aria-hidden="true">★</span>
        <span className="prc-rating">{displayRating}</span>
        <span className="prc-count">({reviewCount})</span>
      </span>
    );
  };

  export default PropertyRatingChip;
  ```

- [ ] **Step 2: Create `client/src/components/PropertyRatingChip.css`**

  ```css
  .prc-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.8125rem;
    color: var(--color-graphite-700, #334155);
    white-space: nowrap;
  }

  .prc-star {
    color: #f59e0b;
    font-size: 0.875rem;
    line-height: 1;
  }

  .prc-rating {
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .prc-count {
    color: var(--gray-500, #64748b);
    font-size: 0.75rem;
  }
  ```

- [ ] **Step 3: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/components/PropertyRatingChip.js --max-warnings=0 2>&1 | tail -5
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/PropertyRatingChip.js client/src/components/PropertyRatingChip.css
  git commit -m "feat(reputation): add PropertyRatingChip compact display component"
  ```

---

## Task 12: ReviewModal Component

**Files:**
- Create: `client/src/components/ReviewModal.js`
- Create: `client/src/components/ReviewModal.css`

- [ ] **Step 1: Create `client/src/components/ReviewModal.js`**

  ```jsx
  import React, { useState, useRef, useEffect, useCallback } from 'react';
  import { X, Star } from 'lucide-react';
  import { submitPropertyReview, updatePropertyReview } from '../services/api';
  import { track } from '../services/analytics';
  import './ReviewModal.css';

  const REVIEW_TYPES = [
    { value: 'buyer-experience',   label: 'Buyer Experience'         },
    { value: 'rental-experience',  label: 'Rental Experience'        },
    { value: 'general-feedback',   label: 'General Property Feedback' },
  ];

  const ReviewModal = ({ propertyId, existingReview, onClose, onSuccess }) => {
    const [rating,      setRating]      = useState(existingReview?.rating     || 0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewType,  setReviewType]  = useState(existingReview?.reviewType || '');
    const [recommended, setRecommended] = useState(existingReview?.recommended !== false);
    const [title,       setTitle]       = useState(existingReview?.title       || '');
    const [review,      setReview]      = useState(existingReview?.review      || '');
    const [submitting,  setSubmitting]  = useState(false);
    const [error,       setError]       = useState('');
    const hasDraft = useRef(false);
    const startedRef = useRef(false);

    const isEdit = !!existingReview;

    useEffect(() => {
      track('review_modal_opened', { propertyId });
    }, [propertyId]);

    const handleReviewChange = (e) => {
      setReview(e.target.value);
      hasDraft.current = true;
      if (!startedRef.current && e.target.value.length >= 3) {
        startedRef.current = true;
        track('review_submission_started', { propertyId });
      }
    };

    const handleClose = useCallback(() => {
      if (hasDraft.current && (review.length > 0 || title.length > 0)) {
        if (!window.confirm('Discard your review? Your draft will not be saved.')) return;
      }
      onClose();
    }, [review, title, onClose]);

    const handleSubmit = async () => {
      setError('');
      if (!rating)     { setError('Please select a star rating.'); return; }
      if (!reviewType) { setError('Please select a review type.'); return; }
      if (review.trim().length < 20) { setError('Review must be at least 20 characters.'); return; }

      setSubmitting(true);
      try {
        const token = localStorage.getItem('token');
        const data  = { propertyId, rating, reviewType, title, review: review.trim(), recommended };

        if (isEdit) {
          await updatePropertyReview(existingReview._id, data, token);
          track('review_updated', { reviewId: existingReview._id, propertyId });
        } else {
          await submitPropertyReview(data, token);
          track('review_submitted', { propertyId, reviewType, rating, recommended });
        }

        hasDraft.current = false;
        onSuccess();
      } catch (err) {
        const status = err.response?.status;
        const msg    = err.response?.data?.message;
        if (status === 409) setError(msg || 'You have already reviewed this property.');
        else if (status === 403) setError(msg || 'You are not allowed to submit this review.');
        else setError(msg || 'Something went wrong. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="rm-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Write a review">
        <div className="rm-panel" onClick={e => e.stopPropagation()}>
          <div className="rm-header">
            <h2 className="rm-title">{isEdit ? 'Edit your review' : 'Write a review'}</h2>
            <button className="rm-close" onClick={handleClose} aria-label="Close">
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {/* Star rating */}
          <div className="rm-field">
            <label className="rm-label">Rating <span className="rm-required">*</span></label>
            <div className="rm-stars" role="radiogroup" aria-label="Star rating">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  className={`rm-star${n <= (hoverRating || rating) ? ' rm-star--filled' : ''}`}
                  onClick={() => { setRating(n); hasDraft.current = true; }}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                  type="button"
                >
                  <Star size={22} strokeWidth={1.5} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {/* Review type */}
          <div className="rm-field">
            <label className="rm-label" htmlFor="rm-type">Review type <span className="rm-required">*</span></label>
            <select
              id="rm-type"
              className="rm-select"
              value={reviewType}
              onChange={e => { setReviewType(e.target.value); hasDraft.current = true; }}
            >
              <option value="">Select type…</option>
              {REVIEW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Recommended toggle */}
          <div className="rm-field rm-field--inline">
            <label className="rm-label" htmlFor="rm-recommended">Would you recommend this property?</label>
            <button
              id="rm-recommended"
              type="button"
              className={`rm-toggle${recommended ? ' rm-toggle--on' : ''}`}
              onClick={() => { setRecommended(r => !r); hasDraft.current = true; }}
              aria-pressed={recommended}
            >
              {recommended ? 'Yes' : 'No'}
            </button>
          </div>

          {/* Title */}
          <div className="rm-field">
            <label className="rm-label" htmlFor="rm-title">Title <span className="rm-optional">(optional)</span></label>
            <input
              id="rm-title"
              className="rm-input"
              type="text"
              maxLength={120}
              value={title}
              onChange={e => { setTitle(e.target.value); hasDraft.current = true; }}
              placeholder="Summarise your experience"
            />
          </div>

          {/* Review body */}
          <div className="rm-field">
            <label className="rm-label" htmlFor="rm-review">Review <span className="rm-required">*</span></label>
            <textarea
              id="rm-review"
              className="rm-textarea"
              rows={5}
              maxLength={2000}
              value={review}
              onChange={handleReviewChange}
              placeholder="Consider: listing accuracy, property condition, neighbourhood, owner responsiveness"
            />
            <div className="rm-counter" aria-live="polite">
              <span className={review.length < 20 ? 'rm-counter--warn' : ''}>{review.length}</span> / 2000
            </div>
          </div>

          {error && <p className="rm-error" role="alert">{error}</p>}

          <div className="rm-actions">
            <button className="rm-btn rm-btn--cancel" type="button" onClick={handleClose}>Cancel</button>
            <button
              className="rm-btn rm-btn--submit"
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !rating || !reviewType || review.trim().length < 20}
            >
              {submitting ? 'Submitting…' : isEdit ? 'Save changes' : 'Submit review'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  export default ReviewModal;
  ```

- [ ] **Step 2: Create `client/src/components/ReviewModal.css`**

  ```css
  .rm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 16px;
    overflow-y: auto;
  }

  .rm-panel {
    background: var(--color-bg-surface, #fff);
    border-radius: 12px;
    border: 1px solid var(--border-default, rgba(15,23,42,0.10));
    width: 100%;
    max-width: 520px;
    padding: 28px 28px 24px;
    box-shadow: 0 20px 40px -8px rgba(15,23,42,0.20);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .rm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .rm-title {
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    margin: 0;
  }

  .rm-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--gray-500, #6b7280);
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
  }
  .rm-close:hover { background: var(--gray-100, #f1f5f9); }

  .rm-field { display: flex; flex-direction: column; gap: 6px; }
  .rm-field--inline { flex-direction: row; align-items: center; justify-content: space-between; }

  .rm-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-graphite-700, #334155);
  }

  .rm-required { color: var(--color-error, #dc2626); margin-left: 2px; }
  .rm-optional { color: var(--gray-400, #94a3b8); font-weight: 400; font-size: 0.8125rem; }

  .rm-stars { display: flex; gap: 4px; }

  .rm-star {
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    color: var(--gray-300, #cbd5e1);
    transition: color 0.1s;
  }
  .rm-star--filled { color: #f59e0b; }

  .rm-select,
  .rm-input {
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.12));
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 0.9rem;
    background: var(--color-bg-surface, #fff);
    color: var(--color-graphite-700, #334155);
    font-family: inherit;
  }
  .rm-select:focus,
  .rm-input:focus {
    outline: none;
    border-color: var(--color-primary, #0F766E);
  }

  .rm-toggle {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.12));
    background: var(--gray-50, #f8fafc);
    color: var(--gray-500, #6b7280);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .rm-toggle--on {
    background: var(--color-primary, #0F766E);
    border-color: var(--color-primary, #0F766E);
    color: #fff;
  }

  .rm-textarea {
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.12));
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 0.9rem;
    resize: vertical;
    font-family: inherit;
    color: var(--color-graphite-700, #334155);
    min-height: 120px;
  }
  .rm-textarea:focus { outline: none; border-color: var(--color-primary, #0F766E); }

  .rm-counter {
    text-align: right;
    font-size: 0.75rem;
    color: var(--gray-400, #94a3b8);
  }
  .rm-counter--warn { color: var(--color-error, #dc2626); font-weight: 600; }

  .rm-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.8125rem;
    color: #991b1b;
    margin: 0;
  }

  .rm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding-top: 4px;
  }

  .rm-btn {
    padding: 9px 20px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1.5px solid transparent;
    transition: background 0.15s, border-color 0.15s;
  }
  .rm-btn--cancel {
    background: none;
    border-color: var(--border-default, rgba(15,23,42,0.12));
    color: var(--gray-600, #475569);
  }
  .rm-btn--cancel:hover { background: var(--gray-50, #f8fafc); }
  .rm-btn--submit {
    background: var(--color-primary, #0F766E);
    border-color: var(--color-primary, #0F766E);
    color: #fff;
  }
  .rm-btn--submit:hover:not(:disabled) { background: #0d6560; }
  .rm-btn--submit:disabled { opacity: 0.45; cursor: not-allowed; }

  @media (max-width: 540px) {
    .rm-panel { padding: 20px 16px 18px; }
  }
  ```

- [ ] **Step 3: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/components/ReviewModal.js --max-warnings=0 2>&1 | tail -5
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/ReviewModal.js client/src/components/ReviewModal.css
  git commit -m "feat(reputation): add ReviewModal component with star selector, char counter, draft guard"
  ```

---

## Task 13: PropertyReputation Component

**Files:**
- Create: `client/src/components/PropertyReputation.js`
- Create: `client/src/components/PropertyReputation.css`

- [ ] **Step 1: Create `client/src/components/PropertyReputation.js`**

  ```jsx
  import React, { useEffect, useState, useCallback } from 'react';
  import { Star, ThumbsUp, Flag, ChevronDown, ChevronUp } from 'lucide-react';
  import { getPropertyReviews, reportPropertyReview, markReviewHelpful } from '../services/api';
  import { useAuth } from '../context/AuthContext';
  import { track } from '../services/analytics';
  import ReviewModal from './ReviewModal';
  import './PropertyReputation.css';

  const SORT_OPTIONS = [
    { value: 'recent',  label: 'Most Recent'    },
    { value: 'highest', label: 'Highest Rating'  },
    { value: 'lowest',  label: 'Lowest Rating'   },
    { value: 'helpful', label: 'Most Helpful'    },
  ];

  const REVIEW_TYPE_LABELS = {
    'buyer-experience':   'Buyer Experience',
    'rental-experience':  'Rental Experience',
    'general-feedback':   'General Feedback',
  };

  function StarRow({ rating, size = 14 }) {
    return (
      <span className="prr-stars" aria-label={`${rating} out of 5 stars`}>
        {[1,2,3,4,5].map(n => (
          <Star
            key={n}
            size={size}
            strokeWidth={1.5}
            className={n <= rating ? 'prr-star--filled' : 'prr-star--empty'}
            aria-hidden="true"
          />
        ))}
      </span>
    );
  }

  function DistributionBars({ distribution }) {
    if (!distribution || distribution.length === 0) return null;
    const max = Math.max(...distribution.map(d => d.count), 1);
    return (
      <div className="prr-dist">
        {distribution.map(({ star, count }) => (
          <div key={star} className="prr-dist-row">
            <span className="prr-dist-label">{star}★</span>
            <div className="prr-dist-track">
              <div
                className="prr-dist-fill"
                style={{ width: `${(count / max) * 100}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="prr-dist-count">{count}</span>
          </div>
        ))}
      </div>
    );
  }

  function ReviewCard({ review, currentUserId, isOwner, onReport, onHelpful }) {
    const [expanded,       setExpanded]       = useState(false);
    const [responseOpen,   setResponseOpen]   = useState(false);
    const reviewer = review.reviewerId;
    const name = reviewer
      ? `${reviewer.name || ''} ${reviewer.lastName?.[0] ? reviewer.lastName[0] + '.' : ''}`.trim()
      : 'Anonymous';

    return (
      <div className="prr-card">
        <div className="prr-card-top">
          <div className="prr-card-meta">
            <span className="prr-reviewer">{name}</span>
            <StarRow rating={review.rating} size={13} />
            <span className={`prr-type-chip prr-type-chip--${review.reviewType}`}>
              {REVIEW_TYPE_LABELS[review.reviewType] || review.reviewType}
            </span>
            {review.recommended && (
              <span className="prr-recommend-badge">✓ Recommends</span>
            )}
          </div>
          <span className="prr-date">
            {new Date(review.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {review.title && <p className="prr-card-title">{review.title}</p>}

        <div className={`prr-card-body${expanded ? '' : ' prr-card-body--clamped'}`}>
          {review.review}
        </div>
        {review.review.length > 180 && (
          <button className="prr-expand-btn" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}

        <div className="prr-card-actions">
          <button
            className="prr-helpful-btn"
            onClick={() => onHelpful(review._id)}
            aria-label="Mark as helpful"
          >
            <ThumbsUp size={12} strokeWidth={2} aria-hidden="true" />
            Helpful {review.reviewHelpfulCount > 0 ? `(${review.reviewHelpfulCount})` : ''}
          </button>
          {currentUserId && currentUserId !== String(review.reviewerId?._id) && (
            <button className="prr-report-btn" onClick={() => onReport(review._id)} aria-label="Report review">
              <Flag size={12} strokeWidth={2} aria-hidden="true" />
              Report
            </button>
          )}
        </div>

        {review.ownerResponse?.text && (
          <div className="prr-response-wrap">
            <button
              className="prr-response-toggle"
              onClick={() => setResponseOpen(o => !o)}
            >
              Owner responded · {new Date(review.ownerResponse.respondedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              {responseOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {responseOpen && (
              <div className="prr-response-body">{review.ownerResponse.text}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  const PropertyReputation = ({ propertyId, isOwner }) => {
    const { user } = useAuth();
    const [data,         setData]         = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [sort,         setSort]         = useState('recent');
    const [page,         setPage]         = useState(1);
    const [reviewModal,  setReviewModal]  = useState(false);
    const [reportTarget, setReportTarget] = useState(null);
    const [reportReason, setReportReason] = useState('');

    const fetchData = useCallback(async () => {
      setLoading(true);
      try {
        const res = await getPropertyReviews(propertyId, { sort, page });
        setData(res.data);
      } catch (err) {
        console.error('PropertyReputation fetch error:', err);
      } finally {
        setLoading(false);
      }
    }, [propertyId, sort, page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSortChange = (e) => {
      const newSort = e.target.value;
      setSort(newSort);
      setPage(1);
      track('review_sort_changed', { sort: newSort, propertyId });
    };

    const handleReport = (reviewId) => setReportTarget(reviewId);

    const submitReport = async () => {
      if (!reportReason) return;
      try {
        const token = localStorage.getItem('token');
        await reportPropertyReview(reportTarget, reportReason, token);
        track('review_reported', { reviewId: reportTarget, reason: reportReason });
        setReportTarget(null);
        setReportReason('');
        fetchData();
      } catch (err) {
        console.error('Report error:', err);
      }
    };

    const handleHelpful = async (reviewId) => {
      try {
        const token = localStorage.getItem('token');
        await markReviewHelpful(reviewId, token);
        track('review_helpful_voted', { reviewId, propertyId });
        fetchData();
      } catch (err) {
        if (err.response?.status !== 409) console.error('Helpful error:', err);
      }
    };

    const identity    = data?.identity;
    const reviews     = data?.reviews || [];
    const pages       = data?.pages   || 1;
    const noReviews   = !loading && (!identity || identity.reviewCount === 0);
    const hasReviewed = false; // determined server-side; handled via 409 response
    const canReview   = !!user && !isOwner;

    return (
      <section className="prr-section" aria-labelledby="prr-heading">
        <h2 id="prr-heading" className="prr-heading">Property Reviews</h2>

        {/* Empty state */}
        {noReviews && (
          <div className="prr-empty">
            <p className="prr-empty-text">No reviews yet.</p>
            {canReview && (
              <button className="prr-write-btn" onClick={() => setReviewModal(true)}>
                Be the first to review this property
              </button>
            )}
          </div>
        )}

        {/* Aggregate + distribution */}
        {identity && identity.reviewCount > 0 && (
          <>
            <div className="prr-aggregate">
              <div className="prr-agg-score">
                <span className="prr-agg-number">{(identity.avgRating || 0).toFixed(1)}</span>
                <StarRow rating={Math.round(identity.avgRating || 0)} size={18} />
                <span className="prr-agg-count">{identity.reviewCount} review{identity.reviewCount !== 1 ? 's' : ''}</span>
                {identity.recommendPercentage > 0 && (
                  <span className="prr-agg-recommend">{identity.recommendPercentage}% recommend</span>
                )}
              </div>
              <DistributionBars distribution={data?.ratingDistribution} />
            </div>

            {/* Controls row */}
            <div className="prr-controls">
              <select
                className="prr-sort-select"
                value={sort}
                onChange={handleSortChange}
                aria-label="Sort reviews"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {canReview && (
                <button className="prr-write-btn prr-write-btn--outline" onClick={() => setReviewModal(true)}>
                  Write a Review
                </button>
              )}
            </div>

            {/* Review list */}
            {loading ? (
              <p className="prr-loading">Loading reviews…</p>
            ) : (
              <div className="prr-list">
                {reviews.map(r => (
                  <ReviewCard
                    key={r._id}
                    review={r}
                    currentUserId={user?._id || user?.id}
                    isOwner={isOwner}
                    onReport={handleReport}
                    onHelpful={handleHelpful}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="prr-pagination">
                <button
                  className="prr-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >Previous</button>
                <span className="prr-page-info">Page {page} of {pages}</span>
                <button
                  className="prr-page-btn"
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                >Next</button>
              </div>
            )}
          </>
        )}

        {/* Review modal */}
        {reviewModal && (
          <ReviewModal
            propertyId={propertyId}
            onClose={() => setReviewModal(false)}
            onSuccess={() => { setReviewModal(false); setPage(1); fetchData(); }}
          />
        )}

        {/* Report modal */}
        {reportTarget && (
          <div className="prr-report-modal-backdrop" onClick={() => setReportTarget(null)}>
            <div className="prr-report-modal" onClick={e => e.stopPropagation()}>
              <h3>Report Review</h3>
              <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="prr-sort-select">
                <option value="">Select reason…</option>
                <option value="spam">Spam or fake review</option>
                <option value="offensive">Offensive content</option>
                <option value="irrelevant">Irrelevant to this property</option>
                <option value="other">Other</option>
              </select>
              <div className="prr-report-actions">
                <button className="rm-btn rm-btn--cancel" onClick={() => setReportTarget(null)}>Cancel</button>
                <button className="rm-btn rm-btn--submit" onClick={submitReport} disabled={!reportReason}>Report</button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  };

  export default PropertyReputation;
  ```

- [ ] **Step 2: Create `client/src/components/PropertyReputation.css`**

  ```css
  .prr-section {
    margin-top: var(--space-8, 48px);
    padding-top: var(--space-8, 48px);
    border-top: 1px solid var(--border-subtle, rgba(15,23,42,0.08));
  }

  .prr-heading {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    margin-bottom: var(--space-6, 32px);
  }

  /* ── Aggregate ──────────────────────────────────────────────────────────── */

  .prr-aggregate {
    display: flex;
    gap: var(--space-8, 48px);
    margin-bottom: var(--space-6, 32px);
    flex-wrap: wrap;
  }

  .prr-agg-score {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 120px;
  }

  .prr-agg-number {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    line-height: 1;
  }

  .prr-stars { display: inline-flex; gap: 2px; }
  .prr-star--filled { color: #f59e0b; }
  .prr-star--empty  { color: var(--gray-300, #cbd5e1); }

  .prr-agg-count {
    font-size: 0.875rem;
    color: var(--gray-500, #64748b);
  }

  .prr-agg-recommend {
    font-size: 0.8125rem;
    color: var(--color-primary, #0F766E);
    font-weight: 500;
  }

  /* ── Distribution bars ──────────────────────────────────────────────────── */

  .prr-dist {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
    max-width: 260px;
  }

  .prr-dist-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8125rem;
  }

  .prr-dist-label { min-width: 22px; color: var(--gray-500, #64748b); }

  .prr-dist-track {
    flex: 1;
    height: 8px;
    background: var(--gray-100, #f1f5f9);
    border-radius: 4px;
    overflow: hidden;
  }

  .prr-dist-fill {
    height: 100%;
    background: var(--color-primary, #0F766E);
    border-radius: 4px;
    transition: width 0.3s;
    min-width: 2px;
  }

  .prr-dist-count { min-width: 20px; text-align: right; color: var(--gray-600, #475569); font-weight: 500; }

  /* ── Controls ───────────────────────────────────────────────────────────── */

  .prr-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4, 16px);
    gap: 12px;
    flex-wrap: wrap;
  }

  .prr-sort-select {
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 0.875rem;
    background: var(--color-bg-surface, #fff);
    color: var(--color-graphite-700, #334155);
    cursor: pointer;
  }

  .prr-write-btn {
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1.5px solid var(--color-primary, #0F766E);
    background: var(--color-primary, #0F766E);
    color: #fff;
    transition: background 0.15s;
  }
  .prr-write-btn:hover { background: #0d6560; }
  .prr-write-btn--outline {
    background: transparent;
    color: var(--color-primary, #0F766E);
  }
  .prr-write-btn--outline:hover { background: rgba(15,118,110,0.06); }

  /* ── Review card ────────────────────────────────────────────────────────── */

  .prr-list { display: flex; flex-direction: column; gap: 16px; }

  .prr-card {
    border: 1px solid var(--border-subtle, rgba(15,23,42,0.08));
    border-radius: 10px;
    padding: 18px 20px;
    background: var(--color-bg-surface, #fff);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .prr-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .prr-card-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  .prr-reviewer { font-size: 0.875rem; font-weight: 600; color: var(--color-graphite-800, #1e293b); }

  .prr-date { font-size: 0.75rem; color: var(--gray-400, #94a3b8); white-space: nowrap; }

  .prr-type-chip {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--gray-100, #f1f5f9);
    color: var(--gray-600, #475569);
  }

  .prr-recommend-badge {
    font-size: 0.75rem;
    color: var(--color-primary, #0F766E);
    font-weight: 500;
  }

  .prr-card-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-graphite-800, #1e293b);
    margin: 0;
  }

  .prr-card-body {
    font-size: 0.9rem;
    color: var(--color-graphite-600, #475569);
    line-height: 1.65;
    margin: 0;
    white-space: pre-wrap;
  }

  .prr-card-body--clamped {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .prr-expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    color: var(--color-primary, #0F766E);
    padding: 0;
    font-weight: 500;
  }

  .prr-card-actions { display: flex; gap: 12px; align-items: center; }

  .prr-helpful-btn,
  .prr-report-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--gray-400, #94a3b8);
    padding: 0;
    transition: color 0.12s;
  }
  .prr-helpful-btn:hover { color: var(--color-primary, #0F766E); }
  .prr-report-btn:hover  { color: var(--color-error, #dc2626); }

  /* ── Owner response ─────────────────────────────────────────────────────── */

  .prr-response-wrap {
    background: var(--gray-50, #f8fafc);
    border-left: 3px solid var(--color-primary, #0F766E);
    border-radius: 0 6px 6px 0;
    padding: 10px 14px;
  }

  .prr-response-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-primary, #0F766E);
    padding: 0;
  }

  .prr-response-body {
    margin-top: 8px;
    font-size: 0.875rem;
    color: var(--color-graphite-600, #475569);
    line-height: 1.6;
  }

  /* ── Pagination ──────────────────────────────────────────────────────────── */

  .prr-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: var(--space-4, 16px);
  }

  .prr-page-btn {
    padding: 6px 16px;
    border-radius: 6px;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    background: var(--color-bg-surface, #fff);
    font-size: 0.875rem;
    cursor: pointer;
  }
  .prr-page-btn:disabled { opacity: 0.35; cursor: default; }

  .prr-page-info { font-size: 0.875rem; color: var(--gray-500, #64748b); }

  /* ── Empty + loading ────────────────────────────────────────────────────── */

  .prr-empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: var(--space-6, 32px) 0;
  }

  .prr-empty-text {
    font-size: 0.9375rem;
    color: var(--gray-400, #94a3b8);
    margin: 0;
  }

  .prr-loading {
    font-size: 0.9rem;
    color: var(--gray-400, #94a3b8);
    padding: 24px 0;
    text-align: center;
  }

  /* ── Report modal (inline) ──────────────────────────────────────────────── */

  .prr-report-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15,23,42,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 16px;
  }

  .prr-report-modal {
    background: var(--color-bg-surface, #fff);
    border-radius: 10px;
    padding: 24px;
    width: 100%;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 16px 32px -8px rgba(15,23,42,0.18);
  }

  .prr-report-modal h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-graphite-900, #0f172a);
  }

  .prr-report-actions { display: flex; gap: 8px; justify-content: flex-end; }
  ```

- [ ] **Step 3: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/components/PropertyReputation.js --max-warnings=0 2>&1 | tail -5
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/PropertyReputation.js client/src/components/PropertyReputation.css
  git commit -m "feat(reputation): add PropertyReputation component with aggregate, bars, reviews, pagination"
  ```

---

## Task 14: Wire PropertyReputation into PropertyDetail

**Files:**
- Modify: `client/src/pages/PropertyDetail.js`

- [ ] **Step 1: Add import to PropertyDetail.js**

  ```jsx
  import PropertyReputation from '../components/PropertyReputation';
  ```

- [ ] **Step 2: Find the seller card closing area**

  In `PropertyDetail.js`, find the `MemoizedSellerInfo` or seller card section. After it (and before related listings or the end of the main content), add:

  ```jsx
  {/* Property Reputation — reviews that survive relisting */}
  <PropertyReputation
    propertyId={property._id}
    isOwner={isOwner}
  />
  ```

- [ ] **Step 3: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/PropertyDetail.js --max-warnings=0 2>&1 | tail -5
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/pages/PropertyDetail.js
  git commit -m "feat(reputation): add PropertyReputation to PropertyDetail below seller card"
  ```

---

## Task 15: Wire PropertyRatingChip into Cards

**Files:**
- Modify: `client/src/pages/HomeNew.js`
- Modify: `client/src/pages/Search/index.js`
- Modify: `client/src/components/PropertyPreviewDrawer.js`

The `reputationSummary` field already comes from the API via the `getProperties` / `getHomeSections` payloads (added in Task 4). Each card just needs to import and render `<PropertyRatingChip>`.

- [ ] **Step 1: Add to HomeNew.js**

  Add import:
  ```jsx
  import PropertyRatingChip from '../components/PropertyRatingChip';
  ```

  In the Recently Added grid and Featured slider (and Spotlight card), after the `property-features` div:
  ```jsx
  {p.reputationSummary?.reviewCount > 0 && (
    <PropertyRatingChip
      avgRating={p.reputationSummary.avgRating}
      reviewCount={p.reputationSummary.reviewCount}
    />
  )}
  ```

- [ ] **Step 2: Add to Search/index.js**

  Add import:
  ```jsx
  import PropertyRatingChip from '../../components/PropertyRatingChip';
  ```

  In `renderCard`, after the property features row:
  ```jsx
  {property.reputationSummary?.reviewCount > 0 && (
    <PropertyRatingChip
      avgRating={property.reputationSummary.avgRating}
      reviewCount={property.reputationSummary.reviewCount}
    />
  )}
  ```

- [ ] **Step 3: Add to PropertyPreviewDrawer.js**

  Add import:
  ```jsx
  import PropertyRatingChip from './PropertyRatingChip';
  ```

  In the drawer's price/meta block, after the price line:
  ```jsx
  {property.reputationSummary?.reviewCount > 0 && (
    <PropertyRatingChip
      avgRating={property.reputationSummary.avgRating}
      reviewCount={property.reputationSummary.reviewCount}
    />
  )}
  ```

- [ ] **Step 4: ESLint check all three files**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/HomeNew.js src/pages/Search/index.js src/components/PropertyPreviewDrawer.js --max-warnings=0 2>&1 | tail -10
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/HomeNew.js client/src/pages/Search/index.js client/src/components/PropertyPreviewDrawer.js
  git commit -m "feat(reputation): add PropertyRatingChip to homepage, search, and preview drawer cards"
  ```

---

## Task 16: Admin Moderation Tab in AdminReports

**Files:**
- Modify: `client/src/pages/AdminReports.js`

- [ ] **Step 1: Read AdminReports.js to understand the existing tab structure**

  Find the `TABS` array or tab rendering logic in `AdminReports.js`.

- [ ] **Step 2: Add "Property Reviews" tab**

  Add to the TABS array:
  ```js
  { id: 'property-reviews', label: 'Property Reviews' }
  ```

  Add to the API import block:
  ```js
  // In api.js import: add getAdminPropertyReviews, adminModerateReview, adminDeletePropertyReview
  // These will call:
  // GET /api/property-reviews?status=reported  (via existing admin endpoints)
  // PATCH /api/property-reviews/:id/moderate
  // DELETE /api/property-reviews/:id/admin
  ```

  Add API helper exports to `api.js`:
  ```js
  export const getAdminPropertyReviews = (status, token) =>
    api.get('/property-reviews', {
      params: { status, limit: 50 },
      headers: { Authorization: `Bearer ${token}` },
    });

  export const adminModeratePropertyReview = (reviewId, status, moderatorNotes, token) =>
    api.patch(`/property-reviews/${reviewId}/moderate`, { status, moderatorNotes }, {
      headers: { Authorization: `Bearer ${token}` },
    });

  export const adminDeletePropertyReview = (reviewId, token) =>
    api.delete(`/property-reviews/${reviewId}/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  ```

  **Note:** The existing `GET /:propertyIdentityId` route does not support status filtering for admin. Add a small admin list endpoint to `propertyReviewRoutes.js`:

  ```js
  // GET /api/property-reviews/admin/list?status=reported|hidden (admin only)
  router.get('/admin/list', verifyToken, isAdmin, async (req, res) => {
    try {
      const { status = 'reported', page = 1, limit = 20 } = req.query;
      const validStatuses = ['reported', 'hidden', 'active'];
      const statusFilter = validStatuses.includes(status) ? status : 'reported';
      const reviews = await PropertyReview.find({ status: statusFilter })
        .sort({ reportCount: -1, createdAt: -1 })
        .skip((page - 1) * Math.min(parseInt(limit), 50))
        .limit(Math.min(parseInt(limit), 50))
        .populate('reviewerId', 'name lastName email')
        .populate({ path: 'propertyIdentityId', select: 'fingerprint' })
        .lean();
      const total = await PropertyReview.countDocuments({ status: statusFilter });
      res.json({ reviews, total });
    } catch (err) {
      res.status(500).json({ message: 'Failed to load reviews.' });
    }
  });
  ```

  Add this route to `propertyReviewRoutes.js` BEFORE the `/:id` routes to avoid path conflicts.

- [ ] **Step 3: Add the "Property Reviews" tab content in AdminReports.js**

  The tab renders a table with columns: Property (fingerprint address) · Reviewer · Rating · Status · Reports · Excerpt · Date · Actions (Restore / Hide / Delete).

  Use the same table pattern as the existing fraud reports tab in AdminAbuse.js for consistency.

- [ ] **Step 4: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/AdminReports.js --max-warnings=0 2>&1 | tail -5
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/AdminReports.js client/src/services/api.js server/routes/propertyReviewRoutes.js
  git commit -m "feat(reputation): add Property Reviews moderation tab to AdminReports"
  ```

---

## Task 17: Final Build Verification

- [ ] **Step 1: Run React build**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  npm run build 2>&1 | grep -E "^(Compiled|ERROR)" | head -5
  ```
  Expected: `Compiled with warnings.` or `Compiled successfully.` — zero errors.

- [ ] **Step 2: Server syntax check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "
    require('./models/PropertyIdentity');
    require('./models/PropertyReview');
    require('./lib/reputation/resolveIdentity');
    require('./lib/reputation/updateAggregates');
    require('./controllers/propertyReviewController');
    require('./routes/propertyReviewRoutes');
    console.log('All reputation modules OK');
  "
  ```
  Expected: `All reputation modules OK`

- [ ] **Step 3: ESLint on all new/modified client files**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint \
    src/components/PropertyRatingChip.js \
    src/components/ReviewModal.js \
    src/components/PropertyReputation.js \
    src/pages/PropertyDetail.js \
    src/pages/HomeNew.js \
    src/pages/Search/index.js \
    src/components/PropertyPreviewDrawer.js \
    src/pages/AdminReports.js \
    src/services/api.js \
    src/services/analytics.js \
    --max-warnings=0 2>&1 | tail -10
  ```
  Expected: no output (0 errors, 0 warnings).

- [ ] **Step 4: Final commit**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  git log --oneline -5
  git status
  ```
  Verify working tree is clean.

---

## Deliverables Summary

### Files Created (13)
| File | Purpose |
|---|---|
| `server/models/PropertyIdentity.js` | Fingerprint + cached aggregates, never deleted |
| `server/models/PropertyReview.js` | Review with status, helpful votes, owner response |
| `server/lib/reputation/resolveIdentity.js` | buildFingerprint + resolvePropertyIdentity |
| `server/lib/reputation/updateAggregates.js` | Recalculate and write all aggregate fields |
| `server/routes/propertyReviewRoutes.js` | All 11 API routes |
| `server/controllers/propertyReviewController.js` | All 9 handlers |
| `server/scripts/backfillPropertyIdentities.js` | Idempotent one-time backfill |
| `client/src/components/PropertyRatingChip.js` + `.css` | Compact `★ 4.7 (23)` chip |
| `client/src/components/ReviewModal.js` + `.css` | Submit/edit form |
| `client/src/components/PropertyReputation.js` + `.css` | Full reputation section |

### Files Modified (10)
| File | Change |
|---|---|
| `server/server.js` | Mount propertyReviewRoutes |
| `server/models/Property.js` | Add propertyIdentityId field |
| `server/controllers/propertyController.js` | Resolve identity on create/update/delete; inject reputationSummary |
| `server/routes/adminRoutes.js` | Add rebuild endpoint |
| `client/src/services/api.js` | Add 11 review API functions |
| `client/src/services/analytics.js` | Add 12 review events |
| `client/src/pages/PropertyDetail.js` | Add PropertyReputation |
| `client/src/pages/HomeNew.js` | PropertyRatingChip on cards |
| `client/src/pages/Search/index.js` | PropertyRatingChip on cards |
| `client/src/components/PropertyPreviewDrawer.js` | PropertyRatingChip in drawer |
| `client/src/pages/AdminReports.js` | Property Reviews moderation tab |
