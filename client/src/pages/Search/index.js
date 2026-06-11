import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { AlertCircle, ZoomIn, Image, Check, Sparkles, Bookmark } from 'lucide-react';
import { getProperties, getSavedProperties } from '../../services/api';
import { geocodeAddress } from '../../services/geocoding';
import PropertyMap from '../../components/PropertyMap';
import PropertyModal from '../../components/PropertyModal';
import PropertyPreviewDrawer from '../../components/PropertyPreviewDrawer';
import FilterBar from '../../components/FilterBar';
import Button from '../../components/Button';
import FavoriteButton from '../../components/FavoriteButton';
import PropertyRatingChip from '../../components/PropertyRatingChip';
import { getAiInsightRich, getPrimaryTrustSignal, getAreaInsight } from '../../utils/propertyAI';
import { track } from '../../services/analytics';
import './Search.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getImageUrl = (image) => {
  if (!image) return null;
  if (typeof image === 'string') return image;
  return image.thumbnail || image.medium || image.large;
};

const getLocation = (property) => {
  if (typeof property.location === 'string') return property.location;
  if (typeof property.city    === 'string') return property.city;
  if (typeof property.address === 'string') return property.address;
  if (property.location?.city) return property.location.city;
  if (property.address?.city)  return property.address.city;
  return 'Location not specified';
};

