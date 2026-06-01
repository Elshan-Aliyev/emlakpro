import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Sparkles, Check } from 'lucide-react';
import './FilterBar.css';

// ── Data ──────────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: 'apartment',         label: 'Apartment'  },
  { value: 'house',             label: 'House'       },
  { value: 'villa',             label: 'Villa'       },
  { value: 'townhouse',         label: 'Townhouse'   },
  { value: 'penthouse',         label: 'Penthouse'   },
  { value: 'studio',            label: 'Studio'      },
  { value: 'duplex',            label: 'Duplex'      },
  { value: 'office',            label: 'Office'      },
  { value: 'commercial-retail', label: 'Commercial'  },
  { value: 'land',              label: 'Land'        },
];

const LISTING_TYPES = [
  { value: '',      label: 'All'   },
  { value: 'buy',   label: 'Buy'   },
  { value: 'rent',  label: 'Rent'  },
  { value: 'daily', label: 'Daily' },
];

const BUILDING_TOGGLES = [
  { key: 'newBuilding', label: 'New building' },
  { key: 'elevator',    label: 'Elevator'      },
  { key: 'furnished',   label: 'Furnished'     },
  { key: 'renovated',   label: 'Renovated'     },
  { key: 'seaView',     label: 'Sea view'      },
  { key: 'parking',     label: 'Parking'       },
  { key: 'balcony',     label: 'Balcony'       },
];

const LIFESTYLE_FILTERS = [
  { key: 'nearMetro',      label: 'Near metro'      },
  { key: 'quietArea',      label: 'Quiet area'      },
  { key: 'familyFriendly', label: 'Family-friendly' },
  { key: 'shortTerm',      label: 'Short-term'      },
  { key: 'longTerm',       label: 'Long-term'       },
];

const TRUST_FILTERS = [
  { key: 'verified',          label: 'Ownership verified' },
  { key: 'recentlyConfirmed', label: 'Recently confirmed' },
  { key: 'fastResponse',      label: 'Quick to respond'   },
  { key: 'goodValue',         label: 'Well-regarded'      },
];

const HEATING_OPTIONS = [
  { value: '',           label: 'Any'        },
  { value: 'gas',        label: 'Gas'        },
  { value: 'electric',   label: 'Electric'   },
  { value: 'central',    label: 'Central'    },
  { value: 'autonomous', label: 'Individual' },
];

const BUILDING_AGE_OPTIONS = [
  { value: '',     label: 'Any'    },
  { value: 'new',  label: 'New'    },
  { value: 'u5',   label: '< 5yr'  },
  { value: '5_15', label: '5–15yr' },
  { value: 'o15',  label: '15yr+'  },
];

const DOC_STATUS_OPTIONS = [
  { value: '',          label: 'Any'          },
  { value: 'ownership', label: 'Full ownership' },
  { value: 'coop',      label: 'Cooperative'  },
  { value: 'lease',     label: 'Lease'        },
];

// ── Subcomponents ─────────────────────────────────────────────────────────────

const Group = ({ id, title, expanded, onToggle, activeCount, children }) => (
  <div className={`fms-group${expanded ? ' fms-group--open' : ''}`}>
    <button
      className="fms-group-hd"
      onClick={() => onToggle(id)}
      aria-expanded={expanded}
    >
      <span className="fms-group-label">{title}</span>
      <div className="fms-group-hd-right">
        {activeCount > 0 && (
          <span className="fms-group-badge">{activeCount}</span>
        )}
        <ChevronDown
          className="fms-group-chevron"
          size={14}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </div>
    </button>
    {expanded && (
      <div className="fms-group-body">
        {children}
      </div>
    )}
  </div>
);

const ToggleChip = ({ label, active, onToggle }) => (
  <button
    className={`fms-chip${active ? ' fms-chip--on' : ''}`}
    onClick={onToggle}
    aria-pressed={active}
  >
    {active && <Check size={9} strokeWidth={3.5} aria-hidden="true" />}
    {label}
  </button>
);

