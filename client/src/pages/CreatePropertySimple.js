import React, { useState } from 'react';
import { Monitor, Home, Cloud, Briefcase, Image } from 'lucide-react';
import { createProperty } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './CreatePropertySimple.css';

const CreatePropertySimple = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [listingType, setListingType] = useState('for-sale');
  const [propertyType, setPropertyType] = useState('');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('Baku');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Helper function to check if current step is complete
  const isStepComplete = (step) => {
    switch (step) {
      case 1:
        return listingType && propertyType && title.trim();
      case 2:
        return city && address.trim() && price && parseFloat(price) > 0;
      case 3:
        return true; // Photos are optional
      default:
        return false;
    }
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);

    // Generate previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth?mode=signin');
        return;
      }

      // Prepare minimal property data
      const propertyData = {
        title: title.trim(),
        listingStatus: listingType,
        propertyType: propertyType,
        city: city,
        location: address.trim(),
        price: parseFloat(price),
        currency: 'AZN',
        purpose: propertyType === 'commercial-retail' || propertyType === 'office' ? 'commercial' : 'residential',
        status: 'active',
        isBasicListing: true, // Flag to indicate this is a simplified listing
        completeness: 30 // Percentage (30% = basic info only)
      };

      // If user is renting, set appropriate fields
      if (listingType === 'for-rent') {
        propertyData.monthlyRent = parseFloat(price);
        propertyData.subCategory = 'long-term'; // Default to long-term
      }

      const response = await createProperty(propertyData, token);

      // TODO: If images exist, upload them separately
      // For now, we're skipping image upload to keep it simple
      // In Phase 2, add image upload to Cloudinary here

      // Success - redirect to share listing screen first
      navigate(`/properties/${response.data._id}/share`, {
        state: { 
          isNewListing: true,
          propertyId: response.data._id
        }
      });

    } catch (err) {
      console.error('Error creating property:', err);
      setError(err.response?.data?.message || 'Failed to create listing. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Navigation handlers
  const goToNextStep = () => {
    if (isStepComplete(currentStep) && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipPhotos = () => {
    handleSubmit();
  };

  return (
    <div className="create-property-simple">
      <div className="simple-form-container">
        
        {/* Header with progress */}
        <div className="simple-header">
          <h1>Post Your Property in 1 Minute</h1>
          <div className="progress-indicator">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
            <p className="progress-text">Step {currentStep} of 3</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="form-step step-1">
            <h2>What are you listing?</h2>

            <div className="form-group">
              <label>I want to:</label>
              <div className="button-group">
                <button
                  type="button"
                  className={`option-button ${listingType === 'for-sale' ? 'active' : ''}`}
                  onClick={() => setListingType('for-sale')}
                >
                  Sell
                </button>
                <button
                  type="button"
                  className={`option-button ${listingType === 'for-rent' ? 'active' : ''}`}
                  onClick={() => setListingType('for-rent')}
                >
                  Rent
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Property type:</label>
              <div className="property-type-grid">
                <button
                  type="button"
                  className={`type-button ${propertyType === 'apartment' ? 'active' : ''}`}
                  onClick={() => setPropertyType('apartment')}
                >
                  <span className="type-icon" aria-hidden="true">
                    <Monitor size={20} strokeWidth={1.75} />
                  </span>
                  <span className="type-label">Apartment</span>
                </button>
                <button
                  type="button"
                  className={`type-button ${propertyType === 'house' ? 'active' : ''}`}
                  onClick={() => setPropertyType('house')}
                >
                  <span className="type-icon" aria-hidden="true">
                    <Home size={20} strokeWidth={1.75} />
                  </span>
                  <span className="type-label">House</span>
                </button>
                <button
                  type="button"
                  className={`type-button ${propertyType === 'land' ? 'active' : ''}`}
                  onClick={() => setPropertyType('land')}
                >
                  <span className="type-icon" aria-hidden="true">
                    <Cloud size={20} strokeWidth={1.75} />
                  </span>
                  <span className="type-label">Land</span>
                </button>
                <button
                  type="button"
                  className={`type-button ${propertyType === 'office' ? 'active' : ''}`}
                  onClick={() => setPropertyType('office')}
                >
                  <span className="type-icon" aria-hidden="true">
                    <Briefcase size={20} strokeWidth={1.75} />
                  </span>
                  <span className="type-label">Commercial</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                className="text-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 2-bedroom apartment in Nasimi"
                maxLength={80}
              />
              <p className="helper-text">
                Tip: Include key details like bedrooms, area, and location.
              </p>
            </div>

            <button
              type="button"
              className="next-button"
              onClick={goToNextStep}
              disabled={!isStepComplete(1)}
            >
              Next: Location & Price →
            </button>
          </div>
        )}

        {/* Step 2: Location & Price */}
        {currentStep === 2 && (
          <div className="form-step step-2">
            <h2>Where & How Much?</h2>

            <div className="form-group">
              <label htmlFor="city">City *</label>
              <select
                id="city"
                className="select-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="Baku">Baku</option>
                <option value="Sumqayit">Sumqayit</option>
                <option value="Ganja">Ganja</option>
                <option value="Lankaran">Lankaran</option>
                <option value="Mingachevir">Mingachevir</option>
                <option value="Shirvan">Shirvan</option>
                <option value="Nakhchivan">Nakhchivan</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="address">Address *</label>
              <input
                type="text"
                id="address"
                className="text-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Yasamal, near Koroğlu metro"
              />
              <p className="helper-text">
                No need to be exact — just the general area is fine.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="price">
                {listingType === 'for-sale' ? 'Price *' : 'Monthly Rent *'}
              </label>
              <div className="price-input-wrapper">
                <input
                  type="number"
                  id="price"
                  className="text-input price-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="100"
                />
                <span className="currency-label">AZN</span>
              </div>
              <p className="helper-text">
                Enter the amount in Azerbaijani Manat (AZN).
              </p>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="back-button"
                onClick={goToPreviousStep}
              >
                ← Back
              </button>
              <button
                type="button"
                className="next-button"
                onClick={goToNextStep}
                disabled={!isStepComplete(2)}
              >
                Next: Add Photos →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Photos (Optional) */}
        {currentStep === 3 && (
          <div className="form-step step-3">
            <h2>Add Photos (Optional)</h2>
            <p className="step-description">
              Adding photos helps buyers understand your listing.
            </p>

            <div className="form-group">
              <label htmlFor="images" className="upload-label">
                <div className="upload-zone">
                  <span className="upload-icon" aria-hidden="true">
                    <Image size={28} strokeWidth={1.5} />
                  </span>
                  <span className="upload-text">Tap to Add Photos</span>
                  <span className="upload-subtext">You can add up to 10 images</span>
                </div>
              </label>
              <input
                type="file"
                id="images"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Image previews */}
            {imagePreviews.length > 0 && (
              <div className="image-previews">
                <p className="preview-count">{imagePreviews.length} photo(s) selected</p>
                <div className="preview-grid">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="preview-item">
                      <img src={preview} alt={`Preview ${index + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="skip-note">
              Don't have photos now? No problem! You can add them later.
            </p>

            <div className="button-row">
              <button
                type="button"
                className="back-button"
                onClick={goToPreviousStep}
              >
                ← Back
              </button>
              <button
                type="button"
                className="skip-button"
                onClick={skipPhotos}
                disabled={isSubmitting}
              >
                Skip & Post Now
                              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleSubmit}
                disabled={isSubmitting || imagePreviews.length === 0}
              >
                {isSubmitting ? 'Posting...' : 'Post with Photos'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CreatePropertySimple;