const isNewThisWeek = (property) => {
  if (!property.createdAt) return false;
  return Date.now() - new Date(property.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
};

const PLURAL = {
  apartment: 'apartments', house: 'houses', villa: 'villas',
  townhouse: 'townhouses', penthouse: 'penthouses', studio: 'studios',
  duplex: 'duplexes', office: 'offices', land: 'plots',
  'commercial-retail': 'commercial spaces',
};

const NEARBY_DISTRICTS = ['Yasamal', 'Nərimanov', 'Nəsimi', 'Xətai', 'Binəqədi', 'Sabunçu'];

// Deterministic per-property image tone — avoids "all from same template" feel across grid
const idHash = (id) => {
  if (!id) return 0;
  let h = 0;
  for (let i = 0; i < Math.min(id.length, 12); i++)
    h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
};

// [rest, hover] filter pairs — very subtle, 40% chance neutral
const IMAGE_TONE_PAIRS = [
  [null, null],
  [null, null],
  ['sepia(0.04) saturate(1.04) brightness(1.01)', 'sepia(0.04) saturate(1.06) brightness(1.025)'],
  ['saturate(0.97) hue-rotate(3deg)',               'saturate(1.04) hue-rotate(3deg) brightness(1.025)'],
  ['saturate(1.05) contrast(1.02)',                  'saturate(1.07) brightness(1.02) contrast(1.03)'],
];

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonCard = ({ index = 0 }) => (
  <div className="lc lc-skeleton" aria-hidden="true" style={{ '--sk-delay': `${Math.min(index, 5) * 80}ms` }}>
    <div className="lc-sk-img" />
    <div className="lc-body">
      <div className="lc-sk lc-sk-price" />
      <div className="lc-sk lc-sk-title" />
      <div className="lc-sk lc-sk-trust" />
      <div className="lc-sk lc-sk-meta"  />
    </div>
  </div>
);

const SKELETON_COUNT = 5;

// ─────────────────────────────────────────────────────────────────────────────

const Search = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  useParams(); // route params reserved for future use

  // ── State ─────────────────────────────────────────────────────────────────
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [savedPropertyIds,   setSavedPropertyIds]   = useState(new Set());
  const [loading,            setLoading]            = useState(true);
  const [loadingMore,        setLoadingMore]        = useState(false);
  const [page,               setPage]               = useState(1);
  const [hasMore,            setHasMore]            = useState(true);
  const [total,              setTotal]              = useState(0);
  const [hoveredPropertyId,  setHoveredPropertyId]  = useState(null);
  const [selectedProperty,   setSelectedProperty]   = useState(null);
  const [drawerPropertyId,   setDrawerPropertyId]   = useState(null);
  const [flyToTarget,        setFlyToTarget]        = useState(null);
  const [mobileSheetOpen,    setMobileSheetOpen]    = useState(false);
  const [fetchError,         setFetchError]         = useState(false);
  const [retryCount,         setRetryCount]         = useState(0);
  const [loadingPhase,       setLoadingPhase]       = useState(0); // 0 = loading, 1 = still loading

  const searchUrlRef        = useRef(null);
  const drawerPropertyIdRef = useRef(null);

  const initialCenter = useRef([
    parseFloat(searchParams.get('lng')) || 49.8671,
    parseFloat(searchParams.get('lat')) || 40.4093,
  ]);
  const initialZoom   = useRef(parseFloat(searchParams.get('zoom')) || 12);
  const isInitialLoad = useRef(true);
  const prevCityRef   = useRef(searchParams.get('city'));
  const areaSearchCancelRef = useRef(false); // eslint-disable-line no-unused-vars

  const viewMode = searchParams.get('view') || 'map';

  const FILTER_KEYS = ['listingStatus', 'city', 'propertyType', 'priceMin', 'priceMax', 'bedrooms', 'bathrooms', 'keyword'];
  const filterSignature = FILTER_KEYS.map(k => searchParams.get(k) || '').join('|');

  const hasActiveFilters = ['city', 'propertyType', 'priceMin', 'priceMax', 'bedrooms', 'bathrooms', 'keyword']
    .some(k => searchParams.get(k));

  // ── Params builder ────────────────────────────────────────────────────────
  const buildParams = useCallback((overrides = {}) => {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      if (['view', 'lng', 'lat', 'zoom'].includes(key)) continue;
      params[key] = value;
    }
    return { ...params, limit: 20, ...overrides };
  }, [searchParams]);

  // Always-current ref so the filter effect never captures a stale closure
  const buildParamsRef = useRef(buildParams);
  buildParamsRef.current = buildParams;

  // ── M-1: Clear stale hover when the hovered property leaves filtered results
  useEffect(() => {
    if (!hoveredPropertyId) return;
    if (!filteredProperties.some(p => p._id === hoveredPropertyId)) {
      setHoveredPropertyId(null);
    }
  }, [filteredProperties, hoveredPropertyId]);

  // ── M-1b: Scroll guard on mount — runs before paint ─────────────────────
  // If no saved position exists this is a fresh entry → top immediately.
  // If a saved position exists the data-load effect (M-2) will restore it.
  useLayoutEffect(() => {
    if (!sessionStorage.getItem('search-scroll')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []); // mount only

  // ── M-2: Restore scroll position after returning from property detail ─────
  useEffect(() => {
    if (loading) return;
    const saved = sessionStorage.getItem('search-scroll');
    if (!saved) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
      sessionStorage.removeItem('search-scroll');
    });
  }, [loading]);

  // ── M-9: Cleanup dangling mapMove timeout on unmount ──────────────────────
  useEffect(() => {
    return () => { clearTimeout(mapMoveTimeoutRef.current); };
  }, []);

  // ── M-10: Progressive loading phase — "Still retrieving…" after 3.5 s ────
  useEffect(() => {
    if (!loading) { setLoadingPhase(0); return; }
    const t = setTimeout(() => setLoadingPhase(1), 3500);
    return () => clearTimeout(t);
  }, [loading]);

  // ── Drawer sync ref ───────────────────────────────────────────────────────
  useEffect(() => { drawerPropertyIdRef.current = drawerPropertyId; }, [drawerPropertyId]);

  // Keep restore URL in sync with filter changes while drawer is open.
  // After setSearchParams(replace:true), window.location reflects the updated /search?... URL.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!drawerPropertyIdRef.current) return;
    if (window.location.pathname.includes('search')) {
      searchUrlRef.current = window.location.pathname + window.location.search;
    }
  }, [searchParams]);

  // ── Drawer: open (desktop only) ───────────────────────────────────────────
  const openDrawer = useCallback((propertyId) => {
    if (!propertyId || window.innerWidth <= 1024) return;
    if (drawerPropertyIdRef.current) {
      // Swapping: replace history entry so one back press always closes
      window.history.replaceState({ ppd: propertyId }, '', `/properties/${propertyId}`);
    } else {
      // First open: push a new entry so back button can close
      searchUrlRef.current = window.location.pathname + window.location.search;
      window.history.pushState({ ppd: propertyId }, '', `/properties/${propertyId}`);
    }
    setDrawerPropertyId(propertyId);
  }, []);

  // ── Drawer: close (explicit — user closes via X / ESC) ────────────────────
  const closeDrawer = useCallback(() => {
    setDrawerPropertyId(null);
    if (searchUrlRef.current) {
      window.history.replaceState(null, '', searchUrlRef.current);
    }
  }, []);

  // ── Popstate: back button closes drawer without double pushState ───────────
  useEffect(() => {
    const handlePopState = () => {
      if (drawerPropertyIdRef.current) {
        setDrawerPropertyId(null);
        // URL already restored by browser — no manual pushState needed
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Fetch saved ───────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    getSavedProperties(token)
      .then(res => setSavedPropertyIds(new Set(res.data.map(p => p._id))))
      .catch(() => {});
  }, []);

  // ── Fetch on filter change ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const currentCity = searchParams.get('city');
      const cityChanged = currentCity !== prevCityRef.current;
      const shouldFly   = isInitialLoad.current || cityChanged;

      try {
        setLoading(true);
        setFetchError(false);
        // Use ref so we always read the latest searchParams, not a stale closure
        const res = await getProperties(buildParamsRef.current({ page: 1 }));
        if (!cancelled) {
          const d = res.data;
          const loaded = d.properties || [];
          setFilteredProperties(loaded);
          setTotal(d.total || 0);
          setPage(1);
          setHasMore((d.totalPages || 1) > 1);

          if (loaded.length === 0 && !isInitialLoad.current) {
            track('search_no_results', {
              city:           searchParams.get('city')          || '',
              district:       searchParams.get('district')      || '',
              property_type:  searchParams.get('propertyType')  || '',
              listing_status: searchParams.get('listingStatus') || '',
              keyword:        searchParams.get('keyword')       || '',
              has_price_range: !!(searchParams.get('priceMin') || searchParams.get('priceMax')),
            });
          }

          if (shouldFly) {
            const withCoords = loaded.filter(
              p => p.coordinates && (p.coordinates.lat || p.coordinates.latitude)
            );
            if (withCoords.length > 0) {
              const lats = withCoords.map(p => p.coordinates.lat || p.coordinates.latitude);
              const lngs = withCoords.map(p => p.coordinates.lng || p.coordinates.longitude);
              setFlyToTarget({
                bounds: [
                  [Math.min(...lngs), Math.min(...lats)],
                  [Math.max(...lngs), Math.max(...lats)],
                ],
                padding: 80,
              });
            } else if (currentCity) {
              geocodeAddress(currentCity).then(result => {
                if (!cancelled && result) {
                  setFlyToTarget({ center: [result.lng, result.lat], zoom: 12 });
                }
              });
            }
          }

          isInitialLoad.current = false;
          prevCityRef.current   = currentCity;
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); areaSearchCancelRef.current = true; };
  }, [filterSignature, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load more ─────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    try {
      setLoadingMore(true);
      const res = await getProperties(buildParams({ page: nextPage }));
      const d = res.data;
      const incoming = d.properties || [];
      setFilteredProperties(prev => {
        const seen = new Set(prev.map(p => p._id));
        return [...prev, ...incoming.filter(p => !seen.has(p._id))];
      });
      setTotal(d.total || 0);
      setPage(nextPage);
      setHasMore(nextPage < (d.totalPages || 1));
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, buildParams]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleFavoriteToggle = useCallback((propId, isFavorite) => {
    setSavedPropertyIds(prev => {
      const next = new Set(prev);
      if (isFavorite) next.add(propId); else next.delete(propId);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams();
      if (prev.get('listingStatus')) next.set('listingStatus', prev.get('listingStatus'));
      if (prev.get('view'))  next.set('view',  prev.get('view'));
      if (prev.get('lng'))   next.set('lng',   prev.get('lng'));
      if (prev.get('lat'))   next.set('lat',   prev.get('lat'));
      if (prev.get('zoom'))  next.set('zoom',  prev.get('zoom'));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const removeParam = useCallback((keys) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      keyList.forEach(k => next.delete(k));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const saveSearch = useCallback(() => {
    const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    saved.unshift({
      id: Date.now(),
      name: `Search — ${filteredProperties.length} properties`,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      propertyCount: filteredProperties.length,
    });
    localStorage.setItem('savedSearches', JSON.stringify(saved.slice(0, 10)));
  }, [filteredProperties.length]);

  // ── Search this area (bounds-based fetch, no viewport change) ────────────
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

  const mapMoveTimeoutRef = useRef(null);
  const handleMapMove = useCallback((center, zoom) => {
    clearTimeout(mapMoveTimeoutRef.current);
    mapMoveTimeoutRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('lng',  center[0].toFixed(4));
        next.set('lat',  center[1].toFixed(4));
        next.set('zoom', zoom.toFixed(2));
        return next;
      }, { replace: true });
    }, 1000);
  }, [setSearchParams]);

  // ── Context label ─────────────────────────────────────────────────────────
  const buildSearchContext = () => {
    if (loading) return loadingPhase === 0 ? 'Loading listings…' : 'Still retrieving listings…';
    const status = searchParams.get('listingStatus');
    const type   = searchParams.get('propertyType');
    const city   = searchParams.get('city');
    const beds   = searchParams.get('bedrooms');
    if (total === 0) return 'No listings matched these filters';
    const typeLabel = type ? (PLURAL[type] || `${type}s`) : 'listings';
    const parts = [`${total} ${typeLabel}`];
    if (status === 'for-rent')     parts.push('for rent');
    else if (status === 'for-sale') parts.push('for sale');
    if (city) parts.push(`in ${city}`);
    if (beds) parts.push(`· ${beds}+ beds`);
    return parts.join(' ');
  };

  // ── Trust helpers ─────────────────────────────────────────────────────────
  const getTrustLevel = (property) => {
    if (property.suspectedDuplicate) return 'low';
    let score = 0;
    if (property.ownershipVerificationStatus === 'verified') score += 2;
    if (property.ownerId?.phoneVerified) score += 1;
    if ((property.qualityScore || 0) >= 70) score += 1;
    return score >= 2 ? 'high' : 'default';
  };

  // ── AI insight — delegates to propertyAI utility ─────────────────────────
  const getAiInsight = getAiInsightRich;

  // ── Few-results hint ──────────────────────────────────────────────────────
  const FewResultsHint = () => {
    if (loading || total === 0 || total >= 6 || !hasActiveFilters) return null;

    const chips = [
      searchParams.get('propertyType') && {
        label: `Remove: ${searchParams.get('propertyType')}`,
        action: () => removeParam('propertyType'),
      },
      (searchParams.get('priceMin') || searchParams.get('priceMax')) && {
        label: 'Widen price range',
        action: () => removeParam(['priceMin', 'priceMax']),
      },
      searchParams.get('bedrooms') && {
        label: 'Any bedrooms',
        action: () => removeParam('bedrooms'),
      },
      searchParams.get('city') && {
        label: 'All locations',
        action: () => removeParam('city'),
      },
    ].filter(Boolean);

    if (chips.length === 0) return null;

    return (
      <div className="sp-few-results">
        <span className="sp-few-label">{total} result{total !== 1 ? 's' : ''} — broaden:</span>
        <div className="sp-few-chips">
          {chips.map(c => (
            <button key={c.label} className="sp-few-chip" onClick={c.action}>
              {c.label} ×
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ── Area insight — derived from visible properties ───────────────────────
  const areaInsight = useMemo(() => getAreaInsight(filteredProperties), [filteredProperties]);

  // ── Adjacent search suggestions ──────────────────────────────────────────
  const ExploreStrip = () => {
    if (loading || total === 0 || !hasActiveFilters || total >= 30) return null;

    const curCity     = searchParams.get('city');
    const curDistrict = searchParams.get('district');
    const curBeds     = searchParams.get('bedrooms');
    const curPriceMax = searchParams.get('priceMax');
    const curType     = searchParams.get('propertyType');
    const curLoc      = curDistrict || curCity;

    const suggestions = [];

    if (curLoc && NEARBY_DISTRICTS.includes(curLoc)) {
      const others = NEARBY_DISTRICTS.filter(d => d !== curLoc);
      const pick   = others[Math.floor(others.length / 2)] || others[0];
      if (pick) suggestions.push({
        label: pick,
        action: () => setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set(curDistrict ? 'district' : 'city', pick);
          return next;
        }, { replace: true }),
      });
    }

    if (curBeds && parseInt(curBeds, 10) > 1) {
      const fewer = parseInt(curBeds, 10) - 1;
      suggestions.push({
        label: `${fewer}+ beds`,
        action: () => setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('bedrooms', fewer);
          return next;
        }, { replace: true }),
      });
    }

    if (curPriceMax && !curBeds) {
      const higher = Math.round(parseInt(curPriceMax, 10) * 1.3 / 10000) * 10000;
      suggestions.push({
        label: `Under ₼${Math.round(higher / 1000)}k`,
        action: () => setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('priceMax', higher);
          return next;
        }, { replace: true }),
      });
    }

    if (curType && !curBeds && !curLoc) {
      suggestions.push({ label: 'All property types', action: () => removeParam('propertyType') });
    }

    if (suggestions.length === 0) return null;

    return (
      <div className="sp-explore-strip">
        <span className="sp-explore-label">Also try:</span>
        {suggestions.slice(0, 3).map((s, i) => (
          <button key={i} className="sp-explore-chip" onClick={s.action}>{s.label}</button>
        ))}
      </div>
    );
  };

  // ── Error state (network / server failure) ────────────────────────────────
  const errorState = (
    <div className="sp-empty">
      <div className="sp-empty-icon">
        <AlertCircle size={28} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h3 className="sp-empty-title">Listings temporarily unavailable</h3>
      <p className="sp-empty-body">
        We were unable to load properties at this time. This is usually temporary — please try again in a moment.
      </p>
      <Button onClick={() => setRetryCount(c => c + 1)} style={{ marginTop: '16px' }}>
        Try again
      </Button>
    </div>
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  const emptyState = (
    <div className="sp-empty">
      <div className="sp-empty-icon">
        <ZoomIn size={28} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h3 className="sp-empty-title">Nothing matched these filters</h3>
      <p className="sp-empty-body">
        {hasActiveFilters
          ? "We couldn't find an exact match. Try adjusting a filter or widening your search area."
          : 'Listings in this area are still growing. Try a nearby district or check back soon.'}
      </p>
      {hasActiveFilters && (
        <div className="sp-empty-chips">
          {searchParams.get('propertyType') && (
            <button className="sp-empty-chip" onClick={() => removeParam('propertyType')}>
              {PLURAL[searchParams.get('propertyType')] || searchParams.get('propertyType')} ×
            </button>
          )}
          {(searchParams.get('priceMin') || searchParams.get('priceMax')) && (
            <button className="sp-empty-chip" onClick={() => removeParam(['priceMin', 'priceMax'])}>
              price filter ×
            </button>
          )}
          {searchParams.get('bedrooms') && (
            <button className="sp-empty-chip" onClick={() => removeParam('bedrooms')}>
              {searchParams.get('bedrooms')}+ bedrooms ×
            </button>
          )}
          {searchParams.get('city') && (
            <button className="sp-empty-chip" onClick={() => removeParam('city')}>
              {searchParams.get('city')} ×
            </button>
          )}
        </div>
      )}
      <Button onClick={clearFilters} style={{ marginTop: '16px' }}>
        Browse all listings
      </Button>
      <div className="sp-empty-districts">
        <p className="sp-empty-districts-label">Browse by district</p>
        <div className="sp-empty-districts-chips">
          {NEARBY_DISTRICTS.map(d => (
            <button
              key={d}
              className="sp-district-chip"
              onClick={() => {
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.set('city', d);
                  ['propertyType','priceMin','priceMax','bedrooms','bathrooms','keyword'].forEach(k => next.delete(k));
                  return next;
                }, { replace: true });
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Card renderer ─────────────────────────────────────────────────────────
  const renderCard = (property, index, isMapView = false) => {
    const trustLevel   = getTrustLevel(property);
    const aiInsight    = getAiInsight(property);
    const primaryTrust = getPrimaryTrustSignal(property);
    const newListing   = isNewThisWeek(property);

    const toneIdx  = idHash(property._id) % IMAGE_TONE_PAIRS.length;
    const [toneRest, toneHover] = IMAGE_TONE_PAIRS[toneIdx];
    const imgFilter      = toneRest  ? `${toneRest} contrast(1.01)`  : 'saturate(1.02) contrast(1.01)';
    const imgHoverFilter = toneHover ? `${toneHover} contrast(1.03)` : 'saturate(1.06) brightness(1.025) contrast(1.03)';

    const cardClass = [
      'lc',
      isMapView ? '' : 'lc--grid',
      trustLevel === 'high' ? 'lc--high-trust' : '',
      trustLevel === 'low'  ? 'lc--low-conf'   : '',
      drawerPropertyId === property._id                                    ? 'lc--active'      : '',
      isMapView && hoveredPropertyId === property._id && !drawerPropertyId ? 'lc--highlighted' : '',
    ].filter(Boolean).join(' ');

    return (
      <div
        key={property._id}
        className={cardClass}
        style={{ '--img-filter': imgFilter, '--img-hover-filter': imgHoverFilter, '--card-index': Math.min(index, 8) }}
        onMouseEnter={isMapView ? () => setHoveredPropertyId(property._id) : undefined}
        onMouseLeave={isMapView ? () => setHoveredPropertyId(null)          : undefined}
        onClick={() => {
          const ctx = isMapView ? 'map' : 'list';
          track(ctx === 'map' ? 'listing_opened_from_map' : 'listing_opened_from_list', {
            property_id:    property._id,
            listing_status: property.listingStatus,
            property_type:  property.propertyType,
            district:       property.district || '',
            context:        ctx,
          });
          if (window.innerWidth > 1024) {
            openDrawer(property._id);
          } else if (isMapView) {
            setSelectedProperty(property);
          } else {
            // Save position so M-2 can restore it when user returns via back button
            sessionStorage.setItem('search-scroll', String(window.scrollY));
            navigate(`/properties/${property._id}`);
          }
        }}
      >
        {/* Image */}
        <div className="lc-img">
          {property.images?.length > 0
            ? <>
                <img
                  src={getImageUrl(property.images[0])}
                  alt={property.title}
                  loading="lazy"
                  style={{ opacity: 0, transition: 'opacity 380ms cubic-bezier(0.22,1,0.36,1)' }}
                  onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="lc-img-error" style={{ display: 'none' }} aria-hidden="true" />
              </>
            : <div className="lc-img-placeholder">
                <Image size={24} strokeWidth={1.5} aria-hidden="true" />
              </div>
          }
          {property.images?.length > 1 && (
            <div className="lc-photo-count">
              <Image size={11} strokeWidth={2} aria-hidden="true" />
              {property.images.length}
            </div>
          )}
          {property.isSponsored && index % 10 === 0 && (
            <div className="lc-sponsored">Sponsored</div>
          )}
          <FavoriteButton
            propertyId={property._id}
            initialIsFavorite={savedPropertyIds.has(property._id)}
            onToggle={handleFavoriteToggle}
          />
        </div>

        {/* Content */}
        <div className="lc-body">
          {newListing && <span className="lc-new-badge">New this week</span>}

          <div className="lc-price">
            <span className="lc-price-cur">{property.currency || 'AZN'}</span>
            {' '}{property.price?.toLocaleString()}
          </div>

          <h3 className="lc-title">{property.title}</h3>

          {primaryTrust && (
            <div className="lc-trust">
              <span className="lc-trust-item">
                <Check size={10} strokeWidth={3} aria-hidden="true" />
                {primaryTrust}
              </span>
            </div>
          )}

          <div className="lc-meta">
            <p className="lc-location">{getLocation(property)}</p>
            <div className="lc-features">
              {property.bedrooms  > 0 && <span>{property.bedrooms} bd</span>}
              {property.bathrooms > 0 && <span>{property.bathrooms} ba</span>}
              {property.builtUpArea   && <span>{property.builtUpArea} m²</span>}
            </div>
          </div>

          {property.reputationSummary?.reviewCount > 0 && (
            <PropertyRatingChip
              avgRating={property.reputationSummary.avgRating}
              reviewCount={property.reputationSummary.reviewCount}
            />
          )}

          {aiInsight && (
            <div className="lc-ai-insight">
              <Sparkles size={11} strokeWidth={2} className="lc-ai-icon" aria-hidden="true" />
              {aiInsight}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="search-page">
      <div className="search-content">

        {/* FilterBar floats over the content area */}
        <FilterBar />

        {/* ── List View ───────────────────────────────────────────────────── */}
        {viewMode === 'list' && (
          <div className="sp-list-view">
            <div className="sp-list-header">
              <h2 className="sp-context">{buildSearchContext()}</h2>
              <div className="sp-list-header-right">
                {areaInsight && <span className="sp-area-insight">{areaInsight}</span>}
                <button onClick={saveSearch} className="sp-save-btn" title="Save this search">
                  <Bookmark size={14} strokeWidth={2} aria-hidden="true" />
                  Save search
                </button>
              </div>
            </div>

            <FewResultsHint />
            <ExploreStrip />

            <div className="sp-grid">
              {loading
                ? Array.from({ length: SKELETON_COUNT }, (_, i) => <SkeletonCard key={i} index={i} />)
                : fetchError
                  ? errorState
                  : filteredProperties.length === 0
                    ? emptyState
                    : filteredProperties.map((p, i) => renderCard(p, i, false))
              }
            </div>

            {!loading && hasMore && (
              <div className="sp-load-more">
                <button className="sp-load-more-btn" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : `Show ${total - filteredProperties.length} more`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Map View ────────────────────────────────────────────────────── */}
        {viewMode === 'map' && (
          <>
            {/* Map — full canvas */}
            <div className="sp-map">
              <PropertyMap
                properties={filteredProperties}
                height="100%"
                center={initialCenter.current}
                zoom={initialZoom.current}
                flyTo={flyToTarget}
                onPropertySelect={(property) => {
                  if (window.innerWidth > 1024) {
                    openDrawer(property._id);
                  } else {
                    setSelectedProperty(property);
                  }
                }}
                highlightedPropertyId={drawerPropertyId || hoveredPropertyId}
                onMapMove={handleMapMove}
                onSearchArea={handleSearchArea}
                onPinHover={setHoveredPropertyId}
              />
            </div>

            {/* Floating list panel — slightly de-emphasised when drawer open */}
            <div className={[
              'sp-panel',
              mobileSheetOpen    ? 'sp-panel--open'       : '',
              drawerPropertyId   ? 'sp-panel--has-drawer' : '',
            ].filter(Boolean).join(' ')}>
              {/* Mobile drag handle — tapping header toggles sheet */}
              <div
                className="sp-panel-header"
                onClick={() => window.innerWidth < 768 && setMobileSheetOpen(v => !v)}
              >
                <div className="sp-drag-handle" aria-hidden="true" />
                <div className="sp-panel-header-row">
                  <div className="sp-context-wrap">
                    <h2 className="sp-context">{buildSearchContext()}</h2>
                    {areaInsight && <span className="sp-area-insight">{areaInsight}</span>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); saveSearch(); }}
                    className="sp-save-btn"
                    title="Save this search"
                  >
                    <Bookmark size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="sp-panel-body">
                <FewResultsHint />
                <ExploreStrip />
                {loading
                  ? Array.from({ length: SKELETON_COUNT }, (_, i) => <SkeletonCard key={i} index={i} />)
                  : fetchError
                    ? errorState
                    : filteredProperties.length === 0
                      ? emptyState
                      : filteredProperties.map((p, i) => renderCard(p, i, true))
                }
                {!loading && hasMore && (
                  <button className="sp-load-more-btn sp-load-more-btn--inline" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading…' : `${total - filteredProperties.length} more listings`}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Property Preview Drawer — desktop only */}
      {drawerPropertyId && (
        <PropertyPreviewDrawer
          propertyId={drawerPropertyId}
          onClose={closeDrawer}
          savedIds={savedPropertyIds}
          onSaveToggle={handleFavoriteToggle}
        />
      )}

      {/* Property Modal — mobile map view only */}
      {selectedProperty && !drawerPropertyId && (
        <PropertyModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
};

export default Search;
