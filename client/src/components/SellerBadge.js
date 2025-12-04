import React from 'react';
import './SellerBadge.css';

const SellerBadge = ({ accountType, size = 'medium' }) => {
  const badgeConfig = {
    'unverified-user': {
      label: 'Unverified',
      icon: '👤',
      className: 'unverified'
    },
    'verified-user': {
      label: 'Verified User',
      icon: '✓',
      className: 'verified-user'
    },
    'verified-seller': {
      label: 'Verified Seller',
      icon: '✓',
      className: 'verified-seller'
    },
    'realtor': {
      label: 'Realtor',
      icon: '🏢',
      className: 'realtor'
    },
    'corporate': {
      label: 'Corporate',
      icon: '🏛️',
      className: 'corporate'
    }
  };

  const config = badgeConfig[accountType] || badgeConfig['unverified-user'];

  return (
    <div className={`seller-badge ${config.className} seller-badge-${size}`}>
      <span className="seller-badge-icon">{config.icon}</span>
      <span className="seller-badge-label">{config.label}</span>
    </div>
  );
};

export default SellerBadge;