// ── Main component ────────────────────────────────────────────────────────────

const FilterModal = ({ isOpen, onClose, filters, onFilterChange, onApply, onReset }) => {
  const [expanded, setExpanded] = useState({
    location:  false,
    property:  true,
    building:  false,
    lifestyle: false,
    trust:     false,
    advanced:  false,
  });

  const bodyRef    = useRef(null);
  const historyRef = useRef(false);

  const toggleGroup = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Android back-button support
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ filterModal: true }, '');
    historyRef.current = true;
    const handlePopstate = () => { historyRef.current = false; onClose(); };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, [isOpen, onClose]);

  const handleClose = () => {
    if (historyRef.current) {
      historyRef.current = false;
      window.history.back();
    } else {
      onClose();
    }
  };

  const handleApply = () => { onApply(); handleClose(); };

  const tog = (key) => onFilterChange(key, filters[key] === 'true' ? '' : 'true');

  // ── Active counts per group ────────────────────────────────────────────────
  const locationCount  = [filters.city, filters.keyword].filter(Boolean).length;
  const propertyCount  = [
    filters.listingType, filters.minPrice, filters.maxPrice,
    filters.propertyType, filters.bedrooms, filters.bathrooms,
  ].filter(Boolean).length;
  const buildingCount  =
    BUILDING_TOGGLES.reduce((n, f) => n + (filters[f.key] === 'true' ? 1 : 0), 0) +
    (filters.minArea ? 1 : 0) + (filters.maxArea ? 1 : 0);
  const lifestyleCount = LIFESTYLE_FILTERS.filter(f => filters[f.key] === 'true').length;
  const trustCount     = TRUST_FILTERS.filter(f => filters[f.key] === 'true').length;
  const advancedCount  = [
    filters.floor, filters.totalFloors, filters.heating,
    filters.buildingAge, filters.documentStatus,
    filters.mortgageEligible === 'true' ? 'x' : '',
  ].filter(Boolean).length;

  const totalActive =
    locationCount + propertyCount + buildingCount +
    lifestyleCount + trustCount + advancedCount;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fms-overlay" onClick={handleClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        className="fms-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Refine your search"
      >
        {/* ── Header ── */}
        <div className="fms-header">
          <div className="fms-drag-handle" aria-hidden="true" />
          <div className="fms-header-row">
            <div>
              <h2 className="fms-title">Filters</h2>
              {totalActive > 0 && (
                <p className="fms-subtitle">{totalActive} active</p>
              )}
            </div>
            <button
              className="fms-close"
              onClick={handleClose}
              aria-label="Close filters"
            >
              <X size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="fms-body" ref={bodyRef}>

          {/* ① Location */}
          <Group
            id="location"
            title="Location"
            expanded={expanded.location}
            onToggle={toggleGroup}
            activeCount={locationCount}
          >
            <div className="fms-field">
              <label className="fms-field-label">City or district</label>
              <input
                className="fms-input"
                type="text"
                placeholder="e.g. Baku, Yasamal, Sabunchu…"
                value={filters.city || ''}
                onChange={e => onFilterChange('city', e.target.value)}
              />
            </div>
            <div className="fms-field">
              <label className="fms-field-label">Keyword</label>
              <input
                className="fms-input"
                type="text"
                placeholder="e.g. sea view, corner unit…"
                value={filters.keyword || ''}
                onChange={e => onFilterChange('keyword', e.target.value)}
              />
            </div>
          </Group>

          {/* ② Price & Property */}
          <Group
            id="property"
            title="Price & Property"
            expanded={expanded.property}
            onToggle={toggleGroup}
            activeCount={propertyCount}
          >
            {/* Listing type */}
            <div className="fms-field">
              <label className="fms-field-label">Listing type</label>
              <div className="fms-num-row">
                {LISTING_TYPES.map(t => (
                  <button
                    key={t.value}
                    className={`fms-num-btn${(filters.listingType || '') === t.value ? ' fms-num-btn--on' : ''}`}
                    onClick={() => onFilterChange('listingType', t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="fms-field">
              <label className="fms-field-label">Price (AZN)</label>
              <div className="fms-price-presets fms-price-presets--mb">
                {[
                  { min: '',       max: '100000', label: 'Under 100k'  },
                  { min: '',       max: '200000', label: 'Under 200k'  },
                  { min: '200000', max: '500000', label: '200k – 500k' },
                  { min: '500000', max: '',       label: '500k+'       },
                ].map(p => (
                  <button
                    key={p.label}
                    className={`fms-price-preset${
                      filters.minPrice === p.min && filters.maxPrice === p.max
                        ? ' fms-price-preset--on'
                        : ''
                    }`}
                    onClick={() => {
                      onFilterChange('minPrice', p.min);
                      onFilterChange('maxPrice', p.max);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="fms-price-row">
                <input
                  className="fms-input"
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={e => onFilterChange('minPrice', e.target.value)}
                  min="0"
                />
                <span className="fms-price-sep">—</span>
                <input
                  className="fms-input"
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={e => onFilterChange('maxPrice', e.target.value)}
                  min="0"
                />
              </div>
            </div>

            {/* Property type */}
            <div className="fms-field">
              <label className="fms-field-label">Property type</label>
              <div className="fms-chip-row">
                <button
                  className={`fms-chip fms-chip--type${!filters.propertyType ? ' fms-chip--on' : ''}`}
                  onClick={() => onFilterChange('propertyType', '')}
                >
                  All
                </button>
                {PROPERTY_TYPES.map(t => (
                  <button
                    key={t.value}
                    className={`fms-chip fms-chip--type${filters.propertyType === t.value ? ' fms-chip--on' : ''}`}
                    onClick={() => onFilterChange('propertyType', t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bedrooms */}
            <div className="fms-field">
              <label className="fms-field-label">Bedrooms</label>
              <div className="fms-num-row">
                {['', '1', '2', '3', '4', '5'].map(v => (
                  <button
                    key={v}
                    className={`fms-num-btn${filters.bedrooms === v ? ' fms-num-btn--on' : ''}`}
                    onClick={() => onFilterChange('bedrooms', v)}
                  >
                    {v === '' ? 'Any' : `${v}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Bathrooms */}
            <div className="fms-field">
              <label className="fms-field-label">Bathrooms</label>
              <div className="fms-num-row">
                {['', '1', '2', '3', '4'].map(v => (
                  <button
                    key={v}
                    className={`fms-num-btn${filters.bathrooms === v ? ' fms-num-btn--on' : ''}`}
                    onClick={() => onFilterChange('bathrooms', v)}
                  >
                    {v === '' ? 'Any' : `${v}+`}
                  </button>
                ))}
              </div>
            </div>
          </Group>

          {/* ③ Building & Space */}
          <Group
            id="building"
            title="Building & Space"
            expanded={expanded.building}
            onToggle={toggleGroup}
            activeCount={buildingCount}
          >
            <div className="fms-field">
              <label className="fms-field-label">Area (m²)</label>
              <div className="fms-price-row">
                <input
                  className="fms-input"
                  type="number"
                  placeholder="Min m²"
                  value={filters.minArea || ''}
                  onChange={e => onFilterChange('minArea', e.target.value)}
                  min="0"
                />
                <span className="fms-price-sep">—</span>
                <input
                  className="fms-input"
                  type="number"
                  placeholder="Max m²"
                  value={filters.maxArea || ''}
                  onChange={e => onFilterChange('maxArea', e.target.value)}
                  min="0"
                />
              </div>
            </div>
            <div className="fms-field">
              <div className="fms-chip-row">
                {BUILDING_TOGGLES.map(f => (
                  <ToggleChip
                    key={f.key}
                    label={f.label}
                    active={filters[f.key] === 'true'}
                    onToggle={() => tog(f.key)}
                  />
                ))}
              </div>
            </div>
          </Group>

          {/* ④ Lifestyle */}
          <Group
            id="lifestyle"
            title="Lifestyle"
            expanded={expanded.lifestyle}
            onToggle={toggleGroup}
            activeCount={lifestyleCount}
          >
            <div className="fms-chip-row">
              {LIFESTYLE_FILTERS.map(f => (
                <ToggleChip
                  key={f.key}
                  label={f.label}
                  active={filters[f.key] === 'true'}
                  onToggle={() => tog(f.key)}
                />
              ))}
            </div>
          </Group>

          {/* ⑤ Trust & Quality */}
          <Group
            id="trust"
            title="Trust & Quality"
            expanded={expanded.trust}
            onToggle={toggleGroup}
            activeCount={trustCount}
          >
            <div className="fms-ai-intro">
              <Sparkles size={11} strokeWidth={2} aria-hidden="true" />
              Signals from listing activity and owner behaviour
            </div>
            <div className="fms-chip-row">
              {TRUST_FILTERS.map(f => (
                <ToggleChip
                  key={f.key}
                  label={f.label}
                  active={filters[f.key] === 'true'}
                  onToggle={() => tog(f.key)}
                />
              ))}
            </div>
          </Group>

          {/* ⑥ Advanced — progressive depth */}
          <div className={`fms-advanced${expanded.advanced ? ' fms-advanced--open' : ''}`}>
            <button
              className="fms-advanced-trigger"
              onClick={() => toggleGroup('advanced')}
              aria-expanded={expanded.advanced}
            >
              <ChevronDown
                className="fms-advanced-chevron"
                size={14}
                strokeWidth={2.5}
                aria-hidden="true"
              />
              <span>{expanded.advanced ? 'Fewer options' : 'More options'}</span>
              {advancedCount > 0 && (
                <span className="fms-group-badge">{advancedCount}</span>
              )}
            </button>

            {expanded.advanced && (
              <div className="fms-advanced-body">
                {/* Floor range */}
                <div className="fms-field">
                  <label className="fms-field-label">Floor</label>
                  <div className="fms-price-row">
                    <input
                      className="fms-input"
                      type="number"
                      placeholder="Min floor"
                      value={filters.floor || ''}
                      onChange={e => onFilterChange('floor', e.target.value)}
                      min="0"
                    />
                    <span className="fms-price-sep">of</span>
                    <input
                      className="fms-input"
                      type="number"
                      placeholder="Total floors"
                      value={filters.totalFloors || ''}
                      onChange={e => onFilterChange('totalFloors', e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                {/* Heating */}
                <div className="fms-field">
                  <label className="fms-field-label">Heating</label>
                  <div className="fms-chip-row">
                    {HEATING_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        className={`fms-chip${(filters.heating || '') === o.value ? ' fms-chip--on' : ''}`}
                        onClick={() => onFilterChange('heating', o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Building age */}
                <div className="fms-field">
                  <label className="fms-field-label">Building age</label>
                  <div className="fms-chip-row">
                    {BUILDING_AGE_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        className={`fms-chip${(filters.buildingAge || '') === o.value ? ' fms-chip--on' : ''}`}
                        onClick={() => onFilterChange('buildingAge', o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document status */}
                <div className="fms-field">
                  <label className="fms-field-label">Document status</label>
                  <div className="fms-chip-row">
                    {DOC_STATUS_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        className={`fms-chip${(filters.documentStatus || '') === o.value ? ' fms-chip--on' : ''}`}
                        onClick={() => onFilterChange('documentStatus', o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mortgage */}
                <div className="fms-field fms-field--last">
                  <label className="fms-field-label">Financing</label>
                  <div className="fms-chip-row">
                    <ToggleChip
                      label="Mortgage eligible"
                      active={filters.mortgageEligible === 'true'}
                      onToggle={() => tog('mortgageEligible')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Sticky footer ── */}
        <div className="fms-footer">
          <button className="fms-reset" onClick={onReset}>Reset all</button>
          <button className="fms-apply" onClick={handleApply}>Show results</button>
        </div>
      </div>
    </>
  );
};

export default FilterModal;
