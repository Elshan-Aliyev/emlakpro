import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getProperty } from '../services/api';
import CompletenessBar from '../components/CompletenessBar';
import EnhancementCard from '../components/EnhancementCard';
import './EnhanceProperty.css';

const EnhanceProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completeness, setCompleteness] = useState(30);

  const isNewListing = location.state?.newListing || false;

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await getProperty(id);
      setProperty(response.data);
      
      // Calculate completeness (client-side for now)
      const calc = calculateCompleteness(response.data);
      setCompleteness(calc.total);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching property:', err);
      setLoading(false);
    }
  };

  // Client-side completeness calculation
  const calculateCompleteness = (prop) => {
    let total = 30; // Base

    // Photos (+40% max)
    if (prop.images && prop.images.length > 0) {
      if (prop.images.length >= 8) total += 40;
      else if (prop.images.length >= 5) total += 30;
      else if (prop.images.length >= 3) total += 20;
      else total += 10;
    }

    // Rooms (+20% max)
    if (prop.bedrooms) total += 10;
    if (prop.bathrooms) total += 10;

    // Description (+20% max)
    if (prop.description) {
      const len = prop.description.length;
      if (len >= 500) total += 20;
      else if (len >= 301) total += 15;
      else if (len >= 151) total += 10;
      else if (len >= 50) total += 5;
    }

    // Features (+15% max)
    let featureCount = 0;
    if (prop.furnishing) featureCount++;
    if (prop.parking) featureCount++;
    if (prop.elevator) featureCount++;
    if (prop.heating) featureCount++;
    if (prop.security) featureCount++;
    if (featureCount >= 5) total += 15;
    else if (featureCount >= 3) total += 10;
    else if (featureCount >= 1) total += 5;

    return { total: Math.min(total, 100) };
  };

  const enhancements = [
    {
      id: 'photos',
      icon: '📸',
      title: 'Add Photos',
      impact: 'Listings with photos get 10x more views',
      boost: '+40%',
      timeEstimate: '2 min',
      completed: property?.images && property.images.length > 0,
      route: `/properties/${id}/enhance/photos`,
      priority: 1
    },
    {
      id: 'rooms',
      icon: '🛏️',
      title: 'Add Bedrooms & Bathrooms',
      impact: 'Listings with room info get 5x more inquiries',
      boost: '+20%',
      timeEstimate: '1 min',
      completed: property?.bedrooms && property?.bathrooms,
      route: `/properties/${id}/enhance/rooms`,
      priority: 2
    },
    {
      id: 'description',
      icon: '📝',
      title: 'Write a Description',
      impact: 'Good descriptions increase contact rate by 3x',
      boost: '+20%',
      timeEstimate: '2 min',
      completed: property?.description && property.description.length > 50,
      route: `/properties/${id}/enhance/description`,
      priority: 3
    },
    {
      id: 'features',
      icon: '✨',
      title: 'Add Features & Amenities',
      impact: 'Features help buyers find exactly what they need',
      boost: '+15%',
      timeEstimate: '2 min',
      completed: property?.furnishing || property?.parking || property?.elevator,
      route: `/properties/${id}/enhance/features`,
      priority: 4
    }
  ];

  const incompleteEnhancements = enhancements.filter(e => !e.completed);
  const completedCount = enhancements.length - incompleteEnhancements.length;

  if (loading) {
    return (
      <div className="enhance-property-loading">
        <div className="loading-spinner"></div>
        <p>Loading your listing...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="enhance-property-error">
        <p>Property not found</p>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="enhance-property">
      <div className="enhance-container">
        
        {/* Success Header */}
        {isNewListing && (
          <div className="success-banner">
            <h1>🎉 Your Listing is LIVE!</h1>
            <p>Your property is now visible to thousands of potential buyers in Azerbaijan</p>
          </div>
        )}

        {!isNewListing && (
          <div className="enhance-header">
            <button className="back-link" onClick={() => navigate(`/properties/${id}`)}>
              ← Back to Listing
            </button>
            <h1>Boost Your Listing</h1>
          </div>
        )}

        {/* Property Preview Card */}
        <div className="property-preview-card">
          <div className="preview-image">
            {property.images && property.images.length > 0 ? (
              <img src={property.images[0]} alt={property.title} />
            ) : (
              <div className="preview-placeholder">
                <span className="placeholder-icon">🏠</span>
                <span className="placeholder-text">No photo yet</span>
              </div>
            )}
          </div>
          <div className="preview-content">
            <h3>{property.title}</h3>
            <p className="preview-price">
              💰 {property.price?.toLocaleString()} {property.currency || 'AZN'}
            </p>
            <p className="preview-location">
              📍 {property.city}, {property.location}
            </p>
            <button 
              className="view-listing-btn"
              onClick={() => navigate(`/properties/${id}`)}
            >
              View Full Listing →
            </button>
          </div>
        </div>

        {/* Completeness Progress */}
        <div className="completeness-section">
          <div className="completeness-header">
            <h2>📊 Listing Completeness: {completeness}%</h2>
            {completeness === 100 && (
              <span className="perfect-badge">✨ Perfect!</span>
            )}
          </div>
          <CompletenessBar percentage={completeness} />
          {completeness < 100 && (
            <p className="completeness-message">
              {completeness < 50 && "Add more details to get more views!"}
              {completeness >= 50 && completeness < 75 && "You're doing great! Keep going!"}
              {completeness >= 75 && completeness < 100 && "Almost perfect! Just a bit more!"}
            </p>
          )}
          {completeness === 100 && (
            <p className="completeness-message success">
              🎉 Your listing is complete! You're 5x more likely to get inquiries.
            </p>
          )}
        </div>

        {/* Enhancement Suggestions */}
        {incompleteEnhancements.length > 0 && (
          <div className="enhancements-section">
            <h2>Boost Your Listing:</h2>
            <p className="enhancements-subtitle">
              Complete these quick improvements to get more views and inquiries
            </p>
            
            <div className="enhancements-grid">
              {incompleteEnhancements.map((enhancement, index) => (
                <EnhancementCard
                  key={enhancement.id}
                  {...enhancement}
                  index={index}
                  onClick={() => navigate(enhancement.route)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Enhancements */}
        {completedCount > 0 && (
          <div className="completed-section">
            <h3>✅ Completed ({completedCount}/{enhancements.length})</h3>
            <div className="completed-list">
              {enhancements
                .filter(e => e.completed)
                .map(e => (
                  <div key={e.id} className="completed-item">
                    <span className="completed-icon">{e.icon}</span>
                    <span className="completed-title">{e.title}</span>
                    <span className="completed-check">✓</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="enhance-actions">
          {incompleteEnhancements.length > 0 && (
            <button 
              className="later-btn"
              onClick={() => navigate(`/properties/${id}`)}
            >
              Do This Later
            </button>
          )}
          <button 
            className="view-btn"
            onClick={() => navigate(`/properties/${id}`)}
          >
            {completeness === 100 ? 'View Perfect Listing 🎉' : 'View My Listing'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EnhanceProperty;
