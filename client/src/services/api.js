import axios from 'axios';

// Base axios instance (uses proxy automatically)
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Points to backend via proxy
});

// ==================== AUTH API ====================
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);

// Get current user
export const getCurrentUser = (token) =>
  api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });

// Update current user profile
export const updateCurrentUser = (data, token) =>
  api.put('/auth/me', data, { headers: { Authorization: `Bearer ${token}` } });

// Change password
export const changePassword = (data, token) =>
  api.put('/auth/change-password', data, { headers: { Authorization: `Bearer ${token}` } });

// ==================== USER API ====================
export const getUsers = (token) =>
  api.get('/users', { headers: { Authorization: `Bearer ${token}` } });
  
export const deleteUser = (id, token) =>
  api.delete(`/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });

export const updateUser = (id, data, token) =>
  api.put(`/users/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });

// Save/Unsave property (user favourites)
export const savePropertyToFavourites = (propertyId, token) =>
  api.post('/users/save-property', { propertyId }, { headers: { Authorization: `Bearer ${token}` } });

export const unsavePropertyFromFavourites = (propertyId, token) =>
  api.delete(`/users/unsave-property/${propertyId}`, { headers: { Authorization: `Bearer ${token}` } });

export const getUserSavedProperties = (token) =>
  api.get('/users/saved-properties', { headers: { Authorization: `Bearer ${token}` } });

// Saved Searches
export const saveSearch = (data, token) =>
  api.post('/users/save-search', data, { headers: { Authorization: `Bearer ${token}` } });

export const deleteSavedSearch = (searchId, token) =>
  api.delete(`/users/saved-search/${searchId}`, { headers: { Authorization: `Bearer ${token}` } });

export const getSavedSearches = (token) =>
  api.get('/users/saved-searches', { headers: { Authorization: `Bearer ${token}` } });

// ==================== PROPERTIES API ====================
export const getProperties = () => api.get('/properties');

export const createProperty = (data, token) =>
  api.post('/properties', data, { headers: { Authorization: `Bearer ${token}` } });

export const getProperty = (id) => api.get(`/properties/${id}`);

export const updateProperty = (id, data, token) =>
  api.put(`/properties/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });
  
export const deleteProperty = (id, token) =>
  api.delete(`/properties/${id}`, { headers: { Authorization: `Bearer ${token}` } });

// Save/Unsave property
export const toggleSaveProperty = (id, token) =>
  api.post(`/properties/${id}/save`, {}, { headers: { Authorization: `Bearer ${token}` } });

export const getSavedProperties = (token) =>
  api.get('/properties/saved/my-properties', { headers: { Authorization: `Bearer ${token}` } });

// Increment property views
export const incrementPropertyViews = (id) =>
  api.post(`/properties/${id}/view`);

// Admin API endpoints
export const getAdminStats = (token) =>
  api.get('/admin/stats', { headers: { Authorization: `Bearer ${token}` } });

export const getAllListingsAdmin = (token, params) =>
  api.get('/admin/listings', { headers: { Authorization: `Bearer ${token}` }, params });

export const approveProperty = (id, token) =>
  api.put(`/admin/properties/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });

export const bulkDeleteProperties = (ids, token) =>
  api.post('/admin/properties/bulk-delete', { ids }, { headers: { Authorization: `Bearer ${token}` } });

export const bulkApproveProperties = (ids, token) =>
  api.post('/admin/properties/bulk-approve', { ids }, { headers: { Authorization: `Bearer ${token}` } });

// ==================== IMAGES API ====================

export const uploadImage = (formData, token) =>
  api.post('/images', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });

export const getImages = (token, params) =>
  api.get('/images', {
    headers: { Authorization: `Bearer ${token}` },
    params
  });

export const getImage = (id) =>
  api.get(`/images/${id}`);

export const updateImage = (id, data, token) =>
  api.patch(`/images/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const deleteImage = (id, token) =>
  api.delete(`/images/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const bulkDeleteImages = (imageIds, token) =>
  api.post('/images/bulk-delete', { imageIds }, {
    headers: { Authorization: `Bearer ${token}` }
  });

// ==================== SETTINGS API ====================

export const getSettings = (params) =>
  api.get('/settings', { params });

export const getSetting = (key) =>
  api.get(`/settings/${key}`);

export const updateSetting = (key, data, token) =>
  api.patch(`/settings/${key}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const deleteSetting = (key, token) =>
  api.delete(`/settings/${key}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const bulkUpdateSettings = (settings, token) =>
  api.post('/settings/bulk-update', { settings }, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const initializeSettings = (token) =>
  api.post('/settings/initialize', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });

// ==================== ARTICLES API ====================
export const getArticles = (params) => api.get('/articles', { params });

export const getArticleBySlug = (slug) => api.get(`/articles/${slug}`);

export const getAdminArticles = (token) =>
  api.get('/articles/admin/all', { headers: { Authorization: `Bearer ${token}` } });

export const createArticle = (data, token) =>
  api.post('/articles', data, { headers: { Authorization: `Bearer ${token}` } });

export const updateArticle = (id, data, token) =>
  api.put(`/articles/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });

export const deleteArticle = (id, token) =>
  api.delete(`/articles/${id}`, { headers: { Authorization: `Bearer ${token}` } });

export const uploadArticleImage = (formData, token) =>
  api.post('/articles/upload-image', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });

export const incrementArticleViews = (id) => api.post(`/articles/${id}/view`);

export const toggleArticleLike = (id, token) =>
  api.post(`/articles/${id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });

// ==================== MESSAGES API ====================
export const getConversations = (token) =>
  api.get('/messages/conversations', { headers: { Authorization: `Bearer ${token}` } });

export const getConversationMessages = (userId, token) =>
  api.get(`/messages/conversation/${userId}`, { headers: { Authorization: `Bearer ${token}` } });

export const sendMessage = (data, token) =>
  api.post('/messages', data, { headers: { Authorization: `Bearer ${token}` } });

export const markMessagesAsRead = (userId, token) =>
  api.put(`/messages/read/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });

// ==================== REVIEWS API ====================
export const getRealtorReviews = (realtorId) => api.get(`/reviews/realtor/${realtorId}`);

export const createReview = (data, token) =>
  api.post('/reviews', data, { headers: { Authorization: `Bearer ${token}` } });

// ==================== REALTORS API ====================
export const getRealtors = (params) => api.get('/users/realtors', { params });

export const getUserById = (id) => api.get(`/users/${id}`);

// ==================== VERIFICATION API ====================
export const getVerificationPricing = (token) =>
  api.get('/verification/pricing', { headers: { Authorization: `Bearer ${token}` } });

export const getMyApplicationStatus = (token) =>
  api.get('/verification/my-application', { headers: { Authorization: `Bearer ${token}` } });

export const submitVerificationApplication = (data, token) =>
  api.post('/verification/apply', data, { headers: { Authorization: `Bearer ${token}` } });

export const uploadVerificationDocument = (formData, token) =>
  api.post('/verification/upload-document', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });

export const processVerificationPayment = (data, token) =>
  api.post('/verification/payment', data, { headers: { Authorization: `Bearer ${token}` } });

export default api;
