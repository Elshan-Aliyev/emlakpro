'use strict';
const express     = require('express');
const router      = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const ctrl        = require('../controllers/promotionRequestController');

router.post('/',             verifyToken,          ctrl.submitRequest);
router.get('/my',            verifyToken,          ctrl.getMyRequests);
router.get('/admin',         verifyToken, isAdmin, ctrl.getAdminRequests);
router.patch('/:id/approve', verifyToken, isAdmin, ctrl.approveRequest);
router.patch('/:id/reject',  verifyToken, isAdmin, ctrl.rejectRequest);

module.exports = router;
