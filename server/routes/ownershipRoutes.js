const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { checkAccountStatus } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/ownershipController');

// User: all own listings regardless of status
router.get('/my-listings', verifyToken, ctrl.getMyListings);

// User: upload a document for a specific property
router.post(
  '/:propertyId/upload-document',
  verifyToken,
  checkAccountStatus,
  ctrl.documentUpload.single('file'),
  ctrl.uploadOwnershipDocument
);

// User: submit uploaded documents for admin review
router.post('/:propertyId/submit-request', verifyToken, checkAccountStatus, ctrl.submitOwnershipRequest);

// Admin: list requests filtered by status
router.get('/requests', verifyToken, isAdmin, ctrl.getOwnershipRequests);

// Admin: approve or reject
router.put('/:propertyId/approve', verifyToken, isAdmin, ctrl.approveOwnership);
router.put('/:propertyId/reject',  verifyToken, isAdmin, ctrl.rejectOwnership);

module.exports = router;
