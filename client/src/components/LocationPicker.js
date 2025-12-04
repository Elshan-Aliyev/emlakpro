import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { reverseGeocode } from '../services/geocoding';
import './LocationPicker.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const LocationPicker = ({ initialCoords, onLocationChange, height = '400px' }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const initializedRef = useRef(false);
  const [coordinates, setCoordinates] = useState(initialCoords || { lat: 40.4093, lng: 49.8671 }); // Baku center
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const updateCoordinates = async (lat, lng) => {
    const newCoords = {
      lat,
      lng,
      latitude: lat,
      longitude: lng
    };
    setCoordinates(newCoords);
    
    // Reverse geocode to get address
    setLoading(true);
    const foundAddress = await reverseGeocode(lat, lng);
    if (foundAddress) {
      setAddress(foundAddress);
    }
    setLoading(false);
    
    if (onLocationChange) {
      onLocationChange(newCoords);
    }
  };

  useEffect(() => {
    if (map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [coordinates.lng, coordinates.lat],
      zoom: 14
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Create draggable marker
    const el = document.createElement('div');
    el.className = 'location-picker-marker';
    el.innerHTML = `
      <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 30 20 30s20-15 20-30c0-11.046-8.954-20-20-20z" fill="#667eea"/>
        <circle cx="20" cy="20" r="8" fill="white"/>
      </svg>
    `;

    marker.current = new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
      draggable: true
    })
      .setLngLat([coordinates.lng, coordinates.lat])
      .addTo(map.current);

    // Update coordinates when marker is dragged
    marker.current.on('dragend', async () => {
      const lngLat = marker.current.getLngLat();
      await updateCoordinates(lngLat.lat, lngLat.lng);
    });

    // Update marker on map click
    map.current.on('click', async (e) => {
      marker.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
      await updateCoordinates(e.lngLat.lat, e.lngLat.lng);
    });

  }, []);

  // Update marker position when initialCoords change from parent (e.g., address selection)
  useEffect(() => {
    if (marker.current && initialCoords && initialCoords.lat && initialCoords.lng && !initializedRef.current) {
      const lat = initialCoords.lat || initialCoords.latitude;
      const lng = initialCoords.lng || initialCoords.longitude;
      
      // Only update if coordinates are different
      if (Math.abs(coordinates.lat - lat) > 0.00001 || Math.abs(coordinates.lng - lng) > 0.00001) {
        marker.current.setLngLat([lng, lat]);
        setCoordinates({ lat, lng, latitude: lat, longitude: lng });
        
        if (map.current) {
          map.current.flyTo({
            center: [lng, lat],
            zoom: 16,
            essential: true
          });
        }
        
        initializedRef.current = true;
      }
    }
  }, [initialCoords?.lat, initialCoords?.lng]);

  return (
    <div className="location-picker-container">
      <div className="location-picker-info">
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 0C3.582 0 0 3.582 0 8c0 6 8 12 8 12s8-6 8-12c0-4.418-3.582-8-8-8z" fill="#667eea"/>
          <circle cx="8" cy="8" r="3" fill="white"/>
        </svg>
        <span>Click on the map or drag the pin to set the exact location</span>
      </div>
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: height,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '2px solid #e0e0e0'
        }} 
      />
      <div className="location-picker-coords">
        <div>
          <strong>Coordinates:</strong> {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
        </div>
        {loading && (
          <div style={{ marginTop: '8px', color: '#667eea', fontSize: '12px' }}>
            Loading address...
          </div>
        )}
        {address && !loading && (
          <div style={{ marginTop: '8px', color: '#666', fontSize: '12px' }}>
            <strong>Address:</strong> {address}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPicker;
