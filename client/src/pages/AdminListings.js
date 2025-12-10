import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getProperties, updateProperty, deleteProperty } from '../services/api';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import './Admin.css';

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

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, statusFilter, approvalFilter, searchTerm]);

  const fetchProperties = async () => {
    try {
      const res = await getProperties();
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

    setFilteredProperties(filtered);
  };

  const handleApprove = async () => {
    if (!approveModal.property) return;

    try {
      const token = localStorage.getItem('token');
      await updateProperty(
        approveModal.property._id,
        { isApproved: true, approvedBy: user._id, approvedAt: new Date() },
        token
      );
      success('Property approved successfully');
      setApproveModal({ isOpen: false, property: null });
      fetchProperties();
    } catch (err) {
      console.error('Error approving property:', err);
      showError(err.response?.data?.message || 'Failed to approve property');
    }
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
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading listings...</p>
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

      {/* Approve Modal */}
      <Modal
        isOpen={approveModal.isOpen}
        onClose={() => setApproveModal({ isOpen: false, property: null })}
        title="Approve Property"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <p style={{ marginBottom: 'var(--space-6)', color: 'var(--gray-700)' }}>
            Are you sure you want to approve "{approveModal.property?.title}"?
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setApproveModal({ isOpen: false, property: null })}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              Approve Property
            </Button>
          </div>
        </div>
      </Modal>

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
    </div>
  );
};

export default AdminListings;
