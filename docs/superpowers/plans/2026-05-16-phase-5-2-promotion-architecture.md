# Phase 5.2 — Promotion Product Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete revenue architecture for listing promotions — data model, ranking engine, badges, homepage placement, admin controls, and fraud architecture — without payment processing.

**Architecture:** Promotion tiers (FREE/FEATURED/PREMIUM/SPOTLIGHT) are stored on the Property model. A shared constants file (`server/lib/promotion/constants.js`) is the single source of truth for tier scores, multipliers, and duration presets. A ranking engine (`server/lib/ranking/listingRanking.js`) computes `finalScore` which is persisted and used to sort search results. Stale promotions auto-expire via `expireStalePromotions()` called from the admin listings endpoint. All promotion management is exposed via a new admin API endpoint and UI in AdminListings. Fraud architecture (fields + utility) lives alongside promotion utilities in `server/lib/promotion/`.

**Tech Stack:** Node.js/Express/Mongoose (backend), React (frontend), Lucide icons, existing PostHog analytics wrapper (`track()`).

---

## Revision Notes (2026-05-29)

| Change | Before | After |
|--------|--------|-------|
| FEATURED search multiplier | ×1.0 (no boost) | ×1.15 (light boost) |
| MAX_SPOTLIGHT cap | 10 | 5 |
| Fraud terminal status | HIDDEN | SUSPENDED |
| Promotion constants | inline magic numbers | shared `constants.js` |
| Promotion expiration | manual only | auto-expire on admin listing fetch |

---

## File Map

### New files
| File | Responsibility |
|------|----------------|
| `server/lib/promotion/constants.js` | Single source of truth: tier scores, multipliers, durations |
| `server/lib/ranking/listingRanking.js` | `getListingRankScore(listing)` — imports multipliers from constants |
| `server/lib/promotion/fraudStatus.js` | `getFraudStatus(reportCount)` + SUSPENDED threshold |
| `server/lib/promotion/isNewListing.js` | `isNewListing(createdAt)` — 14-day window |
| `server/lib/promotion/expirePromotions.js` | `expireStalePromotions()` — bulk-resets expired listings to FREE |
| `server/lib/promotion/homepagePlacement.js` | Async selectors: spotlight (max 5), featured, new, recent |
| `client/src/components/PromotionBadge.js` | Reusable badge for FEATURED / PREMIUM / SPOTLIGHT |
| `client/src/components/PromotionBadge.css` | Badge styles — no gradients, no neon |

### Modified files
| File | Change |
|------|--------|
| `server/models/Property.js` | +promotion fields, +fraud fields (SUSPENDED), +3 indexes, +pre-save tier→score sync |
| `server/routes/adminRoutes.js` | +`PUT /admin/properties/:id/promotion`, +`POST /admin/promotions/expire-stale`; auto-expire on admin listings GET |
| `server/controllers/propertyController.js` | +promotion fields to SEARCH_SELECT; sort by `finalScore` |
| `client/src/components/PropertyMap.css` | +`.mp-pin--spotlight` amber ring styles |
| `client/src/components/PropertyMap.js` | Apply `mp-pin--spotlight` class when `promotionTier === 'SPOTLIGHT'` |
| `client/src/pages/AdminListings.js` | +Promote button, +promotion modal with duration presets |
| `client/src/services/api.js` | +`updatePropertyPromotion()`, +`expireStalePromotions()` |
| `client/src/services/analytics.js` | +5 promotion events to `TRACKED_FOR_STORE` |

---

## Task 1: Property Model — Promotion & Fraud Fields

**Files:**
- Modify: `server/models/Property.js`

- [ ] **Step 1: Add promotion fields after the existing `isSponsored` / `promotionExpiry` block (around line 224)**

  ```js
  // Promotion tier system (Phase 5.2)
  promotionTier: {
    type: String,
    enum: ['FREE', 'FEATURED', 'PREMIUM', 'SPOTLIGHT'],
    default: 'FREE',
  },
  promotionScore: { type: Number, default: 1 }, // 1=FREE 2=FEATURED 3=PREMIUM 4=SPOTLIGHT
  promotionStartDate: { type: Date, default: null },
  promotionEndDate:   { type: Date, default: null },
  // finalScore = organicScore × promotionMultiplier (updated by ranking engine)
  finalScore: { type: Number, default: 0 },

  // Fraud reporting architecture (Phase 5.2) — no UI yet
  fraudReportCount: { type: Number, default: 0 },
  fraudStatus: {
    type: String,
    enum: ['NORMAL', 'WARNING', 'REVIEW', 'SUSPENDED'],
    default: 'NORMAL',
  },
  ```

- [ ] **Step 2: Auto-derive promotionScore in the pre-save hook**

  Inside `propertySchema.pre('save', ...)` (around line 320), add before `next()`:

  ```js
  // Sync promotionScore from tier — single source of truth is constants.js
  const TIER_SCORES_PRESAVE = { FREE: 1, FEATURED: 2, PREMIUM: 3, SPOTLIGHT: 4 };
  if (this.promotionTier) {
    this.promotionScore = TIER_SCORES_PRESAVE[this.promotionTier] || 1;
  }
  ```

  Note: uses inline object (not `require`) to avoid circular dependency at model-load time.

