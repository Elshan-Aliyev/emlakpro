# Phase 5.9 — Marketplace Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Final beta polish — active filter chips, Filters (N), contextual search header, sort menu, sticky-card summary, seller performance score, promotion upsell, review polish, consistency cleanup. No new models, no new endpoints, no architecture changes.

**Architecture:** All work is additive UI polish on existing state. FilterBar owns filter chips (it already owns URL filter state). Sort adds a whitelisted `sort` query param to the existing `getProperties` controller (4 backend sorts) plus a client-side overlay for rating/review sorts (reputation lives on populated PropertyIdentity and cannot be `.sort()`ed server-side without architecture change — documented limitation). Score and upsell render inside the existing ListingPerformanceCard from data already returned by `getMyDashboard`.

**Tech Stack:** React 18, React Router v7 `useSearchParams`, existing CSS token system (emerald #0F766E × graphite), lucide-react.

---

## Current-State Facts (verified)

| Fact | Location |
|------|----------|
| `ALL_FILTER_KEYS` (23 keys) + `hasActiveFilters` + `handleClearFilters` exist | `FilterBar.js:34-39, 111-119, 193` |
| Filters button shows badge `modalActiveCount` (modal keys only) | `FilterBar.js:492-510` |
| `fb-clear-btn` "Clear all" exists in `fb-actions` (desktop only) | `FilterBar.js:493-502` |
| `buildSearchContext()` already builds "124 villas for sale in Baku" | `Search/index.js:414-428` |
| No sort UI; backend hard-codes `.sort({ finalScore: -1, qualityScore: -1, createdAt: -1 })` | `propertyController.js:176-185` |
| `getProperties` maps `reputationSummary` per property from populated identity | `propertyController.js:188-200` |
| PropertyDetail sidebar IS already sticky + glass (`position:sticky; top:90px; backdrop-filter:blur(26px)`) | `PropertyDetail.css:424-444` |
| Sidebar has Message btn, phone reveal (tel:), FavoriteButton — Call/Message/Save all exist | `PropertyDetail.js:673-790` |
| ListingPerformanceCard receives viewsCount, favoritesCount, inquiryCount, phoneRevealCount, reputationSummary, promotionTier, isPromoted, ownershipVerificationStatus | `ListingPerformanceCard.js:37-45` |
| `/services/promote` route does NOT exist | `App.js:137-141` |
| PropertyReputation SORT_OPTIONS already: recent, highest, lowest, helpful | `PropertyReputation.js:9-14` |
| Helpful shows as button text `Helpful (12)` only | `PropertyReputation.js:120-128` |
| Chip design language: `.sp-few-chip` (999px radius, subtle border, teal hover) | `Search.css:343-358` |
| Legacy `--brand-*` vars remain in `App.css` + `VerificationApplication.css` | Phase 5.8 audit |
| Emoji remain in EnhanceProperty, ListProperty, Services, ShortTermRental, UpdateProperty, ShareListingScreen, AddRoomsEnhancement | Phase 5.8 audit |

## File Map

| File | Tasks |
|------|-------|
| `client/src/components/FilterBar.js` + `.css` | T1 (chips row, move Clear all), also Filters (N) |
| `client/src/pages/Search/index.js` + `Search.css` | T2 (header), T3 (sort UI + client overlay) |
| `server/controllers/propertyController.js` | T3 (whitelisted sort param) |
| `client/src/pages/PropertyDetail.js` + `.css` | T4 (sticky summary header) |
| `client/src/components/ListingPerformanceCard.js` + `.css` | T5 (score + upsell) |
| `client/src/App.js` | T5 (redirect route `/services/promote`) |
| `client/src/components/PropertyReputation.js` + `.css` | T6 (helpful display, sort order) |
| `client/src/App.css`, `client/src/pages/VerificationApplication.css`, emoji pages | T7 (consistency) |

---

## Task 1: Active Filter Chips Row + Filters (N)

**Files:**
- Modify: `client/src/components/FilterBar.js`
- Modify: `client/src/components/FilterBar.css`

- [ ] **Step 1: Read FilterBar.js fully** — confirm line numbers for `ALL_FILTER_KEYS` (~34), `setParam` (~96), `handleClearFilters` (~111), `hasActiveFilters` (~193), the `fb-actions` div (~492), the `fb-nl-chips` block (~541), and the existing `fb-clear-btn` button.

- [ ] **Step 2: Add chip label helpers at module scope** (after `MODAL_FILTER_KEYS`):

```js
// Static labels for toggle filters shown as removable chips
const TOGGLE_CHIP_LABELS = {
  verified:          'Verified Owner',
  fastResponse:      'Fast Response',
  newThisWeek:       'New This Week',
  goodValue:         'Good Value',
  recentlyConfirmed: 'Recently Confirmed',
  nearMetro:         'Near Metro',
  familyFriendly:    'Family Friendly',
  quietArea:         'Quiet Area',
  furnished:         'Furnished',
  parking:           'Parking',
  newBuilding:       'New Building',
  elevator:          'Elevator',
  renovated:         'Renovated',
  seaView:           'Sea View',
};

const fmtPrice = (n) => {
  const num = parseInt(n, 10);
  if (!num) return '0';
  return num >= 1000 ? `${Math.round(num / 1000)}k` : String(num);
};
```

- [ ] **Step 3: Build the chips array inside the component** (after `hasActiveFilters`, before `modalFilters`):

```js
  // ── Active filter chips (T1) — one removable chip per active filter ─────────
  const activeChips = [];
  if (propertyType) activeChips.push({
    key: 'propertyType',
    label: propertyType.charAt(0).toUpperCase() + propertyType.slice(1).replace(/-/g, ' '),
  });
  if (city)     activeChips.push({ key: 'city',     label: city });
  if (district) activeChips.push({ key: 'district', label: district });
  if (priceMin || priceMax) activeChips.push({
    key: ['priceMin', 'priceMax'],
    label: priceMin && priceMax ? `₼${fmtPrice(priceMin)} – ₼${fmtPrice(priceMax)}`
         : priceMax ? `Up to ₼${fmtPrice(priceMax)}`
         : `₼${fmtPrice(priceMin)}+`,
  });
  if (bedrooms)  activeChips.push({ key: 'bedrooms',  label: `${bedrooms}+ Rooms` });
  if (bathrooms) activeChips.push({ key: 'bathrooms', label: `${bathrooms}+ Baths` });
  if (keyword)   activeChips.push({ key: 'keyword',   label: `"${keyword}"` });
  if (subCategory) activeChips.push({
    key: 'subCategory',
    label: subCategory === 'short-term' ? 'Short-term' : 'Long-term',
  });
  Object.entries(TOGGLE_CHIP_LABELS).forEach(([k, label]) => {
    if (searchParams.get(k)) activeChips.push({ key: k, label });
  });

  const removeChip = useCallback((keys) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      keyList.forEach(k => next.delete(k));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const activeFilterCount = activeChips.length;
```

Note: `useCallback` is already imported. `removeChip` accepts an array so the combined price chip clears both keys in ONE URL update (one fetch).

- [ ] **Step 4: Change Filters button to "Filters (N)"** — find the Filters button and replace the label + badge:

Current:
```jsx
            <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" />
            Filters
            {modalActiveCount > 0 && (
              <span className="fb-active-count" aria-label={`${modalActiveCount} active filters`}>
                {modalActiveCount}
              </span>
            )}
```

Replace with:
```jsx
            <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
```

Then delete the now-unused `modalActiveCount` declaration (line ~194). Do NOT delete `MODAL_FILTER_KEYS` if still referenced elsewhere — check first; if unreferenced after this change, delete it too.

- [ ] **Step 5: Remove the old Clear all button from `fb-actions`** — delete this block (added in the bugfix sprint):

```jsx
          {hasActiveFilters && (
            <button
              className="fb-clear-btn"
              onClick={handleClearFilters}
              aria-label="Clear all filters"
            >
              <X size={13} strokeWidth={2.5} aria-hidden="true" />
              Clear all
            </button>
          )}
```

- [ ] **Step 6: Add the chips row** — immediately AFTER the closing `</div>` of `fb-inner` and BEFORE the `{liveChips.length > 0 && (` block, insert:

```jsx
      {/* ── Active filter chips (T1) ── */}
      {activeChips.length > 0 && (
        <div className="fb-active-chips" aria-label="Active filters">
          {listingStatus && (
            <span className="fb-ac-mode">
              {listingStatus === 'for-sale' ? 'For Sale' : listingStatus === 'for-rent' ? 'For Rent' : 'New Projects'}
            </span>
          )}
          {activeChips.map((chip) => (
            <button
              key={Array.isArray(chip.key) ? chip.key.join('-') : chip.key}
              className="fb-ac-chip"
              onClick={() => removeChip(chip.key)}
              aria-label={`Remove filter: ${chip.label}`}
            >
              {chip.label}
              <X size={11} strokeWidth={2.5} aria-hidden="true" />
            </button>
          ))}
          <button className="fb-ac-clear" onClick={handleClearFilters}>
            Clear all
          </button>
        </div>
      )}
```

- [ ] **Step 7: CSS — replace `.fb-clear-btn` block with chips-row styles** in `FilterBar.css`. Delete the `.fb-clear-btn` rules (including its hover and the 768px media rule from the bugfix sprint) and append:

```css
/* ── Active filter chips row (T1) ────────────────────────────────────────── */

.fb-active-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px 2px;
  flex-wrap: wrap;
}

.fb-ac-mode {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-graphite-900, #0F172A);
  white-space: nowrap;
  margin-right: 2px;
}

.fb-ac-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--border-subtle, #e5e7eb);
  background: var(--color-bg-surface, #fff);
  color: var(--color-text-muted, #6b7280);
  font-size: 0.775rem;
  font-family: var(--font-sans, 'Inter Tight', 'Inter', sans-serif);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}

.fb-ac-chip:hover {
  border-color: var(--color-primary, #0F766E);
  color: var(--color-primary, #0F766E);
}

.fb-ac-chip svg { opacity: 0.6; }
.fb-ac-chip:hover svg { opacity: 1; }

.fb-ac-clear {
  background: none;
  border: none;
  font-size: 0.775rem;
  font-weight: 600;
  color: var(--color-primary, #0F766E);
  cursor: pointer;
  padding: 4px 6px;
  white-space: nowrap;
}
.fb-ac-clear:hover { text-decoration: underline; }

/* Mobile: single-line horizontal scroll */
@media (max-width: 768px) {
  .fb-active-chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 6px;
  }
  .fb-active-chips::-webkit-scrollbar { display: none; }
}
```

- [ ] **Step 8: ESLint**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
$env:ESLINT_USE_FLAT_CONFIG="false"
npx eslint src/components/FilterBar.js --max-warnings=0 2>&1 | Select-Object -Last 5
```
Expected: no output. (If `MODAL_FILTER_KEYS` became unused, the lint error will say so — delete the constant.)

- [ ] **Step 9: Commit**

```
git add client/src/components/FilterBar.js client/src/components/FilterBar.css
git commit -m "feat(polish): active filter chips row with per-chip remove; Filters (N) count"
```

---

## Task 2: Contextual Search Header

**Files:**
- Modify: `client/src/pages/Search/index.js` (the `buildSearchContext` function, ~line 414)

`buildSearchContext()` already produces "124 villas for sale in Baku". Two gaps vs spec: verified-owner copy and the plain fallback.

- [ ] **Step 1: Replace `buildSearchContext`** with:

```js
  const buildSearchContext = () => {
    if (loading) return loadingPhase === 0 ? 'Loading listings…' : 'Still retrieving listings…';
    const status   = searchParams.get('listingStatus');
    const type     = searchParams.get('propertyType');
    const city     = searchParams.get('city');
    const beds     = searchParams.get('bedrooms');
    const verified = searchParams.get('verified');
    if (total === 0) return 'No listings matched these filters';
    let typeLabel = type ? (PLURAL[type] || `${type}s`) : 'listings';
    if (verified) typeLabel = `verified owner ${typeLabel}`;
    const parts = [`${total} ${typeLabel}`];
    if (status === 'for-rent')      parts.push('for rent');
    else if (status === 'for-sale') parts.push('for sale');
    if (city) parts.push(`in ${city}`);
    if (beds) parts.push(`· ${beds}+ rooms`);
    return parts.join(' ');
  };
```

(Only changes: `verified` handling, "beds"→"rooms" for terminology consistency with the platform's Rooms language. The no-filter fallback `${total} listings` already works.)

- [ ] **Step 2: ESLint + commit**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
$env:ESLINT_USE_FLAT_CONFIG="false"
npx eslint src/pages/Search/index.js --max-warnings=0 2>&1 | Select-Object -Last 5
```

```
git add client/src/pages/Search/index.js
git commit -m "feat(polish): contextual search header — verified owner copy, rooms terminology"
```

---

## Task 3: Sort Menu

**Files:**
- Modify: `server/controllers/propertyController.js` (getProperties, ~line 176)
- Modify: `client/src/pages/Search/index.js`
- Modify: `client/src/pages/Search/Search.css`

Backend gets a whitelisted `sort` param (newest / price-asc / price-desc / updated). Highest Rated and Most Reviewed sort client-side over loaded results (reputation lives on populated PropertyIdentity — server-side sort would require aggregation/denormalization = architecture change, prohibited). Unknown sort values fall through to the existing default sort — no breaking change.

- [ ] **Step 1: Backend — add SORT_MAP to getProperties**

Read `getProperties` in `server/controllers/propertyController.js`. Find the line:
```js
      .sort({ finalScore: -1, qualityScore: -1, createdAt: -1 })
```

Add just before the `Property.find(query)` chain:
```js
    // Whitelisted user sorts (T3) — anything else falls back to ranking default
    const SORT_MAP = {
      newest:       { createdAt: -1 },
      'price-asc':  { price: 1 },
      'price-desc': { price: -1 },
      updated:      { updatedAt: -1 },
    };
    const userSort = SORT_MAP[req.query.sort] || null;
```

Then change the `.sort(...)` line to:
```js
      .sort(userSort || { finalScore: -1, qualityScore: -1, createdAt: -1 })
```

- [ ] **Step 2: Syntax check**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
node --check controllers/propertyController.js; echo "OK"
```

- [ ] **Step 3: Client — add sort options + dropdown to Search/index.js**

Add at module scope (near `PLURAL`):
```js
const SORT_OPTIONS = [
  { value: '',           label: 'Recommended'      },
  { value: 'newest',     label: 'Newest'            },
  { value: 'price-asc',  label: 'Price Low → High'  },
  { value: 'price-desc', label: 'Price High → Low'  },
  { value: 'rated',      label: 'Highest Rated'     },
  { value: 'reviewed',   label: 'Most Reviewed'     },
  { value: 'updated',    label: 'Recently Updated'  },
];
```

Add `'sort'` to `FILTER_KEYS` (line ~119) so backend-sort changes refetch:
```js
  const FILTER_KEYS = ['listingStatus', 'city', 'propertyType', 'priceMin', 'priceMax', 'bedrooms', 'bathrooms', 'keyword', 'sort'];
```

Add the client-side overlay + handler inside the component (after the `areaInsight` memo):
```js
  // ── Sort (T3): rated/reviewed sort client-side; others are server-side ────
  const sortValue = searchParams.get('sort') || '';
  const displayedProperties = useMemo(() => {
    if (sortValue === 'rated') {
      return [...filteredProperties].sort(
        (a, b) => (b.reputationSummary?.avgRating || 0) - (a.reputationSummary?.avgRating || 0)
      );
    }
    if (sortValue === 'reviewed') {
      return [...filteredProperties].sort(
        (a, b) => (b.reputationSummary?.reviewCount || 0) - (a.reputationSummary?.reviewCount || 0)
      );
    }
    return filteredProperties;
  }, [filteredProperties, sortValue]);

  const handleSortChange = useCallback((e) => {
    const v = e.target.value;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (v) next.set('sort', v); else next.delete('sort');
      return next;
    }, { replace: true });
  }, [setSearchParams]);
