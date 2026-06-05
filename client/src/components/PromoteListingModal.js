import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Star, Zap, TrendingUp } from 'lucide-react';
import { submitPromotionRequest } from '../services/api';
import { track } from '../services/analytics';
import './PromoteListingModal.css';

const TIERS = [
  {
    id: 'FEATURED',
    label: 'Featured',
    icon: <Star size={20} strokeWidth={1.5} aria-hidden="true" />,
    color: '#f59e0b',
    tagline: '+15% search visibility',
    benefits: ['Yellow Featured badge', 'Boosted search ranking', 'Higher in filtered results'],
    pricing: { 7: 29, 30: 79, 90: 149 },
  },
  {
    id: 'PREMIUM',
    label: 'Premium',
    icon: <Zap size={20} strokeWidth={1.5} aria-hidden="true" />,
    color: '#7c3aed',
    popular: true,
    tagline: '+50% search visibility',
    benefits: ['Purple Premium badge', 'Prominent search placement', 'Highlighted card border', 'Spotlight map pin'],
    pricing: { 7: 59, 30: 149, 90: 279 },
  },
  {
    id: 'SPOTLIGHT',
    label: 'Spotlight',
    icon: <TrendingUp size={20} strokeWidth={1.5} aria-hidden="true" />,
    color: '#0F766E',
    tagline: '+200% search visibility',
    benefits: ['Teal Spotlight badge', 'Top search position', 'Homepage carousel placement', 'Amber map pin (scaled)', 'Admin-priority support'],
    pricing: { 7: 99, 30: 249, 90: 449 },
  },
];

const DURATIONS = [
  { days: 7,  label: '7 days'  },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const PromoteListingModal = ({ property, onClose, onSubmitted }) => {
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedDays, setSelectedDays] = useState(30);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [submitted,    setSubmitted]    = useState(false);

  useEffect(() => {
    track('promotion_page_viewed', { propertyId: property._id });
  }, [property._id]);

  const handleTierSelect = (tierId) => {
    setSelectedTier(tierId);
    track('promotion_plan_selected', { propertyId: property._id, tier: tierId, days: selectedDays });
  };

  const handleDaysChange = (days) => {
    setSelectedDays(days);
    if (selectedTier) {
      track('promotion_plan_selected', { propertyId: property._id, tier: selectedTier, days });
    }
  };

  const handleSubmit = async () => {
    if (!selectedTier) { setError('Please select a promotion tier.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await submitPromotionRequest(
        { propertyId: property._id, requestedTier: selectedTier, requestedDays: selectedDays },
        token
      );
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(msg || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeTier = TIERS.find(t => t.id === selectedTier);

  if (submitted) {
    return (
      <div className="plm-backdrop" onClick={onClose}>
        <div className="plm-panel plm-panel--success" onClick={e => e.stopPropagation()}>
          <CheckCircle size={40} strokeWidth={1.5} color="var(--color-primary, #0F766E)" aria-hidden="true" />
          <h2 className="plm-success-title">Request submitted</h2>
          <p className="plm-success-body">
            Your promotion request for <strong>{property.title}</strong> is under review.
            We typically process requests within 1 business day.
          </p>
          <button className="plm-close-btn plm-close-btn--primary" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="plm-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Promote listing">
      <div className="plm-panel" onClick={e => e.stopPropagation()}>

        <div className="plm-header">
          <div>
            <h2 className="plm-title">Promote Listing</h2>
            <p className="plm-subtitle">{property.title}</p>
          </div>
          <button className="plm-x" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="plm-tiers">
          {TIERS.map(tier => (
            <button
              key={tier.id}
              className={`plm-tier${selectedTier === tier.id ? ' plm-tier--selected' : ''}${tier.popular ? ' plm-tier--popular' : ''}`}
              onClick={() => handleTierSelect(tier.id)}
              type="button"
            >
              {tier.popular && <span className="plm-popular-badge">Popular</span>}
              <span className="plm-tier-icon" style={{ color: tier.color }}>{tier.icon}</span>
              <span className="plm-tier-label">{tier.label}</span>
              <span className="plm-tier-tagline">{tier.tagline}</span>
              <ul className="plm-tier-benefits">
                {tier.benefits.map((b, i) => (
                  <li key={i}><CheckCircle size={11} strokeWidth={2.5} aria-hidden="true" /> {b}</li>
                ))}
              </ul>
              <span className="plm-tier-price">AZN {tier.pricing[selectedDays]}</span>
            </button>
          ))}
        </div>

        <div className="plm-duration">
          <span className="plm-duration-label">Duration</span>
          <div className="plm-duration-options">
            {DURATIONS.map(d => (
              <button
                key={d.days}
                className={`plm-duration-btn${selectedDays === d.days ? ' plm-duration-btn--active' : ''}`}
                onClick={() => handleDaysChange(d.days)}
                type="button"
              >
                {d.label}
                {activeTier && (
                  <span className="plm-duration-price"> · AZN {activeTier.pricing[d.days]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTier && (
          <div className="plm-summary">
            <span>{activeTier.label} · {selectedDays} days</span>
            <span className="plm-summary-price">AZN {activeTier.pricing[selectedDays]}</span>
          </div>
        )}

        {error && <p className="plm-error" role="alert">{error}</p>}

        <p className="plm-note">
          No payment is collected now. Admin will review and activate your promotion.
        </p>

        <div className="plm-actions">
          <button className="plm-btn plm-btn--cancel" type="button" onClick={onClose}>Cancel</button>
          <button
            className="plm-btn plm-btn--submit"
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedTier}
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PromoteListingModal;
