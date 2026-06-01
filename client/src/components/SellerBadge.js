import React from 'react';
import { User, Check, ShieldCheck, Building2 } from 'lucide-react';
import './SellerBadge.css';

const BADGE_CONFIG = {
  'unverified-user':  { label: 'Unverified',      Icon: User,        className: 'unverified'      },
  'verified-user':    { label: 'Verified',         Icon: Check,       className: 'verified-user'   },
  'verified-seller':  { label: 'Verified Seller',  Icon: ShieldCheck, className: 'verified-seller' },
  'realtor':          { label: 'Realtor',          Icon: Building2,   className: 'realtor'         },
  'corporate':        { label: 'Corporate',        Icon: Building2,   className: 'corporate'       },
};

const SellerBadge = ({ accountType, size = 'medium' }) => {
  const config = BADGE_CONFIG[accountType] || BADGE_CONFIG['unverified-user'];
  const { Icon } = config;

  return (
    <div className={`seller-badge ${config.className} seller-badge-${size}`}>
      <span className="seller-badge-icon"><Icon size={11} strokeWidth={2} aria-hidden="true" /></span>
      <span className="seller-badge-label">{config.label}</span>
    </div>
  );
};

export default SellerBadge;
