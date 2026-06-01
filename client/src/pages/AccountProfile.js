import React, { useState } from 'react';
import { Home, Heart, Eye, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import './Account.css';

// ── Icon aliases ───────────────────────────────────────────────────────────────
const IconHome    = () => <Home          size={18} strokeWidth={1.75} aria-hidden="true" />;
const IconHeart   = () => <Heart         size={18} strokeWidth={1.75} aria-hidden="true" />;
const IconEye     = () => <Eye           size={18} strokeWidth={1.75} aria-hidden="true" />;
const IconMessage = () => <MessageSquare size={18} strokeWidth={1.75} aria-hidden="true" />;

// ── Component ─────────────────────────────────────────────────────────────────

const AccountProfile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    company: user?.company || '',
    licenseNumber: user?.licenseNumber || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement profile update API call
    console.log('Update profile:', formData);
    setIsEditing(false);
  };

  const getRoleBadge = () => {
    const role = user?.role || 'buyer';
    return (
      <span className="role-badge">
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>My profile</h1>
          <p>View and manage your profile information</p>
        </div>

        <div className="profile-content">
          {/* ── Profile header card ── */}
          <div className="profile-header-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar-large">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="profile-header-info">
                <h2>{user?.name || 'User'}</h2>
                <div className="profile-meta">
                  {getRoleBadge()}
                  <span className="profile-email">{user?.email}</span>
                </div>
                <p className="member-since">
                  Member since{' '}
                  {new Date(user?.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>Edit profile</Button>
            )}
          </div>

          {/* ── Profile details card ── */}
          <div className="profile-details-card">
            <h3>Profile information</h3>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="profile-form">
                <div className="form-group">
                  <label className="form-label">Full name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    disabled
                  />
                  <small className="form-helper">Email cannot be changed</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+994 XX XXX XX XX"
                    className="form-input"
                  />
                </div>

                {(user?.role === 'realtor' || user?.role === 'corporate') && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Company</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Your company name"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">License number</label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        placeholder="Real estate license number"
                        className="form-input"
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell buyers a little about yourself…"
                    className="form-textarea"
                    rows="4"
                  />
                </div>

                <div className="form-actions">
                  <Button type="submit">Save changes</Button>
                  <Button variant="secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="profile-info-display">
                <div className="info-row">
                  <span className="info-label">Full name</span>
                  <span className="info-value">{user?.name || 'Not set'}</span>
                </div>

                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{user?.email}</span>
                </div>

                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{user?.phone || 'Not set'}</span>
                </div>

                {(user?.role === 'realtor' || user?.role === 'corporate') && (
                  <>
                    <div className="info-row">
                      <span className="info-label">Company</span>
                      <span className="info-value">{user?.company || 'Not set'}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">License number</span>
                      <span className="info-value">{user?.licenseNumber || 'Not set'}</span>
                    </div>
                  </>
                )}

                <div className="info-row">
                  <span className="info-label">Bio</span>
                  <span className="info-value">{user?.bio || 'No bio added yet'}</span>
                </div>

                <div className="info-row">
                  <span className="info-label">Account type</span>
                  <span className="info-value">{getRoleBadge()}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Account stats ── */}
          <div className="profile-stats-card">
            <h3>Account activity</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-icon"><IconHome /></span>
                <div className="stat-info">
                  <span className="stat-value">{user?.totalListings || 0}</span>
                  <span className="stat-label">Listings</span>
                </div>
              </div>

              <div className="stat-item">
                <span className="stat-icon"><IconHeart /></span>
                <div className="stat-info">
                  <span className="stat-value">{user?.savedProperties?.length || 0}</span>
                  <span className="stat-label">Saved</span>
                </div>
              </div>

              <div className="stat-item">
                <span className="stat-icon"><IconEye /></span>
                <div className="stat-info">
                  <span className="stat-value">{user?.totalViews || 0}</span>
                  <span className="stat-label">Profile views</span>
                </div>
              </div>

              <div className="stat-item">
                <span className="stat-icon"><IconMessage /></span>
                <div className="stat-info">
                  <span className="stat-value">{user?.messages?.length || 0}</span>
                  <span className="stat-label">Messages</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountProfile;
