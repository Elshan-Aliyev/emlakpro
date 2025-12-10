import React, { useEffect, useState, memo } from 'react';
import { getProperty, sendMessage, getSavedProperties } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import SellerInfo from '../components/SellerInfo';
import Badge from '../components/Badge';
import PropertyMap from '../components/PropertyMap';
import FavoriteButton from '../components/FavoriteButton';
import './PropertyDetail.css';

// Memoize heavy components
const MemoizedPropertyMap = memo(PropertyMap);
const MemoizedSellerInfo = memo(SellerInfo);

const PropertyDetail = ({ property: propProperty, isModal = false, onClose }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(propProperty || null);
  const [error, setError] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Helper function to safely get location string
  const getLocation = (property) => {
    if (typeof property.location === 'string') return property.location;
    if (typeof property.city === 'string') return property.city;
    if (typeof property.address === 'string') return property.address;
    if (property.location?.city && typeof property.location.city === 'string') return property.location.city;
    if (property.address?.city && typeof property.address.city === 'string') return property.address.city;
    return 'N/A';
  };

  useEffect(() => {
    if (propProperty) {
      setProperty(propProperty);
      // Check if property is in favorites
      const token = localStorage.getItem('token');
      if (token) {
        (async () => {
          try {
            const savedRes = await getSavedProperties(token);
            const isSaved = savedRes.data && Array.isArray(savedRes.data) ? savedRes.data.some(p => p._id === propProperty._id) : false;
            setIsFavorite(isSaved);
          } catch (err) {
            console.error('Error checking favorites:', err);
          }
        })();
      }
      return;
    }

    if (!id) return;

    const fetch = async () => {
      try {
        const res = await getProperty(id);
        setProperty(res.data);
        
        // Check if property is in favorites
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const savedRes = await getSavedProperties(token);
            const isSaved = savedRes.data && Array.isArray(savedRes.data) ? savedRes.data.some(p => p._id === id) : false;
            setIsFavorite(isSaved);
          } catch (err) {
            console.error('Error fetching saved properties:', err);
          }
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Error fetching property');
      }
    };
    fetch();
  }, [id]);

  const handleContact = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (isModal) {
        alert('Please login to contact the property owner. The property details will remain open.');
      } else {
        alert('Please login or register to contact the property owner');
        navigate('/login');
      }
      return;
    }
    setShowContactModal(true);
    setMessageContent('');
    setMessageError('');
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
      setMessageError('Please enter a message');
      return;
    }

    setMessageSending(true);
    setMessageError('');

    try {
      const token = localStorage.getItem('token');
      await sendMessage({
        recipientId: property.ownerId._id,
        propertyId: property._id,
        content: messageContent
      }, token);
      
      alert('Message sent successfully!');
      setShowContactModal(false);
      setMessageContent('');
    } catch (err) {
      console.error('Error sending message:', err);
      setMessageError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setMessageSending(false);
    }
  };
  
  const openContactModal = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (isModal) {
        alert('Please login or register to contact the property owner. The property details will remain open.');
      } else {
        alert('Please login or register to contact the property owner');
        navigate('/login');
      }
      return;
    }
    
    // Pre-fill message
    const defaultMessage = `I am interested in ${property.title} at ${getLocation(property)}. 
    
Listed for: ${property.currency || 'AZN'} ${property.price?.toLocaleString()}
    
Please contact me with more details.`;
    
    setMessageContent(defaultMessage);
    setShowContactModal(true);
    setMessageError('');
  };

  const getImageUrl = (image, size = 'large') => {
    if (!image) return null;
    // Handle both old format (string) and new format (object)
    if (typeof image === 'string') {
      if (image.startsWith('http')) return image;
      return `http://localhost:5000/uploads/${size}/${image}`;
    }
    if (typeof image === 'object' && image !== null) {
      return image[size] || image.large || image.medium || image.thumbnail;
    }
    return null;
  };

  const openLightbox = (index) => {
    setSelectedImageIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  if (error) return <p style={{padding: '2rem', textAlign: 'center'}}>{error}</p>;
  if (!property) return <p style={{padding: '2rem', textAlign: 'center'}}>Loading...</p>;

  const token = localStorage.getItem('token');
  let role = null;
  let currentUserId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role = payload.role;
      currentUserId = payload.id;
    } catch (e) {
      // ignore
    }
  }

  const isOwner = property.ownerId && (property.ownerId._id ? property.ownerId._id === currentUserId : property.ownerId === currentUserId);
  const isAdmin = role === 'admin' || role === 'superadmin';

  const propertyTypeMap = {
    // Residential
    'apartment': 'Apartment / Condo',
    'house': 'House',
    'villa': 'Villa',
    'townhouse': 'Townhouse',
    'penthouse': 'Penthouse',
    'studio': 'Studio',
    'duplex': 'Duplex',
    // Commercial
    'commercial-retail': 'Commercial Retail',
    'commercial-unit': 'Commercial Unit',
    'office': 'Office',
    'shop': 'Shop',
    'restaurant': 'Restaurant',
    'warehouse': 'Warehouse',
    'industrial': 'Industrial / Warehouse',
    // Land
    'land': 'Land / Plot',
    'farm': 'Farm',
    // Short-term / Unique
    'cabin': 'Cabin',
    'cottage': 'Cottage',
    'bungalow': 'Bungalow',
    'chalet': 'Chalet',
    'loft': 'Loft',
    'tiny-house': 'Tiny House',
    'mobile-home': 'Mobile Home',
    'rv': 'RV',
    'camper-van': 'Camper/Van',
    'boat': 'Boat',
    'treehouse': 'Treehouse',
    'dome': 'Dome',
    'a-frame': 'A-Frame',
    'barn': 'Barn',
    'castle': 'Castle',
    'cave': 'Cave',
    'windmill': 'Windmill',
    'lighthouse': 'Lighthouse',
    'room': 'Private Room',
    'shared-room': 'Shared Room'
  };

  const statusMap = {
    'for-sale': 'For Sale',
    'for-rent': 'For Rent',
    'new-project': 'New Project'
  };

  const hasImages = property.images && Array.isArray(property.images) && property.images.length > 0;

  return (
    <div className={`property-detail-container ${isModal ? 'modal-mode' : ''}`}>
      {/* Image Grid Gallery - Zillow Style */}
      {hasImages && (
        <div className="image-grid-gallery">
          <div className="main-grid-image" onClick={() => openLightbox(0)}>
            <img 
              src={getImageUrl(property.images[0], 'large')} 
              alt={property.title}
            />
          </div>
          <div className="grid-thumbnails">
            {property.images.slice(1, 5).map((image, index) => (
              <div 
                key={index + 1} 
                className="grid-thumb"
                onClick={() => openLightbox(index + 1)}
              >
                <img 
                  src={getImageUrl(image, 'medium')} 
                  alt={`${property.title} ${index + 2}`}
                />
                {index === 3 && property.images.length > 5 && (
                  <div className="see-all-overlay">
                    <span>See all {property.images.length} photos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="property-two-column">
        {/* Left Column - Property Details */}
        <div className="property-left-column">
          {/* Price and Address */}
          <div className="property-header-new">
            <div className="price-badge">
              <span className="price">{property.currency || 'AZN'} {property.price?.toLocaleString() ?? 'N/A'}</span>
              {property.pricePerSqm && <span className="price-per-sqm">{property.currency || 'AZN'} {property.pricePerSqm}/m²</span>}
            </div>
            <h1 className="property-address">{getLocation(property)}</h1>
            <div className="property-meta-badges">
              <span className="meta-badge">{property.bedrooms || 0} beds</span>
              <span className="meta-badge">{property.bathrooms || 0} baths</span>
              <span className="meta-badge">{property.builtUpArea || 0} m²</span>
              <span className="meta-badge">{propertyTypeMap[property.propertyType] || property.propertyType}</span>
            </div>
            <div className="status-badges">
              <Badge type="primary" text={statusMap[property.listingStatus] || property.listingStatus} />
              {property.negotiable && <Badge type="success" text="Negotiable" />}
              {property.status && <Badge type="default" text={property.status} />}
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <section className="detail-section">
              <h2>About this property</h2>
              <p className="property-description">{property.description}</p>
            </section>
          )}
          
        {/* Key Features */}
        <section className="detail-section">
          <h2>Overview</h2>
          <div className="features-grid">
            {property.bedrooms > 0 && <div className="feature-item"><strong>{property.bedrooms}</strong> Bedrooms</div>}
            {property.bathrooms > 0 && <div className="feature-item"><strong>{property.bathrooms}</strong> Bathrooms</div>}
            {property.balconies > 0 && <div className="feature-item"><strong>{property.balconies}</strong> Balconies</div>}
            {property.parkingSpaces > 0 && <div className="feature-item"><strong>{property.parkingSpaces}</strong> Parking</div>}
            {property.builtUpArea && <div className="feature-item"><strong>{property.builtUpArea} m²</strong> Built-up</div>}
            {property.landArea && <div className="feature-item"><strong>{property.landArea} m²</strong> Land Area</div>}
            {property.yearBuilt && <div className="feature-item"><strong>Built in {property.yearBuilt}</strong></div>}
          </div>
        </section>

        {/* Basic Information */}
        <section className="detail-section">
          <h2>Basic Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Property Type:</span>
              <span>{propertyTypeMap[property.propertyType] || property.propertyType || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Purpose:</span>
              <span>{property.purpose || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Occupancy:</span>
              <span>{property.occupancy || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Furnishing:</span>
              <span>{property.furnishing || 'N/A'}</span>
            </div>
            {property.yearBuilt && (
              <div className="info-item">
                <span className="info-label">Year Built:</span>
                <span>{property.yearBuilt} {property.ageOfProperty && `(${property.ageOfProperty} years old)`}</span>
              </div>
            )}
            {property.constructionStatus && (
              <div className="info-item">
                <span className="info-label">Construction Status:</span>
                <span>{property.constructionStatus}</span>
              </div>
            )}
          </div>
        </section>

        {/* Description */}
        {property.description && (
          <section className="detail-section">
            <h2>Description</h2>
            <p>{property.description}</p>
          </section>
        )}

        {/* Location */}
        <section className="detail-section">
          <h2>Location</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Address:</span>
              <span>{getLocation(property)}</span>
            </div>
            {property.city && (
              <div className="info-item">
                <span className="info-label">City:</span>
                <span>{property.city}</span>
              </div>
            )}
            {property.district && (
              <div className="info-item">
                <span className="info-label">District:</span>
                <span>{property.district}</span>
              </div>
            )}
            {property.street && (
              <div className="info-item">
                <span className="info-label">Street:</span>
                <span>{property.street}</span>
              </div>
            )}
            {property.buildingName && (
              <div className="info-item">
                <span className="info-label">Building:</span>
                <span>{property.buildingName}</span>
              </div>
            )}
            {property.floorNumber && (
              <div className="info-item">
                <span className="info-label">Floor:</span>
                <span>{property.floorNumber}</span>
              </div>
            )}
            {property.unitNumber && (
              <div className="info-item">
                <span className="info-label">Unit:</span>
                <span>{property.unitNumber}</span>
              </div>
            )}
          </div>
          
          {/* Map */}
          {property.coordinates && (property.coordinates.lat || property.coordinates.latitude) && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <MemoizedPropertyMap
                singleProperty={{
                  ...property,
                  coordinates: {
                    lat: property.coordinates.lat || property.coordinates.latitude,
                    lng: property.coordinates.lng || property.coordinates.longitude
                  }
                }}
                height="400px"
                showPopups={false}
              />
            </div>
          )}
        </section>

        {/* Rental Details */}
        {property.listingStatus === 'for-rent' && (
          <section className="detail-section">
            <h2>Rental Details</h2>
            <div className="info-grid">
              {property.monthlyRent && (
                <div className="info-item">
                  <span className="info-label">Monthly Rent:</span>
                  <span>{property.currency} {property.monthlyRent.toLocaleString()}</span>
                </div>
              )}
              {property.annualRent && (
                <div className="info-item">
                  <span className="info-label">Annual Rent:</span>
                  <span>{property.currency} {property.annualRent.toLocaleString()}</span>
                </div>
              )}
              {property.depositAmount && (
                <div className="info-item">
                  <span className="info-label">Deposit:</span>
                  <span>{property.currency} {property.depositAmount.toLocaleString()}</span>
                </div>
              )}
              {property.paymentFrequency && (
                <div className="info-item">
                  <span className="info-label">Payment Frequency:</span>
                  <span>{property.paymentFrequency}</span>
                </div>
              )}
              {property.minContractPeriod && (
                <div className="info-item">
                  <span className="info-label">Min Contract:</span>
                  <span>{property.minContractPeriod} months</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Utilities Included:</span>
                <span>{property.utilitiesIncluded ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </section>
        )}

        {/* Interior Features */}
        <section className="detail-section">
          <h2>Interior Features</h2>
          <div className="features-list">
            {property.flooringType && <span className="feature-tag">Flooring: {property.flooringType}</span>}
            {property.heating && <span className="feature-tag">Heating</span>}
            {property.cooling && <span className="feature-tag">AC: {property.cooling}</span>}
            {property.kitchenAppliances && <span className="feature-tag">Kitchen Appliances</span>}
            {property.waterHeater && <span className="feature-tag">Water Heater</span>}
            {property.smartHome && <span className="feature-tag">Smart Home</span>}
            {property.internetAvailable && <span className="feature-tag">Internet</span>}
            {property.builtInWardrobes && <span className="feature-tag">Built-in Wardrobes</span>}
            {property.walkInCloset && <span className="feature-tag">Walk-in Closet</span>}
            {property.maidsRoom && <span className="feature-tag">Maid's Room</span>}
            {property.storageRoom && <span className="feature-tag">Storage Room</span>}
            {property.laundryRoom && <span className="feature-tag">Laundry Room</span>}
            {property.openLayoutKitchen && <span className="feature-tag">Open Layout Kitchen</span>}
          </div>
        </section>

        {/* Exterior Features */}
        <section className="detail-section">
          <h2>Exterior Features</h2>
          <div className="features-list">
            {property.garage && <span className="feature-tag">Garage</span>}
            {property.garden && <span className="feature-tag">Garden</span>}
            {property.swimmingPool && <span className="feature-tag">Swimming Pool</span>}
            {property.viewType && <span className="feature-tag">View: {property.viewType}</span>}
            {property.roofAccess && <span className="feature-tag">Roof Access</span>}
            {property.fenced && <span className="feature-tag">Fenced</span>}
          </div>
        </section>

        {/* Building Features */}
        <section className="detail-section">
          <h2>Building Features</h2>
          <div className="features-list">
            {property.elevator && <span className="feature-tag">Elevator</span>}
            {property.security && <span className="feature-tag">Security/Concierge</span>}
            {property.cctv && <span className="feature-tag">CCTV</span>}
            {property.gym && <span className="feature-tag">Gym</span>}
            {property.sharedPool && <span className="feature-tag">Shared Pool</span>}
            {property.visitorParking && <span className="feature-tag">Visitor Parking</span>}
            {property.wheelchairAccessible && <span className="feature-tag">Wheelchair Accessible</span>}
            {property.petsAllowed && <span className="feature-tag">Pets Allowed</span>}
            {property.totalFloorsInBuilding && <span className="feature-tag">Total Floors: {property.totalFloorsInBuilding}</span>}
          </div>
        </section>

        {/* Nearby Amenities */}
        {property.nearby && (
          <section className="detail-section">
            <h2>Nearby Amenities</h2>
            <div className="features-list">
              {property.nearby.schools && <span className="feature-tag">Schools</span>}
              {property.nearby.hospital && <span className="feature-tag">Hospital</span>}
              {property.nearby.metro && <span className="feature-tag">Metro</span>}
              {property.nearby.shoppingMall && <span className="feature-tag">Shopping Mall</span>}
              {property.nearby.park && <span className="feature-tag">Park</span>}
              {property.nearby.airport && <span className="feature-tag">Airport</span>}
            </div>
          </section>
        )}

        {/* Utilities */}
        <section className="detail-section">
          <h2>Utilities & Maintenance</h2>
          <div className="info-grid">
            {property.gasAvailable && (
              <div className="info-item">
                <span className="info-label">Gas:</span>
                <span>Available</span>
              </div>
            )}
            {property.hoaFees && (
              <div className="info-item">
                <span className="info-label">HOA/Condo Fees:</span>
                <span>{property.currency} {property.hoaFees.toLocaleString()}</span>
              </div>
            )}
          </div>
        </section>

        {/* Legal & Financial */}
        <section className="detail-section">
          <h2>Legal & Financial</h2>
          <div className="info-grid">
            {property.ownershipType && (
              <div className="info-item">
                <span className="info-label">Ownership:</span>
                <span>{property.ownershipType}</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">Title Deed:</span>
              <span>{property.titleDeedAvailable ? 'Available' : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Mortgage:</span>
              <span>{property.mortgageAllowed ? 'Allowed' : 'Not allowed'}</span>
            </div>
            {property.developerName && (
              <div className="info-item">
                <span className="info-label">Developer:</span>
                <span>{property.developerName}</span>
              </div>
            )}
            {property.projectName && (
              <div className="info-item">
                <span className="info-label">Project:</span>
                <span>{property.projectName}</span>
              </div>
            )}
          </div>
        </section>

        {/* Listing Info */}
        <section className="detail-section">
          <h2>Listing Information</h2>
          <div className="info-grid">
            {property.listingId && (
              <div className="info-item">
                <span className="info-label">Listing ID:</span>
                <span>{property.listingId}</span>
              </div>
            )}
            {property.viewsCount > 0 && (
              <div className="info-item">
                <span className="info-label">Views:</span>
                <span>{property.viewsCount}</span>
              </div>
            )}
          </div>
        </section>

        {/* Seller Information */}
        {property.ownerId && (
          <MemoizedSellerInfo
            owner={property.ownerId}
            listingBadge={property.listingBadge}
            showContactButton={false}
            onContact={openContactModal}
          />
        )}
        </div>

        {/* Right Column - Contact Card */}
        <div className="property-right-column">
          <div className="contact-card-sticky">
            <div className="contact-card">
              {/* Agent/Owner Info */}
              {property.ownerId && (
                <div className="agent-info">
                  {property.ownerId.profileImage && (
                    <img 
                      src={property.ownerId.profileImage} 
                      alt={property.ownerId.name}
                      className="agent-avatar"
                    />
                  )}
                  <div>
                    <h3>{property.ownerId.name}</h3>
                    {property.ownerId.companyName && (
                      <p className="agent-company">{property.ownerId.companyName}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Contact Button */}
              {!isOwner && (
                <button 
                  className="contact-agent-btn"
                  onClick={openContactModal}
                >
                  Contact Agent
                </button>
              )}
              
              {/* Quick Actions */}
              <div className="quick-actions">
                <FavoriteButton
                  propertyId={property._id}
                  initialFavorite={isFavorite}
                  onToggle={(newState) => setIsFavorite(newState)}
                  size="medium"
                />
                <button className="action-btn" onClick={() => window.print()}>
                  🖨️ Print
                </button>
                <button className="action-btn" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }}>
                  🔗 Share
                </button>
              </div>
              
              {/* Property Stats */}
              <div className="property-stats-card">
                <div className="stat-item">
                  <span className="stat-label">Listed</span>
                  <span className="stat-value">
                    {property.dateAdded ? new Date(property.dateAdded).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                {property.viewsCount > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">Views</span>
                    <span className="stat-value">{property.viewsCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {(isAdmin || isOwner) && !isModal && (
        <div className="property-actions">
          <button onClick={() => navigate(`/properties/update/${property._id}`)} className="edit-btn">Edit Property</button>
        </div>
      )}

      {showContactModal && property && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowContactModal(false)}>✕</button>
            <h3>Send Message to Property Owner</h3>
            <div className="modal-property-info">
              <p className="property-title">{property.title}</p>
              <p className="property-price">{property.currency || 'AZN'} {property.price?.toLocaleString()}</p>
            </div>
            <div className="message-form">
              <label>Your Message:</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Hi, I'm interested in this property. Please provide more information."
                rows="6"
                disabled={messageSending}
              />
              {messageError && <p className="error-message">{messageError}</p>}
              <div className="modal-actions">
                <button 
                  onClick={() => setShowContactModal(false)} 
                  className="btn-secondary"
                  disabled={messageSending}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendMessage} 
                  className="btn-primary"
                  disabled={messageSending || !messageContent.trim()}
                >
                  {messageSending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for full-size images */}
      {showLightbox && hasImages && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>✕</button>
          <button className="lightbox-prev" onClick={(e) => { e.stopPropagation(); prevImage(); }}>‹</button>
          <button className="lightbox-next" onClick={(e) => { e.stopPropagation(); nextImage(); }}>›</button>
          
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={getImageUrl(property.images[selectedImageIndex], 'full')} 
              alt={property.title}
            />
            <div className="lightbox-counter">
              {selectedImageIndex + 1} / {property.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
