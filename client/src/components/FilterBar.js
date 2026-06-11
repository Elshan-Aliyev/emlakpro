import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Search, X, ChevronDown, SlidersHorizontal, Map, AlignJustify } from 'lucide-react';
import FilterModal from './FilterModal';
import { parseNLQuery } from '../utils/nlpSearch';
import { track } from '../services/analytics';
import './FilterBar.css';

const PROPERTY_TYPES_QUICK = [
  { value: 'apartment',  label: 'Apartment'  },
  { value: 'house',      label: 'House'       },
  { value: 'villa',      label: 'Villa'       },
  { value: 'townhouse',  label: 'Townhouse'   },
  { value: 'penthouse',  label: 'Penthouse'   },
  { value: 'studio',     label: 'Studio'      },
  { value: 'duplex',     label: 'Duplex'      },
  { value: 'office',     label: 'Office'      },
  { value: 'land',       label: 'Land'        },
];

const BAKU_DISTRICTS = [
  { value: 'Yasamal',   label: 'Yasamal'   },
  { value: 'Nərimanov', label: 'Nərimanov' },
  { value: 'Nəsimi',    label: 'Nəsimi'    },
  { value: 'Xətai',     label: 'Xətai'     },
  { value: 'Binəqədi',  label: 'Binəqədi'  },
  { value: 'Sabunçu',   label: 'Sabunçu'   },
  { value: 'Suraxanı',  label: 'Suraxanı'  },
  { value: 'Qaradağ',   label: 'Qaradağ'   },
  { value: 'Səbail',    label: 'Səbail'    },
  { value: 'Pirallahı', label: 'Pirallahı' },
];

const ALL_FILTER_KEYS = [
  'city', 'district', 'subCategory', 'propertyType', 'priceMin', 'priceMax', 'bedrooms', 'bathrooms', 'keyword',
  'verified', 'fastResponse', 'newThisWeek', 'goodValue', 'recentlyConfirmed',
  'nearMetro', 'familyFriendly', 'quietArea', 'furnished', 'parking',
  'newBuilding', 'elevator', 'renovated', 'seaView',
];

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

const fmtChipPrice = (n) => {
  const num = parseInt(n, 10);
  if (!num) return '0';
  return num >= 1000 ? `${Math.round(num / 1000)}k` : String(num);
};

