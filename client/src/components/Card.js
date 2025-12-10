import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from './Badge';
import './Card.css';

const Card = ({ property, onSave, onUnsave, isSaved = false, children, className, style, onClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // If no property prop, render as a simple container div
  if (!property) {
    return (
      <div className={`card-container ${className || ''}`} style={style} onClick={onClick}>
        {children}
      </div>
    );
  }

  const getImageUrl = (imageData, size = 'thumbnail') => {
    if (!imageData) return null;
    if (typeof imageData === 'string') return imageData;
    return imageData[size] || imageData.thumbnail || imageData.medium || imageData.full || null;
  };

  const handlePrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === 0 ? (property.images?.length || 1) - 1 : prev - 1
    );
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      (prev + 1) % (property.images?.length || 1)
    );
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaved) {
      onUnsave?.(property._id);
    } else {
      onSave?.(property._id);
    }
  };

  const currentImage = property.images?.[currentImageIndex];
  const imageUrl = currentImage ? getImageUrl(currentImage, 'thumbnail') : null;
  const hasMultipleImages = property.images?.length > 1;

  return (
    <Link to={`/listing/${property._id}`} className={`property-card ${property.isSponsored ? 'sponsored' : ''}`}>
      {property.isSponsored && (
        <div className="card-sponsored-badge">
          <span className="sponsored-badge">Sponsored</span>
        </div>
      )}
      
      {property.listingBadge && (
        <div className="card-listing-badge">
          <Badge type={property.listingBadge} size="small" />
        </div>
      )}

      <button
        className={`card-save-btn ${isSaved ? 'saved' : ''}`}
        onClick={handleSaveClick}
        aria-label={isSaved ? 'Unsave property' : 'Save property'}
      >
        {isSaved ? '♥' : '♡'}
      </button>

      <div className="card-image">
        {imageUrl && !imageError ? (
          <>
            <img
              src={imageUrl}
              alt={property.title}
              onError={() => setImageError(true)}
            />
            {hasMultipleImages && (
              <>
                <button
                  className="card-image-nav card-image-prev"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  className="card-image-nav card-image-next"
                  onClick={handleNextImage}
                  aria-label="Next image"
                >
                  ›
                </button>
                <div className="card-image-indicator">
                  {currentImageIndex + 1} / {property.images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="card-image-placeholder">
            <span>📷</span>
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="card-price">
          {property.currency || 'AZN'} {property.price?.toLocaleString()}
          {property.listingStatus === 'for-rent' && '/month'}
        </div>

        <h3 className="card-title">{property.title}</h3>

        <p className="card-location">
          📍 {property.location || property.city}
        </p>

        <div className="card-features">
          {property.bedrooms > 0 && <span>🛏️ {property.bedrooms} bed{property.bedrooms > 1 ? 's' : ''}</span>}
          {property.bathrooms > 0 && <span>🚿 {property.bathrooms} bath{property.bathrooms > 1 ? 's' : ''}</span>}
          {property.builtUpArea && <span>📐 {property.builtUpArea} m²</span>}
        </div>

        {property.views !== undefined && (
          <div className="card-stats">
            <span>👁️ {property.views} views</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default Card;
