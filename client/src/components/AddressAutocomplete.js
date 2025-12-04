import React, { useState, useEffect, useRef } from 'react';
import { searchAddresses } from '../services/geocoding';
import './AddressAutocomplete.css';

const AddressAutocomplete = ({ value, onChange, onSelectAddress, placeholder = "Enter address..." }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = async (e) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce search by 500ms
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchAddresses(inputValue);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Address search error:', error);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleSelectSuggestion = (suggestion) => {
    onChange(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Parse city and postal code from display_name
    const parts = suggestion.display_name.split(',').map(p => p.trim());
    let city = '';
    let postalCode = '';
    
    // Try to extract city (usually second-to-last or third-to-last part before country)
    if (parts.length >= 2) {
      // Last part is usually country
      const beforeCountry = parts[parts.length - 2];
      // Check if it contains numbers (might be postal code)
      if (/\d/.test(beforeCountry)) {
        postalCode = beforeCountry.match(/\d+/)?.[0] || '';
        if (parts.length >= 3) {
          city = parts[parts.length - 3];
        }
      } else {
        city = beforeCountry;
      }
    }
    
    // Pass coordinates and parsed address data to parent
    if (onSelectAddress) {
      onSelectAddress({
        address: suggestion.display_name,
        lat: parseFloat(suggestion.lat),
        lng: parseFloat(suggestion.lng),
        city: city || 'Baku',
        postalCode: postalCode
      });
    }
  };

  return (
    <div className="address-autocomplete" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="address-input"
        autoComplete="off"
      />
      
      {loading && (
        <div className="address-loading">
          <div className="spinner"></div>
          Searching...
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <ul className="address-suggestions">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="address-suggestion-item"
            >
              <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.582 0 0 3.582 0 8c0 6 8 12 8 12s8-6 8-12c0-4.418-3.582-8-8-8z" fill="#667eea"/>
                <circle cx="8" cy="8" r="3" fill="white"/>
              </svg>
              <span>{suggestion.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
