# Phase 5.6 Design Spec — Property Reputation & Reviews System

**Date:** 2026-06-04
**Sprint:** Phase 5.6
**Status:** Approved — all 5 sections reviewed and approved by user

---

## Core Principle

A property must not lose its reputation when a listing is deleted and recreated.
Reviews belong to the **property identity**, not to listing IDs, owners, or individual documents.

---

## Architecture Summary

Three new records participate in the reputation system:

```
PropertyIdentity  ←── fingerprint-based canonical identity
    ↑
    │  propertyIdentityId
    │
Property          ←── existing listing document (gains propertyIdentityId field)

PropertyReview    ←── review document (references PropertyIdentity, not Property)
```

`PropertyIdentity` is never deleted. It outlives any listing and any owner.

---

## Section 1 — Data Models

### 1.1 PropertyIdentity (`server/models/PropertyIdentity.js`)

```js
fingerprint: {
  normalizedAddress: String,   // lowercase, strip punctuation, collapse whitespace, KEEP unit numbers
  roomCount: Number,           // bedrooms field; 0 normalised to 1
  propertyType: String,        // exact match from Property enum
}
fingerprintVersion: { type: Number, default: 1 }   // migration safety

// Cached aggregates (updated on every review write/delete/moderation)
avgRating:           Number   // 0–5, 2 decimal places; default 0
reviewCount:         Number   // active reviews only; default 0
recommendCount:      Number   // active reviews with recommended:true; default 0
recommendPercentage: Number   // 0–100; default 0
listingCount:        Number   // current active listings with this identity; default 0
lastReviewAt:        Date

timestamps: createdAt, updatedAt
```

**Unique compound index:** `{ 'fingerprint.normalizedAddress': 1, 'fingerprint.roomCount': 1, 'fingerprint.propertyType': 1 }`

**Rules:**
- Never deleted, even when `listingCount` reaches 0
- `fingerprintVersion` incremented if normalisation algorithm changes in future phases

### 1.2 PropertyReview (`server/models/PropertyReview.js`)

```js
propertyIdentityId: ObjectId ref PropertyIdentity (required, indexed)
reviewerId:         ObjectId ref User (required)
reviewType:         enum ['buyer-experience', 'rental-experience', 'general-feedback']
rating:             Number 1–5 (required, integer)
title:              String max 120 (optional)
review:             String min 20 max 2000 (required)
recommended:        Boolean (default true)
ownerResponse: {
  text:        String max 1000,
  respondedAt: Date,
}
status:             enum ['active', 'reported', 'hidden'] default 'active'
reportCount:        Number default 0
reportedAt:         Date (set on first report)
moderatedAt:        Date (set on admin action)
moderatorNotes:     String (internal, not shown publicly)
reviewHelpfulCount: Number default 0

timestamps: createdAt, updatedAt
```

**Unique index:** `{ propertyIdentityId: 1, reviewerId: 1 }`

### 1.3 Property model change

Add one field to existing Property schema:
```js
propertyIdentityId: { type: ObjectId, ref: 'PropertyIdentity', index: true }
```

---

## Section 2 — Identity Resolution & Aggregates

### 2.1 Fingerprint Generation (`server/lib/reputation/resolveIdentity.js`)

```js
function buildFingerprint(property) {
  const normalizedAddress = (property.fullAddress || property.location || '')
    .toLowerCase()
    .replace(/[^\w\s\d]/g, '')   // strip punctuation; KEEP digits (apt/unit numbers)
    .replace(/\s+/g, ' ')
    .trim();

  return {
    normalizedAddress,
    roomCount: !property.bedrooms || property.bedrooms === 0 ? 1 : property.bedrooms,
    propertyType: property.propertyType || 'unknown',
  };
}
```

**Resolution function:**
- Look up `PropertyIdentity` by fingerprint
- If found: return existing identity
- If not found: create new identity with `fingerprintVersion: 1`

**At listing CREATE:**
- Resolve identity
- Write `property.propertyIdentityId`
- Increment `identity.listingCount`

