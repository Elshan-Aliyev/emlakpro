import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserById, getRealtorReviews, getProperties, sendMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getImageUrl, getAvatarUrl, getPropertyImageUrl } from '../utils/imageUtils';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Card from '../components/Card';
import './RealtorProfile.css';

const RealtorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [realtor, setRealtor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [properties, setProperties] = useState([]);
  const [activeTab, setActiveTab] = useState('about'); // about, properties, reviews
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageText, setMessageText] = useState('Hi, I\'m interested in your services and would like to discuss my real estate needs. Could you please contact me at your earliest convenience?');

  const getProfilePicture = (profilePicture) => {
    if (!profilePicture) return '/assets/default-avatar.png';
    return profilePicture;
  };

  useEffect(() => {
    fetchRealtorData();
  }, [id]);

  const fetchRealtorData = async () => {
    try {
      setLoading(true);
      
      // Fetch realtor info
      const realtorRes = await getUserById(id);
      setRealtor(realtorRes.data);

      // Fetch reviews
      const reviewsRes = await getRealtorReviews(id);
      setReviews(reviewsRes.data.reviews || []);
      setStats(reviewsRes.data.stats || stats);

      // Fetch properties listed by this realtor
      const propertiesRes = await getProperties({ ownerId: id });
      setProperties(propertiesRes.data.properties || []);
      
    } catch (err) {
      console.error('Error fetching realtor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'star filled' : 'star'}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleSendMessage = async () => {
    if (!user) {
      showError('Please login to send a message');
      navigate('/login');
      return;
    }

    if (!messageText.trim()) {
      showError('Please enter a message');
      return;
    }

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('token');
      await sendMessage({
        recipientId: id,
        subject: 'Direct Message from Profile',
        content: messageText,
        // No propertyId for direct messages from profile
      }, token);

      success('Message sent successfully!');
      // Redirect to messages page
      setTimeout(() => {
        navigate('/messages');
      }, 1000);
    } catch (err) {
      console.error('Error sending message:', err);
      showError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading realtor profile...</div>;
  }

  if (!realtor) {
    return <div className="error-container">Realtor not found</div>;
  }

  const soldProperties = (properties || []).filter(p => p && p.soldInfo?.isSold);
  const activeProperties = (properties || []).filter(p => p && !p.soldInfo?.isSold);

  return (
    <div className="realtor-profile-page">
      {/* Header Section */}
      <div className="profile-header">
        <div className="profile-banner">
          <div className="container">
            <div className="profile-info-wrapper">
              <div className="profile-avatar-section">
                <img 
                  src={getAvatarUrl(realtor.profileImage || realtor.profilePicture)} 
                  alt={realtor.name}
                  className="profile-avatar"
                />
                <div className="profile-badges">
                  {realtor.isVerified && <Badge variant="success">✓ Verified</Badge>}
                  {realtor.accountType === 'corporate' && <Badge variant="premium">Corporate</Badge>}
                </div>
              </div>

              <div className="profile-main-info">
                <h1 className="profile-name">{realtor.name}</h1>
                {realtor.company && <p className="profile-company">{realtor.company}</p>}
                
                <div className="profile-rating-row">
                  {renderStars(Math.round(stats.averageRating))}
                  <span className="rating-number">{stats.averageRating.toFixed(1)}</span>
                  <span className="review-count">({stats.totalReviews} reviews)</span>
                </div>

                <div className="profile-quick-stats">
                  <div className="quick-stat">
                    <span className="stat-value">{realtor.realtorStats?.totalSoldProperties || 0}</span>
                    <span className="stat-label">Properties Sold</span>
                  </div>
                  <div className="quick-stat">
                    <span className="stat-value">{realtor.realtorStats?.yearsOfExperience || 0}</span>
                    <span className="stat-label">Years Experience</span>
                  </div>
                  <div className="quick-stat">
                    <span className="stat-value">{activeProperties.length}</span>
                    <span className="stat-label">Active Listings</span>
                  </div>
                </div>

                <div className="profile-actions">
                  <Button 
                    variant="primary" 
                    onClick={handleSendMessage}
                    loading={sendingMessage}
                    disabled={sendingMessage}
                  >
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <div className="container">
          <div className="tabs-nav">
            <button 
              className={activeTab === 'about' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
            <button 
              className={activeTab === 'properties' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('properties')}
            >
              Properties ({activeProperties.length})
            </button>
            <button 
              className={activeTab === 'reviews' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({stats.totalReviews})
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="profile-content">
        <div className="container">
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="about-section">
              <div className="about-grid">
                <div className="about-main">
                  <Card>
                    <h2>About {realtor.name}</h2>
                    <p className="bio">{realtor.bio || 'No bio available.'}</p>

                    {realtor.realtorStats?.specializations?.length > 0 && (
                      <div className="info-block">
                        <h3>Specializations</h3>
                        <div className="tags">
                          {realtor.realtorStats.specializations.map((spec, idx) => (
                            <span key={idx} className="tag">{spec}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {realtor.realtorStats?.languages?.length > 0 && (
                      <div className="info-block">
                        <h3>Languages</h3>
                        <div className="tags">
                          {realtor.realtorStats.languages.map((lang, idx) => (
                            <span key={idx} className="tag">{lang}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {realtor.realtorStats?.servicesOffered?.length > 0 && (
                      <div className="info-block">
                        <h3>Services Offered</h3>
                        <ul className="services-list">
                          {realtor.realtorStats.servicesOffered.map((service, idx) => (
                            <li key={idx}>✓ {service}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                </div>

                <div className="about-sidebar">
                  <Card>
                    <h3>Send a Message</h3>
                    <div className="message-box">
                      <textarea
                        className="message-textarea"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Write your message here..."
                        rows={6}
                      />
                      <Button 
                        variant="primary" 
                        onClick={handleSendMessage}
                        loading={sendingMessage}
                        disabled={sendingMessage}
                        style={{ width: '100%', marginTop: 'var(--space-3)' }}
                      >
                        {sendingMessage ? 'Sending...' : 'Send Message'}
                      </Button>
                      <p style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--gray-500)', 
                        marginTop: 'var(--space-2)',
                        textAlign: 'center'
                      }}>
                        You'll be redirected to messages after sending
                      </p>
                    </div>
                  </Card>

                  <Card style={{ marginTop: 'var(--space-4)' }}>
                    <h3>Professional Details</h3>
                    <div className="contact-info">
                      {realtor.company && (
                        <div className="contact-item">
                          <span className="contact-label">Company:</span>
                          <span className="contact-value">{realtor.company}</span>
                        </div>
                      )}
                      {realtor.location && (
                        <div className="contact-item">
                          <span className="contact-label">Location:</span>
                          <span className="contact-value">{realtor.location}</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {realtor.realtorStats && (
                    <Card>
                      <h3>Performance Stats</h3>
                      <div className="stats-list">
                        <div className="stat-item">
                          <span className="stat-label">Total Sales:</span>
                          <span className="stat-value">{realtor.realtorStats.totalSales || 0}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Avg. Days on Market:</span>
                          <span className="stat-value">{realtor.realtorStats.averageDaysOnMarket || 'N/A'}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Total Revenue:</span>
                          <span className="stat-value">
                            {realtor.realtorStats.totalRevenue 
                              ? `₼${realtor.realtorStats.totalRevenue.toLocaleString()}`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Properties Tab */}
          {activeTab === 'properties' && (
            <div className="properties-section">
              {activeProperties.length === 0 ? (
                <div className="empty-state">
                  <p>No active properties listed</p>
                </div>
              ) : (
                <div className="properties-grid">
                  {activeProperties.map((property) => (
                    <Card key={property._id} onClick={() => navigate(`/properties/${property._id}`)}>
                      <img 
                        src={getPropertyImageUrl(property)} 
                        alt={property?.title || 'Property'}
                        className="property-image"
                      />
                      <div className="property-info">
                        <h3>{property?.title || 'Untitled Property'}</h3>
                        <p className="property-location">{property?.address || 'Location not specified'}</p>
                        <p className="property-price">₼{property?.price?.toLocaleString() || 'N/A'}</p>
                        <div className="property-details">
                          <span>{property?.bedrooms || 0} bed</span>
                          <span>{property?.bathrooms || 0} bath</span>
                          <span>{property?.area || 0} m²</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {soldProperties.length > 0 && (
                <>
                  <h2 style={{ marginTop: '3rem' }}>Sold Properties</h2>
                  <div className="properties-grid">
                    {soldProperties.map((property) => (
                      <Card key={property._id} className="sold-property">
                        <div className="sold-badge">SOLD</div>
                        <img 
                          src={getPropertyImageUrl(property)} 
                          alt={property.title}
                          className="property-image"
                        />
                        <div className="property-info">
                          <h3>{property?.title || 'Untitled Property'}</h3>
                          <p className="property-location">{property?.address || 'Location not specified'}</p>
                          <p className="property-price">₼{property?.soldInfo?.soldPrice?.toLocaleString() || 'N/A'}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="reviews-section">
              <div className="reviews-grid">
                <div className="reviews-sidebar">
                  <Card>
                    <h3>Rating Breakdown</h3>
                    <div className="overall-rating">
                      <span className="big-rating">{stats.averageRating.toFixed(1)}</span>
                      {renderStars(Math.round(stats.averageRating))}
                      <p>{stats.totalReviews} reviews</p>
                    </div>
                    
                    <div className="rating-bars">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="rating-bar-row">
                          <span className="bar-label">{star} ★</span>
                          <div className="bar-container">
                            <div 
                              className="bar-fill" 
                              style={{ 
                                width: `${stats.totalReviews > 0 
                                  ? (stats.ratingBreakdown[star] / stats.totalReviews) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                          <span className="bar-count">{stats.ratingBreakdown[star] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="reviews-main">
                  {reviews.length === 0 ? (
                    <div className="empty-state">
                      <p>No reviews yet</p>
                    </div>
                  ) : (
                    <div className="reviews-list">
                      {reviews.map((review) => (
                        <Card key={review._id} className="review-card">
                          <div className="review-header">
                            <div className="reviewer-info">
                              <img 
                                src={review.reviewerId?.profilePicture || '/assets/default-avatar.png'}
                                alt={review.reviewerId?.name}
                                className="reviewer-avatar"
                              />
                              <div>
                                <h4>{review.reviewerId?.name || 'Anonymous'}</h4>
                                <p className="review-date">{formatDate(review.createdAt)}</p>
                              </div>
                            </div>
                            {renderStars(review.rating)}
                          </div>
                          
                          {review.title && <h3 className="review-title">{review.title}</h3>}
                          <p className="review-comment">{review.comment}</p>
                          
                          {review.detailedRatings && (
                            <div className="detailed-ratings">
                              {review.detailedRatings.professionalism && (
                                <div className="detailed-rating">
                                  <span>Professionalism:</span>
                                  {renderStars(review.detailedRatings.professionalism)}
                                </div>
                              )}
                              {review.detailedRatings.communication && (
                                <div className="detailed-rating">
                                  <span>Communication:</span>
                                  {renderStars(review.detailedRatings.communication)}
                                </div>
                              )}
                            </div>
                          )}

                          {review.isVerified && (
                            <Badge variant="success" style={{ marginTop: '0.5rem' }}>
                              ✓ Verified Transaction
                            </Badge>
                          )}

                          {review.realtorResponse && (
                            <div className="realtor-response">
                              <h4>Response from {realtor.name}</h4>
                              <p>{review.realtorResponse.comment}</p>
                              <p className="response-date">{formatDate(review.realtorResponse.responseDate)}</p>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtorProfile;
