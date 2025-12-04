// Script to Geocode Existing Properties
// Run this in browser console on any page with MAPBOX token loaded

const MAPBOX_TOKEN = 'MAPBOX_TOKEN_REDACTED';

async function geocodeAddress(address) {
  try {
    const encodedAddress = encodeURIComponent(address + ', Baku, Azerbaijan');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&country=AZ&limit=1`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng, latitude: lat, longitude: lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function updatePropertyWithCoordinates(propertyId, coordinates) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`http://localhost:5000/api/properties/${propertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ coordinates })
  });
  
  return response.json();
}

async function geocodeAllProperties() {
  const token = localStorage.getItem('token');
  
  // Fetch all properties
  const response = await fetch('http://localhost:5000/api/properties');
  const properties = await response.json();
  
  console.log(`Found ${properties.length} properties`);
  
  let updated = 0;
  let failed = 0;
  
  for (const property of properties) {
    // Skip if already has coordinates
    if (property.coordinates && (property.coordinates.lat || property.coordinates.latitude)) {
      console.log(`✓ ${property.title} - already has coordinates`);
      continue;
    }
    
    const address = property.location || property.fullAddress || `${property.street}, ${property.city}`;
    
    if (!address || address.trim() === ', ') {
      console.log(`✗ ${property.title} - no address`);
      failed++;
      continue;
    }
    
    console.log(`🌍 Geocoding: ${property.title} - ${address}`);
    
    const coords = await geocodeAddress(address);
    
    if (coords) {
      await updatePropertyWithCoordinates(property._id, coords);
      console.log(`✅ Updated ${property.title} with coords:`, coords);
      updated++;
    } else {
      console.log(`✗ Failed to geocode ${property.title}`);
      failed++;
    }
    
    // Wait 100ms between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n🎉 Geocoding complete!`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`✗ Failed: ${failed}`);
}

// Run the script
console.log('🚀 Starting geocoding script...');
console.log('This will add map coordinates to all properties without them.');
console.log('');
geocodeAllProperties();
