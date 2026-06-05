'use strict';
const mongoose = require('mongoose');

const TIERS     = ['FEATURED', 'PREMIUM', 'SPOTLIGHT'];
const DURATIONS = [7, 30, 90];
const STATUSES  = ['pending', 'approved', 'rejected'];

const promotionRequestSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Property',
    required: true,
    index: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
    required: true,
    index: true,
  },
  requestedTier: { type: String, enum: TIERS,     required: true },
  requestedDays: { type: Number, enum: DURATIONS, required: true },
  status:        { type: String, enum: STATUSES,  default: 'pending' },
  adminNote:     { type: String, default: '' },
  processedAt:   { type: Date,   default: null },
  processedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

promotionRequestSchema.index({ propertyId: 1, status: 1 });

module.exports = mongoose.model('PromotionRequest', promotionRequestSchema);
