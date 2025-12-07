const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Realtor being reviewed
  realtorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // User who wrote the review
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Property associated with the transaction (optional)
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  
  // Transaction type
  transactionType: {
    type: String,
    enum: ['purchase', 'sale', 'rent', 'consultation', 'other'],
    required: true
  },
  
  // Rating (1-5 stars)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Detailed ratings
  professionalism: {
    type: Number,
    min: 1,
    max: 5
  },
  
  communication: {
    type: Number,
    min: 1,
    max: 5
  },
  
  marketKnowledge: {
    type: Number,
    min: 1,
    max: 5
  },
  
  negotiationSkills: {
    type: Number,
    min: 1,
    max: 5
  },
  
  // Review content
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // Transaction details
  transactionDate: {
    type: Date
  },
  
  transactionValue: {
    type: Number
  },
  
  // Would recommend
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  
  // Review status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Verification - only users who actually worked with realtor can review
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verificationMethod: {
    type: String,
    enum: ['property-transaction', 'service-request', 'admin-verified', 'none'],
    default: 'none'
  },
  
  // Realtor response
  realtorResponse: {
    comment: String,
    respondedAt: Date
  },
  
  // Helpful votes
  helpfulCount: {
    type: Number,
    default: 0
  },
  
  helpfulVotes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Flagging
  isFlagged: {
    type: Boolean,
    default: false
  },
  
  flagReason: String

}, {
  timestamps: true
});

// Indexes for performance
reviewSchema.index({ realtorId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ reviewerId: 1 });
reviewSchema.index({ rating: 1 });

// Prevent duplicate reviews from same user for same realtor
reviewSchema.index({ realtorId: 1, reviewerId: 1 }, { unique: true });

// Virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
});

// Calculate average of detailed ratings
reviewSchema.virtual('detailedAverage').get(function() {
  const ratings = [
    this.professionalism,
    this.communication,
    this.marketKnowledge,
    this.negotiationSkills
  ].filter(r => r !== undefined);
  
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
});

module.exports = mongoose.model('Review', reviewSchema);
