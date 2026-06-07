'use strict';
const mongoose         = require('mongoose');
const PropertyReview   = require('../models/PropertyReview');
const PropertyIdentity = require('../models/PropertyIdentity');
const Property         = require('../models/Property');
const User             = require('../models/User');
const { resolvePropertyIdentity }           = require('../lib/reputation/resolveIdentity');
const { updatePropertyReputationAggregates } = require('../lib/reputation/updateAggregates');

const EDIT_WINDOW_DAYS = 30;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getIdentityByListingId(propertyId) {
  const property = await Property.findById(propertyId).select('propertyIdentityId ownerId title');
  if (!property) return null;
  if (property.propertyIdentityId) {
    const identity = await PropertyIdentity.findById(property.propertyIdentityId);
    return identity ? { identity, property } : null;
  }
  // Fallback: resolve on the fly (handles pre-backfill listings)
  const identity = await resolvePropertyIdentity(property);
  await Property.updateOne({ _id: propertyId }, { propertyIdentityId: identity._id });
  return { identity, property };
}

function buildRatingDistribution(reviews) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++; });
  return [5, 4, 3, 2, 1].map(star => ({ star, count: dist[star] }));
}

// ── GET /by-listing/:propertyId ───────────────────────────────────────────────

exports.getByListing = async (req, res) => {
  try {
    const result = await getIdentityByListingId(req.params.propertyId);
    if (!result) return res.status(404).json({ message: 'Property not found.' });
    const { identity } = result;

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const sort  = req.query.sort || 'recent';

    const sortMap = {
      recent:  { createdAt: -1 },
      highest: { rating: -1, createdAt: -1 },
      lowest:  { rating: 1,  createdAt: -1 },
      helpful: { reviewHelpfulCount: -1, createdAt: -1 },
    };

    const [reviews, total, allRatings] = await Promise.all([
      PropertyReview.find({
        propertyIdentityId: identity._id,
        status: { $in: ['active', 'reported'] },
      })
        .sort(sortMap[sort] || sortMap.recent)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reviewerId', 'name lastName avatar')
        .lean(),
      PropertyReview.countDocuments({
        propertyIdentityId: identity._id,
        status: { $in: ['active', 'reported'] },
      }),
      PropertyReview.find({ propertyIdentityId: identity._id, status: 'active' }, 'rating').lean(),
    ]);

    res.json({
      identity: {
        _id:                 identity._id,
        avgRating:           identity.avgRating,
        reviewCount:         identity.reviewCount,
        recommendPercentage: identity.recommendPercentage,
      },
      ratingDistribution: buildRatingDistribution(allRatings),
      reviews,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error('getByListing error:', err);
    res.status(500).json({ message: 'Failed to load reviews.' });
  }
};

// ── GET /summary/:propertyId ──────────────────────────────────────────────────

exports.getSummary = async (req, res) => {
  try {
    const result = await getIdentityByListingId(req.params.propertyId);
    if (!result) return res.status(404).json({ message: 'Property not found.' });
    const { identity } = result;
    res.json({
      avgRating:           identity.avgRating,
      reviewCount:         identity.reviewCount,
      recommendPercentage: identity.recommendPercentage,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load summary.' });
  }
};

// ── POST / — submit review ────────────────────────────────────────────────────

exports.submitReview = async (req, res) => {
  try {
    const { propertyId, reviewType, rating, title, review, recommended } = req.body;
    if (!propertyId || !reviewType || !rating || !review) {
      return res.status(400).json({ message: 'propertyId, reviewType, rating, and review are required.' });
    }

    // 24-hour account age guard
    const reviewer = await User.findById(req.user.id).select('createdAt');
    if (!reviewer) return res.status(404).json({ message: 'User not found.' });
    if (Date.now() - new Date(reviewer.createdAt).getTime() < 24 * 60 * 60 * 1000) {
      return res.status(403).json({ message: 'Account must be at least 24 hours old to submit a review.' });
    }

    const result = await getIdentityByListingId(propertyId);
    if (!result) return res.status(404).json({ message: 'Property not found.' });
    const { identity, property } = result;

    // Owner exclusion
    if (String(property.ownerId) === String(req.user.id)) {
      return res.status(403).json({ message: 'You cannot review your own listing.' });
    }

    const ratingInt = parseInt(rating, 10);
    if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }
    const reviewText = (review || '').trim();
    if (reviewText.length < 20)   return res.status(400).json({ message: 'Review must be at least 20 characters.' });
    if (reviewText.length > 2000) return res.status(400).json({ message: 'Review must be 2000 characters or fewer.' });

    const validTypes = ['buyer-experience', 'rental-experience', 'general-feedback'];
    if (!validTypes.includes(reviewType)) return res.status(400).json({ message: 'Invalid review type.' });
    if (title && title.length > 120) return res.status(400).json({ message: 'Title must be 120 characters or fewer.' });

    const existing = await PropertyReview.findOne({ propertyIdentityId: identity._id, reviewerId: req.user.id });
    if (existing) return res.status(409).json({ message: 'You have already reviewed this property.' });

    const newReview = await PropertyReview.create({
      propertyIdentityId: identity._id,
      reviewerId:  req.user.id,
      reviewType,
      rating:      ratingInt,
      title:       (title || '').trim(),
      review:      reviewText,
      recommended: recommended !== false,
    });

    await updatePropertyReputationAggregates(identity._id);
    res.status(201).json(newReview);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You have already reviewed this property.' });
    console.error('submitReview error:', err);
    res.status(500).json({ message: 'Failed to submit review.' });
  }
};

// ── PUT /:id — edit review ─────────────────────────────────────────────────────

exports.editReview = async (req, res) => {
  try {
    const rev = await PropertyReview.findById(req.params.id);
    if (!rev) return res.status(404).json({ message: 'Review not found.' });
    if (String(rev.reviewerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only edit your own reviews.' });
    }

    const ageMs = Date.now() - new Date(rev.createdAt).getTime();
    if (ageMs > EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
      return res.status(403).json({ message: `Reviews can only be edited within ${EDIT_WINDOW_DAYS} days of submission.` });
    }

    const { rating, title, review, recommended, reviewType } = req.body;
    if (rating !== undefined) {
      const r = parseInt(rating, 10);
      if (isNaN(r) || r < 1 || r > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
      rev.rating = r;
    }
    if (review !== undefined) {
      const t = review.trim();
      if (t.length < 20)   return res.status(400).json({ message: 'Review must be at least 20 characters.' });
      if (t.length > 2000) return res.status(400).json({ message: 'Review must be 2000 characters or fewer.' });
      rev.review = t;
    }
    if (title !== undefined) {
      if (title.length > 120) return res.status(400).json({ message: 'Title must be 120 characters or fewer.' });
      rev.title = title.trim();
    }
    if (recommended !== undefined) rev.recommended = !!recommended;
    if (reviewType !== undefined) {
      const validTypes = ['buyer-experience', 'rental-experience', 'general-feedback'];
      if (!validTypes.includes(reviewType)) return res.status(400).json({ message: 'Invalid review type.' });
      rev.reviewType = reviewType;
    }

    await rev.save();
    await updatePropertyReputationAggregates(rev.propertyIdentityId);
    res.json(rev);
  } catch (err) {
    console.error('editReview error:', err);
    res.status(500).json({ message: 'Failed to edit review.' });
  }
};

// ── DELETE /:id — delete own review ───────────────────────────────────────────

exports.deleteReview = async (req, res) => {
  try {
    const rev = await PropertyReview.findById(req.params.id);
    if (!rev) return res.status(404).json({ message: 'Review not found.' });
    if (String(rev.reviewerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only delete your own reviews.' });
    }
    const identityId = rev.propertyIdentityId;
    await rev.deleteOne();
    await updatePropertyReputationAggregates(identityId);
    res.json({ message: 'Review deleted.' });
  } catch (err) {
    console.error('deleteReview error:', err);
    res.status(500).json({ message: 'Failed to delete review.' });
  }
};

// ── POST /:id/response — owner response (upsert, unlimited edits) ─────────────

exports.addOwnerResponse = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Response text is required.' });
    if (text.trim().length > 1000) return res.status(400).json({ message: 'Response must be 1000 characters or fewer.' });

    const rev = await PropertyReview.findById(req.params.id).populate('propertyIdentityId', '_id');
    if (!rev) return res.status(404).json({ message: 'Review not found.' });

    // Verify the requester is a listing owner for this identity
    const property = await Property.findOne({ propertyIdentityId: rev.propertyIdentityId._id }).select('ownerId');
    if (!property || String(property.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the listing owner can respond to reviews.' });
    }

    const now = new Date();
    rev.ownerResponse = {
      text:        text.trim(),
      ownerUserId: req.user.id,
      respondedAt: rev.ownerResponse?.respondedAt || now,  // preserved on first write
      updatedAt:   now,
    };
    await rev.save();
    res.json(rev);
  } catch (err) {
    console.error('addOwnerResponse error:', err);
    res.status(500).json({ message: 'Failed to save response.' });
  }
};

// ── POST /:id/helpful — toggle helpful vote ────────────────────────────────────

exports.markHelpful = async (req, res) => {
  try {
    const rev = await PropertyReview.findById(req.params.id);
    if (!rev) return res.status(404).json({ message: 'Review not found.' });

    const existingIdx = rev.helpfulVotes.findIndex(v => String(v.userId) === String(req.user.id));

    if (existingIdx !== -1) {
      // TOGGLE OFF — remove vote
      rev.helpfulVotes.splice(existingIdx, 1);
    } else {
      // TOGGLE ON — add vote
      rev.helpfulVotes.push({ userId: req.user.id });
    }

    rev.reviewHelpfulCount = rev.helpfulVotes.length;
    await rev.save();
    res.json({ reviewHelpfulCount: rev.reviewHelpfulCount, voted: existingIdx === -1 });
  } catch (err) {
    console.error('markHelpful error:', err);
    res.status(500).json({ message: 'Failed to toggle helpful vote.' });
  }
};

// ── POST /:id/report — report a review ────────────────────────────────────────

exports.reportReview = async (req, res) => {
  try {
    const { reason } = req.body;
    const validReasons = ['spam', 'offensive', 'irrelevant', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ message: 'Valid reason required: spam, offensive, irrelevant, or other.' });
    }

    const rev = await PropertyReview.findById(req.params.id);
    if (!rev) return res.status(404).json({ message: 'Review not found.' });

    rev.reportCount++;
    if (rev.status === 'active') {
      rev.status    = 'reported';
      rev.reportedAt = new Date();
    }
    await rev.save();
    await updatePropertyReputationAggregates(rev.propertyIdentityId);
    res.json({ message: 'Report submitted.' });
  } catch (err) {
    console.error('reportReview error:', err);
    res.status(500).json({ message: 'Failed to report review.' });
  }
};

// ── PATCH /:id/moderate — admin moderation ────────────────────────────────────

exports.moderateReview = async (req, res) => {
  try {
    const { status, moderatorNotes } = req.body;
    const validStatuses = ['active', 'hidden'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'status must be active or hidden.' });
    }

    const rev = await PropertyReview.findById(req.params.id);
    if (!rev) return res.status(404).json({ message: 'Review not found.' });

    rev.status      = status;
    rev.moderatedAt = new Date();
    if (moderatorNotes !== undefined) rev.moderatorNotes = moderatorNotes;
    await rev.save();
    await updatePropertyReputationAggregates(rev.propertyIdentityId);
    res.json(rev);
  } catch (err) {
    console.error('moderateReview error:', err);
    res.status(500).json({ message: 'Failed to moderate review.' });
  }
};

// ── DELETE /:id/admin — admin hard delete ─────────────────────────────────────

exports.adminDeleteReview = async (req, res) => {
  try {
    const rev = await PropertyReview.findById(req.params.id);
    if (!rev) return res.status(404).json({ message: 'Review not found.' });
    const identityId = rev.propertyIdentityId;
    await rev.deleteOne();
    await updatePropertyReputationAggregates(identityId);
    res.json({ message: 'Review permanently deleted.' });
  } catch (err) {
    console.error('adminDeleteReview error:', err);
    res.status(500).json({ message: 'Failed to delete review.' });
  }
};
