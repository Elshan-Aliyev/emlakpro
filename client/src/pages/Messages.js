import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Home, Send, Shield, MapPin, ExternalLink, AlertCircle } from 'lucide-react';
import { getConversations, getConversationMessages, sendMessage, markMessagesAsRead } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Messages.css';

// ── Icon aliases (preserve call-sites) ────────────────────────────────────────
const IconChat     = ({ size = 24 }) => <MessageSquare  size={size} strokeWidth={1.5} aria-hidden="true" />;
const IconBuilding = ({ size = 20 }) => <Home           size={size} strokeWidth={1.5} aria-hidden="true" />;
const IconSend     = ({ size = 15 }) => <Send           size={size} strokeWidth={2}   aria-hidden="true" />;
const IconShield   = ({ size = 12 }) => <Shield         size={size} strokeWidth={2}   aria-hidden="true" />;
const IconPin      = ({ size = 12 }) => <MapPin         size={size} strokeWidth={2}   aria-hidden="true" />;
const IconExternal = ({ size = 12 }) => <ExternalLink   size={size} strokeWidth={2}   aria-hidden="true" />;

// ── Skeleton loader ────────────────────────────────────────────────────────────

const ConversationSkeleton = () => (
  <div className="conv-skeleton">
    <div className="conv-sk-thumb" />
    <div className="conv-sk-lines">
      <div className="conv-sk-line conv-sk-line--short" />
      <div className="conv-sk-line" />
      <div className="conv-sk-line conv-sk-line--med" />
    </div>
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const getPropertyImage = (property) => {
  if (!property?.images?.length) return null;
  const img = property.images[0];
  if (typeof img === 'string') return img;
  return img.thumbnail || img.medium || img.large || null;
};

const formatTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const d   = new Date(date);
  const mins  = Math.floor((now - d) / 60000);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7)   return `${days}d`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
};

