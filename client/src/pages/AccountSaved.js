import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getSavedProperties, unsavePropertyFromFavourites } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import './Account.css';

const AccountSaved = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [savedProperties, setSavedProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedProperties();
  }, [user]);

  const fetchSavedProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      const res = await getSavedProperties(token);
      setSavedProperties(res.data || []);
    } catch (err) {
      showError('Unable to retrieve your saved properties — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (propertyId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showError('Please sign in to manage saved properties'); return; }
      await unsavePropertyFromFavourites(propertyId, token);
      setSavedProperties(prev => prev.filter(p => p._id !== propertyId));
      success('Removed from saved');
    } catch (err) {
      showError('Failed to remove property');
      fetchSavedProperties();
    }
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-container">
          <div className="account-header">
            <h1>Saved</h1>
            <p>Your shortlisted properties</p>
          </div>
          <div className="saved-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="saved-skeleton-card">
                <div className="saved-skeleton-img" />
                <div className="saved-skeleton-body">
                  {[55, 80, 45].map((w, j) => (
                    <div key={j} className="saved-skeleton-line" style={{ width: `${w}%`, height: j === 0 ? 18 : 13 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>Saved</h1>
          <p>Properties you're watching — all in one place</p>
        </div>

        {savedProperties.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">
              <Heart size={22} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h3>No saved properties yet</h3>
            <p>Save listings while browsing to revisit and compare them here.</p>
            <Link to="/search">
              <Button>Browse listings</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="saved-count-bar">
              <span>{savedProperties.length} saved {savedProperties.length === 1 ? 'property' : 'properties'}</span>
              <Link to="/search" className="view-all-link">Browse more</Link>
            </div>

            <div className="saved-grid">
              {savedProperties.map((property) => (
                <Card
                  key={property._id}
                  property={property}
                  isSaved={true}
                  onSaveToggle={() => handleUnsave(property._id)}
                  onClick={() => navigate(`/properties/${property._id}`)}
                />
              ))}
            </div>

            <div className="saved-browse-bar">
              <p>Looking for something different?</p>
              <Link to="/search">
                <Button variant="outline">Browse all listings</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountSaved;
