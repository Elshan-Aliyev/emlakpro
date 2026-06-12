import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { updateProperty } from '../services/api';
import { BedDouble, AlertTriangle, Lightbulb, Clock, Check } from 'lucide-react';
import './MiniEnhancement.css';

const AddRoomsEnhancement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bedrooms, setBedrooms] = useState(null);
  const [bathrooms, setBathrooms] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const bedroomOptions = [1, 2, 3, 4, 5, 6];
  const bathroomOptions = [1, 2, 3, 4];

  const handleSubmit = async () => {
    if (!bedrooms || !bathrooms) {
      setError('Please select both bedrooms and bathrooms');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth?mode=signin');
        return;
      }

      // Update property with room details
      await updateProperty(
        id,
        { bedrooms, bathrooms },
        token
      );

      // Redirect back to enhancement hub with success message
      navigate(`/properties/${id}/enhance`, {
        state: { 
          enhanced: true,
          message: 'Room details added successfully!'
        }
      });

    } catch (err) {
      console.error('Error updating rooms:', err);
      setError(err.response?.data?.message || 'Failed to update. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate(`/properties/${id}/enhance`);
  };

  return (
    <div className="mini-enhancement">
      <div className="mini-container">
        
        <button className="back-btn" onClick={() => navigate(`/properties/${id}/enhance`)}>
          ← Back
        </button>

        <div className="mini-header">
          <span className="mini-icon"><BedDouble size={15} strokeWidth={2} aria-hidden="true" /></span>
          <h1>Add Room Details</h1>
          <p className="mini-subtitle">
            Listings with room info get <strong>5x more inquiries</strong>
          </p>
        </div>

        {error && (
          <div className="mini-error">
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" /> {error}
          </div>
        )}

        <div className="mini-content">
          
          {/* Bedrooms */}
          <div className="mini-section">
            <label className="mini-label">How many bedrooms?</label>
            <div className="option-buttons">
              {bedroomOptions.map(num => (
                <button
                  key={num}
                  type="button"
                  className={`option-btn ${bedrooms === num ? 'active' : ''}`}
                  onClick={() => setBedrooms(num)}
                >
                  {num}{num === 6 ? '+' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Bathrooms */}
          <div className="mini-section">
            <label className="mini-label">How many bathrooms?</label>
            <div className="option-buttons">
              {bathroomOptions.map(num => (
                <button
                  key={num}
                  type="button"
                  className={`option-btn ${bathrooms === num ? 'active' : ''}`}
                  onClick={() => setBathrooms(num)}
                >
                  {num}{num === 4 ? '+' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Helper Text */}
          <div className="mini-tip">
            <span className="tip-icon"><Lightbulb size={14} strokeWidth={2} aria-hidden="true" /></span>
            <span className="tip-text">
              Room details help buyers filter search results and find properties that match their needs
            </span>
          </div>

        </div>

        {/* Actions */}
        <div className="mini-actions">
          <button 
            className="skip-btn"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip for Now
          </button>
          <button 
            className="save-btn"
            onClick={handleSubmit}
            disabled={isSubmitting || !bedrooms || !bathrooms}
          >
            {isSubmitting ? <><Clock size={14} strokeWidth={2} aria-hidden="true" /> Saving...</> : <><Check size={14} strokeWidth={2.5} aria-hidden="true" /> Save & Continue</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddRoomsEnhancement;
