import React from 'react';
import './PropertyRatingChip.css';

/**
 * Compact rating chip for property cards.
 * Props come from reputationSummary — never makes its own API request.
 * Hidden when reviewCount === 0.
 */
const PropertyRatingChip = ({ avgRating, reviewCount }) => {
  if (!reviewCount || reviewCount === 0) return null;

  const display = typeof avgRating === 'number'
    ? avgRating.toFixed(1)
    : '0.0';

  return (
    <span
      className="prc-chip"
      aria-label={`${display} stars, ${reviewCount} review${reviewCount !== 1 ? 's' : ''}`}
    >
      <span className="prc-star" aria-hidden="true">★</span>
      <span className="prc-rating">{display}</span>
      <span className="prc-count">({reviewCount})</span>
    </span>
  );
};

export default PropertyRatingChip;
