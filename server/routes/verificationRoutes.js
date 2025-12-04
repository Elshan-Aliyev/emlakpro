const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const verificationController = require('../controllers/verificationController');

// Public: Get verification pricing info
router.get('/pricing', verificationController.getVerificationPricing);

// User routes (require authentication)
router.use(authMiddleware);

// Get my application status
router.get('/my-application', verificationController.getMyApplicationStatus);

// Submit new verification application
router.post('/apply', verificationController.submitVerificationApplication);

// Upload verification documents
router.post('/documents', verificationController.uploadVerificationDocument);

// Process payment
router.post('/payment', verificationController.processVerificationPayment);

// Admin routes (require admin role)
router.get('/applications/pending', isAdmin, verificationController.getPendingApplications);
router.put('/applications/:userId/approve', isAdmin, verificationController.approveVerification);
router.put('/applications/:userId/reject', isAdmin, verificationController.rejectVerification);

module.exports = router;
