# Phase 5.4 Design Spec — Azerbaijan Market Localization, Fraud Reporting & Ownership Verification

**Date:** 2026-06-01
**Sprint:** Phase 5.4
**Status:** Approved — all 5 sections reviewed and approved by user

---

## Context

This sprint intentionally precedes Phase 5.3 homepage monetization surfaces.

The marketplace model must reflect Azerbaijan real-estate conventions and have correct fraud/trust architecture before promotion visibility increases traffic.

**Tech stack:** React 18, Node.js/Express/Mongoose, Lucide icons, existing `track()` analytics wrapper, CSS custom properties from `globals.css`.

---

## Section 1 — Azerbaijan Market Localization (Parts 1–5)

### Decision Log

- **SUSPENDED threshold**: changed from 8 → 10 (aligned with spec)
- **Ownership verification**: Marketing Wrapper approach — existing backend unchanged
- **Verified Owner badge**: TrustBadge extension only — no new component

### 1.1 Impact Report (Mandatory First Step)

Before any change, run a full codebase scan for:
`bedroom`, `bedrooms`, `bed`, `beds`, `studio`, `Bedroom`, `Bedrooms`, `Beds`, `Studio`, `Ownership Verified`

Output: file path × occurrence count × sample line. Every file in the report must be reviewed and checked off before Group A is complete.

### 1.2 Rooms, Not Bedrooms

**Storage:** `bedrooms` field in MongoDB is unchanged. No migration. No schema rename.

**Frontend label map:**

| Old | New |
|-----|-----|
| `Bedroom` | `Room` |
| `Bedrooms` | `Rooms` |
| `Beds` / `beds` | `Rooms` / `rooms` |
| `bed` (short) | `room` |
| Filter chip "Beds" | "Rooms" |
| Filter dialog "Bedrooms" | "Rooms" |
| Validation "Please select bedrooms…" | "Please select rooms…" |

URL param `bedrooms` stays unchanged (backend/URL contract).

**Surfaces:** CreateProperty, UpdateProperty, FilterBar, FilterModal, Property Cards, PropertyDetail, SearchBar, PropertyPreviewDrawer, HomeNew, AccountListings, Analytics labels.

### 1.3 Studio Removal

**New listings:** `studio` option removed from all create/filter UIs. `1 Room` (value `1`) is the minimum.

**Existing listings (display normalization):** `bedrooms === 0` renders as `1 Room` everywhere. Display-layer only — no DB write.

**Backend guard:** `propertyController.js` (create + update) rejects `bedrooms: 0` with HTTP 400: `"Studio is no longer a valid option. Please select 1 Room."`

### 1.4 NLP Parser Updates

**New room tokens:** `room`, `rooms`, `otaq`, `otaqlı` (extend existing partial support)

**New shorthand tokens:** `1br`, `2br`, `3br`, `4br`, `5br`

**Azerbaijan bedroom→room offset (internal only, never shown in UI):**

| User types | Internal value |
|---|---|
| `1 bedroom` / `1br` | `bedrooms: 2` |
| `2 bedroom` / `2br` | `bedrooms: 3` |
| `3 bedroom` / `3br` | `bedrooms: 4` |
| `4 bedroom` / `4br` | `bedrooms: 5` |

Direct room terminology maps straight through (no offset).

**Remove:** `studio` from `PROPERTY_TYPE_MAP`. Add silent mapping: `studio` → `bedrooms: 1`.

### 1.5 English Cleanup

**Keep all geographic proper nouns:** İçərişəhər, Nərimanov, Nəsimi, Xətai, Binəqədi, Sabunçu, Sumqayıt, Gəncə — these are proper place names, not language problems.

**Remove only:** Azerbaijani helper text, placeholder copy, validation messages, and instructional UI prose.

Provide a final replacement report listing every file and every change made.

---

## Section 2 — Fraud Reporting (Parts 5–7)

### 2.1 Report Listing UI (PropertyDetail)

