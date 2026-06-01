import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Image } from 'lucide-react';
import './ServicePages.css';

const DigitalStaging = () => {
  const navigate = useNavigate();

  return (
    <div className="service-page">
      <div className="service-hero">
        <div className="service-hero-content">
          <h1>Digital Staging Services</h1>
          <p>Virtually furnish empty properties to help buyers visualize the space</p>
        </div>
      </div>

      <div className="service-container">
        <div className="coming-soon-box">
          <div className="coming-soon-icon">
            <Image size={40} strokeWidth={1.5} aria-hidden="true" />
          </div>
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
