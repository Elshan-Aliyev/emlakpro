import React, { useEffect, useState, useCallback } from 'react';
import { BarChart2, RefreshCcw } from 'lucide-react';
import { getMyDashboard } from '../services/api';
import { getLocalAnalyticsStore } from '../services/analytics';
import ListingPerformanceCard from './ListingPerformanceCard';
import './SellerDashboard.css';

const RELEVANT_EVENTS = new Set([
  'property_viewed',
  'phone_revealed',
  'inquiry_started',
  'listing_opened_from_list',
  'listing_opened_from_map',
]);

function buildLocalEventIndex(listings) {
  const ids = new Set(listings.map(p => String(p._id)));
  let rawEvents;
  try { rawEvents = getLocalAnalyticsStore() ?? []; } catch { rawEvents = []; }
  const events = rawEvents.filter(
    e => RELEVANT_EVENTS.has(e.event) && ids.has(String(e.props?.property_id))
  );
  const index = {};
  for (const e of events) {
    const pid = String(e.props?.property_id);
    if (!index[pid]) index[pid] = [];
    index[pid].push(e);
  }
  return index;
}

function computeSummary(listings) {
  return listings.reduce(
    (acc, p) => ({
      totalViews:       acc.totalViews       + (p.viewsCount      || 0),
      totalFavorites:   acc.totalFavorites   + (p.favoritesCount  || 0),
      totalInquiries:   acc.totalInquiries   + (p.inquiryCount    || 0),
      totalPhoneReveal: acc.totalPhoneReveal + (p.phoneRevealCount || 0),
    }),
    { totalViews: 0, totalFavorites: 0, totalInquiries: 0, totalPhoneReveal: 0 }
  );
}

const SellerDashboard = () => {
  const [listings,  setListings]  = useState([]);
  const [localIdx,  setLocalIdx]  = useState({});
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const token = localStorage.getItem('token');
      const res   = await getMyDashboard(token);
      const data  = res.data.listings || [];
      setListings(data);
      setLocalIdx(buildLocalEventIndex(data));
      setSummary(computeSummary(data));
    } catch (err) { // eslint-disable-line no-unused-vars
      setLoadError('Failed to load dashboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="sd-loading" aria-busy="true">
        <div className="sd-spinner" aria-hidden="true" />
        <span>Loading your performance data…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="sd-error">
        <p>{loadError}</p>
        <button className="sd-retry" onClick={load}>Retry</button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="sd-empty">
        <BarChart2 size={36} strokeWidth={1.5} aria-hidden="true" />
        <p>No listings yet. Create your first listing to see performance data.</p>
      </div>
    );
  }

  return (
    <div className="sd-container">

      {/* Summary header */}
      {summary && (
        <div className="sd-summary">
          <div className="sd-summary-card">
            <div className="sd-summary-value">{summary.totalViews.toLocaleString()}</div>
            <div className="sd-summary-label">Total views</div>
          </div>
          <div className="sd-summary-card">
            <div className="sd-summary-value">{summary.totalFavorites.toLocaleString()}</div>
            <div className="sd-summary-label">Total saves</div>
          </div>
          <div className="sd-summary-card">
            <div className="sd-summary-value">{summary.totalInquiries.toLocaleString()}</div>
            <div className="sd-summary-label">Contact requests</div>
          </div>
          <div className="sd-summary-card">
            <div className="sd-summary-value">{summary.totalPhoneReveal.toLocaleString()}</div>
            <div className="sd-summary-label">Phone reveals</div>
          </div>
        </div>
      )}

      {/* Analytics store note */}
      <p className="sd-store-note">
        Session-level view events from this browser supplement your totals.
        DB counters update in real time.
      </p>

      {/* Toolbar */}
      <div className="sd-toolbar">
        <span className="sd-count">{listings.length} listing{listings.length !== 1 ? 's' : ''}</span>
        <button className="sd-refresh" onClick={load} aria-label="Refresh dashboard">
          <RefreshCcw size={14} strokeWidth={2} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Listing cards */}
      <div className="sd-list">
        {listings.map(listing => (
          <ListingPerformanceCard
            key={listing._id}
            listing={listing}
            localEvents={localIdx[String(listing._id)] || []}
          />
        ))}
      </div>

    </div>
  );
};

export default SellerDashboard;
