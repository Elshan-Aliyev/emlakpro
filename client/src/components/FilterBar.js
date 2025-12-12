import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FilterModal from './FilterModal';
import './FilterBar.css';

const FilterBar = () => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(window.innerWidth >= 768); // Collapsed on mobile by default
  const navigate = useNavigate();
  const location = useLocation();
  const isUpdatingFromURL = useRef(false);
  const isUpdatingURL = useRef(false); // Track when WE are updating the URL
  const hasInitialized = useRef(false); // Track if we've done initial sync
  
  // Initialize states empty - will be populated by useEffect
  const [propertyType, setPropertyType] = useState('');
  const [purpose, setPurpose] = useState(''); // residential or commercial
  const [rentalTerm, setRentalTerm] = useState(''); // long-term or short-term (for rent)
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [areaMin, setAreaMin] = useState('');
  const [areaMax, setAreaMax] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSold, setShowSold] = useState(false);
  const [viewMode, setViewMode] = useState('map');
  const [parking, setParking] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [pool, setPool] = useState(false);
  const [gym, setGym] = useState(false);
  const [yearBuiltMin, setYearBuiltMin] = useState('');
  const [yearBuiltMax, setYearBuiltMax] = useState('');
  const [stories, setStories] = useState('');
  const [view, setView] = useState('');
  const [parkingSpots, setParkingSpots] = useState('');
  const [listedSince, setListedSince] = useState('');
  const [keywords, setKeywords] = useState('');
  
  // Sync FilterBar state with URL changes (when URL is updated externally)
  useEffect(() => {
    // Skip if WE just updated the URL (unless it's the first initialization)
    if (isUpdatingURL.current && hasInitialized.current) {
      isUpdatingURL.current = false;
      return;
    }
    
    hasInitialized.current = true;
    isUpdatingFromURL.current = true;
    const params = new URLSearchParams(location.search);
    
    setPropertyType(params.get('propertyType') || '');
    setPurpose(params.get('purpose') || '');
    setRentalTerm(params.get('rentalTerm') || '');
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
    setYearBuiltMin(params.get('yearBuiltMin') || '');
    setYearBuiltMax(params.get('yearBuiltMax') || '');
    setStories(params.get('stories') || '');
    setView(params.get('view') || '');
    setParkingSpots(params.get('parkingSpots') || '');
    setListedSince(params.get('listedSince') || '');
    setKeywords(params.get('keywords') || '');
    
    // Use requestAnimationFrame to ensure this runs after all state updates complete
    requestAnimationFrame(() => {
      isUpdatingFromURL.current = false;
    });
  }, [location.search]);
  
  // Only update URL when filters change AND user is not currently being synced from URL
  useEffect(() => {
    if (isUpdatingFromURL.current) return; // Prevent circular updates during URL sync
    
    // Only update URL if we're on the search page
    if (!location.pathname.startsWith('/search')) return;
    
    // Add a small delay to batch multiple rapid changes together
    const timeoutId = setTimeout(() => {
      const currentParams = new URLSearchParams(location.search);
      const newParams = new URLSearchParams(location.search);
      
      if (propertyType) newParams.set('propertyType', propertyType);
      else newParams.delete('propertyType');
      
      if (purpose) newParams.set('purpose', purpose);
      else newParams.delete('purpose');
      
      if (rentalTerm) newParams.set('rentalTerm', rentalTerm);
      else newParams.delete('rentalTerm');
      
      if (priceMin) newParams.set('priceMin', priceMin);
      else newParams.delete('priceMin');
      
      if (priceMax) newParams.set('priceMax', priceMax);
      else newParams.delete('priceMax');
      
      if (bedrooms) newParams.set('bedrooms', bedrooms);
      else newParams.delete('bedrooms');
      
      if (bathrooms) newParams.set('bathrooms', bathrooms);
      else newParams.delete('bathrooms');
      
      if (areaMin) newParams.set('areaMin', areaMin);
      else newParams.delete('areaMin');
      
      if (areaMax) newParams.set('areaMax', areaMax);
      else newParams.delete('areaMax');
      
      if (yearBuiltMin) newParams.set('yearBuiltMin', yearBuiltMin);
      else newParams.delete('yearBuiltMin');
      
      if (yearBuiltMax) newParams.set('yearBuiltMax', yearBuiltMax);
      else newParams.delete('yearBuiltMax');
      
      if (stories) newParams.set('stories', stories);
      else newParams.delete('stories');
      
      if (view) newParams.set('view', view);
      else newParams.delete('view');
      
      if (parkingSpots) newParams.set('parkingSpots', parkingSpots);
      else newParams.delete('parkingSpots');
      
      if (listedSince) newParams.set('listedSince', listedSince);
      else newParams.delete('listedSince');
      
      if (keywords) newParams.set('keywords', keywords);
      else newParams.delete('keywords');
      
      // Only navigate if the URL would actually change
      const currentStr = currentParams.toString();
      const newStr = newParams.toString();
      
      if (currentStr !== newStr) {
        isUpdatingURL.current = true; // Mark that WE are updating the URL
        navigate(`${location.pathname}?${newStr}`, { replace: true });
        isUpdatingURL.current = false;
      }
    }, 0); // Instant update
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyType, purpose, rentalTerm, priceMin, priceMax, bedrooms, bathrooms, areaMin, areaMax, parking, petsAllowed, furnished, pool, gym, yearBuiltMin, yearBuiltMax, stories, view, parkingSpots, listedSince, keywords, location.pathname]);

  // Clear propertyType when purpose or rentalTerm changes to avoid incompatible selections
  useEffect(() => {
    if (isUpdatingFromURL.current) return; // Don't clear during URL sync
    setPropertyType('');
  }, [purpose, rentalTerm]);

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
    
    if (yearBuiltMin) params.set('yearBuiltMin', yearBuiltMin);
    else params.delete('yearBuiltMin');
    
    if (yearBuiltMax) params.set('yearBuiltMax', yearBuiltMax);
    else params.delete('yearBuiltMax');
    
    if (stories) params.set('stories', stories);
    else params.delete('stories');
    
    if (view) params.set('view', view);
    else params.delete('view');
    
    if (parkingSpots) params.set('parkingSpots', parkingSpots);
    else params.delete('parkingSpots');
    
    if (listedSince) params.set('listedSince', listedSince);
    else params.delete('listedSince');
    
    if (keywords) params.set('keywords', keywords);
    else params.delete('keywords');
    
    navigate(`${location.pathname}?${params.toString()}`);
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
    setYearBuiltMin('');
    setYearBuiltMax('');
    setStories('');
    setView('');
    setParkingSpots('');
    setListedSince('');
    setKeywords('');
    
    // Preserve listingStatus and purpose when clearing
    const params = new URLSearchParams();
    const urlParams = new URLSearchParams(location.search);
    const listingStatus = urlParams.get('listingStatus');
    const purpose = urlParams.get('purpose');
    if (listingStatus) params.set('listingStatus', listingStatus);
    if (purpose) params.set('purpose', purpose);
    
    navigate(`${location.pathname}?${params.toString()}`);
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
              navigate(`${location.pathname}?${params.toString()}`);
            }}
            title="Sort By"
          >
            <option value="newest">🕐 Newest</option>
            <option value="price-low">💵 Price: Low-High</option>
            <option value="price-high">💰 Price: High-Low</option>
            <option value="beds">🛏️ Most Bedrooms</option>
            <option value="area">📏 Largest Area</option>
          </select>
          
          {/* Purpose/Rental Term - Conditional based on listingStatus */}
          {(() => {
            const params = new URLSearchParams(location.search);
            const listingStatus = params.get('listingStatus');
            
            // For rent mode
            if (listingStatus === 'for-rent') {
              return (
                <>
                  {/* Residential/Commercial for Rent */}
                  <select
                    className="filter-bar-select filter-bar-hide-mobile"
                    value={purpose}
                    onChange={(e) => {
                      setPurpose(e.target.value);
                      // Reset rental term when purpose changes
                      if (e.target.value !== 'residential') {
                        setRentalTerm('');
                      }
                    }}
                    title="Purpose"
                  >
                    <option value="">🏢 Purpose</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                  
                  {/* Show rental term only for residential rent */}
                  {purpose === 'residential' && (
                    <select
                      className="filter-bar-select filter-bar-hide-mobile"
                      value={rentalTerm}
                      onChange={(e) => setRentalTerm(e.target.value)}
                      title="Rental Term"
                    >
                      <option value="">📅 Term</option>
                      <option value="long-term">Long Term</option>
                      <option value="short-term">Short Term</option>
                    </select>
                  )}
                </>
              );
            }
            
            // For buy mode
            if (listingStatus === 'for-sale') {
              return (
                <select
                  className="filter-bar-select filter-bar-hide-mobile"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  title="Purpose"
                >
                  <option value="">🏢 Purpose</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              );
            }
            
            return null;
          })()}
          
          {/* Property Type */}
          <select
            className="filter-bar-select filter-bar-hide-mobile"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            title="Property Type"
          >
            <option value="">🏠 Property Type</option>
            {/* Residential Buy */}
            {purpose === 'residential' && !rentalTerm && (
              <>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="townhouse">Townhouse</option>
                <option value="villa">Villa</option>
                <option value="penthouse">Penthouse</option>
                <option value="studio">Studio</option>
                <option value="duplex">Duplex</option>
              </>
            )}
            {/* Commercial Buy */}
            {purpose === 'commercial' && !rentalTerm && (
              <>
                <option value="commercial-retail">Commercial Retail</option>
                <option value="commercial-unit">Commercial Unit</option>
                <option value="office">Office</option>
                <option value="industrial">Industrial</option>
                <option value="warehouse">Warehouse</option>
                <option value="shop">Shop</option>
                <option value="restaurant">Restaurant</option>
                <option value="land">Land</option>
                <option value="farm">Farm</option>
              </>
            )}
            {/* Residential Long-term Rent */}
            {purpose === 'residential' && rentalTerm === 'long-term' && (
              <>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="townhouse">Townhouse</option>
                <option value="villa">Villa</option>
                <option value="studio">Studio</option>
                <option value="duplex">Duplex</option>
                <option value="penthouse">Penthouse</option>
              </>
            )}
            {/* Residential Short-term Rent */}
            {purpose === 'residential' && rentalTerm === 'short-term' && (
              <>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="townhouse">Townhouse</option>
                <option value="studio">Studio</option>
                <option value="cabin">🏕️ Cabin</option>
                <option value="cottage">🏠 Cottage</option>
                <option value="bungalow">🏘️ Bungalow</option>
                <option value="chalet">🏔️ Chalet</option>
                <option value="loft">🏙️ Loft</option>
                <option value="tiny-house">🏠 Tiny House</option>
                <option value="mobile-home">🚐 Mobile Home</option>
                <option value="rv">🚐 RV</option>
                <option value="camper-van">🚐 Camper Van</option>
                <option value="boat">⛵ Boat</option>
                <option value="treehouse">🌳 Treehouse</option>
                <option value="dome">🏔️ Dome</option>
                <option value="a-frame">🏔️ A-Frame</option>
                <option value="barn">🏭 Barn</option>
                <option value="castle">🏰 Castle</option>
                <option value="cave">🕳️ Cave</option>
                <option value="windmill">🌬️ Windmill</option>
                <option value="lighthouse">🏮 Lighthouse</option>
                <option value="room">🛏️ Room</option>
                <option value="shared-room">👥 Shared Room</option>
                <option value="entire-place">🏠 Entire Place</option>
              </>
            )}
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
                navigate(`${location.pathname}?${params.toString()}`);
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
                navigate(`${location.pathname}?${params.toString()}`);
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
          listingStatus: new URLSearchParams(location.search).get('listingStatus') || '',
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
          showSold,
          yearBuiltMin,
          yearBuiltMax,
          stories,
          view,
          parkingSpots,
          listedSince,
          keywords
        }}
        onFilterChange={(key, value) => {
          switch (key) {
            case 'listingStatus':
              const params = new URLSearchParams(location.search);
              if (value) params.set('listingStatus', value);
              else params.delete('listingStatus');
              navigate(`${location.pathname}?${params.toString()}`);
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
              navigate(`${location.pathname}?${sortParams.toString()}`);
              break;
            case 'showSold':
              setShowSold(value);
              break;
            case 'yearBuiltMin':
              setYearBuiltMin(value);
              break;
            case 'yearBuiltMax':
              setYearBuiltMax(value);
              break;
            case 'stories':
              setStories(value);
              break;
            case 'view':
              setView(value);
              break;
            case 'parkingSpots':
              setParkingSpots(value);
              break;
            case 'listedSince':
              setListedSince(value);
              break;
            case 'keywords':
              setKeywords(value);
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
