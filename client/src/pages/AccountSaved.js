import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getProperties } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import './Account.css';

const AccountSaved = () => {
  const { user, updateUser } = useAuth();
  const { success, error: showError } = useToast();
  const [savedProperties, setSavedProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedProperties();
  }, [user]);

  const fetchSavedProperties = async () => {
    try {
      // Get all properties
      const res = await getProperties();
      const allProperties = res.data || [];
      
      // Filter only saved properties
      const savedIds = user?.savedProperties || [];
      const saved = allProperties.filter(p => savedIds.includes(p._id));
      
      setSavedProperties(saved);
    } catch (err) {
      console.error('Error fetching saved properties:', err);
      showError('Failed to load saved properties');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (propertyId) => {
    try {
      // Update local state immediately for better UX
      setSavedProperties(prev => prev.filter(p => p._id !== propertyId));
      
      // Update user's saved properties
      const updatedSaved = (user?.savedProperties || []).filter(id => id !== propertyId);
      await updateUser({ savedProperties: updatedSaved });
      
      success('Property removed from saved');
    } catch (err) {
      console.error('Error unsaving property:', err);
      showError('Failed to remove property');
      // Revert on error
      fetchSavedProperties();
    }
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-container">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading saved properties...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-container">
        {/* Header */}
        <div className="account-header">
          <h1>Saved Properties</h1>
          <p>Your favorite listings in one place</p>
        </div>

        {/* Saved Properties Grid */}
        {savedProperties.length === 0 ? (
          <div className="recent-section">
            <div className="empty-state">
              <div className="empty-state-icon">❤️</div>
              <h3>No Saved Properties</h3>
              <p>Start saving properties to view them here later</p>
              <Link to="/search">
                <Button>Browse Properties</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 'var(--space-6)',
              marginBottom: 'var(--space-8)'
            }}>
              {savedProperties.map((property) => (
                <Card
                  key={property._id}
                  property={property}
                  isSaved={true}
                  onSaveToggle={() => handleUnsave(property._id)}
                />
              ))}
            </div>

            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-6)',
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--gray-200)'
            }}>
              <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-4)' }}>
                Showing {savedProperties.length} saved {savedProperties.length === 1 ? 'property' : 'properties'}
              </p>
              <Link to="/search">
                <Button variant="outline">Browse More Properties</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountSaved;
