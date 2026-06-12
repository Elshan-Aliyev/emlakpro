# Search URL Reversion — Beta Blocker Bugfix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix URL/filter reversion, navigation confusion, stale area-search results, and add a "Clear all" filters button.

**Architecture:** Three surgical edits in two files. No state architecture changes, no new components. The root cause is the Property Preview Drawer using `window.history.pushState` to change the URL to `/properties/id` while React Router's internal state stays on `/search?...`. When `closeDrawer` restores the search URL via another `pushState`, it uses a stale snapshot (`searchUrlRef.current` was captured at drawer-open time, before the user changed any filters). Fix: (1) keep `searchUrlRef.current` in sync with filter changes made while the drawer is open; (2) change `closeDrawer` from `pushState` to `replaceState` so no extra history entry is added; (3) add a cancellation guard to `handleSearchArea`.

**Tech Stack:** React 18, React Router v7 `useSearchParams`, `window.history` API, existing CSS design tokens.

---

## Root Cause Summary

| Bug | Root Cause | Affected Code |
|-----|-----------|---------------|
| Filter state reverts when drawer closes | `searchUrlRef.current` set once on drawer open; stale on close | `Search/index.js` `closeDrawer` + `openDrawer` |
| Clicking Dashboard/Home returns to Search | `closeDrawer` uses `pushState` adding an extra `/search?old` history entry; pressing Back from the next page lands on it | `Search/index.js` `closeDrawer` |
| Area-search results overwrite filter results | `handleSearchArea` has no `cancelled` guard | `Search/index.js` `handleSearchArea` |
| No "Clear all" button exists | Feature not implemented | `FilterBar.js` + `FilterBar.css` |

---

## File Map

| File | Change |
|------|--------|
| `client/src/pages/Search/index.js` | Add `areaSearchCancelRef`; add sync-ref effect; change `closeDrawer` to `replaceState`; add area cancel to main effect cleanup |
| `client/src/components/FilterBar.js` | Add "Clear all" button JSX in `fb-actions` |
| `client/src/components/FilterBar.css` | Add `.fb-clear-btn` styles |

---

## Task 1: Fix URL Reversion — Keep `searchUrlRef` in Sync + Use `replaceState` in `closeDrawer`

**Files:**
- Modify: `client/src/pages/Search/index.js`

The key facts about this file:
- Line 86: `const [searchParams, setSearchParams] = useSearchParams();`
- Line 106: `const searchUrlRef = useRef(null);`
- Line 107: `const drawerPropertyIdRef = useRef(null);`
- Line 180: `useEffect(() => { drawerPropertyIdRef.current = drawerPropertyId; }, [drawerPropertyId]);` — the drawer ref sync effect
- Line 183–194: `openDrawer` callback — sets `searchUrlRef.current` once then calls `window.history.pushState`
- Line 197–202: `closeDrawer` callback — calls `window.history.pushState(null, '', searchUrlRef.current)` ← BUG

- [ ] **Step 1: Read the file to confirm current line numbers**

  ```powershell
  Select-String -Path "client\src\pages\Search\index.js" -Pattern "drawerPropertyIdRef.current = drawerPropertyId|searchUrlRef.current = window|window.history.pushState|window.history.replaceState|closeDrawer|openDrawer" | Select-Object LineNumber, Line | Format-Table -AutoSize
  ```

  Confirm the line numbers for the three change points before editing.

- [ ] **Step 2: Add `areaSearchCancelRef` near the other refs (around line 113)**

  Find the block:
  ```js
  const prevCityRef   = useRef(searchParams.get('city'));
  ```

  Add immediately after it:
  ```js
  const areaSearchCancelRef = useRef(false);
  ```

