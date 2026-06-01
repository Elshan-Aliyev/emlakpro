# Phase 5.3 — Homepage Revenue Surfaces & Promotion Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the Phase 5.2 promotion architecture on the homepage and in all listing surfaces — spotlight carousel, featured slider, new listings slider, and promotion badges throughout cards, search, drawer, detail, and map popups.

**Architecture:** A new public `GET /api/home/sections` backend endpoint calls all four Phase 5.2 placement selectors in parallel and returns structured JSON. HomeNew.js replaces its single organic feed with four priority-ordered sections (Spotlight → Featured → New → Recent). Each section has a minimum inventory threshold; sections below threshold are hidden entirely. PromotionBadge (already built) is placed as a top-left image overlay on all listing surfaces. Analytics section-view events only fire for sections that actually render.

**Tech Stack:** React 18, Node.js/Express/Mongoose, Lucide icons, existing `track()` analytics wrapper, CSS custom properties from globals.css.

---

## Revision Notes

| Revision | Change |
|----------|--------|
| Section thresholds | Spotlight ≥3, Featured ≥3, New Listings ≥4; sections below threshold hidden entirely |
| Badge placement | Top-left image overlay — NOT inside metadata or price blocks |
| Spotlight card treatment | Amber border (1px) + elevated shadow + stronger hover depth; Spotlight only |
| MAX_SPOTLIGHT | Enforced at backend (5); carousel never exceeds it |
| No autoplay | Explicit; carousel is user-controlled only |
| Drawer | PropertyPreviewDrawer identified — badge overlay added in Task 9 |
| Analytics | Only fires when section renders (threshold met); observer tied to conditional section refs |

---

## File Map

### New files
| File | Responsibility |
|------|----------------|
| `server/routes/homeRoutes.js` | `GET /sections` — calls 4 placement selectors in parallel |

### Modified files
| File | Change |
|------|--------|
| `server/server.js` | Register `homeRoutes` at `/api/home` |
| `client/src/services/api.js` | Add `getHomeSections()` |
| `client/src/pages/HomeNew.js` | 4-section layout with thresholds, carousel, sliders, image-overlay badges, analytics |
| `client/src/pages/HomeNew.css` | Section/carousel/slider/overlay/spotlight treatment CSS |
| `client/src/pages/Search/index.js` | PromotionBadge as image overlay in `renderCard` |
| `client/src/pages/Search/Search.css` | `.lc-promo-overlay` styles |
| `client/src/components/PropertyPreviewDrawer.js` | PromotionBadge as image overlay in drawer gallery |
| `client/src/components/PropertyPreviewDrawer.css` | `.ppd-promo-overlay` styles |
| `client/src/pages/PropertyDetail.js` | PromotionBadge after trust strip |
| `client/src/pages/PropertyDetail.css` | `.pd-promo-badge-row` |
| `client/src/components/PropertyMap.js` | `getPromotionBadgeHTML()` helper + inject into popup HTML |
| `client/src/components/PropertyMap.css` | Price-row flex wrappers for popups |
| `client/src/services/analytics.js` | Add 3 section-view events to `TRACKED_FOR_STORE` |

---

## Task 1: Backend — Home Sections Endpoint

**Files:**
- Create: `server/routes/homeRoutes.js`
- Modify: `server/server.js`

- [ ] **Step 1: Create `server/routes/homeRoutes.js`**

  ```js
  'use strict';

  const express = require('express');
  const router  = express.Router();
  const {
    getSpotlightListings,
    getFeaturedListings,
    getNewListings,
    getRecentListings,
  } = require('../lib/promotion/homepagePlacement');

  /**
   * GET /api/home/sections
   * Public — no auth required.
   * Returns all four homepage sections fetched in parallel.
   * Clients apply their own minimum-count thresholds before rendering.
   */
  router.get('/sections', async (req, res) => {
    try {
      const [spotlight, featured, newListings, recent] = await Promise.all([
        getSpotlightListings(),
        getFeaturedListings(),
        getNewListings({ limit: 12 }),
        getRecentListings({ limit: 8 }),
      ]);

      res.json({ spotlight, featured, newListings, recent });
    } catch (err) {
      console.error('[homeRoutes] /sections error:', err);
      res.status(500).json({ message: 'Failed to load homepage sections' });
    }
  });

  module.exports = router;
  ```

- [ ] **Step 2: Register the route in `server/server.js`**

  After the last `const ... = require('./routes/...')` line (the existing `listingHealthRoutes` require, around line 22), add:

  ```js
  const homeRoutes = require('./routes/homeRoutes');
  ```

  Then after `app.use('/api/articles', readLimiter, articleRoutes)` (around line 65), add:

  ```js
  app.use('/api/home', readLimiter, homeRoutes);
  ```

- [ ] **Step 3: Verify the route loads**

  ```bash
  node -e "require('./server/routes/homeRoutes'); console.log('homeRoutes OK')"
  ```
  Expected: `homeRoutes OK`

- [ ] **Step 4: Commit**

  ```bash
  git add server/routes/homeRoutes.js server/server.js
  git commit -m "feat: add GET /api/home/sections endpoint (spotlight, featured, new, recent)"
  ```

---

## Task 2: API Client — getHomeSections

**Files:**
- Modify: `client/src/services/api.js`

- [ ] **Step 1: Add the function after `getPublicStats`**

  In `client/src/services/api.js`, after the `getPublicStats` line (around line 110), add:

  ```js
  export const getHomeSections = () => api.get('/home/sections');
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add client/src/services/api.js
  git commit -m "feat: add getHomeSections API client function"
  ```

