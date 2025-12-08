import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ServicePages.css';

const DigitalStaging = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAdminBypass, setShowAdminBypass] = useState(false);

  React.useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      setShowAdminBypass(true);
    }
  }, [user]);

  const handleAdminBypass = () => {
    alert('Admin bypass - Digital staging service activated');
  };

  return (
    <div className="service-page">
      <div className="service-hero">
        <div className="service-hero-content">
          <h1>✨ Digital Staging Services</h1>
          <p>Virtually furnish empty properties to help buyers visualize the space</p>
        </div>
      </div>

      <div className="service-container">
        <div className="coming-soon-box">
          <div className="coming-soon-icon">🏗️</div>
          <h2>Coming Soon</h2>
          <p>Professional digital staging service to transform empty rooms into beautiful living spaces</p>
          
          <div className="service-preview">
            <div className="preview-images">
              <div className="preview-item">
                <div className="preview-label">Before</div>
                <div className="preview-placeholder">Empty Room</div>
              </div>
              <div className="preview-arrow">→</div>
              <div className="preview-item">
                <div className="preview-label">After</div>
                <div className="preview-placeholder">Staged Room</div>
              </div>
            </div>
          </div>

          <ul className="features-list">
            <li>Realistic furniture and decor placement</li>
            <li>Multiple style options (modern, traditional, minimalist)</li>
            <li>Fast 48-hour turnaround</li>
            <li>High-resolution output</li>
            <li>Unlimited revisions</li>
            <li>Pricing: AZN 50 per room</li>
          </ul>

          {showAdminBypass && (
            <div className="admin-section">
              <div className="admin-badge">Admin Tools</div>
              <button onClick={handleAdminBypass} className="btn-admin-bypass">
                🔓 Bypass Payment (Testing)
              </button>
            </div>
          )}

          <div className="coming-soon-timeline">
            <p><strong>Expected Launch:</strong> Q1 2025</p>
          </div>

          <button onClick={() => navigate(-1)} className="btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default DigitalStaging;