- [ ] **Step 3: Add the sync-ref effect immediately after the `drawerPropertyIdRef` sync effect**

  Find (line ~180):
  ```js
  useEffect(() => { drawerPropertyIdRef.current = drawerPropertyId; }, [drawerPropertyId]);
  ```

  Add immediately after it (new lines, same indentation):
  ```js

  // Keep restore URL in sync with filter changes while drawer is open.
  // After setSearchParams(replace:true), window.location reflects the new /search?... URL.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!drawerPropertyIdRef.current) return;
    if (window.location.pathname.includes('search')) {
      searchUrlRef.current = window.location.pathname + window.location.search;
    }
  }, [searchParams]);
  ```

  **Why this works:** When the user changes a filter while the drawer is open, `setSearchParams({replace:true})` replaces the browser's current entry (`/properties/id`) with the new search URL. `window.location` now reflects the new URL. This effect fires because `searchParams` changed, reads `window.location`, and updates `searchUrlRef.current` with the correct new URL. The eslint-disable comment is required because `drawerPropertyIdRef` is accessed but correctly excluded from deps (it's a ref, read for its current value).

- [ ] **Step 4: Change `closeDrawer` from `pushState` to `replaceState`**

  Find:
  ```js
  const closeDrawer = useCallback(() => {
    setDrawerPropertyId(null);
    if (searchUrlRef.current) {
      window.history.pushState(null, '', searchUrlRef.current);
    }
  }, []);
  ```

  Replace with:
  ```js
  const closeDrawer = useCallback(() => {
    setDrawerPropertyId(null);
    if (searchUrlRef.current) {
      window.history.replaceState(null, '', searchUrlRef.current);
    }
  }, []);
  ```

  **Why `replaceState` instead of `pushState`:** The drawer `openDrawer` already pushed `/properties/id` onto history. `closeDrawer` should REPLACE that entry (restoring it to the search URL), not add a new one. Using `pushState` was creating an extra `/search?old` history entry — every open+close cycle added a ghost entry that pressing Back would surface.

- [ ] **Step 5: ESLint check**

  ```powershell
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  $env:ESLINT_USE_FLAT_CONFIG="false"
  npx eslint src/pages/Search/index.js --max-warnings=0 2>&1 | Select-Object -Last 5
  ```

  Expected: no output.

- [ ] **Step 6: Commit**

  ```
  git add client/src/pages/Search/index.js
  git commit -m "fix(search): keep searchUrlRef in sync with filter changes; replaceState in closeDrawer"
  ```

---

## Task 2: Fix `handleSearchArea` — Add Cancellation Guard

**Files:**
- Modify: `client/src/pages/Search/index.js` (continuation of Task 1)

The `handleSearchArea` function (around line 358) has no guard against stale results. If the user triggers "Search this area" and then changes a filter before the fetch completes, the area-search results will overwrite the filter results — results reversion without URL reversion.

Additionally, the main filter effect's cleanup must cancel any in-flight area search.

- [ ] **Step 1: Read `handleSearchArea` to confirm its current code**

  ```powershell
  Select-String -Path "client\src\pages\Search\index.js" -Pattern "handleSearchArea" | Select-Object LineNumber, Line
  ```

  Then read lines ~358–384 to see the full function body.

- [ ] **Step 2: Replace `handleSearchArea` with the guarded version**

  Find the current function (it starts with `const handleSearchArea = useCallback(async...`). Replace the entire function with:

  ```js
  const handleSearchArea = useCallback(async ({ west, south, east, north }) => {
    areaSearchCancelRef.current = false;
    track('map_search_area_clicked', {
      listing_status: searchParams.get('listingStatus') || '',
    });
    try {
      setLoading(true);
      setFilteredProperties([]);
      const res = await getProperties(buildParams({
        page: 1,
        bboxWest: west.toFixed(6),
        bboxSouth: south.toFixed(6),
        bboxEast: east.toFixed(6),
        bboxNorth: north.toFixed(6),
      }));
      if (areaSearchCancelRef.current) return;
      const d = res.data;
      const loaded = d.properties || [];
      setFilteredProperties(loaded);
      setTotal(d.total || 0);
      setPage(1);
      setHasMore((d.totalPages || 1) > 1);
    } catch (err) {
      if (!areaSearchCancelRef.current) console.error('Error fetching by area:', err);
    } finally {
      if (!areaSearchCancelRef.current) setLoading(false);
    }
  }, [buildParams, searchParams]);
  ```