- "Report Listing" secondary text button below seller card, above related listings
- Hidden if viewer is the listing owner
- Hidden if user is unauthenticated
- Opens `ReportListingModal` with single-select reasons: Duplicate listing / Incorrect information / Fake property / Already sold or rented / Scam or fraud / Other
- Optional free-text description (max 500 chars)
- Submit disabled until reason selected
- `201` → success toast + modal close
- `409` → inline "You've already reported this listing." (modal stays open)
- `5xx` → error toast, modal stays open

### 2.2 Fraud Thresholds — Single Source of Truth

`server/lib/promotion/fraudStatus.js` is the ONLY place thresholds are declared:

```js
WARNING:   3
REVIEW:    5
SUSPENDED: 10
```

`reportController.js` inline constants (`FLAG_THRESHOLD`, `HIDE_THRESHOLD`) are removed and replaced with an import from `fraudStatus.js`.

`fraudStatus` field on Property is written on every new report via `getFraudStatus(newCount)`.

### 2.3 Seller Warning Email

`mailer.js` gets `sendFraudWarningEmail({ sellerEmail, sellerName, propertyTitle })`.

Fires **once** — when `prevCount < WARNING && newCount >= WARNING` (i.e., 2→3 crossing only).

Copy: *"We received multiple concerns regarding your listing '[title]'. Please review it to ensure the information is accurate and up to date."*

No email at REVIEW or SUSPENDED — admin acts there.

### 2.4 Rate Limiting

- One report per user per property (existing 11000 unique index)
- Max 5 reports per account per rolling 24-hour window → HTTP 429: *"You have reached the reporting limit. Please try again later."*

### 2.5 Admin Fraud Review Tab

New **"Fraud Reports"** tab in `AdminAbuse.js`.

Data source: `GET /api/admin/fraud-listings` — Properties where `fraudStatus IN [WARNING, REVIEW, SUSPENDED]`.

Columns: Listing title (link) · Owner · Report count · Fraud status chip · Last report date · Actions

**Actions:**

| Action | Behavior |
|---|---|
| View | Opens listing in new tab |
| Dismiss | `fraudStatus = NORMAL`, `fraudReportCount` unchanged, `adminReviewedAt = now` — history preserved |
| Restore | `fraudStatus = REVIEW` (from SUSPENDED only — not NORMAL) |
| Suspend | Force-sets `fraudStatus = SUSPENDED` |

No bulk actions. Filter chips: All / Warning / Review / Suspended. Default: all three.

### 2.6 Analytics

Track: `fraud_report_submitted`, `fraud_status_warning`, `fraud_status_review`, `fraud_status_suspended`, plus report `category` on each submission.

---

## Section 3 — Ownership Verification (Parts 8–11)

### 3.1 Service Page `/services/ownership-verification`

New `OwnershipVerificationService.js` + `.css`. Registered in `App.js`.

Page sections:
1. Hero — headline + value prop
2. What is Ownership Verification? — uses approved language (see 3.2)
3. How it works — 4-step: Submit → Upload docs → Platform review (2–5 business days) → Verified Owner badge
4. What you receive — badge on all listings, higher trust placement, visual trust signal
5. Documents that may be requested — property extract, utility bill, ownership certificate
6. Pricing — **20 AZN**, one-time per property, no subscription
7. FAQ — includes: *"Does verification transfer to a new listing? Verification is associated with the reviewed property and ownership information. If a listing is republished, verification may remain valid subject to review."*
8. CTA — **"Verify a Property"** → links to My Listings

### 3.2 Approved Language

> "We review submitted ownership information and perform verification checks where possible."

Do NOT imply legal certification, legal guarantee, or title guarantee.

### 3.3 CTA Flow

Service Page → **"Verify a Property"** → Account My Listings → User selects property → Existing `OwnershipVerificationModal` / `VerificationApplication` flow.

Do NOT open modal directly from service page (requires `propertyId` context).

### 3.4 Payment Messaging (Option A+)

Display in submission flow:

> "Payment collection is currently handled by our support team. Submit your verification request and we will contact you regarding verification and payment."

No payment gateway. No Stripe. No checkbox.

### 3.5 Verification States in My Listings

