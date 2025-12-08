import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FilterModal from './FilterModal';
import './FilterBar.css';

const FilterBar = () => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(window.innerWidth >= 768); // Collapsed on mobile by default
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isUpdatingFromURL = useRef(false);
  
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
  
  // Sync FilterBar state with URL changes (when URL is updated externally)
  useEffect(() => {
    isUpdatingFromURL.current = true;
    const params = new URLSearchParams(location.search);
    
    setPropertyType(params.get('propertyType') || '');
    setPriceMin(params.get('priceMin') || '');
    setPriceMax(params.get('priceMax') || '');
    setBedrooms(params.get('bedrooms') || '');
    setBathrooms(params.get('bathrooms') || '');
    setAreaMin(params.get('areaMin') || '');
    setAreaMax(params.get('areaMax') || '');
    setSortBy(params.get('sortBy') || 'newest');
    setShowSold(params.get('showSold') === 'true');
    setViewMode(params.get('view') || 'map');
    setParking(params.get('parking') === 'true');
    setPetsAllowed(params.get('petsAllowed') === 'true');
    setFurnished(params.get('furnished') === 'true');
    setPool(params.get('pool') === 'true');
    setGym(params.get('gym') === 'true');
    
    setTimeout(() => {
      isUpdatingFromURL.current = false;
    }, 0);
  }, [location.search]);
  
  // Auto-apply filters when they change
  const applyFiltersAuto = () => {
    if (isUpdatingFromURL.current) return; // Prevent circular updates
    
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
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="filter-bar-mobile-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Toggle filters"
      >
        <span className={`toggle-chevron ${isExpanded ? 'expanded' : ''}`}>
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L10 10L19 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      
      <div className={`filter-bar ${isExpanded ? 'expanded' : ''}`}>
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
            className="filter-bar-select filter-bar-hide-mobile"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            title="Property Type"
          >
            <option value="">🏠 Property Type</option>
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
          
          {/* Bedrooms */}
          <select
            className="filter-bar-select filter-bar-hide-mobile"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            title="Bedrooms"
          >
            <option value="">🛏️ Beds</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
          
          {/* Bathrooms */}
          <select
            className="filter-bar-select filter-bar-hide-mobile"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            title="Bathrooms"
          >
            <option value="">🚿 Baths</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
          
          {/* Min Price */}
          <select
            className="filter-bar-select filter-bar-hide-mobile"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            title="Min Price"
          >
            <option value="">💰 Min Price</option>
            <option value="50000">$50k</option>
            <option value="100000">$100k</option>
            <option value="200000">$200k</option>
            <option value="300000">$300k</option>
            <option value="400000">$400k</option>
            <option value="500000">$500k</option>
            <option value="750000">$750k</option>
            <option value="1000000">$1M</option>
            <option value="1500000">$1.5M</option>
            <option value="2000000">$2M</option>
          </select>
          
          {/* Max Price */}
          <select
            className="filter-bar-select filter-bar-hide-mobile"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            title="Max Price"
          >
            <option value="">💰 Max Price</option>
            <option value="100000">$100k</option>
            <option value="200000">$200k</option>
            <option value="300000">$300k</option>
            <option value="400000">$400k</option>
            <option value="500000">$500k</option>
            <option value="750000">$750k</option>
            <option value="1000000">$1M</option>
            <option value="1500000">$1.5M</option>
            <option value="2000000">$2M</option>
            <option value="5000000">$5M+</option>
          </select>
          
          {/* Spacer */}
          <div style={{flex: 1}}></div>
          
          {/* Filters Button - Opens Modal */}
          <button 
            onClick={() => setShowFilterModal(true)} 
            className="filter-bar-btn"
            title="Open Filters"
          >
            <span className="filter-icon">⚙️</span> Filters
          </button>
          
          {/* Clear Button */}
          <button onClick={handleClearFilters} className="filter-bar-btn filter-bar-btn-secondary">
            Clear
          </button>
          
          {/* View Mode Toggle */}
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
      
      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={{
          listingStatus: searchParams.get('listingStatus') || '',
          propertyType,
          minPrice: priceMin,
          maxPrice: priceMax,
          minArea: areaMin,
          maxArea: areaMax,
          bedrooms,
          bathrooms,
          amenities: [
            parking && 'parking',
            petsAllowed && 'pets',
            furnished && 'furnished',
            pool && 'pool',
            gym && 'gym'
          ].filter(Boolean),
          sortBy,
          showSold
        }}
        onFilterChange={(key, value) => {
          switch (key) {
            case 'listingStatus':
              const params = new URLSearchParams(location.search);
              if (value) params.set('listingStatus', value);
              else params.delete('listingStatus');
              navigate(`/search?${params.toString()}`);
              break;
            case 'propertyType':
              setPropertyType(value);
              break;
            case 'minPrice':
              setPriceMin(value);
              break;
            case 'maxPrice':
              setPriceMax(value);
              break;
            case 'minArea':
              setAreaMin(value);
              break;
            case 'maxArea':
              setAreaMax(value);
              break;
            case 'bedrooms':
              setBedrooms(value);
              break;
            case 'bathrooms':
              setBathrooms(value);
              break;
            case 'amenities':
              // Update amenities checkboxes
              setParking(value.includes('parking'));
              setPetsAllowed(value.includes('pets'));
              setFurnished(value.includes('furnished'));
              setPool(value.includes('pool'));
              setGym(value.includes('gym'));
              break;
            case 'sortBy':
              setSortBy(value);
              const sortParams = new URLSearchParams(location.search);
              sortParams.set('sortBy', value);
              navigate(`/search?${sortParams.toString()}`);
              break;
            case 'showSold':
              setShowSold(value);
              break;
            default:
              break;
          }
        }}
        onApply={() => {
          // Apply button is clicked, filters are already applied via onFilterChange
          setShowFilterModal(false);
        }}
        onReset={handleClearFilters}
      />
      </div>
    </>
  );
};

export default FilterBar;