- [ ] **Step 3: Add indexes for new sort and query fields**

  After the existing index block (around line 312), add:

  ```js
  propertySchema.index({ finalScore: -1 });
  propertySchema.index({ promotionTier: 1, isPromoted: 1, promotionEndDate: 1 });
  propertySchema.index({ fraudStatus: 1 });
  ```

- [ ] **Step 4: Verify schema loads**

  ```bash
  node -e "require('./server/models/Property'); console.log('Schema OK')"
  ```
  Expected: `Schema OK`

- [ ] **Step 5: Commit**

  ```bash
  git add server/models/Property.js
  git commit -m "feat: add promotion tier, finalScore, and fraud fields (SUSPENDED) to Property model"
  ```

---

## Task 2: Promotion Constants — Single Source of Truth

**Files:**
- Create: `server/lib/promotion/constants.js`

- [ ] **Step 1: Create the lib/promotion directory**

  ```bash
  mkdir -p "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server\lib\promotion"
  ```

- [ ] **Step 2: Write `constants.js`**

  Create `server/lib/promotion/constants.js`:

  ```js
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
  ```

- [ ] **Step 3: Verify the module loads and values are correct**

  ```bash
  node -e "
  const c = require('./server/lib/promotion/constants');
  console.assert(c.PROMOTION_MULTIPLIERS.FEATURED  === 1.15, 'FEATURED multiplier');
  console.assert(c.PROMOTION_MULTIPLIERS.PREMIUM   === 1.50, 'PREMIUM multiplier');
  console.assert(c.PROMOTION_MULTIPLIERS.SPOTLIGHT === 3.00, 'SPOTLIGHT multiplier');
  console.assert(c.TIER_SCORES.SPOTLIGHT           === 4,    'SPOTLIGHT score');
  console.assert(c.PROMOTION_DURATIONS_DAYS.MONTHLY === 30,  'monthly duration');
  console.log('constants.js OK');
  "
  ```
  Expected: `constants.js OK`

- [ ] **Step 4: Commit**

  ```bash
  git add server/lib/promotion/constants.js
  git commit -m "feat: add promotion constants (multipliers, tier scores, duration presets)"
  ```

---

## Task 3: Server — Ranking Engine

**Files:**
- Create: `server/lib/ranking/listingRanking.js`

- [ ] **Step 1: Create the lib/ranking directory**

  ```bash
  mkdir -p "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server\lib\ranking"
  ```

- [ ] **Step 2: Write `listingRanking.js`**

  Create `server/lib/ranking/listingRanking.js`:

  ```js
  'use strict';

  const { PROMOTION_MULTIPLIERS } = require('../promotion/constants');

  /**
   * Compute organic and final rank scores for a listing.
   *
   * Organic score (0–10):
   *   freshness          — up to 3 pts, decays linearly to 0 at 60 days
   *   ownershipVerified  — 2 pts
   *   isApproved         — 1 pt
   *   imageBonus         — up to 1 pt (saturates at 8 images)
   *   qualityBonus       — up to 2 pts (from stored qualityScore, max raw ~11)
   *   engagement         — up to 1 pt (views + inquiries, capped)
   *   searchPenalty      — deduction (0.5 × penalty value)
   *
   * finalScore = organicScore × promotionMultiplier
   *
   * Multipliers (from constants.js):
   *   FREE      = ×1.00
   *   FEATURED  = ×1.15  (light search presence + homepage featured section)
   *   PREMIUM   = ×1.50
   *   SPOTLIGHT = ×3.00
   *
   * Multiplier only applies when the promotion window is currently active
   * (promotionStartDate <= now <= promotionEndDate; null = open-ended).
   *
   * @param {Object} listing — plain object or Mongoose document (.toObject())
   * @returns {{ organicScore: number, finalScore: number }}
   */
  function getListingRankScore(listing) {
    // ── Freshness ──────────────────────────────────────────────────────────────
    const ageMs          = Date.now() - new Date(listing.createdAt || 0).getTime();
    const ageDays        = ageMs / 86_400_000;
    const freshnessScore = Math.max(0, 1 - ageDays / 60); // 1.0 → 0.0 over 60 days

    // ── Trust signals ──────────────────────────────────────────────────────────
    const ownershipVerified = listing.ownershipVerificationStatus === 'approved' ? 1 : 0;
    const isApproved        = listing.isApproved ? 1 : 0;
    const imageBonus        = Math.min((listing.images?.length || 0) / 8, 1); // saturates at 8

    // ── Quality (pre-computed by listingQuality.js, max raw ~11) ──────────────
    const qualityBonus = Math.min((listing.qualityScore || 0) / 11, 1) * 2; // up to 2 pts

    // ── Engagement ────────────────────────────────────────────────────────────
    const views          = listing.views || listing.viewsCount || 0;
    const inquiries      = listing.inquiryCount || 0;
    const engagementScore = Math.min(views * 0.01 + inquiries * 0.1, 1); // cap at 1

    // ── Search penalty ────────────────────────────────────────────────────────
    const penalty = listing.searchPenalty || 0;

    // ── Organic score (0–10) ──────────────────────────────────────────────────
    const organicScore = Math.max(0,
      freshnessScore * 3 +
      ownershipVerified * 2 +
      isApproved        * 1 +
      imageBonus        * 1 +
      qualityBonus          +  // up to 2
      engagementScore   * 1 -
      penalty           * 0.5
    );

    // ── Promotion multiplier ──────────────────────────────────────────────────
    const tier       = listing.promotionTier || 'FREE';
    const multiplier = PROMOTION_MULTIPLIERS[tier] ?? 1.0;

    const now     = new Date();
    const startOk = !listing.promotionStartDate || new Date(listing.promotionStartDate) <= now;
    const endOk   = !listing.promotionEndDate   || new Date(listing.promotionEndDate)   >= now;
    const isActive = listing.isPromoted && startOk && endOk;

    const effectiveMultiplier = isActive ? multiplier : 1.0;
    const finalScore          = organicScore * effectiveMultiplier;

    return {
      organicScore: Math.round(organicScore * 100) / 100,
      finalScore:   Math.round(finalScore   * 100) / 100,
    };
  }

  module.exports = { getListingRankScore };
  ```