Visible per-listing:
- **Not Verified** — `ownershipVerificationStatus: 'none'`
- **Verification Pending** — `ownershipVerificationStatus: 'pending'`
- **Verified Owner** — `ownershipVerificationStatus: 'approved'`
- **Rejected** — `ownershipVerificationStatus: 'rejected'`

### 3.6 TrustBadge Fix — Critical

**Problem:** `approveOwnership` sets `ownershipVerificationStatus: 'approved'` on Property but TrustBadge reads `trustLevel`/`accountType` from the seller — no path to Level 4 exists currently.

**Fix:** Property cards derive TrustBadge level from `property.ownershipVerificationStatus === 'approved'` directly, passing `trustLevel={4}` when true. Per-property (not per-user) — correct because ownership is per-listing.

Do NOT tie to `accountType`. Do NOT create a parallel badge system.

### 3.7 TrustBadge Label Rename

`TrustBadge.js`:
- `CHIP_LABEL[4]`: `'Ownership Verified'` → `'Verified Owner'`
- `LADDER_STEPS[3].label`: `'Ownership Verified'` → `'Verified Owner'`
- `FOOTER_TEXT[4]`: unchanged (lowercase sentence fragment — not a badge title)

Render consistently on: Property cards · Search cards · PropertyDetail · PropertyPreviewDrawer.

### 3.8 Services Page Card

`Services.js` gets an **Ownership Verification** card: 20 AZN · "Show buyers your ownership has been reviewed." · "Learn More" → `/services/ownership-verification`.

---

## Section 4 — Admin Ownership Review Workflow

**Approach: Option A+ — informational pricing, deferred payment collection.**

Existing `AdminOwnership.js` and `ownershipController.js` are unchanged in structure.

Minimal admin change: ensure the "Ownership Verification" label is visible in the admin panel header to reflect the new public product name.

---

## Section 5 — Revenue Product Definitions

### Product Table

| | FEATURED | PREMIUM | SPOTLIGHT |
|---|---|---|---|
| Price | 19 AZN | 39 AZN | 79 AZN |
| Duration | 7 days | 14 days | 30 days |
| Search multiplier | ×1.15 | ×1.50 | ×3.00 |
| Inventory limit | Unlimited | Unlimited | Max 5 active |

### Single Placement Rule

A listing appears in exactly ONE homepage section. Priority: Spotlight → Featured → New Listings → Recently Added. No duplication.

PREMIUM is ranked above FEATURED within the shared Featured slider — no separate Premium section.

### Spotlight Purchase Protection

At promotion creation: if `activeSpotlightCount >= 5`, reject with HTTP 400:
> "All Spotlight positions are currently occupied. Please try again later."

Enforcement lives in the promotion creation endpoint, not the display selector.

### Promotion Comparison Data

Create a reusable data constant (array of objects) in `client/src/data/promotionProducts.js` for use by the future `/services/promote` page. No UI yet.

### Business-Rule Guards

- **Expiry:** Verify `expireStalePromotions()` runs on every homepage fetch (not cron-only) so expired promotions disappear immediately.
- **Recent grid exclusion:** `getRecentListings()` must exclude FEATURED/PREMIUM/SPOTLIGHT listings to prevent double placement.
- **Price storage:** Prices are display constants only — not stored per-promotion record. No migration concern for this sprint.

### Future Analytics Events (no implementation this sprint)

`promotion_page_viewed`, `promotion_comparison_viewed`, `promotion_tier_selected`, `promotion_upgrade_selected`

---

## Deliverables (Group E)

On completion, provide:

1. Files created
2. Files modified
3. Localization report (every bedroom/studio occurrence reviewed)
4. Fraud workflow summary
5. Ownership verification summary
6. Promotion system summary
7. TrustBadge fix summary
8. Build status (`npm run build` — zero errors)
9. ESLint status (zero new errors)
10. TypeScript status

**Success criteria:**
- Zero build errors
- Zero ESLint errors
- No duplicate trust systems
- No duplicate homepage placement
- No new studio listings possible
- Verified Owner badge renders correctly
- Fraud reporting fully functional
- Ownership Verification service page live
- Promotion product definitions finalized
