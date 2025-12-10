import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getUsers, updateUser, deleteUser } from '../services/api';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import Input from '../components/Input';
import './Admin.css';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [editModal, setEditModal] = useState({ isOpen: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  
  // Edit form
  const [editForm, setEditForm] = useState({ role: '', accountType: '', userType: '', isActive: true });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, roleFilter, accountTypeFilter, searchTerm]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await getUsers(token);
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Account type filter
    if (accountTypeFilter !== 'all') {
      filtered = filtered.filter(u => u.accountType === accountTypeFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
  };

  const openEditModal = (user) => {
    setEditForm({
      role: user.role || 'registered',
      accountType: user.accountType || 'unverified-user',
      userType: user.userType || 'buyer',
      isActive: user.isActive !== false
    });
    setEditModal({ isOpen: true, user });
  };

  const handleEdit = async () => {
    if (!editModal.user) return;

    try {
      const token = localStorage.getItem('token');
      await updateUser(editModal.user._id, editForm, token);
      success('User updated successfully');
      setEditModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      showError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;

    try {
      const token = localStorage.getItem('token');
      await deleteUser(deleteModal.user._id, token);
      success('User deleted successfully');
      setDeleteModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      showError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const getUserStats = () => {
    return {
      total: users.length,
      unverified: users.filter(u => u.accountType === 'unverified-user').length,
      verified: users.filter(u => u.accountType === 'verified-user').length,
      sellers: users.filter(u => ['verified-seller', 'realtor', 'corporate'].includes(u.accountType)).length,
      admins: users.filter(u => ['admin', 'superadmin'].includes(u.role)).length,
    };
  };

  const stats = getUserStats();

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading users...</p>
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
              Manage Users
              <span className="admin-badge">Admin</span>
            </h1>
          </div>
          <p>View and manage all registered users</p>
        </div>

        {/* Stats */}
        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.total}</div>
            <div className="admin-stat-label">Total Users</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.unverified}</div>
            <div className="admin-stat-label">Unverified</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.verified}</div>
            <div className="admin-stat-label">Verified Users</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.agents}</div>
            <div className="admin-stat-label">Agents</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.admins}</div>
            <div className="admin-stat-label">Admins</div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="admin-filter-group">
            <label className="admin-filter-label">Role:</label>
            <select
              className="admin-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="registered">Registered</option>
              <option value="realtor">Realtor</option>
              <option value="corporate">Corporate</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          <div className="admin-filter-group">
            <label className="admin-filter-label">Account Type:</label>
            <select
              className="admin-filter-select"
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="unverified-user">Unverified User</option>
              <option value="verified-user">Verified User</option>
              <option value="verified-seller">Verified Seller</option>
              <option value="realtor">Realtor</option>
              <option value="corporate">Corporate</option>
            </select>
          </div>

          <div className="admin-filter-group" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search by name or email..."
              className="admin-filter-select"
              style={{ width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>
              {filteredUsers.length} {filteredUsers.length === 1 ? 'User' : 'Users'}
            </h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
              No users found matching your filters
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
                    <th>Account Type</th>
                    <th>Phone</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <strong>{user.name}</strong>
                        {user._id === currentUser?.id && (
                          <Badge variant="info" style={{ marginLeft: 'var(--space-2)' }}>You</Badge>
                        )}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <Badge
                          variant={
                            ['admin', 'superadmin'].includes(user.role)
                              ? 'danger'
                              : user.role === 'realtor'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {user.role || 'registered'}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={
                          user.userType === 'agent' ? 'warning' :
                          user.userType === 'seller' ? 'info' :
                          'secondary'
                        }>
                          {user.userType === 'buyer' ? 'Buyer' :
                           user.userType === 'seller' ? 'Seller' :
                           user.userType === 'agent' ? 'Agent' :
                           'Buyer'}
                        </Badge>
                      </td>
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
                      <td>{user.phone || '-'}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        {user.isActive !== false ? (
                          <span className="approved-badge">Active</span>
                        ) : (
                          <span className="pending-badge">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(user)}
                          >
                            Edit
                          </Button>
                          {user._id !== currentUser?.id && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteModal({ isOpen: true, user })}
                            >
                              Delete
                            </Button>
                          )}
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

      {/* Edit Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, user: null })}
        title="Edit User"
        size="md"
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p style={{ fontWeight: '600', marginBottom: 'var(--space-2)' }}>
              {editModal.user?.name}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
              {editModal.user?.email}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--space-2)' }}>
                Role
              </label>
              <select
                className="admin-filter-select"
                style={{ width: '100%' }}
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <option value="registered">Registered</option>
                <option value="realtor">Realtor</option>
                <option value="corporate">Corporate</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--space-2)' }}>
                User Type
              </label>
              <select
                className="admin-filter-select"
                style={{ width: '100%' }}
                value={editForm.userType}
                onChange={(e) => setEditForm({ ...editForm, userType: e.target.value })}
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--space-2)' }}>
                Account Type
              </label>
              <select
                className="admin-filter-select"
                style={{ width: '100%' }}
                value={editForm.accountType}
                onChange={(e) => setEditForm({ ...editForm, accountType: e.target.value })}
              >
                <option value="unverified-user">Unverified User</option>
                <option value="verified-user">Verified User</option>
                <option value="verified-seller">Verified Seller</option>
                <option value="realtor">Realtor</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                className="admin-checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
              <span style={{ fontWeight: '500' }}>Active Account</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
            <Button variant="outline" onClick={() => setEditModal({ isOpen: false, user: null })}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, user: null })}
        title="Delete User"
        size="sm"
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <p style={{ marginBottom: 'var(--space-6)', color: 'var(--gray-700)' }}>
            Are you sure you want to delete user "{deleteModal.user?.name}"? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setDeleteModal({ isOpen: false, user: null })}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;
