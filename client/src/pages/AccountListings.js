import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getMyListings, deleteProperty, getMyListingsHealth, confirmListingAvailability, markPropertyStatus } from '../services/api';
import OwnershipVerificationModal from '../components/OwnershipVerificationModal';
import PromoteListingModal from '../components/PromoteListingModal';
import SellerDashboard from '../components/SellerDashboard';
import './Account.css';
import './AccountListings.css';

const STATUS_META = {
  active:  { label: 'Active',   color: '#16a34a', bg: '#f0fdf4' },
  pending: { label: 'Pending',  color: '#d97706', bg: '#fffbeb' },
  paused:  { label: 'Paused',   color: '#6b7280', bg: '#f9fafb' },
  sold:    { label: 'Sold',     color: '#1d4ed8', bg: '#eff6ff' },
  rented:  { label: 'Rented',   color: '#7c3aed', bg: '#f5f3ff' },
  draft:   { label: 'Draft',    color: '#6b7280', bg: '#f9fafb' },
};

const OV_META = {
  none:     { label: 'Not submitted',    color: '#6b7280', bg: '#f9fafb' },
  pending:  { label: 'Under review',     color: '#d97706', bg: '#fffbeb' },
  approved: { label: 'Docs reviewed',    color: '#166534', bg: '#f0fdf4' },
  rejected: { label: 'Rejected',         color: '#dc2626', bg: '#fef2f2' },
};

const getImageUrl = (images) => {
  if (!images || images.length === 0) return null;
  const img = images[0];
  if (typeof img === 'string') return img;
  return img.thumbnail || img.medium || img.large || null;
};

const getLocation = (p) => {
  if (typeof p.location === 'string') return p.location;
  if (p.city) return p.city;
  return 'N/A';
};