---

## Task 3: HomeNew.js — State & Data Restructure

**Files:**
- Modify: `client/src/pages/HomeNew.js`

- [ ] **Step 1: Update the import block (lines 1–13)**

  Replace entirely with:

  ```js
  import React, { useEffect, useMemo, useRef, useState } from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import {
    Search, X, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
    ShieldCheck, Layers, Flag, Home as HomeIcon, MapPin, Star, Flame, Zap,
  } from 'lucide-react';
  import { getHomeSections, getSavedProperties, getPublicStats } from '../services/api';
  import FavoriteButton from '../components/FavoriteButton';
  import PromotionBadge from '../components/PromotionBadge';
  import TrustBadge from '../components/TrustBadge';
  import { useTheme } from '../context/ThemeContext';
  import { useAuth } from '../context/AuthContext';
  import { parseNLQuery, formatPrice } from '../utils/nlpSearch';
  import { track } from '../services/analytics';
  import './HomeNew.css';
  ```

- [ ] **Step 2: Replace the `properties` state block inside the `Home` component**

  Find these state declarations (around line 93–101) and replace:

  ```js
  // REMOVE:
  const [properties, setProperties]       = useState([]);
  const [savedPropertyIds, setSaved]      = useState(new Set());
  const [imageIndices, setImageIndices]   = useState({});
  const [stats, setStats]                 = useState(null);
  ```

  With:

  ```js
  const [sections, setSections]           = useState({ spotlight: [], featured: [], newListings: [], recent: [] });
  const [savedPropertyIds, setSaved]      = useState(new Set());
  const [imageIndices, setImageIndices]   = useState({});
  const [stats, setStats]                 = useState(null);
  const [spotlightIdx, setSpotlightIdx]   = useState(0);
  ```

- [ ] **Step 3: Replace the data-fetching useEffect**

  Find the useEffect that calls `getProperties({ limit: 8 })` (around line 109–124). Replace it with:

  ```js
  useEffect(() => {
    getHomeSections()
      .then(res => {
        const data = res.data || {};
        setSections({
          spotlight:   data.spotlight    || [],
          featured:    data.featured     || [],
          newListings: data.newListings  || [],
          recent:      data.recent       || [],
        });
      })
      .catch(() => {});

    getPublicStats()
      .then(res => setStats(res.data))
      .catch(() => {});

    const token = localStorage.getItem('token');
    if (token) {
      getSavedProperties(token)
        .then(res => setSaved(new Set(res.data.map(p => p._id))))
        .catch(() => {});
    }
  }, []);
  ```

- [ ] **Step 4: Remove the `featuredProps` useMemo**

  Find and delete the entire useMemo block:

  ```js
  const featuredProps = useMemo(() =>
    properties
      .sort((a, b) => new Date(b.createdAt || b.dateAdded) - new Date(a.createdAt || a.dateAdded))
      .slice(0, 8)
  ```

- [ ] **Step 5: Add spotlight navigation handlers and section refs**

  After the existing `handleFavoriteToggle` function, add:

  ```js
  const spotlightNext = () =>
    setSpotlightIdx(i => Math.min(i + 1, sections.spotlight.length - 1));
  const spotlightPrev = () =>
    setSpotlightIdx(i => Math.max(i - 1, 0));
  ```

  Near the existing refs (`heroRef`, `meshRef`, `lensRef`, `rafRef`), add:

  ```js
  const spotlightRef   = useRef(null);
  const featuredRef    = useRef(null);
  const newListingsRef = useRef(null);
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/pages/HomeNew.js
  git commit -m "refactor: replace HomeNew single feed with four-section state (spotlight, featured, new, recent)"
  ```

---

## Task 4: HomeNew.js — Spotlight Carousel Section

**Files:**
- Modify: `client/src/pages/HomeNew.js`

**Threshold:** Spotlight section renders only when `sections.spotlight.length >= 3`.

Remove the entire old "Recently Added" section block (the `<div className="content-container">` that contains `{featuredProps.map(...)}`) — but preserve everything from `{/* Cities */}` onwards.

Replace it with the four new sections. This task adds Spotlight only; Tasks 5–6 add the rest.

- [ ] **Step 1: Delete the old single-section block**

  Delete the block starting with:
  ```jsx
  {/* ═══════════════════════════════════════════════════
      FEATURED PROPERTIES
  ```
  Through the closing `</div>` of the `content-container` that holds `featuredProps.map`. Stop before `{/* Cities */}`.