const FilterBar = () => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [localSearch,     setLocalSearch]     = useState('');
  const [openQF,          setOpenQF]          = useState(null); // 'price' | 'beds' | 'type'

  const liveChips = useMemo(() => {
    if (!localSearch.trim()) return [];
    const { chips } = parseNLQuery(localSearch);
    return chips || [];
  }, [localSearch]);
  const [localPriceMin,   setLocalPriceMin]   = useState('');
  const [localPriceMax,   setLocalPriceMax]   = useState('');

  const qfRef    = useRef(null);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const listingStatus = searchParams.get('listingStatus') || '';
  const propertyType  = searchParams.get('propertyType')  || '';
  const bedrooms      = searchParams.get('bedrooms')      || '';
  const bathrooms     = searchParams.get('bathrooms')     || '';
  const priceMin      = searchParams.get('priceMin')      || '';
  const priceMax      = searchParams.get('priceMax')      || '';
  const keyword       = searchParams.get('keyword')       || '';
  const viewMode      = searchParams.get('view')          || 'map';
  const district      = searchParams.get('district')      || '';
  const city          = searchParams.get('city')          || '';
  const subCategory   = searchParams.get('subCategory')   || '';

  // When Navbar AI search sets city=Yasamal (a Baku district), reflect it in the Region pill
  const effectiveDistrict = district || (BAKU_DISTRICTS.some(d => d.value === city) ? city : '');

  // Sync local state with URL
  useEffect(() => { setLocalSearch(keyword); },   [keyword]);
  useEffect(() => { setLocalPriceMin(priceMin); }, [priceMin]);
  useEffect(() => { setLocalPriceMax(priceMax); }, [priceMax]);

  // Close quick-filter dropdown on outside click
  useEffect(() => {
    if (!openQF) return;
    const handler = (e) => {
      if (qfRef.current && !qfRef.current.contains(e.target)) setOpenQF(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openQF]);

  const setParam = useCallback((key, value) => {
    const existing = searchParams.get(key);
    if (value && value !== existing) {
      track('filter_applied', { filter_key: key, filter_value: String(value) });
    } else if (!value && existing) {
      track('filter_removed', { filter_key: key });
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key);
      else        next.set(key, String(value));
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams();
      ['listingStatus', 'view', 'lng', 'lat', 'zoom'].forEach(k => {
        if (prev.get(k)) next.set(k, prev.get(k));
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const removeChip = useCallback((keys) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      keyList.forEach(k => next.delete(k));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const commitSearch = useCallback(() => {
    const trimmed = localSearch.trim();
    if (!trimmed) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('keyword');
        return next;
      }, { replace: true });
      return;
    }
    const { params: nlParams, remainingKeyword, chips } = parseNLQuery(trimmed);
    const resolvedChips   = (chips || []).filter(c => c.type === 'resolved').map(c => c.label);
    const unrecognized    = (chips || []).filter(c => c.type === 'uncertain').map(c => c.label);
    track('search_submitted', {
      query:              trimmed,
      listing_status:     searchParams.get('listingStatus') || '',
      has_price_range:    !!(searchParams.get('priceMin') || searchParams.get('priceMax')),
      has_bedrooms:       !!searchParams.get('bedrooms'),
    });
    if (resolvedChips.length > 0) {
      track('search_interpreted', {
        raw_query:        trimmed,
        resolved_concepts: resolvedChips.join(', '),
        unrecognized_fragments: unrecognized.join(', ') || null,
        failed:           resolvedChips.length === 0,
      });
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(nlParams).forEach(([k, v]) => {
        if (v != null && String(v) !== '') next.set(k, String(v));
      });
      if (remainingKeyword) next.set('keyword', remainingKeyword);
      else next.delete('keyword');
      return next;
    }, { replace: true });
  }, [localSearch, searchParams, setSearchParams]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') commitSearch(); };

  const applyPrice = useCallback(() => {
    setParam('priceMin', localPriceMin);
    setParam('priceMax', localPriceMax);
    setOpenQF(null);
  }, [localPriceMin, localPriceMax, setParam]);

  // ── Pill labels ──────────────────────────────────────────────────────────────
  const priceLabel = useMemo(() => {
    const fmt = (n) => {
      const num = parseInt(n, 10);
      if (!num) return '0';
      return num >= 1000 ? `${Math.round(num / 1000)}k` : String(num);
    };
    if (priceMin && priceMax) return `${fmt(priceMin)} – ${fmt(priceMax)}`;
    if (priceMax) return `Up to ${fmt(priceMax)}`;
    if (priceMin) return `${fmt(priceMin)}+`;
    return 'Price';
  }, [priceMin, priceMax]);

  const bedsLabel = bedrooms
    ? `${bedrooms}+ bed${bedrooms === '1' ? '' : 's'}`
    : 'Beds';

  const typeLabel = propertyType
    ? propertyType.charAt(0).toUpperCase() + propertyType.slice(1).replace(/-/g, ' ')
    : 'Type';

  const regionLabel   = effectiveDistrict ? effectiveDistrict : 'Region';
  const durationLabel = subCategory === 'short-term' ? 'Short-term'
                      : subCategory === 'long-term'  ? 'Long-term'
                      : 'Duration';

  const hasActiveFilters = ALL_FILTER_KEYS.some(k => searchParams.get(k));

  // ── Active filter chips — one removable chip per active filter ────────────
  const activeChips = [];
  if (propertyType) activeChips.push({
    key: 'propertyType',
    label: propertyType.charAt(0).toUpperCase() + propertyType.slice(1).replace(/-/g, ' '),
  });
  if (city)     activeChips.push({ key: 'city',     label: city });
  if (district) activeChips.push({ key: 'district', label: district });
  if (priceMin || priceMax) activeChips.push({
    key: ['priceMin', 'priceMax'],
    label: priceMin && priceMax ? `₼${fmtChipPrice(priceMin)} – ₼${fmtChipPrice(priceMax)}`
         : priceMax ? `Up to ₼${fmtChipPrice(priceMax)}`
         : `₼${fmtChipPrice(priceMin)}+`,
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

  const activeFilterCount = activeChips.length;

  // ── Modal filters object ─────────────────────────────────────────────────────
  const modalFilters = {
    listingStatus,
    city:              searchParams.get('city')              || '',
    propertyType,
    bedrooms,
    bathrooms,
    minPrice:          priceMin,
    maxPrice:          priceMax,
    keyword,
    nearMetro:         searchParams.get('nearMetro')         || '',
    familyFriendly:    searchParams.get('familyFriendly')    || '',
    quietArea:         searchParams.get('quietArea')         || '',
    furnished:         searchParams.get('furnished')         || '',
    parking:           searchParams.get('parking')           || '',
    verified:          searchParams.get('verified')          || '',
    recentlyConfirmed: searchParams.get('recentlyConfirmed') || '',
    newThisWeek:       searchParams.get('newThisWeek')       || '',
    fastResponse:      searchParams.get('fastResponse')      || '',
    goodValue:         searchParams.get('goodValue')         || '',
    newBuilding:       searchParams.get('newBuilding')       || '',
    elevator:          searchParams.get('elevator')          || '',
    renovated:         searchParams.get('renovated')         || '',
    seaView:           searchParams.get('seaView')           || '',
  };

  const handleModalFilterChange = useCallback((key, value) => {
    const urlKey = { minPrice: 'priceMin', maxPrice: 'priceMax' }[key] || key;
    setParam(urlKey, value);
  }, [setParam]);

  if (!location.pathname.includes('/search')) return null;

  return (
    <div className="filter-bar" role="search" aria-label="Property search filters">
      <div className="fb-inner" ref={qfRef}>

        {/* ── Mode tabs ── */}
        <div className="fb-modes">
          {[
            { value: 'for-sale',    label: 'Buy'  },
            { value: 'for-rent',    label: 'Rent' },
            { value: 'new-project', label: 'New'  },
          ].map(m => (
            <button
              key={m.value}
              className={`fb-tab${listingStatus === m.value ? ' fb-tab--active' : ''}`}
              onClick={() => setParam('listingStatus', m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* ── AI search ── */}
        <div className="fb-search">
          <Search className="fb-search-ico" size={15} strokeWidth={2} aria-hidden="true" />
          <input
            className="fb-search-input"
            type="text"
            placeholder="2 bed near metro, under 200k…"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitSearch}
            aria-label="Search properties"
          />
          {localSearch && (
            <button
              className="fb-search-clear"
              onClick={() => {
                setLocalSearch('');
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.delete('keyword');
                  return next;
                }, { replace: true });
              }}
              aria-label="Clear search"
            >
              <X size={13} strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* ── Quick filter pills ── */}
        <div className="fb-quick-pills">

          {/* Price */}
          <div className="fb-qp-wrap">
            <button
              className={`fb-quick-pill${priceMin || priceMax ? ' fb-quick-pill--active' : ''}${openQF === 'price' ? ' fb-quick-pill--open' : ''}`}
              onClick={() => setOpenQF(openQF === 'price' ? null : 'price')}
              aria-expanded={openQF === 'price'}
            >
              {priceLabel}
              <ChevronDown className="fb-qp-chevron" size={10} strokeWidth={2.5} aria-hidden="true" />
            </button>
            {openQF === 'price' && (
              <div className="fb-qd" role="dialog" aria-label="Price range">
                <div className="fb-qd-title">Price range (AZN)</div>
                <div className="fb-qd-price-row">
                  <input
                    className="fb-qd-input"
                    type="number"
                    placeholder="Min"
                    value={localPriceMin}
                    onChange={e => setLocalPriceMin(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyPrice()}
                    min="0"
                  />
                  <span className="fb-qd-sep">—</span>
                  <input
                    className="fb-qd-input"
                    type="number"
                    placeholder="Max"
                    value={localPriceMax}
                    onChange={e => setLocalPriceMax(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyPrice()}
                    min="0"
                  />
                </div>
                <div className="fb-qd-presets">
                  {[
                    { min: '',       max: '100000', label: 'Under 100k'   },
                    { min: '',       max: '200000', label: 'Under 200k'   },
                    { min: '200000', max: '500000', label: '200k – 500k'  },
                    { min: '500000', max: '',       label: '500k+'         },
                  ].map(p => (
                    <button
                      key={p.label}
                      className={`fb-qd-preset${localPriceMin === p.min && localPriceMax === p.max ? ' fb-qd-preset--on' : ''}`}
                      onClick={() => { setLocalPriceMin(p.min); setLocalPriceMax(p.max); }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="fb-qd-footer">
                  {(priceMin || priceMax) && (
                    <button
                      className="fb-qd-clear"
                      onClick={() => {
                        setLocalPriceMin(''); setLocalPriceMax('');
                        setParam('priceMin', ''); setParam('priceMax', '');
                        setOpenQF(null);
                      }}
                    >
                      Clear
                    </button>
                  )}
                  <button className="fb-qd-apply" onClick={applyPrice}>Apply</button>
                </div>
              </div>
            )}
          </div>

          {/* Beds */}
          <div className="fb-qp-wrap">
            <button
              className={`fb-quick-pill${bedrooms ? ' fb-quick-pill--active' : ''}${openQF === 'beds' ? ' fb-quick-pill--open' : ''}`}
              onClick={() => setOpenQF(openQF === 'beds' ? null : 'beds')}
              aria-expanded={openQF === 'beds'}
            >
              {bedsLabel}
              <ChevronDown className="fb-qp-chevron" size={10} strokeWidth={2.5} aria-hidden="true" />
            </button>
            {openQF === 'beds' && (
              <div className="fb-qd fb-qd--narrow" role="dialog" aria-label="Bedrooms">
                <div className="fb-qd-title">Bedrooms</div>
                <div className="fb-qd-num-row">
                  {[
                    { value: '',  label: 'Any' },
                    { value: '1', label: '1+'  },
                    { value: '2', label: '2+'  },
                    { value: '3', label: '3+'  },
                    { value: '4', label: '4+'  },
                    { value: '5', label: '5+'  },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`fb-qd-num-btn${bedrooms === opt.value ? ' fb-qd-num-btn--on' : ''}`}
                      onClick={() => { setParam('bedrooms', opt.value); setOpenQF(null); }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Type */}
          <div className="fb-qp-wrap">
            <button
              className={`fb-quick-pill${propertyType ? ' fb-quick-pill--active' : ''}${openQF === 'type' ? ' fb-quick-pill--open' : ''}`}
              onClick={() => setOpenQF(openQF === 'type' ? null : 'type')}
              aria-expanded={openQF === 'type'}
            >
              {typeLabel}
              <ChevronDown className="fb-qp-chevron" size={10} strokeWidth={2.5} aria-hidden="true" />
            </button>
            {openQF === 'type' && (
              <div className="fb-qd" role="dialog" aria-label="Property type">
                <div className="fb-qd-title">Property type</div>
                <div className="fb-qd-type-grid">
                  <button
                    className={`fb-qd-type-chip${!propertyType ? ' fb-qd-type-chip--on' : ''}`}
                    onClick={() => { setParam('propertyType', ''); setOpenQF(null); }}
                  >
                    All types
                  </button>
                  {PROPERTY_TYPES_QUICK.map(t => (
                    <button
                      key={t.value}
                      className={`fb-qd-type-chip${propertyType === t.value ? ' fb-qd-type-chip--on' : ''}`}
                      onClick={() => { setParam('propertyType', t.value); setOpenQF(null); }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Region (buy/new-project) ↔ Duration (rent) */}
          {listingStatus === 'for-rent' ? (
            <div className="fb-qp-wrap">
              <button
                className={`fb-quick-pill${subCategory ? ' fb-quick-pill--active' : ''}${openQF === 'duration' ? ' fb-quick-pill--open' : ''}`}
                onClick={() => setOpenQF(openQF === 'duration' ? null : 'duration')}
                aria-expanded={openQF === 'duration'}
              >
                {durationLabel}
                <ChevronDown className="fb-qp-chevron" size={10} strokeWidth={2.5} aria-hidden="true" />
              </button>
              {openQF === 'duration' && (
                <div className="fb-qd fb-qd--narrow" role="dialog" aria-label="Rental duration">
                  <div className="fb-qd-title">Rental duration</div>
                  <div className="fb-qd-num-row">
                    {[
                      { value: '',           label: 'Any'        },
                      { value: 'short-term', label: 'Short-term' },
                      { value: 'long-term',  label: 'Long-term'  },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        className={`fb-qd-num-btn${subCategory === opt.value ? ' fb-qd-num-btn--on' : ''}`}
                        onClick={() => { setParam('subCategory', opt.value); setOpenQF(null); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="fb-qp-wrap">
              <button
                className={`fb-quick-pill${effectiveDistrict ? ' fb-quick-pill--active' : ''}${openQF === 'region' ? ' fb-quick-pill--open' : ''}`}
                onClick={() => setOpenQF(openQF === 'region' ? null : 'region')}
                aria-expanded={openQF === 'region'}
              >
                {regionLabel}
                <ChevronDown className="fb-qp-chevron" size={10} strokeWidth={2.5} aria-hidden="true" />
              </button>
              {openQF === 'region' && (
                <div className="fb-qd fb-qd--region" role="dialog" aria-label="Baku districts">
                  <div className="fb-qd-title">Area / District</div>
                  <div className="fb-qd-type-grid">
                    <button
                      className={`fb-qd-type-chip${!effectiveDistrict ? ' fb-qd-type-chip--on' : ''}`}
                      onClick={() => { setParam('district', ''); setParam('city', ''); setOpenQF(null); }}
                    >
                      All areas
                    </button>
                    {BAKU_DISTRICTS.map(d => (
                      <button
                        key={d.value}
                        className={`fb-qd-type-chip${effectiveDistrict === d.value ? ' fb-qd-type-chip--on' : ''}`}
                        onClick={() => { setParam('district', d.value); setOpenQF(null); }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Actions ── */}
        <div className="fb-actions">
          <button
            className={`fb-filters-btn${hasActiveFilters ? ' fb-filters-btn--active' : ''}`}
            onClick={() => setShowFilterModal(true)}
            aria-label="All filters"
          >
            <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>

          <div className="fb-view-toggle" role="group" aria-label="View mode">
            <button
              className={`fb-view-btn${viewMode === 'map' ? ' active' : ''}`}
              onClick={() => setParam('view', 'map')}
              title="Map view"
              aria-pressed={viewMode === 'map'}
            >
              <Map size={15} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              className={`fb-view-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setParam('view', 'list')}
              title="List view"
              aria-pressed={viewMode === 'list'}
            >
              <AlignJustify size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>

      </div>

      {/* ── Active filter chips ── */}
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

      {liveChips.length > 0 && (
        <div className="fb-nl-chips" aria-live="polite">
          {liveChips.map((chip, i) => (
            <span key={i} className={`fb-nl-chip fb-nl-chip--${chip.type}`}>
              {chip.label}
            </span>
          ))}
        </div>
      )}

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={modalFilters}
        onFilterChange={handleModalFilterChange}
        onApply={() => setShowFilterModal(false)}
        onReset={handleClearFilters}
      />
    </div>
  );
};

export default FilterBar;
