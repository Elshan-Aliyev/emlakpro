import axios from 'axios';

// ── Axios instance ──────────────────────────────────────────────────────────────
// baseURL reads from env first so production builds can point at the real API
// without changing source. Fallback keeps local dev working out of the box.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 15000, // 15 s — guards against hung connections
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ─────────────────────────────────────────────────────────
// Automatically attach the stored token so callers don't have to repeat it.
// Individual calls that pass their own Authorization header take precedence.
api.interceptors.request.use(
  (config) => {
    if (!config.headers['Authorization']) {
      const token = localStorage.getItem('token');
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor ────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    // 401 — token expired or invalid; notify immediately, no retry
    if (status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(error);
    }

    // Silent retry — network failures or temporary server errors (503/504)
    // Up to 2 retries with linear back-off (800 ms, 1600 ms) before surfacing
    const isRetriable = !error.response || status === 503 || status === 504;
    config._retries = config._retries ?? 0;
    if (isRetriable && config._retries < 2) {
      config._retries++;
      await new Promise(r => setTimeout(r, config._retries * 800));
      return api(config);
    }

    // Structured console log for easier debugging (swap for Sentry later)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[API Error]', {
        url:     error.config?.url,
        status:  status ?? 'network',
        message: error.response?.data?.message || error.message,
      });
    }

    return Promise.reject(error);
  },
);

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
export const getProperties = (params = {}) => api.get('/properties', { params });
export const getPublicStats = () => api.get('/properties/stats');

// ==================== HOME API ====================
export const getHomeSections = () => api.get('/home/sections');

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

// Increment property share count
export const incrementPropertyShares = (id) =>
  api.post(`/properties/${id}/share`);

// Admin API endpoints
export const getAdminStats = (token) =>
  api.get('/admin/stats', { headers: { Authorization: `Bearer ${token}` } });

export const getOpsDashboard = (token) =>
  api.get('/admin/ops-dashboard', { headers: { Authorization: `Bearer ${token}` } });

export const getSellerResponseStats = (token) =>
  api.get('/admin/seller-responsiveness', { headers: { Authorization: `Bearer ${token}` } });

export const getAllListingsAdmin = (token, params) =>
  api.get('/admin/listings', { headers: { Authorization: `Bearer ${token}` }, params });

export const approveProperty = (id, token) =>
  api.put(`/admin/properties/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });

export const adminApproveProperty = (id, data, token) =>
  api.put(`/admin/properties/${id}/approve`, data, { headers: { Authorization: `Bearer ${token}` } });

export const adminRejectProperty = (id, data, token) =>
  api.put(`/admin/properties/${id}/reject`, data, { headers: { Authorization: `Bearer ${token}` } });

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

export const getConversationMessages = (conversationId, token) =>
  api.get(`/messages/conversation/${conversationId}`, { headers: { Authorization: `Bearer ${token}` } });

export const sendMessage = (data, token) =>
  api.post('/messages', data, { headers: { Authorization: `Bearer ${token}` } });

export const markMessagesAsRead = (conversationId, token) =>
  api.put(`/messages/conversation/${conversationId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });

export const getUnreadMessageCount = (token) =>
  api.get('/messages/unread-count', { headers: { Authorization: `Bearer ${token}` } });

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

// ==================== OWNERSHIP VERIFICATION API ====================
export const getMyListings = (token) =>
  api.get('/ownership/my-listings', { headers: { Authorization: `Bearer ${token}` } });

export const getMyListingsHealth = (token) =>
  api.get('/listing-health/my-health', { headers: { Authorization: `Bearer ${token}` } });

export const confirmListingAvailability = (id, token) =>
  api.post(`/listing-health/${id}/confirm`, {}, { headers: { Authorization: `Bearer ${token}` } });

export const uploadOwnershipDocument = (propertyId, formData, token) =>
  api.post(`/ownership/${propertyId}/upload-document`, formData, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
  });

