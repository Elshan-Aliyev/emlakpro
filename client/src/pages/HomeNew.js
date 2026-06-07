import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, X, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
  ShieldCheck, Layers, Flag, Home as HomeIcon, MapPin,
} from 'lucide-react';
import { getProperties, getSavedProperties, getPublicStats } from '../services/api';
import FavoriteButton from '../components/FavoriteButton';
import TrustBadge from '../components/TrustBadge';
import PropertyRatingChip from '../components/PropertyRatingChip';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { parseNLQuery, formatPrice } from '../utils/nlpSearch';
import './HomeNew.css';

// ── Intelligent search suggestions ──────────────────────────────────────────
const SUGGESTIONS = [
  { label: 'Modern 2BR near metro',       keyword: '2 bedroom metro' },
  { label: 'Family apartment in Yasamal', keyword: 'family apartment', city: 'Yasamal' },
  { label: 'Sea-view with parking',       keyword: 'sea view parking' },
  { label: 'New build under 200K',        keyword: 'new build', priceMax: '200000' },
];

// ── AI-powered discovery shortcuts ──────────────────────────────────────────
const DISCOVERY = [
  {
    label: 'Verified homes in Yasamal',
    sub:   'Ownership documents reviewed',
    url:   '/search?listingStatus=for-sale&city=Yasamal',
    accent: 'emerald',
  },
  {
    label: 'Recently reviewed listings',
    sub:   'Added in the last 7 days',
    url:   '/search?listingStatus=for-sale&sort=newest',
    accent: 'default',
  },
  {
    label: 'New projects gaining attention',
    sub:   'Off-plan & under construction',
    url:   '/search?listingStatus=new-project',
    accent: 'blue',
  },
  {
    label: 'Properties under 150K AZN',
    sub:   'Accessible entry points',
    url:   '/search?listingStatus=for-sale&priceMax=150000',
    accent: 'default',
  },
  {
    label: 'Fast-response rentals',
    sub:   'Owners who reply quickly',
    url:   '/search?listingStatus=for-rent',
    accent: 'default',
  },
  {
    label: 'White City & Baku Boulevard',
    sub:   'Premium waterfront locations',
    url:   '/search?listingStatus=for-sale&city=White+City',
    accent: 'gold',
  },
];

const MODES = [
  { id: 'buy',          label: 'Buy',          status: 'for-sale'      },
  { id: 'rent',         label: 'Rent',         status: 'for-rent'      },
  { id: 'new-projects', label: 'New Projects', status: 'new-project'   },
];

const paramsToChips = (params, raw) => {
  const chips = [];
  if (params.bedrooms)     chips.push(`${params.bedrooms}+ bed${params.bedrooms !== 1 ? 's' : ''}`);
  if (params.priceMax)     chips.push(`Max ${formatPrice(params.priceMax)} AZN`);
  if (params.priceMin)     chips.push(`From ${formatPrice(params.priceMin)} AZN`);
  if (params.propertyType) chips.push(params.propertyType.replace('-', ' ').replace(/^\w/, c => c.toUpperCase()));
  if (params.city)         chips.push(params.city);
  if (params.listingStatus && params.listingStatus !== 'for-sale') chips.push(
    params.listingStatus === 'for-rent' ? 'For rent' : 'New project'
  );
  if (/metro/i.test(raw))              chips.push('Near metro');
  if (/\bfamil/i.test(raw))            chips.push('Family-friendly');
  if (/\bfurnish/i.test(raw))          chips.push('Furnished');
  if (/sea[\s-]?view|view[\s-]?sea/i.test(raw)) chips.push('Sea view');
  if (/\bparking\b/i.test(raw))        chips.push('Parking');
  if (/\bquiet\b/i.test(raw))          chips.push('Quiet area');
  if (/\bverif/i.test(raw))            chips.push('Verified only');
  return chips;
};

