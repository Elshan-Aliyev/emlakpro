import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { getOwnershipRequests, approveOwnership, rejectOwnership } from '../services/api';
import './Admin.css';
import './AdminOwnership.css';

const DOC_LABELS = {
  'property-extract':      'Property Extract',
  'utility-bill':          'Utility Bill',
  'ownership-certificate': 'Ownership Certificate',
};

const STATUS_META = {
  pending:  { label: 'Pending Review', color: '#d97706', bg: '#fffbeb' },
  approved: { label: 'Approved',       color: '#16a34a', bg: '#f0fdf4' },
  rejected: { label: 'Rejected',       color: '#dc2626', bg: '#fef2f2' },
};

const AdminOwnership = () => {
  const { success, error: showError } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewModal, setReviewModal] = useState(null); // { property, action }
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await getOwnershipRequests(statusFilter, token);
      setRequests(res.data || []);
    } catch (err) {
      console.error('fetchRequests error:', err);
      showError('Failed to load ownership requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showError]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openReview = (property, action) => {
    setReviewModal({ property, action });
    setReviewNote('');
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const { property, action } = reviewModal;
      if (action === 'approve') {
        await approveOwnership(property._id, { reviewNote }, token);
        success('Ownership documents approved.');
      } else {
        await rejectOwnership(property._id, { reviewNote }, token);
        success('Ownership request rejected.');
      }
      setReviewModal(null);
      fetchRequests();
    } catch (err) {
      showError(err.response?.data?.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getImageUrl = (images) => {
    if (!images?.length) return null;
    const img = images[0];
    return typeof img === 'string' ? img : img.thumbnail || img.medium || null;
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="admin-page">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-top">
            <h1>Ownership Verification <span className="admin-badge">Manual Review</span></h1>
          </div>
          <p>Review ownership documents submitted by property owners. All decisions are manual.</p>
        </div>

        {/* Nav */}
        <nav className="admin-nav">
          <Link to="/admin" className="admin-nav-item">Dashboard</Link>
          <Link to="/admin/listings" className="admin-nav-item">Listings</Link>
          <Link to="/admin/users" className="admin-nav-item">Users</Link>
          <Link to="/admin/reports" className="admin-nav-item">Reports</Link>
          <Link to="/admin/ownership"  className="admin-nav-item active">Ownership</Link>
          <Link to="/admin/operations" className="admin-nav-item">Operations</Link>
          <Link to="/admin/abuse"      className="admin-nav-item">Abuse Center</Link>
          <Link to="/admin/settings"   className="admin-nav-item">Settings</Link>
        </nav>

        {/* Status filter */}
        <div className="ao-filter-bar">
          {['pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              className={`ao-filter-btn ${statusFilter === s ? 'ao-filter-btn--active' : ''}`}
              style={statusFilter === s ? { color: STATUS_META[s].color, borderColor: STATUS_META[s].color, background: STATUS_META[s].bg } : {}}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_META[s].label}
            </button>
          ))}
          <span className="ao-count">{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="ao-loading">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="ao-empty">No {statusFilter} ownership requests.</div>
        ) : (
          <div className="ao-cards">
            {requests.map((property) => {
              const owner = property.ownerId;
              const imgUrl = getImageUrl(property.images);
              const sm = STATUS_META[property.ownershipVerificationStatus];

              return (
                <div key={property._id} className="ao-card">
                  {/* Property info */}
                  <div className="ao-card-header">
                    {imgUrl && (
                      <img src={imgUrl} alt="" className="ao-card-thumb" />
                    )}
                    <div className="ao-card-meta">
                      <div className="ao-card-title">{property.title}</div>
                      <div className="ao-card-sub">
                        {property.city || 'Location N/A'} · {property.currency || 'AZN'} {property.price?.toLocaleString()}
                      </div>
                      <div className="ao-card-sub">
                        Submitted: {formatDate(property.createdAt)}
                      </div>
                      {property.ownershipReviewedAt && (
                        <div className="ao-card-sub">
                          Reviewed: {formatDate(property.ownershipReviewedAt)}
                          {property.ownershipReviewedBy && ` by ${property.ownershipReviewedBy.name}`}
                        </div>
                      )}
                    </div>
                    <div className="ao-card-status-wrap">
                      <span className="ao-status-chip" style={{ color: sm.color, background: sm.bg }}>
                        {sm.label}
                      </span>
                      <Link to={`/listing/${property._id}`} target="_blank" className="ao-view-link">
                        View listing ↗
                      </Link>
                    </div>
                  </div>

                  {/* Owner info */}
                  {owner && (
                    <div className="ao-owner-row">
                      <span className="ao-owner-label">Owner:</span>
                      <span>{owner.name}{owner.lastName ? ' ' + owner.lastName : ''}</span>
                      <span className="ao-owner-sep">·</span>
                      <span>{owner.email}</span>
                      {owner.phone && (
                        <>
                          <span className="ao-owner-sep">·</span>
                          <span>{owner.phone}</span>
                        </>
                      )}
                      {owner.accountType && (
                        <>
                          <span className="ao-owner-sep">·</span>
                          <span className="ao-account-type">{owner.accountType}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Documents */}
                  <div className="ao-docs">
                    <div className="ao-docs-label">Submitted documents</div>
                    {property.ownershipDocuments?.length > 0 ? (
                      <div className="ao-doc-list">
                        {property.ownershipDocuments.map((doc, i) => (
                          <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="ao-doc-link"
                          >
                            <span className="ao-doc-icon">&#128196;</span>
                            {DOC_LABELS[doc.type] || doc.type}
                            <span className="ao-doc-date">{formatDate(doc.uploadedAt)}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="ao-no-docs">No documents uploaded.</p>
                    )}
                  </div>

                  {/* Review note */}
                  {property.ownershipReviewNote && (
                    <div className="ao-review-note">
                      <strong>Review note:</strong> {property.ownershipReviewNote}
                    </div>
                  )}

                  {/* Actions */}
                  {property.ownershipVerificationStatus === 'pending' && (
                    <div className="ao-card-actions">
                      <button
                        className="ao-btn ao-btn--approve"
                        onClick={() => openReview(property, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        className="ao-btn ao-btn--reject"
                        onClick={() => openReview(property, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewModal && (
        <div className="ao-modal-overlay" onClick={() => !submitting && setReviewModal(null)}>
          <div className="ao-modal" onClick={e => e.stopPropagation()}>
            <button className="ao-modal-close" onClick={() => setReviewModal(null)} disabled={submitting}>
              &#10005;
            </button>
            <h3 className="ao-modal-title">
              {reviewModal.action === 'approve' ? 'Approve Ownership Verification' : 'Reject Ownership Verification'}
            </h3>
            <p className="ao-modal-property">
              {reviewModal.property.title}
            </p>

            {reviewModal.action === 'approve' && (
              <div className="ao-modal-warning">
                Approval means you have reviewed the submitted documents and confirm they
                are consistent with ownership of this property.
                This will display <em>"Ownership documents reviewed"</em> on the listing.
              </div>
            )}

            <label className="ao-modal-label">
              Review note
              <span className="ao-modal-optional">
                {reviewModal.action === 'reject' ? ' (required)' : ' (optional)'}
              </span>
            </label>
            <textarea
              className="ao-modal-textarea"
              rows={3}
              maxLength={500}
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              placeholder={
                reviewModal.action === 'approve'
                  ? 'Documents verified…'
                  : 'Explain why the documents were rejected…'
              }
              disabled={submitting}
            />

            <div className="ao-modal-actions">
              <button className="ao-modal-cancel" onClick={() => setReviewModal(null)} disabled={submitting}>
                Cancel
              </button>
              <button
                className={`ao-modal-confirm ${reviewModal.action === 'approve' ? 'ao-modal-confirm--approve' : 'ao-modal-confirm--reject'}`}
                onClick={handleReview}
                disabled={submitting || (reviewModal.action === 'reject' && !reviewNote.trim())}
              >
                {submitting ? 'Saving…' : reviewModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOwnership;
