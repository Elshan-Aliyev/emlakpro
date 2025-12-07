const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Participants in the conversation
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Related property (optional - null for direct messages)
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: false,
    default: null
  },
  
  // Message content
  subject: {
    type: String,
    default: 'Direct Message'
  },
  content: {
    type: String,
    required: true
  },
  
  // Conversation thread ID (groups messages between same two users about same property)
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  
  // Message status
  read: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient querying
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1, property: 1 });
messageSchema.index({ recipient: 1, read: 1 });

// Static method to generate conversation ID
messageSchema.statics.generateConversationId = function(userId1, userId2, propertyId = null) {
  // Validate user IDs
  if (!userId1 || !userId2) {
    throw new Error('Both user IDs are required to generate conversation ID');
  }
  
  // Sort user IDs to ensure consistent conversation ID regardless of who sends first
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  if (propertyId) {
    return `${sortedIds[0]}_${sortedIds[1]}_${propertyId}`;
  }
  // For direct messages without property context
  return `${sortedIds[0]}_${sortedIds[1]}_direct`;
};

module.exports = mongoose.model('Message', messageSchema);
