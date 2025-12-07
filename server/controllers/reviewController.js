const Review = require('../models/Review');
const User = require('../models/User');
const Property = require('../models/Property');
const mongoose = require('mongoose');

// @desc    Get all reviews for a realtor
// @route   GET /api/reviews/realtor/:realtorId
// @access  Public
exports.getRealtorReviews = async (req, res) => {
  try {
    const { realtorId } = req.params;
    const { status = 'approved', page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ 
      realtorId, 
      status: status === 'all' ? { $in: ['pending', 'approved', 'rejected'] } : status 
    })
      .populate('reviewerId', 'name email accountType')
      .populate('propertyId', 'title address')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ realtorId, status });

    // Calculate statistics
    const stats = await Review.aggregate([
      { $match: { realtorId: new mongoose.Types.ObjectId(realtorId), status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          avgProfessionalism: { $avg: '$professionalism' },
          avgCommunication: { $avg: '$communication' },
          avgMarketKnowledge: { $avg: '$marketKnowledge' },
          avgNegotiationSkills: { $avg: '$negotiationSkills' }
        }
      }
    ]);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0
      }
    });
  } catch (err) {
    console.error('Error fetching realtor reviews:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get reviews by user
// @route   GET /api/reviews/my-reviews
// @access  Private
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewerId: req.user.id })
      .populate('realtorId', 'name email accountType')
      .populate('propertyId', 'title address')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error('Error fetching user reviews:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const {
      realtorId,
      propertyId,
      transactionType,
      rating,
      professionalism,
      communication,
      marketKnowledge,
      negotiationSkills,
      title,
      comment,
      transactionDate,
      transactionValue,
      wouldRecommend
    } = req.body;

    // Verify realtor exists and is actually a realtor
    const realtor = await User.findById(realtorId);
    if (!realtor) {
      return res.status(404).json({ success: false, message: 'Realtor not found' });
    }
    if (realtor.accountType !== 'realtor' && realtor.accountType !== 'corporate' && realtor.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'User is not a realtor' });
    }

    // Prevent self-review
    if (realtorId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot review yourself' });
    }

    // Check if user already reviewed this realtor
    const existingReview = await Review.findOne({ 
      realtorId, 
      reviewerId: req.user.id 
    });
    
    if (existingReview) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this realtor' 
      });
    }

    // Verify property if provided
    let isVerified = false;
    let verificationMethod = 'none';
    
    if (propertyId) {
      const property = await Property.findById(propertyId);
      if (property) {
        // Check if user was involved with this property
        if (property.ownerId.toString() === realtorId || 
            property.ownerId.toString() === req.user.id) {
          isVerified = true;
          verificationMethod = 'property-transaction';
        }
      }
    }

    const review = await Review.create({
      realtorId,
      reviewerId: req.user.id,
      propertyId,
      transactionType,
      rating,
      professionalism,
      communication,
      marketKnowledge,
      negotiationSkills,
      title,
      comment,
      transactionDate,
      transactionValue,
      wouldRecommend,
      isVerified,
      verificationMethod,
      status: 'pending' // Admin approval required
    });

    const populatedReview = await Review.findById(review._id)
      .populate('reviewerId', 'name email accountType')
      .populate('realtorId', 'name email accountType');

    res.status(201).json({ 
      success: true, 
      data: populatedReview,
      message: 'Review submitted and pending approval'
    });
  } catch (err) {
    console.error('Error creating review:', err);
    if (err.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this realtor' 
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Only review owner can update
    if (review.reviewerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const {
      rating,
      professionalism,
      communication,
      marketKnowledge,
      negotiationSkills,
      title,
      comment,
      wouldRecommend
    } = req.body;

    review.rating = rating || review.rating;
    review.professionalism = professionalism || review.professionalism;
    review.communication = communication || review.communication;
    review.marketKnowledge = marketKnowledge || review.marketKnowledge;
    review.negotiationSkills = negotiationSkills || review.negotiationSkills;
    review.title = title || review.title;
    review.comment = comment || review.comment;
    review.wouldRecommend = wouldRecommend !== undefined ? wouldRecommend : review.wouldRecommend;
    review.status = 'pending'; // Re-submit for approval after edit

    await review.save();

    res.json({ success: true, data: review });
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Only review owner or admin can delete
    if (review.reviewerId.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await review.deleteOne();

    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Realtor response to review
// @route   POST /api/reviews/:id/response
// @access  Private (Realtor only)
exports.respondToReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Only the realtor being reviewed can respond
    if (review.realtorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    review.realtorResponse = {
      comment: req.body.comment,
      respondedAt: new Date()
    };

    await review.save();

    res.json({ success: true, data: review });
  } catch (err) {
    console.error('Error responding to review:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Check if user already voted
    const alreadyVoted = review.helpfulVotes.some(
      vote => vote.userId.toString() === req.user.id
    );

    if (alreadyVoted) {
      // Remove vote
      review.helpfulVotes = review.helpfulVotes.filter(
        vote => vote.userId.toString() !== req.user.id
      );
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    } else {
      // Add vote
      review.helpfulVotes.push({ userId: req.user.id });
      review.helpfulCount += 1;
    }

    await review.save();

    res.json({ success: true, data: { helpfulCount: review.helpfulCount } });
  } catch (err) {
    console.error('Error marking review helpful:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Approve/reject review (Admin only)
// @route   PUT /api/reviews/:id/moderate
// @access  Private (Admin)
exports.moderateReview = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.status = status;
    await review.save();

    res.json({ success: true, data: review });
  } catch (err) {
    console.error('Error moderating review:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Flag review
// @route   POST /api/reviews/:id/flag
// @access  Private
exports.flagReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.isFlagged = true;
    review.flagReason = req.body.reason || 'No reason provided';
    await review.save();

    res.json({ success: true, message: 'Review flagged for moderation' });
  } catch (err) {
    console.error('Error flagging review:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
