import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProperties } from '../services/api';
import Button from '../components/Button';
import './Account.css';

const AccountDashboard = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
    savedProperties: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getProperties();
        const allProperties = res.data || [];

        // Filter user's properties
        const userProperties = allProperties.filter(
          (p) => p.ownerId?._id === user?.id || p.ownerId === user?.id
        );

        setProperties(userProperties.slice(0, 3)); // Show only 3 recent

        // Calculate stats
        setStats({
          totalListings: userProperties.length,
          activeListings: userProperties.filter(p => p.status === 'active' || !p.status).length,
          totalViews: userProperties.reduce((sum, p) => sum + (p.views || 0), 0),
          savedProperties: user?.savedProperties?.length || 0,
        });
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-container">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading your dashboard...</p>
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
          <h1>{getGreeting()}, {user?.name || 'User'}!</h1>
          <p>Welcome back to your real estate dashboard</p>
        </div>

        {/* Verification Status Banner */}
        {(!user?.accountType || user?.accountType === 'unverified-user') && (
          <div className="dashboard-section">
            <div className="verification-banner">
              <div className="verification-banner-icon">🎯</div>
              <div className="verification-banner-content">
                <h3>Upgrade Your Account</h3>
                <p>Get verified to unlock features and build trust</p>
              </div>
              <Link to="/verification/apply">
                <Button variant="primary">Request Verification</Button>
              </Link>
            </div>
          </div>
        )}

        {user?.accountType && user?.accountType !== 'unverified-user' && (
          <div className="dashboard-section">
            <div className="verification-badge-banner verified">
              <div className="verification-banner-icon">✓</div>
              <div className="verification-banner-content">
                <h3>
                  {user.accountType === 'verified-user' && 'Verified User'}
                  {user.accountType === 'verified-seller' && 'Verified Seller'}
                  {user.accountType === 'realtor' && 'Verified Realtor'}
                  {user.accountType === 'corporate' && 'Corporate Account'}
                </h3>
                <p>Your account is verified and trusted</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="dashboard-section">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <h2>Account Overview</h2>
            <p>Track your real estate activity</p>
          </div>
          <div className="stats-grid">
            <Link to="/account/listings" className="stat-card clickable">
              <div className="stat-card-header">
                <div className="stat-card-icon">🏠</div>
              </div>
              <div className="stat-card-value">{stats.totalListings}</div>
              <div className="stat-card-label">Total Listings</div>
              <div className="stat-card-change positive">
                {stats.activeListings} active
              </div>
            </Link>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon secondary">👁️</div>
              </div>
              <div className="stat-card-value">{stats.totalViews}</div>
              <div className="stat-card-label">Total Views</div>
              <div className="stat-card-change positive">
                {stats.totalListings > 0 ? Math.round(stats.totalViews / stats.totalListings) : 0} avg per listing
              </div>
            </div>

            <Link to="/account/saved" className="stat-card clickable">
              <div className="stat-card-header">
                <div className="stat-card-icon tertiary">❤️</div>
              </div>
              <div className="stat-card-value">{stats.savedProperties}</div>
              <div className="stat-card-label">Saved Properties</div>
              <div className="stat-card-change">
                Your favorites
              </div>
            </Link>

            <Link to="/messages" className="stat-card clickable">
              <div className="stat-card-header">
                <div className="stat-card-icon quaternary">💬</div>
              </div>
              <div className="stat-card-value">0</div>
              <div className="stat-card-label">Messages</div>
              <div className="stat-card-change">
                0 unread
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-section">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <h2>Quick Actions</h2>
            <p>Common tasks and shortcuts</p>
          </div>
          <div className="quick-actions" style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="actions-grid">
              <Link to="/properties/create" className="action-card">
                <div className="action-card-icon">➕</div>
                <div className="action-card-title">List Property</div>
                <div className="action-card-desc">Create a new listing</div>
              </Link>

              <Link to="/account/listings" className="action-card">
                <div className="action-card-icon">📋</div>
                <div className="action-card-title">My Listings</div>
                <div className="action-card-desc">Manage your properties</div>
              </Link>

              <Link to="/account/saved" className="action-card">
                <div className="action-card-icon">⭐</div>
                <div className="action-card-title">Saved</div>
                <div className="action-card-desc">View favorites</div>
              </Link>

              <Link to="/account/settings" className="action-card">
                <div className="action-card-icon">⚙️</div>
                <div className="action-card-title">Settings</div>
                <div className="action-card-desc">Update your profile</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Listings */}
        <div className="dashboard-section">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <h2>Recent Listings</h2>
            <Link to="/account/listings" className="view-all-link">
              View All →
            </Link>
          </div>
          <div className="recent-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {properties.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏘️</div>
                <h3>No Listings Yet</h3>
                <p>Start by creating your first property listing</p>
                <Link to="/properties/create">
                  <Button>Create Listing</Button>
                </Link>
              </div>
            ) : (
              <div className="property-list">
                {properties.map((property) => (
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
                            <div className="property-item-title">{property.title}</div>
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
                            📏 {property.area || 0} sqft
                          </div>
                        </div>
                      </div>

                      <div className="property-item-footer">
                        <div className="property-item-stats">
                          <span>👁️ {property.views || 0} views</span>
                          <span>❤️ {property.likes || 0} saves</span>
                          <span style={{ 
                            color: (property.status || 'active') === 'active' ? '#10b981' : 
                                   (property.status || 'active') === 'sold' ? '#3b82f6' : 
                                   (property.status || 'active') === 'terminated' ? '#ef4444' : '#6b7280'
                          }}>
                            ● {property.status || 'active'}
                          </span>
                        </div>
                        <div className="property-item-actions">
                          <Link to={`/listing/${property._id}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                          <Link to={`/properties/update/${property._id}`}>
                            <Button size="sm">Edit</Button>
                          </Link>
                          <Link to="/services">
                            <Button variant="secondary" size="sm">Boost</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDashboard;
