import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getOpsDashboard, getSellerResponseStats } from '../services/api';
import './Admin.css';
import './AdminOpsDashboard.css';

// ─── Reusable primitives ──────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, accent }) => (
  <div className={`ops-card ${accent ? `ops-card--${accent}` : ''}`}>
    <p className="ops-card-value">{value ?? '—'}</p>
    <p className="ops-card-label">{label}</p>
    {sub && <p className="ops-card-sub">{sub}</p>}
  </div>
);

const TrustBar = ({ label, pct, count, total }) => (
  <div className="ops-trust-row">
    <div className="ops-trust-meta">
      <span className="ops-trust-label">{label}</span>
      <span className="ops-trust-pct">{pct}%</span>
    </div>
    <div className="ops-trust-track">
      <div
        className="ops-trust-fill"
        style={{ width: `${Math.min(pct, 100)}%` }}
        aria-label={`${pct}%`}
      />
    </div>
    <p className="ops-trust-count">{count} of {total}</p>
  </div>
);

const SectionHeader = ({ title, description }) => (
  <div className="ops-section-head">
    <h2 className="ops-section-title">{title}</h2>
    {description && <p className="ops-section-desc">{description}</p>}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

// Formats hours into a readable label: e.g. 1.5 → "1.5h", 25 → "25h", 50 → "2.1d"
const fmtHours = (h) => {
  if (h == null) return '—';
  if (h < 1)    return '<1h';
  if (h < 24)   return `${h}h`;
  return `${(h / 24).toFixed(1)}d`;
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'never';

const ResponsivenessTable = ({ title, rows, columns }) => {
  if (!rows?.length) return (
    <div className="ops-resp-empty">No sellers in this category.</div>
  );
  return (
    <div className="ops-resp-table-wrap">
      <p className="ops-resp-table-title">{title}</p>
      <table className="ops-resp-table">
        <thead>
          <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(s => (
            <tr key={s._id}>
              {columns.map(c => <td key={c.key}>{c.render(s)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminOpsDashboard = () => {
  const [data, setData]     = useState(null);
  const [resp, setResp]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const [opsRes, respRes] = await Promise.all([
        getOpsDashboard(token),
        getSellerResponseStats(token),
      ]);
      setData(opsRes.data);
      setResp(respRes.data);
    } catch (err) {
      console.error('[ops-dashboard] fetch error:', err);
      setError('Failed to load operations data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { moderation, trust, activity, conversion, responsiveness } = data || {};

  return (
    <div className="admin-page">
      <div className="admin-container">

        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-top">
            <h1>Operations <span className="admin-badge">Internal</span></h1>
            <button className="ops-refresh-btn" onClick={fetchData} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <p>Marketplace trust health and operational metrics.</p>
        </div>

        {/* Nav */}
        <nav className="admin-nav">
          <Link to="/admin"            className="admin-nav-item">Dashboard</Link>
          <Link to="/admin/listings"   className="admin-nav-item">Listings</Link>
          <Link to="/admin/users"      className="admin-nav-item">Users</Link>
          <Link to="/admin/reports"    className="admin-nav-item">Reports</Link>
          <Link to="/admin/ownership"  className="admin-nav-item">Ownership</Link>
          <Link to="/admin/operations" className="admin-nav-item active">Operations</Link>
          <Link to="/admin/abuse"      className="admin-nav-item">Abuse Center</Link>
          <Link to="/admin/settings"   className="admin-nav-item">Settings</Link>
        </nav>

        {error && <p className="ops-error">{error}</p>}

        {loading && !data ? (
          <p className="ops-loading">Loading…</p>
        ) : (
          <>
            {/* ── 1. Moderation Queue ─────────────────────────────────── */}
            <section className="ops-section">
              <SectionHeader
                title="Moderation Queue"
                description="Listings and reports that require review."
              />
              <div className="ops-grid ops-grid--5">
                <StatCard
                  label="Pending listings"
                  value={moderation?.pendingListings}
                  accent={moderation?.pendingListings > 0 ? 'amber' : undefined}
                />
                <StatCard
                  label="Flagged listings"
                  value={moderation?.flaggedListings}
                  accent={moderation?.flaggedListings > 0 ? 'red' : undefined}
                />
                <StatCard
                  label="Suspected duplicates"
                  value={moderation?.suspectedDuplicates}
                  accent={moderation?.suspectedDuplicates > 0 ? 'amber' : undefined}
                />
                <StatCard
                  label="Open reports"
                  value={moderation?.openReports}
                  accent={moderation?.openReports > 0 ? 'red' : undefined}
                />
                <StatCard
                  label="Avg. review time"
                  value={
                    moderation?.avgReviewHours != null
                      ? moderation.avgReviewHours < 1
                        ? `<1h`
                        : moderation.avgReviewHours >= 24
                          ? `${(moderation.avgReviewHours / 24).toFixed(1)}d`
                          : `${moderation.avgReviewHours}h`
                      : '—'
                  }
                  sub="listing creation → approval"
                />
              </div>
            </section>

            {/* ── 2. Trust Metrics ────────────────────────────────────── */}
            <section className="ops-section">
              <SectionHeader
                title="Trust Metrics"
                description="Verification coverage across users and listings."
              />
              <div className="ops-trust-panel">
                <TrustBar
                  label="Phone verified owners"
                  pct={trust?.phoneVerifiedPct ?? 0}
                  count={trust?.phoneVerifiedUsers ?? 0}
                  total={trust?.totalUsers ?? 0}
                />
                <TrustBar
                  label="Verified accounts"
                  pct={trust?.verifiedUsersPct ?? 0}
                  count={trust?.verifiedUsers ?? 0}
                  total={trust?.totalUsers ?? 0}
                />
                <TrustBar
                  label="Ownership-reviewed listings"
                  pct={trust?.ownershipReviewedPct ?? 0}
                  count={trust?.ownershipReviewedListings ?? 0}
                  total={trust?.totalListings ?? 0}
                />
                <TrustBar
                  label="Duplicate detection rate"
                  pct={trust?.duplicateDetectionRate ?? 0}
                  count={trust?.suspectedDuplicates ?? 0}
                  total={trust?.totalListings ?? 0}
                />
              </div>
            </section>

            {/* ── 3. Marketplace Activity ─────────────────────────────── */}
            <section className="ops-section">
              <SectionHeader
                title="Marketplace Activity"
                description="Actions recorded today."
              />
              <div className="ops-grid ops-grid--4">
                <StatCard
                  label="Inquiries sent today"
                  value={activity?.inquiriesToday}
                />
                <StatCard
                  label="Listings created today"
                  value={activity?.listingsCreatedToday}
                />
                <StatCard
                  label="Listings approved today"
                  value={activity?.listingsApprovedToday}
                />
                <StatCard
                  label="Total phone reveals"
                  value={activity?.totalPhoneReveals}
                  sub="all time"
                />
              </div>
            </section>

            {/* ── 4. Conversion Signals ───────────────────────────────── */}
            <section className="ops-section">
              <SectionHeader
                title="Conversion Signals"
                description="Engagement ratios across active inventory."
              />
              <div className="ops-grid ops-grid--3">
                <StatCard
                  label="Inquiry / listing"
                  value={conversion?.inquiryPerListing}
                  sub={`${conversion?.totalInquiries ?? 0} total inquiries`}
                />
                <StatCard
                  label="Phone reveal / listing"
                  value={conversion?.phoneRevealPerListing}
                  sub={`${conversion?.totalPhoneReveals ?? 0} total reveals`}
                />
                <StatCard
                  label="Active listings (base)"
                  value={conversion?.activeListings}
                  sub="approved + active status"
                />
              </div>
            </section>

            {/* ── 5. Seller Responsiveness ─────────────────────────────── */}
            <section className="ops-section">
              <SectionHeader
                title="Seller Responsiveness"
                description="Inquiry handling quality across active sellers. Internal only."
              />
              <div className="ops-grid ops-grid--5">
                <StatCard
                  label="Low response rate"
                  value={responsiveness?.sellersWithLowRate ?? '—'}
                  sub="< 50% within 48h"
                  accent={responsiveness?.sellersWithLowRate > 0 ? 'amber' : undefined}
                />
                <StatCard
                  label="Slow responders"
                  value={responsiveness?.sellersWithSlowResponse ?? '—'}
                  sub="avg > 24h first reply"
                  accent={responsiveness?.sellersWithSlowResponse > 0 ? 'amber' : undefined}
                />
                <StatCard
                  label="Inactive sellers"
                  value={responsiveness?.sellersInactive30d ?? '—'}
                  sub="no reply in 30 days"
                  accent={responsiveness?.sellersInactive30d > 0 ? 'red' : undefined}
                />
                <StatCard
                  label="Platform response rate"
                  value={responsiveness?.overallResponseRate != null ? `${responsiveness.overallResponseRate}%` : '—'}
                  sub="across tracked sellers"
                />
                <StatCard
                  label="Avg. first response"
                  value={fmtHours(responsiveness?.overallAvgResponseHours)}
                  sub="platform-wide"
                />
              </div>

              {/* Flagged seller lists */}
              {resp && (
                <div className="ops-resp-lists">
                  <ResponsivenessTable
                    title="Low response rate (< 50%)"
                    rows={resp.lowRate}
                    columns={[
                      { key: 'name',  label: 'Seller',      render: s => `${s.name}${s.lastName ? ' ' + s.lastName : ''}` },
                      { key: 'email', label: 'Email',       render: s => s.email },
                      { key: 'rate',  label: 'Rate',        render: s => s.responseRate != null ? `${s.responseRate}%` : '—' },
                      { key: 'avg',   label: 'Avg. time',   render: s => fmtHours(s.averageResponseTimeHours) },
                    ]}
                  />
                  <ResponsivenessTable
                    title="Slow first response (> 24h)"
                    rows={resp.slow}
                    columns={[
                      { key: 'name',  label: 'Seller',      render: s => `${s.name}${s.lastName ? ' ' + s.lastName : ''}` },
                      { key: 'email', label: 'Email',       render: s => s.email },
                      { key: 'avg',   label: 'Avg. time',   render: s => fmtHours(s.averageResponseTimeHours) },
                      { key: 'rate',  label: 'Rate',        render: s => s.responseRate != null ? `${s.responseRate}%` : '—' },
                    ]}
                  />
                  <ResponsivenessTable
                    title="Inactive — no reply in 30+ days"
                    rows={resp.inactive}
                    columns={[
                      { key: 'name',  label: 'Seller',       render: s => `${s.name}${s.lastName ? ' ' + s.lastName : ''}` },
                      { key: 'email', label: 'Email',        render: s => s.email },
                      { key: 'last',  label: 'Last response', render: s => formatDate(s.lastResponseAt) },
                      { key: 'rate',  label: 'Rate',         render: s => s.responseRate != null ? `${s.responseRate}%` : '—' },
                    ]}
                  />
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOpsDashboard;
