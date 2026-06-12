# Phase 5.5D — Admin Metrics Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `/admin/metrics` page with four metric sections (Revenue, Conversion, Marketplace, Health) that gives the admin team a single-screen view of platform vitals without any new backend endpoints.

**Architecture:** All data comes from existing API functions + `getLocalAnalyticsStore()`. Nothing new is wired on the server. Page fetches 8 parallel requests on mount via `Promise.allSettled`, so a single failure never blanks the whole dashboard. The "Reported Reviews" card is intentionally left as `—` pending Phase 5.6.

**Tech Stack:** React 18, existing `api.js` functions, existing `getLocalAnalyticsStore()` from `analytics.js`, `Admin.css` shared admin styles.

**Depends on:** Phase 5.5C Task 1 must be complete (`getAdminLeads` must exist in `api.js`).

---

## Data source map

| Section | Metric | Source |
|---------|--------|--------|
| Revenue | Promotion Requests | `getAdminPromotionRequests('pending', token)` → `.total` |
| Revenue | Photography Requests | `getAdminLeads({ leadType: 'photography', limit: 1 }, token)` → `.total` |
| Revenue | Virtual Staging Requests | `getAdminLeads({ leadType: 'virtual_staging', limit: 1 }, token)` → `.total` |
| Revenue | Verification Requests | `getOwnershipRequests('pending', token)` → array `.length` |
| Conversion | Page Views (7d) | `getLocalAnalyticsStore()` — count photography/staging/verification page view events |
| Conversion | Inquiries (7d) | `getLocalAnalyticsStore()` — count `service_inquiry_submitted` events |
| Conversion | Completed Services | `getAdminLeads({ status: 'completed', limit: 1 }, token)` → `.total` |
| Marketplace | New Listings (30d) | `getAdminStats(token)` → `.newListings` |
| Marketplace | Reported Listings | `getReportStats(token)` → `.open + .reviewing` |
| Marketplace | Reported Reviews | `—` (Phase 5.6 placeholder) |
| Marketplace | Verification Queue | `getOwnershipRequests('pending', token)` → array `.length` |
| Health | Active Users (30d) | `getAdminStats(token)` → `.newUsers` |
| Health | Daily Inquiries | `getLocalAnalyticsStore()` — `service_inquiry_submitted` events last 24h |
| Health | Promotion Revenue | `getAdminPromotionRequests('approved', token)` → sum `TIER_PRICING[tier][days]` |

---

## File Map

### New files

| File | Responsibility |
|---|---|
| `client/src/pages/AdminMetrics.js` | Dashboard page — 4 sections, `StatCard` sub-component |
| `client/src/pages/AdminMetrics.css` | Section + stat card styles |

### Modified files

| File | Change |
|---|---|
| `client/src/App.js` | Add lazy import + `/admin/metrics` protected route |

---

## Task 1: AdminMetrics Page

**Files:**
- Create: `client/src/pages/AdminMetrics.js`
- Create: `client/src/pages/AdminMetrics.css`

