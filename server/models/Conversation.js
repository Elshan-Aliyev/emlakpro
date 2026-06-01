const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  conversationId:     { type: String, required: true, unique: true },
  seller:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyer:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  property:           { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  inquiryCreatedAt:   { type: Date, required: true },
  firstResponseAt:    { type: Date, default: null },
  respondedWithin48h: { type: Boolean, default: null },
}, { timestamps: false });

conversationSchema.index({ conversationId: 1 });
conversationSchema.index({ seller: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
