const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../middleware/roleMiddleware');
const Property = require('../models/Property');
const User = require('../models/User');
const Report = require('../models/Report');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { recalculateAndStoreQuality } = require('../lib/listingQuality');
const { getListingRankScore }    = require('../lib/ranking/listingRanking');
const { expireStalePromotions }  = require('../lib/promotion/expirePromotions');
const { VALID_TIERS, TIER_SCORES } = require('../lib/promotion/constants');

// Get admin dashboard stats
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalListings = await Property.countDocuments();
    const activeListings = await Property.countDocuments({ listingStatus: { $in: ['for-sale', 'for-rent'] } });
    const soldListings = await Property.countDocuments({ listingStatus: 'sold' });
    const rentedListings = await Property.countDocuments({ listingStatus: 'rented' });
    
    // Get listings by type
    const buyListings = await Property.countDocuments({ listingStatus: 'for-sale' });
    const rentListings = await Property.countDocuments({ listingStatus: 'for-rent' });
    
    // Get users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    // Get recent listings (last 30 days)
    const newListings = await Property.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    res.json({
      totalUsers,
      totalListings,
      activeListings,
      soldListings,
      rentedListings,
      buyListings,
      rentListings,
      usersByRole,
      newUsers,
      newListings
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Error fetching admin stats', error: error.message });
  }
});

// Get all listings for admin with filters
router.get('/listings', verifyToken, isAdmin, async (req, res) => {
  try {
    const { search, status, type, category, sortBy, order } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) query.listingStatus = status;
    if (type) query.propertyType = type;
    if (category) query.purpose = category;
    
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1; // Default: newest first
    }
    
    // moderationPriority sort: always descending (highest risk first) when requested
    if (sortBy === 'moderationPriority') {
      sortOptions.moderationPriority = -1;
    }

    const properties = await Property.find(query)
      .populate('ownerId', 'name lastName email role verified accountType')
      .sort(sortOptions)
      .select('+moderationPriority +moderationReasons +flaggedForReview +reportCount');
    
    res.json(properties);
  } catch (error) {
    console.error('Admin listings error:', error);
    res.status(500).json({ message: 'Error fetching listings', error: error.message });
  }
});

// Approve property — makes it publicly visible, stores moderation note
router.put('/properties/:id/approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const { note } = req.body;

    const update = {
      $set: {
        isApproved: true,
        status:     'active',
        approvedBy: req.user.id,
        approvedAt: new Date(),
      },
    };

    if (note?.trim()) {
      update.$push = {
        moderationNotes: {
          adminId:   req.user.id,
          action:    'approved',
          note:      note.trim(),
          createdAt: new Date(),
        },
      };
    }

    const property = await Property.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // isApproved is a positive quality signal — rescore async
    recalculateAndStoreQuality(property._id, property.ownerId)
      .catch(err => console.error('[quality] rescore on admin approve:', err));

    res.json({ message: 'Property approved', property });
  } catch (error) {
    console.error('Approve property error:', error);
    res.status(500).json({ message: 'Error approving property', error: error.message });
  }
});

// Reject property — removes from public inventory, stores structured reason + note
router.put('/properties/:id/reject', verifyToken, isAdmin, async (req, res) => {
  try {
    const { reason, note } = req.body;

    const update = {
      $set: { isApproved: false, status: 'pending' },
    };

    if (reason || note?.trim()) {
      update.$push = {
        moderationNotes: {
          adminId:   req.user.id,
          action:    'rejected',
          ...(reason      ? { reason }          : {}),
          ...(note?.trim() ? { note: note.trim() } : {}),
          createdAt: new Date(),
        },
      };
    }

    const property = await Property.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // isApproved revoked — rescore quality
    recalculateAndStoreQuality(property._id, property.ownerId)
      .catch(err => console.error('[quality] rescore on admin reject:', err));

    res.json({ message: 'Property rejected', property });
  } catch (error) {
    console.error('Reject property error:', error);
    res.status(500).json({ message: 'Error rejecting property', error: error.message });
  }
});

// Bulk approve properties
router.post('/properties/bulk-approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid property IDs' });
    }
    
    const result = await Property.updateMany(
      { _id: { $in: ids } },
      { isApproved: true, status: 'active' }
    );

    res.json({ message: `${result.modifiedCount} properties approved`, result });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({ message: 'Error bulk approving properties', error: error.message });
  }
});

// Bulk delete properties
router.post('/properties/bulk-delete', verifyToken, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid property IDs' });
    }
    
    const result = await Property.deleteMany({ _id: { $in: ids } });
    
    res.json({ message: `${result.deletedCount} properties deleted`, result });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Error bulk deleting properties', error: error.message });
  }
});