- [ ] **Step 1: Create `client/src/pages/AdminMetrics.js`**

  ```jsx
  import React, { useEffect, useState, useCallback } from 'react';
  import { useAuth } from '../context/AuthContext';
  import {
    getAdminStats,
    getReportStats,
    getAdminPromotionRequests,
    getAdminLeads,
    getOwnershipRequests,
  } from '../services/api';
  import { getLocalAnalyticsStore } from '../services/analytics';
  import './Admin.css';
  import './AdminMetrics.css';

  const TIER_PRICING = {
    FEATURED:  { 7: 29,  30: 79,  90: 149 },
    PREMIUM:   { 7: 59,  30: 149, 90: 279 },
    SPOTLIGHT: { 7: 99,  30: 249, 90: 449 },
  };

  const MS_7D  = 7  * 24 * 60 * 60 * 1000;
  const MS_24H = 24 * 60 * 60 * 1000;

  const PAGE_VIEW_EVENTS = [
    'photography_page_viewed',
    'virtual_staging_page_viewed',
    'verification_page_viewed',
  ];

  function countLocalEvents(events, matchFn, sinceMs) {
    const cutoff = Date.now() - sinceMs;
    return events.filter(e => e.ts > cutoff && matchFn(e)).length;
  }

  const StatCard = ({ title, value, sublabel, accent }) => (
    <div className="am-card">
      <div className="am-card-value" style={accent ? { color: accent } : undefined}>
        {value === null ? <span className="am-card-loading">…</span> : value}
      </div>
      <div className="am-card-title">{title}</div>
      {sublabel && <div className="am-card-sub">{sublabel}</div>}
    </div>
  );

  const AdminMetrics = () => {
    const { user } = useAuth();
    const [metrics,  setMetrics]  = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [loadError, setLoadError] = useState('');

    const load = useCallback(async () => {
      setLoading(true);
      setLoadError('');
      try {
        const token       = localStorage.getItem('token');
        const localEvents = getLocalAnalyticsStore();

        const [
          adminStatsRes,
          reportStatsRes,
          promoPendingRes,
          promoApprovedRes,
          photoLeadsRes,
          stagingLeadsRes,
          completedLeadsRes,
          ownershipRes,
        ] = await Promise.allSettled([
          getAdminStats(token),
          getReportStats(token),
          getAdminPromotionRequests('pending', token),
          getAdminPromotionRequests('approved', token),
          getAdminLeads({ leadType: 'photography',     limit: 1 }, token),
          getAdminLeads({ leadType: 'virtual_staging', limit: 1 }, token),
          getAdminLeads({ status:   'completed',       limit: 1 }, token),
          getOwnershipRequests('pending', token),
        ]);

        const safe = (res, fallback) =>
          res.status === 'fulfilled' ? res.value.data : fallback;

        const adminStats      = safe(adminStatsRes,      {});
        const reportStats     = safe(reportStatsRes,     {});
        const promoPending    = safe(promoPendingRes,    { total: 0 });
        const promoApproved   = safe(promoApprovedRes,   { requests: [] });
        const photoLeads      = safe(photoLeadsRes,      { total: 0 });
        const stagingLeads    = safe(stagingLeadsRes,    { total: 0 });
        const completedLeads  = safe(completedLeadsRes,  { total: 0 });
        const ownershipQueue  = safe(ownershipRes,       []);

        const verifQueueCount = Array.isArray(ownershipQueue)
          ? ownershipQueue.length
          : (ownershipQueue.total ?? 0);

        const promoRevenue = (promoApproved.requests || []).reduce((sum, pr) => (
          sum + (TIER_PRICING[pr.requestedTier]?.[pr.requestedDays] ?? 0)
        ), 0);

        setMetrics({
          // Revenue
          promoPending:      promoPending.total      ?? 0,
          photoRequests:     photoLeads.total        ?? 0,
          stagingRequests:   stagingLeads.total      ?? 0,
          verifRequests:     verifQueueCount,

          // Conversion (local store)
          pageViews7d:       countLocalEvents(localEvents, e => PAGE_VIEW_EVENTS.includes(e.event), MS_7D),
          inquiries7d:       countLocalEvents(localEvents, e => e.event === 'service_inquiry_submitted', MS_7D),
          completedServices: completedLeads.total    ?? 0,

          // Marketplace
          newListings30d:    adminStats.newListings  ?? 0,
          reportedListings:  (reportStats.open ?? 0) + (reportStats.reviewing ?? 0),
          verifQueue:        verifQueueCount,

          // Health
          activeUsers30d:    adminStats.newUsers     ?? 0,
          dailyInquiries:    countLocalEvents(localEvents, e => e.event === 'service_inquiry_submitted', MS_24H),
          promoRevenue,
        });
      } catch (err) {
        setLoadError('Some metrics failed to load. Refresh to retry.');
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (!user) return null;

    const m = metrics;

    return (
      <div className="admin-page">
        <div className="admin-container">

          <div className="admin-page-header">
            <div>
              <h1>Metrics</h1>
              <p>Revenue, conversion, marketplace health, and platform vitals</p>
            </div>
            <button className="am-refresh" onClick={load} disabled={loading} aria-label="Refresh metrics">
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {loadError && <p className="am-error" role="alert">{loadError}</p>}

          {/* ── Revenue ─────────────────────────────────────────────────────── */}
          <section className="am-section" aria-labelledby="am-revenue">
            <h2 id="am-revenue" className="am-section-title">Revenue</h2>
            <div className="am-grid am-grid--4">
              <StatCard
                title="Promotion Requests"
                value={loading ? null : m?.promoPending}
                sublabel="pending review"
                accent="#7c3aed"
              />
              <StatCard
                title="Photography Requests"
                value={loading ? null : m?.photoRequests}
                sublabel="total received"
                accent="#0F766E"
              />
              <StatCard
                title="Virtual Staging Requests"
                value={loading ? null : m?.stagingRequests}
                sublabel="total received"
                accent="#0F766E"
              />
              <StatCard
                title="Verification Requests"
                value={loading ? null : m?.verifRequests}
                sublabel="pending ownership queue"
                accent="#d97706"
              />
            </div>
          </section>

          {/* ── Conversion ──────────────────────────────────────────────────── */}
          <section className="am-section" aria-labelledby="am-conversion">
            <h2 id="am-conversion" className="am-section-title">Conversion</h2>
            <p className="am-section-note">Page views and inquiries from local analytics store — reflects this browser session</p>
            <div className="am-grid am-grid--3">
              <StatCard
                title="Service Page Views"
                value={loading ? null : m?.pageViews7d}
                sublabel="last 7 days"
              />
              <StatCard
                title="Inquiries"
                value={loading ? null : m?.inquiries7d}
                sublabel="last 7 days"
                accent="#0F766E"
              />
              <StatCard
                title="Completed Services"
                value={loading ? null : m?.completedServices}
                sublabel="all time"
                accent="#16a34a"
              />
            </div>
          </section>

          {/* ── Marketplace ─────────────────────────────────────────────────── */}
          <section className="am-section" aria-labelledby="am-marketplace">
            <h2 id="am-marketplace" className="am-section-title">Marketplace</h2>
            <div className="am-grid am-grid--4">
              <StatCard
                title="New Listings"
                value={loading ? null : m?.newListings30d}
                sublabel="last 30 days"
              />
              <StatCard
                title="Reported Listings"
                value={loading ? null : m?.reportedListings}
                sublabel="open + reviewing"
                accent={m?.reportedListings > 0 ? '#dc2626' : undefined}
              />
              <StatCard
                title="Reported Reviews"
                value="—"
                sublabel="available in Phase 5.6"
              />
              <StatCard
                title="Verification Queue"
                value={loading ? null : m?.verifQueue}
                sublabel="pending documents"
                accent={m?.verifQueue > 5 ? '#d97706' : undefined}
              />
            </div>
          </section>

          {/* ── Health ──────────────────────────────────────────────────────── */}
          <section className="am-section" aria-labelledby="am-health">
            <h2 id="am-health" className="am-section-title">Health</h2>
            <div className="am-grid am-grid--3">
              <StatCard
                title="Active Users"
                value={loading ? null : m?.activeUsers30d}
                sublabel="registered last 30 days"
              />
              <StatCard
                title="Daily Inquiries"
                value={loading ? null : m?.dailyInquiries}
                sublabel="last 24 hours (local store)"
                accent={m?.dailyInquiries > 0 ? '#0F766E' : undefined}
              />
              <StatCard
                title="Promotion Revenue"
                value={loading ? null : `AZN ${(m?.promoRevenue ?? 0).toLocaleString()}`}
                sublabel="from approved requests, all time"
                accent="#7c3aed"
              />
            </div>
          </section>

        </div>
      </div>
    );
  };

  export default AdminMetrics;
  ```

