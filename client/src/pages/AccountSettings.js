import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Input from '../components/Input';
import './Account.css';

const AccountSettings = () => {
  const { user, updateUser, logout } = useAuth();
  const { success, error: showError } = useToast();
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailListings: true,
    emailMessages: true,
    emailUpdates: false,
    pushNotifications: true,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      // Validation
      if (!profileForm.name || profileForm.name.length < 2) {
        showError('Name must be at least 2 characters');
        return;
      }

      if (!profileForm.email || !/\S+@\S+\.\S+/.test(profileForm.email)) {
        showError('Please enter a valid email');
        return;
      }

      await updateUser({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
      });

      success('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      showError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      // Validation
      if (!passwordForm.currentPassword) {
        showError('Please enter your current password');
        return;
      }

      if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
        showError('New password must be at least 6 characters');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showError('Passwords do not match');
        return;
      }

      // Import and call API
      const { changePassword } = await import('../services/api');
      const token = localStorage.getItem('token');
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, token);
      
      success('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error('Error changing password:', err);
      showError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    setNotificationsLoading(true);

    try {
      // API call would go here
      // await updateNotificationPreferences(notifications);
      
      success('Notification preferences updated');
    } catch (err) {
      console.error('Error updating notifications:', err);
      showError('Failed to update preferences');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // API call would go here
      showError('Account deletion is not yet implemented');
    }
  };

  return (
    <div className="account-page">
      <div className="account-container">
        {/* Header */}
        <div className="account-header">
          <h1>Account Settings</h1>
          <p>Manage your profile and preferences</p>
        </div>

        {/* Profile Settings */}
        <div className="recent-section" style={{ marginBottom: 'var(--space-6)' }}>
          <h2>Profile Information</h2>
          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              <Input
                label="Full Name"
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />

              <div style={{ 
                padding: 'var(--space-4)',
                background: 'var(--gray-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)'
              }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: 'var(--space-2)' }}>
                  Account Type
                </div>
                <div style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                  {user?.accountType === 'unverified-user' ? 'Unverified User' :
                   user?.accountType === 'verified-user' ? 'Verified User' :
                   user?.accountType === 'verified-seller' ? 'Verified Seller' :
                   user?.accountType === 'realtor' ? 'Realtor' :
                   user?.accountType === 'corporate' ? 'Corporate' :
                   'Unverified User'} • {user?.role || 'registered'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button type="submit" loading={profileLoading}>
                  Save Changes
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setProfileForm({
                    name: user?.name || '',
                    email: user?.email || '',
                    phone: user?.phone || '',
                  })}
                >
                  Reset
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Password Settings */}
        <div className="recent-section" style={{ marginBottom: 'var(--space-6)' }}>
          <h2>Change Password</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              <Input
                label="Current Password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />

              <Input
                label="New Password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                helperText="Must be at least 6 characters"
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />

              <Button type="submit" loading={passwordLoading}>
                Update Password
              </Button>
            </div>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="recent-section" style={{ marginBottom: 'var(--space-6)' }}>
          <h2>Notification Preferences</h2>
          <form onSubmit={handleNotificationsSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={notifications.emailListings}
                  onChange={(e) => setNotifications({ ...notifications, emailListings: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: 'var(--gray-900)', marginBottom: '2px' }}>
                    New Listings
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                    Get notified when new properties match your search criteria
                  </div>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={notifications.emailMessages}
                  onChange={(e) => setNotifications({ ...notifications, emailMessages: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: 'var(--gray-900)', marginBottom: '2px' }}>
                    Messages
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                    Receive emails when you get new messages
                  </div>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={notifications.emailUpdates}
                  onChange={(e) => setNotifications({ ...notifications, emailUpdates: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: 'var(--gray-900)', marginBottom: '2px' }}>
                    Product Updates
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                    Stay informed about new features and improvements
                  </div>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={notifications.pushNotifications}
                  onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: 'var(--gray-900)', marginBottom: '2px' }}>
                    Push Notifications
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                    Enable browser push notifications for instant updates
                  </div>
                </div>
              </label>

              <Button type="submit" loading={notificationsLoading}>
                Save Preferences
              </Button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="recent-section" style={{ 
          borderColor: 'var(--error-200)',
          background: 'var(--error-50)'
        }}>
          <h2 style={{ color: 'var(--error-600)' }}>Danger Zone</h2>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <p style={{ color: 'var(--gray-700)', marginBottom: 'var(--space-4)' }}>
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button variant="danger" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