**At listing UPDATE (when address/rooms/type changes):**
- Build new fingerprint
- If fingerprint changed: decrement old identity's `listingCount`, resolve new identity, increment new identity's `listingCount`, update `property.propertyIdentityId`
- If unchanged: no identity change

**At listing DELETE:**
- Decrement `identity.listingCount`
- Do NOT delete the identity

### 2.2 Aggregate Updater (`server/lib/reputation/updateAggregates.js`)

Called after: review create, review edit, review delete, moderation status change.

```js
async function updatePropertyReputationAggregates(propertyIdentityId) {
  const agg = await PropertyReview.aggregate([
    { $match: { propertyIdentityId, status: 'active' } },
    { $group: {
      _id: null,
      avgRating:    { $avg: '$rating' },
      reviewCount:  { $sum: 1 },
      recommendCount: { $sum: { $cond: ['$recommended', 1, 0] } },
      lastReviewAt: { $max: '$createdAt' },
    }},
  ]);
  const r = agg[0] || {};
  await PropertyIdentity.findByIdAndUpdate(propertyIdentityId, {
    avgRating:           Math.round((r.avgRating || 0) * 100) / 100,
    reviewCount:         r.reviewCount || 0,
    recommendCount:      r.recommendCount || 0,
    recommendPercentage: r.reviewCount > 0
      ? Math.round((r.recommendCount / r.reviewCount) * 100) : 0,
    lastReviewAt:        r.lastReviewAt || null,
  });
}
```

Only `status: 'active'` reviews affect aggregates. `reported` and `hidden` reviews are excluded immediately.

### 2.3 Admin Maintenance Endpoint

`POST /api/admin/property-identities/rebuild` (admin only, no UI)

Scans all properties, resolves or creates PropertyIdentity for each, writes `propertyIdentityId`. Used if fingerprint logic changes or data is imported.

---

## Section 3 — API Routes

**Mounted at `/api/property-reviews` in `server/routes/propertyReviewRoutes.js`:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/by-listing/:propertyId` | public | Full reputation + paginated reviews |
| `GET` | `/summary/:propertyId` | public | Lightweight: `{ avgRating, reviewCount, recommendPercentage }` |
| `GET` | `/:propertyIdentityId` | public | Paginated reviews for an identity (default 10, max 50) |
| `POST` | `/` | required | Submit review |
| `PUT` | `/:id` | reviewer, ≤30 days | Edit own review |
| `DELETE` | `/:id` | reviewer | Delete own review (hard delete) |
| `POST` | `/:id/response` | listing owner | Add or edit owner response (one per review) |
| `POST` | `/:id/report` | required | Report a review |
| `PATCH` | `/:id/moderate` | admin | Set status + moderatorNotes |

**Pagination:** `?page=1&limit=10` — default 10, max 50.

**Sort options for `GET /:propertyIdentityId`:** `?sort=recent` (default) | `highest` | `lowest` | `helpful`

---

## Section 4 — Moderation

### 4.1 Review Status Machine

```
active ──────────────── report ──────────────► reported
  ↑                                               │
  │                                          admin hides
  │                                               ↓
  └────── admin restores ──────────────────── hidden