- [ ] **Step 2: Create `client/src/pages/AdminMetrics.css`**

  ```css
  /* ── Page header ─────────────────────────────────────────────────────────── */

  .admin-page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }

  .am-refresh {
    padding: 7px 16px;
    border-radius: 7px;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    background: none;
    font-size: 0.8125rem;
    color: var(--gray-500, #64748b);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s;
    align-self: flex-start;
    margin-top: 6px;
  }
  .am-refresh:hover:not(:disabled) { background: var(--gray-50, #f8fafc); }
  .am-refresh:disabled { opacity: 0.45; cursor: default; }

  .am-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 0.875rem;
    color: #991b1b;
    margin-bottom: 20px;
  }

  /* ── Sections ────────────────────────────────────────────────────────────── */

  .am-section {
    margin-bottom: 36px;
  }

  .am-section-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--gray-500, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 4px;
  }

  .am-section-note {
    font-size: 0.75rem;
    color: var(--gray-400, #94a3b8);
    margin: 0 0 14px;
  }

  /* ── Grid ────────────────────────────────────────────────────────────────── */

  .am-grid {
    display: grid;
    gap: 12px;
    margin-top: 12px;
  }

  .am-grid--4 { grid-template-columns: repeat(4, 1fr); }
  .am-grid--3 { grid-template-columns: repeat(3, 1fr); }

  /* ── Stat card ───────────────────────────────────────────────────────────── */

  .am-card {
    background: var(--color-bg-surface, #fff);
    border: 1px solid var(--border-subtle, rgba(15,23,42,0.08));
    border-radius: 10px;
    padding: 18px 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .am-card-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .am-card-loading {
    font-size: 1.5rem;
    color: var(--gray-300, #cbd5e1);
  }

  .am-card-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-graphite-700, #334155);
    margin-top: 8px;
  }

  .am-card-sub {
    font-size: 0.75rem;
    color: var(--gray-400, #94a3b8);
  }

  /* ── Responsive ──────────────────────────────────────────────────────────── */

  @media (max-width: 960px) {
    .am-grid--4 { grid-template-columns: repeat(2, 1fr); }
    .am-grid--3 { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 540px) {
    .am-grid--4,
    .am-grid--3 { grid-template-columns: 1fr; }
  }
  ```

