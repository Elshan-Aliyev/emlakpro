
import React, { memo } from 'react';
import { Image, Camera, Heart, Check, Sparkles } from 'lucide-react';
import { getPrimaryTrustSignal } from '../utils/propertyAI';
import './Card.css';

// Deterministic per-property image tone — avoids uniform "template" feel across grid
const idHash = (id) => {
  if (!id) return 0;
  let h = 0;
  for (let i = 0; i < Math.min(id.length, 12); i++)
    h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
};

// [rest, hover] filter pairs — very subtle, 40% chance neutral
const IMAGE_TONE_PAIRS = [
  [null, null],
  [null, null],
  ['sepia(0.04) saturate(1.04) brightness(1.01)', 'sepia(0.04) saturate(1.06) brightness(1.025)'],
  ['saturate(0.97) hue-rotate(3deg)',               'saturate(1.04) hue-rotate(3deg) brightness(1.025)'],
  ['saturate(1.05) contrast(1.02)',                  'saturate(1.07) brightness(1.02) contrast(1.03)'],
];

// onSaveToggle is a unified callback used by some pages (AccountSaved, Search).
// onSave / onUnsave are the legacy split form. Both are supported.
const Card = memo(({ property, onSave, onUnsave, onSaveToggle, isSaved = false, children, className, style, onClick }) => {
  if (!property) {
    return (
      <div className={`card-container ${className || ''}`} style={style} onClick={onClick}>
        {children}
      </div>
    );
  }

  const getImageUrl = (imageData) => {
    if (!imageData) return null;
    if (typeof imageData === 'string') return imageData;
    return imageData.thumbnail || imageData.medium || imageData.full || null;
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSaveToggle) {
      onSaveToggle(property._id);
    } else if (isSaved) {
      onUnsave?.(property._id);
    } else {
      onSave?.(property._id);
    }
  };

  const imageUrl   = property.images?.[0] ? getImageUrl(property.images[0]) : null;
  const photoCount = property.images?.length || 0;

  const ownershipOk = property.ownershipVerificationStatus === 'verified';
  const phoneOk     = property.ownerId?.phoneVerified;

  const getTrustLevel = () => {
    if (property.suspectedDuplicate) return 'low';
    let score = 0;
    if (ownershipOk) score += 2;
    if (phoneOk) score += 1;
    if ((property.qualityScore || 0) >= 70) score += 1;
    return score >= 2 ? 'high' : 'default';
  };

  const getAiInsight = () => {
    const now       = Date.now();
    const created   = property.createdAt                  ? new Date(property.createdAt).getTime()                  : null;
    const confirmed = property.lastConfirmedAvailableAt   ? new Date(property.lastConfirmedAvailableAt).getTime()   : null;
    const responseH = property.ownerId?.averageResponseTimeHours;
    const respRate  = property.ownerId?.responseRate;
    const quality   = property.qualityScore || 0;
    const agent     = property.agentScore   || 0;

    if (confirmed && (now - confirmed) < 7  * 86_400_000) return 'Recently confirmed available';
    if (created   && (now - created)   < 3  * 86_400_000) return 'New to market';
    if (responseH != null && responseH < 4 && respRate != null && respRate >= 70) return 'High owner responsiveness';
    if (quality >= 85 || agent >= 85) return 'Good value for this area';
    if (quality >= 70)                return 'Popular this week';
    return null;
  };

  const trustLevel   = getTrustLevel();
  const aiInsight    = getAiInsight();
  const primaryTrust = getPrimaryTrustSignal(property);

  const toneIdx  = idHash(property._id) % IMAGE_TONE_PAIRS.length;
  const [toneRest, toneHover] = IMAGE_TONE_PAIRS[toneIdx];
  const imgFilter      = toneRest  ? `${toneRest} contrast(1.01)`   : 'saturate(1.02) contrast(1.01)';
  const imgHoverFilter = toneHover ? `${toneHover} contrast(1.03)`  : 'saturate(1.06) brightness(1.025) contrast(1.03)';

  const cardClass = [
    'property-card',
    trustLevel === 'high' ? 'property-card--high-trust' : '',
    trustLevel === 'low'  ? 'property-card--low-conf'   : '',
    className || '',
  ].filter(Boolean).join(' ');

  const cardStyle = {
    ...style,
    '--img-filter':       imgFilter,
    '--img-hover-filter': imgHoverFilter,
  };

  return (
    <div className={cardClass} style={cardStyle} onClick={onClick}>

      {/* ── Image ── */}
      <div className="card-image">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={property.title}
              loading="lazy"
              style={{ opacity: 0, transition: 'opacity 380ms cubic-bezier(0.22,1,0.36,1)' }}
              onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
              }}
            />
            <div className="card-image-error" style={{ display: 'none' }} aria-hidden="true" />
          </>
        ) : (
          <div className="card-image-placeholder">
            <Image size={28} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}

        {photoCount > 1 && (
          <div className="card-photo-count">
            <Camera size={11} strokeWidth={2} aria-hidden="true" />
            {photoCount}
          </div>
        )}

        <button
          className={`card-save-btn${isSaved ? ' saved' : ''}`}
          onClick={handleSaveClick}
          aria-label={isSaved ? 'Unsave property' : 'Save property'}
        >
          <Heart size={17} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="card-content">

        <div className="card-price">
          <span className="card-price-currency">{property.currency || 'AZN'}</span>
          {' '}{property.price?.toLocaleString()}
        </div>

        <div className="card-title">{property.title}</div>

        {primaryTrust && (
          <div className="card-trust">
            <span className="card-trust-item">
              <Check size={10} strokeWidth={3} aria-hidden="true" />
              {primaryTrust}
            </span>
          </div>
        )}

        <div className="card-meta">
          {(property.location || property.city) && (
            <div className="card-location">{property.location || property.city}</div>
          )}
          <div className="card-features">
            {property.bedrooms  > 0 && <span>{property.bedrooms} bd{property.bedrooms !== 1 ? 's' : ''}</span>}
            {property.bathrooms > 0 && <span>{property.bathrooms} ba{property.bathrooms !== 1 ? 's' : ''}</span>}
            {(property.builtUpArea || property.area) && (
              <span>{property.builtUpArea || property.area} m²</span>
            )}
          </div>
        </div>

        {aiInsight && (
          <div className="card-ai-insight">
            <Sparkles size={12} strokeWidth={2} className="card-ai-insight-icon" aria-hidden="true" />
            {aiInsight}
          </div>
        )}

      </div>
    </div>
  );
});

Card.displayName = 'Card';
export default Card;