const AccountListings = () => {
  useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null); // { property, status }
  const [markingStatus, setMarkingStatus] = useState(false);
  const [ovModal, setOvModal] = useState(null);
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [healthMap, setHealthMap] = useState({});
  const [confirming, setConfirming] = useState(null);
  const [mainTab, setMainTab] = useState('manage'); // 'manage' | 'performance'

  const fetchProperties = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const [listingsRes, healthRes] = await Promise.allSettled([
        getMyListings(token),
        getMyListingsHealth(token),
      ]);

      if (listingsRes.status === 'fulfilled') {
        setProperties(listingsRes.value.data || []);
      }

      if (healthRes.status === 'fulfilled') {
        const map = {};
        (healthRes.value.data.health || []).forEach((h) => { map[h._id] = h; });
        setHealthMap(map);
      }
    } catch (err) {
      console.error('fetchProperties error:', err);
      showError('Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const handleConfirmAvailability = async (propertyId) => {
    setConfirming(propertyId);
    try {
      const token = localStorage.getItem('token');
      await confirmListingAvailability(propertyId, token);
      success('Availability confirmed — listing is marked fresh.');
      // Refresh health data
      const healthRes = await getMyListingsHealth(token);
      const map = {};
      (healthRes.data.health || []).forEach((h) => { map[h._id] = h; });
      setHealthMap(map);
    } catch (err) {
      showError('Failed to confirm availability.');
    } finally {
      setConfirming(null);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const filtered = statusFilter === 'all'
    ? properties
    : properties.filter(p => (p.status || 'active') === statusFilter);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await deleteProperty(deleteTarget._id, token);
      success('Listing deleted.');
      setDeleteTarget(null);
      fetchProperties();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete listing.');
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkStatus = async () => {
    if (!statusTarget) return;
    setMarkingStatus(true);
    try {
      const token = localStorage.getItem('token');
      await markPropertyStatus(statusTarget.property._id, statusTarget.status, token);
      success(`Listing marked as ${statusTarget.status}.`);
      setStatusTarget(null);
      fetchProperties();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update listing status.');
    } finally {
      setMarkingStatus(false);
    }
  };

  const canRequestVerification = (p) => {
    const s = p.ownershipVerificationStatus || 'none';
    return s === 'none' || s === 'rejected';
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-container">
          <div className="account-header">
            <h1>My Listings</h1>
            <p>Manage your property listings and request ownership verification</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--gray-200)',
                padding: 'var(--space-4)',
                display: 'flex',
                gap: 'var(--space-4)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: 120, height: 90, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(90deg, #f0f0ef 25%, #e8e8e6 50%, #f0f0ef 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.4s infinite linear',
                }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[60, 40, 80].map((w, j) => (
                    <div key={j} style={{
                      height: j === 0 ? 18 : 13,
                      width: `${w}%`,
                      borderRadius: 4,
                      background: 'linear-gradient(90deg, #f0f0ef 25%, #e8e8e6 50%, #f0f0ef 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.4s infinite linear',
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-container">
        {/* Primary tab: Manage / Performance */}
        <div className="al-main-tabs">
          <button
            className={`al-main-tab${mainTab === 'manage' ? ' al-main-tab--active' : ''}`}
            onClick={() => setMainTab('manage')}
          >
            Manage
          </button>
          <button
            className={`al-main-tab${mainTab === 'performance' ? ' al-main-tab--active' : ''}`}
            onClick={() => setMainTab('performance')}
          >
            Performance
          </button>
        </div>

        {/* Header */}
        <div className="account-header">
          <h1>My Listings</h1>
          <p>Manage your property listings and request ownership verification</p>
        </div>

        {mainTab === 'manage' && (
          <>
            {/* Toolbar */}
            <div className="al-toolbar">
              <div className="al-filter-tabs">
                {['all', 'active', 'pending', 'paused', 'sold', 'rented'].map((s) => (
                  <button
                    key={s}
                    className={`al-tab ${statusFilter === s ? 'al-tab--active' : ''}`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === 'all' ? 'All' : STATUS_META[s]?.label || s}
                    <span className="al-tab-count">
                      {s === 'all' ? properties.length : properties.filter(p => (p.status || 'active') === s).length}
                    </span>
                  </button>
                ))}
              </div>
              <button className="al-create-btn" onClick={() => navigate('/properties/create')}>
                + New Listing
              </button>
            </div>

            {/* Seller visibility tip */}
            {properties.length > 0 && (
              <div className="al-seller-tip">
                <strong>Visibility tip:</strong> Listings with photos, confirmed availability, and ownership verification appear higher in search results.{' '}
                <Link to="/trust" className="al-seller-tip-link">Learn how rankings work</Link>
              </div>
            )}

            {/* Listings */}
            {filtered.length === 0 ? (
              <div className="al-empty">
                <p>{statusFilter === 'all' ? "You haven't created any listings yet." : `No ${statusFilter} listings.`}</p>
                <button className="al-create-btn" onClick={() => navigate('/properties/create')}>
                  Create Your First Listing
                </button>
              </div>
            ) : (
              <div className="al-list">
                {filtered.map((property) => {
                  const sm = STATUS_META[property.status] || STATUS_META.pending;
                  const ovm = OV_META[property.ownershipVerificationStatus || 'none'];
                  const imgUrl = getImageUrl(property.images);
                  const ovStatus = property.ownershipVerificationStatus || 'none';
                  const health = healthMap[property._id];
                  const stalenessLevel = health?.staleness?.level || 'fresh';
                  const needsReconfirm = health?.staleness?.needsReconfirm || false;

                  return (
                    <div key={property._id} className={`al-card${stalenessLevel !== 'fresh' ? ` al-card--${stalenessLevel}` : ''}`}>
                      {/* Thumbnail */}
                      <div className="al-card-thumb">
                        {imgUrl ? (
                          <img src={imgUrl} alt={property.title} loading="lazy" />
                        ) : (
                          <div className="al-card-thumb-placeholder">No photo</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="al-card-info">
                        <div className="al-card-top">
                          <div>
                            <h3 className="al-card-title">{property.title}</h3>
                            <p className="al-card-location">{getLocation(property)}</p>
                          </div>
                          <div className="al-card-price">
                            {property.currency || 'AZN'} {property.price?.toLocaleString() || '—'}
                          </div>
                        </div>

                        {/* Status chips */}
                        <div className="al-card-chips">
                          <span className="al-chip" style={{ color: sm.color, background: sm.bg }}>
                            {sm.label}
                          </span>
                          {!property.isApproved && property.status !== 'sold' && (
                            <span className="al-chip" style={{ color: '#d97706', background: '#fffbeb' }}>
                              Awaiting approval
                            </span>
                          )}
                          {ovStatus !== 'none' && (
                            <span
                              className="al-chip al-chip--ov"
                              style={{ color: ovm.color, background: ovm.bg }}
                              title={ovStatus === 'rejected' && property.ownershipReviewNote
                                ? `Reason: ${property.ownershipReviewNote}`
                                : undefined}
                            >
                              {ovStatus === 'approved' && '✓ '}
                              {ovm.label}
                            </span>
                          )}
                          {(ovStatus === 'none' || ovStatus === 'rejected') && (
                            <Link to="/verification-application" style={{ fontSize: '0.75rem', color: '#0F766E', textDecoration: 'none' }}>
                              Verify ownership →
                            </Link>
                          )}
                          {/* Health badge */}
                          {health && stalenessLevel !== 'fresh' && (
                            <span className={`al-chip al-health-badge al-health-badge--${stalenessLevel}`}>
                              {stalenessLevel === 'aging'    && `Aging · ${health.staleness.days}d`}
                              {stalenessLevel === 'stale'    && `Stale · ${health.staleness.days}d`}
                              {stalenessLevel === 'critical' && `Critical · ${health.staleness.days}d`}
                            </span>
                          )}
                          {/* Photo count warning */}
                          {health && health.photo.count === 0 && (
                            <span className="al-chip al-photo-warn">No photos</span>
                          )}
                          {/* Active promotion status */}
                          {property.promotionTier && property.promotionTier !== 'FREE' && property.isPromoted && (
                            <div className="al-promo-status">
                              <span
                                className="al-chip al-chip--promo"
                                style={{
                                  color: property.promotionTier === 'SPOTLIGHT' ? '#0F766E' : property.promotionTier === 'PREMIUM' ? '#7c3aed' : '#d97706',
                                  background: property.promotionTier === 'SPOTLIGHT' ? '#f0fdf4' : property.promotionTier === 'PREMIUM' ? '#f5f3ff' : '#fffbeb',
                                  fontWeight: 600,
                                }}
                              >
                                {property.promotionTier === 'SPOTLIGHT' ? 'Spotlight' : property.promotionTier === 'PREMIUM' ? 'Premium' : 'Featured'} active
                              </span>
                              {property.promotionEndDate && (() => {
                                const end = new Date(property.promotionEndDate);
                                const now = new Date();
                                const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
                                return (
                                  <span className="al-promo-meta">
                                    {property.promotionStartDate && (
                                      <span>Started {new Date(property.promotionStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    )}
                                    <span>Expires {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    <span className={daysLeft <= 3 ? 'al-promo-expiring' : ''}>{daysLeft}d remaining</span>
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Rejection note */}
                        {ovStatus === 'rejected' && property.ownershipReviewNote && (
                          <p className="al-rejection-note">
                            Review note: "{property.ownershipReviewNote}"
                          </p>
                        )}

                        {/* Reconfirmation prompt */}
                        {needsReconfirm && (
                          <div className="al-reconfirm-prompt">
                            <span className="al-reconfirm-text">Is this listing still available?</span>
                            <button
                              className="al-reconfirm-btn"
                              onClick={() => handleConfirmAvailability(property._id)}
                              disabled={confirming === property._id}
                            >
                              {confirming === property._id ? 'Confirming…' : 'Yes, still available'}
                            </button>
                          </div>
                        )}

                        {/* Visibility score bar */}
                        {health && (
                          <div className="al-visibility-bar" title={`Visibility score: ${health.visibility}/100`}>
                            <div className="al-visibility-track">
                              <div
                                className="al-visibility-fill"
                                style={{ width: `${health.visibility}%` }}
                              />
                            </div>
                            <span className="al-visibility-label">{health.visibility}% visibility</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="al-card-actions">
                        <Link to={`/listing/${property._id}`} className="al-action-link">
                          View
                        </Link>
                        <Link to={`/properties/update/${property._id}`} className="al-action-link">
                          Edit
                        </Link>
                        {(!property.promotionTier || property.promotionTier === 'FREE' || !property.isPromoted) && (
                          <button
                            className="al-action-btn al-action-btn--promote"
                            onClick={() => setPromoteTarget(property)}
                          >
                            Promote
                          </button>
                        )}
                        {canRequestVerification(property) && (
                          <button
                            className="al-action-btn al-action-btn--verify"
                            onClick={() => setOvModal(property)}
                          >
                            {ovStatus === 'rejected' ? 'Resubmit Docs' : 'Verify Ownership'}
                          </button>
                        )}
                        {ovStatus === 'pending' && (
                          <button
                            className="al-action-btn al-action-btn--verify"
                            onClick={() => setOvModal(property)}
                            title="Add more documents to your pending request"
                          >
                            Add Documents
                          </button>
                        )}
                        {['active', 'pending', 'paused'].includes(property.status || 'active') && (
                          <>
                            <button
                              className="al-action-btn al-action-btn--sold"
                              onClick={() => setStatusTarget({ property, status: 'sold' })}
                            >
                              Mark sold
                            </button>
                            <button
                              className="al-action-btn al-action-btn--sold"
                              onClick={() => setStatusTarget({ property, status: 'rented' })}
                            >
                              Mark rented
                            </button>
                          </>
                        )}
                        <button
                          className="al-action-btn al-action-btn--delete"
                          onClick={() => setDeleteTarget(property)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {mainTab === 'performance' && <SellerDashboard />}
      </div>

      {/* Ownership verification modal */}
      {ovModal && (
        <OwnershipVerificationModal
          property={ovModal}
          onClose={() => setOvModal(null)}
          onSubmitted={() => {
            success('Verification request submitted. We will review it shortly.');
            fetchProperties();
          }}
        />
      )}

      {promoteTarget && (
        <PromoteListingModal
          property={promoteTarget}
          onClose={() => setPromoteTarget(null)}
          onSubmitted={() => {
            success('Promotion request submitted. Admin will review shortly.');
            setPromoteTarget(null);
          }}
        />
      )}

      {/* Mark sold / rented confirmation */}
      {statusTarget && (
        <div className="al-confirm-overlay" onClick={() => !markingStatus && setStatusTarget(null)}>
          <div className="al-confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Mark as {statusTarget.status === 'sold' ? 'Sold' : 'Rented'}</h3>
            <p>
              Mark <strong>"{statusTarget.property.title}"</strong> as {statusTarget.status}?
              It will be removed from search results immediately.
            </p>
            <div className="al-confirm-actions">
              <button className="al-confirm-cancel" onClick={() => setStatusTarget(null)} disabled={markingStatus}>
                Cancel
              </button>
              <button className="al-confirm-delete" onClick={handleMarkStatus} disabled={markingStatus}>
                {markingStatus ? 'Saving…' : `Yes, mark as ${statusTarget.status}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="al-confirm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="al-confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Delete Listing</h3>
            <p>
              Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
              This cannot be undone.
            </p>
            <div className="al-confirm-actions">
              <button className="al-confirm-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="al-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountListings;
