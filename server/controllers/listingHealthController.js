const Property = require('../models/Property');
const {
  computeStaleness,
  computePhotoHygiene,
  computePriceOutlier,
  computeVisibilityScore,
} = require('../lib/staleDetection');

exports.getMyListingsHealth = async (req, res) => {
  try {
    const properties = await Property.find({ ownerId: req.user.id }).lean();

    const health = properties.map((p) => {
      const staleness  = computeStaleness(p);
      const photo      = computePhotoHygiene(p);
      const visibility = computeVisibilityScore(p, staleness, photo);

      const issues = [
        staleness.level !== 'fresh'    && `Listing ${staleness.level} (${staleness.days}d inactive)`,
        staleness.needsReconfirm       && 'Please confirm this listing is still available',
        photo.note,
        p.flaggedForReview             && 'Listing flagged for review',
      ].filter(Boolean);

      return {
        _id:           p._id,
        title:         p.title,
        status:        p.status,
        staleness,
        photo,
        visibility,
        needsAttention: staleness.level !== 'fresh' || photo.score < 65 || p.flaggedForReview,
        issues,
      };
    });

    const summary = {
      total:           health.length,
      needsAttention:  health.filter((h) => h.needsAttention).length,
      staleOrCritical: health.filter((h) => ['stale', 'critical'].includes(h.staleness.level)).length,
      noPhotos:        health.filter((h) => h.photo.count === 0).length,
      needsReconfirm:  health.filter((h) => h.staleness.needsReconfirm).length,
    };

    res.json({ health, summary });
  } catch (err) {
    console.error('getMyListingsHealth error:', err);
    res.status(500).json({ message: 'Failed to compute listing health' });
  }
};

exports.confirmAvailability = async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!property) return res.status(404).json({ message: 'Listing not found' });

    property.lastConfirmedAvailableAt = new Date();
    property.lastOwnerActivityAt      = new Date();
    await property.save();

    res.json({ message: 'Availability confirmed', lastConfirmedAvailableAt: property.lastConfirmedAvailableAt });
  } catch (err) {
    console.error('confirmAvailability error:', err);
    res.status(500).json({ message: 'Failed to confirm availability' });
  }
};