- [ ] **Step 3: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/AdminMetrics.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output. If `react-hooks/exhaustive-deps` fires on `load` inside `useEffect`, add `// eslint-disable-next-line react-hooks/exhaustive-deps` before the dependency array.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/pages/AdminMetrics.js client/src/pages/AdminMetrics.css
  git commit -m "feat(admin): add AdminMetrics dashboard — Revenue, Conversion, Marketplace, Health"
  ```

---

## Task 2: App.js Route

**Files:**
- Modify: `client/src/App.js`

- [ ] **Step 1: Read `client/src/App.js`** to find the admin lazy imports block and admin routes section.

- [ ] **Step 2: Add lazy import**

  Find the admin lazy imports block (near `const AdminAbuse = lazy(...)`). Add:
  ```jsx
  const AdminMetrics = lazy(() => import('./pages/AdminMetrics'));
  ```

- [ ] **Step 3: Add route**

  Find the admin routes section (near `<Route path="/admin/abuse" ...>`). Add:
  ```jsx
  <Route path="/admin/metrics" element={
    <ProtectedRoute requireAdmin><MainLayout><AdminMetrics /></MainLayout></ProtectedRoute>
  } />
  ```

- [ ] **Step 4: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/App.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/App.js
  git commit -m "feat(admin): add /admin/metrics route"
  ```

---

## Task 3: Build Verification

- [ ] **Step 1: React build — zero errors**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  npm run build 2>&1 | grep -E "^(Compiled|ERROR|Failed)" | head -5
  ```
  Expected: `Compiled successfully.` or `Compiled with warnings.`

- [ ] **Step 2: Confirm all data sources are wired**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  node -e "
    const src = require('fs').readFileSync('src/pages/AdminMetrics.js', 'utf8');
    const required = [
      'getAdminStats', 'getReportStats', 'getAdminPromotionRequests',
      'getAdminLeads', 'getOwnershipRequests', 'getLocalAnalyticsStore',
      'TIER_PRICING', 'Promise.allSettled'
    ];
    const missing = required.filter(k => !src.includes(k));
    if (missing.length) { console.error('MISSING:', missing); process.exit(1); }
    else console.log('All data sources wired OK');
  "
  ```
  Expected: `All data sources wired OK`

- [ ] **Step 3: Git status — clean tree**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  git log --oneline -5
  git status
  ```

---

## Deliverables Summary

### New files (2)
| File | Purpose |
|---|---|
| `client/src/pages/AdminMetrics.js` | 4-section dashboard — Revenue / Conversion / Marketplace / Health |
| `client/src/pages/AdminMetrics.css` | Stat card grid + section styles |

### Modified files (1)
| File | Change |
|---|---|
| `client/src/App.js` | `/admin/metrics` lazy route |

### Notable design decisions
| Decision | Why |
|---|---|
| `Promise.allSettled` | A single API failure never blanks the whole dashboard |
| "Reported Reviews" = `—` | Phase 5.6 will add `PropertyReview` with report counts; wired then |
| Promotion Revenue = AZN sum | Calculated client-side from `requestedTier + requestedDays` using `TIER_PRICING` — matches what PromoteListingModal shows users |
| Local store for conversion | Page views and inquiry events are already stored by Phase 5.5B analytics instrumentation |
