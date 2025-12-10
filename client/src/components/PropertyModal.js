import React, { useEffect } from 'react';
import PropertyDetail from '../pages/PropertyDetail';
import FavoriteButton from './FavoriteButton';
import './PropertyModal.css';

const PropertyModal = ({ property, onClose }) => {

  const getLocation = (property) => {
    if (typeof property.location === 'string') return property.location;
    if (typeof property.city === 'string') return property.city;
    if (typeof property.address === 'string') return property.address;
    if (property.location?.city && typeof property.location.city === 'string') return property.location.city;
    if (property.address?.city && typeof property.address.city === 'string') return property.address.city;
    return 'Location not specified';
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property.title || getLocation(property),
        text: `Check out this property: ${property.title || getLocation(property)}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

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

  return (
    <div className="property-modal-overlay" onClick={onClose}>
      <div className="property-modal-container property-modal-full" onClick={(e) => e.stopPropagation()}>
        {/* Zillow-style Top Bar */}
        <div className="property-modal-top-bar">
          <button className="back-to-search-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to search
          </button>
          
          <div className="top-bar-actions">
            <FavoriteButton 
              propertyId={property._id} 
              initialIsFavorite={false}
              isModal={true}
            />
            <button className="share-btn" onClick={handleShare}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16,6 12,2 8,6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share
            </button>
          </div>
        </div>

        <PropertyDetail property={property} isModal={true} onClose={onClose} />
      </div>
    </div>
  );
};

export default PropertyModal;
