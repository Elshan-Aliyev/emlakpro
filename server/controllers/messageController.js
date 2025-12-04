const Message = require('../models/Message');
const Property = require('../models/Property');
const User = require('../models/User');

// Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, propertyId, content, subject } = req.body;
    const senderId = req.user._id;

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Validate property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Generate conversation ID
    const conversationId = Message.generateConversationId(senderId, recipientId, propertyId);

    // Create message
    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      property: propertyId,
      content,
      subject: subject || 'Property Inquiry',
      conversationId
    });

    // Populate before sending response
    await message.populate([
      { path: 'sender', select: 'firstName lastName email' },
      { path: 'recipient', select: 'firstName lastName email' },
      { path: 'property', select: 'title address price images' }
    ]);

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
};

// Get all conversations for the logged-in user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all messages where user is sender or recipient
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }]
    })
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('property', 'title address price images')
      .sort({ createdAt: -1 });

    // Group by conversation ID and get the latest message for each
    const conversationMap = new Map();
    
    messages.forEach(message => {
      if (!conversationMap.has(message.conversationId)) {
        // Determine the other user in the conversation
        const otherUser = message.sender._id.toString() === userId.toString() 
          ? message.recipient 
          : message.sender;
        
        // Count unread messages in this conversation
        const unreadCount = messages.filter(m => 
          m.conversationId === message.conversationId &&
          m.recipient._id.toString() === userId.toString() &&
          !m.read
        ).length;

        conversationMap.set(message.conversationId, {
          conversationId: message.conversationId,
          property: message.property,
          otherUser,
          lastMessage: message,
          unreadCount
        });
      }
    });

    const conversations = Array.from(conversationMap.values());
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  }
};

// Get messages in a specific conversation
exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const messages = await Message.find({ conversationId })
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('property', 'title address price images')
      .sort({ createdAt: 1 });

    // Verify user is part of this conversation
    if (messages.length > 0) {
      const firstMessage = messages[0];
      const isParticipant = 
        firstMessage.sender._id.toString() === userId.toString() ||
        firstMessage.recipient._id.toString() === userId.toString();
      
      if (!isParticipant) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const result = await Message.updateMany(
      {
        conversationId,
        recipient: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({ message: 'Messages marked as read', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error marking messages as read', error: error.message });
  }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Message.countDocuments({
      recipient: userId,
      read: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Error getting unread count', error: error.message });
  }
};

// Delete a message (only sender can delete)
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete their own message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await message.deleteOne();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
};
