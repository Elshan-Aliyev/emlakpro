import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, AlertCircle, Users, Eye, FileText, Settings, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProperties, getUsers } from '../services/api';
import Button from '../components/Button';
import './Admin.css';

const ACCOUNT_TYPE_PILL = {
  'verified-user':   { label: 'Verified',         bg: 'rgba(15,118,110,0.1)', fg: '#0F766E' },
  'verified-seller': { label: 'Verified Seller',  bg: 'rgba(15,118,110,0.1)', fg: '#0F766E' },
  'realtor':         { label: 'Realtor',           bg: '#FEF3C7',              fg: '#92400E' },
  'corporate':       { label: 'Corporate',         bg: '#EDE9FE',              fg: '#5B21B6' },
  'unverified-user': { label: 'Unverified',        bg: '#F1F5F9',              fg: '#64748B' },
};
const PILL_STYLE = { padding: '2px 8px', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 600, whiteSpace: 'nowrap' };
const renderAccountType = (accountType) => {
  const cfg = ACCOUNT_TYPE_PILL[accountType] || ACCOUNT_TYPE_PILL['unverified-user'];
  return <span style={{ ...PILL_STYLE, background: cfg.bg, color: cfg.fg }}>{cfg.label}</span>;
};

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
      const properties = propertiesRes.data.properties || [];
      
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
            {[80, 140, 200].map((h, i) => (
              <div key={i} style={{
                height: h, borderRadius: 16,
                background: 'linear-gradient(90deg, #f0f0ef 25%, #e8e8e6 50%, #f0f0ef 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
              }} />
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
              Admin Dashboard
              <span className="admin-badge">Admin</span>
            </h1>
            <Link to="/properties/create">
              <Button>+ Create Listing</Button>
            </Link>
          </div>
          <p>Platform overview for {user?.name}.</p>
        </div>

        {/* Alerts */}
        {stats.pendingListings > 0 && (
          <div className="admin-alert warning">
            <div className="admin-alert-icon">
            <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
          </div>
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
              <div className="admin-stat-icon">
                <Home size={18} strokeWidth={1.75} aria-hidden="true" />
              </div>
            </div>
            <div className="admin-stat-value">{stats.totalListings}</div>
            <div className="admin-stat-label">Listings</div>
            <div className="admin-stat-change positive">{stats.activeListings} active</div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon warning">
                <AlertCircle size={18} strokeWidth={1.75} aria-hidden="true" />
              </div>
            </div>
            <div className="admin-stat-value">{stats.pendingListings}</div>
            <div className="admin-stat-label">Pending review</div>
            <div className="admin-stat-change">Awaiting approval</div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon success">
                <Users size={18} strokeWidth={1.75} aria-hidden="true" />
              </div>
            </div>
            <div className="admin-stat-value">{stats.totalUsers}</div>
            <div className="admin-stat-label">Users</div>
            <div className="admin-stat-change positive">+{stats.newUsers} this week</div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon info">
                <Eye size={18} strokeWidth={1.75} aria-hidden="true" />
              </div>
            </div>
            <div className="admin-stat-value">{stats.totalViews.toLocaleString()}</div>
            <div className="admin-stat-label">Views</div>
            <div className="admin-stat-change positive">All time</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-section">
          <h2 style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h2>
          <div className="admin-quick-actions">
            <Link to="/admin/listings" className="admin-quick-action">
              <div className="admin-quick-action-icon">
                <FileText size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="admin-quick-action-title">Listings</div>
              <div className="admin-quick-action-desc">Review and approve</div>
            </Link>

            <Link to="/admin/users" className="admin-quick-action">
              <div className="admin-quick-action-icon">
                <Users size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="admin-quick-action-title">Users</div>
              <div className="admin-quick-action-desc">View and moderate</div>
            </Link>

            <Link to="/admin/settings" className="admin-quick-action">
              <div className="admin-quick-action-icon">
                <Settings size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="admin-quick-action-title">Settings</div>
              <div className="admin-quick-action-desc">Platform configuration</div>
            </Link>

            <Link to="/properties/create" className="admin-quick-action">
              <div className="admin-quick-action-icon">
                <Plus size={20} strokeWidth={2} aria-hidden="true" />
              </div>
              <div className="admin-quick-action-title">Add listing</div>
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
                    <th>Account Type</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user._id}>
                      <td><strong>{user.name}</strong></td>
                      <td>{user.email}</td>
                      <td>{user.role || 'registered'}</td>
                      <td>{renderAccountType(user.accountType)}</td>
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
