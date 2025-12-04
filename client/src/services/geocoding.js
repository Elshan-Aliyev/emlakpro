// OpenStreetMap Nominatim Geocoding Service
// Free and open-source, no API key required
// Rate limit: 1 request per second

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Enforce rate limiting for Nominatim (1 req/sec)
 */
const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
};

export const geocodeAddress = async (address) => {
  try {
    await waitForRateLimit();
    
    // Clean up the address
    let cleanAddress = address.trim();
    
    // If address doesn't include Azerbaijan or Baku, append it for better results
    if (!cleanAddress.toLowerCase().includes('azerbaijan') && !cleanAddress.toLowerCase().includes('baku')) {
      cleanAddress = `${cleanAddress}, Baku, Azerbaijan`;
    }
    
    const params = new URLSearchParams({
      q: cleanAddress,
      format: 'json',
      addressdetails: '1',
      limit: '1',
      countrycodes: 'az', // Limit to Azerbaijan
      'accept-language': 'en'
    });
    
    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    
    console.log('🔍 Geocoding:', cleanAddress);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RealEstateApp/1.0' // Nominatim requires User-Agent
      }
    });
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        formattedAddress: data[0].display_name
      };
      console.log('✅ Found:', result);
      return result;
    }
    
    console.warn('⚠️ No results for:', cleanAddress);
    return null;
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return null;
  }
};

export const reverseGeocode = async (lat, lng) => {
  try {
    await waitForRateLimit();
    
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      'accept-language': 'en'
    });
    
    const url = `https://nominatim.openstreetmap.org/reverse?${params}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RealEstateApp/1.0'
      }
    });
    
    const data = await response.json();
    
    if (data && data.display_name) {
      return data.display_name;
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

/**
 * Search for address suggestions (autocomplete)
 * @param {string} query - The search query
 * @returns {Promise<Array<{display_name: string, lat: number, lng: number}>>}
 */
export const searchAddresses = async (query) => {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    await waitForRateLimit();
    
    // Append Baku, Azerbaijan for better local results
    const searchQuery = query.includes('Baku') || query.includes('Azerbaijan') 
      ? query 
      : `${query}, Baku, Azerbaijan`;
    
    const params = new URLSearchParams({
      q: searchQuery,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'az',
      'accept-language': 'en'
    });
    
    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RealEstateApp/1.0'
      }
    });
    
    const data = await response.json();

    return data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
};
