import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { toggleSaveProperty } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './FavoriteButton.css';

const FavoriteButton = ({ propertyId, initialIsFavorite = false, onToggle }) => {
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
      navigate('/login');
      return;
    }

    if (isLoading) return;

    const previous = isFavorite;
    setIsFavorite(!previous);
    setIsLoading(true);

    try {
      const response = await toggleSaveProperty(propertyId, token);
      const confirmed = response.data.saved;
      setIsFavorite(confirmed);
      if (onToggle) onToggle(propertyId, confirmed);
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setIsFavorite(previous);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`favorite-button ${isFavorite ? 'is-favorite' : ''} ${isLoading ? 'is-loading' : ''}`}
      onClick={handleToggleFavorite}
      aria-label={isFavorite ? 'Remove from saved' : 'Save property'}
      title={isFavorite ? 'Remove from saved' : 'Save property'}
    >
      <Heart size={17} strokeWidth={2} aria-hidden="true" />
    </button>
  );
};

export default FavoriteButton;
