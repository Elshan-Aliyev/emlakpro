import React, { useState, useEffect } from 'react';
import { getConversations, getConversationMessages, sendMessage, markMessagesAsRead } from '../services/api';
import './Messages.css';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view messages');
        setLoading(false);
        return;
      }
      
      const response = await getConversations(token);
      setConversations(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await getConversationMessages(conversationId, token);
      setMessages(response.data);
      
      // Mark messages as read
      await markMessagesAsRead(conversationId, token);
      
      // Update conversation list to reflect read status
      fetchConversations();
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.response?.data?.message || 'Failed to load messages');
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.conversationId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      const currentUserId = JSON.parse(atob(token.split('.')[1])).id;
      
      // Determine recipient (the other user in conversation)
      const recipientId = selectedConversation.otherUser._id;

      await sendMessage({
        recipientId,
        propertyId: selectedConversation.property._id,
        content: messageInput
      }, token);

      setMessageInput('');
      
      // Refresh messages
      await fetchMessages(selectedConversation.conversationId);
      await fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return messageDate.toLocaleDateString();
  };

  const getPropertyImage = (property) => {
    if (!property?.images?.length) return null;
    const image = property.images[0];
    if (typeof image === 'string') return image;
    return image.thumbnail || image.medium || image.large;
  };

  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  
  // Get current user ID for determining message direction
  const getCurrentUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])).id;
    } catch {
      return null;
    }
  };

  return (
    <div className="messages-page">
      <div className="messages-container">
        <div className="messages-header">
          <h1>Messages</h1>
          <p>Communicate with property owners and interested buyers</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="messages-content">
          {/* Conversations List */}
          <div className="conversations-list">
            <div className="conversations-header">
              <h2>Conversations</h2>
              {totalUnread > 0 && (
                <span className="unread-badge">{totalUnread} unread</span>
              )}
            </div>
            
            {loading ? (
              <div className="loading-state">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">💬</span>
                <h3>No messages yet</h3>
                <p>Start a conversation by inquiring about a property</p>
              </div>
            ) : (
              <div className="conversation-items">
                {conversations.map((conv) => (
                  <div 
                    key={conv.conversationId}
                    className={`conversation-item ${selectedConversation?.conversationId === conv.conversationId ? 'active' : ''} ${conv.unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <div className="conversation-avatar">
                      {getPropertyImage(conv.property) ? (
                        <img src={getPropertyImage(conv.property)} alt={conv.property.title} />
                      ) : (
                        '🏠'
                      )}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header">
                        <h3>{conv.otherUser.firstName} {conv.otherUser.lastName}</h3>
                        <span className="conversation-time">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className="conversation-property">{conv.property.title}</p>
                      <p className="conversation-preview">
                        {conv.lastMessage.content}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="unread-indicator">{conv.unreadCount}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Thread */}
          <div className="message-thread">
            {selectedConversation ? (
              <>
                <div className="thread-header">
                  <div className="thread-info">
                    <h3>
                      {selectedConversation.otherUser.firstName} {selectedConversation.otherUser.lastName}
                    </h3>
                    <p>{selectedConversation.property.title}</p>
                  </div>
                </div>
                
                <div className="messages-area">
                  {messages.length === 0 ? (
                    <div className="empty-thread">
                      <p>No messages yet in this conversation</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const currentUserId = getCurrentUserId();
                      return (
                        <div 
                          key={msg._id} 
                          className={`message ${msg.sender._id === currentUserId ? 'sent' : 'received'}`}
                        >
                          {msg.sender._id !== currentUserId && (
                          <div className="message-avatar">
                            {msg.sender.firstName[0]}{msg.sender.lastName[0]}
                          </div>
                        )}
                        <div className="message-content">
                          <p>{msg.content}</p>
                          <span className="message-time">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="message-input-area">
                  <input 
                    type="text" 
                    placeholder="Type your message..."
                    className="message-input"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={sending}
                  />
                  <button 
                    type="submit" 
                    className="send-button"
                    disabled={sending || !messageInput.trim()}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div className="empty-thread">
                <span className="empty-icon">💬</span>
                <h3>Select a conversation</h3>
                <p>Choose a conversation from the list to view messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
