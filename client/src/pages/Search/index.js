import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getProperties, getSavedProperties } from '../../services/api';
import PropertyMap from '../../components/PropertyMap';
import PropertyModal from '../../components/PropertyModal';
import FilterBar from '../../components/FilterBar';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import FavoriteButton from '../../components/FavoriteButton';
import './Search.css';

const Search = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [savedPropertyIds, setSavedPropertyIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [mapHidden, setMapHidden] = useState(window.innerWidth < 768);
  const [hoveredPropertyId, setHoveredPropertyId] = useState(null);
  const [mapCenter, setMapCenter] = useState([49.8671, 40.4093]); // Baku
  const [mapZoom, setMapZoom] = useState(12);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  // Filters
  const [listingType, setListingType] = useState(searchParams.get('listingStatus') === 'for-sale' ? 'buy' : searchParams.get('listingStatus') === 'for-rent' ? 'rent' : 'buy');
  const [purpose, setPurpose] = useState(searchParams.get('purpose') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') || '');
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');
  const [bathrooms, setBathrooms] = useState(searchParams.get('bathrooms') || '');
  const [areaMin, setAreaMin] = useState(searchParams.get('areaMin') || '');
  const [areaMax, setAreaMax] = useState(searchParams.get('areaMax') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'map');
  
  // More filters
  const [parking, setParking] = useState(false);
  const [balcony, setBalcony] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [newConstruction, setNewConstruction] = useState(false);
  const [ownerListedOnly, setOwnerListedOnly] = useState(false);
  const [showSold, setShowSold] = useState(false);

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const res = await getProperties();
        setProperties(res.data || []);
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
    
    // Fetch saved properties if user is logged in
    const fetchSavedProperties = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await getSavedProperties(token);
          const savedIds = new Set(res.data.map(p => p._id));
          setSavedPropertyIds(savedIds);
        } catch (err) {
          console.error('Error fetching saved properties', err);
        }
      }
    };
    fetchSavedProperties();
  }, []);

  // Sync state with URL params when they change - read from URL always
  useEffect(() => {
    const listingStatus = searchParams.get('listingStatus');
    const urlPurpose = searchParams.get('purpose');
    const urlPropertyType = searchParams.get('propertyType');
    const urlBedrooms = searchParams.get('bedrooms');
    const urlBathrooms = searchParams.get('bathrooms');
    const urlPriceMin = searchParams.get('priceMin');
    const urlPriceMax = searchParams.get('priceMax');
    const urlAreaMin = searchParams.get('areaMin');
    const urlAreaMax = searchParams.get('areaMax');
    const urlSortBy = searchParams.get('sortBy');
    const urlShowSold = searchParams.get('showSold');
    const urlView = searchParams.get('view');
    const urlParking = searchParams.get('parking');
    const urlBalcony = searchParams.get('balcony');
    const urlPetFriendly = searchParams.get('petFriendly');
    const urlFurnished = searchParams.get('furnished');
    const urlNewConstruction = searchParams.get('newConstruction');
    const urlOwnerListedOnly = searchParams.get('ownerListedOnly');

    if (listingStatus === 'for-sale') {
      setListingType('buy');
    } else if (listingStatus === 'for-rent') {
      setListingType('rent');
    } else if (listingStatus === 'new-project') {
      setListingType('buy');
    }

    setPurpose(urlPurpose || '');
    setPropertyType(urlPropertyType || '');
    setBedrooms(urlBedrooms || '');
    setBathrooms(urlBathrooms || '');
    setPriceMin(urlPriceMin || '');
    setPriceMax(urlPriceMax || '');
    setAreaMin(urlAreaMin || '');
    setAreaMax(urlAreaMax || '');
    setSortBy(urlSortBy || 'newest');
    setShowSold(urlShowSold === 'true');
    setViewMode(urlView || 'map');
    setParking(urlParking === 'true');
    setBalcony(urlBalcony === 'true');
    setPetFriendly(urlPetFriendly === 'true');
    setFurnished(urlFurnished === 'true');
    setNewConstruction(urlNewConstruction === 'true');
    setOwnerListedOnly(urlOwnerListedOnly === 'true');
  }, [searchParams]);

  // Apply filters
  useEffect(() => {
    let filtered = [...properties];

    // Check for new-project status from URL
    const listingStatus = searchParams.get('listingStatus');
    
    // Listing type filter
    if (listingStatus === 'new-project') {
      filtered = filtered.filter(p => p.listingStatus === 'new-project');
    } else if (listingType === 'buy') {
      filtered = filtered.filter(p => p.listingStatus === 'for-sale');
    } else if (listingType === 'rent') {
      filtered = filtered.filter(p => p.listingStatus === 'for-rent');
    }
    
    // Show sold properties if checkbox is checked
    if (showSold) {
      // Don't filter out sold properties
    } else {
      // Filter out sold properties by default
      filtered = filtered.filter(p => p.status !== 'sold');
    }

    // Purpose filter (residential vs commercial)
    if (purpose) {
      // If purpose is set, filter by purpose
      // Also check propertyType as fallback for properties without purpose field
      filtered = filtered.filter(p => {
        if (p.purpose) {
          return p.purpose === purpose;
        }
        // Fallback: determine purpose from propertyType
        const commercialTypes = ['commercial-retail', 'commercial-unit', 'office', 'industrial', 'warehouse', 'shop', 'restaurant'];
        const isCommercial = commercialTypes.includes(p.propertyType);
        return purpose === 'commercial' ? isCommercial : !isCommercial;
      });
      console.log('After purpose filter:', filtered.length, '(looking for purpose:', purpose, ')');
      console.log('Sample property purposes:', filtered.slice(0, 3).map(p => ({ title: p.title, purpose: p.purpose, propertyType: p.propertyType })));
    }

    // Property type filter
    if (propertyType) {
      filtered = filtered.filter(p => p.propertyType === propertyType);
      console.log('After property type filter:', filtered.length);
    }

    // Price filter
    if (priceMin) {
      filtered = filtered.filter(p => p.price >= Number(priceMin));
    }
    if (priceMax) {
      filtered = filtered.filter(p => p.price <= Number(priceMax));
    }

    // Bedrooms filter
    if (bedrooms) {
      filtered = filtered.filter(p => p.bedrooms >= Number(bedrooms));
    }

    // Bathrooms filter
    if (bathrooms) {
      filtered = filtered.filter(p => p.bathrooms >= Number(bathrooms));
    }

    // Area filter
    if (areaMin) {
      filtered = filtered.filter(p => (p.builtUpArea || 0) >= Number(areaMin));
    }
    if (areaMax) {
      filtered = filtered.filter(p => (p.builtUpArea || 0) <= Number(areaMax));
    }

    // More filters
    if (parking) {
      filtered = filtered.filter(p => p.parking > 0);
    }
    if (balcony) {
      filtered = filtered.filter(p => p.balcony);
    }
    if (petFriendly) {
      filtered = filtered.filter(p => p.petFriendly);
    }
    if (furnished) {
      filtered = filtered.filter(p => p.furnishing === 'furnished');
    }
    if (newConstruction) {
      filtered = filtered.filter(p => p.constructionStatus === 'ready' && (new Date().getFullYear() - (p.yearBuilt || 0)) <= 2);
    }
    if (ownerListedOnly) {
      filtered = filtered.filter(p => p.listingBadge === 'for-sale-by-owner');
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'beds') {
      filtered.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));
    } else if (sortBy === 'area') {
      filtered.sort((a, b) => (b.builtUpArea || 0) - (a.builtUpArea || 0));
    }

    setFilteredProperties(filtered);
  }, [properties, listingType, purpose, propertyType, priceMin, priceMax, bedrooms, bathrooms, areaMin, areaMax, sortBy, parking, balcony, petFriendly, furnished, newConstruction, ownerListedOnly, showSold, searchParams]);

  // Favorite toggle handler
  const handleFavoriteToggle = (propertyId, isFavorite) => {
    setSavedPropertyIds(prev => {
      const newSet = new Set(prev);
      if (isFavorite) {
        newSet.add(propertyId);
      } else {
        newSet.delete(propertyId);
      }
      return newSet;
    });
  };

  // Update URL with current filter state
  const updateURL = useCallback((updates) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined || value === false) {
        params.delete(key);
      } else if (value === true) {
        params.set(key, 'true');
      } else {
        params.set(key, value);
      }
    });
    
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Clear individual filter
  const clearFilter = useCallback((filterName) => {
    const updates = { [filterName]: '' };
    updateURL(updates);
  }, [updateURL]);

  // Clear all filters
  const clearFilters = () => {
    const listingStatus = searchParams.get('listingStatus');
    const purpose = searchParams.get('purpose');
    
    const params = new URLSearchParams();
    if (listingStatus) params.set('listingStatus', listingStatus);
    if (purpose) params.set('purpose', purpose);
    
    setSearchParams(params, { replace: true });
  };

  const handleLocationSelect = useCallback((location) => {
    if (location.center) {
      setMapCenter(location.center);
      setMapZoom(14);
    }
  }, []);

  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === 'string') return image;
    return image.thumbnail || image.medium || image.large;
  };

  return (
    <div className="search-page">
      {/* Filter Bar */}
      <FilterBar />
      
      {/* Main Content */}
      <div className="search-content">
        {/* Listings Panel - Show in list view or alongside map */}
        {viewMode === 'list' && (
          <div className="listings-panel full-width list-view">
            {/* Header */}
            <div className="listings-info">
              <h2>{filteredProperties.length} Properties Found</h2>
            </div>

            {/* Listings Grid for List View */}
            <div className="listings-grid">
              {loading ? (
                <div className="loading-state">Loading properties...</div>
              ) : filteredProperties.length === 0 ? (
                <div className="empty-state">
                  <p>No properties found matching your criteria.</p>
                  <Button onClick={clearFilters}>Clear Filters</Button>
                </div>
              ) : (
                filteredProperties.map((property, index) => (
                  <div
                    key={property._id}
                    className="listing-card-grid"
                    onClick={() => navigate(`/properties/${property._id}`)}
                  >
                    {/* Sponsored Tag */}
                    {property.isSponsored && index % 10 === 0 && (
                      <div className="sponsored-tag">SPONSORED</div>
                    )}

                    <div className="listing-card-image">
                      {property.images && property.images.length > 0 ? (
                        <img src={getImageUrl(property.images[0])} alt={property.title} />
                      ) : (
                        <div className="image-placeholder">📷</div>
                      )}
                      <div className="listing-badge">
                        <Badge type={property.listingBadge || 'for-sale-by-owner'} size="small" />
                      </div>
                      <div className="listing-favorite">
                        <FavoriteButton
                          propertyId={property._id}
                          initialIsFavorite={savedPropertyIds.has(property._id)}
                          onToggle={handleFavoriteToggle}
                        />
                      </div>
                    </div>

                    <div className="listing-card-content">
                      <div className="listing-price">
                        {property.currency || 'AZN'} {property.price?.toLocaleString()}
                      </div>
                      <h3 className="listing-title">{property.title}</h3>
                      <p className="listing-address">📍 {property.location || property.city}</p>
                      <div className="listing-features">
                        {property.bedrooms > 0 && <span>🛏️ {property.bedrooms} beds</span>}
                        {property.bathrooms > 0 && <span>🚿 {property.bathrooms} baths</span>}
                        {property.builtUpArea && <span>📐 {property.builtUpArea} m²</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {/* Map View Layout */}
        {viewMode === 'map' && (
          <>
            <div className={`listings-panel ${mapHidden ? 'full-width' : ''}`}>
              {/* Header - Non-sticky */}
              <div className="listings-info">
                <h2>{filteredProperties.length} Properties Found</h2>
              </div>

              {/* Listings */}
              <div className="listings-scroll">
                {loading ? (
                  <div className="loading-state">Loading properties...</div>
                ) : filteredProperties.length === 0 ? (
                  <div className="empty-state">
                    <p>No properties found matching your criteria.</p>
                    <Button onClick={clearFilters}>Clear Filters</Button>
                  </div>
                ) : (
                  filteredProperties.map((property, index) => (
                    <div
                      key={property._id}
                      className={`listing-card ${hoveredPropertyId === property._id ? 'highlighted' : ''}`}
                      onMouseEnter={() => setHoveredPropertyId(property._id)}
                      onMouseLeave={() => setHoveredPropertyId(null)}
                      onClick={() => navigate(`/properties/${property._id}`)}
                    >
                      {/* Sponsored Tag */}
                      {property.isSponsored && index % 10 === 0 && (
                        <div className="sponsored-tag">SPONSORED</div>
                      )}

                      <div className="listing-card-image">
                        {property.images && property.images.length > 0 ? (
                          <img src={getImageUrl(property.images[0])} alt={property.title} />
                        ) : (
                          <div className="image-placeholder">📷</div>
                        )}
                        <div className="listing-badge">
                          <Badge type={property.listingBadge || 'for-sale-by-owner'} size="small" />
                        </div>
                        <div className="listing-favorite">
                          <FavoriteButton
                            propertyId={property._id}
                            initialIsFavorite={savedPropertyIds.has(property._id)}
                            onToggle={handleFavoriteToggle}
                          />
                        </div>
                      </div>

                      <div className="listing-card-content">
                        <div className="listing-price">
                          {property.currency || 'AZN'} {property.price?.toLocaleString()}
                        </div>
                        <h3 className="listing-title">{property.title}</h3>
                        <p className="listing-address">📍 {property.location || property.city}</p>
                        <div className="listing-features">
                          {property.bedrooms > 0 && <span>🛏️ {property.bedrooms} beds</span>}
                          {property.bathrooms > 0 && <span>🚿 {property.bathrooms} baths</span>}
                          {property.builtUpArea && <span>📐 {property.builtUpArea} m²</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Map Panel */}
            {!mapHidden && (
              <div className="map-panel">
                <PropertyMap
                  properties={filteredProperties}
                  height="100%"
                  center={mapCenter}
                  zoom={mapZoom}
                  onPropertySelect={(property) => setSelectedProperty(property)}
                  highlightedPropertyId={hoveredPropertyId}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Property Modal */}
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
};

export default Search;