- [ ] **Step 3: Smoke-test the ranking function**

  ```bash
  node -e "
  const { getListingRankScore } = require('./server/lib/ranking/listingRanking');
  const base = {
    createdAt: new Date(), isApproved: true,
    images: [{},{},{}], qualityScore: 5, isPromoted: false,
  };
  const endSoon = new Date(Date.now() + 86400000);
  const free      = getListingRankScore({ ...base, promotionTier: 'FREE' });
  const featured  = getListingRankScore({ ...base, promotionTier: 'FEATURED',  isPromoted: true, promotionEndDate: endSoon });
  const premium   = getListingRankScore({ ...base, promotionTier: 'PREMIUM',   isPromoted: true, promotionEndDate: endSoon });
  const spotlight = getListingRankScore({ ...base, promotionTier: 'SPOTLIGHT', isPromoted: true, promotionEndDate: endSoon });
  console.log('FREE:',      free);
  console.log('FEATURED:',  featured);
  console.log('PREMIUM:',   premium);
  console.log('SPOTLIGHT:', spotlight);
  console.assert(featured.finalScore  > free.finalScore,     'FEATURED > FREE');
  console.assert(premium.finalScore   > featured.finalScore, 'PREMIUM > FEATURED');
  console.assert(spotlight.finalScore > premium.finalScore,  'SPOTLIGHT > PREMIUM');
  const ratio = spotlight.finalScore / free.finalScore;
  console.log('SPOTLIGHT/FREE ratio:', ratio.toFixed(2), '(should be ~3.0)');
  console.log('All assertions passed');
  "
  ```
  Expected: `FEATURED > FREE` (×1.15 lift), `PREMIUM > FEATURED` (×1.5 vs ×1.15), `SPOTLIGHT > PREMIUM` (×3.0), `All assertions passed`

- [ ] **Step 4: Commit**

  ```bash
  git add server/lib/ranking/listingRanking.js
  git commit -m "feat: add listing ranking engine (FEATURED=x1.15, PREMIUM=x1.5, SPOTLIGHT=x3.0)"
  ```

---

## Task 4: Server — Fraud Status Utility

**Files:**
- Create: `server/lib/promotion/fraudStatus.js`

- [ ] **Step 1: Write `fraudStatus.js`**

  Create `server/lib/promotion/fraudStatus.js`:

  ```js
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
  ```

- [ ] **Step 2: Verify all thresholds**

  ```bash
  node -e "
  const { getFraudStatus } = require('./server/lib/promotion/fraudStatus');
  console.assert(getFraudStatus(0)  === 'NORMAL',    '0  → NORMAL');
  console.assert(getFraudStatus(2)  === 'NORMAL',    '2  → NORMAL');
  console.assert(getFraudStatus(3)  === 'WARNING',   '3  → WARNING');
  console.assert(getFraudStatus(4)  === 'WARNING',   '4  → WARNING');
  console.assert(getFraudStatus(5)  === 'REVIEW',    '5  → REVIEW');
  console.assert(getFraudStatus(7)  === 'REVIEW',    '7  → REVIEW');
  console.assert(getFraudStatus(8)  === 'SUSPENDED', '8  → SUSPENDED');
  console.assert(getFraudStatus(20) === 'SUSPENDED', '20 → SUSPENDED');
  console.log('All fraud status assertions passed');
  "
  ```
  Expected: `All fraud status assertions passed`

- [ ] **Step 3: Commit**

  ```bash
  git add server/lib/promotion/fraudStatus.js
  git commit -m "feat: add fraud status utility (NORMAL/WARNING/REVIEW/SUSPENDED thresholds)"
  ```

---

## Task 5: Server — isNewListing Utility

**Files:**
- Create: `server/lib/promotion/isNewListing.js`

- [ ] **Step 1: Write `isNewListing.js`**

  Create `server/lib/promotion/isNewListing.js`:

  ```js
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
  ```

- [ ] **Step 2: Verify**

  ```bash
  node -e "
  const { isNewListing } = require('./server/lib/promotion/isNewListing');
  const now      = new Date();
  const old      = new Date(Date.now() - 15 * 86400000);
  const fresh    = new Date(Date.now() -  5 * 86400000);
  const boundary = new Date(Date.now() - 14 * 86400000 + 60000);
  console.assert(isNewListing(now)      === true,  'now → new');
  console.assert(isNewListing(fresh)    === true,  '5d → new');
  console.assert(isNewListing(boundary) === true,  'boundary → new');
  console.assert(isNewListing(old)      === false, '15d → not new');
  console.assert(isNewListing(null)     === false, 'null → not new');
  console.log('All isNewListing assertions passed');
  "
  ```
  Expected: `All isNewListing assertions passed`