const formatMessageTime = (date) => {
  if (!date) return '';
  const d   = new Date(date);
  const now = new Date();
  const sameDay =
    d.getDate()     === now.getDate()     &&
    d.getMonth()    === now.getMonth()    &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate()     === yesterday.getDate()     &&
    d.getMonth()    === yesterday.getMonth()    &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return `Yesterday ${d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
};

// ── Component ──────────────────────────────────────────────────────────────────

const Messages = () => {
  const navigate                                   = useNavigate();
  const { user: authUser }                         = useAuth();
  const messagesEndRef                             = useRef(null);
  const composerRef                                = useRef(null);
  const pollingRef                                 = useRef(null);

  const [conversations,        setConversations]        = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages,             setMessages]             = useState([]);
  const [messageInput,         setMessageInput]         = useState('');
  const [loading,              setLoading]              = useState(true);
  const [sending,              setSending]              = useState(false);
  const [error,                setError]                = useState('');

  const messagesAreaRef = useRef(null);
  const userScrolledUp  = useRef(false);

  useEffect(() => { fetchConversations(); }, []);

  // Only auto-scroll to bottom when the user hasn't scrolled up to read history
  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-grow composer textarea up to ~5 lines
  useEffect(() => {
    const ta = composerRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [messageInput]);

  // Reset scroll-up flag when conversation switches
  useEffect(() => {
    userScrolledUp.current = false;
  }, [selectedConversation?.conversationId]);

  // ── Polling — refresh active thread every 20 s ─────────────────────────────
  useEffect(() => {
    clearInterval(pollingRef.current);
    if (!selectedConversation) return;

    const convId = selectedConversation.conversationId;
    pollingRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await getConversationMessages(convId, token);
        setMessages(prev => {
          const incoming = response.data;
          // Avoid re-render when nothing has changed
          if (
            prev.length === incoming.length &&
            prev[prev.length - 1]?._id === incoming[incoming.length - 1]?._id
          ) return prev;
          return incoming;
        });
      } catch { /* silent — polling must never disrupt UX */ }
    }, 20_000);

    return () => clearInterval(pollingRef.current);
  }, [selectedConversation?.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { setError('Sign in to view your messages.'); setLoading(false); return; }
      const response = await getConversations(token);
      setConversations(response.data);
      setError('');
    } catch {
      setError('Unable to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await getConversationMessages(conversationId, token);
      setMessages(response.data);
      await markMessagesAsRead(conversationId, token);
      fetchConversations();
    } catch {
      setError('Unable to load this conversation.');
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    fetchMessages(conv.conversationId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;
    try {
      setSending(true);
      userScrolledUp.current = false; // always scroll to show sent message
      const token      = localStorage.getItem('token');
      const recipientId = selectedConversation.otherUser._id;
      await sendMessage({
        recipientId,
        propertyId: selectedConversation.property?._id || null,
        content: messageInput,
      }, token);
      setMessageInput('');
      await fetchMessages(selectedConversation.conversationId);
      await fetchConversations();
    } catch {
      setError('Message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const totalUnread     = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const currentUserId   = authUser?._id;

  const getOtherUserRole = (conv) => {
    if (!conv?.property) return null;
    const ownerId = conv.property.ownerId?._id || conv.property.ownerId;
    return ownerId === currentUserId ? 'Buyer' : 'Owner';
  };

  const getPropertyLocation = (property) => {
    if (!property) return null;
    if (typeof property.location === 'string' && property.location) return property.location;
    if (property.city) return property.city;
    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="messages-page">
      <div className="messages-container">

        {/* ── Page header ── */}
        <div className="messages-header">
          <div className="messages-header-left">
            <h1>
              Messages
              {totalUnread > 0 && (
                <span className="msg-header-badge">{totalUnread}</span>
              )}
            </h1>
            <p>Inquiries and conversations about properties</p>
          </div>
        </div>

        {error && (
          <div className="msg-error" role="alert">
            <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="messages-content">

          {/* ══ Conversations column ══════════════════════════════════════════ */}
          <div className="conversations-list">
            <div className="conversations-header">
              <span className="conv-header-label">Inbox</span>
              {totalUnread > 0 && (
                <span className="msg-unread-badge">{totalUnread} new</span>
              )}
            </div>

            {loading ? (
              [1, 2, 3, 4].map(i => <ConversationSkeleton key={i} />)
            ) : conversations.length === 0 ? (

              /* ── Empty: no conversations ── */
              <div className="msg-empty-conversations">
                <div className="msg-empty-icon">
                  <IconChat size={22} />
                </div>
                <h3>No conversations yet</h3>
                <p>When you inquire about a property, your conversation with the owner will appear here.</p>
                <Link to="/search" className="msg-empty-cta">
                  Browse listings
                </Link>
              </div>

            ) : (
              <div className="conversation-items">
                {conversations.map((conv) => {
                  const propImg  = getPropertyImage(conv.property);
                  const role     = getOtherUserRole(conv);
                  const isActive = selectedConversation?.conversationId === conv.conversationId;

                  return (
                    <div
                      key={conv.conversationId}
                      className={`conversation-item${isActive ? ' active' : ''}${conv.unreadCount > 0 ? ' unread' : ''}`}
                      onClick={() => handleSelectConversation(conv)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleSelectConversation(conv)}
                    >
                      {/* Property thumbnail */}
                      <div className="conv-thumb">
                        {propImg
                          ? <img src={propImg} alt={conv.property?.title || ''} />
                          : <IconBuilding size={18} />
                        }
                      </div>

                      {/* Content */}
                      <div className="conversation-info">
                        {/* Property name — most prominent */}
                        <div className="conv-property-name">
                          {conv.property?.title || 'Property inquiry'}
                        </div>
                        {/* User + time row */}
                        <div className="conversation-header">
                          <span className="conv-user-name">
                            {conv.otherUser?.name || 'User'}
                            {role && <span className="conv-role-tag">{role}</span>}
                          </span>
                          <span className="conversation-time">{formatTime(conv.lastMessage?.createdAt)}</span>
                        </div>
                        {/* Preview */}
                        <p className="conversation-preview">{conv.lastMessage?.content || ''}</p>
                      </div>

                      {/* Unread dot */}
                      {conv.unreadCount > 0 && <div className="msg-unread-dot" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Safety strip at bottom of list ── */}
            {conversations.length > 0 && (
              <div className="conv-safety-strip">
                <IconShield size={11} />
                Never transfer funds before a signed agreement
              </div>
            )}
          </div>

          {/* ══ Message thread ════════════════════════════════════════════════ */}
          <div className="message-thread">
            {!selectedConversation ? (

              /* ── No conversation selected ── */
              <div className="msg-select-prompt">
                <div className="msg-select-icon">
                  <IconChat size={28} />
                </div>
                <span className="msg-select-title">Select a conversation</span>
                <span className="msg-select-sub">Choose from the list to read and reply</span>
              </div>

            ) : (
              <>
                {/* ── Thread header ── */}
                <div className="thread-header">
                  {/* User row */}
                  <div className="thread-user-row">
                    <div className="thread-user-avatar">
                      {selectedConversation.otherUser?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="thread-user-info">
                      <div className="thread-user-name">
                        {selectedConversation.otherUser?.name || 'User'}{' '}
                        {selectedConversation.otherUser?.lastName || ''}
                      </div>
                      {getOtherUserRole(selectedConversation) && (
                        <div className="thread-user-role">
                          {getOtherUserRole(selectedConversation)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Property context card */}
                  {selectedConversation.property && (
                    <div className="thread-prop-ctx">
                      {getPropertyImage(selectedConversation.property) && (
                        <img
                          className="thread-prop-thumb"
                          src={getPropertyImage(selectedConversation.property)}
                          alt={selectedConversation.property.title}
                        />
                      )}
                      <div className="thread-prop-info">
                        <div className="thread-prop-title">
                          {selectedConversation.property.title}
                        </div>
                        <div className="thread-prop-meta">
                          {getPropertyLocation(selectedConversation.property) && (
                            <span>
                              <IconPin size={10} />
                              {getPropertyLocation(selectedConversation.property)}
                            </span>
                          )}
                          {selectedConversation.property.price && (
                            <span className="thread-prop-price">
                              {selectedConversation.property.currency || 'AZN'}{' '}
                              {Number(selectedConversation.property.price).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="thread-prop-link"
                        onClick={() => navigate(`/listing/${selectedConversation.property._id}`)}
                        aria-label="View listing"
                      >
                        <IconExternal size={11} />
                        View
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Messages area ── */}
                <div
                  className="messages-area"
                  ref={messagesAreaRef}
                  style={{ overscrollBehavior: 'contain' }}
                  onScroll={() => {
                    const el = messagesAreaRef.current;
                    if (!el) return;
                    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
                  }}
                >

                  {/* Safety notice — appears once above messages */}
                  <div className="msg-safety-notice" aria-label="Safety reminder">
                    <IconShield size={12} />
                    <span>
                      Arrange viewings in person before any payment. Report suspicious requests immediately.
                    </span>
                  </div>

                  {messages.length === 0 ? (
                    <div className="msg-empty-thread">
                      <div className="msg-empty-icon">
                        <IconChat size={20} />
                      </div>
                      <h3>Start the conversation</h3>
                      <p>Introduce yourself and ask about the property below.</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isSent    = msg.sender?._id === currentUserId;
                      const initials  = msg.sender?.name
                        ? `${msg.sender.name[0]}${msg.sender.lastName?.[0] || ''}`.toUpperCase()
                        : '?';

                      // Show date separator when day changes
                      const showDate = idx === 0 || (
                        new Date(msg.createdAt).toDateString() !==
                        new Date(messages[idx - 1]?.createdAt).toDateString()
                      );

                      return (
                        <React.Fragment key={msg._id}>
                          {showDate && (
                            <div className="msg-date-divider">
                              <span>{new Date(msg.createdAt).toLocaleDateString('en', {
                                weekday: 'long', month: 'short', day: 'numeric',
                              })}</span>
                            </div>
                          )}
                          <div className={`message ${isSent ? 'sent' : 'received'}`}>
                            {!isSent && (
                              <div className="message-avatar">{initials}</div>
                            )}
                            <div className="message-content">
                              <p className="message-bubble">{msg.content}</p>
                              <span className="message-time">{formatMessageTime(msg.createdAt)}</span>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ── Composer ── */}
                <form onSubmit={handleSendMessage} className="message-input-area">
                  <div className="composer-wrap">
                    <textarea
                      ref={composerRef}
                      className="message-input"
                      placeholder="Write a message…"
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                      rows={1}
                      aria-label="Message input"
                    />
                    <button
                      type="submit"
                      className="send-button"
                      disabled={sending || !messageInput.trim()}
                      aria-label="Send message"
                    >
                      <IconSend size={15} />
                      <span>{sending ? 'Sending…' : 'Send'}</span>
                    </button>
                  </div>
                  <div className="composer-hint">
                    Press Enter to send · Shift + Enter for a new line
                  </div>
                </form>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Messages;
