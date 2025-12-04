import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Input from '../components/Input';
import './Admin.css';

const AdminSettings = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  // Site Settings
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'Real Estate Platform',
    siteDescription: 'Find your dream property',
    contactEmail: 'contact@realestate.com',
    contactPhone: '+1 (555) 000-0000',
    address: '123 Main St, City, State 12345',
  });

  // Feature Flags
  const [features, setFeatures] = useState({
    registrationEnabled: true,
    listingApproval: true,
    sponsoredListings: true,
    userMessages: false,
    emailNotifications: true,
  });

  // Pricing Settings
  const [pricing, setPricing] = useState({
    sponsoredDaily: 10,
    sponsoredWeekly: 50,
    sponsoredMonthly: 150,
    featuredListing: 25,
  });

  const [loading, setLoading] = useState(false);

  const handleSiteSettingsSave = async () => {
    setLoading(true);
    try {
      // API call would go here
      // await updateSettings('site', siteSettings);
      success('Site settings updated successfully');
    } catch (err) {
      showError('Failed to update site settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFeaturesSave = async () => {
    setLoading(true);
    try {
      // API call would go here
      // await updateSettings('features', features);
      success('Feature flags updated successfully');
    } catch (err) {
      showError('Failed to update feature flags');
    } finally {
      setLoading(false);
    }
  };

  const handlePricingSave = async () => {
    setLoading(true);
    try {
      // API call would go here
      // await updateSettings('pricing', pricing);
      success('Pricing settings updated successfully');
    } catch (err) {
      showError('Failed to update pricing settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <h1>
            Site Settings
            <span className="admin-badge">Admin</span>
          </h1>
          <p>Configure platform settings and preferences</p>
        </div>

        {/* Site Information */}
        <div className="admin-section" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ marginBottom: 'var(--space-4)' }}>Site Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Site Name"
              value={siteSettings.siteName}
              onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
            />

            <Input
              label="Site Description"
              value={siteSettings.siteDescription}
              onChange={(e) => setSiteSettings({ ...siteSettings, siteDescription: e.target.value })}
            />

            <Input
              label="Contact Email"
              type="email"
              value={siteSettings.contactEmail}
              onChange={(e) => setSiteSettings({ ...siteSettings, contactEmail: e.target.value })}
            />

            <Input
              label="Contact Phone"
              type="tel"
              value={siteSettings.contactPhone}
              onChange={(e) => setSiteSettings({ ...siteSettings, contactPhone: e.target.value })}
            />

            <Input
              label="Address"
              value={siteSettings.address}
              onChange={(e) => setSiteSettings({ ...siteSettings, address: e.target.value })}
            />

            <Button onClick={handleSiteSettingsSave} loading={loading}>
              Save Site Information
            </Button>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="admin-section" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ marginBottom: 'var(--space-4)' }}>Feature Flags</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                className="admin-checkbox"
                checked={features.registrationEnabled}
                onChange={(e) => setFeatures({ ...features, registrationEnabled: e.target.checked })}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', color: 'var(--gray-900)', marginBottom: '2px' }}>
                  User Registration
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Allow new users to register on the platform
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
                className="admin-checkbox"
                checked={features.listingApproval}
                onChange={(e) => setFeatures({ ...features, listingApproval: e.target.checked })}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', color: 'var(--gray-900)', marginBottom: '2px' }}>
                  Listing Approval
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Require admin approval before listings go live
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
                className="admin-checkbox"
                checked={features.sponsoredListings}
                onChange={(e) => setFeatures({ ...features, sponsoredListings: e.target.checked })}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', color: 'var(--gray-900)', marginBottom: '2px' }}>
                  Sponsored Listings
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Enable premium sponsored listing feature
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
                className="admin-checkbox"
                checked={features.userMessages}
                onChange={(e) => setFeatures({ ...features, userMessages: e.target.checked })}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', color: 'var(--gray-900)', marginBottom: '2px' }}>
                  User Messaging
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Allow users to send messages to property owners
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
                className="admin-checkbox"
                checked={features.emailNotifications}
                onChange={(e) => setFeatures({ ...features, emailNotifications: e.target.checked })}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', color: 'var(--gray-900)', marginBottom: '2px' }}>
                  Email Notifications
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  Send email notifications to users
                </div>
              </div>
            </label>

            <Button onClick={handleFeaturesSave} loading={loading}>
              Save Feature Flags
            </Button>
          </div>
        </div>

        {/* Pricing Settings */}
        <div className="admin-section" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ marginBottom: 'var(--space-4)' }}>Pricing Settings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Sponsored Listing - Daily Rate ($)"
              type="number"
              value={pricing.sponsoredDaily}
              onChange={(e) => setPricing({ ...pricing, sponsoredDaily: Number(e.target.value) })}
              helperText="Cost per day for sponsored listing"
            />

            <Input
              label="Sponsored Listing - Weekly Rate ($)"
              type="number"
              value={pricing.sponsoredWeekly}
              onChange={(e) => setPricing({ ...pricing, sponsoredWeekly: Number(e.target.value) })}
              helperText="Cost for 7 days of sponsored listing"
            />

            <Input
              label="Sponsored Listing - Monthly Rate ($)"
              type="number"
              value={pricing.sponsoredMonthly}
              onChange={(e) => setPricing({ ...pricing, sponsoredMonthly: Number(e.target.value) })}
              helperText="Cost for 30 days of sponsored listing"
            />

            <Input
              label="Featured Listing Fee ($)"
              type="number"
              value={pricing.featuredListing}
              onChange={(e) => setPricing({ ...pricing, featuredListing: Number(e.target.value) })}
              helperText="One-time fee for featured badge"
            />

            <Button onClick={handlePricingSave} loading={loading}>
              Save Pricing Settings
            </Button>
          </div>
        </div>

        {/* System Information */}
        <div className="admin-section">
          <h2 style={{ marginBottom: 'var(--space-4)' }}>System Information</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            padding: 'var(--space-4)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: 'var(--space-1)' }}>
                Platform Version
              </div>
              <div style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                v1.0.0
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: 'var(--space-1)' }}>
                Node Version
              </div>
              <div style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                {process.version}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: 'var(--space-1)' }}>
                Environment
              </div>
              <div style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                {process.env.NODE_ENV || 'development'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
