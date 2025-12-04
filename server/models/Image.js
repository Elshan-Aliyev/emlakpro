const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  // Image Type
  type: { 
    type: String, 
    enum: ['listing', 'hero', 'background', 'profile', 'general'], 
    required: true,
    default: 'general'
  },
  
  // Related Reference
  relatedId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'relatedModel'
  },
  relatedModel: {
    type: String,
    enum: ['Property', 'User', null]
  },
  
  // Image Details
  url: { type: String, required: true },
  publicId: { type: String }, // Cloudinary public_id for deletion
  altText: { type: String, default: '' },
  title: { type: String },
  description: { type: String },
  
  // Hero Background Specific
  heroCategory: {
    type: String,
    enum: ['buy_residential', 'buy_commercial', 'rent_longterm', 'rent_shortterm']
  },
  
  // Image Metadata
  format: { type: String }, // jpg, png, webp
  width: { type: Number },
  height: { type: Number },
  size: { type: Number }, // in bytes
  
  // Upload Info
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true }
}, { timestamps: true });

// Indexes for faster queries
imageSchema.index({ type: 1, isActive: 1 });
imageSchema.index({ relatedId: 1, type: 1 });
imageSchema.index({ uploadedBy: 1 });
imageSchema.index({ heroCategory: 1 });

const Image = mongoose.model('Image', imageSchema);
module.exports = Image;