- [ ] **Step 3: Commit**

  ```bash
  git add server/lib/promotion/isNewListing.js
  git commit -m "feat: add isNewListing utility (14-day window)"
  ```

---

## Task 6: Server — Automatic Promotion Expiration

**Files:**
- Create: `server/lib/promotion/expirePromotions.js`

- [ ] **Step 1: Write `expirePromotions.js`**

  Create `server/lib/promotion/expirePromotions.js`:

  ```js
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
  ```

- [ ] **Step 2: Verify the module loads**

  ```bash
  node -e "require('./server/lib/promotion/expirePromotions'); console.log('expirePromotions OK')"
  ```
  Expected: `expirePromotions OK`

- [ ] **Step 3: Commit**

  ```bash
  git add server/lib/promotion/expirePromotions.js
  git commit -m "feat: add expireStalePromotions utility (bulk-resets expired listings to FREE)"
  ```

---

## Task 7: Server — Homepage Placement Selectors

**Files:**
- Create: `server/lib/promotion/homepagePlacement.js`

- [ ] **Step 1: Write `homepagePlacement.js`**

  Create `server/lib/promotion/homepagePlacement.js`:

  ```js
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
  ```

- [ ] **Step 2: Verify the module loads**

  ```bash
  node -e "
  const hp = require('./server/lib/promotion/homepagePlacement');
  console.log('Exports:', Object.keys(hp));
  console.assert(hp.MAX_SPOTLIGHT === 5, 'MAX_SPOTLIGHT must be 5');
  console.log('homepagePlacement OK');
  "
  ```
  Expected: `Exports: [ 'getSpotlightListings', 'getFeaturedListings', 'getNewListings', 'getRecentListings', 'MAX_SPOTLIGHT' ]` then `homepagePlacement OK`

- [ ] **Step 3: Commit**

  ```bash
  git add server/lib/promotion/homepagePlacement.js
  git commit -m "feat: add homepage placement selectors (MAX_SPOTLIGHT=5, console validation)"
  ```

---

## Task 8: Server — Admin Promotion API Endpoint

**Files:**
- Modify: `server/routes/adminRoutes.js`

- [ ] **Step 1: Add requires at the top of adminRoutes.js**

  After the last existing `require` in the file (the one for `recalculateAndStoreQuality`), add:

  ```js
  const { getListingRankScore }    = require('../lib/ranking/listingRanking');
  const { expireStalePromotions }  = require('../lib/promotion/expirePromotions');
  const { VALID_TIERS, TIER_SCORES } = require('../lib/promotion/constants');
  ```

- [ ] **Step 2: Add auto-expire side-effect to the admin GET /listings endpoint**

  In `server/routes/adminRoutes.js`, find the `router.get('/listings', ...)` handler. At the very start of its `try` block (before building the query), add one line:

  ```js
  // Auto-expire stale promotions on every admin listing fetch
  expireStalePromotions().catch(err => console.error('[adminRoutes] expireStalePromotions:', err));
  ```

- [ ] **Step 3: Add the promotion update endpoint**

  Before `module.exports = router;` at the bottom of the file, add:

  ```js
  // ─── Promotion management ─────────────────────────────────────────────────────
  // Admin-only override until payment system exists.
  // Recomputes finalScore immediately after updating promotion fields.
  router.put('/properties/:id/promotion', verifyToken, isAdmin, async (req, res) => {
    try {
      const { promotionTier, promotionStartDate, promotionEndDate } = req.body;

      if (promotionTier && !VALID_TIERS.includes(promotionTier)) {
        return res.status(400).json({
          message: `Invalid promotionTier. Must be one of: ${VALID_TIERS.join(', ')}`,
        });
      }

      const tier       = promotionTier || 'FREE';
      const isPromoted = tier !== 'FREE';

      const promotionUpdate = {
        promotionTier:      tier,
        promotionScore:     TIER_SCORES[tier],
        isPromoted,
        promotionStartDate: promotionStartDate ? new Date(promotionStartDate) : null,
        promotionEndDate:   promotionEndDate   ? new Date(promotionEndDate)   : null,
      };

      const property = await Property.findByIdAndUpdate(
        req.params.id,
        promotionUpdate,
        { new: true },
      ).lean();

      if (!property) return res.status(404).json({ message: 'Property not found' });

      // Recompute and persist finalScore with the updated promotion state
      const { finalScore } = getListingRankScore(property);
      await Property.findByIdAndUpdate(req.params.id, { finalScore });

      res.json({
        message:        'Promotion updated',
        promotionTier:  tier,
        promotionScore: TIER_SCORES[tier],
        finalScore,
        isPromoted,
      });
    } catch (err) {
      console.error('[admin] promotion update error:', err);
      res.status(500).json({ message: 'Failed to update promotion' });
    }
  });

  // Manual trigger for promotion expiration (until cron is configured in Phase 5.3)
  router.post('/promotions/expire-stale', verifyToken, isAdmin, async (req, res) => {
    try {
      const count = await expireStalePromotions();
      res.json({ message: `Reset ${count} expired promotion(s) to FREE`, count });
    } catch (err) {
      console.error('[admin] expire-stale error:', err);
      res.status(500).json({ message: 'Failed to expire promotions' });
    }
  });
  ```

