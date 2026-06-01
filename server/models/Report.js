const mongoose = require('mongoose');

const PROPERTY_CATEGORIES = [
  'fake-listing',
  'wrong-price',
  'duplicate-listing',
  'scam-fraud',
  'already-sold-rented',
  'offensive-content',
];

const USER_CATEGORIES = [
  'suspicious-behavior',
  'scam-attempt',
  'harassment',
];

const reportSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['property', 'user'],
    required: true,
  },
  // refPath model names must match registered Mongoose model names
  targetModelName: {
    type: String,
    enum: ['Property', 'User'],
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    required: true,
    validate: {
      validator(v) {
        return [...PROPERTY_CATEGORIES, ...USER_CATEGORIES].includes(v);
      },
      message: 'Invalid category.',
    },
  },
  description: { type: String, maxlength: 1000 },
  status: {
    type: String,
    enum: ['open', 'reviewing', 'resolved', 'dismissed'],
    default: 'open',
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  resolutionNote: { type: String, maxlength: 1000 },

  // Escalation tracking
  escalationLevel: {
    type: String,
    enum: ['normal', 'elevated', 'urgent'],
    default: 'normal',
  },
}, { timestamps: true });

// One report per reporter per target
reportSchema.index({ targetId: 1, reporterId: 1 }, { unique: true });

reportSchema.statics.PROPERTY_CATEGORIES = PROPERTY_CATEGORIES;
reportSchema.statics.USER_CATEGORIES = USER_CATEGORIES;

module.exports = mongoose.model('Report', reportSchema);
