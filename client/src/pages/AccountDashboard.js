import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, Eye, Heart, MessageSquare, Plus, List, Star, Settings,
  Edit, MapPin, BedDouble, Bath, Maximize2, Shield, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyListings, getMyListingsHealth } from '../services/api';
import Button from '../components/Button';
import './Account.css';

// ── Icon aliases (preserve call-sites) ────────────────────────────────────────
const IconHome     = () => <Home          size={20} strokeWidth={1.75} aria-hidden="true" />;
const IconEye      = () => <Eye           size={20} strokeWidth={1.75} aria-hidden="true" />;
const IconHeart    = () => <Heart         size={20} strokeWidth={1.75} aria-hidden="true" />;
const IconMessage  = () => <MessageSquare size={20} strokeWidth={1.75} aria-hidden="true" />;
const IconPlus     = () => <Plus          size={20} strokeWidth={2}    aria-hidden="true" />;
const IconList     = () => <List          size={20} strokeWidth={1.75} aria-hidden="true" />;
const IconStar     = () => <Star          size={20} strokeWidth={1.75} aria-hidden="true" />;
const IconSettings = () => <Settings      size={20} strokeWidth={1.75} aria-hidden="true" />;
const IconEdit     = () => <Edit          size={16} strokeWidth={2}    aria-hidden="true" />;
const IconPin      = () => <MapPin        size={13} strokeWidth={2}    aria-hidden="true" />;
const IconBed      = () => <BedDouble     size={13} strokeWidth={2}    aria-hidden="true" />;
const IconBath     = () => <Bath          size={13} strokeWidth={2}    aria-hidden="true" />;
const IconArea     = () => <Maximize2     size={13} strokeWidth={2}    aria-hidden="true" />;
const IconShield   = () => <Shield        size={18} strokeWidth={1.75} aria-hidden="true" />;
const IconCheck    = () => <Check         size={16} strokeWidth={2.5}  aria-hidden="true" />;

// ── Dashboard skeleton ────────────────────────────────────────────────────────

