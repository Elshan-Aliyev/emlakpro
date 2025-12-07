const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const {
  getRealtorReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
  respondToReview,
  markHelpful,
  moderateReview,
  flagReview
} = require('../controllers/reviewController');

// Public routes
router.get('/realtor/:realtorId', getRealtorReviews);

// Protected routes
router.use(authMiddleware); // All routes below require authentication

router.get('/my-reviews', getMyReviews);
router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/response', respondToReview);
router.post('/:id/helpful', markHelpful);
router.post('/:id/flag', flagReview);

// Admin routes
router.put('/:id/moderate', checkRole('admin', 'superadmin'), moderateReview);

module.exports = router;
