const Report = require('../models/Report');
const Property = require('../models/Property');
const { calculateModerationPriority } = require('../lib/moderationScore');
const { recalculateAndStoreQuality } = require('../lib/listingQuality');
const { applyEscalationToProperty } = require('../lib/reportEscalation');

// Thresholds for auto-moderation
const FLAG_THRESHOLD = 3;  // flaggedForReview = true
const HIDE_THRESHOLD = 5;  // status = 'pending' (temporarily hidden)

// POST /api/reports
exports.submitReport = async (req, res) => {
  try {
    const { targetType, targetId, category, description } = req.body;

    if (!targetType || !targetId || !category) {
      return res.status(400).json({ message: 'targetType, targetId, and category are required.' });
    }

    const validCategories =
      targetType === 'property'
        ? Report.PROPERTY_CATEGORIES
        : Report.USER_CATEGORIES;

    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category for this target type.' });
    }

    const report = await Report.create({
      targetType,
      targetId,
      targetModelName: targetType === 'property' ? 'Property' : 'User',
      reporterId: req.user.id,
      category,
      description: description?.trim() || undefined,
    });

    // Auto-moderation: update property stats
    if (targetType === 'property') {
      const count = await Report.countDocuments({ targetId, targetType: 'property' });

      const update = { reportCount: count };
      if (count >= HIDE_THRESHOLD) {
        update.status = 'pending';
        update.flaggedForReview = true;
      } else if (count >= FLAG_THRESHOLD) {
        update.flaggedForReview = true;
      }

      await Property.findByIdAndUpdate(targetId, update);

      // Rescore moderation priority after report count changes
      const prop = await Property.findById(targetId).select('ownerId').lean();
      if (prop) {
        calculateModerationPriority(targetId, prop.ownerId)
          .then(({ score, reasons }) =>
            Property.findByIdAndUpdate(targetId, { moderationPriority: score, moderationReasons: reasons })
          )
          .catch((err) => console.error('[moderation] score error on report submit:', err));

        recalculateAndStoreQuality(targetId, prop.ownerId)
          .catch((err) => console.error('[quality] score error on report submit:', err));

        // Apply escalation logic — bumps priority for repeat/trusted reporters
        applyEscalationToProperty(targetId, prop.ownerId)
          .catch((err) => console.error('[escalation] error on report submit:', err));
      }
    }

    res.status(201).json({ message: 'Report submitted. Thank you for helping keep the platform safe.' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already reported this listing.' });
    }
    console.error('submitReport error:', err);
    res.status(500).json({ message: 'Failed to submit report.' });
  }
};

// GET /api/reports  (admin)
exports.getReports = async (req, res) => {
  try {
    const { status, targetType, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (targetType) query.targetType = targetType;

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('reporterId', 'name lastName email')
        .populate('reviewedBy', 'name lastName'),
      Report.countDocuments(query),
    ]);

    res.json({
      reports,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('getReports error:', err);
    res.status(500).json({ message: 'Failed to fetch reports.' });
  }
};

// GET /api/reports/stats  (admin)
exports.getReportStats = async (req, res) => {
  try {
    const [open, reviewing, resolved, dismissed] = await Promise.all([
      Report.countDocuments({ status: 'open' }),
      Report.countDocuments({ status: 'reviewing' }),
      Report.countDocuments({ status: 'resolved' }),
      Report.countDocuments({ status: 'dismissed' }),
    ]);
    res.json({ open, reviewing, resolved, dismissed, total: open + reviewing + resolved + dismissed });
  } catch (err) {
    console.error('getReportStats error:', err);
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
};

// PATCH /api/reports/:id  (admin)
exports.updateReport = async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    const validStatuses = ['open', 'reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const update = {
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    };
    if (resolutionNote) update.resolutionNote = resolutionNote.trim();

    const report = await Report.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('reporterId', 'name lastName email')
      .populate('reviewedBy', 'name lastName');

    if (!report) return res.status(404).json({ message: 'Report not found.' });

    // If resolved/dismissed a property report, recalculate and potentially restore
    if (report.targetType === 'property' && (status === 'resolved' || status === 'dismissed')) {
      const openCount = await Report.countDocuments({
        targetId: report.targetId,
        targetType: 'property',
        status: { $in: ['open', 'reviewing'] },
      });

      const propertyUpdate = { reportCount: openCount };
      if (openCount < FLAG_THRESHOLD) {
        propertyUpdate.flaggedForReview = false;
      }
      if (openCount < HIDE_THRESHOLD) {
        // Restore to active only if property was previously active
        // Use $cond-equivalent: only restore if currently pending due to reports
        await Property.findOneAndUpdate(
          { _id: report.targetId, status: 'pending', isApproved: true },
          { ...propertyUpdate, status: 'active' }
        );
        await Property.findOneAndUpdate(
          { _id: report.targetId, status: { $ne: 'pending' } },
          propertyUpdate
        );
      } else {
        await Property.findByIdAndUpdate(report.targetId, propertyUpdate);
      }
    }

    // Rescore moderation priority whenever a property report changes status
    if (report.targetType === 'property') {
      const prop = await Property.findById(report.targetId).select('ownerId').lean();
      if (prop) {
        calculateModerationPriority(report.targetId, prop.ownerId)
          .then(({ score, reasons }) =>
            Property.findByIdAndUpdate(report.targetId, { moderationPriority: score, moderationReasons: reasons })
          )
          .catch((err) => console.error('[moderation] score error on report update:', err));

        recalculateAndStoreQuality(report.targetId, prop.ownerId)
          .catch((err) => console.error('[quality] score error on report update:', err));

        applyEscalationToProperty(report.targetId, prop.ownerId)
          .catch((err) => console.error('[escalation] error on report update:', err));
      }
    }

    res.json({ message: 'Report updated.', report });
  } catch (err) {
    console.error('updateReport error:', err);
    res.status(500).json({ message: 'Failed to update report.' });
  }
};
