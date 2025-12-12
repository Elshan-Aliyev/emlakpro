import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProperties, getSavedProperties } from '../services/api';
import Badge from '../components/Badge';
import Navbar from '../components/Navbar';
import PropertyMap from '../components/PropertyMap';
import DualRangeSlider from '../components/DualRangeSlider';
import FavoriteButton from '../components/FavoriteButton';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './HomeNew.css';

const BUY_RESIDENTIAL_BG = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80';
const BUY_COMMERCIAL_BG = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80';
const RENT_LONGTERM_BG = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80';
const RENT_SHORTTERM_BG = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80';

// Helper function to get verification badge info
const getVerificationBadge = (accountType) => {
  switch (accountType) {
    case 'unverified-user':
      return { text: 'Unverified User', className: 'badge-unverified' };
    case 'verified-user':
      return { text: 'Verified User', className: 'badge-verified-user' };
    case 'verified-seller':
      return { text: 'Verified Seller', className: 'badge-verified-seller' };
    case 'realtor':
      return { text: 'Realtor', className: 'badge-realtor' };
    case 'corporate':
      return { text: 'Corporate', className: 'badge-corporate' };
    default:
      return { text: 'Unverified User', className: 'badge-unverified' };
  }
};

const Home = () => {
  const { isBuyMode } = useTheme();
  const { user } = useAuth();
  
  // Primary state - sync with theme
  const [mode, setMode] = useState(isBuyMode ? 'buy' : 'rent');
  const [subMode, setSubMode] = useState('residential'); // 'residential' | 'commercial' | 'long' | 'short'
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [buildingSize, setBuildingSize] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [areaMin, setAreaMin] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data state
  const [properties, setProperties] = useState([]);
  const [savedPropertyIds, setSavedPropertyIds] = useState(new Set());
  
  // Image slider state - tracks current image index for each property
  const [imageIndices, setImageIndices] = useState({});
  
  // View state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await getProperties();
        setProperties(res.data || []);
      } catch (err) {
        console.error('Error fetching properties', err);
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

  // Helper function to get image URL (handles both object and string formats)
  const getImageUrl = (imageData, size = 'thumbnail') => {
    if (!imageData) return null;
    if (typeof imageData === 'string') return imageData;
    return imageData[size] || imageData.thumbnail || imageData.medium || imageData.full || null;
  };

  // Image navigation handlers
  const handlePrevImage = (e, propertyId, imagesLength) => {
    e.preventDefault();
    e.stopPropagation();
    setImageIndices(prev => {
      const currentIndex = prev[propertyId] || 0;
      const newIndex = currentIndex === 0 ? imagesLength - 1 : currentIndex - 1;
      return { ...prev, [propertyId]: newIndex };
    });
  };

  const handleNextImage = (e, propertyId, imagesLength) => {
    e.preventDefault();
    e.stopPropagation();
    setImageIndices(prev => {
      const currentIndex = prev[propertyId] || 0;
      const newIndex = (currentIndex + 1) % imagesLength;
      return { ...prev, [propertyId]: newIndex };
    });
  };

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

  // Dynamic background based on mode and submode
  const getBackgroundImage = () => {
    if (mode === 'buy') {
      return subMode === 'residential' ? BUY_RESIDENTIAL_BG : BUY_COMMERCIAL_BG;
    } else {
      return subMode === 'long' ? RENT_LONGTERM_BG : RENT_SHORTTERM_BG;
    }
  };

  const handleSearch = (e) => {
    if (e) {
      e.preventDefault();
    } else {
      // No event means this was called programmatically, not by user - abort
      return;
    }
    
    // Build search params
    const params = new URLSearchParams();
    params.set('type', mode);
    
    // Add listingStatus based on mode
    if (mode === 'buy') {
      params.set('listingStatus', 'for-sale');
      // Add purpose for buy mode
      if (subMode === 'residential') {
        params.set('purpose', 'residential');
      } else if (subMode === 'commercial') {
        params.set('purpose', 'commercial');
      }
    } else if (mode === 'rent') {
      params.set('listingStatus', 'for-rent');
      // Add rental term for rent mode
      if (subMode === 'long') {
        params.set('rentalTerm', 'long-term');
      } else if (subMode === 'short') {
        params.set('rentalTerm', 'short-term');
      }
    }
    
    // Default to Azerbaijan if no location specified
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.set('country', 'Azerbaijan');
    }
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (bedrooms) params.set('bedrooms', bedrooms);
    if (bathrooms) params.set('bathrooms', bathrooms);
    if (buildingSize) params.set('buildingSize', buildingSize);
    if (maxGuests) params.set('maxGuests', maxGuests);
    if (propertyType) params.set('propertyType', propertyType);
    if (areaMin) params.set('areaMin', areaMin);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    
    // Navigate to search page with filters
    navigate(`/search?${params.toString()}`);
  };

  const featuredProps = useMemo(() => {
    return properties
      .sort((a, b) => new Date(b.createdAt || b.dateAdded) - new Date(a.createdAt || a.dateAdded))
      .slice(0, 8);
  }, [properties]);

  // Sync mode with theme changes
  useEffect(() => {
    setMode(isBuyMode ? 'buy' : 'rent');
  }, [isBuyMode]);

  // Change submode when mode changes
  useEffect(() => {
    if (mode === 'buy') {
      setSubMode('residential');
    } else {
      setSubMode('long');
    }
  }, [mode]);

  return (
    <div className="home-container">
      <Navbar />
      
      {/* Hero Section */}
      <section 
        className="hero-section"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url(${getBackgroundImage()})`,
        }}
      >
        <div className="hero-content">
          <h1 className="hero-title">Find Your Perfect Property</h1>
          <p className="hero-subtitle">Search thousands of properties for sale and rent</p>
          
          {/* Floating Search Card */}
          <div className="search-card glass-card">
            {/* Submode Toggle: Residential / Commercial OR Long / Short */}
            <div className="submode-toggle">
              {mode === 'buy' ? (
                <>
                  <button
                    type="button"
                    className={subMode === 'residential' ? 'active' : ''}
                    onClick={() => setSubMode('residential')}
                  >
                    🏠 Residential
                  </button>
                  <button
                    type="button"
                    className={subMode === 'commercial' ? 'active' : ''}
                    onClick={() => setSubMode('commercial')}
                  >
                    🏢 Commercial
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={subMode === 'long' ? 'active' : ''}
                    onClick={() => setSubMode('long')}
                  >
                    📅 Long Term
                  </button>
                  <button
                    type="button"
                    className={subMode === 'short' ? 'active' : ''}
                    onClick={() => setSubMode('short')}
                  >
                    ⏱️ Short Term
                  </button>
                </>
              )}
            </div>
            {/* Main Search Input */}
            <form onSubmit={handleSearch} className="search-form" autoComplete="off">
              {/* Location Input - Full Width First Row */}
              <div className="search-input-container search-full-width">
                <span className="search-icon">🔍</span>
                <input 
                  type="text"
                  placeholder="Enter city, region, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch(e);
                    }
                  }}
                  className="search-input-main"
                />
              </div>

              {/* Second Row: Dynamic inputs based on mode/subMode - all in one row */}
              <div className="additional-inputs">
                <div className="input-group">
                  <label>Price Range</label>
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
                    label=""
                    formatValue={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                      return val;
                    }}
                  />
                </div>
                
                <div className="input-group">
                  <label>Property Type</label>
                  <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    <option value="">All Types</option>
                    {(mode === 'buy' && subMode === 'residential') && (
                      <>
                        <option value="apartment">Apartment</option>
                        <option value="house">House</option>
                        <option value="villa">Villa</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="penthouse">Penthouse</option>
                        <option value="studio">Studio</option>
                        <option value="duplex">Duplex</option>
                      </>
                    )}
                    {(mode === 'buy' && subMode === 'commercial') && (
                      <>
                        <option value="office">Office</option>
                        <option value="commercial-retail">Commercial Retail</option>
                        <option value="commercial-unit">Commercial Unit</option>
                        <option value="industrial">Industrial</option>
                        <option value="warehouse">Warehouse</option>
                        <option value="shop">Shop</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="land">Land</option>
                        <option value="farm">Farm</option>
                      </>
                    )}
                    {(mode === 'rent' && subMode === 'long') && (
                      <>
                        <option value="apartment">Apartment</option>
                        <option value="house">House</option>
                        <option value="villa">Villa</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="studio">Studio</option>
                        <option value="duplex">Duplex</option>
                        <option value="penthouse">Penthouse</option>
                      </>
                    )}
                    {(mode === 'rent' && subMode === 'short') && (
                      <>
                        {/* Short-term Residential */}
                        <option value="apartment">Apartment</option>
                        <option value="house">House</option>
                        <option value="villa">Villa</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="studio">Studio</option>
                        {/* Unique Short-term Properties */}
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
                </div>

                {/* Show bedrooms only for residential buy/rent */}
                {(mode === 'buy' && subMode === 'residential') || mode === 'rent' ? (
                  <div className="input-group">
                    <label>🛏️</label>
                    <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
                      <option value="">Any</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                    </select>
                  </div>
                ) : null}

                {/* Show bathrooms only for residential buy/rent */}
                {(mode === 'buy' && subMode === 'residential') || mode === 'rent' ? (
                  <div className="input-group">
                    <label>🚿</label>
                    <select value={bathrooms} onChange={(e) => setBathrooms(e.target.value)}>
                      <option value="">Any</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                    </select>
                  </div>
                ) : null}

                {/* Date filters for rent - inline with bedrooms */}
                {mode === 'rent' && (
                  <>
                    {subMode === 'long' && (
                      <div className="input-group">
                        <label>📅</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          placeholder="Start Date"
                        />
                      </div>
                    )}
                    {subMode === 'short' && (
                      <>
                        <div className="input-group">
                          <label>📅</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            placeholder="Start Date"
                          />
                        </div>
                        <div className="input-group">
                          <label>📅</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            placeholder="End Date"
                          />
                        </div>
                        <div className="input-group">
                          <label>👥</label>
                          <select value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)}>
                            <option value="">Any</option>
                            <option value="1">1 guest</option>
                            <option value="2">2 guests</option>
                            <option value="3">3 guests</option>
                            <option value="4">4 guests</option>
                            <option value="5">5+ guests</option>
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Building size for commercial buy */}
                {mode === 'buy' && subMode === 'commercial' && (
                  <div className="input-group">
                    <label>🏢 Size (sqm)</label>
                    <input
                      type="number"
                      value={buildingSize}
                      onChange={(e) => setBuildingSize(e.target.value)}
                      placeholder="Min size"
                      min="0"
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="search-btn-main">
                Search Properties
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Content Below Hero */}
      <div className="content-container">
        {/* Featured Properties */}
        <section className="featured-section">
          <h2>Featured Properties</h2>
          <div className="properties-grid">
            {featuredProps.map((p) => (
              <Link to={`/search/${p.address?.city || p.location?.city || 'Azerbaijan'}/${p._id}`} key={p._id} className="property-card">
                <div className="property-card-badge">
                  <Badge type={p.listingBadge || 'for-sale-by-owner'} size="small" />
                </div>
                <FavoriteButton 
                  propertyId={p._id}
                  initialIsFavorite={savedPropertyIds.has(p._id)}
                  onToggle={handleFavoriteToggle}
                />
                <div className="property-card-image">
                  {p.images && p.images.length > 0 ? (
                    <>
                      <img 
                        src={getImageUrl(p.images[imageIndices[p._id] || 0], 'thumbnail')} 
                        alt={p.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {p.images.length > 1 && (
                        <>
                          <button 
                            className="image-nav-btn image-nav-prev"
                            onClick={(e) => handlePrevImage(e, p._id, p.images.length)}
                            aria-label="Previous image"
                          >
                            ‹
                          </button>
                          <button 
                            className="image-nav-btn image-nav-next"
                            onClick={(e) => handleNextImage(e, p._id, p.images.length)}
                            aria-label="Next image"
                          >
                            ›
                          </button>
                          <div className="image-indicator">
                            {(imageIndices[p._id] || 0) + 1} / {p.images.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="image-placeholder">📷</div>
                  )}
                </div>
                <div className="property-card-content">
                  <div className="property-price">{p.currency || 'AZN'} {p.price?.toLocaleString()}</div>
                  <h3 className="property-title">{p.title}</h3>
                  {p.ownerId?.accountType && (
                    <div className={`verification-badge ${getVerificationBadge(p.ownerId.accountType).className}`}>
                      {getVerificationBadge(p.ownerId.accountType).text}
                    </div>
                  )}
                  <p className="property-location">📍 {typeof p.location === 'string' ? p.location : (typeof p.city === 'string' ? p.city : p.country || 'Location')}</p>
                  <div className="property-features">
                    {p.bedrooms > 0 && <span>🛏️ {p.bedrooms}</span>}
                    {p.bathrooms > 0 && <span>🚿 {p.bathrooms}</span>}
                    {p.builtUpArea && <span>📐 {p.builtUpArea} m²</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cities Section */}
        <section className="cities-section">
          <h2>Explore Popular Cities</h2>
          <div className="cities-grid">
            {['Baku', 'Ganja', 'Sumqayit', 'Mingachevir', 'Lankaran', 'Sheki'].map(city => (
              <Link to={`/search?location=${city}`} key={city} className="city-card">
                <div className="city-card-image">📍</div>
                <h3>{city}</h3>
                <p>View properties</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="features-section">
          <h2>Why Choose Əmlak Professionalları</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">✓</div>
              <h3>Verified Listings</h3>
              <p>All properties are verified for authenticity</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Fast Communication</h3>
              <p>Direct contact with owners and agents</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Transactions</h3>
              <p>Safe and protected property dealings</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Search</h3>
              <p>Smart property matching coming soon</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Explore Our Services</h2>
            <p>Discover comprehensive real estate solutions tailored to your needs</p>
            <Link to="/services" className="cta-btn">Explore Services</Link>
          </div>
        </section>

        {/* User-specific banners */}
        {!user && (
          <section className="user-banner signup-banner">
            <div className="banner-content">
              <h3>Join Our Community</h3>
              <p>Create an account to access exclusive features and personalized recommendations</p>
              <Link to="/signup" className="banner-btn primary">Sign Up Now</Link>
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
