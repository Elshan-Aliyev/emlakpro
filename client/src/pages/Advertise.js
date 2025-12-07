import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Modal from '../components/Modal';
import './Advertise.css';

const Advertise = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('services');
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [myAds, setMyAds] = useState([]);
  const [adStats, setAdStats] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    activeAds: 0,
    totalSpent: 0
  });

  const advertisingServices = [
    {
      id: 'featured-listing',
      icon: '⭐',
      title: 'Featured Listing',
      description: 'Highlight your property at the top of search results',
      features: [
        'Top position in search results',
        'Yellow "Featured" badge',
        'Highlighted border',
        '3x more visibility'
      ],
      pricing: [
        { duration: '7 days', price: 49.99, popular: false },
        { duration: '30 days', price: 149.99, popular: true },
        { duration: '90 days', price: 349.99, popular: false }
      ],
      color: '#f59e0b'
    },
    {
      id: 'home-banner',
      icon: '🎯',
      title: 'Home Page Banner',
      description: 'Display your property on the homepage hero section',
      features: [
        'Large hero banner display',
        'Maximum visibility',
        'Rotating carousel slot',
        'Link to your listing'
      ],
      pricing: [
        { duration: '1 day', price: 99.99, popular: false },
        { duration: '7 days', price: 499.99, popular: true },
        { duration: '30 days', price: 1499.99, popular: false }
      ],
      color: '#3b82f6'
    },
    {
      id: 'popup-ad',
      icon: '💥',
      title: 'Popup Advertisement',
      description: 'Show your listing in a popup to website visitors',
      features: [
        'Full-screen popup display',
        'Targeted by user preferences',
        'Frequency control',
        'High engagement rate'
      ],
      pricing: [
        { duration: '1000 impressions', price: 29.99, popular: false },
        { duration: '5000 impressions', price: 119.99, popular: true },
        { duration: '10000 impressions', price: 199.99, popular: false }
      ],
      color: '#ec4899'
    },
    {
      id: 'search-top',
      icon: '🔝',
      title: 'Search Results Top',
      description: 'Always appear in top 3 of relevant searches',
      features: [
        'Guaranteed top 3 position',
        'Category-specific targeting',
        'Priority over organic results',
        'Premium badge'
      ],
      pricing: [
        { duration: '7 days', price: 79.99, popular: false },
        { duration: '30 days', price: 249.99, popular: true },
        { duration: '90 days', price: 599.99, popular: false }
      ],
      color: '#10b981'
    }
  ];

  const handleServiceClick = (service) => {
    setSelectedService(service);
    setShowModal(true);
  };

  const handlePurchase = (service, pricing) => {
    // This would integrate with payment system
    console.log('Purchase:', service.id, pricing);
    alert(`Purchasing ${service.title} - ${pricing.duration} for ${pricing.price} AZN`);
    setShowModal(false);
  };

  const handleBypassPayment = (service, pricing) => {
    // Admin bypass - skip payment and activate service
    console.log('Admin Bypass:', service.id, pricing);
    alert(`✓ Admin Bypass: ${service.title} - ${pricing.duration} activated without payment`);
    setShowModal(false);
    // In a real implementation, this would call the backend to activate the service
  };

  return (
    <div className="advertise-page">
      <div className="advertise-container">
        {/* Header */}
        <div className="advertise-header">
          <h1>Advertising Services</h1>
          <p>Boost your property visibility and reach more potential buyers</p>
        </div>

        {/* Tabs */}
        <div className="advertise-tabs">
          <button
            className={`advertise-tab ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            📢 Services
          </button>
          <button
            className={`advertise-tab ${activeTab === 'my-ads' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-ads')}
          >
            📊 My Ads
          </button>
          <button
            className={`advertise-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📈 Statistics
          </button>
        </div>

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="advertise-content">
            <div className="services-grid-ads">
              {advertisingServices.map((service) => (
                <div key={service.id} className="ad-service-card" style={{ '--service-color': service.color }}>
                  <div className="ad-service-header">
                    <div className="ad-service-icon">{service.icon}</div>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>

                  <div className="ad-service-features">
                    <h4>Features:</h4>
                    <ul>
                      {service.features.map((feature, idx) => (
                        <li key={idx}>✓ {feature}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="ad-service-pricing">
                    {service.pricing.map((price, idx) => (
                      <div key={idx} className={`price-option ${price.popular ? 'popular' : ''}`}>
                        {price.popular && <span className="popular-badge">Most Popular</span>}
                        <div className="price-duration">{price.duration}</div>
                        <div className="price-amount">{price.price} AZN</div>
                        <Button
                          size="small"
                          onClick={() => handlePurchase(service, price)}
                        >
                          Select
                        </Button>
                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => handleBypassPayment(service, price)}
                            style={{ marginTop: '0.5rem' }}
                          >
                            🔓 Bypass Payment (Admin)
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Ads Tab */}
        {activeTab === 'my-ads' && (
          <div className="advertise-content">
            <div className="my-ads-header">
              <h2>Active Campaigns</h2>
              <div className="ads-summary">
                <div className="summary-item">
                  <span className="summary-label">Active:</span>
                  <span className="summary-value">{adStats.activeAds}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Spent:</span>
                  <span className="summary-value">{adStats.totalSpent} AZN</span>
                </div>
              </div>
            </div>

            {myAds.length === 0 ? (
              <div className="empty-ads">
                <div className="empty-icon">📢</div>
                <h3>No Active Ads</h3>
                <p>You don't have any active advertising campaigns yet.</p>
                <Button onClick={() => setActiveTab('services')}>Browse Services</Button>
              </div>
            ) : (
              <div className="ads-table">
                <table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Ad Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Impressions</th>
                      <th>Clicks</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAds.map((ad) => (
                      <tr key={ad.id}>
                        <td>{ad.propertyTitle}</td>
                        <td>{ad.type}</td>
                        <td>{ad.startDate}</td>
                        <td>{ad.endDate}</td>
                        <td>{ad.impressions}</td>
                        <td>{ad.clicks}</td>
                        <td>
                          <span className={`ad-status ${ad.status}`}>{ad.status}</span>
                        </td>
                        <td>
                          <button className="action-btn-small">View</button>
                          <button className="action-btn-small delete">Stop</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="advertise-content">
            <div className="stats-dashboard">
              <div className="stat-card-large">
                <div className="stat-icon">👁️</div>
                <div className="stat-number">{adStats.totalImpressions.toLocaleString()}</div>
                <div className="stat-label">Total Impressions</div>
              </div>

              <div className="stat-card-large">
                <div className="stat-icon">🖱️</div>
                <div className="stat-number">{adStats.totalClicks.toLocaleString()}</div>
                <div className="stat-label">Total Clicks</div>
                <div className="stat-sublabel">
                  {adStats.totalImpressions > 0
                    ? ((adStats.totalClicks / adStats.totalImpressions) * 100).toFixed(2)
                    : 0}% CTR
                </div>
              </div>

              <div className="stat-card-large">
                <div className="stat-icon">📊</div>
                <div className="stat-number">{adStats.activeAds}</div>
                <div className="stat-label">Active Campaigns</div>
              </div>

              <div className="stat-card-large">
                <div className="stat-icon">💰</div>
                <div className="stat-number">{adStats.totalSpent.toFixed(2)} AZN</div>
                <div className="stat-label">Total Investment</div>
              </div>
            </div>

            <div className="chart-placeholder">
              <h3>Performance Over Time</h3>
              <div className="coming-soon-chart">
                📈 Charts coming soon
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Advertise;
