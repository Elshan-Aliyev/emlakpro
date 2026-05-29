import React from 'react';
import { Star, Zap, Flame } from 'lucide-react';
import './PromotionBadge.css';

const BADGE_CONFIG = {
  FEATURED:  { Icon: Star,  label: 'Featured',  modifier: 'featured'  },
  PREMIUM:   { Icon: Zap,   label: 'Premium',   modifier: 'premium'   },
  SPOTLIGHT: { Icon: Flame, label: 'Spotlight', modifier: 'spotlight' },
};

/**
 * PromotionBadge — inline tier badge for listings.
 *
 * @param {{ tier: 'FEATURED'|'PREMIUM'|'SPOTLIGHT', size?: 'sm'|'md' }} props
 * @returns {JSX.Element|null} — null for FREE or unknown tiers
 */
const PromotionBadge = ({ tier, size = 'sm' }) => {
  const config = BADGE_CONFIG[tier];
  if (!config) return null;

  const { Icon, label, modifier } = config;
  const iconSize = size === 'md' ? 11 : 10;

  return (
    <span
      className={`promo-badge promo-badge--${modifier}${size === 'md' ? ' promo-badge--md' : ''}`}
      aria-label={`${label} listing`}
    >
      <Icon size={iconSize} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
};

export default PromotionBadge;
