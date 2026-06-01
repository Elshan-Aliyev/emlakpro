import React from 'react';
import { Phone, Mail, Globe, Check } from 'lucide-react';
import Badge from './Badge';
import TrustBadge from './TrustBadge';
import './SellerInfo.css';

const SellerInfo = ({ owner, listingBadge, showContactButton = true, onContact }) => {
  if (!owner) return null;

  const getOwnerName = () => {
    if (owner.role === 'corporate') return owner.companyName || owner.name;
    return `${owner.name} ${owner.lastName || ''}`.trim();
  };

  const getOwnerLogo = () => {
    if (owner.role === 'corporate' && owner.companyLogo) return owner.companyLogo;
    return owner.avatar;
  };

  return (
    <div className="seller-info-card">
      <div className="seller-header">
        <h3>Listed By</h3>
        <Badge type={listingBadge || 'for-sale-by-owner'} verified={owner.verified} size="medium" />
      </div>

      <div className="seller-profile">
        {getOwnerLogo() ? (
          <img src={getOwnerLogo()} alt={getOwnerName()} className="seller-avatar" />
        ) : (
          <div className="seller-avatar-placeholder">
            {getOwnerName().charAt(0).toUpperCase()}
          </div>
        )}

        <div className="seller-details">
          <div className="seller-name">
            {getOwnerName()}
            {owner.verified && (
              <span className="verified-badge" title="Verified Account">
                <Check size={10} strokeWidth={3} aria-hidden="true" />
              </span>
            )}
          </div>

          {owner.role === 'realtor' && owner.brokerage && (
            <div className="seller-brokerage">{owner.brokerage}</div>
          )}

          {owner.role === 'realtor' && owner.licenseId && (
            <div className="seller-license">License: {owner.licenseId}</div>
          )}

          {owner.bio && <div className="seller-bio">{owner.bio}</div>}

          {owner.totalListings > 0 && (
            <div className="seller-stats">
              <span className="stat-item"><strong>{owner.totalListings}</strong> Listings</span>
              {owner.totalViews > 0 && (
                <span className="stat-item"><strong>{owner.totalViews.toLocaleString()}</strong> Views</span>
              )}
            </div>
          )}
        </div>
      </div>

      {owner.accountType && (
        <div className="seller-trust-section">
          <TrustBadge accountType={owner.accountType} variant="ladder" />
        </div>
      )}

      {showContactButton && onContact && (
        <div className="seller-actions">
          <button onClick={onContact} className="contact-seller-btn">
            Contact {owner.role === 'corporate' ? 'Company' : owner.role === 'realtor' ? 'Agent' : 'Owner'}
          </button>
        </div>
      )}

      {owner.phone && (
        <div className="seller-contact-info">
          <a href={`tel:${owner.phone}`} className="contact-link">
            <Phone size={13} strokeWidth={2} aria-hidden="true" />
            {owner.phone}
          </a>
        </div>
      )}

      {owner.email && (
        <div className="seller-contact-info">
          <a href={`mailto:${owner.email}`} className="contact-link">
            <Mail size={13} strokeWidth={2} aria-hidden="true" />
            {owner.email}
          </a>
        </div>
      )}

      {owner.website && (
        <div className="seller-contact-info">
          <a href={owner.website} target="_blank" rel="noopener noreferrer" className="contact-link">
            <Globe size={13} strokeWidth={2} aria-hidden="true" />
            Website
          </a>
        </div>
      )}
    </div>
  );
};

export default SellerInfo;