- [ ] **Step 2: Insert the Spotlight section (before `{/* Cities */}`)**

  ```jsx
  {/* ═══════════════════════════════════════════════════
      SPOTLIGHT — Premium hero listings
      Renders only when count >= 3 to avoid thin inventory.
      ═══════════════════════════════════════════════════ */}
  {sections.spotlight.length >= 3 && (
    <section className="hn-section hn-section--spotlight" ref={spotlightRef}>
      <div className="content-container">
        <div className="hn-section-head">
          <span className="hn-section-eyebrow hn-section-eyebrow--amber">
            <Flame size={13} strokeWidth={2} aria-hidden="true" />
            Spotlight
          </span>
          <h2>Premium Listings</h2>
        </div>

        <div className="hn-spotlight-wrap">
          <button
            className="hn-carousel-btn"
            onClick={spotlightPrev}
            disabled={spotlightIdx === 0}
            aria-label="Previous spotlight listing"
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
          </button>

          {(() => {
            const p      = sections.spotlight[spotlightIdx];
            const idx    = imageIndices[p._id] || 0;
            const images = p.images || [];
            const hasImg = images.length > 0;
            const imgUrl = hasImg ? getImageUrl(images[idx], 'medium') : null;
            return (
              <div
                key={p._id}
                className="property-card property-card--spotlight"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/properties/${p._id}`)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/properties/${p._id}`); }}
              >
                <div className="property-card-image">
                  {imgUrl
                    ? <img src={imgUrl} alt={p.title} />
                    : <div className="property-placeholder" aria-hidden="true"><HomeIcon size={32} strokeWidth={1.25} /></div>
                  }
                  {hasImg && images.length > 1 && (
                    <>
                      <button className="image-nav-btn image-nav-prev" onClick={e => handlePrevImage(e, p._id, images.length)} aria-label="Previous"><ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /></button>
                      <button className="image-nav-btn image-nav-next" onClick={e => handleNextImage(e, p._id, images.length)} aria-label="Next"><ChevronRight size={16} strokeWidth={2} aria-hidden="true" /></button>
                      <div className="image-indicator">{idx + 1}/{images.length}</div>
                    </>
                  )}
                  {/* Promotion badge — top-left image overlay */}
                  {p.isPromoted && p.promotionTier && p.promotionTier !== 'FREE' && (
                    <div className="property-card-promo-overlay">
                      <PromotionBadge tier={p.promotionTier} />
                    </div>
                  )}
                  <div className="property-card-favorite">
                    <FavoriteButton
                      propertyId={p._id}
                      isFavorite={savedPropertyIds.has(p._id)}
                      onToggle={handleFavoriteToggle}
                    />
                  </div>
                </div>
                <div className="property-card-content">
                  <div className="property-price">
                    {p.currency || 'AZN'} {p.price?.toLocaleString() || 'N/A'}
                  </div>
                  <h3 className="property-title">{p.title}</h3>
                  <p className="property-location">
                    {typeof p.location === 'string' ? p.location : (typeof p.city === 'string' ? p.city : 'Location')}
                  </p>
                  <div className="property-features">
                    {p.bedrooms  > 0 && <span>{p.bedrooms} bed</span>}
                    {p.bathrooms > 0 && <span>{p.bathrooms} bath</span>}
                    {p.builtUpArea   && <span>{p.builtUpArea} m²</span>}
                  </div>
                  <div className="property-card-trust-row">
                    <TrustBadge trustLevel={p.trustLevel} variant="chip" />
                  </div>
                </div>
              </div>
            );
          })()}

          <button
            className="hn-carousel-btn"
            onClick={spotlightNext}
            disabled={spotlightIdx === sections.spotlight.length - 1}
            aria-label="Next spotlight listing"
          >
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Dot navigation — no autoplay, user-controlled only */}
        {sections.spotlight.length > 1 && (
          <div className="hn-spotlight-dots" role="tablist" aria-label="Spotlight navigation">
            {sections.spotlight.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === spotlightIdx}
                className={`hn-dot${i === spotlightIdx ? ' hn-dot--active' : ''}`}
                onClick={() => setSpotlightIdx(i)}
                aria-label={`Spotlight listing ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )}
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/HomeNew.js
  git commit -m "feat: add spotlight carousel to homepage (threshold >=3, no autoplay, image overlay badge)"
  ```

---

## Task 5: HomeNew.js — Featured & New Listings Sections

**Files:**
- Modify: `client/src/pages/HomeNew.js`

**Thresholds:** Featured renders when `>= 3`. New Listings renders when `>= 4`.

- [ ] **Step 1: Insert Featured section (after Spotlight, before Cities)**

  ```jsx
  {/* ═══════════════════════════════════════════════════
      FEATURED — Promoted inventory slider
      Renders only when count >= 3. Distinct from organic.
      ═══════════════════════════════════════════════════ */}
  {sections.featured.length >= 3 && (
    <section className="hn-section hn-section--featured" ref={featuredRef}>
      <div className="content-container">
        <div className="hn-section-head">
          <span className="hn-section-eyebrow">
            <Star size={13} strokeWidth={2} aria-hidden="true" />
            Featured
          </span>
          <h2>Featured Properties</h2>
        </div>
        <div className="hn-slider" aria-label="Featured property listings">
          {sections.featured.map(p => {
            const images = p.images || [];
            const imgUrl = images.length > 0 ? getImageUrl(images[0], 'medium') : null;
            return (
              <div
                key={p._id}
                className="property-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/properties/${p._id}`)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/properties/${p._id}`); }}
              >
                <div className="property-card-image">
                  {imgUrl
                    ? <img src={imgUrl} alt={p.title} />
                    : <div className="property-placeholder" aria-hidden="true"><HomeIcon size={32} strokeWidth={1.25} /></div>
                  }
                  {/* Promotion badge — top-left image overlay */}
                  {p.isPromoted && p.promotionTier && p.promotionTier !== 'FREE' && (
                    <div className="property-card-promo-overlay">
                      <PromotionBadge tier={p.promotionTier} />
                    </div>
                  )}
                  <div className="property-card-favorite">
                    <FavoriteButton propertyId={p._id} isFavorite={savedPropertyIds.has(p._id)} onToggle={handleFavoriteToggle} />
                  </div>
                </div>
                <div className="property-card-content">
                  <div className="property-price">{p.currency || 'AZN'} {p.price?.toLocaleString() || 'N/A'}</div>
                  <h3 className="property-title">{p.title}</h3>
                  <p className="property-location">
                    {typeof p.location === 'string' ? p.location : (typeof p.city === 'string' ? p.city : 'Location')}
                  </p>
                  <div className="property-features">
                    {p.bedrooms  > 0 && <span>{p.bedrooms} bed</span>}
                    {p.bathrooms > 0 && <span>{p.bathrooms} bath</span>}
                    {p.builtUpArea   && <span>{p.builtUpArea} m²</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  )}
  ```

- [ ] **Step 2: Insert New Listings section (after Featured, before Cities)**

  ```jsx
  {/* ═══════════════════════════════════════════════════
      NEW LISTINGS — Organic, published in last 14 days
      Renders only when count >= 4.
      ═══════════════════════════════════════════════════ */}
  {sections.newListings.length >= 4 && (
    <section className="hn-section" ref={newListingsRef}>
      <div className="content-container">
        <div className="hn-section-head">
          <span className="hn-section-eyebrow">
            <Zap size={13} strokeWidth={2} aria-hidden="true" />
            New Listings
          </span>
          <h2>Just Added</h2>
        </div>
        <div className="hn-slider" aria-label="New property listings">
          {sections.newListings.map(p => {
            const images = p.images || [];
            const imgUrl = images.length > 0 ? getImageUrl(images[0], 'medium') : null;
            return (
              <div
                key={p._id}
                className="property-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/properties/${p._id}`)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/properties/${p._id}`); }}
              >
                <div className="property-card-image">
                  {imgUrl
                    ? <img src={imgUrl} alt={p.title} />
                    : <div className="property-placeholder" aria-hidden="true"><HomeIcon size={32} strokeWidth={1.25} /></div>
                  }
                  {/* NEW badge — top-left image overlay (organic, no promo badge) */}
                  <div className="property-card-promo-overlay">
                    <span className="hn-new-badge">NEW</span>
                  </div>
                  <div className="property-card-favorite">
                    <FavoriteButton propertyId={p._id} isFavorite={savedPropertyIds.has(p._id)} onToggle={handleFavoriteToggle} />
                  </div>
                </div>
                <div className="property-card-content">
                  <div className="property-price">{p.currency || 'AZN'} {p.price?.toLocaleString() || 'N/A'}</div>
                  <h3 className="property-title">{p.title}</h3>
                  <p className="property-location">
                    {typeof p.location === 'string' ? p.location : (typeof p.city === 'string' ? p.city : 'Location')}
                  </p>
                  <div className="property-features">
                    {p.bedrooms  > 0 && <span>{p.bedrooms} bed</span>}
                    {p.bathrooms > 0 && <span>{p.bathrooms} bath</span>}
                    {p.builtUpArea   && <span>{p.builtUpArea} m²</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  )}
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/HomeNew.js
  git commit -m "feat: add featured (>=3) and new listings (>=4) slider sections to homepage"
  ```

---

## Task 6: HomeNew.js — Recently Added Section

**Files:**
- Modify: `client/src/pages/HomeNew.js`

**No minimum threshold** for Recently Added — it always renders if there is any data.

- [ ] **Step 1: Insert Recently Added section (after New Listings, before `{/* Cities */}`)**

  ```jsx
  {/* ═══════════════════════════════════════════════════
      RECENTLY ADDED — Organic grid, excludes promoted
      ═══════════════════════════════════════════════════ */}
  {sections.recent.length > 0 && (
    <div className="content-container">
      <h2>Recently Added</h2>
      <div className="properties-grid">
        {sections.recent.map(p => {
          const idx    = imageIndices[p._id] || 0;
          const images = p.images || [];
          const hasImg = images.length > 0;
          const imgUrl = hasImg ? getImageUrl(images[idx], 'medium') : null;
          return (
            <div
              key={p._id}
              className="property-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/properties/${p._id}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/properties/${p._id}`); }}
            >
              <div className="property-card-image">
                {imgUrl
                  ? <img src={imgUrl} alt={p.title} />
                  : <div className="property-placeholder" aria-hidden="true"><HomeIcon size={32} strokeWidth={1.25} /></div>
                }
                {hasImg && images.length > 1 && (
                  <>
                    <button className="image-nav-btn image-nav-prev" onClick={e => handlePrevImage(e, p._id, images.length)} aria-label="Previous"><ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /></button>
                    <button className="image-nav-btn image-nav-next" onClick={e => handleNextImage(e, p._id, images.length)} aria-label="Next"><ChevronRight size={16} strokeWidth={2} aria-hidden="true" /></button>
                    <div className="image-indicator">{idx + 1}/{images.length}</div>
                  </>
                )}
                {p.isPromoted && p.promotionTier && p.promotionTier !== 'FREE' && (
                  <div className="property-card-promo-overlay">
                    <PromotionBadge tier={p.promotionTier} />
                  </div>
                )}
                <div className="property-card-favorite">
                  <FavoriteButton propertyId={p._id} isFavorite={savedPropertyIds.has(p._id)} onToggle={handleFavoriteToggle} />
                </div>
              </div>
              <div className="property-card-content">
                <div className="property-price">{p.currency || 'AZN'} {p.price?.toLocaleString() || 'N/A'}</div>
                <h3 className="property-title">{p.title}</h3>
                <p className="property-location">
                  {typeof p.location === 'string' ? p.location : (typeof p.city === 'string' ? p.city : 'Location')}
                </p>
                <div className="property-features">
                  {p.bedrooms  > 0 && <span>{p.bedrooms} bed</span>}
                  {p.bathrooms > 0 && <span>{p.bathrooms} bath</span>}
                  {p.builtUpArea   && <span>{p.builtUpArea} m²</span>}
                </div>
                <div className="property-card-trust-row">
                  <TrustBadge trustLevel={p.trustLevel} variant="chip" />
                </div>
                <TrustBadge trustLevel={p.trustLevel} variant="footer" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}
  ```

- [ ] **Step 2: Remove any remaining references to `properties` or `featuredProps`**

  Search for `featuredProps` or `properties.` in HomeNew.js and remove any leftover usage.

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/HomeNew.js
  git commit -m "feat: add recently added section with image-overlay promotion badges"
  ```

---

## Task 7: HomeNew.css — Section, Carousel & Slider Styles

**Files:**
- Modify: `client/src/pages/HomeNew.css`

- [ ] **Step 1: Append all new CSS at the end of HomeNew.css**

  ```css
  /* ═══════════════════════════════════════════════════════════════════════════
     HOMEPAGE REVENUE SURFACES — Phase 5.3
     ═══════════════════════════════════════════════════════════════════════════ */

  /* ── Section wrappers ───────────────────────────────────────────────────────── */

  .hn-section {
    padding: var(--space-8) 0;
  }

  /* Featured section gets a subtle tinted background to distinguish from organic */
  .hn-section--featured {
    background: var(--color-primary-subtle, rgba(15, 118, 110, 0.03));
    border-top:    1px solid var(--border-subtle, rgba(15, 23, 42, 0.06));
    border-bottom: 1px solid var(--border-subtle, rgba(15, 23, 42, 0.06));
  }

  .hn-section--spotlight {
    padding-top: var(--space-12);
  }

  /* ── Section header ─────────────────────────────────────────────────────────── */

  .hn-section-head {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    flex-wrap: wrap;
  }

  .hn-section-head h2 { margin-bottom: 0; }

  .hn-section-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 3px 10px;
    border-radius: var(--radius-full, 9999px);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--gray-100, #F1F5F9);
    color: var(--gray-600, #475569);
  }

  .hn-section-eyebrow--amber {
    background: #FEF3C7;
    color: #92400E;
  }

  /* ── Promotion badge — top-left image overlay ───────────────────────────────── */

  .property-card-promo-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 4;
    pointer-events: none; /* badge is display-only, no interaction */
  }

  /* Move favourite button to top-right to give badge the top-left slot */
  .property-card-favorite {
    position: absolute;
    top: 10px;
    right: 10px;  /* was: left: 10px */
    left: auto;
    z-index: 3;
  }

  /* ── Spotlight card treatment ────────────────────────────────────────────────
     Only Spotlight listings. No glow, no animation, no gradient.
     Amber border + deeper shadow = premium, not promotional.                  */

  .property-card--spotlight {
    border: 1px solid rgba(251, 191, 36, 0.35);
    box-shadow:
      0 4px 6px -1px rgba(15, 23, 42, 0.07),
      0 2px 4px -2px  rgba(15, 23, 42, 0.05),
      0 0 0 1px rgba(251, 191, 36, 0.12);
  }

  .property-card--spotlight:hover {
    box-shadow:
      0 20px 28px -6px rgba(15, 23, 42, 0.12),
      0 8px 12px -4px  rgba(15, 23, 42, 0.06),
      0 0 0 1px rgba(251, 191, 36, 0.20);
    transform: translateY(-4px);
  }

  .property-card--spotlight .property-card-image {
    height: 280px;
  }

  /* ── Horizontal slider ─────────────────────────────────────────────────────── */

  .hn-slider {
    display: flex;
    gap: var(--space-4);
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: var(--space-3);
  }

  .hn-slider::-webkit-scrollbar { display: none; }

  .hn-slider > .property-card {
    flex-shrink: 0;
    width: clamp(270px, 38vw, 320px);
    scroll-snap-align: start;
  }

  /* ── Spotlight carousel ─────────────────────────────────────────────────────── */

  .hn-spotlight-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .hn-spotlight-wrap > .property-card {
    flex: 1;
  }

  .hn-carousel-btn {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1.5px solid var(--border-default, rgba(15, 23, 42, 0.10));
    background: var(--color-bg-surface, #fff);
    color: var(--color-graphite-700, #334155);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      background   var(--duration-fast) var(--ease-spring),
      border-color var(--duration-fast) var(--ease-spring),
      color        var(--duration-fast) var(--ease-spring);
  }

  .hn-carousel-btn:hover:not(:disabled) {
    background: var(--color-primary, #0F766E);
    border-color: var(--color-primary, #0F766E);
    color: #fff;
  }

  .hn-carousel-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  /* ── Spotlight dots ────────────────────────────────────────────────────────── */

  .hn-spotlight-dots {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  .hn-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: var(--gray-300, #CBD5E1);
    cursor: pointer;
    padding: 0;
    transition:
      background var(--duration-fast) var(--ease-spring),
      transform  var(--duration-fast) var(--ease-spring);
  }

  .hn-dot--active {
    background: var(--color-primary, #0F766E);
    transform: scale(1.3);
  }

  /* ── NEW badge ─────────────────────────────────────────────────────────────── */

  .hn-new-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: var(--radius-full, 9999px);
    background: var(--color-primary, #0F766E);
    color: #fff;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* ── Mobile ────────────────────────────────────────────────────────────────── */

  @media (max-width: 768px) {
    .hn-slider > .property-card { width: clamp(260px, 78vw, 300px); }
    .property-card--spotlight .property-card-image { height: 220px; }
    .hn-carousel-btn { width: 34px; height: 34px; }
  }
  ```

- [ ] **Step 2: Verify CSS braces are balanced**

  ```bash
  node -e "
  const css = require('fs').readFileSync('client/src/pages/HomeNew.css', 'utf8');
  const opens  = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  if (opens !== closes) throw new Error('Brace mismatch: ' + opens + ' open, ' + closes + ' close');
  console.log('CSS braces balanced:', opens);
  "
  ```
  Expected: `CSS braces balanced: N` (no error)

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/HomeNew.css
  git commit -m "feat: add section, carousel, spotlight treatment, and image overlay badge CSS"
  ```

---

## Task 8: Search Cards — PromotionBadge Image Overlay

**Files:**
- Modify: `client/src/pages/Search/index.js`
- Modify: `client/src/pages/Search/Search.css`

- [ ] **Step 1: Add PromotionBadge import to Search/index.js**

  Find the imports block and add:

  ```js
  import PromotionBadge from '../../components/PromotionBadge';
  ```

- [ ] **Step 2: Add the overlay badge inside `renderCard` — inside `.lc-img`**

  In `renderCard`, find the `.lc-img` image section. Currently it ends with the FavoriteButton. Add the promotion overlay just before the FavoriteButton:

  ```jsx
  {/* Promotion badge — top-left image overlay. Existing Sponsored badge is separate. */}
  {property.isPromoted && property.promotionTier && property.promotionTier !== 'FREE' && (
    <div className="lc-promo-overlay">
      <PromotionBadge tier={property.promotionTier} />
    </div>
  )}
  <FavoriteButton
    propertyId={property._id}
    initialIsFavorite={savedPropertyIds.has(property._id)}
    onToggle={handleFavoriteToggle}
  />
  ```

  The `.lc-promo-overlay` is positioned absolutely in the CSS (see Step 3).

- [ ] **Step 3: Add `.lc-promo-overlay` to Search.css**

  Open `client/src/pages/Search/Search.css`. Find the existing `.lc-img` or `.lc-sponsored` rule. After it, add:

  ```css
  /* Promotion badge — top-left image overlay in search cards */
  .lc-promo-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 4;
    pointer-events: none;
  }
  ```

- [ ] **Step 4: Verify ESLint**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/pages/Search/index.js --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No new errors from this change.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/Search/index.js client/src/pages/Search/Search.css
  git commit -m "feat: add PromotionBadge image overlay to search result cards"
  ```

---

## Task 9: PropertyPreviewDrawer — PromotionBadge Image Overlay

**Files:**
- Modify: `client/src/components/PropertyPreviewDrawer.js`
- Modify: `client/src/components/PropertyPreviewDrawer.css`

The drawer fetches the full property via `getProperty(propertyId)`, so `property.promotionTier` and `property.isPromoted` are available after load. The badge goes in the `ppd-gallery` image area as a top-left overlay (same pattern as cards and search).

- [ ] **Step 1: Add PromotionBadge import**

  In `PropertyPreviewDrawer.js`, find the imports block. Add:

  ```js
  import PromotionBadge from './PromotionBadge';
  ```

- [ ] **Step 2: Add the overlay badge inside the `ppd-gallery` block**

  In the JSX, find the `ppd-gallery` block (around line 137–164). It currently ends with the gallery-count. Add the promotion overlay just before the gallery navigation buttons (so it sits on top of the image):

  ```jsx
  {/* Promotion badge — top-left image overlay */}
  {property.isPromoted && property.promotionTier && property.promotionTier !== 'FREE' && (
    <div className="ppd-promo-overlay">
      <PromotionBadge tier={property.promotionTier} />
    </div>
  )}
  ```

  Place this inside the `<div className="ppd-gallery">` block, after the `<img>` tag but before the navigation buttons.

- [ ] **Step 3: Add `.ppd-promo-overlay` to PropertyPreviewDrawer.css**

  Open `client/src/components/PropertyPreviewDrawer.css`. Find the `.ppd-gallery` rule. After it, add:

  ```css
  /* Promotion badge overlay — top-left of gallery image */
  .ppd-promo-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 4;
    pointer-events: none;
  }
  ```

  **Note:** `.ppd-gallery` must have `position: relative` for the overlay to work. Check if it already does — if not, add `position: relative` to the existing `.ppd-gallery` rule.

- [ ] **Step 4: Verify no duplicate badges**

  The drawer shows: image overlay badge only. The `ppd-price-row` should NOT have a badge — do not add one there. Confirm the `ppd-price-row` block (around line 172–183) is unchanged.

- [ ] **Step 5: Verify ESLint**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/components/PropertyPreviewDrawer.js --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No errors.

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/components/PropertyPreviewDrawer.js client/src/components/PropertyPreviewDrawer.css
  git commit -m "feat: add PromotionBadge image overlay to property preview drawer"
  ```

---

## Task 10: PropertyDetail — PromotionBadge After Trust Strip

**Files:**
- Modify: `client/src/pages/PropertyDetail.js`
- Modify: `client/src/pages/PropertyDetail.css`

The property detail page shows the badge below the trust strip in the `pd-identity` section — not as an image overlay (the detail page image is a full gallery, not a card thumbnail).

- [ ] **Step 1: Add PromotionBadge import**

  ```js
  import PromotionBadge from '../components/PromotionBadge';
  ```

- [ ] **Step 2: Insert badge after trust strip, before AI insight**

  Find the trust strip closing block (around line 437) and the AI insight start (around line 440):

  ```jsx
  {/* trust strip closing */}
  )}

  {/* AI insight bar */}
  {aiInsight && (
  ```

  Insert between them:

  ```jsx
  {/* Promotion badge — below trust strip, above AI insight */}
  {property.isPromoted && property.promotionTier && property.promotionTier !== 'FREE' && (
    <div className="pd-promo-badge-row">
      <PromotionBadge tier={property.promotionTier} size="md" />
    </div>
  )}
  ```

- [ ] **Step 3: Add `.pd-promo-badge-row` to PropertyDetail.css**

  ```css
  .pd-promo-badge-row {
    margin-top: var(--space-3);
  }
  ```

- [ ] **Step 4: Verify ESLint**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/pages/PropertyDetail.js --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No new errors.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/PropertyDetail.js client/src/pages/PropertyDetail.css
  git commit -m "feat: add PromotionBadge to property detail (below trust strip)"
  ```

---

## Task 11: PropertyMap — Badge HTML in Popups

**Files:**
- Modify: `client/src/components/PropertyMap.js`
- Modify: `client/src/components/PropertyMap.css`

Map popups are DOM-based (innerHTML string templates). PromotionBadge is a React component and cannot be used directly. A helper generates equivalent HTML using the same CSS class names.

- [ ] **Step 1: Add `getPromotionBadgeHTML` helper in PropertyMap.js**

  After the `formatMarkerPrice` helper (around line 13), add:

  ```js
  // Generates promotion badge HTML for DOM-based map popups.
  // Uses the same CSS classes as PromotionBadge.css — no icons (DOM context).
  const PROMO_POPUP_CONFIG = {
    FEATURED:  { label: 'Featured',  cls: 'featured'  },
    PREMIUM:   { label: 'Premium',   cls: 'premium'   },
    SPOTLIGHT: { label: 'Spotlight', cls: 'spotlight' },
  };

  const getPromotionBadgeHTML = (tier, isPromoted) => {
    if (!isPromoted || !tier || tier === 'FREE') return '';
    const cfg = PROMO_POPUP_CONFIG[tier];
    if (!cfg) return '';
    return `<span class="promo-badge promo-badge--${cfg.cls}">${cfg.label}</span>`;
  };
  ```

- [ ] **Step 2: Inject badge into `createSinglePropertyPopup`**

  Find the `mp-popup-body` section in `createSinglePropertyPopup`:

  ```js
  <div class="mp-popup-body">
    <div class="mp-popup-price">${property.currency || 'AZN'} ${property.price?.toLocaleString()}</div>
    <div class="mp-popup-title">${property.title || ''}</div>
  ```

  Replace with:

  ```js
  <div class="mp-popup-body">
    <div class="mp-popup-price-row">
      <div class="mp-popup-price">${property.currency || 'AZN'} ${property.price?.toLocaleString()}</div>
      ${getPromotionBadgeHTML(property.promotionTier, property.isPromoted)}
    </div>
    <div class="mp-popup-title">${property.title || ''}</div>
  ```

- [ ] **Step 3: Inject badge into `createMultiPropertyPopup`**

  Inside the `renderList` function, find the `.mp-multi-info` section:

  ```js
  <div class="mp-multi-info">
    <div class="mp-multi-price">${prop.currency || 'AZN'} ${prop.price?.toLocaleString()}</div>
    <div class="mp-multi-title">${prop.title || ''}</div>
  ```

  Replace with:

  ```js
  <div class="mp-multi-info">
    <div class="mp-multi-price-row">
      <div class="mp-multi-price">${prop.currency || 'AZN'} ${prop.price?.toLocaleString()}</div>
      ${getPromotionBadgeHTML(prop.promotionTier, prop.isPromoted)}
    </div>
    <div class="mp-multi-title">${prop.title || ''}</div>
  ```

- [ ] **Step 4: Add popup price-row CSS to PropertyMap.css**

  After the `.mp-popup-price` rule, add:

  ```css
  .mp-popup-price-row,
  .mp-multi-price-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 2px;
  }

  .mp-popup-price-row .mp-popup-price,
  .mp-multi-price-row .mp-multi-price {
    margin-bottom: 0;
  }
  ```

- [ ] **Step 5: Verify ESLint**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/components/PropertyMap.js --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No new errors.

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/components/PropertyMap.js client/src/components/PropertyMap.css
  git commit -m "feat: add promotion badge HTML to map popups (single and multi)"
  ```

---

## Task 12: Analytics — Section View Tracking

**Files:**
- Modify: `client/src/services/analytics.js`
- Modify: `client/src/pages/HomeNew.js`

Analytics events fire ONLY when the section actually renders (threshold met). The IntersectionObserver is attached only to mounted section elements — if a section does not render (threshold not met), its ref is null and the observer skips it.

- [ ] **Step 1: Add 3 section-view events to `TRACKED_FOR_STORE` in analytics.js**

  Find the `TRACKED_FOR_STORE` Set and add after the existing promotion events:

  ```js
  // Homepage section view events (Phase 5.3)
  'spotlight_section_viewed',
  'featured_section_viewed',
  'new_listing_section_viewed',
  ```

- [ ] **Step 2: Add IntersectionObserver tracking in HomeNew.js**

  After all existing `useEffect` blocks, add:

  ```js
  // Section view analytics.
  // Only fires for sections that actually rendered (threshold met).
  // Refs are null for sections below threshold — observer skips them.
  useEffect(() => {
    const fired = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const event = entry.target.dataset.analyticsEvent;
          if (event && !fired.has(event)) {
            fired.add(event);
            track(event, { page: 'home' });
          }
        });
      },
      { threshold: 0.3 },
    );

    [
      { ref: spotlightRef,    event: 'spotlight_section_viewed'    },
      { ref: featuredRef,     event: 'featured_section_viewed'     },
      { ref: newListingsRef,  event: 'new_listing_section_viewed'  },
    ].forEach(({ ref, event }) => {
      if (ref.current) {
        ref.current.dataset.analyticsEvent = event;
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, [
    sections.spotlight.length,
    sections.featured.length,
    sections.newListings.length,
  ]);
  ```

  The dependency array re-attaches the observer once data loads (sections render conditionally on threshold, so refs become non-null on first load).

- [ ] **Step 3: Verify ESLint on both files**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/pages/HomeNew.js src/services/analytics.js --max-warnings=0 2>&1 | Select-Object -First 15
  ```
  Expected: No new errors.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/pages/HomeNew.js client/src/services/analytics.js
  git commit -m "feat: add section view analytics (fires only when threshold sections render)"
  ```

---

## Task 13: Final Build Verification

- [ ] **Step 1: Verify homeRoutes loads**

  ```bash
  node -e "require('./server/routes/homeRoutes'); console.log('homeRoutes OK')"
  ```
  Expected: `homeRoutes OK`

- [ ] **Step 2: Run the React build**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  npm run build 2>&1 | Select-Object -Last 15
  ```
  Expected: `Compiled successfully.` or `Compiled with warnings.` — zero compilation errors.

  If there are errors about undefined variables (`sections`, `spotlightRef`, etc.), fix them before committing.

- [ ] **Step 3: Final commit**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  git status
  git add .
  git commit -m "feat: Phase 5.3 complete — homepage revenue surfaces and promotion visibility"
  ```

---

## Deliverables Summary (Part 10)

### Files Created (1)
| File | Purpose |
|------|---------|
| `server/routes/homeRoutes.js` | `GET /sections` — parallel selector fetch |

### Files Modified (12)
| File | Change |
|------|--------|
| `server/server.js` | Register homeRoutes |
| `client/src/services/api.js` | `getHomeSections()` |
| `client/src/pages/HomeNew.js` | 4 sections with thresholds, carousel, sliders, image overlay badges, analytics |
| `client/src/pages/HomeNew.css` | Sections, carousel, slider, spotlight treatment, overlay, NEW badge |
| `client/src/pages/Search/index.js` | PromotionBadge image overlay in `renderCard` |
| `client/src/pages/Search/Search.css` | `.lc-promo-overlay` |
| `client/src/components/PropertyPreviewDrawer.js` | PromotionBadge image overlay in gallery |
| `client/src/components/PropertyPreviewDrawer.css` | `.ppd-promo-overlay` |
| `client/src/pages/PropertyDetail.js` | PromotionBadge after trust strip |
| `client/src/pages/PropertyDetail.css` | `.pd-promo-badge-row` |
| `client/src/components/PropertyMap.js` | `getPromotionBadgeHTML()` + popup injection |
| `client/src/components/PropertyMap.css` | Price-row flex wrappers |
| `client/src/services/analytics.js` | 3 section-view events |

### Section Architecture
| Order | Section | Minimum | Source | Layout |
|-------|---------|---------|--------|--------|
| 1 | Spotlight | ≥ 3 | `getSpotlightListings()` | Carousel, amber border, one at a time |
| 2 | Featured | ≥ 3 | `getFeaturedListings()` | Horizontal slider, tinted bg |
| 3 | New Listings | ≥ 4 | `getNewListings({ limit: 12 })` | Horizontal slider, NEW badge |
| 4 | Recently Added | ≥ 1 | `getRecentListings({ limit: 8 })` | Responsive grid |

Sections below threshold: not rendered, no empty placeholder, no spacing.

### Badge Integration Summary
| Surface | Method | Placement | Condition |
|---------|--------|-----------|-----------|
| Homepage cards (all 4 sections) | `<PromotionBadge />` | Top-left image overlay (`.property-card-promo-overlay`) | `isPromoted && tier !== 'FREE'` |
| Search cards | `<PromotionBadge />` | Top-left image overlay (`.lc-promo-overlay`) | `isPromoted && tier !== 'FREE'` |
| Property preview drawer | `<PromotionBadge />` | Top-left gallery overlay (`.ppd-promo-overlay`) | `isPromoted && tier !== 'FREE'` |
| Property detail page | `<PromotionBadge size="md" />` | Below trust strip, above AI insight | `isPromoted && tier !== 'FREE'` |
| Map popups | `getPromotionBadgeHTML()` HTML string | Inline with price in popup body | `isPromoted && tier !== 'FREE'` |

No duplicate badges. FREE tier always returns null / empty string.

### Analytics Summary
| Event | Trigger | Guard |
|-------|---------|-------|
| `spotlight_section_viewed` | Section 30% visible | Only fires if section rendered (≥3 listings) |
| `featured_section_viewed` | Section 30% visible | Only fires if section rendered (≥3 listings) |
| `new_listing_section_viewed` | Section 30% visible | Only fires if section rendered (≥4 listings) |

One event per section per page mount, via `IntersectionObserver`. Refs are null for hidden sections; observer skips null refs automatically.

### Build Status
- Zero ESLint errors (pre-existing warnings in `AdminListings.js` / `Search/index.js` are not new)
- `Compiled successfully.` or `Compiled with warnings.` — zero compilation errors