- [ ] **Step 4: Verify the routes file loads**

  ```bash
  node -e "require('./server/routes/adminRoutes'); console.log('adminRoutes OK')"
  ```
  Expected: `adminRoutes OK`

- [ ] **Step 5: Commit**

  ```bash
  git add server/routes/adminRoutes.js
  git commit -m "feat: add admin promotion endpoint + auto-expire on listings fetch"
  ```

---

## Task 9: Server — Integrate Ranking Score into Search Sort

**Files:**
- Modify: `server/controllers/propertyController.js`

- [ ] **Step 1: Add promotion fields to SEARCH_SELECT**

  In `server/controllers/propertyController.js`, find the `SEARCH_SELECT` constant (around line 90) and replace it entirely with:

  ```js
  const SEARCH_SELECT = [
    'title', 'price', 'currency',
    'city', 'location', 'address',
    'coordinates',
    'bedrooms', 'bathrooms', 'builtUpArea',
    'images',
    'listingStatus', 'listingBadge', 'isSponsored', 'status',
    'createdAt',
    // Trust signals
    'qualityScore', 'ownershipVerificationStatus', 'suspectedDuplicate',
    // Promotion
    'promotionTier', 'promotionScore', 'isPromoted', 'finalScore',
  ].join(' ');
  ```

- [ ] **Step 2: Update the sort to use finalScore as primary key**

  In the same file, find `.sort({ qualityScore: -1, createdAt: -1 })` (around line 149). Change it to:

  ```js
  .sort({ finalScore: -1, qualityScore: -1, createdAt: -1 })
  ```

- [ ] **Step 3: Verify the controller loads**

  ```bash
  node -e "require('./server/controllers/propertyController'); console.log('propertyController OK')"
  ```
  Expected: `propertyController OK`

- [ ] **Step 4: Commit**

  ```bash
  git add server/controllers/propertyController.js
  git commit -m "feat: sort search results by finalScore (FEATURED x1.15, PREMIUM x1.5, SPOTLIGHT x3.0)"
  ```

---

## Task 10: Client — PromotionBadge Component

**Files:**
- Create: `client/src/components/PromotionBadge.js`
- Create: `client/src/components/PromotionBadge.css`

- [ ] **Step 1: Write `PromotionBadge.css`**

  Create `client/src/components/PromotionBadge.css`:

  ```css
  /* PromotionBadge
     FEATURED:  slate graphite (elegant, subtle)
     PREMIUM:   emerald-tinted
     SPOTLIGHT: warm amber
     No gradients. No neon. Matches platform design system.
  */

  .promo-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 7px;
    border-radius: var(--radius-full, 9999px);
    font-family: var(--font-sans, 'Inter Tight', sans-serif);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    white-space: nowrap;
    border: 1px solid transparent;
    line-height: 1.4;
  }

  /* FEATURED — slate graphite */
  .promo-badge--featured {
    background:   var(--gray-100,  #F1F5F9);
    color:        var(--gray-700,  #334155);
    border-color: var(--gray-200,  #E2E8F0);
  }

  /* PREMIUM — emerald tint */
  .promo-badge--premium {
    background:   var(--color-primary-light, rgba(15, 118, 110, 0.08));
    color:        var(--color-primary,       #0F766E);
    border-color: var(--color-primary-tint,  rgba(15, 118, 110, 0.18));
  }

  /* SPOTLIGHT — warm amber */
  .promo-badge--spotlight {
    background:   #FEF3C7;
    color:        #92400E;
    border-color: #FDE68A;
  }

  /* Size modifier */
  .promo-badge--md {
    font-size: 0.75rem;
    padding: 3px 9px;
    gap: 4px;
  }
  ```

- [ ] **Step 2: Write `PromotionBadge.js`**

  Create `client/src/components/PromotionBadge.js`:

  ```jsx
  import React from 'react';
  import { Star, Zap, Flame } from 'lucide-react';
  import './PromotionBadge.css';

  const BADGE_CONFIG = {
    FEATURED:  { Icon: Star,  label: 'Featured',  modifier: 'featured'  },
    PREMIUM:   { Icon: Zap,   label: 'Premium',   modifier: 'premium'   },
    SPOTLIGHT: { Icon: Flame, label: 'Spotlight', modifier: 'spotlight' },
  };

  /**
   * PromotionBadge — inline tier badge for listings.
   *
   * @param {{ tier: 'FEATURED'|'PREMIUM'|'SPOTLIGHT', size?: 'sm'|'md' }} props
   * @returns {JSX.Element|null} — null for FREE or unknown tiers
   */
  const PromotionBadge = ({ tier, size = 'sm' }) => {
    const config = BADGE_CONFIG[tier];
    if (!config) return null;

    const { Icon, label, modifier } = config;
    const iconSize = size === 'md' ? 11 : 10;

    return (
      <span
        className={`promo-badge promo-badge--${modifier}${size === 'md' ? ' promo-badge--md' : ''}`}
        aria-label={`${label} listing`}
      >
        <Icon size={iconSize} strokeWidth={2.5} aria-hidden="true" />
        {label}
      </span>
    );
  };

  export default PromotionBadge;
  ```

