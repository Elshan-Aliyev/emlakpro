'use strict';
const express     = require('express');
const router      = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const ctrl        = require('../controllers/propertyReviewController');
const PropertyReview   = require('../models/PropertyReview');

// ── Public ─────────────────────────────────────────────────────────────────
router.get('/summary/:propertyId',    ctrl.getSummary);
router.get('/by-listing/:propertyId', ctrl.getByListing);

// ── Admin list (BEFORE /:id to avoid conflict) ──────────────────────────────
router.get('/admin/list', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status = 'reported', page = 1, limit = 20 } = req.query;
    const validStatuses = ['reported', 'hidden', 'active'];
    const statusFilter  = validStatuses.includes(status) ? status : 'reported';
    const skip          = (Number(page) - 1) * Math.min(Number(limit), 50);
    const lim           = Math.min(Number(limit), 50);

    const [reviews, total] = await Promise.all([
      PropertyReview.find({ status: statusFilter })
        .sort({ reportCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate('reviewerId', 'name lastName email')
        .populate({ path: 'propertyIdentityId', select: 'fingerprint' })
        .lean(),
      PropertyReview.countDocuments({ status: statusFilter }),
    ]);
    res.json({ reviews, total });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load reviews.' });
  }
});

// ── Authenticated user ─────────────────────────────────────────────────────
router.post('/',                verifyToken, ctrl.submitReview);
router.put('/:id',              verifyToken, ctrl.editReview);
router.delete('/:id',           verifyToken, ctrl.deleteReview);
router.post('/:id/response',    verifyToken, ctrl.addOwnerResponse);
router.post('/:id/helpful',     verifyToken, ctrl.markHelpful);
router.post('/:id/report',      verifyToken, ctrl.reportReview);

// ── Admin ──────────────────────────────────────────────────────────────────
router.patch('/:id/moderate',   verifyToken, isAdmin, ctrl.moderateReview);
router.delete('/:id/admin',     verifyToken, isAdmin, ctrl.adminDeleteReview);

// ── Admin identity rebuild ─────────────────────────────────────────────────
router.post('/admin/rebuild', verifyToken, isAdmin, async (req, res) => {
  try {
    const Property         = require('../models/Property');
    const PropertyIdentity = require('../models/PropertyIdentity');
    const { resolvePropertyIdentity } = require('../lib/reputation/resolveIdentity');

    await PropertyIdentity.updateMany({}, { $set: { listingCount: 0 } });

    const cursor = Property.find({}).cursor();
    let processed = 0, errors = 0;

    for await (const property of cursor) {
      try {
        const identity = await resolvePropertyIdentity(property);
        await identity.updateOne({ $inc: { listingCount: 1 } });
        await Property.updateOne({ _id: property._id }, { propertyIdentityId: identity._id });
        processed++;
      } catch (err) {
        errors++;
        console.error(`[rebuild] Error on ${property._id}:`, err.message);
      }
    }

    res.json({ message: 'Rebuild complete.', processed, errors });
  } catch (err) {
    console.error('[rebuild] Fatal error:', err);
    res.status(500).json({ message: 'Rebuild failed.' });
  }
});

module.exports = router;