// Get recent activity
router.get('/activity', verifyToken, isAdmin, async (req, res) => {
  try {
    // Get last 20 listings
    const recentListings = await Property.find()
      .populate('ownerId', 'name lastName')
      .sort({ createdAt: -1 })
      .limit(20)
      .select('title createdAt listingStatus price ownerId');
    
    // Get last 20 users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name lastName email role createdAt');
    
    // Combine and sort by date
    const activity = [
      ...recentListings.map(l => ({
        type: 'listing',
        action: 'created',
        user: l.ownerId ? `${l.ownerId.name} ${l.ownerId.lastName || ''}` : 'Unknown',
        details: l.title,
        timestamp: l.createdAt
      })),
      ...recentUsers.map(u => ({
        type: 'user',
        action: 'registered',
        user: `${u.name} ${u.lastName || ''}`,
        details: `Role: ${u.role}`,
        timestamp: u.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
    
    res.json(activity);
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ message: 'Error fetching activity', error: error.message });
  }
});

// ─── Marketplace Operations Dashboard ────────────────────────────────────────
router.get('/ops-dashboard', verifyToken, isAdmin, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      // Moderation
      pendingListings,
      flaggedListings,
      suspectedDuplicates,
      openReports,
      avgReviewAgg,

      // Trust
      totalUsers,
      phoneVerifiedUsers,
      verifiedUsers,
      totalListings,
      ownershipReviewedListings,

      // Activity — today
      listingsCreatedToday,
      listingsApprovedToday,
      inquiriesToday,

      // Conversion — totals
      inquiryTotalsAgg,
      phoneRevealTotalsAgg,
      activeListings,
    ] = await Promise.all([
      // Moderation
      Property.countDocuments({ status: 'pending' }),
      Property.countDocuments({ flaggedForReview: true }),
      Property.countDocuments({ suspectedDuplicate: true }),
      Report.countDocuments({ status: { $in: ['open', 'reviewing'] } }),
      Property.aggregate([
        { $match: { isApproved: true, approvedAt: { $exists: true }, createdAt: { $exists: true } } },
        { $project: { ms: { $subtract: ['$approvedAt', '$createdAt'] } } },
        { $group: { _id: null, avg: { $avg: '$ms' } } },
      ]),

      // Trust
      User.countDocuments(),
      User.countDocuments({ phoneVerified: true }),
      User.countDocuments({ verified: true }),
      Property.countDocuments(),
      Property.countDocuments({ ownershipVerificationStatus: 'approved' }),

      // Activity
      Property.countDocuments({ createdAt: { $gte: startOfDay } }),
      Property.countDocuments({ approvedAt: { $gte: startOfDay }, isApproved: true }),
      Message.countDocuments({
        property: { $ne: null },
        subject: { $regex: '^Property Inquiry:', $options: 'i' },
        createdAt: { $gte: startOfDay },
      }),

      // Conversion totals
      Property.aggregate([
        { $group: { _id: null, totalInquiries: { $sum: '$inquiryCount' }, totalReveals: { $sum: '$phoneRevealCount' } } },
      ]),
      Property.aggregate([
        { $group: { _id: null, totalReveals: { $sum: '$phoneRevealCount' } } },
      ]),
      Property.countDocuments({ status: 'active', isApproved: true }),
    ]);

    const avgReviewMs   = avgReviewAgg[0]?.avg || 0;
    const avgReviewHours = Math.round(avgReviewMs / 3_600_000 * 10) / 10;

    const totalInquiries   = inquiryTotalsAgg[0]?.totalInquiries  || 0;
    const totalPhoneReveals = inquiryTotalsAgg[0]?.totalReveals   || 0;

    const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

    // Responsiveness summary — runs in parallel as a separate set
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3_600_000);
    const [
      sellersWithLowRate,
      sellersWithSlowResponse,
      sellersInactive30d,
      responseRateAgg,
    ] = await Promise.all([
      User.countDocuments({ responseRate: { $lt: 50 } }),
      User.countDocuments({ averageResponseTimeHours: { $gt: 24 } }),
      User.countDocuments({ responseRate: { $ne: null }, lastResponseAt: { $lt: thirtyDaysAgo } }),
      User.aggregate([
        { $match: { responseRate: { $ne: null } } },
        { $group: { _id: null, avgRate: { $avg: '$responseRate' }, avgHours: { $avg: '$averageResponseTimeHours' } } },
      ]),
    ]);

    res.json({
      moderation: {
        pendingListings,
        flaggedListings,
        suspectedDuplicates,
        openReports,
        avgReviewHours,
      },
      trust: {
        totalUsers,
        phoneVerifiedUsers,
        phoneVerifiedPct:        pct(phoneVerifiedUsers, totalUsers),
        verifiedUsers,
        verifiedUsersPct:         pct(verifiedUsers, totalUsers),
        totalListings,
        ownershipReviewedListings,
        ownershipReviewedPct:     pct(ownershipReviewedListings, totalListings),
        suspectedDuplicates,
        duplicateDetectionRate:   pct(suspectedDuplicates, totalListings),
      },
      activity: {
        inquiriesToday,
        listingsCreatedToday,
        listingsApprovedToday,
        totalPhoneReveals,
      },
      conversion: {
        activeListings,
        totalInquiries,
        totalPhoneReveals,
        inquiryPerListing:     activeListings > 0 ? Math.round((totalInquiries   / activeListings) * 100) / 100 : 0,
        phoneRevealPerListing: activeListings > 0 ? Math.round((totalPhoneReveals / activeListings) * 100) / 100 : 0,
      },
      responsiveness: {
        sellersWithLowRate,
        sellersWithSlowResponse,
        sellersInactive30d,
        overallResponseRate:       responseRateAgg[0]?.avgRate  != null ? Math.round(responseRateAgg[0].avgRate)               : null,
        overallAvgResponseHours:   responseRateAgg[0]?.avgHours != null ? Math.round(responseRateAgg[0].avgHours * 10) / 10    : null,
      },
    });
  } catch (err) {
    console.error('[ops-dashboard] error:', err);
    res.status(500).json({ message: 'Failed to load operations dashboard.' });
  }
});