- [ ] **Step 3: Verify ESLint**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  npx eslint src/components/PromotionBadge.js --max-warnings=0
  ```
  Expected: No output

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/PromotionBadge.js client/src/components/PromotionBadge.css
  git commit -m "feat: add PromotionBadge component (FEATURED/PREMIUM/SPOTLIGHT, no gradients)"
  ```

---

## Task 11: Client — Spotlight Map Pin

**Files:**
- Modify: `client/src/components/PropertyMap.css`
- Modify: `client/src/components/PropertyMap.js`

- [ ] **Step 1: Add `.mp-pin--spotlight` to PropertyMap.css**

  Open `client/src/components/PropertyMap.css`. After the `.mp-pin--single-detail` block (around line 216), add:

  ```css
  /* Spotlight listing — slightly larger, amber ring, no animation, no pulse */
  .mp-pin--spotlight {
    border-color: #FBBF24;
    box-shadow:
      0 0 0 2px rgba(251, 191, 36, 0.20),
      0 2px 6px  rgba(15, 23, 42, 0.18),
      0 4px 16px rgba(15, 23, 42, 0.14);
    transform: scale(1.10);
    transform-origin: center bottom;
    z-index: 5;
  }

  .mp-pin--spotlight:hover {
    border-color: #F59E0B;
    background: #F59E0B;
    color: #fff;
    box-shadow:
      0 0 0 3px rgba(245, 158, 11, 0.24),
      0 10px 24px rgba(245, 158, 11, 0.20);
    transform: translateY(-2px) scale(1.14);
  }
  ```

- [ ] **Step 2: Apply the class in PropertyMap.js**

  Open `client/src/components/PropertyMap.js`. Find the individual pin creation block (around line 393):

  ```js
  const pinEl = document.createElement('div');
  pinEl.className = `mp-pin${hasExactGroup ? ' mp-pin--grouped' : ''}`;
  ```

  Replace those two lines with:

  ```js
  const isSpotlightPin = property.promotionTier === 'SPOTLIGHT' && property.isPromoted;
  const pinEl = document.createElement('div');
  pinEl.className = [
    'mp-pin',
    hasExactGroup  ? 'mp-pin--grouped'   : '',
    isSpotlightPin ? 'mp-pin--spotlight' : '',
  ].filter(Boolean).join(' ');
  ```