const DashboardSkeleton = () => (
  <div className="account-page">
    <div className="account-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 0' }}>
        {[240, 120, 180].map((h, i) => (
          <div key={i} style={{
            height: h,
            borderRadius: 16,
            background: 'linear-gradient(90deg, #f0f0ef 25%, #e8e8e6 50%, #f0f0ef 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        ))}
      </div>
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const AccountDashboard = () => {
  const { user } = useAuth();
  const [properties,  setProperties]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [hygieneSum,  setHygieneSum]  = useState(null);
  const [stats,       setStats]       = useState({
    totalListings: 0, activeListings: 0, totalViews: 0, savedProperties: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [propsRes, healthRes] = await Promise.allSettled([
          getMyListings(token),
          getMyListingsHealth(token),
        ]);

        if (propsRes.status === 'fulfilled') {
          const mine = propsRes.value.data.properties || propsRes.value.data || [];
          setProperties(mine.slice(0, 3));
          setStats({
            totalListings:   mine.length,
            activeListings:  mine.filter(p => p.status === 'active' || !p.status).length,
            totalViews:      mine.reduce((s, p) => s + (p.views || 0), 0),
            savedProperties: user?.savedProperties?.length || 0,
          });
        }

        if (healthRes.status === 'fulfilled') {
          setHygieneSum(healthRes.value.data.summary || null);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleLabel = (role) => {
    const map = {
      admin: 'Administrator', superadmin: 'Super Administrator',
      realtor: 'Realtor', corporate: 'Corporate',
    };
    return map[role] || 'Member';
  };

  const getStatusColor = (status) => {
    if (status === 'active' || !status) return 'var(--color-primary, #0F766E)';
    if (status === 'sold') return '#6366f1';
    if (status === 'terminated') return '#ef4444';
    return '#6b7280';
  };

  const getImageUrl = (images) => {
    if (!images?.length) return null;
    const img = images[0];
    if (typeof img === 'string') return img;
    return img.medium || img.thumbnail || img.large || img.url;
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="account-page">
      <div className="account-container">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="dashboard-header">
          <div className="profile-box">
            <div className="profile-avatar">
              {user?.avatar
                ? <img src={user.avatar} alt={user?.name} />
                : <img src="/assets/No_Image_Available.jpg" alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              }
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{user?.name} {user?.lastName}</h3>
              <p className="profile-role">{getRoleLabel(user?.role)}</p>
            </div>
            <Link to="/account/settings" className="profile-edit-btn" aria-label="Edit profile">
              <IconEdit />
            </Link>
          </div>

          <div className="welcome-message">
            <h1>{getGreeting()}, {user?.name || 'there'}.</h1>
            <p>Here's an overview of your account activity.</p>
          </div>
        </div>

        {/* ── Verification banner ────────────────────────────────────── */}
        {(!user?.accountType || user?.accountType === 'unverified-user') && (
          <div className="dashboard-section">
            <div className="verification-banner">
              <div className="verification-banner-icon">
                <IconShield />
              </div>
              <div className="verification-banner-content">
                <h3>Verify your account</h3>
                <p>Verified sellers receive more inquiries and build buyer confidence faster.</p>
              </div>
              <Link to="/verification/apply">
                <Button variant="primary">Request verification</Button>
              </Link>
            </div>
          </div>
        )}

        {user?.accountType && user?.accountType !== 'unverified-user' && (
          <div className="dashboard-section">
            <div className="verification-badge-banner verified">
              <div className="verification-banner-icon" style={{ color: 'var(--color-primary, #0F766E)' }}>
                <IconCheck />
              </div>
              <div className="verification-banner-content">
                <h3>
                  {user.accountType === 'verified-user'   && 'Verified account'}
                  {user.accountType === 'verified-seller' && 'Verified seller'}
                  {user.accountType === 'realtor'         && 'Verified realtor'}
                  {user.accountType === 'corporate'       && 'Corporate account'}
                </h3>
                <p>Your account status is confirmed and visible to buyers.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Overview</h2>
          </div>
          <div className="stats-grid">
            <Link to="/account/listings" className="stat-card clickable">
              <div className="stat-card-header">
                <div className="stat-card-icon"><IconHome /></div>
              </div>
              <div className="stat-card-value">{stats.totalListings}</div>
              <div className="stat-card-label">Listings</div>
              <div className="stat-card-change positive">{stats.activeListings} active</div>
            </Link>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon secondary"><IconEye /></div>
              </div>
              <div className="stat-card-value">{stats.totalViews}</div>
              <div className="stat-card-label">Total views</div>
              <div className="stat-card-change positive">
                {stats.totalListings > 0 ? Math.round(stats.totalViews / stats.totalListings) : 0} avg per listing
              </div>
            </div>

            <Link to="/account/saved" className="stat-card clickable">
              <div className="stat-card-header">
                <div className="stat-card-icon tertiary"><IconHeart /></div>
              </div>
              <div className="stat-card-value">{stats.savedProperties}</div>
              <div className="stat-card-label">Saved</div>
              <div className="stat-card-change">Properties you follow</div>
            </Link>

            <Link to="/messages" className="stat-card clickable">
              <div className="stat-card-header">
                <div className="stat-card-icon quaternary"><IconMessage /></div>
              </div>
              <div className="stat-card-value">0</div>
              <div className="stat-card-label">Messages</div>
              <div className="stat-card-change">Inbox</div>
            </Link>
          </div>
        </div>

        {/* ── Listing health ─────────────────────────────────────────── */}
        {hygieneSum && hygieneSum.total > 0 && hygieneSum.needsAttention > 0 && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Listing health</h2>
              <p>Keep listings current to maintain search visibility.</p>
            </div>
            <div className="hygiene-summary">
              <div className={`hygiene-score-card ${hygieneSum.needsAttention === 0 ? 'hygiene-score-card--good' : 'hygiene-score-card--warn'}`}>
                <div className="hygiene-score-value">{hygieneSum.needsAttention}</div>
                <div className="hygiene-score-label">
                  listing{hygieneSum.needsAttention !== 1 ? 's' : ''} need attention
                </div>
              </div>
              <div className="hygiene-issues">
                {hygieneSum.staleOrCritical > 0 && (
                  <div className="hygiene-issue">
                    <span className="hygiene-issue-dot hygiene-issue-dot--stale" />
                    <span>{hygieneSum.staleOrCritical} stale or outdated</span>
                  </div>
                )}
                {hygieneSum.needsReconfirm > 0 && (
                  <div className="hygiene-issue">
                    <span className="hygiene-issue-dot hygiene-issue-dot--reconfirm" />
                    <span>{hygieneSum.needsReconfirm} awaiting availability confirmation</span>
                  </div>
                )}
                {hygieneSum.noPhotos > 0 && (
                  <div className="hygiene-issue">
                    <span className="hygiene-issue-dot hygiene-issue-dot--photo" />
                    <span>{hygieneSum.noPhotos} without photos</span>
                  </div>
                )}
                <Link to="/account/listings" className="hygiene-cta">Review listings</Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Quick actions ───────────────────────────────────────────── */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Quick actions</h2>
          </div>
          <div className="quick-actions">
            <div className="actions-grid">
              <Link to="/properties/create" className="action-card">
                <div className="action-card-icon"><IconPlus /></div>
                <div className="action-card-title">List a property</div>
                <div className="action-card-desc">Create a new listing</div>
              </Link>
              <Link to="/account/listings" className="action-card">
                <div className="action-card-icon"><IconList /></div>
                <div className="action-card-title">My listings</div>
                <div className="action-card-desc">Manage your properties</div>
              </Link>
              <Link to="/account/saved" className="action-card">
                <div className="action-card-icon"><IconStar /></div>
                <div className="action-card-title">Saved</div>
                <div className="action-card-desc">Properties you follow</div>
              </Link>
              <Link to="/account/settings" className="action-card">
                <div className="action-card-icon"><IconSettings /></div>
                <div className="action-card-title">Settings</div>
                <div className="action-card-desc">Profile and preferences</div>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Recent listings ─────────────────────────────────────────── */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent listings</h2>
            <Link to="/account/listings" className="view-all-link">View all</Link>
          </div>

          {properties.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon"><IconHome /></div>
              <h3>No listings yet</h3>
              <p>Create your first listing and reach thousands of buyers.</p>
              <Link to="/properties/create">
                <Button>Create a listing</Button>
              </Link>
            </div>
          ) : (
            <div className="property-list">
              {properties.map((property) => (
                <div key={property._id} className="property-item">
                  {getImageUrl(property.images) ? (
                    <img
                      src={getImageUrl(property.images)}
                      alt={property.title}
                      className="property-item-image"
                    />
                  ) : (
                    <div className="property-item-image-placeholder">
                      <IconHome />
                    </div>
                  )}

                  <div className="property-item-content">
                    <div>
                      <div className="property-item-header">
                        <div>
                          <div className="property-item-title">{property.title}</div>
                          <div className="property-item-location">
                            <IconPin />
                            {property.location?.city || property.city || 'Location not set'}
                          </div>
                        </div>
                        <div className="property-item-price">
                          {property.currency || 'AZN'} {property.price?.toLocaleString() || '—'}
                        </div>
                      </div>

                      <div className="property-item-meta">
                        {property.bedrooms > 0 && (
                          <div className="property-item-meta-item">
                            <IconBed /> {property.bedrooms} bd
                          </div>
                        )}
                        {property.bathrooms > 0 && (
                          <div className="property-item-meta-item">
                            <IconBath /> {property.bathrooms} ba
                          </div>
                        )}
                        {property.builtUpArea > 0 && (
                          <div className="property-item-meta-item">
                            <IconArea /> {property.builtUpArea} m²
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="property-item-footer">
                      <div className="property-item-stats">
                        <span>
                          <IconEye style={{ width: 12, height: 12 }} />
                          {property.views || 0} views
                        </span>
                        <span style={{ color: getStatusColor(property.status) }}>
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
  );
};

export default AccountDashboard;
