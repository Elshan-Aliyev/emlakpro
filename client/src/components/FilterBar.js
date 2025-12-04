import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DualRangeSlider from './DualRangeSlider';
import './FilterBar.css';

const FilterBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') || '');
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');
  const [bathrooms, setBathrooms] = useState(searchParams.get('bathrooms') || '');
  const [areaMin, setAreaMin] = useState(searchParams.get('areaMin') || '');
  const [areaMax, setAreaMax] = useState(searchParams.get('areaMax') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [showSold, setShowSold] = useState(searchParams.get('showSold') === 'true');
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'map');
  const [parking, setParking] = useState(searchParams.get('parking') === 'true');
  const [petsAllowed, setPetsAllowed] = useState(searchParams.get('petsAllowed') === 'true');
  const [furnished, setFurnished] = useState(searchParams.get('furnished') === 'true');
  const [pool, setPool] = useState(searchParams.get('pool') === 'true');
  const [gym, setGym] = useState(searchParams.get('gym') === 'true');
  
  // Dropdown visibility
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  
  const priceDropdownRef = useRef(null);
  const areaDropdownRef = useRef(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target)) {
        setShowPriceDropdown(false);
      }
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(event.target)) {
        setShowAreaDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Auto-apply filters when they change
  const applyFiltersAuto = () => {
    const params = new URLSearchParams(location.search);
    
    if (propertyType) params.set('propertyType', propertyType);
    else params.delete('propertyType');
    
    if (priceMin) params.set('priceMin', priceMin);
    else params.delete('priceMin');
    
    if (priceMax) params.set('priceMax', priceMax);
    else params.delete('priceMax');
    
    if (bedrooms) params.set('bedrooms', bedrooms);
    else params.delete('bedrooms');
    
    if (bathrooms) params.set('bathrooms', bathrooms);
    else params.delete('bathrooms');
    
    if (areaMin) params.set('areaMin', areaMin);
    else params.delete('areaMin');
    
    if (areaMax) params.set('areaMax', areaMax);
    else params.delete('areaMax');
    
    navigate(`/search?${params.toString()}`);
  };
  
  useEffect(() => {
    applyFiltersAuto();
  }, [propertyType, priceMin, priceMax, bedrooms, bathrooms, areaMin, areaMax, parking, petsAllowed, furnished, pool, gym]);
  
  const handleApplyFilters = () => {
    const params = new URLSearchParams(location.search);
    
    if (propertyType) params.set('propertyType', propertyType);
    else params.delete('propertyType');
    
    if (priceMin) params.set('priceMin', priceMin);
    else params.delete('priceMin');
    
    if (priceMax) params.set('priceMax', priceMax);
    else params.delete('priceMax');
    
    if (bedrooms) params.set('bedrooms', bedrooms);
    else params.delete('bedrooms');
    
    if (bathrooms) params.set('bathrooms', bathrooms);
    else params.delete('bathrooms');
    
    if (areaMin) params.set('areaMin', areaMin);
    else params.delete('areaMin');
    
    if (areaMax) params.set('areaMax', areaMax);
    else params.delete('areaMax');
    
    if (sortBy) params.set('sortBy', sortBy);
    else params.delete('sortBy');
    
    if (showSold) params.set('showSold', 'true');
    else params.delete('showSold');
    
    if (viewMode) params.set('view', viewMode);
    else params.delete('view');
    
    if (parking) params.set('parking', 'true');
    else params.delete('parking');
    
    if (petsAllowed) params.set('petsAllowed', 'true');
    else params.delete('petsAllowed');
    
    if (furnished) params.set('furnished', 'true');
    else params.delete('furnished');
    
    if (pool) params.set('pool', 'true');
    else params.delete('pool');
    
    if (gym) params.set('gym', 'true');
    else params.delete('gym');
    
    navigate(`/search?${params.toString()}`);
  };
  
  const handleClearFilters = () => {
    setPropertyType('');
    setPriceMin('');
    setPriceMax('');
    setBedrooms('');
    setBathrooms('');
    setAreaMin('');
    setAreaMax('');
    setSortBy('newest');
    setParking(false);
    setPetsAllowed(false);
    setFurnished(false);
    setPool(false);
    setGym(false);
    setShowSold(false);
    setViewMode('map');
    
    // Preserve listingStatus and purpose when clearing
    const params = new URLSearchParams();
    const listingStatus = searchParams.get('listingStatus');
    const purpose = searchParams.get('purpose');
    if (listingStatus) params.set('listingStatus', listingStatus);
    if (purpose) params.set('purpose', purpose);
    
    navigate(`/search?${params.toString()}`);
  };
  
  // Only show filter bar on search page
  if (!location.pathname.includes('/search')) {
    return null;
  }
  
  return (
    <div className="filter-bar">
      <div className="filter-bar-container">
        <div className="filter-bar-content">
          {/* Sort By */}
          <select
            className="filter-bar-select filter-bar-sort"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              const params = new URLSearchParams(location.search);
              params.set('sortBy', e.target.value);
              navigate(`/search?${params.toString()}`);
            }}
            title="Sort By"
          >
            <option value="newest">🕐 Newest</option>
            <option value="price-low">💵 Price: Low-High</option>
            <option value="price-high">💰 Price: High-Low</option>
            <option value="beds">🛏️ Most Bedrooms</option>
            <option value="area">📏 Largest Area</option>
          </select>
          
          {/* Property Type */}
          <select
            className="filter-bar-select filter-icon-only"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            title="Property Type"
          >
            <option value="">🏠</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
            <option value="townhouse">Townhouse</option>
            <option value="penthouse">Penthouse</option>
            <option value="studio">Studio</option>
            <option value="office">Office</option>
            <option value="retail">Retail</option>
            <option value="warehouse">Warehouse</option>
          </select>
          
          {/* Price Range Dropdown */}
          <div className="filter-dropdown" ref={priceDropdownRef}>
            <button
              className="filter-bar-select filter-icon-only"
              onClick={() => setShowPriceDropdown(!showPriceDropdown)}
              title="Price Range"
            >
              <span style={{fontSize: '1.5rem'}}>💰</span>
              {(priceMin || priceMax) && (
                <span className="filter-active-badge">✓</span>
              )}
            </button>
            {showPriceDropdown && (
              <div className="filter-dropdown-panel">
                <DualRangeSlider
                  min={0}
                  max={5000000}
                  minValue={priceMin ? Number(priceMin) : 0}
                  maxValue={priceMax ? Number(priceMax) : 5000000}
                  onChange={(min, max) => {
                    setPriceMin(min);
                    setPriceMax(max);
                  }}
                  step={10000}
                  label="Price Range"
                  icon="💰"
                  formatValue={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                    return val;
                  }}
                />
                <div className="filter-dropdown-actions">
                  <button
                    className="filter-dropdown-btn"
                    onClick={() => setShowPriceDropdown(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Bedrooms */}
          <select
            className="filter-bar-select filter-icon-only"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            title="Bedrooms"
          >
            <option value="">🛏️</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
          
          {/* Bathrooms */}
          <select
            className="filter-bar-select filter-icon-only"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            title="Bathrooms"
          >
            <option value="">🚿</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
          
          {/* Area Range Dropdown */}
          <div className="filter-dropdown" ref={areaDropdownRef}>
            <button
              className="filter-bar-select filter-icon-only"
              onClick={() => setShowAreaDropdown(!showAreaDropdown)}
              title="Area Range"
            >
              <span style={{fontSize: '1.5rem'}}>📏</span>
              {(areaMin || areaMax) && (
                <span className="filter-active-badge">✓</span>
              )}
            </button>
            {showAreaDropdown && (
              <div className="filter-dropdown-panel">
                <DualRangeSlider
                  min={0}
                  max={1000}
                  minValue={areaMin ? Number(areaMin) : 0}
                  maxValue={areaMax ? Number(areaMax) : 1000}
                  onChange={(min, max) => {
                    setAreaMin(min);
                    setAreaMax(max);
                  }}
                  step={10}
                  label="Area Range"
                  icon="📏"
                  formatValue={(val) => `${val}m²`}
                />
                <div className="filter-dropdown-actions">
                  <button
                    className="filter-dropdown-btn"
                    onClick={() => setShowAreaDropdown(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
          
          
          {/* Show Sold Checkbox */}
          <label className="filter-checkbox-label" title="Show Sold Properties">
            <input
              type="checkbox"
              checked={showSold}
              onChange={(e) => {
                setShowSold(e.target.checked);
                const params = new URLSearchParams(location.search);
                if (e.target.checked) {
                  params.set('showSold', 'true');
                } else {
                  params.delete('showSold');
                }
                navigate(`/search?${params.toString()}`);
              }}
            />
            <span>Show Sold</span>
          </label>
          
          {/* Parking Checkbox */}
          <label className="filter-checkbox-label" title="Has Parking">
            <input
              type="checkbox"
              checked={parking}
              onChange={(e) => setParking(e.target.checked)}
            />
            <span>🅿️ Parking</span>
          </label>
          
          {/* Pets Allowed Checkbox */}
          <label className="filter-checkbox-label" title="Pets Allowed">
            <input
              type="checkbox"
              checked={petsAllowed}
              onChange={(e) => setPetsAllowed(e.target.checked)}
            />
            <span>🐕 Pets</span>
          </label>
          
          {/* Furnished Checkbox */}
          <label className="filter-checkbox-label" title="Furnished">
            <input
              type="checkbox"
              checked={furnished}
              onChange={(e) => setFurnished(e.target.checked)}
            />
            <span>🛋️ Furnished</span>
          </label>
          
          {/* Pool Checkbox */}
          <label className="filter-checkbox-label" title="Has Pool">
            <input
              type="checkbox"
              checked={pool}
              onChange={(e) => setPool(e.target.checked)}
            />
            <span>🏊 Pool</span>
          </label>
          
          {/* Gym Checkbox */}
          <label className="filter-checkbox-label" title="Has Gym">
            <input
              type="checkbox"
              checked={gym}
              onChange={(e) => setGym(e.target.checked)}
            />
            <span>💪 Gym</span>
          </label>
          
          {/* Spacer */}
          <div style={{flex: 1}}></div>
          
          {/* Clear Button */}
          <button onClick={handleClearFilters} className="filter-bar-btn filter-bar-btn-secondary">
            Clear
          </button>
          
          {/* View Mode Toggle - Far Right */}
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('map');
                const params = new URLSearchParams(location.search);
                params.set('view', 'map');
                navigate(`/search?${params.toString()}`);
              }}
              title="Map View"
            >
              Map
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('list');
                const params = new URLSearchParams(location.search);
                params.set('view', 'list');
                navigate(`/search?${params.toString()}`);
              }}
              title="List View"
            >
              List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
