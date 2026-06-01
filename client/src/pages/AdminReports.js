import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getReports, getReportStats, updateReport } from '../services/api';
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
  const { user } = useAuth();
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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
    fetchReports(1);
  }, [statusFilter, typeFilter, fetchReports]);

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

        {/* Description column (expanded rows would be ideal; use title attr for now) */}

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
