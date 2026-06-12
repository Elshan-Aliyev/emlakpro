# Phase 5.7 — Seller Intelligence Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform My Listings from a management page into a performance dashboard — showing each listing's visibility, engagement, trust, and promotion data alongside city/type benchmark labels.

**Architecture:** A new `GET /api/properties/my-dashboard` endpoint returns the seller's listings enriched with all stat fields, populated reputation aggregates, and server-computed benchmark labels (computed by aggregating averages across all approved listings with the same city + propertyType). The client reads the local `emlak_analytics_store` to supplement DB counts with session-level event data. Two new components (`ListingPerformanceCard` + `SellerDashboard`) are imported into `AccountListings.js` behind a "Performance" tab. No new Mongoose models are created.

**Tech Stack:** Node.js/Express/Mongoose (existing), React 18, Lucide icons, existing `getLocalAnalyticsStore()`, CSS custom properties from `globals.css`.

---

## Data Source Map

| Display metric | Source |
|---|---|
| Detail views | `property.viewsCount` (DB counter incremented by `incrementPropertyViews`) |
| Session views (local) | `getLocalAnalyticsStore()` — count `property_viewed` events with matching `property_id` |
| Map opens | Not tracked — display `—` |
| Favorites | `property.favoritesCount` (DB) |
| Phone reveals | `property.phoneRevealCount` (DB) |
| Contact requests | `property.inquiryCount` (DB) |
| Verified Owner | `property.ownershipVerificationStatus === 'approved'` |
| Review count | `property.propertyIdentityId.reviewCount` (populated) |
| Average rating | `property.propertyIdentityId.avgRating` |
| Recommendation % | `property.propertyIdentityId.recommendPercentage` |
| Promotion tier | `property.promotionTier` |
| Days remaining | `Math.max(0, Math.ceil((promotionEndDate - now) / MS_1D))` |
| Promotion start | `property.promotionStartDate` |
| Promotion expiry | `property.promotionEndDate` |
| Benchmark label | Server-computed from city+type aggregate average |

## Benchmark Computation

Server aggregates all **active + approved** listings grouped by `{ city, propertyType }`. For each seller listing, the server finds the matching group average and computes a `viewBenchmark` label:

- `viewsCount > avgViews × 1.2` → `above_average`
- `viewsCount < avgViews × 0.8` → `below_average`
- otherwise → `average`

Listings in groups with fewer than 3 comparables are labelled `average` to avoid misleading single-listing comparisons.

---

## File Map

### New files

| File | Responsibility |
|---|---|
| `client/src/components/ListingPerformanceCard.js` | Individual listing card with Visibility / Engagement / Trust / Promotion / Benchmark sections |
| `client/src/components/ListingPerformanceCard.css` | Card styles |
| `client/src/components/SellerDashboard.js` | Dashboard container — fetches, aggregates local analytics, renders card list |
| `client/src/components/SellerDashboard.css` | Dashboard styles |

### Modified files

| File | Change |
|---|---|
| `server/controllers/propertyController.js` | Add `getMyDashboard` handler |
| `server/routes/propertyRoutes.js` | Add `GET /my-dashboard` protected route |
| `client/src/services/api.js` | Add `getMyDashboard(token)` |
| `client/src/pages/AccountListings.js` | Add "Performance" tab — renders `SellerDashboard`; existing tab becomes "Manage" |

---

## Task 1: Backend — Dashboard Endpoint

**Files:**
- Modify: `server/controllers/propertyController.js`
- Modify: `server/routes/propertyRoutes.js`
- Modify: `client/src/services/api.js`

- [ ] **Step 1: Read `server/controllers/propertyController.js`** — find the existing require block at the top and an appropriate place to add the new handler.

