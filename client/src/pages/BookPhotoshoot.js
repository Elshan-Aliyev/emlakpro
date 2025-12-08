import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ServicePages.css';

const BookPhotoshoot = () => {
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
      id: 'basic',
      name: 'Basic Package',
      price: 149,
      features: ['15-20 photos', 'Basic editing', '24-hour delivery', 'High-resolution images']
    },
    {
      id: 'standard',
      name: 'Standard Package',
      price: 299,
      popular: true,
      features: ['25-30 photos', 'Professional editing', 'Same-day delivery', 'Drone shots (if applicable)', 'Twilight photos (1-2)']
    },
    {
      id: 'premium',
      name: 'Premium Package',
      price: 499,
      features: ['40+ photos', 'Advanced editing', 'Immediate delivery', 'Drone footage + photos', 'Twilight photography', '3D virtual tour', 'Video walkthrough']
    }
  ];

  const handleAdminBypass = () => {
    alert('Admin bypass - Photoshoot booking confirmed without payment');
    // Proceed with booking logic
  };

  return (
    <div className="service-page">
      <div className="service-hero">
        <div className="service-hero-content">
          <h1>📸 Professional Property Photography</h1>
          <p>High-quality photos that sell properties faster</p>
        </div>
      </div>

      <div className="service-container">
        <div className="packages-grid">
          {packages.map(pkg => (
            <div 
              key={pkg.id} 
              className={`package-card ${selectedPackage === pkg.id ? 'selected' : ''} ${pkg.popular ? 'popular' : ''}`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {pkg.popular && <div className="popular-badge">Most Popular</div>}
              <h3>{pkg.name}</h3>
              <div className="package-price">
                <span className="currency">AZN</span>
                <span className="amount">{pkg.price}</span>
              </div>
              <ul className="package-features">
                {pkg.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
              <button className="btn-select-package">
                Select Package
              </button>
            </div>
          ))}
        </div>

        {showAdminBypass && (
          <div className="admin-section">
            <div className="admin-badge">Admin Tools</div>
            <button onClick={handleAdminBypass} className="btn-admin-bypass">
              🔓 Bypass Payment & Book (Testing)
            </button>
          </div>
        )}

        <div className="service-info">
          <h2>What's Included</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-icon">📷</span>
              <h4>Professional Equipment</h4>
              <p>High-end cameras and lighting for the best results</p>
            </div>
            <div className="info-item">
              <span className="info-icon">⏱️</span>
              <h4>Fast Turnaround</h4>
              <p>Edited photos delivered within 24 hours</p>
            </div>
            <div className="info-item">
              <span className="info-icon">✨</span>
              <h4>Expert Editing</h4>
              <p>Color correction, HDR, and enhancement</p>
            </div>
            <div className="info-item">
              <span className="info-icon">🚁</span>
              <h4>Drone Available</h4>
              <p>Aerial shots to showcase property location</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookPhotoshoot;
