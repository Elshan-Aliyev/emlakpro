const express = require('express');
const router = express.Router();
const {
  getSettings,
  getSetting,
  updateSetting,
  deleteSetting,
  bulkUpdateSettings,
  initializeSettings
} = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../middleware/roleMiddleware');

// Public/Private routes (access controlled in controller)
router.get('/', getSettings);
router.get('/:key', getSetting);

// Admin routes
router.patch('/:key', authMiddleware, isAdmin, updateSetting);
router.post('/bulk-update', authMiddleware, isAdmin, bulkUpdateSettings);

// Superadmin only routes
router.delete('/:key', authMiddleware, isSuperAdmin, deleteSetting);
router.post('/initialize', authMiddleware, isSuperAdmin, initializeSettings);

module.exports = router;
