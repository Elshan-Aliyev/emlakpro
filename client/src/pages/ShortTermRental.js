import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ServicePages.css';

const ShortTermRental = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showAdminBypass, setShowAdminBypass] = useState(false);

  React.useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      setShowAdminBypass(true);
    }
  }, [user]);

  const packages = [
    {
      id: 'standard',
      name: 'Standard',
      price: 49,
      period: 'month',
      description: 'Basic listing with availability calendar',
      features: [
        'Property listing on our platform',
        'Calendar integration (sync with your calendar)',
        'Show availability to guests',
        'Basic property description & photos',
        'Email notifications for inquiries',
        'Basic analytics dashboard'
      ],
      color: '#3b82f6'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 99,
      period: 'month',
      description: 'Full calendar & payment processing',
      popular: true,
      features: [
        'Everything in Standard, plus:',
        'Advanced calendar with reservations',
        'Integrated payment processing',
        'Automated booking confirmations',
        'Guest messaging system',
        'Review management',
        'Pricing & availability rules',
        'Advanced analytics & reports',
        'Multi-property management'
      ],
      color: '#8b5cf6'
    },
    {
      id: 'diamond',
      name: 'Diamond',
      price: 199,
      period: 'month',
      description: 'Complete STR management service',
      features: [
        'Everything in Premium, plus:',
        'Multi-platform listing (Airbnb, Booking.com, etc.)',
        'Full guest communication management',
        'Automated messaging templates',
        'Check-in/check-out coordination',
        'Cleaning schedule management',
        'Maintenance request tracking',
        'Guest screening & verification',
        'Dynamic pricing optimization',
        'Dedicated account manager',
        '24/7 guest support'
      ],
      color: '#14b8a6'
    }
  ];

  const handleSelectPackage = (pkgId) => {
    setSelectedPackage(pkgId);
    if (!user) {
      navigate('/login', { state: { from: '/services/short-term-rental', package: pkgId } });
      return;
    }
    // Proceed to payment or setup
    alert(`Selected ${packages.find(p => p.id === pkgId).name} package`);
  };

  const handleAdminBypass = () => {
    if (!selectedPackage) {
      alert('Please select a package first');
      return;
    }
    alert(`Admin bypass - ${packages.find(p => p.id === selectedPackage).name} package activated without payment`);
    // Activate the service for testing
  };

  return (
    <div className="service-page">
      <div className="service-hero str-hero">
        <div className="service-hero-content">
          <h1>🏖️ Short-Term Rental Management</h1>
          <p>Professional vacation rental services for property owners</p>
        </div>
      </div>

      <div className="service-container">
        <div className="str-intro">
          <h2>Choose Your Management Package</h2>
          <p>Select the level of service that fits your needs</p>
        </div>

        <div className="pricing-cards">
          {packages.map(pkg => (
            <div 
              key={pkg.id} 
              className={`pricing-card ${selectedPackage === pkg.id ? 'selected' : ''} ${pkg.popular ? 'popular' : ''}`}
              style={{ '--card-color': pkg.color }}
            >
              {pkg.popular && <div className="popular-badge">Most Popular</div>}
              
              <div className="pricing-header">
                <h3>{pkg.name}</h3>
                <p className="pricing-description">{pkg.description}</p>
              </div>

              <div className="pricing-price">
                <span className="currency">AZN</span>
                <span className="amount">{pkg.price}</span>
                <span className="period">/{pkg.period}</span>
              </div>

              <ul className="pricing-features">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className={feature.startsWith('Everything') ? 'feature-group' : ''}>
                    {!feature.startsWith('Everything') && '✓'} {feature}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleSelectPackage(pkg.id)}
                className={`btn-select ${selectedPackage === pkg.id ? 'selected' : ''}`}
              >
                {selectedPackage === pkg.id ? 'Selected ✓' : 'Select Package'}
              </button>
            </div>
          ))}
        </div>

        {showAdminBypass && selectedPackage && (
          <div className="admin-section">
            <div className="admin-badge">Admin Tools</div>
            <button onClick={handleAdminBypass} className="btn-admin-bypass">
              🔓 Bypass Payment & Activate (Testing)
            </button>
            <p className="admin-note">This allows testing STR features without payment processing</p>
          </div>
        )}

        <div className="str-comparison">
          <h2>Package Comparison</h2>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Standard</th>
                  <th>Premium</th>
                  <th>Diamond</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Property Listing</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Calendar Sync</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Payment Processing</td>
                  <td>—</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Guest Messaging</td>
                  <td>Basic</td>
                  <td>✓</td>
                  <td>Full</td>
                </tr>
                <tr>
                  <td>Multi-Platform Sync</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Cleaning Management</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>24/7 Support</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="str-benefits">
          <h2>Why Choose Our STR Management?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <span className="benefit-icon">📊</span>
              <h4>Maximize Revenue</h4>
              <p>Dynamic pricing and occupancy optimization</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">⏱️</span>
              <h4>Save Time</h4>
              <p>Automated processes handle everything</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">🛡️</span>
              <h4>Protected</h4>
              <p>Guest screening and damage protection</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">🌍</span>
              <h4>Global Reach</h4>
              <p>List on multiple platforms simultaneously</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortTermRental;
