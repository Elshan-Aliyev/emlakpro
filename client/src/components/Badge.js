import React from 'react';
import './Badge.css';

const Badge = ({ type, size = 'medium', verified = false, showIcon = true }) => {
  const getBadgeConfig = () => {
    switch (type) {
      case 'for-sale-by-owner':
        return {
          label: 'For Sale by Owner',
          className: 'badge-fsbo',
          icon: '🏷️'
        };
      case 'realtor':
        return {
          label: 'Listed by Realtor',
          className: 'badge-realtor',
          icon: '🏢'
        };
      case 'corporate':
        return {
          label: 'Listed by Company',
          className: 'badge-corporate',
          icon: '🏛️'
        };
      case 'developer':
        return {
          label: 'Developer Project',
          className: 'badge-developer',
          icon: '🏗️'
        };
      case 'admin':
        return {
          label: 'Admin',
          className: 'badge-admin',
          icon: '👤'
        };
      case 'superadmin':
        return {
          label: 'Superadmin',
          className: 'badge-superadmin',
          icon: '👑'
        };
      default:
        return {
          label: 'Listed',
          className: 'badge-default',
          icon: '📋'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span className={`property-badge ${config.className} badge-${size}`}>
      {showIcon && <span className="badge-icon">{config.icon}</span>}
      <span className="badge-label">{config.label}</span>
      {verified && <span className="verified-check" title="Verified">✓</span>}
    </span>
  );
};

export default Badge;
