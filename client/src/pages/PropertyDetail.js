import React, { useEffect, useState } from 'react';
import { getProperty, sendMessage, getSavedProperties } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import SellerInfo from '../components/SellerInfo';
import Badge from '../components/Badge';
import PropertyMap from '../components/PropertyMap';
import FavoriteButton from '../components/FavoriteButton';
import './PropertyDetail.css';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [error, setError] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getProperty(id);
        setProperty(res.data);
        
        // Check if property is in user's favorites
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const savedRes = await getSavedProperties(token);
            const isInFavorites = savedRes.data.some(p => p._id === id);
            setIsFavorite(isInFavorites);
          } catch (err) {
            console.error('Error checking favorites:', err);
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
      alert('Please login or register to contact the property owner');
      navigate('/login');
      return;
    }
    setMessageContent(`Hi, I'm interested in your property: ${property.title}`);
    setShowContactModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      setSendingMessage(true);
      const token = localStorage.getItem('token');
      
      await sendMessage({
        recipientId: property.ownerId._id,
        propertyId: property._id,
        content: messageContent,
        subject: `Inquiry about ${property.title}`
      }, token);

      alert('Message sent successfully! Check your messages page.');
      setShowContactModal(false);
      setMessageContent('');
      navigate('/messages');
    } catch (err) {
      console.error('Error sending message:', err);
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const getImageUrl = (image, size = 'large') => {
    if (!image) return null;
    // Handle both old format (string) and new format (object)
    if (typeof image === 'string') return image;
    return image[size] || image.large || image.medium || image.thumbnail;
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

  const hasImages = property.images && property.images.length > 0;

  return (
    <>
      {/* Image Gallery */}
      {hasImages && (
        <div className="property-gallery">
          <div className="main-image" onClick={() => openLightbox(selectedImageIndex)}>
            <img 
              src={getImageUrl(property.images[selectedImageIndex], 'large')} 
              alt={property.title}
              style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer', background: '#000' }}
            />
            <div className="image-counter">
              {selectedImageIndex + 1} / {property.images.length}
            </div>
            
            {/* Image Navigation Buttons */}
            {property.images.length > 1 && (
              <>
                <button 
                  className="image-nav-btn image-nav-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button 
                  className="image-nav-btn image-nav-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
          </div>
          
          {property.images.length > 1 && (
            <div className="thumbnail-strip">
              {property.images.map((image, index) => (
                <div 
                  key={index}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img 
                    src={getImageUrl(image, 'thumbnail')} 
                    alt={`${property.title} ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Property Header */}
      <div className="property-header">
        <div className="header-content">
          <div className="title-section">
            <h1>{property.title || 'N/A'}</h1>
            <p className="location">📍 {property.location || property.city || 'Location not specified'}</p>
          </div>
          
          <div className="price-section">
            <div className="property-price">{property.currency || 'AZN'} {property.price?.toLocaleString() ?? 'N/A'}</div>
            {property.pricePerSqm && <div className="price-per-sqm">{property.currency || 'AZN'} {property.pricePerSqm}/m²</div>}
            <div className="property-meta">
              <span className="badge primary">{statusMap[property.listingStatus] || property.listingStatus}</span>
              {property.negotiable && <span className="badge success">Negotiable</span>}
              {property.status && <span className="badge">{property.status}</span>}
              <FavoriteButton 
                propertyId={property._id}
                initialIsFavorite={isFavorite}
                onToggle={(_, newState) => setIsFavorite(newState)}
              />
            </div>
          </div>
        </div>

        {/* Key Features Bar */}
        <div className="key-features-bar">
          {property.bedrooms > 0 && (
            <div className="feature-pill">
              <span className="icon">🛏️</span>
              <span><strong>{property.bedrooms}</strong> Beds</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="feature-pill">
              <span className="icon">🚿</span>
              <span><strong>{property.bathrooms}</strong> Baths</span>
            </div>
          )}
          {property.builtUpArea && (
            <div className="feature-pill">
              <span className="icon">📐</span>
              <span><strong>{property.builtUpArea}</strong> m²</span>
            </div>
          )}
          {property.parkingSpaces > 0 && (
            <div className="feature-pill">
              <span className="icon">🚗</span>
              <span><strong>{property.parkingSpaces}</strong> Parking</span>
            </div>
          )}
          {property.yearBuilt && (
            <div className="feature-pill">
              <span className="icon">📅</span>
              <span>{property.yearBuilt}</span>
            </div>
          )}
        </div>
      </div>

      <div className="property-content">
        {/* Key Features */}
        <section className="detail-section">
          <h2>Key Features</h2>
          <div className="features-grid">
            {property.bedrooms > 0 && <div className="feature-item"><strong>{property.bedrooms}</strong> Bedrooms</div>}
            {property.bathrooms > 0 && <div className="feature-item"><strong>{property.bathrooms}</strong> Bathrooms</div>}
            {property.balconies > 0 && <div className="feature-item"><strong>{property.balconies}</strong> Balconies</div>}
            {property.parkingSpaces > 0 && <div className="feature-item"><strong>{property.parkingSpaces}</strong> Parking</div>}
            {property.builtUpArea && <div className="feature-item"><strong>{property.builtUpArea} m²</strong> Built-up</div>}
            {property.landArea && <div className="feature-item"><strong>{property.landArea} m²</strong> Land Area</div>}
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
              <span>{property.location || property.fullAddress || 'N/A'}</span>
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
              <PropertyMap 
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
          </div>
        </section>

        {/* Seller Information */}
        {property.ownerId && (
          <SellerInfo 
            owner={property.ownerId}
            listingBadge={property.listingBadge}
            showContactButton={!isOwner}
            onContact={handleContact}
          />
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowContactModal(false)}>✕</button>
            <h3>Contact Property Owner</h3>
            {property.ownerId && (
              <p className="modal-subtitle">
                Send a message to {property.ownerId.name || `${property.ownerId.firstName || ''} ${property.ownerId.lastName || ''}`.trim()}
              </p>
            )}
            
            <div className="contact-form">
              <textarea
                placeholder="Type your message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows="6"
                disabled={sendingMessage}
              />
              
              <div className="modal-actions">
                <button 
                  onClick={() => setShowContactModal(false)}
                  className="btn-secondary"
                  disabled={sendingMessage}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendMessage}
                  className="btn-primary"
                  disabled={sendingMessage || !messageContent.trim()}
                >
                  {sendingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(isAdmin || isOwner) && (
        <div className="property-actions">
          <button onClick={() => navigate(`/properties/update/${property._id}`)} className="edit-btn">Edit Property</button>
        </div>
      )}

      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Contact Property Owner</h3>
            <p>Contact functionality will be implemented here.</p>
            <button onClick={() => setShowContactModal(false)}>Close</button>
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
    </>
  );
};

export default PropertyDetail;
