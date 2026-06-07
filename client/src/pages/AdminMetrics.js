import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStats,
  getReportStats,
  getAdminPromotionRequests,
  getAdminLeads,
  getOwnershipRequests,
} from '../services/api';
import { getLocalAnalyticsStore } from '../services/analytics';
import './Admin.css';
import './AdminMetrics.css';

const TIER_PRICING = {
  FEATURED:  { 7: 29,  30: 79,  90: 149 },
  PREMIUM:   { 7: 59,  30: 149, 90: 279 },
  SPOTLIGHT: { 7: 99,  30: 249, 90: 449 },
};

const MS_7D  = 7  * 24 * 60 * 60 * 1000;
const MS_24H = 24 * 60 * 60 * 1000;

const PAGE_VIEW_EVENTS = [
  'photography_page_viewed',
  'virtual_staging_page_viewed',
  'verification_page_viewed',
];

function countLocalEvents(events, matchFn, sinceMs) {
  const cutoff = Date.now() - sinceMs;
  return events.filter(e => e.ts > cutoff && matchFn(e)).length;
}

const StatCard = ({ title, value, sublabel, accent }) => (
  <div className="am-card">
    <div className="am-card-value" style={accent ? { color: accent } : undefined}>
      {value === null ? <span className="am-card-loading" aria-label="Loading">…</span> : value}
    </div>
    <div className="am-card-title">{title}</div>
    {sublabel && <div className="am-card-sub">{sublabel}</div>}
  </div>
);