export const submitOwnershipRequest = (propertyId, token) =>
  api.post(`/ownership/${propertyId}/submit-request`, {}, { headers: { Authorization: `Bearer ${token}` } });

export const getOwnershipRequests = (status, token) =>
  api.get('/ownership/requests', { params: { status }, headers: { Authorization: `Bearer ${token}` } });

export const approveOwnership = (propertyId, data, token) =>
  api.put(`/ownership/${propertyId}/approve`, data, { headers: { Authorization: `Bearer ${token}` } });

export const rejectOwnership = (propertyId, data, token) =>
  api.put(`/ownership/${propertyId}/reject`, data, { headers: { Authorization: `Bearer ${token}` } });

// ==================== REPORTS API ====================
export const submitReport = (data, token) =>
  api.post('/reports', data, { headers: { Authorization: `Bearer ${token}` } });

export const getReports = (params, token) =>
  api.get('/reports', { params, headers: { Authorization: `Bearer ${token}` } });

export const getReportStats = (token) =>
  api.get('/reports/stats', { headers: { Authorization: `Bearer ${token}` } });

export const updateReport = (id, data, token) =>
  api.patch(`/reports/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });

// ==================== INQUIRY & PHONE REVEAL ====================
export const submitInquiry = (id, data, token) =>
  api.post(`/properties/${id}/inquiry`, data, { headers: { Authorization: `Bearer ${token}` } });

export const revealPhone = (id, token) =>
  api.get(`/properties/${id}/phone`, { headers: { Authorization: `Bearer ${token}` } });

export const markPropertyStatus = (id, status, token) =>
  api.patch(`/properties/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });

// ==================== PHONE VERIFICATION API ====================
export const sendPhoneOtp = (phone, token) =>
  api.post('/phone-verification/send', { phone }, { headers: { Authorization: `Bearer ${token}` } });

export const verifyPhoneOtp = (phone, code, token) =>
  api.post('/phone-verification/verify', { phone, code }, { headers: { Authorization: `Bearer ${token}` } });

// ==================== ADMIN ABUSE API ====================
const authH = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getAbuseStats       = (token)         => api.get('/admin/abuse/stats',             authH(token));
export const getLinkedAccounts   = (token)         => api.get('/admin/abuse/linked-accounts',   authH(token));
export const getRepeatOffenders  = (token)         => api.get('/admin/abuse/repeat-offenders',  authH(token));
export const getFlaggedListings  = (params, token) => api.get('/admin/abuse/flagged-listings',  { ...authH(token), params });
export const getUserAbuseHistory = (userId, token) => api.get(`/admin/abuse/history/${userId}`, authH(token));
export const adminBulkAction     = (data, token)   => api.post('/admin/abuse/bulk-action',      data, authH(token));

// ── Promotion management (admin only) ─────────────────────────────────────────
export const updatePropertyPromotion = (propertyId, data, token) =>
  api.put(`/admin/properties/${propertyId}/promotion`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const expireStalePromotionsAdmin = (token) =>
  api.post('/admin/promotions/expire-stale', {}, {
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Promotion Requests ────────────────────────────────────────────────────────

export const submitPromotionRequest = (data, token) =>
  api.post('/promotion-requests', data, { headers: { Authorization: `Bearer ${token}` } });

export const getMyPromotionRequests = (token) =>
  api.get('/promotion-requests/my', { headers: { Authorization: `Bearer ${token}` } });

export const getAdminPromotionRequests = (status, token) =>
  api.get('/promotion-requests/admin', {
    params: { status },
    headers: { Authorization: `Bearer ${token}` },
  });

export const approvePromotionRequest = (id, adminNote, token) =>
  api.patch(`/promotion-requests/${id}/approve`, { adminNote }, { headers: { Authorization: `Bearer ${token}` } });

export const rejectPromotionRequest = (id, adminNote, token) =>
  api.patch(`/promotion-requests/${id}/reject`, { adminNote }, { headers: { Authorization: `Bearer ${token}` } });

export default api;
