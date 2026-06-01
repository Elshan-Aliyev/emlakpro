import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Input from '../components/Input';
import PhoneVerification from '../components/PhoneVerification';
import './Account.css';

const ACCOUNT_TYPE_LABELS = {
  'unverified-user': 'Unverified',
  'verified-user':   'Verified user',
  'verified-seller': 'Verified seller',
  'realtor':         'Realtor',
  'corporate':       'Corporate',
};

const AccountSettings = () => {
  const { user, updateUser, logout } = useAuth();
  const { success, error: showError } = useToast();

  const [avatarLoading, setAvatarLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name:  user?.name  || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword:  '',
    newPassword:      '',
    confirmPassword:  '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [notifications, setNotifications] = useState({
    emailListings:     true,
    emailMessages:     true,
    emailUpdates:      false,
    pushNotifications: true,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      if (!profileForm.name || profileForm.name.length < 2) {
        showError('Name must be at least 2 characters');
        return;
      }
      if (!profileForm.email || !/\S+@\S+\.\S+/.test(profileForm.email)) {
        showError('Please enter a valid email');
        return;
      }
      await updateUser({ name: profileForm.name, email: profileForm.email, phone: profileForm.phone });
      success('Profile updated successfully');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      if (!passwordForm.currentPassword) { showError('Please enter your current password'); return; }
      if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
        showError('New password must be at least 6 characters'); return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showError('Passwords do not match'); return;
      }
      const { changePassword } = await import('../services/api');
      const token = localStorage.getItem('token');
      await changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }, token);
      success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    setNotificationsLoading(true);
    try {
      success('Notification preferences updated');
    } catch (err) {
      showError('Failed to update preferences');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showError('Please select a valid image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { showError('Image size must be less than 5MB');  return; }
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem('token');
      const { uploadImage } = await import('../services/api');
      const imgRes = await uploadImage(formData, token);
      const avatarUrl = imgRes.data?.url || imgRes.data?.secure_url || imgRes.data?.image || imgRes.data?.avatar;
      if (!avatarUrl) throw new Error('No avatar URL returned');
      await updateUser({ avatar: avatarUrl });
      success('Profile photo updated');
    } catch (err) {
      showError(err.message || 'Failed to upload profile photo');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      showError('Account deletion is not yet implemented');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>Settings</h1>
          <p>Manage your profile, security, and preferences</p>
        </div>

        {/* ── Profile information ── */}
        <div className="settings-section">
          <div className="settings-section-hd">
            <h2>Profile information</h2>
          </div>

          {/* Photo upload */}
          <div className="settings-photo-row">
            <div className="profile-avatar" style={{ width: 72, height: 72 }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <div className="profile-avatar-placeholder">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="settings-photo-info">
              <div className="settings-photo-title">Profile photo</div>
              <div className="settings-photo-hint">JPG, PNG or WebP — max 5 MB</div>
              <label className="settings-photo-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                  disabled={avatarLoading}
                />
                <Button type="button" variant="outline" loading={avatarLoading} style={{ pointerEvents: avatarLoading ? 'none' : 'auto' }}>
                  {avatarLoading ? 'Uploading…' : 'Change photo'}
                </Button>
              </label>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="settings-form">
            <Input
              label="Full name"
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              required
            />
            <Input
              label="Email address"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              required
            />
            <Input
              label="Phone number"
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              placeholder="+994 XX XXX XX XX"
            />

            {/* Account type display */}
            <div className="settings-meta-row">
              <div className="settings-meta-label">Account type</div>
              <div className="settings-meta-value">
                {ACCOUNT_TYPE_LABELS[user?.accountType] || 'Unverified'}
                {' · '}
                <span style={{ textTransform: 'capitalize' }}>{user?.role || 'member'}</span>
              </div>
            </div>

            <div className="settings-form-footer">
              <Button type="submit" loading={profileLoading}>Save changes</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfileForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })}
              >
                Reset
              </Button>
            </div>
          </form>
        </div>

        {/* ── Phone verification ── */}
        <div className="settings-section">
          <div className="settings-section-hd">
            <h2>Phone verification</h2>
            <p>Verify your phone number to increase trust and unlock seller features.</p>
          </div>
          <PhoneVerification
            user={user}
            onVerified={(verifiedPhone) => {
              updateUser({ phone: verifiedPhone, phoneVerified: true });
              success('Phone number verified');
            }}
          />
        </div>

        {/* ── Security ── */}
        <div className="settings-section">
          <div className="settings-section-hd">
            <h2>Security</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="settings-form">
            <Input
              label="Current password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
            />
            <Input
              label="New password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              helperText="At least 6 characters"
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
            />
            <div className="settings-form-footer">
              <Button type="submit" loading={passwordLoading}>Update password</Button>
            </div>
          </form>
        </div>

        {/* ── Notifications ── */}
        <div className="settings-section">
          <div className="settings-section-hd">
            <h2>Notifications</h2>
          </div>
          <form onSubmit={handleNotificationsSubmit}>
            <div className="notification-preferences">
              {[
                { key: 'emailListings',     title: 'New listings',       desc: 'Get notified when new properties match your search criteria' },
                { key: 'emailMessages',     title: 'Messages',            desc: 'Receive emails when you get new messages' },
                { key: 'emailUpdates',      title: 'Product updates',     desc: 'Stay informed about new features and improvements' },
                { key: 'pushNotifications', title: 'Push notifications',  desc: 'Enable browser push notifications for instant updates' },
              ].map(({ key, title, desc }) => (
                <label key={key} className="notification-item">
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                  />
                  <div>
                    <strong>{title}</strong>
                    <span>{desc}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="settings-form-footer" style={{ marginTop: 16 }}>
              <Button type="submit" loading={notificationsLoading}>Save preferences</Button>
            </div>
          </form>
        </div>

        {/* ── Danger zone ── */}
        <div className="settings-section settings-section--danger">
          <div className="settings-section-hd">
            <h2>Danger zone</h2>
          </div>
          <p className="settings-danger-copy">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button variant="danger" onClick={handleDeleteAccount}>
            Delete account
          </Button>
        </div>

      </div>
    </div>
  );
};

export default AccountSettings;
