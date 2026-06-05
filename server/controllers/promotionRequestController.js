'use strict';
const PromotionRequest = require('../models/PromotionRequest');
const Property         = require('../models/Property');

const TIER_SCORES  = { FREE: 1, FEATURED: 2, PREMIUM: 3, SPOTLIGHT: 4 };
const VALID_TIERS  = ['FEATURED', 'PREMIUM', 'SPOTLIGHT'];
const VALID_DAYS   = [7, 30, 90];

exports.submitRequest = async (req, res) => {
  try {
    const { propertyId, requestedTier, requestedDays } = req.body;
    if (!propertyId || !requestedTier || !requestedDays) {
      return res.status(400).json({ message: 'propertyId, requestedTier, and requestedDays are required.' });
    }
    if (!VALID_TIERS.includes(requestedTier)) {
      return res.status(400).json({ message: `requestedTier must be one of: ${VALID_TIERS.join(', ')}` });
    }
    if (!VALID_DAYS.includes(Number(requestedDays))) {
      return res.status(400).json({ message: 'requestedDays must be 7, 30, or 90.' });
    }

    const property = await Property.findById(propertyId).select('ownerId');
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    if (String(property.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only promote your own listings.' });
    }

    const existing = await PromotionRequest.findOne({ propertyId, status: 'pending' });
    if (existing) {
      return res.status(409).json({ message: 'A promotion request for this listing is already pending review.' });
    }

    const pr = await PromotionRequest.create({
      propertyId,
      ownerId:       req.user.id,
      requestedTier,
      requestedDays: Number(requestedDays),
    });
    res.status(201).json(pr);
  } catch (err) {
    console.error('submitRequest error:', err);
    res.status(500).json({ message: 'Failed to submit promotion request.' });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const requests = await PromotionRequest.find({ ownerId: req.user.id })
      .populate('propertyId', 'title images')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load requests.' });
  }
};

exports.getAdminRequests = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const filter = ['pending', 'approved', 'rejected'].includes(status) ? { status } : {};
    const [requests, total] = await Promise.all([
      PromotionRequest.find(filter)
        .populate('propertyId', 'title images location city')
        .populate('ownerId', 'name lastName email')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      PromotionRequest.countDocuments(filter),
    ]);
    res.json({ requests, total });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load admin requests.' });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { adminNote = '' } = req.body;
    const pr = await PromotionRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: 'Request not found.' });
    if (pr.status !== 'pending') {
      return res.status(409).json({ message: 'Request is no longer pending.' });
    }

    const startDate = new Date();
    const endDate   = new Date(startDate.getTime() + pr.requestedDays * 24 * 60 * 60 * 1000);

    await Property.findByIdAndUpdate(pr.propertyId, {
      promotionTier:      pr.requestedTier,
      promotionScore:     TIER_SCORES[pr.requestedTier],
      isPromoted:         true,
      promotionStartDate: startDate,
      promotionEndDate:   endDate,
    });

    pr.status      = 'approved';
    pr.adminNote   = adminNote;
    pr.processedAt = new Date();
    pr.processedBy = req.user.id;
    await pr.save();

    res.json({ message: 'Request approved.', pr });
  } catch (err) {
    console.error('approveRequest error:', err);
    res.status(500).json({ message: 'Failed to approve request.' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { adminNote = '' } = req.body;
    const pr = await PromotionRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: 'Request not found.' });
    if (pr.status !== 'pending') {
      return res.status(409).json({ message: 'Request is no longer pending.' });
    }

    pr.status      = 'rejected';
    pr.adminNote   = adminNote;
    pr.processedAt = new Date();
    pr.processedBy = req.user.id;
    await pr.save();

    res.json({ message: 'Request rejected.', pr });
  } catch (err) {
    console.error('rejectRequest error:', err);
    res.status(500).json({ message: 'Failed to reject request.' });
  }
};