- [ ] **Step 3: Verify ESLint**

  ```bash
  npx eslint src/components/PropertyMap.js --max-warnings=0
  ```
  Expected: No output

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/PropertyMap.css client/src/components/PropertyMap.js
  git commit -m "feat: add spotlight map pin (amber ring, scale 1.10, no animation)"
  ```

---

## Task 12: Client — Admin Promotion Controls UI

**Files:**
- Modify: `client/src/services/api.js`
- Modify: `client/src/pages/AdminListings.js`

- [ ] **Step 1: Add API functions to api.js**

  Open `client/src/services/api.js`. At the end of the file, add:

  ```js
  // ── Promotion management (admin only) ─────────────────────────────────────────
  export const updatePropertyPromotion = (propertyId, data, token) =>
    api.put(`/admin/properties/${propertyId}/promotion`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });

  export const expireStalePromotionsAdmin = (token) =>
    api.post('/admin/promotions/expire-stale', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  ```

- [ ] **Step 2: Add imports to AdminListings.js**

  Open `client/src/pages/AdminListings.js`. Update the api import line to include `updatePropertyPromotion`:

  ```js
  import { getAllListingsAdmin, updateProperty, deleteProperty, bulkApproveProperties, bulkDeleteProperties, updatePropertyPromotion } from '../services/api';
  ```

  Add the analytics import if not already present (check the existing imports):

  ```js
  import { track } from '../services/analytics';
  ```

- [ ] **Step 3: Define promotion duration presets above the component**

  In `AdminListings.js`, after the existing constant declarations (like `PRIORITY_LEVELS`, `QUALITY_LEVELS`), add:

  ```js
  // Promotion duration presets — mirrors server/lib/promotion/constants.js
  const PROMO_DURATION_PRESETS = [
    { label: '7 days',    days: 7  },
    { label: '14 days',   days: 14 },
    { label: '30 days',   days: 30 },
    { label: '90 days',   days: 90 },
  ];

  const addDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };
  ```

- [ ] **Step 4: Add promotion modal state inside the `AdminListings` component**

  Inside the `AdminListings` component function, after the existing modal state declarations (look for `const [deleteModal, setDeleteModal]`), add:

  ```js
  const [promotionModal, setPromotionModal] = useState({ isOpen: false, listing: null });
  const [promotionForm,  setPromotionForm]  = useState({
    promotionTier:      'FREE',
    promotionStartDate: '',
    promotionEndDate:   '',
  });
  ```

- [ ] **Step 5: Add `openPromotionModal` and `handlePromotionSave` functions**

  Inside `AdminListings`, after the existing `handleDelete` function, add:

  ```js
  const openPromotionModal = (listing) => {
    setPromotionForm({
      promotionTier:      listing.promotionTier      || 'FREE',
      promotionStartDate: listing.promotionStartDate
        ? new Date(listing.promotionStartDate).toISOString().split('T')[0]
        : '',
      promotionEndDate: listing.promotionEndDate
        ? new Date(listing.promotionEndDate).toISOString().split('T')[0]
        : '',
    });
    setPromotionModal({ isOpen: true, listing });
    track('promotion_viewed', { listing_id: listing._id, current_tier: listing.promotionTier || 'FREE' });
  };

  const handlePromotionSave = async () => {
    if (!promotionModal.listing) return;
    try {
      const token = localStorage.getItem('token');
      const wasPromoted = promotionModal.listing.promotionTier !== 'FREE';
      const willPromote  = promotionForm.promotionTier !== 'FREE';

      await updatePropertyPromotion(
        promotionModal.listing._id,
        {
          promotionTier:      promotionForm.promotionTier,
          promotionStartDate: promotionForm.promotionStartDate || null,
          promotionEndDate:   promotionForm.promotionEndDate   || null,
        },
        token,
      );

      if (willPromote) {
        track('promotion_applied', {
          listing_id:     promotionModal.listing._id,
          promotion_tier: promotionForm.promotionTier,
        });
      } else if (wasPromoted) {
        track('promotion_removed', {
          listing_id:     promotionModal.listing._id,
          previous_tier:  promotionModal.listing.promotionTier,
        });
      }

      success('Promotion updated');
      setPromotionModal({ isOpen: false, listing: null });
      fetchListings();
    } catch (err) {
      console.error('[admin] promotion save error:', err);
      showError(err.response?.data?.message || 'Failed to update promotion');
    }
  };
  ```

  Note: if the function that fetches the listings table is named differently (e.g., `fetchData`, `loadListings`), use that name instead of `fetchListings`.

- [ ] **Step 6: Add the "Promote" button to the actions column**

  In the table body actions column (where "Edit", "View", "Delete" buttons live), add:

  ```jsx
  <Button
    variant="outline"
    size="sm"
    onClick={() => openPromotionModal(listing)}
  >
    Promote
  </Button>
  ```

- [ ] **Step 7: Add the Promotion Modal to the JSX return**

  Before the closing `</>` or `</div>` of the component's return, add:

  ```jsx
  {/* Promotion Modal */}
  <Modal
    isOpen={promotionModal.isOpen}
    onClose={() => setPromotionModal({ isOpen: false, listing: null })}
    title="Manage Promotion"
    size="sm"
  >
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Listing info */}
      <div>
        <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
          {promotionModal.listing?.title}
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', margin: 0 }}>
          Current tier: <strong>{promotionModal.listing?.promotionTier || 'FREE'}</strong>
        </p>
      </div>

      {/* Tier selector */}
      <div>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
          Promotion Tier
        </label>
        <select
          className="admin-filter-select"
          style={{ width: '100%' }}
          value={promotionForm.promotionTier}
          onChange={(e) => setPromotionForm({ ...promotionForm, promotionTier: e.target.value })}
        >
          <option value="FREE">FREE — organic only</option>
          <option value="FEATURED">FEATURED — homepage + ×1.15 search</option>
          <option value="PREMIUM">PREMIUM — ×1.5 search boost</option>
          <option value="SPOTLIGHT">SPOTLIGHT — hero + ×3.0 search</option>
        </select>
      </div>

      {/* Duration presets */}
      {promotionForm.promotionTier !== 'FREE' && (
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
            Quick Duration
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {PROMO_DURATION_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => setPromotionForm({
                  ...promotionForm,
                  promotionStartDate: new Date().toISOString().split('T')[0],
                  promotionEndDate:   addDays(preset.days),
                })}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--gray-200)',
                  background: 'var(--gray-50)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--gray-700)',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>
            Start Date
          </label>
          <input
            type="date"
            className="admin-filter-select"
            style={{ width: '100%' }}
            value={promotionForm.promotionStartDate}
            onChange={(e) => setPromotionForm({ ...promotionForm, promotionStartDate: e.target.value })}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>
            End Date
          </label>
          <input
            type="date"
            className="admin-filter-select"
            style={{ width: '100%' }}
            value={promotionForm.promotionEndDate}
            onChange={(e) => setPromotionForm({ ...promotionForm, promotionEndDate: e.target.value })}
          />
        </div>
      </div>

      {promotionForm.promotionTier === 'FREE' && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', margin: 0 }}>
          Setting to FREE removes the active promotion. Listing returns to organic ranking.
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
        <Button variant="outline" onClick={() => setPromotionModal({ isOpen: false, listing: null })}>
          Cancel
        </Button>
        <Button onClick={handlePromotionSave}>
          Save Promotion
        </Button>
      </div>
    </div>
  </Modal>
  ```

- [ ] **Step 8: Verify ESLint**

  ```bash
  npx eslint src/pages/AdminListings.js src/services/api.js --max-warnings=0
  ```
  Expected: No output

- [ ] **Step 9: Commit**

  ```bash
  git add client/src/services/api.js client/src/pages/AdminListings.js
  git commit -m "feat: add admin promotion UI (tier selector, duration presets, date range)"
  ```

---

## Task 13: Client — Analytics Events

**Files:**
- Modify: `client/src/services/analytics.js`

- [ ] **Step 1: Add promotion events to TRACKED_FOR_STORE**

  Open `client/src/services/analytics.js`. Find the `TRACKED_FOR_STORE` Set (around line 230) and add five promotion events to it:

  ```js
  const TRACKED_FOR_STORE = new Set([
    'search_submitted', 'search_no_results', 'filter_applied',
    'property_viewed', 'phone_revealed', 'inquiry_started', 'inquiry_sent',
    'listing_started', 'publish_completed', 'publish_failed',
    'login_completed', 'signup_completed',
    'gallery_opened', 'related_listing_clicked',
    'performance_slow_operation',
    // Promotion events (Phase 5.2)
    'promotion_viewed',
    'promotion_applied',
    'promotion_removed',
    'spotlight_listing_viewed',
    'featured_listing_viewed',
  ]);
  ```

- [ ] **Step 2: Verify ESLint**

  ```bash
  npx eslint src/services/analytics.js --max-warnings=0
  ```
  Expected: No output

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/services/analytics.js
  git commit -m "feat: add 5 promotion analytics events to local store tracking"
  ```

---

## Task 14: Final Build Verification

- [ ] **Step 1: Verify all server modules load cleanly**

  ```bash
  node -e "
  require('./server/models/Property');
  require('./server/lib/promotion/constants');
  require('./server/lib/ranking/listingRanking');
  require('./server/lib/promotion/fraudStatus');
  require('./server/lib/promotion/isNewListing');
  require('./server/lib/promotion/expirePromotions');
  require('./server/lib/promotion/homepagePlacement');
  require('./server/routes/adminRoutes');
  require('./server/controllers/propertyController');
  console.log('All server modules OK');
  "
  ```
  Expected: `All server modules OK`

- [ ] **Step 2: Run ESLint across all modified client files**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  npx eslint \
    src/components/PromotionBadge.js \
    src/components/PropertyMap.js \
    src/pages/AdminListings.js \
    src/services/api.js \
    src/services/analytics.js \
    --max-warnings=0
  ```
  Expected: No output (0 errors, 0 warnings)

- [ ] **Step 3: Run the client build**

  ```bash
  npm run build 2>&1 | tail -20
  ```
  Expected: `Compiled successfully.`
  If errors appear, fix them before proceeding.

- [ ] **Step 4: Final commit**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  git add .
  git commit -m "feat: Phase 5.2 complete — promotion product architecture"
  ```

---

## Deliverables Summary (Part 10)

### Files Created (6)
| File | Purpose |
|------|---------|
| `server/lib/promotion/constants.js` | Single source of truth: multipliers, scores, duration presets |
| `server/lib/ranking/listingRanking.js` | Ranking engine (imports multipliers from constants) |
| `server/lib/promotion/fraudStatus.js` | Fraud utility — NORMAL/WARNING/REVIEW/SUSPENDED |
| `server/lib/promotion/isNewListing.js` | 14-day classifier |
| `server/lib/promotion/expirePromotions.js` | Bulk-reset expired listings to FREE |
| `server/lib/promotion/homepagePlacement.js` | Four homepage section selectors |
| `client/src/components/PromotionBadge.js` | Reusable tier badge |
| `client/src/components/PromotionBadge.css` | Badge styles |

### Files Modified (8)
| File | Change |
|------|--------|
| `server/models/Property.js` | +promotion fields, +fraud (SUSPENDED), +3 indexes, +pre-save score sync |
| `server/routes/adminRoutes.js` | +promotion endpoint, +expire-stale endpoint, +auto-expire on listings GET |
| `server/controllers/propertyController.js` | +promotion in SEARCH_SELECT; sort by finalScore |
| `client/src/components/PropertyMap.css` | +`.mp-pin--spotlight` amber styles |
| `client/src/components/PropertyMap.js` | Apply spotlight class when SPOTLIGHT tier |
| `client/src/pages/AdminListings.js` | +Promote button, +promotion modal, +duration presets |
| `client/src/services/api.js` | +`updatePropertyPromotion`, +`expireStalePromotionsAdmin` |
| `client/src/services/analytics.js` | +5 promotion events |

### Ranking Logic
| Tier | Multiplier | Search effect | Homepage |
|------|-----------|--------------|---------|
| FREE | ×1.00 | organic only | no |
| FEATURED | ×1.15 | light presence | featured section |
| PREMIUM | ×1.50 | significant boost | no |
| SPOTLIGHT | ×3.00 | dominant placement | hero (max 5 slots) |

Multiplier only applied when `isPromoted=true` AND `promotionStartDate ≤ now ≤ promotionEndDate`.

### Promotion Architecture
- Tiers: FREE (score=1) → FEATURED (2) → PREMIUM (3) → SPOTLIGHT (4)
- Expiration: `expireStalePromotions()` called on every admin listing fetch; also exposed as `POST /admin/promotions/expire-stale`
- Phase 5.3 task: replace manual call with a scheduled cron job
- Duration presets: 7 / 14 / 30 / 90 days (admin UI quick-set buttons)

### Fraud Architecture
- Fields: `fraudReportCount`, `fraudStatus` on Property model
- Statuses: NORMAL (0-2 reports) → WARNING (3-4) → REVIEW (5-7) → SUSPENDED (8+)
- Implementation: pure utility function, no DB writes, no UI, no auto-moderation

### Build Status
- Zero ESLint errors (verified in Task 14)
- Zero build errors (verified in Task 14)
- No TypeScript (project uses plain JS)
