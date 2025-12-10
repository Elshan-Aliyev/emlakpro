import React, { useState, useEffect } from 'react';
import { toggleSaveProperty } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './FavoriteButton.css';

const FavoriteButton = ({ propertyId, initialIsFavorite = false, onToggle, isModal = false }) => {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsFavorite(initialIsFavorite);
  }, [initialIsFavorite]);

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) {
      if (isModal) {
        // In modal mode, close modal first, then show login prompt
        alert('Please login to save favorites. The property details will remain open.');
        // Don't navigate - let user close modal manually if they want
      } else {
        alert('Please login to save favorites');
        navigate('/login');
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await toggleSaveProperty(propertyId, token);
      const newFavoriteState = response.data.saved;
      setIsFavorite(newFavoriteState);
      
      if (onToggle) {
        onToggle(propertyId, newFavoriteState);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert(error.response?.data?.message || 'Failed to update favorite');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`favorite-button ${isFavorite ? 'is-favorite' : ''} ${isLoading ? 'is-loading' : ''}`}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );
};

export default FavoriteButton;
