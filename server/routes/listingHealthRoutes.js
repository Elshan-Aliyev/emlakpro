const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { getMyListingsHealth, confirmAvailability } = require('../controllers/listingHealthController');

router.get('/my-health', verifyToken, getMyListingsHealth);
router.post('/:id/confirm', verifyToken, confirmAvailability);

module.exports = router;