- [ ] **Step 3: Update the main filter effect cleanup to also cancel area searches**

  Find the cleanup at the bottom of the main filter `useEffect` (around line 290):
  ```js
  return () => { cancelled = true; clearTimeout(timer); };
  ```

  Replace with:
  ```js
  return () => { cancelled = true; clearTimeout(timer); areaSearchCancelRef.current = true; };
  ```

  **Why:** When filters change, any in-flight area search is now stale. Cancelling it prevents stale area results from overwriting the fresh filter results.

- [ ] **Step 4: ESLint check**

  ```powershell
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  $env:ESLINT_USE_FLAT_CONFIG="false"
  npx eslint src/pages/Search/index.js --max-warnings=0 2>&1 | Select-Object -Last 5
  ```

  Expected: no output.

- [ ] **Step 5: Commit**

  ```
  git add client/src/pages/Search/index.js
  git commit -m "fix(search): add cancellation guard to handleSearchArea; cancel on filter change"
  ```

---

## Task 3: Clear Filters Button

**Files:**
- Modify: `client/src/components/FilterBar.js`
- Modify: `client/src/components/FilterBar.css`

The `handleClearFilters` function already exists at line 111 of FilterBar.js and correctly:
- Preserves `listingStatus` (Buy/Rent/New tabs — NOT cleared)
- Preserves `view`, `lng`, `lat`, `zoom` (map position preserved)
- Clears everything else (city, propertyType, priceMin, priceMax, bedrooms, bathrooms, keyword, all toggle filters)
- Uses `setSearchParams(..., { replace: true })` — single URL update, single fetch

`hasActiveFilters` is computed at line 193 and is `true` when ANY of `ALL_FILTER_KEYS` (city, district, propertyType, price, bedrooms, bathrooms, keyword, toggles) is set — does NOT include `listingStatus`, so the button only shows when real filters are active.

The `X` icon is already imported at line 3: `import { Search, X, ChevronDown, SlidersHorizontal, Map, AlignJustify } from 'lucide-react';`

- [ ] **Step 1: Read the `fb-actions` section in FilterBar.js**

  ```powershell
  Select-String -Path "client\src\components\FilterBar.js" -Pattern "fb-actions|fb-filters-btn|fb-view-toggle" | Select-Object LineNumber, Line | Format-Table -AutoSize
  ```

  Confirm the line numbers so the insertion is accurate.

- [ ] **Step 2: Add the "Clear all" button inside `fb-actions`, before the Filters button**

  Find in FilterBar.js:
  ```jsx
          <div className="fb-actions">
            <button
              className={`fb-filters-btn${hasActiveFilters ? ' fb-filters-btn--active' : ''}`}
  ```

  Replace with:
  ```jsx
          <div className="fb-actions">
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
            <button
              className={`fb-filters-btn${hasActiveFilters ? ' fb-filters-btn--active' : ''}`}
  ```

- [ ] **Step 3: Add `.fb-clear-btn` styles to `FilterBar.css`**

  Read `client/src/components/FilterBar.css` to find the end of the file (or a good location near other `fb-actions` rules). Append:

  ```css
  /* ── Clear all filters button ────────────────────────────────────────────── */

  .fb-clear-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-radius: 7px;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    background: none;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--gray-500, #64748b);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, border-color 0.12s;
  }

  .fb-clear-btn:hover {
    background: var(--gray-50, #f8fafc);
    border-color: rgba(15,23,42,0.14);
  }

  @media (max-width: 768px) {
    .fb-clear-btn {
      display: none;
    }
  }
  ```

  **Why `display: none` on mobile:** The spec says "Desktop: Place Clear all next to Filters ▼". On mobile, filter management goes through the FilterModal which already has a Reset button.

- [ ] **Step 4: ESLint check**

  ```powershell
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  $env:ESLINT_USE_FLAT_CONFIG="false"
  npx eslint src/components/FilterBar.js --max-warnings=0 2>&1 | Select-Object -Last 5
  ```

  Expected: no output.

- [ ] **Step 5: Commit**

  ```
  git add client/src/components/FilterBar.js client/src/components/FilterBar.css
  git commit -m "feat(search): add Clear all filters button — desktop only, shown when active filters exist"
  ```

---

## Task 4: Verification

- [ ] **Step 1: ESLint sweep — all modified files**

  ```powershell
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  $env:ESLINT_USE_FLAT_CONFIG="false"
  npx eslint src/pages/Search/index.js src/components/FilterBar.js --max-warnings=0 2>&1 | Select-Object -Last 8
  ```

  Expected: no output.