- [ ] **Step 2: Add `getMyDashboard` to `server/controllers/propertyController.js`**

  After the existing imports/requires block, add:

  ```js
  // ── Seller Intelligence Dashboard ─────────────────────────────────────────
  exports.getMyDashboard = async (req, res) => {
    try {
      // 1. Fetch all of this seller's listings with full stat fields
      const listings = await Property.find({ ownerId: req.user.id })
        .populate('propertyIdentityId', 'avgRating reviewCount recommendPercentage')
        .select(
          'title city location price currency status isApproved listingStatus images createdAt ' +
          'ownershipVerificationStatus propertyType bedrooms ' +
          'viewsCount favoritesCount inquiryCount phoneRevealCount sharesCount ' +
          'promotionTier isPromoted promotionStartDate promotionEndDate promotionScore ' +
          'propertyIdentityId'
        )
        .sort({ createdAt: -1 })
        .lean();

      if (listings.length === 0) {
        return res.json({ listings: [] });
      }

      // 2. Compute city+type benchmark averages across all active approved listings
      const cityTypePairs = [...new Set(
        listings.map(p => `${p.city || ''}::${p.propertyType || ''}`)
      )];

      const benchmarkAgg = await Property.aggregate([
        {
          $match: {
            status:     { $in: ['active', 'pending'] },
            isApproved: true,
            $or: listings.map(p => ({
              city:         p.city         || '',
              propertyType: p.propertyType || '',
            })),
          },
        },
        {
          $group: {
            _id:          { city: '$city', propertyType: '$propertyType' },
            avgViews:     { $avg: '$viewsCount'      },
            avgFavorites: { $avg: '$favoritesCount'   },
            avgInquiries: { $avg: '$inquiryCount'     },
            avgPhoneReveal: { $avg: '$phoneRevealCount' },
            count:        { $sum: 1 },
          },
        },
      ]);

      // Build lookup map: "city::type" → benchmark averages
      const benchmarkMap = {};
      for (const b of benchmarkAgg) {
        const key = `${b._id.city || ''}::${b._id.propertyType || ''}`;
        benchmarkMap[key] = b;
      }

      // 3. Classify each listing's performance
      const MIN_COMPARABLE = 3;

      function benchmarkLabel(value, avg, count) {
        if (!count || count < MIN_COMPARABLE || !avg || avg === 0) return 'average';
        const ratio = value / avg;
        if (ratio > 1.2) return 'above_average';
        if (ratio < 0.8) return 'below_average';
        return 'average';
      }

      const enriched = listings.map(p => {
        const key  = `${p.city || ''}::${p.propertyType || ''}`;
        const bm   = benchmarkMap[key] || {};
        const count = bm.count || 0;

        const identity = p.propertyIdentityId;

        return {
          ...p,
          reputationSummary: identity && typeof identity === 'object'
            ? {
                avgRating:           identity.avgRating            || 0,
                reviewCount:         identity.reviewCount          || 0,
                recommendPercentage: identity.recommendPercentage  || 0,
              }
            : { avgRating: 0, reviewCount: 0, recommendPercentage: 0 },
          benchmark: {
            views:       benchmarkLabel(p.viewsCount     || 0, bm.avgViews,     count),
            favorites:   benchmarkLabel(p.favoritesCount || 0, bm.avgFavorites, count),
            inquiries:   benchmarkLabel(p.inquiryCount   || 0, bm.avgInquiries, count),
            phoneReveal: benchmarkLabel(p.phoneRevealCount || 0, bm.avgPhoneReveal, count),
            comparableCount: count,
          },
        };
      });

      res.json({ listings: enriched });
    } catch (err) {
      console.error('getMyDashboard error:', err);
      res.status(500).json({ message: 'Failed to load dashboard.' });
    }
  };
  ```

- [ ] **Step 3: Add route to `server/routes/propertyRoutes.js`**

  Read the file. Find where `verifyToken` is imported and where protected routes live. Add:

  ```js
  router.get('/my-dashboard', verifyToken, require('../controllers/propertyController').getMyDashboard);
  ```

  Place this route BEFORE any `/:id` routes to avoid path conflicts. The existing `/stats` route is a good reference — add `/my-dashboard` adjacent to it.

