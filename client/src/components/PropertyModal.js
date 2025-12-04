import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PropertyModal.css';

const PropertyModal = ({ property, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!property) return null;

  const handleViewFullDetails = () => {
    navigate(`/property/${property._id}`);
  };

  const images = property.images || [];
  const mainImage = images[0] || property.thumbnail || property.medium || property.image || '';

  return (
    <div className="property-modal-overlay" onClick={onClose}>
      <div className="property-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="property-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="property-modal-content">
          {/* Image Gallery */}
          <div className="property-modal-gallery">
            <img 
              src={mainImage} 
              alt={property.title} 
              className="property-modal-main-image"
            />
            {images.length > 1 && (
              <div className="property-modal-thumbnails">
                {images.slice(0, 5).map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt={`${property.title} ${idx + 1}`}
                    className="property-modal-thumbnail"
                  />
                ))}
                {images.length > 5 && (
                  <div className="property-modal-more-images">
                    +{images.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="property-modal-details">
            <div className="property-modal-header">
              <div className="property-modal-price">
                {property.currency || 'AZN'} {property.price?.toLocaleString()}
                {property.listingStatus === 'for-rent' && <span className="price-period">/month</span>}
              </div>
              <div className="property-modal-title">{property.title}</div>
              <div className="property-modal-location">
                📍 {property.location || property.city || property.address || 'Location not specified'}
              </div>
            </div>

            <div className="property-modal-features">
              <div className="property-modal-feature">
                <span className="feature-icon">🛏️</span>
                <span className="feature-value">{property.bedrooms || 0}</span>
                <span className="feature-label">Beds</span>
              </div>
              <div className="property-modal-feature">
                <span className="feature-icon">🚿</span>
                <span className="feature-value">{property.bathrooms || 0}</span>
                <span className="feature-label">Baths</span>
              </div>
              <div className="property-modal-feature">
                <span className="feature-icon">📏</span>
                <span className="feature-value">{property.builtUpArea || property.area || 0}</span>
                <span className="feature-label">m²</span>
              </div>
              {property.propertyType && (
                <div className="property-modal-feature">
                  <span className="feature-icon">🏠</span>
                  <span className="feature-value">{property.propertyType}</span>
                  <span className="feature-label">Type</span>
                </div>
              )}
            </div>

            {property.description && (
              <div className="property-modal-description">
                <h3>Description</h3>
                <p>{property.description}</p>
              </div>
            )}

            <div className="property-modal-actions">
              <button 
                className="property-modal-btn property-modal-btn-primary"
                onClick={handleViewFullDetails}
              >
                View Full Details
              </button>
              <button 
                className="property-modal-btn property-modal-btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyModal;