```

- [ ] **Step 4: Render the dropdown in both headers**

List view — find `<div className="sp-list-header-right">` and add the select as its FIRST child:
```jsx
                <select className="sp-sort-select" value={sortValue} onChange={handleSortChange} aria-label="Sort listings">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
```

Map view — find `<div className="sp-panel-header-row">` and add the same select immediately BEFORE the save-search button:
```jsx
                  <select
                    className="sp-sort-select sp-sort-select--panel"
                    value={sortValue}
                    onChange={handleSortChange}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Sort listings"
                  >
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
```
(`stopPropagation` prevents the mobile sheet toggle on header tap.)

- [ ] **Step 5: Swap render sources** — in BOTH views change:
```jsx
: filteredProperties.map((p, i) => renderCard(p, i, false))
```
to
```jsx
: displayedProperties.map((p, i) => renderCard(p, i, false))
```
(and the map-view call with `true`). Leave the `filteredProperties.length === 0` empty checks as they are (same length).
Also update the two "Show N more" labels that compute `total - filteredProperties.length` — leave as is (same length, no change needed).

- [ ] **Step 6: CSS — append to Search.css**

```css
/* ── Sort select (T3) ────────────────────────────────────────────────────── */

.sp-sort-select {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--border-subtle, #e5e7eb);
  background: var(--color-bg-surface, #fff);
  color: var(--color-text-muted, #6b7280);
  font-size: 0.775rem;
  font-family: var(--font-sans, 'Inter Tight', 'Inter', sans-serif);
  padding: 5px 26px 5px 10px;
  border-radius: 999px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 9px center;
  transition: border-color 0.15s, color 0.15s;
}

.sp-sort-select:hover,
.sp-sort-select:focus-visible {
  border-color: var(--color-primary, #0F766E);
  color: var(--color-primary, #0F766E);
  outline: none;
}
```

- [ ] **Step 7: ESLint + commit**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
$env:ESLINT_USE_FLAT_CONFIG="false"
npx eslint src/pages/Search/index.js --max-warnings=0 2>&1 | Select-Object -Last 5
```

```
git add server/controllers/propertyController.js client/src/pages/Search/index.js client/src/pages/Search/Search.css
git commit -m "feat(polish): sort menu — server sorts (newest/price/updated) + client rating sorts"
```

---

## Task 4: Property Detail Sticky Card Summary

**Files:**
- Modify: `client/src/pages/PropertyDetail.js` (~line 673, sidebar)
- Modify: `client/src/pages/PropertyDetail.css`

The sidebar already IS sticky with glass styling, and already contains Message / phone-reveal (Call) / FavoriteButton (Save). What's missing per spec: price, Verified Owner badge, promotion badge, star rating at the top of the card.

- [ ] **Step 1: Read PropertyDetail.js lines 660-700** — find the opening of the sticky card (`pd-contact-sticky` wrapper) and the seller identity block.

- [ ] **Step 2: Add the summary header as FIRST child inside the sticky card**

```jsx
              {/* Sticky summary (T4) — price + trust badges, desktop only */}
              <div className="pd-sticky-summary">
                <div className="pd-sticky-price">
                  {property.currency || 'AZN'} {property.price?.toLocaleString() || '—'}
                </div>
                <div className="pd-sticky-badges">
                  {property.ownershipVerificationStatus === 'approved' && (
                    <span className="pd-sticky-badge pd-sticky-badge--verified">
                      <IconCheck size={11} />
                      Verified Owner
                    </span>
                  )}
                  {property.isPromoted && property.promotionTier && property.promotionTier !== 'FREE' && (
                    <span className={`pd-sticky-badge pd-sticky-badge--promo pd-sticky-badge--${property.promotionTier.toLowerCase()}`}>
                      {property.promotionTier === 'SPOTLIGHT' ? 'Spotlight' : property.promotionTier === 'PREMIUM' ? 'Premium' : 'Featured'}
                    </span>
                  )}
                  {property.propertyIdentityId?.avgRating > 0 && property.propertyIdentityId?.reviewCount > 0 && (
                    <span className="pd-sticky-badge pd-sticky-badge--rating">
                      ★ {property.propertyIdentityId.avgRating.toFixed(1)} ({property.propertyIdentityId.reviewCount})
                    </span>
                  )}
                </div>
              </div>
```

**Important:** `IconCheck` already exists at the top of the file (line ~23, accepts a `size` prop). Verify `property.propertyIdentityId` is a populated object in the getProperty response before relying on it — if `getProperty` does not populate it, the rating badge simply won't render (the `?.avgRating > 0` guard handles both cases safely). Do NOT add population to the backend.

- [ ] **Step 3: CSS — append to PropertyDetail.css**

```css
/* ── Sticky card summary (T4) ────────────────────────────────────────────── */

.pd-sticky-summary {
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--border-subtle, rgba(15, 23, 42, 0.07));
}

.pd-sticky-price {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-graphite-900, #0f172a);
  margin-bottom: 8px;
}

.pd-sticky-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pd-sticky-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  white-space: nowrap;
}

.pd-sticky-badge--verified { color: #166534; background: #f0fdf4; }
.pd-sticky-badge--rating   { color: #92400e; background: #fffbeb; }
.pd-sticky-badge--featured  { color: #d97706; background: #fffbeb; }
.pd-sticky-badge--premium   { color: #7c3aed; background: #f5f3ff; }
.pd-sticky-badge--spotlight { color: #0F766E; background: #f0fdf4; }

/* Desktop only — hide in stacked mobile layout */
@media (max-width: 1024px) {
  .pd-sticky-summary { display: none; }
}
```

- [ ] **Step 4: ESLint + commit**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
$env:ESLINT_USE_FLAT_CONFIG="false"
npx eslint src/pages/PropertyDetail.js --max-warnings=0 2>&1 | Select-Object -Last 5
```

```
git add client/src/pages/PropertyDetail.js client/src/pages/PropertyDetail.css
git commit -m "feat(polish): sticky card summary — price, verified, promotion, rating badges (desktop)"
```

---

## Task 5: Seller Performance Score + Promotion Upsell

**Files:**
- Modify: `client/src/components/ListingPerformanceCard.js`
- Modify: `client/src/components/ListingPerformanceCard.css`
- Modify: `client/src/App.js` (one redirect route)

- [ ] **Step 1: Add score computation at module scope** in ListingPerformanceCard.js (after `BENCHMARK_META`):

```js
// ── Performance Score (T6) — simple weighted 0–100, no AI ──────────────────
// views 20 | contacts 25 | favorites 15 | reviews 15 | promotion 10 | verification 15
function computePerformanceScore(l) {
  const views     = Math.min((l.viewsCount || 0) / 100, 1) * 20;
  const contacts  = Math.min(((l.inquiryCount || 0) + (l.phoneRevealCount || 0)) / 10, 1) * 25;
  const favorites = Math.min((l.favoritesCount || 0) / 10, 1) * 15;
  const rep       = l.reputationSummary || {};
  const reviews   = rep.reviewCount > 0 ? Math.min((rep.avgRating || 0) / 5, 1) * 15 : 0;
  const promo     = l.isPromoted && l.promotionTier && l.promotionTier !== 'FREE' ? 10 : 0;
  const verify    = l.ownershipVerificationStatus === 'approved' ? 15 : 0;
  return Math.round(views + contacts + favorites + reviews + promo + verify);
}

const SCORE_META = (score) => {
  if (score >= 80) return { label: 'Excellent',        color: '#166534', bg: '#f0fdf4' };
  if (score >= 60) return { label: 'Good',             color: '#0F766E', bg: '#f0fdfa' };
  if (score >= 40) return { label: 'Average',          color: '#92400e', bg: '#fffbeb' };
  return                  { label: 'Needs attention',  color: '#dc2626', bg: '#fef2f2' };
};
```

- [ ] **Step 2: Compute inside the component** (after the `verified` line):

```js
  const score     = computePerformanceScore(listing);
  const scoreMeta = SCORE_META(score);
  const isOrganic = !isPromoted || !promotionTier || promotionTier === 'FREE';
```

- [ ] **Step 3: Add score pill to the summary strip** — after the benchmark pill block, add:

```jsx
        <span
          className="lpc-score-pill"
          style={{ color: scoreMeta.color, background: scoreMeta.bg }}
          title={`Performance score: ${score}/100 — based on views, contacts, favorites, reviews, promotion, verification`}
        >
          {score}/100 · {scoreMeta.label}
        </span>
```

- [ ] **Step 4: Add promotion upsell** — inside the expanded `lpc-sections` div, after the Promotion section and before the benchmark note:

```jsx
            {/* Promotion upsell (T7) — organic listings only */}
            {isOrganic && (
              <div className="lpc-upsell">
                <p className="lpc-upsell-title">Want more visibility?</p>
                <p className="lpc-upsell-body">Promoted listings receive more views and enquiries.</p>
                <Link to="/services/promote" className="lpc-upsell-link">
                  Promote Listing →
                </Link>
              </div>
            )}
```

Add the import at top: `import { Link } from 'react-router-dom';`

- [ ] **Step 5: Add the redirect route to App.js** — `/services/promote` doesn't exist; promotion is requested per-listing from My Listings. Add a redirect with the legacy redirects (~line 218):

```jsx
            <Route path="/services/promote" element={<Navigate to="/account/listings" replace />} />
```

(`Navigate` is already imported in App.js.)

- [ ] **Step 6: CSS — append to ListingPerformanceCard.css**

```css
/* ── Performance score pill (T6) ─────────────────────────────────────────── */

.lpc-score-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Promotion upsell (T7) ───────────────────────────────────────────────── */

.lpc-upsell {
  background: var(--gray-50, #f8fafc);
  border: 1px solid var(--border-subtle, rgba(15,23,42,0.08));
  border-radius: 10px;
  padding: 12px 14px;
}

.lpc-upsell-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-graphite-800, #1e293b);
  margin: 0 0 2px;
}

.lpc-upsell-body {
  font-size: 0.75rem;
  color: var(--gray-500, #64748b);
  margin: 0 0 8px;
  line-height: 1.5;
}

.lpc-upsell-link {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary, #0F766E);
  text-decoration: none;
}
.lpc-upsell-link:hover { text-decoration: underline; }
```

- [ ] **Step 7: ESLint + commit**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
$env:ESLINT_USE_FLAT_CONFIG="false"
npx eslint src/components/ListingPerformanceCard.js src/App.js --max-warnings=0 2>&1 | Select-Object -Last 5
```

```
git add client/src/components/ListingPerformanceCard.js client/src/components/ListingPerformanceCard.css client/src/App.js
git commit -m "feat(polish): seller performance score (0-100 weighted) + promotion upsell for organic listings"
```

---

## Task 6: Review Polish

**Files:**
- Modify: `client/src/components/PropertyReputation.js`
- Modify: `client/src/components/PropertyReputation.css`

Sort options already exist (recent/highest/lowest/helpful). Spec order: Most Recent, Most Helpful, Highest Rated.

- [ ] **Step 1: Reorder SORT_OPTIONS** (lines 9-14):

```js
const SORT_OPTIONS = [
  { value: 'recent',  label: 'Most Recent'   },
  { value: 'helpful', label: 'Most Helpful'  },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest',  label: 'Lowest Rated'  },
];
```

- [ ] **Step 2: Add "N people found this helpful" line** — find the review card footer where the helpful button renders (~line 120). ABOVE the `prr-card-actions` row (or as the first item inside it), add:

```jsx
            {review.reviewHelpfulCount > 0 && (
              <p className="prr-helpful-count">
                <ThumbsUp size={11} strokeWidth={2} aria-hidden="true" />
                {review.reviewHelpfulCount} {review.reviewHelpfulCount === 1 ? 'person' : 'people'} found this helpful
              </p>
            )}
```

(`ThumbsUp` already imported. Do NOT use the 👍 emoji — design system prohibits emoji; the lucide icon conveys the same.)

Keep the existing Helpful button as-is (it's the vote action; the new line is the social-proof display).

- [ ] **Step 3: Verify owner responses are collapsible** — read the owner-response display JSX. If a response body renders fully expanded with no toggle, wrap it: show first 2 lines via a `--clamped` class and a "Show response"/"Hide response" toggle button reusing the existing `prr-expand-btn` pattern. If the existing display already clamps/toggles, leave unchanged and note it.

- [ ] **Step 4: CSS — append to PropertyReputation.css**

```css
/* ── Helpful social proof (T8) ───────────────────────────────────────────── */

.prr-helpful-count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--gray-500, #64748b);
  margin: 6px 0 0;
}

.prr-helpful-count svg { color: var(--color-primary, #0F766E); }
```

- [ ] **Step 5: ESLint + commit**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
$env:ESLINT_USE_FLAT_CONFIG="false"
npx eslint src/components/PropertyReputation.js --max-warnings=0 2>&1 | Select-Object -Last 5
```

```
git add client/src/components/PropertyReputation.js client/src/components/PropertyReputation.css
git commit -m "feat(polish): review helpful social proof, sort order — Most Recent / Most Helpful / Highest Rated"
```

---

## Task 7: Consistency Audit Fixes

**Files:**
- Modify: `client/src/App.css` (remove `--brand-*` aliases + usages)
- Modify: `client/src/pages/VerificationApplication.css` (6 `--brand-shadow` usages)
- Modify: emoji pages: `client/src/pages/EnhanceProperty.js`, `ListProperty.js`, `Services.js`, `ShortTermRental.js`, `UpdateProperty.js`, `ShareListingScreen.js`, `client/src/pages/enhancements/AddRoomsEnhancement.js`

- [ ] **Step 1: Migrate `--brand-*` in App.css**

```powershell
Select-String -Path "client\src\App.css" -Pattern "brand-" | Select-Object LineNumber, Line
```

For each usage: `--brand-primary` → `var(--color-primary, #0F766E)`, `--brand-accent` → `var(--color-primary-hover, #0d5f57)`, `--brand-shadow` → `var(--color-graphite-900, #0f172a)`. Then delete the alias definitions themselves from the `:root` block.

- [ ] **Step 2: Migrate `--brand-shadow` in VerificationApplication.css** — replace all 6 `var(--brand-shadow, ...)` usages with `var(--color-graphite-900, #0f172a)`.

- [ ] **Step 3: Emoji sweep** — in the 7 listed JS files, find all instances of these emoji: 🏠 ✅ ⚠️ 💡 ⏳ ❌ ⭐ 👍 📞 📷. Replace each with the equivalent lucide-react icon (`Home`, `Check`, `AlertTriangle`, `Lightbulb`, `Clock`, `X`, `Star`, `ThumbsUp`, `Phone`, `Camera`) sized 13-16px with `aria-hidden="true"`, OR remove if purely decorative. Plain `✓` text glyphs (U+2713) may stay — they are an established text convention in this codebase. Import icons as needed per file.

```powershell
Select-String -Path "client\src\pages\EnhanceProperty.js","client\src\pages\ListProperty.js","client\src\pages\Services.js","client\src\pages\ShortTermRental.js","client\src\pages\UpdateProperty.js","client\src\pages\ShareListingScreen.js","client\src\pages\enhancements\AddRoomsEnhancement.js" -Pattern "🏠|✅|⚠️|💡|⏳|❌|⭐|👍|📞|📷" | Select-Object Filename, LineNumber
```

- [ ] **Step 4: ESLint all touched files + commit**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
$env:ESLINT_USE_FLAT_CONFIG="false"
npx eslint src/pages/EnhanceProperty.js src/pages/ListProperty.js src/pages/Services.js src/pages/ShortTermRental.js src/pages/UpdateProperty.js src/pages/ShareListingScreen.js src/pages/enhancements/AddRoomsEnhancement.js --max-warnings=0 2>&1 | Select-Object -Last 8
```

```
git add -A client/src
git commit -m "fix(polish): consistency — remove legacy --brand-* tokens, replace emoji with lucide icons"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Full ESLint sweep on all modified files**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
$env:ESLINT_USE_FLAT_CONFIG="false"
npx eslint src/components/FilterBar.js src/pages/Search/index.js src/pages/PropertyDetail.js src/components/ListingPerformanceCard.js src/components/PropertyReputation.js src/App.js --max-warnings=0 2>&1 | Select-Object -Last 10
```
Expected: no output.

- [ ] **Step 2: Server syntax**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
node --check controllers/propertyController.js; echo "server OK"
```

- [ ] **Step 3: Production build**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
npm run build 2>&1 | Select-String -Pattern "^(Compiled|ERROR|Failed)" | Select-Object -First 5
```
Expected: `Compiled successfully.` or `Compiled with warnings.`

- [ ] **Step 4: Feature markers**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
node -e "
const fs = require('fs');
const fb  = fs.readFileSync('src/components/FilterBar.js','utf8');
const sp  = fs.readFileSync('src/pages/Search/index.js','utf8');
const pd  = fs.readFileSync('src/pages/PropertyDetail.js','utf8');
const lpc = fs.readFileSync('src/components/ListingPerformanceCard.js','utf8');
const prr = fs.readFileSync('src/components/PropertyReputation.js','utf8');
const ctl = fs.readFileSync('../server/controllers/propertyController.js','utf8');
const checks = {
  'active filter chips':   fb.includes('fb-active-chips') && fb.includes('removeChip'),
  'Filters (N)':           fb.includes('activeFilterCount > 0'),
  'contextual header':     sp.includes('verified owner'),
  'sort options':          sp.includes('Price Low') && sp.includes('Most Reviewed'),
  'backend SORT_MAP':      ctl.includes('SORT_MAP'),
  'sticky summary':        pd.includes('pd-sticky-summary'),
  'performance score':     lpc.includes('computePerformanceScore'),
  'promotion upsell':      lpc.includes('Want more visibility'),
  'helpful social proof':  prr.includes('found this helpful'),
};
let f=0; Object.entries(checks).forEach(([k,v])=>{console.log((v?'OK ':'MISSING ')+k); if(!v)f++;});
process.exit(f);
"
```
Expected: all `OK`.

- [ ] **Step 5: Git log + status; commit any remaining**

```powershell
cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
git log --oneline -10
git status
```

---

## Post-Beta Items (documented, NOT in scope)

| Severity | Item |
|----------|------|
| Medium | Server-side Highest Rated / Most Reviewed sort needs a denormalized avgRating/reviewCount on Property (currently page-scoped client sort) |
| Medium | `.rm-select:focus` / `.rm-input:focus` in ReviewModal.css missing box-shadow focus ring (textarea has it) |
| Medium | AccountListings header subtitle is manage-specific but shows on Performance tab |
| Low | `--gray-400` body text fails WCAG AA in a few muted-label spots |
| Low | Modal.js base lacks `aria-labelledby` title linkage |
| Low | Static sitemap.xml — no dynamic property URLs |
