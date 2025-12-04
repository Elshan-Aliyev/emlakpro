import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getProperties, deleteProperty } from '../services/api';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import './Account.css';

const AccountListings = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, property: null });
  const [filter, setFilter] = useState('all'); // all, active, paused, sold

  useEffect(() => {
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    try {
      const res = await getProperties();
      const allProperties = res.data || [];
      
      // Filter user's properties
      const userProperties = allProperties.filter(
        (p) => p.ownerId?._id === user?.id || p.ownerId === user?.id
      );

      setProperties(userProperties);
    } catch (err) {
      console.error('Error fetching properties:', err);
      showError('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.property) return;

    try {
      const token = localStorage.getItem('token');
      await deleteProperty(deleteModal.property._id, token);
      success('Property deleted successfully');
      setDeleteModal({ isOpen: false, property: null });
      fetchProperties(); // Refresh list
    } catch (err) {
      console.error('Error deleting property:', err);
      showError(err.response?.data?.message || 'Failed to delete property');
    }
  };

  const openDeleteModal = (property) => {
    setDeleteModal({ isOpen: true, property });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, property: null });
  };

  const getFilteredProperties = () => {
    if (filter === 'all') return properties;
    return properties.filter(p => {
      const status = p.status || 'active';
      return status === filter;
    });
  };

  const filteredProperties = getFilteredProperties();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'paused':
        return <Badge variant="warning">Paused</Badge>;
      case 'sold':
        return <Badge variant="secondary">Sold</Badge>;
      default:
        return <Badge variant="success">Active</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-container">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading your listings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-container">
        {/* Header */}
        <div className="account-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>My Listings</h1>
              <p>Manage your property listings</p>
            </div>
            <Link to="/properties/create">
              <Button>+ Create Listing</Button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-2)', 
          marginBottom: 'var(--space-6)',
          flexWrap: 'wrap'
        }}>
          <Button 
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({properties.length})
          </Button>
          <Button 
            variant={filter === 'active' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Active ({properties.filter(p => (p.status || 'active') === 'active').length})
          </Button>
          <Button 
            variant={filter === 'paused' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('paused')}
          >
            Paused ({properties.filter(p => p.status === 'paused').length})
          </Button>
          <Button 
            variant={filter === 'sold' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('sold')}
          >
            Sold ({properties.filter(p => p.status === 'sold').length})
          </Button>
        </div>

        {/* Listings */}
        {filteredProperties.length === 0 ? (
          <div className="recent-section">
            <div className="empty-state">
              <div className="empty-state-icon">🏘️</div>
              <h3>
                {filter === 'all' 
                  ? 'No Listings Yet' 
                  : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Listings`
                }
              </h3>
              <p>
                {filter === 'all'
                  ? 'Start by creating your first property listing'
                  : `You don't have any ${filter} listings at the moment`
                }
              </p>
              {filter === 'all' && (
                <Link to="/properties/create">
                  <Button>Create Listing</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="property-list">
            {filteredProperties.map((property) => (
              <div key={property._id} className="property-item">
                {property.images?.[0] ? (
                  <img
                    src={property.images[0].url}
                    alt={property.title}
                    className="property-item-image"
                  />
                ) : (
                  <div className="property-item-image-placeholder">🏠</div>
                )}

                <div className="property-item-content">
                  <div>
                    <div className="property-item-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                          <div className="property-item-title">{property.title}</div>
                          {getStatusBadge(property.status)}
                          {property.isSponsored && <Badge variant="info">Sponsored</Badge>}
                        </div>
                        <div className="property-item-location">
                          📍 {property.location?.city || 'Location not set'}
                        </div>
                      </div>
                      <div className="property-item-price">
                        ${property.price?.toLocaleString() || '0'}
                      </div>
                    </div>

                    <div className="property-item-meta">
                      <div className="property-item-meta-item">
                        🛏️ {property.bedrooms || 0} beds
                      </div>
                      <div className="property-item-meta-item">
                        🚿 {property.bathrooms || 0} baths
                      </div>
                      <div className="property-item-meta-item">
                        📏 {property.builtUpArea || property.area || 0} m²
                      </div>
                      <div className="property-item-meta-item">
                        🏷️ {property.propertyType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="property-item-footer">
                    <div className="property-item-stats">
                      <span>👁️ {property.views || 0} views</span>
                      <span>❤️ {property.likes || 0} saves</span>
                      <span>🕒 {new Date(property.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="property-item-actions">
                      <Link to={`/listing/${property._id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link to={`/properties/update/${property._id}`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => openDeleteModal(property)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        title="Delete Property"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <p style={{ marginBottom: 'var(--space-6)', color: 'var(--gray-700)' }}>
            Are you sure you want to delete "{deleteModal.property?.title}"? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={closeDeleteModal}>
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

export default AccountListings;
