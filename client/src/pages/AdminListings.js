import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getAllListingsAdmin, updateProperty, deleteProperty, bulkApproveProperties, bulkDeleteProperties, updatePropertyPromotion } from '../services/api';
import { track } from '../services/analytics';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ModerationChecklistModal from '../components/ModerationChecklistModal';
import './Admin.css';
import './AdminListings.css';

// Internal moderation badge — score thresholds: 0-1 Low, 2-4 Medium, 5+ High
const PRIORITY_LEVELS = [
  { min: 5, label: 'High',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { min: 2, label: 'Medium', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { min: 0, label: 'Low',    color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
];

const ModerationBadge = ({ score, reasons }) => {
  const level = PRIORITY_LEVELS.find(l => score >= l.min);
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        className="mp-badge"
        style={{ color: level.color, background: level.bg, borderColor: level.border }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {score > 0 ? `⚑ ` : ''}{level.label} {score > 0 ? `(${score})` : ''}
      </span>
      {hover && reasons.length > 0 && (
        <div className="mp-tooltip">
          {reasons.map((r, i) => <div key={i} className="mp-tooltip-item">• {r}</div>)}
        </div>
      )}
    </div>
  );
};

const QUALITY_LEVELS = [
  { min: 7, label: 'High',   color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  { min: 3, label: 'Medium', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { min: 0, label: 'Low',    color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

// Promotion duration presets — mirrors server/lib/promotion/constants.js
const PROMO_DURATION_PRESETS = [
  { label: '7 days',   days: 7  },
  { label: '14 days',  days: 14 },
  { label: '30 days',  days: 30 },
  { label: '90 days',  days: 90 },
];

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const QualityBadge = ({ score, reasons }) => {
  const level = QUALITY_LEVELS.find(l => score >= l.min);
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        className="ql-badge"
        style={{ color: level.color, background: level.bg, borderColor: level.border }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {level.label} ({score})
      </span>
      {hover && reasons.length > 0 && (
        <div className="ql-tooltip">
          {reasons.map((r, i) => <div key={i} className="ql-tooltip-item">• {r}</div>)}
        </div>
      )}
    </div>
  );
};

const DuplicateBadge = ({ reasons }) => {
  const [hover, setHover] = React.useState(false);
  if (!reasons || reasons.length === 0) return null;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        className="dup-badge"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        ⚠ Duplicate
      </span>
      {hover && (
        <div className="dup-tooltip">
          {reasons.map((r, i) => <div key={i} className="dup-tooltip-item">• {r}</div>)}
        </div>
      )}
    </div>
  );
};

const AdminListings = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperties, setSelectedProperties] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByPriority, setSortByPriority] = useState(false);
  const [sortByQuality, setSortByQuality] = useState(false);
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  
  // Helper function to safely get location string
  const getLocation = (property) => {
    if (typeof property.location === 'string') return property.location;
    if (typeof property.city === 'string') return property.city;
    if (typeof property.address === 'string') return property.address;
    if (property.location?.city && typeof property.location.city === 'string') return property.location.city;
    if (property.address?.city && typeof property.address.city === 'string') return property.address.city;
    return 'N/A';
  };
  
  // Modals
  const [approveModal, setApproveModal] = useState({ isOpen: false, property: null });
  const [sponsorModal, setSponsorModal] = useState({ isOpen: false, property: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, property: null });
  const [promotionModal, setPromotionModal] = useState({ isOpen: false, listing: null });
  const [promotionForm,  setPromotionForm]  = useState({
    promotionTier:      'FREE',
    promotionStartDate: '',
    promotionEndDate:   '',
  });

  useEffect(() => {
    fetchProperties();
  }, [sortByPriority]);

  useEffect(() => {
    filterProperties();
  }, [properties, statusFilter, approvalFilter, searchTerm, sortByPriority, sortByQuality, duplicatesOnly]);

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = sortByPriority ? { sortBy: 'moderationPriority', order: 'desc' } : {};
      const res = await getAllListingsAdmin(token, params);
      setProperties(res.data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
      showError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const filterProperties = () => {
    let filtered = [...properties];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => (p.status || 'active') === statusFilter);
    }

    // Approval filter
    if (approvalFilter === 'approved') {
      filtered = filtered.filter(p => p.isApproved === true);
    } else if (approvalFilter === 'pending') {
      filtered = filtered.filter(p => !p.isApproved || p.isApproved === false);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(term) ||
        p.location?.toLowerCase().includes(term) ||
        p.ownerId?.name?.toLowerCase().includes(term)
      );
    }

    if (duplicatesOnly) {
      filtered = filtered.filter(p => p.suspectedDuplicate === true);
    }

    if (sortByPriority) {
      filtered.sort((a, b) => (b.moderationPriority || 0) - (a.moderationPriority || 0));
    } else if (sortByQuality) {
      filtered.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    }

    setFilteredProperties(filtered);
  };

  const handleSponsor = async (days) => {
    if (!sponsorModal.property) return;

    try {
      const token = localStorage.getItem('token');
      const sponsoredUntil = new Date();
      sponsoredUntil.setDate(sponsoredUntil.getDate() + days);

      await updateProperty(
        sponsorModal.property._id,
        { isSponsored: true, sponsoredUntil },
        token
      );
      success(`Property sponsored for ${days} days`);
      setSponsorModal({ isOpen: false, property: null });
      fetchProperties();
    } catch (err) {
      console.error('Error sponsoring property:', err);
      showError(err.response?.data?.message || 'Failed to sponsor property');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.property) return;

    try {
      const token = localStorage.getItem('token');
      await deleteProperty(deleteModal.property._id, token);
      success('Property deleted successfully');
      setDeleteModal({ isOpen: false, property: null });
      fetchProperties();
    } catch (err) {
      console.error('Error deleting property:', err);
      showError(err.response?.data?.message || 'Failed to delete property');
    }
  };

  const openPromotionModal = (listing) => {
    setPromotionForm({
      promotionTier:      listing.promotionTier      || 'FREE',
      promotionStartDate: listing.promotionStartDate
        ? new Date(listing.promotionStartDate).toISOString().split('T')[0]
        : '',
      promotionEndDate: listing.promotionEndDate
        ? new Date(listing.promotionEndDate).toISOString().split('T')[0]
        : '',
    });
    setPromotionModal({ isOpen: true, listing });
    track('promotion_viewed', { listing_id: listing._id, current_tier: listing.promotionTier || 'FREE' });
  };

  const handlePromotionSave = async () => {
    if (!promotionModal.listing) return;
    try {
      const token = localStorage.getItem('token');
      const wasPromoted = promotionModal.listing.promotionTier !== 'FREE' &&
                          !!promotionModal.listing.promotionTier;
      const willPromote  = promotionForm.promotionTier !== 'FREE';

      await updatePropertyPromotion(
        promotionModal.listing._id,
        {
          promotionTier:      promotionForm.promotionTier,
          promotionStartDate: promotionForm.promotionStartDate || null,
          promotionEndDate:   promotionForm.promotionEndDate   || null,
        },
        token,
      );

      if (willPromote) {
        track('promotion_applied', {
          listing_id:     promotionModal.listing._id,
          promotion_tier: promotionForm.promotionTier,
        });
      } else if (wasPromoted) {
        track('promotion_removed', {
          listing_id:    promotionModal.listing._id,
          previous_tier: promotionModal.listing.promotionTier,
        });
      }

      success('Promotion updated');
      setPromotionModal({ isOpen: false, listing: null });
      fetchProperties();
    } catch (err) {
      console.error('[admin] promotion save error:', err);
      showError(err.response?.data?.message || 'Failed to update promotion');
    }
  };

  const toggleSelectProperty = (propertyId) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProperties.length === filteredProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(filteredProperties.map(p => p._id));
    }
  };

  const handleBulkApprove = async () => {
    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        selectedProperties.map(id =>
          updateProperty(id, { isApproved: true, approvedBy: user._id, approvedAt: new Date() }, token)
        )
      );
      success(`${selectedProperties.length} properties approved`);
      setSelectedProperties([]);
      fetchProperties();
    } catch (err) {
      showError('Failed to approve some properties');
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-header">
            <h1>Manage Listings <span className="admin-badge">Admin</span></h1>
            <p>Review, approve, and manage all property listings</p>
          </div>
          <div className="admin-section">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-100)',
              }}>
                <div style={{
                  width: 56, height: 42, borderRadius: 6, flexShrink: 0,
                  background: 'linear-gradient(90deg, #f0f0ef 25%, #e8e8e6 50%, #f0f0ef 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.4s infinite linear',
                }} />
                {[28, 16, 12, 10, 8].map((w, j) => (
                  <div key={j} style={{
                    height: 14, width: `${w}%`, borderRadius: 4, flexShrink: 0,
                    background: 'linear-gradient(90deg, #f0f0ef 25%, #e8e8e6 50%, #f0f0ef 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s infinite linear',
                  }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-top">
            <h1>
              Manage Listings
              <span className="admin-badge">Admin</span>
            </h1>
            <Link to="/properties/create">
              <Button>+ Create Listing</Button>
            </Link>
          </div>
          <p>Review, approve, and manage all property listings</p>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="admin-filter-group">
            <label className="admin-filter-label">Status:</label>
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="sold">Sold</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="admin-filter-group">
            <label className="admin-filter-label">Approval:</label>
            <select
              className="admin-filter-select"
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="admin-filter-group" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search by title, location, or owner..."
              className="admin-filter-select"
              style={{ width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            className={`mp-sort-btn ${sortByPriority ? 'mp-sort-btn--active' : ''}`}
            onClick={() => { setSortByPriority(v => !v); if (!sortByPriority) setSortByQuality(false); }}
            title="Sort by moderation risk (highest first)"
          >
            ⚑ {sortByPriority ? 'Risk: High → Low' : 'Sort by Risk'}
          </button>

          <button
            className={`ql-sort-btn ${sortByQuality ? 'ql-sort-btn--active' : ''}`}
            onClick={() => { setSortByQuality(v => !v); if (!sortByQuality) setSortByPriority(false); }}
            title="Sort by listing quality score (highest first)"
          >
            ★ {sortByQuality ? 'Quality: High → Low' : 'Sort by Quality'}
          </button>

          <button
            className={`dup-filter-btn ${duplicatesOnly ? 'dup-filter-btn--active' : ''}`}
            onClick={() => setDuplicatesOnly(v => !v)}
            title="Show suspected duplicate listings only"
          >
            ⚠ {duplicatesOnly ? 'Duplicates Only' : 'All Listings'}
          </button>

          {selectedProperties.length > 0 && (
            <Button onClick={handleBulkApprove} size="sm">
              Approve Selected ({selectedProperties.length})
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>
              {filteredProperties.length} {filteredProperties.length === 1 ? 'Listing' : 'Listings'}
            </h2>
          </div>

          {filteredProperties.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
              No listings found matching your filters
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={selectedProperties.length === filteredProperties.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Property</th>
                    <th>Owner</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Quality</th>
                    <th>Risk</th>
                    <th>Duplicate</th>
                    <th>Views</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((property) => (
                    <tr key={property._id}>
                      <td>
                        <input
                          type="checkbox"
                          className="admin-checkbox"
                          checked={selectedProperties.includes(property._id)}
                          onChange={() => toggleSelectProperty(property._id)}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          {property.images?.[0] && (
                            <img
                              src={property.images[0].url}
                              alt=""
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                            />
                          )}
                          <div>
                            <strong>{property.title}</strong>
                            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                              {getLocation(property)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{property.ownerId?.name || 'Unknown'}</td>
                      <td>${property.price?.toLocaleString() || 0}</td>
                      <td>
                        <Badge variant={property.status === 'active' ? 'success' : 'secondary'}>
                          {property.status || 'active'}
                        </Badge>
                      </td>
                      <td>
                        {property.isApproved ? (
                          <span className="approved-badge">✓ Approved</span>
                        ) : (
                          <span className="pending-badge">⏳ Pending</span>
                        )}
                        {property.isSponsored && (
                          <Badge variant="info" style={{ marginLeft: 'var(--space-2)' }}>★ Sponsored</Badge>
                        )}
                      </td>
                      <td>
                        <QualityBadge
                          score={property.qualityScore || 0}
                          reasons={property.qualityReasons || []}
                        />
                      </td>
                      <td>
                        <ModerationBadge
                          score={property.moderationPriority || 0}
                          reasons={property.moderationReasons || []}
                        />
                      </td>
                      <td>
                        <DuplicateBadge reasons={property.duplicateReasons || []} />
                      </td>
                      <td>{property.views || 0}</td>
                      <td>{new Date(property.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="admin-table-actions">
                          <Link to={`/listing/${property._id}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                          <Link to={`/properties/update/${property._id}`}>
                            <Button variant="outline" size="sm">Edit</Button>
                          </Link>
                          {!property.isApproved && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setApproveModal({ isOpen: true, property })}
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSponsorModal({ isOpen: true, property })}
                          >
                            Sponsor
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPromotionModal(property)}
                          >
                            Promote
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteModal({ isOpen: true, property })}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal — Moderation Checklist */}
      {approveModal.isOpen && approveModal.property && (
        <ModerationChecklistModal
          property={approveModal.property}
          onClose={() => setApproveModal({ isOpen: false, property: null })}
          onApproved={() => {
            setApproveModal({ isOpen: false, property: null });
            success('Listing approved.');
            fetchProperties();
          }}
          onRejected={() => {
            setApproveModal({ isOpen: false, property: null });
            success('Listing rejected.');
            fetchProperties();
          }}
        />
      )}

      {/* Sponsor Modal */}
      <Modal
        isOpen={sponsorModal.isOpen}
        onClose={() => setSponsorModal({ isOpen: false, property: null })}
        title="Sponsor Property"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <p style={{ marginBottom: 'var(--space-4)', color: 'var(--gray-700)' }}>
            Make "{sponsorModal.property?.title}" a sponsored listing:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Button onClick={() => handleSponsor(7)}>Sponsor for 7 Days</Button>
            <Button onClick={() => handleSponsor(14)}>Sponsor for 14 Days</Button>
            <Button onClick={() => handleSponsor(30)}>Sponsor for 30 Days</Button>
            <Button variant="outline" onClick={() => setSponsorModal({ isOpen: false, property: null })}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, property: null })}
        title="Delete Property"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <p style={{ marginBottom: 'var(--space-6)', color: 'var(--gray-700)' }}>
            Are you sure you want to delete "{deleteModal.property?.title}"? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setDeleteModal({ isOpen: false, property: null })}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Property
            </Button>
          </div>
        </div>
      </Modal>

      {/* Promotion Modal */}
      <Modal
        isOpen={promotionModal.isOpen}
        onClose={() => setPromotionModal({ isOpen: false, listing: null })}
        title="Manage Promotion"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Listing info */}
          <div>
            <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              {promotionModal.listing?.title}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', margin: 0 }}>
              Current tier: <strong>{promotionModal.listing?.promotionTier || 'FREE'}</strong>
            </p>
          </div>

          {/* Tier selector */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
              Promotion Tier
            </label>
            <select
              className="admin-filter-select"
              style={{ width: '100%' }}
              value={promotionForm.promotionTier}
              onChange={(e) => setPromotionForm({ ...promotionForm, promotionTier: e.target.value })}
            >
              <option value="FREE">FREE — organic only</option>
              <option value="FEATURED">FEATURED — homepage + ×1.15 search</option>
              <option value="PREMIUM">PREMIUM — ×1.5 search boost</option>
              <option value="SPOTLIGHT">SPOTLIGHT — hero + ×3.0 search</option>
            </select>
          </div>

          {/* Duration presets */}
          {promotionForm.promotionTier !== 'FREE' && (
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
                Quick Duration
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {PROMO_DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setPromotionForm({
                      ...promotionForm,
                      promotionStartDate: new Date().toISOString().split('T')[0],
                      promotionEndDate:   addDays(preset.days),
                    })}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: '1px solid var(--gray-200)',
                      background: 'var(--gray-50)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      color: 'var(--gray-700)',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>
                Start Date
              </label>
              <input
                type="date"
                className="admin-filter-select"
                style={{ width: '100%' }}
                value={promotionForm.promotionStartDate}
                onChange={(e) => setPromotionForm({ ...promotionForm, promotionStartDate: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>
                End Date
              </label>
              <input
                type="date"
                className="admin-filter-select"
                style={{ width: '100%' }}
                value={promotionForm.promotionEndDate}
                onChange={(e) => setPromotionForm({ ...promotionForm, promotionEndDate: e.target.value })}
              />
            </div>
          </div>

          {promotionForm.promotionTier === 'FREE' && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', margin: 0 }}>
              Setting to FREE removes the active promotion. Listing returns to organic ranking.
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setPromotionModal({ isOpen: false, listing: null })}>
              Cancel
            </Button>
            <Button onClick={handlePromotionSave}>
              Save Promotion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminListings;
