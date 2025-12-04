# Messaging API Documentation

## Overview
The messaging system allows authenticated users to communicate with property owners through a conversation-based messaging interface.

## Data Model

### Message Schema
```javascript
{
  sender: ObjectId (ref: User),
  recipient: ObjectId (ref: User),
  property: ObjectId (ref: Property),
  subject: String (default: "Property Inquiry"),
  content: String (required),
  conversationId: String (required, indexed),
  read: Boolean (default: false),
  readAt: Date (default: null),
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation ID Format
`{userId1}_{userId2}_{propertyId}` where user IDs are sorted alphabetically to ensure consistency.

## API Endpoints

### 1. Send Message
**POST** `/api/messages`

**Auth Required:** Yes

**Request Body:**
```json
{
  "recipientId": "60d5ec49f1b2c72b8c8e4f5a",
  "propertyId": "60d5ec49f1b2c72b8c8e4f5b",
  "content": "Hi, I'm interested in your property",
  "subject": "Property Inquiry" // optional
}
```

**Response:** `201 Created`
```json
{
  "_id": "60d5ec49f1b2c72b8c8e4f5c",
  "sender": {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "recipient": { ... },
  "property": {
    "_id": "...",
    "title": "Luxury Apartment",
    "address": "123 Main St",
    "price": 250000,
    "images": [...]
  },
  "content": "Hi, I'm interested in your property",
  "conversationId": "abc123_def456_ghi789",
  "read": false,
  "createdAt": "2024-12-03T10:00:00.000Z"
}
```

---

### 2. Get All Conversations
**GET** `/api/messages/conversations`

**Auth Required:** Yes

**Response:** `200 OK`
```json
[
  {
    "conversationId": "abc123_def456_ghi789",
    "property": {
      "_id": "...",
      "title": "Luxury Apartment",
      "address": "123 Main St",
      "price": 250000,
      "images": [...]
    },
    "otherUser": {
      "_id": "...",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    },
    "lastMessage": {
      "_id": "...",
      "content": "When can we schedule a viewing?",
      "createdAt": "2024-12-03T12:30:00.000Z",
      "read": false
    },
    "unreadCount": 2
  }
]
```

**Notes:**
- Returns conversations where user is either sender or recipient
- Groups messages by conversationId
- Shows latest message for each conversation
- Includes unread count per conversation

---

### 3. Get Messages in Conversation
**GET** `/api/messages/conversation/:conversationId`

**Auth Required:** Yes

**Response:** `200 OK`
```json
[
  {
    "_id": "...",
    "sender": {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe"
    },
    "recipient": { ... },
    "property": { ... },
    "content": "Hi, I'm interested in your property",
    "read": true,
    "readAt": "2024-12-03T12:00:00.000Z",
    "createdAt": "2024-12-03T10:00:00.000Z"
  },
  {
    "_id": "...",
    "sender": { ... },
    "recipient": { ... },
    "property": { ... },
    "content": "Great! When would you like to visit?",
    "read": false,
    "readAt": null,
    "createdAt": "2024-12-03T11:00:00.000Z"
  }
]
```

**Notes:**
- Returns messages sorted by creation date (oldest first)
- Verifies user is participant in conversation
- Returns 403 if user is not part of the conversation

---

### 4. Mark Messages as Read
**PUT** `/api/messages/conversation/:conversationId/read`

**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "Messages marked as read",
  "modifiedCount": 3
}
```

**Notes:**
- Marks all unread messages where current user is recipient
- Sets `read: true` and `readAt: current timestamp`
- Only affects messages addressed to the authenticated user

---

### 5. Get Unread Message Count
**GET** `/api/messages/unread-count`

**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "count": 5
}
```

**Notes:**
- Returns total number of unread messages for authenticated user
- Useful for notification badges in UI

---

### 6. Delete Message
**DELETE** `/api/messages/:messageId`

**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "Message deleted successfully"
}
```

**Notes:**
- Only the sender can delete their own message
- Returns 403 if user is not the sender
- Returns 404 if message doesn't exist

---

## Usage Example (Client-Side)

### Sending a Message from Property Detail Page
```javascript
import { sendMessage } from '../services/api';

const handleContactSeller = async () => {
  const token = localStorage.getItem('token');
  
  try {
    const response = await sendMessage({
      recipientId: property.ownerId._id,
      propertyId: property._id,
      content: messageText,
      subject: `Inquiry about ${property.title}`
    }, token);
    
    console.log('Message sent:', response.data);
    navigate('/messages');
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};
```

### Loading Conversations
```javascript
import { getConversations } from '../services/api';

useEffect(() => {
  const loadConversations = async () => {
    const token = localStorage.getItem('token');
    const response = await getConversations(token);
    setConversations(response.data);
  };
  
  loadConversations();
}, []);
```

### Loading and Auto-Reading Messages
```javascript
import { getConversationMessages, markMessagesAsRead } from '../services/api';

const selectConversation = async (conversationId) => {
  const token = localStorage.getItem('token');
  
  // Load messages
  const response = await getConversationMessages(conversationId, token);
  setMessages(response.data);
  
  // Mark as read
  await markMessagesAsRead(conversationId, token);
  
  // Refresh conversation list to update unread counts
  refreshConversations();
};
```

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT token
2. **Authorization**: Users can only access conversations they're part of
3. **Validation**: 
   - Recipient must exist and be a valid user
   - Property must exist
   - Message content is required
4. **Privacy**: Users cannot see messages they're not involved in

## Database Indexes

Optimized queries with indexes on:
- `conversationId` + `createdAt` (for fetching conversation messages)
- `sender` + `recipient` + `property` (for conversation lookup)
- `recipient` + `read` (for unread count queries)

## Integration Points

### Property Detail Page
- "Contact Seller" button opens modal
- Modal pre-fills with property context
- Sends message and redirects to Messages page

### Messages Page
- Shows all conversations grouped by property
- Real-time unread count
- Click conversation to view full thread
- Send new messages within thread
- Auto-marks messages as read when viewed

### Navbar (Future Enhancement)
- Badge showing unread message count
- Use `getUnreadCount()` API endpoint
