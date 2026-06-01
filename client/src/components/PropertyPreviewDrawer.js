import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Share2, AlertCircle, ChevronLeft, ChevronRight, Image, ShieldCheck, Sparkles, BedDouble, Bath, Maximize2, Home, MapPin, ArrowUpRight } from 'lucide-react';
import { getProperty } from '../services/api';
import { getAiInsightRich } from '../utils/propertyAI';
import FavoriteButton from './FavoriteButton';
import './PropertyPreviewDrawer.css';

const getLocation = (p) => {
  if (typeof p.location === 'string') return p.location;
  if (typeof p.city === 'string') return p.city;
  if (p.location?.city) return p.location.city;
  if (p.address?.city) return p.address.city;
  return '';
};

const getImageUrl = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  return img.medium || img.large || img.thumbnail || null;
};

const PropertyPreviewDrawer = ({
  propertyId,
  onClose,
  savedIds = new Set(),
  onSaveToggle,
}) => {
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);

  const fetchProperty = useCallback(() => {
    if (!propertyId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setProperty(null);
    setImgIndex(0);
    getProperty(propertyId)
      .then(res => { if (!cancelled) setProperty(res.data); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [propertyId]);

  useEffect(fetchProperty, [fetchProperty]);

  // Focus close button on open for keyboard accessibility
  useEffect(() => {
    const t = setTimeout(() => { if (closeBtnRef.current) closeBtnRef.current.focus(); }, 60);
    return () => clearTimeout(t);
  }, []);

  // ESC key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const images = property?.images || [];
  const aiInsight = property ? getAiInsightRich(property) : null;
  const ownershipOk = property?.ownershipVerificationStatus === 'verified';
  const loc = property ? getLocation(property) : '';
  const isSaved = savedIds.has(propertyId);

  const handleShare = () => {
    const url = `${window.location.origin}/properties/${propertyId}`;
    if (navigator.share) {
      navigator.share({ title: property?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  return (
    <>
      {/* Subtle dim — very low opacity, preserves map visibility */}
      <div className="ppd-overlay" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="ppd"
        role="dialog"
        aria-modal="true"
        aria-label={property?.title || 'Property preview'}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="ppd-header">
          <button
            ref={closeBtnRef}
            className="ppd-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="ppd-header-actions">
            <button className="ppd-action-btn" onClick={handleShare} aria-label="Share">
              <Share2 size={13} strokeWidth={2} aria-hidden="true" />
              Share
            </button>
            <FavoriteButton
              propertyId={propertyId}
              initialIsFavorite={isSaved}
              onToggle={onSaveToggle}
            />
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div className="ppd-body">

          {loading && (
            <div className="ppd-loading" aria-label="Loading property">
              <div className="ppd-spinner" />
            </div>
          )}

          {loadError && !loading && (
            <div className="ppd-error">
              <AlertCircle size={24} strokeWidth={1.5} aria-hidden="true" />
              <p>Unable to load this property.</p>
              <button onClick={fetchProperty}>Try again</button>
            </div>
          )}

          {property && !loading && (
            <>
              {/* Gallery */}
              {images.length > 0 ? (
                <div className="ppd-gallery">
                  <img
                    key={imgIndex}
                    src={getImageUrl(images[imgIndex])}
                    alt={property.title}
                    className="ppd-gallery-img"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        className="ppd-gallery-btn ppd-gallery-prev"
                        onClick={() => setImgIndex(i => i > 0 ? i - 1 : images.length - 1)}
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={14} strokeWidth={2.5} aria-hidden="true" />
                      </button>
                      <button
                        className="ppd-gallery-btn ppd-gallery-next"
                        onClick={() => setImgIndex(i => (i + 1) % images.length)}
                        aria-label="Next image"
                      >
                        <ChevronRight size={14} strokeWidth={2.5} aria-hidden="true" />
                      </button>
                      <div className="ppd-gallery-count">{imgIndex + 1} / {images.length}</div>
                    </>
                  )}
                </div>
              ) : (
                <div className="ppd-gallery ppd-gallery--empty">
                  <Image size={28} strokeWidth={1.5} aria-hidden="true" />
                </div>
              )}

              {/* Price */}
              <div className="ppd-price-row">
                <div className="ppd-price">
                  <span className="ppd-currency">{property.currency || 'AZN'}</span>
                  {' '}{property.price?.toLocaleString() || 'N/A'}
                </div>
                {property.listingStatus === 'for-rent' && (
                  <span className="ppd-status-badge ppd-status-badge--rent">For Rent</span>
                )}
                {property.listingStatus === 'new-project' && (
                  <span className="ppd-status-badge ppd-status-badge--new">New Project</span>
                )}
              </div>

              {/* Title */}
              <h2 className="ppd-title">{property.title}</h2>

              {/* Trust strip */}
              {ownershipOk && (
                <div className="ppd-trust">
                  <ShieldCheck size={11} strokeWidth={2.5} aria-hidden="true" />
                  Ownership verified
                </div>
              )}

              <div className="ppd-divider" />

              {/* AI Insight */}
              {aiInsight && (
                <div className="ppd-ai-insight">
                  <Sparkles size={11} strokeWidth={2} aria-hidden="true" />
                  <span>{aiInsight}</span>
                </div>
              )}

              {/* Key details */}
              <div className="ppd-details">
                {property.bedrooms > 0 && (
                  <div className="ppd-detail">
                    <BedDouble size={13} strokeWidth={1.5} aria-hidden="true" />
                    {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="ppd-detail">
                    <Bath size={13} strokeWidth={1.5} aria-hidden="true" />
                    {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
                  </div>
                )}
                {property.builtUpArea && (
                  <div className="ppd-detail">
                    <Maximize2 size={13} strokeWidth={1.5} aria-hidden="true" />
                    {property.builtUpArea} m²
                  </div>
                )}
                {property.propertyType && (
                  <div className="ppd-detail">
                    <Home size={13} strokeWidth={1.5} aria-hidden="true" />
                    {property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}
                  </div>
                )}
                {loc && (
                  <div className="ppd-detail ppd-detail--location">
                    <MapPin size={13} strokeWidth={1.5} aria-hidden="true" />
                    {loc}
                  </div>
                )}
              </div>

              {/* Description */}
              {property.description && (
                <>
                  <div className="ppd-divider" />
                  <p className="ppd-description">
                    {property.description.length > 220
                      ? property.description.slice(0, 220).trimEnd() + '…'
                      : property.description}
                  </p>
                </>
              )}

              {/* Owner */}
              {property.ownerId?.name && (
                <>
                  <div className="ppd-divider" />
                  <div className="ppd-owner">
                    <div className="ppd-owner-avatar" aria-hidden="true">
                      {property.ownerId.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ppd-owner-info">
                      <span className="ppd-owner-name">{property.ownerId.name}</span>
                      {property.ownerId.phoneVerified && (
                        <span className="ppd-owner-badge">Phone verified</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* CTAs */}
              <div className="ppd-ctas">
                <button
                  className="ppd-cta-primary"
                  onClick={() => navigate(`/properties/${propertyId}`)}
                >
                  Open full details
                  <ArrowUpRight size={12} strokeWidth={2.5} aria-hidden="true" />
                </button>
                <button
                  className="ppd-cta-secondary"
                  onClick={() => navigate(`/properties/${propertyId}`)}
                >
                  Contact owner
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default PropertyPreviewDrawer;
