const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const messageController = require('../controllers/messageController');

// All routes require authentication
router.use(authMiddleware);

// Send a new message
router.post('/', messageController.sendMessage);

// Get all conversations for logged-in user
router.get('/conversations', messageController.getConversations);

// Get unread message count
router.get('/unread-count', messageController.getUnreadCount);

// Get messages in a specific conversation
router.get('/conversation/:conversationId', messageController.getConversationMessages);

// Mark messages in a conversation as read
router.put('/conversation/:conversationId/read', messageController.markAsRead);

// Delete a specific message
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
