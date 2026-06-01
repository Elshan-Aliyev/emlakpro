import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import './ServicePages.css';

const PrepareContract = () => {
  const navigate = useNavigate();

  return (
    <div className="service-page">
      <div className="service-hero">
        <div className="service-hero-content">
          <h1>Prepare Legal Contracts</h1>
          <p>Interactive contract preparation system — Coming Soon</p>
        </div>
      </div>

      <div className="service-container">
        <div className="coming-soon-box">
          <div className="coming-soon-icon">
            <FileText size={40} strokeWidth={1.5} aria-hidden="true" />
          </div>
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

          <button onClick={() => navigate(-1)} className="btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrepareContract;
