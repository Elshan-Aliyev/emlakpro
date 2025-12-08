import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ServicePages.css';

const PrepareContract = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAdminBypass, setShowAdminBypass] = useState(false);

  React.useEffect(() => {
    // Show admin bypass button for admins/superadmins
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      setShowAdminBypass(true);
    }
  }, [user]);

  const handleAdminBypass = () => {
    alert('Admin bypass activated - Proceeding to contract preparation');
    // Navigate to contract tool or set payment status to completed
    // This allows testing without actual payment
  };

  return (
    <div className="service-page">
      <div className="service-hero">
        <div className="service-hero-content">
          <h1>📝 Prepare Legal Contracts</h1>
          <p>Interactive contract preparation system - Coming Soon</p>
        </div>
      </div>

      <div className="service-container">
        <div className="coming-soon-box">
          <div className="coming-soon-icon">🚧</div>
          <h2>Under Development</h2>
          <p>We're building an interactive contract preparation system that will help you:</p>
          
          <ul className="features-list">
            <li>Generate custom real estate contracts</li>
            <li>Fill in property and party details easily</li>
            <li>Include standard clauses automatically</li>
            <li>Add custom terms and conditions</li>
            <li>Download in PDF format</li>
            <li>Send for e-signature</li>
          </ul>

          <div className="coming-soon-timeline">
            <p><strong>Expected Launch:</strong> Q2 2025</p>
          </div>

          {showAdminBypass && (
            <div className="admin-section">
              <div className="admin-badge">Admin Tools</div>
              <button onClick={handleAdminBypass} className="btn-admin-bypass">
                🔓 Bypass Payment (Testing)
              </button>
              <p className="admin-note">This button allows admins to test paid features without payment processing</p>
            </div>
          )}

          <button onClick={() => navigate(-1)} className="btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrepareContract;
