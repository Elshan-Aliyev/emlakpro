import React, { useState } from 'react';
import { Eye, Heart, Phone, MessageSquare, Shield, Star, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import './ListingPerformanceCard.css';

const TIER_META = {
  SPOTLIGHT: { label: 'Spotlight', color: '#0F766E', bg: '#f0fdf4' },
  PREMIUM:   { label: 'Premium',   color: '#7c3aed', bg: '#f5f3ff' },
  FEATURED:  { label: 'Featured',  color: '#d97706', bg: '#fffbeb' },
  FREE:      { label: 'Free',      color: '#6b7280', bg: '#f9fafb' },
};

const BENCHMARK_META = {
  above_average: { label: 'Above Average', color: '#166534', bg: '#f0fdf4' },
  average:       { label: 'Average',        color: '#6b7280', bg: '#f9fafb' },
  below_average: { label: 'Below Average',  color: '#dc2626', bg: '#fef2f2' },
};

function StatRow({ icon, label, value, benchmark }) {
  const bm = benchmark ? BENCHMARK_META[benchmark] : null;
  return (
    <div className="lpc-stat-row">
      <span className="lpc-stat-icon">{icon}</span>
      <span className="lpc-stat-label">{label}</span>
      <span className="lpc-stat-value">{value ?? '—'}</span>
      {bm && (
        <span className="lpc-benchmark" style={{ color: bm.color, background: bm.bg }}>
          {bm.label}
        </span>
      )}
    </div>
  );
}

const ListingPerformanceCard = ({ listing, localEvents }) => {
  const [expanded, setExpanded] = useState(false);

  const {
    title, city, price, currency,
    viewsCount, favoritesCount, inquiryCount, phoneRevealCount,
    ownershipVerificationStatus,
    reputationSummary,
    promotionTier, isPromoted, promotionStartDate, promotionEndDate,
    benchmark = {},
    _id,
  } = listing;

  // Supplement DB view count with local analytics store events for this listing
  const localViews = localEvents.filter(
    e => e.event === 'property_viewed' && e.props?.property_id === String(_id)
  ).length;

  const totalViews = (viewsCount || 0) + localViews;

  const now      = new Date();
  const endDate  = promotionEndDate ? new Date(promotionEndDate) : null;
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : null;
  const tier     = TIER_META[promotionTier] || TIER_META.FREE;
  const isActive = isPromoted && endDate && endDate > now;

  const verified = ownershipVerificationStatus === 'approved';
  const { avgRating = 0, reviewCount = 0, recommendPercentage = 0 } = reputationSummary || {};

  return (
    <div className="lpc-card">
      {/* Header */}
      <div className="lpc-header">
        <div className="lpc-header-info">
          <span className="lpc-title">{title}</span>
          <span className="lpc-location">{city || '—'}</span>
        </div>
        <div className="lpc-header-right">
          <span className="lpc-price">
            {currency || 'AZN'} {price?.toLocaleString() || '—'}
          </span>
          <button
            className="lpc-toggle"
            onClick={() => setExpanded(e => !e)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded
              ? <ChevronUp size={16} aria-hidden="true" />
              : <ChevronDown size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Always-visible summary strip */}
      <div className="lpc-summary-strip">
        <span className="lpc-strip-item">
          <Eye size={13} strokeWidth={2} aria-hidden="true" />
          {totalViews.toLocaleString()} views
        </span>
        <span className="lpc-strip-item">
          <Heart size={13} strokeWidth={2} aria-hidden="true" />
          {(favoritesCount || 0).toLocaleString()} saved
        </span>
        {reviewCount > 0 && (
          <span className="lpc-strip-item">
            <Star size={13} strokeWidth={2} aria-hidden="true" />
            {avgRating.toFixed(1)} ({reviewCount})
          </span>
        )}
        {isActive && (
          <span className="lpc-promo-pill" style={{ color: tier.color, background: tier.bg }}>
            {tier.label}
          </span>
        )}
        {benchmark.views && benchmark.comparableCount >= 3 && (
          <span
            className="lpc-benchmark-pill"
            style={{
              color: BENCHMARK_META[benchmark.views]?.color,
              background: BENCHMARK_META[benchmark.views]?.bg,
            }}
          >
            {BENCHMARK_META[benchmark.views]?.label}
          </span>
        )}
      </div>

      {/* Expanded detail sections */}
      {expanded && (
        <div className="lpc-sections">

          {/* Visibility */}
          <div className="lpc-section">
            <h4 className="lpc-section-title">Visibility</h4>
            <StatRow
              icon={<Eye size={14} strokeWidth={1.75} aria-hidden="true" />}
              label="Detail views"
              value={totalViews.toLocaleString()}
              benchmark={benchmark.views}
            />
            <StatRow
              icon={<Eye size={14} strokeWidth={1.75} aria-hidden="true" />}
              label="Unique visitors"
              value="—"
            />
            <StatRow
              icon={<Eye size={14} strokeWidth={1.75} aria-hidden="true" />}
              label="Map opens"
              value="—"
            />
          </div>

          {/* Engagement */}
          <div className="lpc-section">
            <h4 className="lpc-section-title">Engagement</h4>
            <StatRow
              icon={<Heart size={14} strokeWidth={1.75} aria-hidden="true" />}
              label="Favorites"
              value={(favoritesCount || 0).toLocaleString()}
              benchmark={benchmark.favorites}
            />
            <StatRow
              icon={<Phone size={14} strokeWidth={1.75} aria-hidden="true" />}
              label="Phone reveals"
              value={(phoneRevealCount || 0).toLocaleString()}
              benchmark={benchmark.phoneReveal}
            />
            <StatRow
              icon={<MessageSquare size={14} strokeWidth={1.75} aria-hidden="true" />}
              label="Contact requests"
              value={(inquiryCount || 0).toLocaleString()}
              benchmark={benchmark.inquiries}
            />
          </div>

          {/* Trust */}
          <div className="lpc-section">
            <h4 className="lpc-section-title">Trust</h4>
            <StatRow
              icon={<Shield size={14} strokeWidth={1.75} aria-hidden="true" />}
              label="Verified Owner"
              value={verified ? 'Verified' : 'Not verified'}
            />
            <StatRow
              icon={<Star size={14} strokeWidth={1.75} aria-hidden="true" />}
              label="Reviews"
              value={reviewCount > 0
                ? `${avgRating.toFixed(1)} ★ (${reviewCount})`
                : 'No reviews yet'}
            />
            {reviewCount > 0 && (
              <StatRow
                icon={<TrendingUp size={14} strokeWidth={1.75} aria-hidden="true" />}
                label="Recommend rate"
                value={`${recommendPercentage}%`}
              />
            )}
          </div>

          {/* Promotion */}
          <div className="lpc-section">
            <h4 className="lpc-section-title">Promotion</h4>
            <StatRow
              icon={<TrendingUp size={14} strokeWidth={1.75} aria-hidden="true" />}
              label="Current tier"
              value={isActive ? tier.label : 'None'}
            />
            {isActive && endDate && (
              <>
                <StatRow
                  icon={<Calendar size={14} strokeWidth={1.75} aria-hidden="true" />}
                  label="Started"
                  value={promotionStartDate
                    ? new Date(promotionStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                />
                <StatRow
                  icon={<Calendar size={14} strokeWidth={1.75} aria-hidden="true" />}
                  label="Expires"
                  value={endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                />
                <StatRow
                  icon={<Calendar size={14} strokeWidth={1.75} aria-hidden="true" />}
                  label="Days remaining"
                  value={`${daysLeft}d`}
                />
              </>
            )}
          </div>

          {/* Benchmark note */}
          {benchmark.comparableCount > 0 && (
            <p className="lpc-benchmark-note">
              Benchmarked against {benchmark.comparableCount} similar listing{benchmark.comparableCount !== 1 ? 's' : ''} in {city || 'this area'}.
              {benchmark.comparableCount < 3 && ' (Insufficient data for reliable comparison.)'}
            </p>
          )}

        </div>
      )}
    </div>
  );
};

export default ListingPerformanceCard;
