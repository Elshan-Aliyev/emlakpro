const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById,
  getRealtors,
  updateUser, 
  deleteUser,
  saveProperty,
  unsaveProperty,
  getSavedProperties,
  saveSearch,
  deleteSavedSearch,
  getSavedSearches
} = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

// GET /api/users
router.get('/', verifyToken, getUsers);

// GET /api/users/realtors (public - for Find Realtor page)
router.get('/realtors', getRealtors);

// GET /api/users/:id (public - for viewing realtor profiles)
router.get('/:id', getUserById);

// PUT /api/users/:id
router.put('/:id', verifyToken, updateUser);

// DELETE /api/users/:id
router.delete('/:id', verifyToken, deleteUser);

// POST /api/users/save-property
router.post('/save-property', verifyToken, saveProperty);

// DELETE /api/users/unsave-property/:propertyId
router.delete('/unsave-property/:propertyId', verifyToken, unsaveProperty);

// GET /api/users/saved-properties
router.get('/saved-properties', verifyToken, getSavedProperties);

// POST /api/users/save-search
router.post('/save-search', verifyToken, saveSearch);

// DELETE /api/users/saved-search/:searchId
router.delete('/saved-search/:searchId', verifyToken, deleteSavedSearch);

// GET /api/users/saved-searches
router.get('/saved-searches', verifyToken, getSavedSearches);

module.exports = router;