// ─── Seller Responsiveness — detailed list ────────────────────────────────────
router.get('/seller-responsiveness', verifyToken, isAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3_600_000);

    // Only examine sellers who have at least one tracked inquiry
    const activeSellers = await Conversation.distinct('seller');

    const SELECT = 'name lastName email responseRate averageResponseTimeHours lastResponseAt createdAt';

    const [lowRate, slow, inactive] = await Promise.all([
      // Response rate below 50 %
      User.find({ _id: { $in: activeSellers }, responseRate: { $lt: 50 } })
        .select(SELECT).sort({ responseRate: 1 }).limit(30).lean(),

      // Average response time > 24 h
      User.find({ _id: { $in: activeSellers }, averageResponseTimeHours: { $gt: 24 } })
        .select(SELECT).sort({ averageResponseTimeHours: -1 }).limit(30).lean(),

      // Has had inquiries but last response was 30+ days ago (or never)
      User.find({
        _id: { $in: activeSellers },
        $or: [
          { lastResponseAt: { $lt: thirtyDaysAgo } },
          { lastResponseAt: null },
        ],
      }).select(SELECT).sort({ lastResponseAt: 1 }).limit(30).lean(),
    ]);

    res.json({ lowRate, slow, inactive });
  } catch (err) {
    console.error('[seller-responsiveness] error:', err);
    res.status(500).json({ message: 'Failed to load seller responsiveness data.' });
  }
});

// ─── Promotion management ─────────────────────────────────────────────────────
// Admin-only override until payment system exists.
// Recomputes finalScore immediately after updating promotion fields.
router.put('/properties/:id/promotion', verifyToken, isAdmin, async (req, res) => {
  try {
    const { promotionTier, promotionStartDate, promotionEndDate } = req.body;

    if (promotionTier && !VALID_TIERS.includes(promotionTier)) {
      return res.status(400).json({
        message: `Invalid promotionTier. Must be one of: ${VALID_TIERS.join(', ')}`,
      });
    }

    const tier       = promotionTier || 'FREE';
    const isPromoted = tier !== 'FREE';

    const promotionUpdate = {
      promotionTier:      tier,
      promotionScore:     TIER_SCORES[tier],
      isPromoted,
      promotionStartDate: promotionStartDate ? new Date(promotionStartDate) : null,
      promotionEndDate:   promotionEndDate   ? new Date(promotionEndDate)   : null,
    };

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      promotionUpdate,
      { new: true },
    ).lean();

    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Recompute and persist finalScore with the updated promotion state
    const { finalScore } = getListingRankScore(property);
    await Property.findByIdAndUpdate(req.params.id, { finalScore });

    res.json({
      message:        'Promotion updated',
      promotionTier:  tier,
      promotionScore: TIER_SCORES[tier],
      finalScore,
      isPromoted,
    });
  } catch (err) {
    console.error('[admin] promotion update error:', err);
    res.status(500).json({ message: 'Failed to update promotion' });
  }
});

// Manual trigger for promotion expiration (until cron is configured in Phase 5.3)
router.post('/promotions/expire-stale', verifyToken, isAdmin, async (req, res) => {
  try {
    const count = await expireStalePromotions();
    res.json({ message: `Reset ${count} expired promotion(s) to FREE`, count });
  } catch (err) {
    console.error('[admin] expire-stale error:', err);
    res.status(500).json({ message: 'Failed to expire promotions' });
  }
});

module.exports = router;