active ────── admin direct-hides ──────────► hidden
```

Aggregates recalculate on every transition. Only `active` counts.

### 4.2 Visibility Rules

| Status | Public visible | Counts in aggregates | Admin queue |
|---|---|---|---|
| `active` | ✓ | ✓ | only if flagged |
| `reported` | ✓ | ✗ | ✓ (Reported tab) |
| `hidden` | ✗ | ✗ | ✓ (Hidden tab) |

### 4.3 Admin Queue (AdminReports.js — "Property Reviews" tab)

Columns: Property title · Reviewer · Rating · Status · Report count · Review excerpt · Date · Actions

Actions: View (full review modal) | Restore | Hide | Delete (permanent)

Each action has optional `moderatorNotes` (internal, not shown to users).

Stored timestamps: `reportedAt` (first report), `moderatedAt` (last admin action).

---

## Section 5 — Frontend Components

### 5.1 PropertyReputation (`client/src/components/PropertyReputation.js`)

Renders below the seller card in PropertyDetail:

1. **Aggregate row**: `★ 4.7 · 23 reviews · 91% recommend`
2. **Rating distribution bars** with counts: `5★ ████████ 12 | 4★ ████ 5 | ...`
3. **Sort dropdown**: Most Recent (default) | Highest Rating | Lowest Rating | Most Helpful
4. **Review list** (paginated, 10/page) — each card: reviewer name, stars, review type chip, title, body (3-line truncate + Read more), date, recommended badge, owner response (collapsed), Report button
5. **Write a Review CTA** — shown if logged-in, not owner, not already reviewed
6. **Empty state** (when `reviewCount === 0`): "No reviews yet" + "Be the first to review this property" button

### 5.2 ReviewModal (`client/src/components/ReviewModal.js`)

Single scrollable form:
- Star selector (required)
- Review type dropdown
- Recommended toggle
- Title field (optional, 120 char limit)
- Review textarea (required, min 20, max 2000, live counter `245 / 2000`)
- Writing prompts as placeholder: *"Consider: listing accuracy, property condition, neighbourhood, owner responsiveness"*
- Discard confirmation on close if draft in progress

Analytics: `review_modal_opened` on open; `review_submission_started` fires once on first meaningful input.

### 5.3 PropertyRatingChip (`client/src/components/PropertyRatingChip.js`)

Props: `avgRating: Number, reviewCount: Number`

Renders: `★ 4.7  (23)` — single line, placed below price/location on cards.

**Hides entirely when `reviewCount === 0`** (cards and search only; PropertyDetail shows empty state).

**Performance rule:** receives `avgRating`, `reviewCount`, `recommendPercentage` directly from listing payload. Never fires its own API request.

---

## Section 6 — Reputation Summary in Listing Payloads

**Where aggregates reach cards (O(1) constraint):**

`propertyController.js` listing-list endpoints (homepage, search, recent) populate `propertyIdentityId` and project `{ avgRating, reviewCount, recommendPercentage }`. API response includes:

```json
"reputationSummary": {
  "avgRating": 4.7,
  "reviewCount": 23,
  "recommendPercentage": 91
}
```

**Surfaces using reputationSummary:**
- Homepage cards (HomeNew.js)
- Search cards (Search/index.js)
- Property preview drawer (PropertyPreviewDrawer.js)

**Full review payload** is loaded only on PropertyDetail.

---

## Section 7 — Server-Side Validation

| Rule | Error |
|---|---|
| Must be authenticated | 401 |
| Account ≥ 24 hours old | 403 "Account must be at least 24 hours old to submit a review" |
| Not the property owner | 403 "You cannot review your own listing" |
| No duplicate (checked in controller + unique index) | 409 "You have already reviewed this property" |
| 1 ≤ rating ≤ 5, integer | 400 |
| review.length ≥ 20 | 400 |
| review.length ≤ 2000 | 400 |
| reviewType in enum | 400 |
| title ≤ 120 if provided | 400 |
| Owner response ≤ 1000 chars | 400 |
| Edit window: ≤ 30 days from createdAt | 403 "Reviews can only be edited within 30 days of submission" |
| One report per user per review | 409 "You have already reported this review" |

---

## Section 8 — Analytics Events

All added to `TRACKED_FOR_STORE`:

| Event | Trigger |
|---|---|
| `review_modal_opened` | Modal opens |
| `review_submission_started` | First meaningful input (fires once per modal session) |
| `review_submitted` | Successful POST |
| `review_updated` | Successful PUT |
| `review_deleted` | User hard-deletes own review |
| `review_reported` | User reports a review |
| `review_sort_changed` | Sort dropdown change |
| `owner_response_added` | Owner submits/edits response |
| `review_hidden` | Admin hides |
| `review_restored` | Admin restores |
| `review_deleted_by_admin` | Admin hard-deletes |

---

## Migration Strategy

### Backfill Plan (mandatory before launch)

All existing properties have no `propertyIdentityId`. Backfill must run before the feature is visible.

**Script: `server/scripts/backfillPropertyIdentities.js`**

1. Fetch all Property documents in batches of 100
2. For each property: call `resolvePropertyIdentity(property)`
3. Write `property.propertyIdentityId`
4. Set correct `listingCount` on each identity after all listings are processed
5. Log: total properties processed, identities created, identities matched, errors

Run as a one-time script via `node server/scripts/backfillPropertyIdentities.js`. Idempotent — safe to re-run.

---

## Rollout Plan

1. Deploy backend (models, routes, controllers, lib utilities) — dark, no UI
2. Run backfill script against production data
3. Verify: spot-check 10+ listings, confirm `propertyIdentityId` populated, confirm `listingCount` correct
4. Deploy frontend: PropertyReputation, ReviewModal, PropertyRatingChip
5. Wire PropertyDetail first — controlled surface, single listing at a time
6. Wire cards (homepage, search, drawer) second — aggregates already cached, O(1) reads

---

## Testing Checklist

- [ ] Create two listings with identical fingerprint → both get same `propertyIdentityId`
- [ ] Create listing, delete it, recreate with same address → review from original survives
- [ ] Submit review as owner → rejected (403)
- [ ] Submit review with account < 24h old → rejected (403)
- [ ] Submit two reviews for same property from same user → second rejected (409)
- [ ] Edit review after 30 days → rejected (403)
- [ ] Admin hides review → `reviewCount` decrements, `avgRating` updates
- [ ] Admin restores review → aggregates re-include it
- [ ] Hard delete review → aggregates update, review gone from queue
- [ ] Backfill script: verify idempotent (running twice produces no duplicates)
- [ ] `recommendPercentage` = 0 when no reviews
- [ ] PropertyRatingChip hidden on card when `reviewCount === 0`
- [ ] PropertyDetail shows empty state when `reviewCount === 0`

---

## Files Created (13 new files)

**Server:**
| File | Purpose |
|---|---|
| `server/models/PropertyIdentity.js` | Fingerprint + cached aggregates |
| `server/models/PropertyReview.js` | Review document |
| `server/lib/reputation/resolveIdentity.js` | Fingerprint generation + identity lookup/create |
| `server/lib/reputation/updateAggregates.js` | Recalculate and write aggregates |
| `server/routes/propertyReviewRoutes.js` | API routes |
| `server/controllers/propertyReviewController.js` | All handler logic |
| `server/scripts/backfillPropertyIdentities.js` | One-time backfill |

**Client:**
| File | Purpose |
|---|---|
| `client/src/components/PropertyReputation.js` + `.css` | Full reputation section for PropertyDetail |
| `client/src/components/ReviewModal.js` + `.css` | Review submission/edit modal |
| `client/src/components/PropertyRatingChip.js` + `.css` | Compact `★ 4.7 (23)` chip |

## Files Modified (9 existing files)

| File | Change |
|---|---|
| `server/server.js` | Mount propertyReviewRoutes at `/api/property-reviews` |
| `server/models/Property.js` | Add `propertyIdentityId` field |
| `server/controllers/propertyController.js` | Resolve identity on create/update/delete; populate `reputationSummary` on list queries |
| `client/src/pages/PropertyDetail.js` | Add `<PropertyReputation>` below seller card |
| `client/src/pages/HomeNew.js` | Pass `reputationSummary` to `<PropertyRatingChip>` |
| `client/src/pages/Search/index.js` | Same |
| `client/src/components/PropertyPreviewDrawer.js` | Same |
| `client/src/pages/AdminReports.js` | Add "Property Reviews" moderation tab |
| `client/src/services/api.js` | Add review API functions |
| `client/src/services/analytics.js` | Add 11 review events to TRACKED_FOR_STORE |