- [ ] **Step 4: Syntax check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "require('./controllers/propertyController'); console.log('propertyController OK')"
  ```
  Expected: `propertyController OK`

- [ ] **Step 5: Add API client function to `client/src/services/api.js`**

  Find `export default api;`. Before it, add:

  ```js
  // ── Seller Intelligence Dashboard ─────────────────────────────────────────
  export const getMyDashboard = (token) =>
    api.get('/properties/my-dashboard', { headers: { Authorization: `Bearer ${token}` } });
  ```

- [ ] **Step 6: ESLint api.js**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/services/api.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 7: Commit**

  ```bash
  git add server/controllers/propertyController.js server/routes/propertyRoutes.js client/src/services/api.js
  git commit -m "feat(dashboard): add getMyDashboard endpoint — stats, reputation, benchmark labels per listing"
  ```

---

## Task 2: ListingPerformanceCard Component

**Files:**
- Create: `client/src/components/ListingPerformanceCard.js`
- Create: `client/src/components/ListingPerformanceCard.css`

- [ ] **Step 1: Create `client/src/components/ListingPerformanceCard.js`**

  ```jsx
  import React, { useState } from 'react';
  import { Eye, Heart, Phone, MessageSquare, Shield, Star, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
  import './ListingPerformanceCard.css';

  const TIER_META = {
    SPOTLIGHT: { label: 'Spotlight', color: '#0F766E', bg: '#f0fdf4' },
    PREMIUM:   { label: 'Premium',   color: '#7c3aed', bg: '#f5f3ff' },
    FEATURED:  { label: 'Featured',  color: '#d97706', bg: '#fffbeb' },
    FREE:      { label: 'Free',      color: '#6b7280', bg: '#f9fafb' },
  };

  const BENCHMARK_META = {
    above_average: { label: 'Above Average', color: '#166534', bg: '#f0fdf4' },
    average:       { label: 'Average',        color: '#6b7280', bg: '#f9fafb' },
    below_average: { label: 'Below Average',  color: '#dc2626', bg: '#fef2f2' },
  };

  function StatRow({ icon, label, value, benchmark }) {
    const bm = benchmark ? BENCHMARK_META[benchmark] : null;
    return (
      <div className="lpc-stat-row">
        <span className="lpc-stat-icon">{icon}</span>
        <span className="lpc-stat-label">{label}</span>
        <span className="lpc-stat-value">{value ?? '—'}</span>
        {bm && (
          <span className="lpc-benchmark" style={{ color: bm.color, background: bm.bg }}>
            {bm.label}
          </span>
        )}
      </div>
    );
  }

  const ListingPerformanceCard = ({ listing, localEvents }) => {
    const [expanded, setExpanded] = useState(false);

    const {
      title, city, price, currency,
      viewsCount, favoritesCount, inquiryCount, phoneRevealCount,
      ownershipVerificationStatus,
      reputationSummary,
      promotionTier, isPromoted, promotionStartDate, promotionEndDate,
      benchmark = {},
      _id,
    } = listing;

    // Supplement DB view count with local analytics store
    const localViews = localEvents.filter(
      e => e.event === 'property_viewed' && e.props?.property_id === String(_id)
    ).length;

    const totalViews = (viewsCount || 0) + localViews;

    // Promotion dates and days remaining
    const now      = new Date();
    const endDate  = promotionEndDate ? new Date(promotionEndDate) : null;
    const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : null;
    const tier     = TIER_META[promotionTier] || TIER_META.FREE;
    const isActive = isPromoted && endDate && endDate > now;

    // Trust
    const verified = ownershipVerificationStatus === 'approved';
    const { avgRating = 0, reviewCount = 0, recommendPercentage = 0 } = reputationSummary || {};

    return (
      <div className="lpc-card">
        {/* Header */}
        <div className="lpc-header">
          <div className="lpc-header-info">
            <span className="lpc-title">{title}</span>
            <span className="lpc-location">{city || '—'}</span>
          </div>
          <div className="lpc-header-right">
            <span className="lpc-price">
              {currency || 'AZN'} {price?.toLocaleString() || '—'}
            </span>
            <button
              className="lpc-toggle"
              onClick={() => setExpanded(e => !e)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded
                ? <ChevronUp size={16} aria-hidden="true" />
                : <ChevronDown size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Always-visible summary strip */}
        <div className="lpc-summary-strip">
          <span className="lpc-strip-item">
            <Eye size={13} strokeWidth={2} aria-hidden="true" />
            {totalViews.toLocaleString()} views
          </span>
          <span className="lpc-strip-item">
            <Heart size={13} strokeWidth={2} aria-hidden="true" />
            {(favoritesCount || 0).toLocaleString()} saved
          </span>
          {reviewCount > 0 && (
            <span className="lpc-strip-item">
              <Star size={13} strokeWidth={2} aria-hidden="true" />
              {avgRating.toFixed(1)} ({reviewCount})
            </span>
          )}
          {isActive && (
            <span className="lpc-promo-pill" style={{ color: tier.color, background: tier.bg }}>
              {tier.label}
            </span>
          )}
          {benchmark.views && benchmark.comparableCount >= 3 && (
            <span
              className="lpc-benchmark-pill"
              style={{
                color: BENCHMARK_META[benchmark.views]?.color,
                background: BENCHMARK_META[benchmark.views]?.bg,
              }}
            >
              {BENCHMARK_META[benchmark.views]?.label}
            </span>
          )}
        </div>

        {/* Expanded detail sections */}
        {expanded && (
          <div className="lpc-sections">

            {/* Visibility */}
            <div className="lpc-section">
              <h4 className="lpc-section-title">Visibility</h4>
              <StatRow
                icon={<Eye size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Detail views"
                value={totalViews.toLocaleString()}
                benchmark={benchmark.views}
              />
              <StatRow
                icon={<Eye size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Unique visitors"
                value="—"
              />
              <StatRow
                icon={<Eye size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Map opens"
                value="—"
              />
            </div>

            {/* Engagement */}
            <div className="lpc-section">
              <h4 className="lpc-section-title">Engagement</h4>
              <StatRow
                icon={<Heart size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Favorites"
                value={(favoritesCount || 0).toLocaleString()}
                benchmark={benchmark.favorites}
              />
              <StatRow
                icon={<Phone size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Phone reveals"
                value={(phoneRevealCount || 0).toLocaleString()}
                benchmark={benchmark.phoneReveal}
              />
              <StatRow
                icon={<MessageSquare size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Contact requests"
                value={(inquiryCount || 0).toLocaleString()}
                benchmark={benchmark.inquiries}
              />
            </div>

            {/* Trust */}
            <div className="lpc-section">
              <h4 className="lpc-section-title">Trust</h4>
              <StatRow
                icon={<Shield size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Verified Owner"
                value={verified ? 'Verified' : 'Not verified'}
              />
              <StatRow
                icon={<Star size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Reviews"
                value={reviewCount > 0
                  ? `${avgRating.toFixed(1)} ★ (${reviewCount})`
                  : 'No reviews yet'}
              />
              {reviewCount > 0 && (
                <StatRow
                  icon={<TrendingUp size={14} strokeWidth={1.75} aria-hidden="true" />}
                  label="Recommend rate"
                  value={`${recommendPercentage}%`}
                />
              )}
            </div>

            {/* Promotion */}
            <div className="lpc-section">
              <h4 className="lpc-section-title">Promotion</h4>
              <StatRow
                icon={<TrendingUp size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Current tier"
                value={isActive ? tier.label : 'None'}
              />
              {isActive && endDate && (
                <>
                  <StatRow
                    icon={<Calendar size={14} strokeWidth={1.75} aria-hidden="true" />}
                    label="Started"
                    value={promotionStartDate
                      ? new Date(promotionStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  />
                  <StatRow
                    icon={<Calendar size={14} strokeWidth={1.75} aria-hidden="true" />}
                    label="Expires"
                    value={endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  />
                  <StatRow
                    icon={<Calendar size={14} strokeWidth={1.75} aria-hidden="true" />}
                    label="Days remaining"
                    value={`${daysLeft}d`}
                  />
                </>
              )}
            </div>

            {/* Benchmark note */}
            {benchmark.comparableCount > 0 && (
              <p className="lpc-benchmark-note">
                Benchmarked against {benchmark.comparableCount} similar listing{benchmark.comparableCount !== 1 ? 's' : ''} in {city || 'this area'}.
                {benchmark.comparableCount < 3 && ' (Insufficient data for reliable comparison.)'}
              </p>
            )}

          </div>
        )}
      </div>
    );
  };

  export default ListingPerformanceCard;
  ```

- [ ] **Step 2: Create `client/src/components/ListingPerformanceCard.css`**

  ```css
  .lpc-card {
    background: var(--color-bg-surface, #fff);
    border: 1px solid var(--border-subtle, rgba(15,23,42,0.08));
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.12s;
  }

  .lpc-card:hover {
    border-color: var(--border-default, rgba(15,23,42,0.14));
  }

  /* ── Header ──────────────────────────────────────────────────────────────── */

  .lpc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 18px 12px;
  }

  .lpc-header-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .lpc-title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-graphite-800, #1e293b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lpc-location {
    font-size: 0.8125rem;
    color: var(--gray-400, #94a3b8);
  }

  .lpc-header-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .lpc-price {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    white-space: nowrap;
  }

  .lpc-toggle {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--gray-400, #94a3b8);
    display: flex;
    padding: 4px;
    border-radius: 6px;
  }
  .lpc-toggle:hover { background: var(--gray-50, #f8fafc); }

  /* ── Summary strip ───────────────────────────────────────────────────────── */

  .lpc-summary-strip {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 18px 14px;
    flex-wrap: wrap;
  }

  .lpc-strip-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8125rem;
    color: var(--gray-500, #64748b);
  }

  .lpc-strip-item svg { color: var(--gray-400, #94a3b8); }

  .lpc-promo-pill,
  .lpc-benchmark-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 0.6875rem;
    font-weight: 700;
    white-space: nowrap;
  }

  /* ── Expanded sections ───────────────────────────────────────────────────── */

  .lpc-sections {
    border-top: 1px solid var(--border-subtle, rgba(15,23,42,0.07));
    padding: 16px 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .lpc-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .lpc-section-title {
    font-size: 0.6875rem;
    font-weight: 700;
    color: var(--gray-400, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin: 0 0 4px;
  }

  /* ── Stat row ────────────────────────────────────────────────────────────── */

  .lpc-stat-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lpc-stat-icon {
    color: var(--gray-400, #94a3b8);
    display: flex;
    flex-shrink: 0;
  }

  .lpc-stat-label {
    font-size: 0.8125rem;
    color: var(--gray-500, #64748b);
    flex: 1;
  }

  .lpc-stat-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-graphite-800, #1e293b);
    white-space: nowrap;
  }

  .lpc-benchmark {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 20px;
    font-size: 0.625rem;
    font-weight: 700;
    white-space: nowrap;
  }

  /* ── Benchmark note ──────────────────────────────────────────────────────── */

  .lpc-benchmark-note {
    font-size: 0.75rem;
    color: var(--gray-400, #94a3b8);
    margin: 4px 0 0;
    line-height: 1.5;
    padding-top: 8px;
    border-top: 1px solid var(--border-subtle, rgba(15,23,42,0.06));
  }
  ```

- [ ] **Step 3: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/components/ListingPerformanceCard.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/ListingPerformanceCard.js client/src/components/ListingPerformanceCard.css
  git commit -m "feat(dashboard): add ListingPerformanceCard — Visibility, Engagement, Trust, Promotion, Benchmark"
  ```

---

## Task 3: SellerDashboard Component + Analytics Aggregation Layer

**Files:**
- Create: `client/src/components/SellerDashboard.js`
- Create: `client/src/components/SellerDashboard.css`

- [ ] **Step 1: Create `client/src/components/SellerDashboard.js`**

  ```jsx
  import React, { useEffect, useState, useCallback } from 'react';
  import { BarChart2, RefreshCcw } from 'lucide-react';
  import { getMyDashboard } from '../services/api';
  import { getLocalAnalyticsStore } from '../services/analytics';
  import ListingPerformanceCard from './ListingPerformanceCard';
  import './SellerDashboard.css';

  const RELEVANT_EVENTS = new Set([
    'property_viewed',
    'phone_revealed',
    'inquiry_started',
    'listing_opened_from_list',
    'listing_opened_from_map',
  ]);

  /**
   * Read the local analytics store and return only events relevant to
   * this seller's listings. Groups them by property_id for efficient lookup.
   */
  function buildLocalEventIndex(listings) {
    const ids    = new Set(listings.map(p => String(p._id)));
    const events = getLocalAnalyticsStore().filter(
      e => RELEVANT_EVENTS.has(e.event) && ids.has(String(e.props?.property_id))
    );
    // Index by property_id for O(1) lookup in card
    const index = {};
    for (const e of events) {
      const pid = String(e.props?.property_id);
      if (!index[pid]) index[pid] = [];
      index[pid].push(e);
    }
    return index;
  }

  /**
   * Compute summary totals across all listings for the dashboard header.
   */
  function computeSummary(listings) {
    return listings.reduce(
      (acc, p) => ({
        totalViews:    acc.totalViews    + (p.viewsCount     || 0),
        totalFavorites: acc.totalFavorites + (p.favoritesCount || 0),
        totalInquiries: acc.totalInquiries + (p.inquiryCount   || 0),
        totalPhoneReveal: acc.totalPhoneReveal + (p.phoneRevealCount || 0),
      }),
      { totalViews: 0, totalFavorites: 0, totalInquiries: 0, totalPhoneReveal: 0 }
    );
  }

  const SellerDashboard = () => {
    const [listings,   setListings]   = useState([]);
    const [localIdx,   setLocalIdx]   = useState({});
    const [summary,    setSummary]    = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [loadError,  setLoadError]  = useState('');

    const load = useCallback(async () => {
      setLoading(true);
      setLoadError('');
      try {
        const token = localStorage.getItem('token');
        const res   = await getMyDashboard(token);
        const data  = res.data.listings || [];
        setListings(data);
        setLocalIdx(buildLocalEventIndex(data));
        setSummary(computeSummary(data));
      } catch (err) {
        setLoadError('Failed to load dashboard. Please refresh.');
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
      return (
        <div className="sd-loading" aria-busy="true">
          <div className="sd-spinner" aria-hidden="true" />
          <span>Loading your performance data…</span>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="sd-error">
          <p>{loadError}</p>
          <button className="sd-retry" onClick={load}>Retry</button>
        </div>
      );
    }

    if (listings.length === 0) {
      return (
        <div className="sd-empty">
          <BarChart2 size={36} strokeWidth={1.5} aria-hidden="true" />
          <p>No listings yet. Create your first listing to see performance data.</p>
        </div>
      );
    }

    return (
      <div className="sd-container">

        {/* Summary header */}
        {summary && (
          <div className="sd-summary">
            <div className="sd-summary-card">
              <div className="sd-summary-value">{summary.totalViews.toLocaleString()}</div>
              <div className="sd-summary-label">Total views</div>
            </div>
            <div className="sd-summary-card">
              <div className="sd-summary-value">{summary.totalFavorites.toLocaleString()}</div>
              <div className="sd-summary-label">Total saves</div>
            </div>
            <div className="sd-summary-card">
              <div className="sd-summary-value">{summary.totalInquiries.toLocaleString()}</div>
              <div className="sd-summary-label">Contact requests</div>
            </div>
            <div className="sd-summary-card">
              <div className="sd-summary-value">{summary.totalPhoneReveal.toLocaleString()}</div>
              <div className="sd-summary-label">Phone reveals</div>
            </div>
          </div>
        )}

        {/* Analytics store note */}
        <p className="sd-store-note">
          Session-level view events from this browser supplement your totals.
          DB counters update in real time.
        </p>

        {/* Refresh */}
        <div className="sd-toolbar">
          <span className="sd-count">{listings.length} listing{listings.length !== 1 ? 's' : ''}</span>
          <button className="sd-refresh" onClick={load} aria-label="Refresh dashboard">
            <RefreshCcw size={14} strokeWidth={2} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {/* Listing cards */}
        <div className="sd-list">
          {listings.map(listing => (
            <ListingPerformanceCard
              key={listing._id}
              listing={listing}
              localEvents={localIdx[String(listing._id)] || []}
            />
          ))}
        </div>

      </div>
    );
  };

  export default SellerDashboard;
  ```

- [ ] **Step 2: Create `client/src/components/SellerDashboard.css`**

  ```css
  /* ── Loading ─────────────────────────────────────────────────────────────── */

  .sd-loading {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 40px 0;
    color: var(--gray-400, #94a3b8);
    font-size: 0.9rem;
  }

  .sd-spinner {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2.5px solid var(--gray-200, #e5e7eb);
    border-top-color: var(--color-primary, #0F766E);
    animation: sd-spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes sd-spin { to { transform: rotate(360deg); } }

  /* ── Error + Empty ───────────────────────────────────────────────────────── */

  .sd-error,
  .sd-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 48px 0;
    text-align: center;
    color: var(--gray-400, #94a3b8);
  }

  .sd-error p,
  .sd-empty p {
    font-size: 0.9375rem;
    margin: 0;
    max-width: 340px;
  }

  .sd-retry {
    padding: 8px 18px;
    border-radius: 8px;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    background: none;
    font-size: 0.875rem;
    cursor: pointer;
    color: var(--color-graphite-700, #334155);
  }
  .sd-retry:hover { background: var(--gray-50, #f8fafc); }

  /* ── Summary header ──────────────────────────────────────────────────────── */

  .sd-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .sd-summary-card {
    background: var(--color-bg-surface, #fff);
    border: 1px solid var(--border-subtle, rgba(15,23,42,0.08));
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .sd-summary-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .sd-summary-label {
    font-size: 0.75rem;
    color: var(--gray-400, #94a3b8);
  }

  /* ── Store note ──────────────────────────────────────────────────────────── */

  .sd-store-note {
    font-size: 0.75rem;
    color: var(--gray-400, #94a3b8);
    margin: 0 0 16px;
    line-height: 1.5;
  }

  /* ── Toolbar ─────────────────────────────────────────────────────────────── */

  .sd-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .sd-count {
    font-size: 0.8125rem;
    color: var(--gray-500, #64748b);
  }

  .sd-refresh {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 7px;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    background: none;
    font-size: 0.8125rem;
    color: var(--gray-500, #64748b);
    cursor: pointer;
    transition: background 0.12s;
  }
  .sd-refresh:hover { background: var(--gray-50, #f8fafc); }

  /* ── Listing cards ───────────────────────────────────────────────────────── */

  .sd-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ── Responsive ──────────────────────────────────────────────────────────── */

  @media (max-width: 700px) {
    .sd-summary { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 420px) {
    .sd-summary { grid-template-columns: 1fr; }
  }
  ```

- [ ] **Step 3: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/components/SellerDashboard.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/SellerDashboard.js client/src/components/SellerDashboard.css
  git commit -m "feat(dashboard): add SellerDashboard — analytics aggregation, summary header, per-listing performance cards"
  ```

---

## Task 4: AccountListings Integration

**Files:**
- Modify: `client/src/pages/AccountListings.js`

- [ ] **Step 1: Read `client/src/pages/AccountListings.js`** — understand the existing toolbar (filter tabs + "New Listing" button) structure.

- [ ] **Step 2: Add SellerDashboard import**

  After the existing `OwnershipVerificationModal` import, add:

  ```jsx
  import SellerDashboard from '../components/SellerDashboard';
  ```

- [ ] **Step 3: Add `mainTab` state**

  Inside the component, after the existing state declarations, add:

  ```jsx
  const [mainTab, setMainTab] = useState('manage'); // 'manage' | 'performance'
  ```

- [ ] **Step 4: Add the tab switcher**

  Find the existing toolbar (`al-toolbar` div). Before or above it, insert a primary tab row:

  ```jsx
  {/* Primary tab: Manage vs Performance */}
  <div className="al-main-tabs">
    <button
      className={`al-main-tab${mainTab === 'manage' ? ' al-main-tab--active' : ''}`}
      onClick={() => setMainTab('manage')}
    >
      Manage
    </button>
    <button
      className={`al-main-tab${mainTab === 'performance' ? ' al-main-tab--active' : ''}`}
      onClick={() => setMainTab('performance')}
    >
      Performance
    </button>
  </div>
  ```

- [ ] **Step 5: Gate existing content behind `mainTab === 'manage'`**

  Wrap the existing toolbar + seller tip + listings section in `{mainTab === 'manage' && (...)}`.

  The content to wrap starts with the `al-toolbar` div and ends just before the ownership verification modal.

  ```jsx
  {mainTab === 'manage' && (
    <>
      {/* existing: al-toolbar, al-seller-tip, listings/empty, etc. */}
    </>
  )}
  {mainTab === 'performance' && <SellerDashboard />}
  ```

- [ ] **Step 6: Add CSS for the primary tabs to `AccountListings.css`**

  Read `AccountListings.css` to find the end of the file. Append:

  ```css
  /* ── Main tab switcher (Manage / Performance) ────────────────────────────── */

  .al-main-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
  }

  .al-main-tab {
    padding: 8px 18px;
    border-radius: 8px;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    background: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-500, #64748b);
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }

  .al-main-tab--active {
    border-color: var(--color-primary, #0F766E);
    background: #f0fdf9;
    color: var(--color-primary, #0F766E);
    font-weight: 600;
  }

  .al-main-tab:hover:not(.al-main-tab--active) {
    background: var(--gray-50, #f8fafc);
  }
  ```

- [ ] **Step 7: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/AccountListings.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 8: Commit**

  ```bash
  git add client/src/pages/AccountListings.js client/src/pages/AccountListings.css
  git commit -m "feat(dashboard): add Performance tab to My Listings — renders SellerDashboard"
  ```

---

## Task 5: Build Verification + Analytics Verification

- [ ] **Step 1: Server syntax check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "require('./controllers/propertyController'); console.log('propertyController OK')"
  ```
  Expected: `propertyController OK`

- [ ] **Step 2: ESLint sweep — all new/modified client files**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint \
    src/components/ListingPerformanceCard.js \
    src/components/SellerDashboard.js \
    src/pages/AccountListings.js \
    src/services/api.js \
    --max-warnings=0 2>&1 | tail -10
  ```
  Expected: no output.

- [ ] **Step 3: React build — zero errors**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  npm run build 2>&1 | grep -E "^(Compiled|ERROR|Failed)" | head -5
  ```
  Expected: `Compiled successfully.` or `Compiled with warnings.`

- [ ] **Step 4: Analytics data source verification**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  node -e "
    const src = require('fs').readFileSync('src/components/SellerDashboard.js', 'utf8');
    const checks = ['getLocalAnalyticsStore', 'property_viewed', 'phone_revealed', 'inquiry_started', 'buildLocalEventIndex'];
    const missing = checks.filter(c => !src.includes(c));
    if (missing.length) { console.error('MISSING:', missing.join(', ')); process.exit(1); }
    console.log('Analytics aggregation layer OK');
  "
  ```
  Expected: `Analytics aggregation layer OK`

- [ ] **Step 5: Git log and status**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  git log --oneline -6
  git status
  ```

- [ ] **Step 6: Commit (if clean)**

  ```bash
  git add -u
  git commit -m "verify(dashboard): Phase 5.7 build and analytics verification clean" || echo "Nothing to commit"
  ```

---

## Deliverables Summary

### New files (4)
| File | Purpose |
|---|---|
| `client/src/components/ListingPerformanceCard.js` | Per-listing card — 4 sections, benchmark label, expand/collapse |
| `client/src/components/ListingPerformanceCard.css` | Card styles |
| `client/src/components/SellerDashboard.js` | Container — fetches dashboard data, aggregates local analytics store, summary header |
| `client/src/components/SellerDashboard.css` | Dashboard styles |

### Modified files (4)
| File | Change |
|---|---|
| `server/controllers/propertyController.js` | `getMyDashboard` — returns enriched listings with benchmark labels |
| `server/routes/propertyRoutes.js` | `GET /my-dashboard` protected route |
| `client/src/services/api.js` | `getMyDashboard(token)` client function |
| `client/src/pages/AccountListings.js` | "Performance" tab — renders `SellerDashboard` alongside existing "Manage" tab |

### Design decisions
| Decision | Why |
|---|---|
| Map opens = `—` | Not tracked per-listing in DB or analytics store without new instrumentation |
| Session view supplement | Local analytics store events merged with DB `viewsCount` for richer view counts |
| Benchmark threshold: 20% | Standard business intelligence threshold — avoids false positives on minor variance |
| Min 3 comparables | Single-listing city/type groups produce misleading 100% above-average labels |
| Expand/collapse per card | Keeps the list scannable; full stats revealed on demand |
