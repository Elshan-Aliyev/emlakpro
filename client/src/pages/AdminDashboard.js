import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProperties, getUsers } from '../services/api';
import Button from '../components/Button';
import Badge from '../components/Badge';
import './Admin.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalListings: 0,
    pendingListings: 0,
    activeListings: 0,
    totalUsers: 0,
    newUsers: 0,
    totalViews: 0,
    totalRevenue: 0,
  });
  const [recentListings, setRecentListings] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch properties
      const propertiesRes = await getProperties();
      const properties = propertiesRes.data || [];
      
      // Fetch users
      const usersRes = await getUsers(token);
      const users = usersRes.data || [];

      // Calculate stats
      const pending = properties.filter(p => !p.isApproved || p.isApproved === false);
      const active = properties.filter(p => p.status === 'active' || !p.status);
      const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
      
      // Get new users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const newUsers = users.filter(u => new Date(u.createdAt) > sevenDaysAgo);

      setStats({
        totalListings: properties.length,
        pendingListings: pending.length,
        activeListings: active.length,
        totalUsers: users.length,
        newUsers: newUsers.length,
        totalViews,
        totalRevenue: 0, // Placeholder
      });

      // Set recent data (last 5)
      setRecentListings(properties.slice(0, 5));
      setRecentUsers(users.slice(0, 5));

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading dashboard...</p>
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
              Admin Dashboard
              <span className="admin-badge">Admin</span>
            </h1>
            <Link to="/properties/create">
              <Button>+ Create Listing</Button>
            </Link>
          </div>
          <p>Welcome back, {user?.name}! Here's what's happening with your platform.</p>
        </div>

        {/* Alerts */}
        {stats.pendingListings > 0 && (
          <div className="admin-alert warning">
            <div className="admin-alert-icon">⚠️</div>
            <div className="admin-alert-content">
              <div className="admin-alert-title">Pending Approvals</div>
              <div>You have {stats.pendingListings} listings waiting for approval.</div>
            </div>
            <Link to="/admin/listings">
              <Button size="sm" variant="outline">Review</Button>
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon">🏠</div>
            </div>
            <div className="admin-stat-value">{stats.totalListings}</div>
            <div className="admin-stat-label">Total Listings</div>
            <div className="admin-stat-change positive">
              {stats.activeListings} active
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon warning">⏳</div>
            </div>
            <div className="admin-stat-value">{stats.pendingListings}</div>
            <div className="admin-stat-label">Pending Approval</div>
            <div className="admin-stat-change">
              Needs review
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon success">👥</div>
            </div>
            <div className="admin-stat-value">{stats.totalUsers}</div>
            <div className="admin-stat-label">Total Users</div>
            <div className="admin-stat-change positive">
              +{stats.newUsers} this week
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon info">👁️</div>
            </div>
            <div className="admin-stat-value">{stats.totalViews.toLocaleString()}</div>
            <div className="admin-stat-label">Total Views</div>
            <div className="admin-stat-change positive">
              All time
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-section">
          <h2 style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h2>
          <div className="admin-quick-actions">
            <Link to="/admin/listings" className="admin-quick-action">
              <div className="admin-quick-action-icon">📋</div>
              <div className="admin-quick-action-title">Manage Listings</div>
              <div className="admin-quick-action-desc">Review and approve properties</div>
            </Link>

            <Link to="/admin/users" className="admin-quick-action">
              <div className="admin-quick-action-icon">👥</div>
              <div className="admin-quick-action-title">Manage Users</div>
              <div className="admin-quick-action-desc">View and moderate users</div>
            </Link>

            <Link to="/admin/settings" className="admin-quick-action">
              <div className="admin-quick-action-icon">⚙️</div>
              <div className="admin-quick-action-title">Site Settings</div>
              <div className="admin-quick-action-desc">Configure platform settings</div>
            </Link>

            <Link to="/properties/create" className="admin-quick-action">
              <div className="admin-quick-action-icon">➕</div>
              <div className="admin-quick-action-title">Add Listing</div>
              <div className="admin-quick-action-desc">Create new property</div>
            </Link>
          </div>
        </div>

        {/* Recent Listings */}
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Recent Listings</h2>
            <Link to="/admin/listings">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>

          {recentListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
              No listings yet
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Owner</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentListings.map((property) => (
                    <tr key={property._id}>
                      <td>
                        <strong>{property.title}</strong>
                        <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                          {property.location?.city || property.location || 'N/A'}
                        </div>
                      </td>
                      <td>{property.ownerId?.name || 'Unknown'}</td>
                      <td>${property.price?.toLocaleString() || 0}</td>
                      <td>
                        {property.isApproved ? (
                          <span className="approved-badge">Approved</span>
                        ) : (
                          <span className="pending-badge">Pending</span>
                        )}
                      </td>
                      <td>{property.views || 0}</td>
                      <td>{new Date(property.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="admin-table-actions">
                          <Link to={`/listing/${property._id}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Recent Users</h2>
            <Link to="/admin/users">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
              No users yet
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>User Type</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user._id}>
                      <td><strong>{user.name}</strong></td>
                      <td>{user.email}</td>
                      <td>{user.role || 'user'}</td>
                      <td>
                        <Badge variant={user.accountType === 'unverified-user' ? 'secondary' : 'success'}>
                          {user.accountType === 'unverified-user' ? 'Unverified' :
                           user.accountType === 'verified-user' ? 'Verified User' :
                           user.accountType === 'verified-seller' ? 'Verified Seller' :
                           user.accountType === 'realtor' ? 'Realtor' :
                           user.accountType === 'corporate' ? 'Corporate' :
                           'Unverified'}
                        </Badge>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className="approved-badge">
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
