const User = require('../models/User');
const Property = require('../models/Property');
const Report = require('../models/Report');
const { computeEscalation } = require('../lib/reportEscalation');

// ─── Linked accounts ──────────────────────────────────────────────────────────
// Accounts sharing the same phone number are flagged as potentially coordinated.

exports.getLinkedAccounts = async (req, res) => {
  try {
    const groups = await User.aggregate([
      { $match: { phone: { $exists: true, $ne: null, $ne: '' } } },
      {
        $group: {
          _id: '$phone',
          count: { $sum: 1 },
          users: {
            $push: {
              id:        '$_id',
              name:      '$name',
              lastName:  '$lastName',
              email:     '$email',
              role:      '$role',
              isBlocked: '$isBlocked',
              createdAt: '$createdAt',
            },
          },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 60 },
    ]);

    res.json({ groups });
  } catch (err) {
    console.error('[adminAbuse] getLinkedAccounts:', err);
    res.status(500).json({ message: 'Failed to load linked accounts.' });
  }
};

// ─── Repeat offenders ─────────────────────────────────────────────────────────

exports.getRepeatOffenders = async (req, res) => {
  try {
    const [blockedUsers, reportedUsers] = await Promise.all([
      User.find({ isBlocked: true })
        .select('name lastName email phone createdAt isBlocked accountType role')
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean(),

      Report.aggregate([
        { $match: { targetType: 'user', status: 'resolved' } },
        { $group: { _id: '$targetId', resolvedCount: { $sum: 1 } } },
        { $match: { resolvedCount: { $gte: 2 } } },
        { $sort:  { resolvedCount: -1 } },
        { $limit: 30 },
        {
          $lookup: {
            from:         'users',
            localField:   '_id',
            foreignField: '_id',
            as:           'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmpty: false } },
        {
          $project: {
            resolvedCount: 1,
            'user.name':      1,
            'user.lastName':  1,
            'user.email':     1,
            'user.isBlocked': 1,
            'user.createdAt': 1,
            'user.role':      1,
          },
        },
      ]),
    ]);

    res.json({ blockedUsers, reportedUsers });
  } catch (err) {
    console.error('[adminAbuse] getRepeatOffenders:', err);
    res.status(500).json({ message: 'Failed to load repeat offenders.' });
  }
};

// ─── Flagged listings ─────────────────────────────────────────────────────────

exports.getFlaggedListings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const flagFilter = {
      $or: [
        { flaggedForReview: true },
        { suspectedDuplicate: true },
        { moderationPriority: { $gte: 4 } },
        { agentScore: { $gte: 3 } },
      ],
    };

    const [listings, total] = await Promise.all([
      Property.find(flagFilter)
        .select('title city status flaggedForReview reportCount suspectedDuplicate duplicateReasons moderationPriority moderationReasons agentScore agentSignals reportEscalationLevel createdAt ownerId')
        .populate('ownerId', 'name email accountType isBlocked')
        .sort({ moderationPriority: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Property.countDocuments(flagFilter),
    ]);

    res.json({ listings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('[adminAbuse] getFlaggedListings:', err);
    res.status(500).json({ message: 'Failed to load flagged listings.' });
  }
};

// ─── User abuse history ───────────────────────────────────────────────────────

exports.getUserAbuseHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const [user, listings, reportsAgainst, reportsMade] = await Promise.all([
      User.findById(userId)
        .select('name lastName email phone isBlocked accountType role createdAt emailVerified phoneVerified ownershipVerified totalListings')
        .lean(),

      Property.find({ ownerId: userId })
        .select('title status flaggedForReview reportCount suspectedDuplicate moderationPriority agentScore createdAt')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),

      Report.find({ targetType: 'user', targetId: userId })
        .select('category status createdAt description')
        .sort({ createdAt: -1 })
        .lean(),

      Report.find({ reporterId: userId })
        .select('targetType targetId category status createdAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Summary stats
    const flaggedListings    = listings.filter((l) => l.flaggedForReview || l.suspectedDuplicate).length;
    const highRiskListings   = listings.filter((l) => l.moderationPriority >= 4).length;
    const agentFlaggedCount  = listings.filter((l) => l.agentScore >= 3).length;
    const upheldReportsMade  = reportsMade.filter((r) => r.status === 'resolved').length;

    res.json({
      user,
      listings,
      reportsAgainst,
      reportsMade,
      summary: {
        totalListings:    listings.length,
        flaggedListings,
        highRiskListings,
        agentFlaggedCount,
        upheldReportsMade,
        reportsMadeCount: reportsMade.length,
        reportsAgainstCount: reportsAgainst.length,
      },
    });
  } catch (err) {
    console.error('[adminAbuse] getUserAbuseHistory:', err);
    res.status(500).json({ message: 'Failed to load user history.' });
  }
};

// ─── Bulk moderation actions ──────────────────────────────────────────────────

exports.bulkAction = async (req, res) => {
  try {
    const { action, targetIds, targetType, reason } = req.body;

    if (!action || !Array.isArray(targetIds) || targetIds.length === 0) {
      return res.status(400).json({ message: 'action and targetIds array are required.' });
    }
    if (targetIds.length > 100) {
      return res.status(400).json({ message: 'Max 100 targets per bulk action.' });
    }

    let modifiedCount = 0;

    if (targetType === 'user') {
      const allowedActions = ['block', 'unblock'];
      if (!allowedActions.includes(action)) {
        return res.status(400).json({ message: `Invalid action for user targets: ${action}` });
      }
      const update = action === 'block'
        ? { isBlocked: true, isActive: false }
        : { isBlocked: false, isActive: true };

      const result = await User.updateMany({ _id: { $in: targetIds } }, update);
      modifiedCount = result.modifiedCount;
    } else if (targetType === 'property') {
      const allowedActions = ['archive', 'approve', 'flag', 'unflag'];
      if (!allowedActions.includes(action)) {
        return res.status(400).json({ message: `Invalid action for property targets: ${action}` });
      }

      let update;
      if (action === 'archive')  update = { status: 'paused', flaggedForReview: true };
      if (action === 'approve')  update = { isApproved: true, status: 'active', flaggedForReview: false };
      if (action === 'flag')     update = { flaggedForReview: true };
      if (action === 'unflag')   update = { flaggedForReview: false };

      const result = await Property.updateMany({ _id: { $in: targetIds } }, update);
      modifiedCount = result.modifiedCount;
    } else {
      return res.status(400).json({ message: 'targetType must be user or property.' });
    }

    res.json({ message: 'Action applied.', modifiedCount });
  } catch (err) {
    console.error('[adminAbuse] bulkAction:', err);
    res.status(500).json({ message: 'Failed to apply bulk action.' });
  }
};

// ─── Overview stats ───────────────────────────────────────────────────────────

exports.getAbuseStats = async (req, res) => {
  try {
    const [
      flaggedListings,
      suspectedDuplicates,
      blockedUsers,
      urgentEscalations,
      agentFlagged,
      openReports,
    ] = await Promise.all([
      Property.countDocuments({ flaggedForReview: true }),
      Property.countDocuments({ suspectedDuplicate: true }),
      User.countDocuments({ isBlocked: true }),
      Property.countDocuments({ reportEscalationLevel: 'urgent' }),
      Property.countDocuments({ agentScore: { $gte: 4 } }),
      Report.countDocuments({ status: { $in: ['open', 'reviewing'] } }),
    ]);

    res.json({
      flaggedListings,
      suspectedDuplicates,
      blockedUsers,
      urgentEscalations,
      agentFlagged,
      openReports,
    });
  } catch (err) {
    console.error('[adminAbuse] getAbuseStats:', err);
    res.status(500).json({ message: 'Failed to load stats.' });
  }
};