const Home = () => {
  const { isBuyMode, switchTheme } = useTheme();
  const { user } = useAuth();

  const [searchInput, setSearchInput]     = useState('');
  const [activeMode, setActiveMode]       = useState(isBuyMode ? 'buy' : 'rent');
  const [properties, setProperties]       = useState([]);
  const [savedPropertyIds, setSaved]      = useState(new Set());
  const [imageIndices, setImageIndices]   = useState({});
  const [stats, setStats]                 = useState(null);
  const [nlChips,       setNlChips]       = useState([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [moreFilters,   setMoreFilters]   = useState({ region: '', bedrooms: '', priceMin: '', priceMax: '', propertyType: '', verified: false });
  const navigate = useNavigate();

  const heroRef = useRef(null);
  const meshRef = useRef(null); // canvas — dot field with displacement physics
  const lensRef = useRef(null); // contrast support layer
  const rafRef  = useRef(null);

  useEffect(() => {
    getProperties({ limit: 8 })
      .then(res => setProperties(res.data.properties || []))
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

  // Keep activeMode in sync if isBuyMode changes externally (e.g. navbar click)
  useEffect(() => {
    if (activeMode !== 'new-projects') {
      setActiveMode(isBuyMode ? 'buy' : 'rent');
    }
  }, [isBuyMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!searchInput.trim()) { setNlChips([]); return; }
    const { params } = parseNLQuery(searchInput);
    setNlChips(paramsToChips(params, searchInput));
  }, [searchInput]);

  // Material mesh deformation — canvas dot field with tension fabric physics
  useEffect(() => {
    const hero   = heroRef.current;
    const canvas = meshRef.current;
    const lens   = lensRef.current;
    if (!hero || !canvas || !lens) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx  = canvas.getContext('2d');
    let logW = 0, logH = 0;

    const resize = () => {
      const r   = canvas.getBoundingClientRect();
      const newW = Math.round(r.width  * dpr);
      const newH = Math.round(r.height * dpr);
      if (canvas.width !== newW || canvas.height !== newH) {
        logW = r.width;
        logH = r.height;
        canvas.width  = newW;
        canvas.height = newH;
        ctx.scale(dpr, dpr);
      }
    };
    resize();

    // Grid config — rem resolved at runtime
    const REM = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const SP1 = (1.45 / 2)   * REM; // primary spacing — halved for field texture
    const SP2 = (2.00 / 1.8) * REM; // secondary spacing
    const R1  = 0.9;                  // primary dot radius  → 1.8px diameter
    const R2  = 0.6;                  // secondary dot radius → 1.2px diameter

    const buildGrid = (spacing, ox = 0, oy = 0) => {
      const dots = [];
      const sx = ((ox % spacing) + spacing) % spacing - spacing;
      const sy = ((oy % spacing) + spacing) % spacing - spacing;
      for (let x = sx; x < logW + spacing; x += spacing)
        for (let y = sy; y < logH + spacing; y += spacing)
          dots.push([x, y]);
      return dots;
    };

    let grid1 = buildGrid(SP1);
    let grid2 = buildGrid(SP2, SP2 * 0.5, SP2 * 0.5); // half-cell offset

    // Tension fabric displacement:
    // 0–110px  → converge TOWARD cursor (cubic falloff, max 6px)
    // 110–220px → diverge AWAY from cursor (cubic falloff, max 1.5px)
    const deflect = (dx, dy) => {
      const d2 = dx * dx + dy * dy;
      if (d2 < 0.25 || d2 > 48400) return null; // 48400 = 220²
      const d  = Math.sqrt(d2);
      const ux = dx / d;
      const uy = dy / d;
      let mag;
      if (d < 110) {
        const t = d / 110;
        mag = -(1 - t) * (1 - t) * (1 - t) * 6; // negative = toward cursor
      } else {
        const t = (d - 110) / 110;
        mag = (1 - t) * (1 - t) * (1 - t) * 1.5;
      }
      return [ux * mag, uy * mag];
    };

    // Cursor influence — position and fade are independent lerps
    const K_in  = 0.24;  // ~180ms approach
    const K_out = 0.072; // ~650ms release
    let KcurInfl = K_in;
    const cur  = { cx: 0, cy: 0, tx: 0, ty: 0 };
    const infl = { c: 0, t: 0 };

    // Lens contrast support
    const Klens = 0.07;
    const lx = { c: 50, t: 50 };
    const ly = { c: 40, t: 40 };

    // Perspective tilt — 35% reduced vs prior session
    const KtiltIn  = 0.05;
    const KtiltOut = 0.025;
    let   Ktilt    = KtiltIn;
    const MAX_TX   = 0.36; // ±0.36° — sub-perceptual, reads as depth
    const MAX_TY   = 0.49; // ±0.49°
    const tiltX = { c: 0, t: 0 };
    const tiltY = { c: 0, t: 0 };

    const draw = () => {
      const t      = Date.now() * 0.001;
      const driftX = Math.sin(t * 0.0872) * 2; // ~72s Lissajous drift, max 2px
      const driftY = Math.cos(t * 0.1143) * 3; // ~55s period, max 3px
      const iw     = infl.c; // influence weight 0→1
      const curX   = cur.cx;
      const curY   = cur.cy;

      ctx.clearRect(0, 0, logW, logH);

      // Secondary layer — smaller, lighter, slow ambient drift
      ctx.beginPath();
      for (const [bx, by] of grid2) {
        const ax = bx + driftX;
        const ay = by + driftY;
        let px = ax, py = ay;
        if (iw > 0.002) {
          const d = deflect(ax - curX, ay - curY);
          if (d) { px += d[0] * iw; py += d[1] * iw; }
        }
        ctx.moveTo(px + R2, py);
        ctx.arc(px, py, R2, 0, Math.PI * 2);
      }
      ctx.fillStyle = 'rgba(15,23,42,0.11)';
      ctx.fill();

      // Primary layer — larger, denser, deformation is most visible here
      ctx.beginPath();
      for (const [bx, by] of grid1) {
        let px = bx, py = by;
        if (iw > 0.002) {
          const d = deflect(bx - curX, by - curY);
          if (d) { px += d[0] * iw; py += d[1] * iw; }
        }
        ctx.moveTo(px + R1, py);
        ctx.arc(px, py, R1, 0, Math.PI * 2);
      }
      ctx.fillStyle = 'rgba(15,23,42,0.20)';
      ctx.fill();
    };

    const tick = () => {
      // Cursor position lerp (always K_in — position tracks quickly)
      cur.cx += (cur.tx - cur.cx) * K_in;
      cur.cy += (cur.ty - cur.cy) * K_in;
      // Influence fade lerp (K_in on approach, K_out on release)
      infl.c += (infl.t - infl.c) * KcurInfl;

      // Lens contrast
      lx.c += (lx.t - lx.c) * Klens;
      ly.c += (ly.t - ly.c) * Klens;
      lens.style.setProperty('--lx', `${lx.c.toFixed(2)}%`);
      lens.style.setProperty('--ly', `${ly.c.toFixed(2)}%`);

      // Perspective tilt applied to canvas element
      tiltX.c += (tiltX.t - tiltX.c) * Ktilt;
      tiltY.c += (tiltY.t - tiltY.c) * Ktilt;
      canvas.style.transform =
        `perspective(1200px) rotateX(${tiltX.c.toFixed(4)}deg) rotateY(${tiltY.c.toFixed(4)}deg)`;

      draw();
      rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      const canvasRect = canvas.getBoundingClientRect();
      cur.tx = e.clientX - canvasRect.left;
      cur.ty = e.clientY - canvasRect.top;
      infl.t   = 1;
      KcurInfl = K_in;

      const heroRect = hero.getBoundingClientRect();
      const nx = ((e.clientX - heroRect.left) / heroRect.width)  * 2 - 1;
      const ny = ((e.clientY - heroRect.top)  / heroRect.height) * 2 - 1;
      lx.t = ((e.clientX - heroRect.left) / heroRect.width)  * 100;
      ly.t = ((e.clientY - heroRect.top)  / heroRect.height) * 100;
      tiltX.t = -ny * MAX_TX;
      tiltY.t =  nx * MAX_TY;
      Ktilt = KtiltIn;
    };

    const onLeave = () => {
      // Freeze cursor position — no sweep as cursor lerps off-screen
      cur.tx = cur.cx;
      cur.ty = cur.cy;
      infl.t   = 0;
      KcurInfl = K_out; // viscous fade
      tiltX.t  = 0;
      tiltY.t  = 0;
      Ktilt    = KtiltOut;
      lx.t     = 50;
      ly.t     = 40;
    };

    const handleResize = () => {
      resize();
      grid1 = buildGrid(SP1);
      grid2 = buildGrid(SP2, SP2 * 0.5, SP2 * 0.5);
      draw();
    };

    const isTouch        = window.matchMedia('(hover: none)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    draw(); // initial static render (canvas may not yet have final dimensions)

    if (!isTouch && !isReducedMotion) {
      rafRef.current = requestAnimationFrame(tick);
      hero.addEventListener('mousemove', onMove);
      hero.addEventListener('mouseleave', onLeave);
    }

    // ResizeObserver fires on any layout-driven size change, including the
    // post-font-load reflow that window.resize never catches. It also fires
    // once immediately after first observation, giving layout time to settle
    // before we lock in the canvas resolution and grid coordinates.
    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, []);

  const getImageUrl = (imageData, size = 'thumbnail') => {
    if (!imageData) return null;
    if (typeof imageData === 'string') return imageData;
    return imageData[size] || imageData.thumbnail || imageData.medium || null;
  };

  const handlePrevImage = (e, id, len) => {
    e.preventDefault(); e.stopPropagation();
    setImageIndices(p => ({ ...p, [id]: p[id] > 0 ? p[id] - 1 : len - 1 }));
  };

  const handleNextImage = (e, id, len) => {
    e.preventDefault(); e.stopPropagation();
    setImageIndices(p => ({ ...p, [id]: ((p[id] || 0) + 1) % len }));
  };

  const handleFavoriteToggle = (id, isFav) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (isFav) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleModeChange = (modeId) => {
    setActiveMode(modeId);
    if (modeId === 'buy')  switchTheme('buy');
    if (modeId === 'rent') switchTheme('rent');
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const mode = MODES.find(m => m.id === activeMode);
    const params = new URLSearchParams();
    params.set('listingStatus', mode.status);
    if (searchInput.trim()) {
      const { params: nlParams, remainingKeyword } = parseNLQuery(searchInput.trim());
      Object.entries(nlParams).forEach(([k, v]) => {
        if (v != null && String(v) !== '' && k !== 'listingStatus') params.set(k, String(v));
      });
      if (remainingKeyword) params.set('keyword', remainingKeyword);
    }
    // More filters tray params
    if (moreFilters.region)       params.set('city', moreFilters.region);
    if (moreFilters.bedrooms)     params.set('bedrooms', moreFilters.bedrooms);
    if (moreFilters.priceMin)     params.set('priceMin', moreFilters.priceMin);
    if (moreFilters.priceMax)     params.set('priceMax', moreFilters.priceMax);
    if (moreFilters.propertyType) params.set('propertyType', moreFilters.propertyType);
    if (moreFilters.verified)     params.set('verified', 'true');
    navigate(`/search?${params.toString()}`);
  };

  const handleSuggestion = (s) => {
    const mode   = MODES.find(m => m.id === activeMode);
    const params = new URLSearchParams();
    params.set('listingStatus', mode.status);
    if (s.keyword) params.set('keyword', s.keyword);
    if (s.city)    params.set('city',    s.city);
    if (s.priceMax) params.set('priceMax', s.priceMax);
    navigate(`/search?${params.toString()}`);
  };

  const featuredProps = useMemo(() =>
    properties
      .sort((a, b) => new Date(b.createdAt || b.dateAdded) - new Date(a.createdAt || a.dateAdded))
      .slice(0, 8)
      .map((p, i) => ({ ...p, trustLevel: i % 4 })),
    [properties]
  );

  const currentPlaceholder = activeMode === 'new-projects'
    ? 'Location, developer, or project name…'
    : 'Describe what you\'re looking for…';

  return (
    <div className="home-container">

      {/* ═══════════════════════════════════════════════════
          HERO — Layers 1 + 2: Atmosphere + Intelligent Search
          ═══════════════════════════════════════════════════ */}
      <section ref={heroRef} className="hero-section" aria-label="Property search">
        {/* Atmosphere glows — aria-hidden decorative */}
        <div className="hero-atmo" aria-hidden="true">
          <div className="hero-atmo-glow-1" />
          <div className="hero-atmo-glow-2" />
          <div className="hero-atmo-glow-3" />
          <canvas ref={meshRef} className="hero-mesh-canvas" />
          <div ref={lensRef} className="hero-mesh-lens" />
        </div>

        <div className="hero-content">

          {/* AI identity badge */}
          <div className="hero-ai-badge" aria-label="Powered by AI">
            <span className="hero-ai-dot" aria-hidden="true" />
            AI-Powered Discovery
          </div>

          {/* Headline */}
          <h1 className="hero-title">
            Find Your Ideal Home.<br />
            <span className="hero-title-em">Intelligently.</span>
          </h1>
          <p className="hero-subtitle">
            Search Azerbaijan's property market with intelligent assistance.
            Every listing reviewed. Ownership verification available.
          </p>

          {/* ── Search Surface ── */}
          <div className="hero-search-surface">

            {/* Mode tabs */}
            <div className="hero-mode-tabs" role="tablist" aria-label="Property mode">
              {MODES.map(m => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={activeMode === m.id}
                  className={`hero-mode-tab${activeMode === m.id ? ' hero-mode-tab--active' : ''}`}
                  onClick={() => handleModeChange(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Search input row */}
            <form className="hero-search-row" onSubmit={handleSearch} autoComplete="off">
              <div className="hero-search-input-wrap">
                <Search className="hero-search-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
                <input
                  type="text"
                  className="hero-search-input"
                  placeholder={currentPlaceholder}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(e); } }}
                  aria-label="Search for properties"
                  autoComplete="off"
                />
                {searchInput && (
                  <button
                    type="button"
                    className="hero-search-clear"
                    onClick={() => setSearchInput('')}
                    aria-label="Clear search"
                  >
                    <X size={12} strokeWidth={2} aria-hidden="true" />
                  </button>
                )}
              </div>
              <button type="submit" className="hero-search-btn">
                <span className="hero-search-btn-dot" aria-hidden="true" />
                Search
              </button>
            </form>

            {/* AI interpretation chips */}
            {nlChips.length > 0 && (
              <div className="hero-nl-chips" aria-live="polite" aria-label="Search interpretation">
                <span className="hero-nl-label">I understand:</span>
                {nlChips.map((chip, i) => (
                  <span key={i} className="hero-nl-chip">{chip}</span>
                ))}
              </div>
            )}

            {/* Suggestion chips */}
            <div className="hero-suggestions" aria-label="Search suggestions">
              <span className="hero-suggestions-label">Try:</span>
              {SUGGESTIONS.map(s => (
                <button
                  key={s.label}
                  type="button"
                  className="hero-suggestion-chip"
                  onClick={() => handleSuggestion(s)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* More filters toggle */}
            <div className="hero-more-filters-row">
              <button
                className={`hero-more-filters-btn${showMoreFilters ? ' hero-more-filters-btn--open' : ''}`}
                onClick={() => setShowMoreFilters(v => !v)}
                type="button"
              >
                <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" />
                {showMoreFilters ? 'Fewer filters' : 'More filters'}
                <ChevronDown
                  className={`hero-mf-chevron${showMoreFilters ? ' hero-mf-chevron--open' : ''}`}
                  size={12} strokeWidth={2.5} aria-hidden="true"
                />
              </button>
            </div>

            {/* Expanding filters tray */}
            {showMoreFilters && (
              <div className="hero-filters-tray">
                <div className="hero-ft-row">
                  {/* Region */}
                  <div className="hero-ft-field">
                    <label className="hero-ft-label">Region</label>
                    <select
                      className="hero-ft-select"
                      value={moreFilters.region}
                      onChange={e => setMoreFilters(f => ({ ...f, region: e.target.value }))}
                    >
                      <option value="">Any region</option>
                      {['Yasamal','Nərimanov','Nəsimi','Xətai','Binəqədi','Sabunçu','Suraxanı','Qaradağ','Səbail','Pirallahı'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bedrooms */}
                  <div className="hero-ft-field">
                    <label className="hero-ft-label">Bedrooms</label>
                    <select
                      className="hero-ft-select"
                      value={moreFilters.bedrooms}
                      onChange={e => setMoreFilters(f => ({ ...f, bedrooms: e.target.value }))}
                    >
                      <option value="">Any</option>
                      {['1','2','3','4','5'].map(n => <option key={n} value={n}>{n}+</option>)}
                    </select>
                  </div>

                  {/* Price min */}
                  <div className="hero-ft-field">
                    <label className="hero-ft-label">Min price (AZN)</label>
                    <input
                      type="number"
                      className="hero-ft-input"
                      placeholder="0"
                      min="0"
                      value={moreFilters.priceMin}
                      onChange={e => setMoreFilters(f => ({ ...f, priceMin: e.target.value }))}
                    />
                  </div>

                  {/* Price max */}
                  <div className="hero-ft-field">
                    <label className="hero-ft-label">Max price (AZN)</label>
                    <input
                      type="number"
                      className="hero-ft-input"
                      placeholder="Any"
                      min="0"
                      value={moreFilters.priceMax}
                      onChange={e => setMoreFilters(f => ({ ...f, priceMax: e.target.value }))}
                    />
                  </div>

                  {/* Property type */}
                  <div className="hero-ft-field">
                    <label className="hero-ft-label">Property type</label>
                    <select
                      className="hero-ft-select"
                      value={moreFilters.propertyType}
                      onChange={e => setMoreFilters(f => ({ ...f, propertyType: e.target.value }))}
                    >
                      <option value="">Any type</option>
                      {[
                        ['apartment','Apartment'],['house','House'],['villa','Villa'],
                        ['studio','Studio'],['penthouse','Penthouse'],['office','Office'],['land','Land'],
                      ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="hero-ft-toggles">
                  <label className="hero-ft-toggle">
                    <input
                      type="checkbox"
                      checked={moreFilters.verified}
                      onChange={e => setMoreFilters(f => ({ ...f, verified: e.target.checked }))}
                    />
                    <span>Verified ownership only</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Stats row */}
          {stats && (stats.totalListings > 0 || stats.verifiedOwners > 0) && (
            <div className="hero-stats">
              {stats.totalListings > 0 && (
                <div className="hero-stat">
                  <span className="hero-stat-value">{stats.totalListings.toLocaleString()}</span>
                  <span className="hero-stat-label">active listings</span>
                </div>
              )}
              {stats.totalListings > 0 && stats.verifiedOwners > 0 && <div className="hero-stat-sep" />}
              {stats.verifiedOwners > 0 && (
                <div className="hero-stat">
                  <span className="hero-stat-value">{stats.verifiedOwners.toLocaleString()}</span>
                  <span className="hero-stat-label">verified owners</span>
                </div>
              )}
              <div className="hero-stat-sep" />
              <div className="hero-stat">
                <Link to="/trust" className="hero-stat-trust-link">
                  How trust works →
                </Link>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          LAYER 3 — Market Discovery
          ═══════════════════════════════════════════════════ */}
      <section className="hero-discovery" aria-label="Intelligent discovery">
        <div className="hero-discovery-inner">
          <div className="hero-discovery-head">
            <span className="hero-discovery-eyebrow">
              <span className="hero-discovery-dot" aria-hidden="true" />
              Explore intelligently
            </span>
            <p className="hero-discovery-sub">Curated starting points based on what matters in this market</p>
          </div>
          <div className="hero-discovery-grid">
            {DISCOVERY.map(chip => (
              <button
                key={chip.label}
                className={`hero-disc-card hero-disc-card--${chip.accent}`}
                onClick={() => navigate(chip.url)}
              >
                <span className="hero-disc-label">{chip.label}</span>
                <span className="hero-disc-sub">{chip.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TRUST PILLARS
          ═══════════════════════════════════════════════════ */}
      <section className="trust-pillars" aria-label="Platform trust">
        <div className="trust-pillars-inner">
          <h2 className="trust-pillars-headline">How We Keep This Marketplace Safe</h2>
          <div className="trust-pillars-grid">

            <div className="trust-pillar">
              <div className="trust-pillar-icon" aria-hidden="true">
                <ShieldCheck size={20} strokeWidth={1.5} />
              </div>
              <h3>Verified Owners</h3>
              <p>Identity and ownership verified before trusted badges are granted.</p>
            </div>

            <div className="trust-pillar">
              <div className="trust-pillar-icon" aria-hidden="true">
                <Layers size={20} strokeWidth={1.5} />
              </div>
              <h3>Duplicate Detection</h3>
              <p>Suspicious duplicates are automatically flagged and queued for review.</p>
            </div>

            <div className="trust-pillar">
              <div className="trust-pillar-icon" aria-hidden="true">
                <Flag size={20} strokeWidth={1.5} />
              </div>
              <h3>Report &amp; Review</h3>
              <p>Any user can report. Reports are confidential and reviewed by our team.</p>
            </div>

          </div>
          <div className="trust-pillars-footer">
            <Link to="/trust" className="trust-pillars-learn-more">
              Read how our marketplace governance works →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURED PROPERTIES
          ═══════════════════════════════════════════════════ */}
      <div className="content-container">
        <h2>Recently Added</h2>
        <div className="properties-grid">
          {featuredProps.map((p) => {
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
                    {typeof p.location === 'string' ? p.location : (typeof p.city === 'string' ? p.city : p.country || 'Location')}
                  </p>
                  <div className="property-features">
                    {p.bedrooms  > 0 && <span>{p.bedrooms} bed</span>}
                    {p.bathrooms > 0 && <span>{p.bathrooms} bath</span>}
                    {p.builtUpArea   && <span>{p.builtUpArea} m²</span>}
                  </div>
                  {p.reputationSummary?.reviewCount > 0 && (
                    <PropertyRatingChip
                      avgRating={p.reputationSummary.avgRating}
                      reviewCount={p.reputationSummary.reviewCount}
                    />
                  )}
                  <div className="property-card-trust-row">
                    <TrustBadge trustLevel={p.trustLevel} variant="chip" />
                  </div>
                  <TrustBadge trustLevel={p.trustLevel} variant="footer" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Cities */}
        <section className="cities-section">
          <h2>Explore Popular Cities</h2>
          <div className="cities-grid">
            {[
              { name: 'Baku',        lat: 40.4093, lng: 49.8671, zoom: 12 },
              { name: 'Ganja',       lat: 40.6828, lng: 46.3606, zoom: 12 },
              { name: 'Sumqayit',    lat: 40.5888, lng: 49.6323, zoom: 12 },
              { name: 'Mingachevir', lat: 40.7696, lng: 47.0594, zoom: 12 },
              { name: 'Lankaran',    lat: 38.7529, lng: 48.8516, zoom: 12 },
              { name: 'Sheki',       lat: 41.2044, lng: 47.1706, zoom: 12 },
            ].map(c => (
              <Link
                to={`/search?city=${encodeURIComponent(c.name)}&lat=${c.lat}&lng=${c.lng}&zoom=${c.zoom}`}
                key={c.name}
                className="city-card"
              >
                <div className="city-card-image" aria-hidden="true">
                  <MapPin size={20} strokeWidth={1.75} />
                </div>
                <h3>{c.name}</h3>
                <p>View properties</p>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Explore Our Services</h2>
            <p>Photography, contracts, staging, and more — all in one place</p>
            <Link to="/services" className="cta-btn">Explore Services</Link>
          </div>
        </section>

        {!user && (
          <section className="user-banner signup-banner">
            <div className="banner-content">
              <h3>Join Our Community</h3>
              <p>Create an account to access exclusive features and personalized recommendations</p>
              <Link to="/signup" className="banner-btn primary">Sign Up Free</Link>
            </div>
          </section>
        )}

        {user && !user.verified && user.role !== 'admin' && user.role !== 'superadmin' && (
          <section className="user-banner verification-banner">
            <div className="banner-content">
              <h3>Get Verified</h3>
              <p>Verify your account to unlock premium features and build trust with other users</p>
              <Link to="/account/verification" className="banner-btn secondary">Get Verified</Link>
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default Home;
