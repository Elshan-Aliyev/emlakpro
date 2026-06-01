import React, { useEffect } from 'react';
import { ArrowLeft, Share2 } from 'lucide-react';
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
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      // Use '' not 'unset' — removes the inline style so CSS cascade applies correctly
      document.body.style.overflow = '';
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
            <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
            Back to search
          </button>
          
          <div className="top-bar-actions">
            <FavoriteButton 
              propertyId={property._id} 
              initialIsFavorite={false}
              isModal={true}
            />
            <button className="share-btn" onClick={handleShare}>
              <Share2 size={20} strokeWidth={2} aria-hidden="true" />
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
