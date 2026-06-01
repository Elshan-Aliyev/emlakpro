import React from 'react';
import { Tag, Building2, User, ShieldCheck, AlignJustify, Check } from 'lucide-react';
import './Badge.css';

const Badge = ({ type, size = 'medium', verified = false, showIcon = true }) => {
  const getBadgeConfig = () => {
    switch (type) {
      case 'for-sale-by-owner': return { label: 'For Sale by Owner', className: 'badge-fsbo',       Icon: Tag        };
      case 'realtor':           return { label: 'Listed by Realtor',  className: 'badge-realtor',    Icon: Building2  };
      case 'corporate':         return { label: 'Listed by Company',  className: 'badge-corporate',  Icon: Building2  };
      case 'developer':         return { label: 'Developer Project',  className: 'badge-developer',  Icon: Building2  };
      case 'admin':             return { label: 'Admin',              className: 'badge-admin',      Icon: User       };
      case 'superadmin':        return { label: 'Superadmin',         className: 'badge-superadmin', Icon: ShieldCheck };
      default:                  return { label: 'Listed',             className: 'badge-default',    Icon: AlignJustify };
    }
  };

  const { Icon, ...config } = getBadgeConfig();

  return (
    <span className={`property-badge ${config.className} badge-${size}`}>
      {showIcon && <span className="badge-icon"><Icon size={11} strokeWidth={2} aria-hidden="true" /></span>}
      <span className="badge-label">{config.label}</span>
      {verified && (
        <span className="verified-check" title="Verified">
          <Check size={9} strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </span>
  );
};

export default Badge;
