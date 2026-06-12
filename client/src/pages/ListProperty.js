import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, TrendingUp, Star } from 'lucide-react';
import './ServicePages.css';

const ListProperty = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="service-page">
      <div className="service-hero">
        <div className="service-hero-content">
          <h1><Home size={15} strokeWidth={2} aria-hidden="true" /> List My Property</h1>
          <p>Get professional help listing your property</p>
        </div>
      </div>

      <div className="service-container">
        <div className="service-options">
          <div className="option-card">
            <h3>Self-Service Listing</h3>
            <p>List your property yourself - it's free and easy!</p>
            <button onClick={() => navigate('/properties/create')} className="btn-primary">
              Create Listing
            </button>
          </div>

          <div className="option-card highlighted">
            <div className="recommended-badge">Recommended</div>
            <h3>Professional Listing Service</h3>
            <p>Let our team handle everything for you</p>
            <div className="service-includes">
              <h4>Includes:</h4>
              <ul>
                <li>✓ Professional photography</li>
                <li>✓ Property description writing</li>
                <li>✓ Market analysis and pricing</li>
                <li>✓ Listing optimization</li>
                <li>✓ Social media promotion</li>
              </ul>
            </div>
            <div className="service-price">
              <span className="price-label">Starting at</span>
              <span className="price-amount">AZN 299</span>
            </div>
            <button className="btn-primary">
              Request Service
            </button>
          </div>

          <div className="option-card">
            <h3>Hire a Realtor</h3>
            <p>Work with a verified real estate professional</p>
            <button onClick={() => navigate('/agents')} className="btn-secondary">
              Find Realtors
            </button>
          </div>
        </div>

        <div className="service-info">
          <h2>Why Choose Professional Listing?</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-icon"><TrendingUp size={15} strokeWidth={2} aria-hidden="true" /></span>
              <h4>Sell Faster</h4>
              <p>Professional listings sell 50% faster on average</p>
            </div>
            <div className="info-item">
              <span className="info-icon"></span>
              <h4>Better Price</h4>
              <p>Get the best market value for your property</p>
            </div>
            <div className="info-item">
              <span className="info-icon"><Star size={14} strokeWidth={2} aria-hidden="true" /></span>
              <h4>Quality Assured</h4>
              <p>Professional photos and compelling descriptions</p>
            </div>
            <div className="info-item">
              <span className="info-icon"></span>
              <h4>Targeted Marketing</h4>
              <p>Reach the right buyers through multiple channels</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListProperty;
