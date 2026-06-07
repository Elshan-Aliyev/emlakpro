import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getReports, getReportStats, updateReport, getAdminPropertyReviews, adminModeratePropertyReview, adminDeletePropertyReview } from '../services/api';
import { track } from '../services/analytics';
import './Admin.css';
import './AdminReports.css';

const STATUS_LABELS = {
  open:       { label: 'Open',       color: '#dc2626', bg: '#fef2f2' },
  reviewing:  { label: 'Reviewing',  color: '#d97706', bg: '#fffbeb' },
  resolved:   { label: 'Resolved',   color: '#16a34a', bg: '#f0fdf4' },
  dismissed:  { label: 'Dismissed',  color: '#6b7280', bg: '#f9fafb' },
};

const CATEGORY_LABELS = {
  'fake-listing':        'Fake listing',
  'wrong-price':         'Wrong price',
  'duplicate-listing':   'Duplicate listing',
  'scam-fraud':          'Scam / fraud',
  'already-sold-rented': 'Already sold/rented',
  'offensive-content':   'Offensive content',
  'suspicious-behavior': 'Suspicious behavior',
  'scam-attempt':        'Scam attempt',
  'harassment':          'Harassment',
};

const AdminReports = () => {
  useAuth();
  const { success, error: showError } = useToast();

  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ open: 0, reviewing: 0, resolved: 0, dismissed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [resolveModal, setResolveModal] = useState(null); // { report, action: 'resolved'|'dismissed'|'reviewing' }
  const [resolutionNote, setResolutionNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Property Reviews tab
  const [activeTab,       setActiveTab]       = useState('reports'); // 'reports' | 'property-reviews'
  const [prReviews,       setPrReviews]       = useState([]);
  const [prLoading,       setPrLoading]       = useState(false);
  const [prStatusFilter,  setPrStatusFilter]  = useState('reported');
  const [prPage,          setPrPage]          = useState(1);
  const [prTotal,         setPrTotal]         = useState(0);
  const [prExpandedId,    setPrExpandedId]    = useState(null);
  const [prModNotes,      setPrModNotes]      = useState({});

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await getReportStats(token);
      setStats(res.data);
    } catch (err) {
      console.error('fetchStats error:', err);
    }
  }, []);

  const fetchReports = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = { page: p, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.targetType = typeFilter;
      const res = await getReports(params, token);
      setReports(res.data.reports);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error('fetchReports error:', err);
      showError('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, showError]);

  const fetchPropertyReviews = useCallback(async (p = 1) => {
    setPrLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await getAdminPropertyReviews(prStatusFilter, token);
      setPrReviews(res.data.reviews  || []);
      setPrTotal(res.data.total || 0);
      setPrPage(p);
    } catch (err) {
      showError('Failed to load property reviews.');
    } finally {
      setPrLoading(false);
    }
  }, [prStatusFilter, showError]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
    fetchReports(1);
  }, [statusFilter, typeFilter, fetchReports]);

  useEffect(() => {
    if (activeTab === 'property-reviews') fetchPropertyReviews(1);
  }, [activeTab, prStatusFilter, fetchPropertyReviews]);

  const handlePageChange = (p) => {
    setPage(p);
    fetchReports(p);
  };

  const openResolveModal = (report, action) => {
    setResolveModal({ report, action });
    setResolutionNote('');
  };

  const handleUpdateReport = async () => {
    if (!resolveModal) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await updateReport(resolveModal.report._id, {
        status: resolveModal.action,
        resolutionNote,
      }, token);
      success(`Report marked as ${resolveModal.action}.`);
      setResolveModal(null);
      fetchReports(page);
      fetchStats();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update report.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRestoreReview = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      const note  = prModNotes[reviewId] || '';
      await adminModeratePropertyReview(reviewId, 'active', note, token);
      track('review_restored', { reviewId });
      success('Review restored.');
      fetchPropertyReviews(prPage);
    } catch (err) {
      showError('Failed to restore review.');
    }
  };

  const handleHideReview = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      const note  = prModNotes[reviewId] || '';
      await adminModeratePropertyReview(reviewId, 'hidden', note, token);
      track('review_hidden', { reviewId });
      success('Review hidden.');
      fetchPropertyReviews(prPage);
    } catch (err) {
      showError('Failed to hide review.');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Permanently delete this review? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await adminDeletePropertyReview(reviewId, token);
      track('review_deleted_by_admin', { reviewId });
      success('Review permanently deleted.');
      fetchPropertyReviews(prPage);
    } catch (err) {
      showError('Failed to delete review.');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="admin-page">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-top">
            <h1>Reports <span className="admin-badge">Moderation</span></h1>
          </div>
          <p>Review community-submitted fraud and abuse reports.</p>
        </div>

        {/* Nav tabs (reuse admin pattern) */}
        <nav className="admin-nav">
          <Link to="/admin" className="admin-nav-item">Dashboard</Link>
          <Link to="/admin/listings" className="admin-nav-item">Listings</Link>
          <Link to="/admin/users" className="admin-nav-item">Users</Link>
          <Link to="/admin/reports"     className="admin-nav-item active">Reports</Link>
          <Link to="/admin/ownership"   className="admin-nav-item">Ownership</Link>
          <Link to="/admin/operations"  className="admin-nav-item">Operations</Link>
          <Link to="/admin/abuse"       className="admin-nav-item">Abuse Center</Link>
          <Link to="/admin/settings"    className="admin-nav-item">Settings</Link>
        </nav>

        {/* Tab selector */}
        <div className="ar-tabs" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`ar-tab-btn${activeTab === 'reports' ? ' ar-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('reports')}
            style={{
              padding: '7px 14px',
              borderRadius: 7,
              border: `1.5px solid ${activeTab === 'reports' ? 'var(--color-primary, #0F766E)' : 'rgba(15,23,42,0.10)'}`,
              background: activeTab === 'reports' ? 'var(--color-primary, #0F766E)' : 'none',
              color: activeTab === 'reports' ? '#fff' : 'var(--gray-500)',
              fontSize: '0.8125rem',
              fontWeight: activeTab === 'reports' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Reports
          </button>
          <button
            className={`ar-tab-btn${activeTab === 'property-reviews' ? ' ar-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('property-reviews')}
            style={{
              padding: '7px 14px',
              borderRadius: 7,
              border: `1.5px solid ${activeTab === 'property-reviews' ? 'var(--color-primary, #0F766E)' : 'rgba(15,23,42,0.10)'}`,
              background: activeTab === 'property-reviews' ? 'var(--color-primary, #0F766E)' : 'none',
              color: activeTab === 'property-reviews' ? '#fff' : 'var(--gray-500)',
              fontSize: '0.8125rem',
              fontWeight: activeTab === 'property-reviews' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Property Reviews
          </button>
        </div>

        {/* ── Reports tab ──────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <>
            {/* Stats row */}
            <div className="ar-stats-row">
              {Object.entries(STATUS_LABELS).map(([key, meta]) => (
                <button
                  key={key}
                  className={`ar-stat-card ${statusFilter === key ? 'ar-stat-card--active' : ''}`}
                  onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                  style={{ '--stat-color': meta.color, '--stat-bg': meta.bg }}
                >
                  <span className="ar-stat-count">{stats[key]}</span>
                  <span className="ar-stat-label">{meta.label}</span>
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="ar-filter-bar">
              <select
                className="ar-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([k, m]) => (
                  <option key={k} value={k}>{m.label}</option>
                ))}
              </select>
              <select
                className="ar-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                <option value="property">Property reports</option>
                <option value="user">User reports</option>
              </select>
              <span className="ar-total-count">{total} report{total !== 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            {loading ? (
              <div className="ar-loading">Loading reports…</div>
            ) : reports.length === 0 ? (
              <div className="ar-empty">No reports match this filter.</div>
            ) : (
              <div className="ar-table-wrap">
                <table className="ar-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Target</th>
                      <th>Reporter</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => {
                      const sl = STATUS_LABELS[r.status];
                      return (
                        <tr key={r._id}>
                          <td className="ar-td-date">{formatDate(r.createdAt)}</td>
                          <td>
                            <span className={`ar-type-chip ar-type-chip--${r.targetType}`}>
                              {r.targetType}
                            </span>
                          </td>
                          <td className="ar-td-category">
                            {CATEGORY_LABELS[r.category] || r.category}
                          </td>
                          <td className="ar-td-target">
                            {r.targetType === 'property' ? (
                              <Link to={`/listing/${r.targetId}`} target="_blank" className="ar-link">
                                View listing ↗
                              </Link>
                            ) : (
                              <span className="ar-id">{String(r.targetId).slice(-8)}</span>
                            )}
                          </td>
                          <td className="ar-td-reporter">
                            {r.reporterId
                              ? `${r.reporterId.name}${r.reporterId.lastName ? ' ' + r.reporterId.lastName : ''}`
                              : '—'}
                          </td>
                          <td>
                            <span
                              className="ar-status-chip"
                              style={{ color: sl.color, background: sl.bg }}
                            >
                              {sl.label}
                            </span>
                          </td>
                          <td className="ar-td-actions">
                            {r.status === 'open' && (
                              <button className="ar-action-btn ar-action-btn--review" onClick={() => openResolveModal(r, 'reviewing')}>
                                Review
                              </button>
                            )}
                            {(r.status === 'open' || r.status === 'reviewing') && (
                              <>
                                <button className="ar-action-btn ar-action-btn--resolve" onClick={() => openResolveModal(r, 'resolved')}>
                                  Resolve
                                </button>
                                <button className="ar-action-btn ar-action-btn--dismiss" onClick={() => openResolveModal(r, 'dismissed')}>
                                  Dismiss
                                </button>
                              </>
                            )}
                            {(r.status === 'resolved' || r.status === 'dismissed') && (
                              <span className="ar-closed-label">Closed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="ar-pagination">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`ar-page-btn ${p === page ? 'ar-page-btn--active' : ''}`}
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Property Reviews moderation tab ─────────────────────────────────── */}
        {activeTab === 'property-reviews' && (
          <div>
            {/* Status filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['reported', 'hidden', 'active'].map(s => (
                <button
                  key={s}
                  onClick={() => setPrStatusFilter(s)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: `1.5px solid ${prStatusFilter === s ? 'var(--color-primary, #0F766E)' : 'rgba(15,23,42,0.10)'}`,
                    background: prStatusFilter === s ? '#f0fdf9' : 'none',
                    color: prStatusFilter === s ? 'var(--color-primary, #0F766E)' : 'var(--gray-500)',
                    fontSize: '0.8125rem',
                    fontWeight: prStatusFilter === s ? 600 : 400,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </button>
              ))}
              <span style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginLeft: 'auto', alignSelf: 'center' }}>
                {prTotal} total
              </span>
            </div>

            {/* Reviews list */}
            {prLoading ? (
              <div className="admin-loading">Loading…</div>
            ) : prReviews.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', padding: '24px 0', textAlign: 'center' }}>No {prStatusFilter} reviews.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {prReviews.map(rev => (
                  <div
                    key={rev._id}
                    style={{
                      background: 'var(--color-bg-surface, #fff)',
                      border: '1px solid var(--border-subtle, rgba(15,23,42,0.08))',
                      borderRadius: 10,
                      padding: '16px 18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-graphite-800)' }}>
                          {rev.reviewerId?.name} {rev.reviewerId?.lastName}
                        </span>
                        <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                          {rev.reviewerId?.email}
                        </span>
                        {'★'.repeat(Math.max(0, Math.min(5, rev.rating)))}
                        <span style={{ marginLeft: 8, fontSize: '0.6875rem', background: 'var(--gray-100)', padding: '2px 7px', borderRadius: 4, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {rev.propertyIdentityId?.fingerprint?.normalizedAddress?.slice(0, 40) || 'Unknown property'}
                        </span>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 700,
                        color: rev.status === 'active' ? '#166534' : rev.status === 'hidden' ? '#dc2626' : '#d97706',
                        background: rev.status === 'active' ? '#f0fdf4' : rev.status === 'hidden' ? '#fef2f2' : '#fffbeb',
                      }}>
                        {rev.status}
                        {rev.reportCount > 0 && ` · ${rev.reportCount} reports`}
                      </span>
                    </div>

                    {/* Expand to view full text */}
                    {prExpandedId === rev._id ? (
                      <div style={{ marginTop: 8 }}>
                        {rev.title && <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: '0 0 4px', color: 'var(--color-graphite-800)' }}>{rev.title}</p>}
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-graphite-600)', lineHeight: 1.6, margin: 0 }}>{rev.review}</p>
                        <button onClick={() => setPrExpandedId(null)} style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Show less</button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                          {(rev.review || '').slice(0, 100)}{rev.review?.length > 100 ? '…' : ''}
                        </span>
                        <button onClick={() => setPrExpandedId(rev._id)} style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View</button>
                      </div>
                    )}

                    {/* Moderator notes */}
                    <div style={{ marginTop: 10 }}>
                      <input
                        type="text"
                        placeholder="Moderator note (optional)…"
                        value={prModNotes[rev._id] || ''}
                        onChange={e => setPrModNotes(n => ({ ...n, [rev._id]: e.target.value }))}
                        style={{
                          width: '100%', border: '1.5px solid rgba(15,23,42,0.10)', borderRadius: 6,
                          padding: '6px 10px', fontSize: '0.8125rem', fontFamily: 'inherit',
                          color: 'var(--color-graphite-700)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {rev.status !== 'active' && (
                        <button
                          onClick={() => handleRestoreReview(rev._id)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          Restore
                        </button>
                      )}
                      {rev.status !== 'hidden' && (
                        <button
                          onClick={() => handleHideReview(rev._id)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReview(rev._id)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resolve/Dismiss modal */}
      {resolveModal && (
        <div className="ar-modal-overlay" onClick={() => setResolveModal(null)}>
          <div className="ar-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ar-modal-close" onClick={() => setResolveModal(null)}>&#10005;</button>
            <h3 className="ar-modal-title">
              {resolveModal.action === 'reviewing' && 'Mark as Reviewing'}
              {resolveModal.action === 'resolved' && 'Resolve Report'}
              {resolveModal.action === 'dismissed' && 'Dismiss Report'}
            </h3>
            <p className="ar-modal-sub">
              Category: <strong>{CATEGORY_LABELS[resolveModal.report.category]}</strong>
              {resolveModal.report.description && (
                <>
                  <br />
                  Reporter note: <em>"{resolveModal.report.description}"</em>
                </>
              )}
            </p>
            <label className="ar-modal-label">
              Resolution note <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              className="ar-modal-textarea"
              rows={3}
              maxLength={1000}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Explain the action taken…"
              disabled={updating}
            />
            <div className="ar-modal-actions">
              <button className="ar-modal-btn-cancel" onClick={() => setResolveModal(null)} disabled={updating}>
                Cancel
              </button>
              <button
                className={`ar-modal-btn-confirm ar-modal-btn-confirm--${resolveModal.action}`}
                onClick={handleUpdateReport}
                disabled={updating}
              >
                {updating ? 'Saving…' : `Confirm ${resolveModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
