/**
 * Global image utility functions with fallback handling
 * Ensures all images across the website have a fallback to no-image-available.jpg
 */

const DEFAULT_IMAGE = '/assets/no-image-available.jpg';
const DEFAULT_AVATAR = '/assets/default-avatar.png';

/**
 * Get image URL with automatic fallback
 * @param {string|object|array} imageData - Image data in various formats
 * @param {string} size - Preferred size (thumbnail, medium, large, original)
 * @param {string} defaultImage - Custom default image (optional)
 * @returns {string} - Image URL or default image
 */
export const getImageUrl = (imageData, size = 'thumbnail', defaultImage = DEFAULT_IMAGE) => {
  // Handle null/undefined
  if (!imageData) return defaultImage;

  // Handle string URL
  if (typeof imageData === 'string') {
    return imageData || defaultImage;
  }

  // Handle array of images
  if (Array.isArray(imageData)) {
    if (imageData.length === 0) return defaultImage;
    
    const firstImage = imageData[0];
    
    // If array contains strings
    if (typeof firstImage === 'string') {
      return firstImage || defaultImage;
    }
    
    // If array contains objects
    if (typeof firstImage === 'object' && firstImage !== null) {
      return firstImage[size] || 
             firstImage.thumbnail || 
             firstImage.medium || 
             firstImage.large || 
             firstImage.original || 
             firstImage.url || 
             defaultImage;
    }
    
    return defaultImage;
  }

  // Handle object with image properties
  if (typeof imageData === 'object' && imageData !== null) {
    return imageData[size] || 
           imageData.thumbnail || 
           imageData.medium || 
           imageData.large || 
           imageData.original || 
           imageData.url || 
           defaultImage;
  }

  return defaultImage;
};

/**
 * Get avatar/profile picture URL with fallback
 * @param {string|object} avatarData - Avatar data
 * @returns {string} - Avatar URL or default avatar
 */
export const getAvatarUrl = (avatarData) => {
  return getImageUrl(avatarData, 'thumbnail', DEFAULT_AVATAR);
};

/**
 * Get property image URL with fallback
 * @param {object} property - Property object
 * @param {number} index - Image index (default 0)
 * @param {string} size - Image size
 * @returns {string} - Image URL or default image
 */
export const getPropertyImageUrl = (property, index = 0, size = 'thumbnail') => {
  if (!property || !property.images || !Array.isArray(property.images)) {
    return DEFAULT_IMAGE;
  }

  const image = property.images[index];
  return getImageUrl(image, size);
};

/**
 * Check if image URL is valid (not empty, not default)
 * @param {string} url - Image URL to check
 * @returns {boolean} - True if valid custom image
 */
export const isValidImageUrl = (url) => {
  return url && 
         url !== DEFAULT_IMAGE && 
         url !== DEFAULT_AVATAR && 
         url.length > 0;
};

/**
 * Get multiple property images with fallback
 * @param {object} property - Property object
 * @param {number} count - Number of images to return
 * @param {string} size - Image size
 * @returns {array} - Array of image URLs
 */
export const getPropertyImages = (property, count = 5, size = 'thumbnail') => {
  if (!property || !property.images || !Array.isArray(property.images)) {
    return [DEFAULT_IMAGE];
  }

  const images = property.images.slice(0, count).map(img => getImageUrl(img, size));
  
  // If no images, return default
  if (images.length === 0) {
    return [DEFAULT_IMAGE];
  }

  return images;
};

export default {
  getImageUrl,
  getAvatarUrl,
  getPropertyImageUrl,
  getPropertyImages,
  isValidImageUrl,
  DEFAULT_IMAGE,
  DEFAULT_AVATAR
};