- [ ] **Step 2: React build**

  ```powershell
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  npm run build 2>&1 | Select-String -Pattern "^(Compiled|ERROR|Failed)" | Select-Object -First 5
  ```

  Expected: `Compiled successfully.` or `Compiled with warnings.`

- [ ] **Step 3: Verify fix 1 — searchUrlRef sync**

  ```powershell
  node -e "
    const src = require('fs').readFileSync('src/pages/Search/index.js', 'utf8');
    const checks = {
      'areaSearchCancelRef declared': src.includes('areaSearchCancelRef = useRef(false)'),
      'sync-ref effect on searchParams': src.includes('if (!drawerPropertyIdRef.current) return') && src.includes('window.location.pathname.includes'),
      'closeDrawer uses replaceState': src.includes('window.history.replaceState(null') && !src.match(/closeDrawer[\s\S]{0,200}pushState/),
      'area cancel in main cleanup': src.includes('areaSearchCancelRef.current = true'),
      'area cancel in handleSearchArea': src.includes('areaSearchCancelRef.current = false'),
    };
    Object.entries(checks).forEach(([k,v]) => console.log((v ? 'OK' : 'MISSING') + ' — ' + k));
  "
  ```

  Expected: all `OK`.

- [ ] **Step 4: Verify fix 2 — Clear button**

  ```powershell
  node -e "
    const src = require('fs').readFileSync('src/components/FilterBar.js', 'utf8');
    const checks = {
      'Clear all button present': src.includes('fb-clear-btn'),
      'guarded by hasActiveFilters': src.includes('{hasActiveFilters && (') && src.includes('fb-clear-btn'),
      'calls handleClearFilters': src.includes('onClick={handleClearFilters}'),
      'aria-label present': src.includes('aria-label=\"Clear all filters\"'),
    };
    Object.entries(checks).forEach(([k,v]) => console.log((v ? 'OK' : 'MISSING') + ' — ' + k));
  "
  ```

  Expected: all `OK`.

- [ ] **Step 5: Git log**

  ```powershell
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  git log --oneline -6
  git status
  ```

  Expected: 3 new commits visible; clean working tree.

---

## Root Cause Explanation (for final report)

**Bug 1 — URL/filter reversion:**

`openDrawer` (line 190) saves `window.location.pathname + window.location.search` into `searchUrlRef.current` at drawer-open time, then calls `window.history.pushState` to navigate the browser URL to `/properties/id`. This pushState bypasses React Router — React Router's internal location remains `/search?...`. When the user then changes a filter, `setSearchParams(prev=>{...}, {replace:true})` correctly fires React Router's `replaceState` on its internally-known `/search?...` entry, updating the browser URL to the new `/search?newFilter`. React Router's `searchParams` updates, the fetch fires, results are correct. **But `searchUrlRef.current` is still frozen at the OLD URL from before the drawer opened.** When `closeDrawer` fires, `window.history.pushState(null, '', searchUrlRef.current)` pushes back the old URL — reverting the address bar to the pre-filter state. Any subsequent page refresh or React Router sync with the URL restores the old filter state.

**Bug 2 — Navigation confusion:**

`closeDrawer` used `pushState` instead of `replaceState`, creating an extra `/search?old` history entry on every close. History stack grew: `…, /search?old (original), /properties/id (openDrawer), /search?old (closeDrawer push)`. When the user then navigated to Dashboard, pressing Back landed on the `closeDrawer` ghost entry (Search), making it appear that the Dashboard navigation had returned them to Search.

**Fix summary:**
- A new `useEffect([searchParams])` updates `searchUrlRef.current` from `window.location` whenever filters change while the drawer is open — keeping the restore URL fresh.
- `closeDrawer` now uses `replaceState` (not `pushState`) — it replaces the `/properties/id` entry in-place instead of adding a new one. History grows only when the drawer opens (one push per open), not on close.
- `handleSearchArea` now checks `areaSearchCancelRef.current` before applying results, and the main filter-change effect's cleanup sets this ref to `true` — preventing stale area results from overwriting fresh filter results.
