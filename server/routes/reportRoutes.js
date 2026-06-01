const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { checkAccountStatus } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { reportLimiter } = require('../middleware/rateLimiter');
const { submitReport, getReports, getReportStats, updateReport } = require('../controllers/reportController');

// User: submit a report (must be logged in and not blocked)
router.post('/', verifyToken, checkAccountStatus, reportLimiter, submitReport);

// Admin: list reports with optional status/targetType filter
router.get('/', verifyToken, isAdmin, getReports);

// Admin: report counts per status
router.get('/stats', verifyToken, isAdmin, getReportStats);

// Admin: resolve or dismiss a report
router.patch('/:id', verifyToken, isAdmin, updateReport);

module.exports = router;
