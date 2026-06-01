const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const {
  getLinkedAccounts,
  getRepeatOffenders,
  getFlaggedListings,
  getUserAbuseHistory,
  bulkAction,
  getAbuseStats,
} = require('../controllers/adminAbuseController');

// All routes require admin auth
router.use(verifyToken, isAdmin);

router.get('/stats',              getAbuseStats);
router.get('/linked-accounts',    getLinkedAccounts);
router.get('/repeat-offenders',   getRepeatOffenders);
router.get('/flagged-listings',   getFlaggedListings);
router.get('/history/:userId',    getUserAbuseHistory);
router.post('/bulk-action',       bulkAction);

module.exports = router;
