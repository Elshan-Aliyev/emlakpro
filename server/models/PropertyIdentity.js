'use strict';
const mongoose = require('mongoose');

const propertyIdentitySchema = new mongoose.Schema({
  fingerprint: {
    normalizedAddress: { type: String, required: true },
    roomCount:         { type: Number, required: true },
    propertyType:      { type: String, required: true },
  },
  fingerprintVersion: { type: Number, default: 1 },

  avgRating:           { type: Number, default: 0 },
  reviewCount:         { type: Number, default: 0 },
  recommendCount:      { type: Number, default: 0 },
  recommendPercentage: { type: Number, default: 0 },
  listingCount:        { type: Number, default: 0 },
  lastReviewAt:        { type: Date,   default: null },
}, { timestamps: true });

propertyIdentitySchema.index(
  {
    'fingerprint.normalizedAddress': 1,
    'fingerprint.roomCount':         1,
    'fingerprint.propertyType':      1,
  },
  { unique: true }
);

module.exports = mongoose.model('PropertyIdentity', propertyIdentitySchema);