const AdminMetrics = () => {
  const { user } = useAuth();
  const [metrics,   setMetrics]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const token       = localStorage.getItem('token');
      const localEvents = getLocalAnalyticsStore();

      const [
        adminStatsRes,
        reportStatsRes,
        promoPendingRes,
        promoApprovedRes,
        photoLeadsRes,
        stagingLeadsRes,
        completedLeadsRes,
        ownershipRes,
      ] = await Promise.allSettled([
        getAdminStats(token),
        getReportStats(token),
        getAdminPromotionRequests('pending',  token),
        getAdminPromotionRequests('approved', token),
        getAdminLeads({ leadType: 'photography',     limit: 1 }, token),
        getAdminLeads({ leadType: 'virtual_staging', limit: 1 }, token),
        getAdminLeads({ status:   'completed',       limit: 1 }, token),
        getOwnershipRequests('pending', token),
      ]);

      const safe = (res, fallback) =>
        res.status === 'fulfilled' ? res.value.data : fallback;

      const adminStats     = safe(adminStatsRes,     {});
      const reportStats    = safe(reportStatsRes,    {});
      const promoPending   = safe(promoPendingRes,   { total: 0 });
      const promoApproved  = safe(promoApprovedRes,  { requests: [] });
      const photoLeads     = safe(photoLeadsRes,     { total: 0 });
      const stagingLeads   = safe(stagingLeadsRes,   { total: 0 });
      const completedLeads = safe(completedLeadsRes, { total: 0 });
      const ownershipRaw   = safe(ownershipRes,      []);

      const verifQueueCount = Array.isArray(ownershipRaw)
        ? ownershipRaw.length
        : (ownershipRaw.total ?? 0);

      const promoRevenue = (promoApproved.requests || []).reduce((sum, pr) => (
        sum + (TIER_PRICING[pr.requestedTier]?.[pr.requestedDays] ?? 0)
      ), 0);

      setMetrics({
        promoPending:      promoPending.total      ?? 0,
        photoRequests:     photoLeads.total        ?? 0,
        stagingRequests:   stagingLeads.total      ?? 0,
        verifRequests:     verifQueueCount,
        pageViews7d:       countLocalEvents(localEvents, e => PAGE_VIEW_EVENTS.includes(e.event), MS_7D),
        inquiries7d:       countLocalEvents(localEvents, e => e.event === 'service_inquiry_submitted', MS_7D),
        completedServices: completedLeads.total    ?? 0,
        newListings30d:    adminStats.newListings  ?? 0,
        reportedListings:  (reportStats.open ?? 0) + (reportStats.reviewing ?? 0),
        verifQueue:        verifQueueCount,
        activeUsers30d:    adminStats.newUsers     ?? 0,
        dailyInquiries:    countLocalEvents(localEvents, e => e.event === 'service_inquiry_submitted', MS_24H),
        promoRevenue,
      });
    } catch (err) {
      setLoadError('Some metrics failed to load. Refresh to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const m = metrics;

  return (
    <div className="admin-page">
      <div className="admin-container">

        <div className="am-header">
          <div>
            <h1 className="admin-title">Metrics</h1>
            <p className="admin-subtitle">Revenue, conversion, marketplace health, and platform vitals</p>
          </div>
          <button className="am-refresh" onClick={load} disabled={loading} aria-label="Refresh metrics">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {loadError && <p className="am-error" role="alert">{loadError}</p>}

        {/* ── Revenue ─────────────────────────────────────────────────────── */}
        <section className="am-section" aria-labelledby="am-s-revenue">
          <h2 id="am-s-revenue" className="am-section-title">Revenue</h2>
          <div className="am-grid am-grid--4">
            <StatCard
              title="Promotion Requests"
              value={loading ? null : m?.promoPending}
              sublabel="pending review"
              accent="#7c3aed"
            />
            <StatCard
              title="Photography Requests"
              value={loading ? null : m?.photoRequests}
              sublabel="total received"
              accent="#0F766E"
            />
            <StatCard
              title="Virtual Staging Requests"
              value={loading ? null : m?.stagingRequests}
              sublabel="total received"
              accent="#0F766E"
            />
            <StatCard
              title="Verification Requests"
              value={loading ? null : m?.verifRequests}
              sublabel="pending ownership queue"
              accent="#d97706"
            />
          </div>
        </section>

        {/* ── Conversion ──────────────────────────────────────────────────── */}
        <section className="am-section" aria-labelledby="am-s-conversion">
          <h2 id="am-s-conversion" className="am-section-title">Conversion</h2>
          <p className="am-section-note">Sourced from the local analytics store — reflects this browser session</p>
          <div className="am-grid am-grid--3">
            <StatCard
              title="Service Page Views"
              value={loading ? null : m?.pageViews7d}
              sublabel="last 7 days"
            />
            <StatCard
              title="Inquiries"
              value={loading ? null : m?.inquiries7d}
              sublabel="last 7 days"
              accent="#0F766E"
            />
            <StatCard
              title="Completed Services"
              value={loading ? null : m?.completedServices}
              sublabel="all time"
              accent="#16a34a"
            />
          </div>
        </section>

        {/* ── Marketplace ─────────────────────────────────────────────────── */}
        <section className="am-section" aria-labelledby="am-s-marketplace">
          <h2 id="am-s-marketplace" className="am-section-title">Marketplace</h2>
          <div className="am-grid am-grid--4">
            <StatCard
              title="New Listings"
              value={loading ? null : m?.newListings30d}
              sublabel="last 30 days"
            />
            <StatCard
              title="Reported Listings"
              value={loading ? null : m?.reportedListings}
              sublabel="open + reviewing"
              accent={m?.reportedListings > 0 ? '#dc2626' : undefined}
            />
            <StatCard
              title="Reported Reviews"
              value="—"
              sublabel="Available in Phase 5.6"
            />
            <StatCard
              title="Verification Queue"
              value={loading ? null : m?.verifQueue}
              sublabel="pending documents"
              accent={m?.verifQueue > 5 ? '#d97706' : undefined}
            />
          </div>
        </section>

        {/* ── Health ──────────────────────────────────────────────────────── */}
        <section className="am-section" aria-labelledby="am-s-health">
          <h2 id="am-s-health" className="am-section-title">Health</h2>
          <div className="am-grid am-grid--3">
            <StatCard
              title="Active Users"
              value={loading ? null : m?.activeUsers30d}
              sublabel="registered last 30 days"
            />
            <StatCard
              title="Daily Inquiries"
              value={loading ? null : m?.dailyInquiries}
              sublabel="last 24 hours (local store)"
              accent={m?.dailyInquiries > 0 ? '#0F766E' : undefined}
            />
            <StatCard
              title="Promotion Revenue"
              value={loading ? null : `AZN ${(m?.promoRevenue ?? 0).toLocaleString()}`}
              sublabel="from approved requests, all time"
              accent="#7c3aed"
            />
          </div>
        </section>

      </div>
    </div>
  );
};

export default AdminMetrics;
