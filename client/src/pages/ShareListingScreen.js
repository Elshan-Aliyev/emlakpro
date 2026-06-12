import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProperty, incrementPropertyViews, incrementPropertyShares } from '../services/api';
import { Check, Home, MapPin, Eye, Upload, Link2, Smartphone, Send, Users } from 'lucide-react';
import './ShareListingScreen.css';

const ShareListingScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [sharesCount, setSharesCount] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await getProperty(id);
        setProperty(response.data);
        setSharesCount(response.data.sharesCount || 0);
        setLoading(false);
        incrementPropertyViews(id).catch(() => {});
      } catch (error) {
        console.error('Error fetching property:', error);
        setLoading(false);
        navigate(`/properties/${id}/enhance`);
      }
    };

    if (id) {
      fetchProperty();
    }
  }, [id, navigate]);

  // Generate property URL
  const getPropertyUrl = () => `${window.location.origin}/properties/${id}`;

  // Generate share message
  const getShareMessage = () => {
    if (!property) return '';
    return `Check out my property listing: ${property.title} - ${property.currency || 'AZN'} ${property.price?.toLocaleString() || 'N/A'}`;
  };

  // Track share action — increments local count and fires backend
  const trackShare = (platform) => {
    setSharesCount((prev) => prev + 1);
    incrementPropertyShares(id).catch(() => {});
    try {
      localStorage.setItem(`share_${id}_${platform}`, JSON.stringify({
        propertyId: id,
        platform,
        timestamp: new Date().toISOString()
      }));
    } catch (_) {}
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getPropertyUrl());
      setCopySuccess(true);
      trackShare('copy-link');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(`${getShareMessage()}\n\n${getPropertyUrl()}`);
    trackShare('whatsapp');
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  // Telegram share
  const handleTelegramShare = () => {
    const message = encodeURIComponent(getShareMessage());
    const url = encodeURIComponent(getPropertyUrl());
    trackShare('telegram');
    window.open(`https://t.me/share/url?url=${url}&text=${message}`, '_blank');
  };

  // Facebook share
  const handleFacebookShare = () => {
    const url = encodeURIComponent(getPropertyUrl());
    trackShare('facebook');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  };

  const handleContinue = () => {
    navigate(`/properties/${id}/enhance`, { state: { newListing: true } });
  };

  const handleSkip = () => handleContinue();

  if (loading) {
    return (
      <div className="share-listing-screen">
        <div className="share-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="share-listing-screen">
      <div className="share-container">

        {/* Success Header */}
        <div className="success-header">
          <div className="success-icon"><Check size={14} strokeWidth={2.5} aria-hidden="true" /></div>
          <h1 className="success-title">Listing Posted Successfully</h1>
          <p className="success-subtitle">Your property is now live on the platform</p>
        </div>

        {/* Property Preview */}
        <div className="property-preview">
          <div className="preview-image">
            {property.images && property.images.length > 0 ? (
              <img
                src={typeof property.images[0] === 'string' ? property.images[0] : property.images[0]?.medium || property.images[0]?.thumbnail}
                alt={property.title}
              />
            ) : (
              <div className="placeholder-image"><Home size={15} strokeWidth={2} aria-hidden="true" /></div>
            )}
          </div>
          <div className="preview-details">
            <h2 className="preview-title">{property.title}</h2>
            <p className="preview-price">
              {property.currency || 'AZN'} {property.price?.toLocaleString() || 'N/A'}
            </p>
            <p className="preview-location"><MapPin size={14} strokeWidth={2} aria-hidden="true" /> {property.city || property.location || 'Location'}</p>
            <div className="preview-stats-row">
              <span className="preview-stat">
                <span className="stat-icon"><Eye size={14} strokeWidth={2} aria-hidden="true" /></span>
                {property.viewsCount || 0} views
              </span>
              {sharesCount > 0 && (
                <span className="preview-stat">
                  <span className="stat-icon"><Upload size={14} strokeWidth={2} aria-hidden="true" /></span>
                  {sharesCount} {sharesCount === 1 ? 'share' : 'shares'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="share-section">
          <h2 className="share-title">Share Your Listing</h2>
          <p className="share-subtitle">Reach more potential buyers by sharing across platforms.</p>

          <div className="share-buttons-grid">
            <button
              onClick={handleCopyLink}
              className={`share-btn share-btn-copy ${copySuccess ? 'success' : ''}`}
            >
              <span className="share-btn-icon"><Link2 size={14} strokeWidth={2} aria-hidden="true" /></span>
              <span className="share-btn-text">{copySuccess ? 'Link Copied' : 'Copy Link'}</span>
              <span className="share-btn-hint">Share anywhere</span>
            </button>

            <button onClick={handleWhatsAppShare} className="share-btn share-btn-whatsapp">
              <span className="share-btn-icon"><Smartphone size={14} strokeWidth={2} aria-hidden="true" /></span>
              <span className="share-btn-text">WhatsApp</span>
              <span className="share-btn-hint">Share with contacts</span>
            </button>

            <button onClick={handleTelegramShare} className="share-btn share-btn-telegram">
              <span className="share-btn-icon"><Send size={14} strokeWidth={2} aria-hidden="true" /></span>
              <span className="share-btn-text">Telegram</span>
              <span className="share-btn-hint">Share in groups</span>
            </button>

            <button onClick={handleFacebookShare} className="share-btn share-btn-facebook">
              <span className="share-btn-icon"><Users size={14} strokeWidth={2} aria-hidden="true" /></span>
              <span className="share-btn-text">Facebook</span>
              <span className="share-btn-hint">Share on timeline</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button onClick={handleContinue} className="btn-continue">
            Add More Details
          </button>
          <button onClick={handleSkip} className="btn-skip">
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default ShareListingScreen;
