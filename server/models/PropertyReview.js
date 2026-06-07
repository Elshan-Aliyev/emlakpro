'use strict';
const mongoose = require('mongoose');

const REVIEW_TYPES = ['buyer-experience', 'rental-experience', 'general-feedback'];
const STATUSES     = ['active', 'reported', 'hidden'];

const propertyReviewSchema = new mongoose.Schema({
  propertyIdentityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'PropertyIdentity',
    required: true,
    index:    true,
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
    required: true,
  },
  reviewType: { type: String, enum: REVIEW_TYPES, required: true },
  rating:     { type: Number, min: 1, max: 5, required: true },
  title:      { type: String, maxlength: 120, default: '' },
  review:     { type: String, minlength: 20, maxlength: 2000, required: true },
  recommended: { type: Boolean, default: true },

  ownerResponse: {
    text:        { type: String, maxlength: 1000 },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date },
    updatedAt:   { type: Date },
  },

  status:      { type: String, enum: STATUSES, default: 'active' },
  reportCount: { type: Number, default: 0 },
  reportedAt:  { type: Date,   default: null },
  moderatedAt: { type: Date,   default: null },
  moderatorNotes: { type: String, default: '' },

  reviewHelpfulCount: { type: Number, default: 0 },
  helpfulVotes: [{
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    votedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

propertyReviewSchema.index({ propertyIdentityId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('PropertyReview', propertyReviewSchema);
