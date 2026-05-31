# QMF GraphQL Integration

## Overview
Frontend integration for GraphQL-based backend services (noti, chat, classroom) without heavy library dependencies.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │        QMF Services Layer                        │   │
│  │  ┌──────────────┐  ┌──────────────┐            │   │
│  │  │ Notification │  │     Chat     │            │   │
│  │  │   Service    │  │   Service    │            │   │
│  │  └──────┬───────┘  └──────┬───────┘            │   │
│  │         │                  │                     │   │
│  │         └──────────┬───────┘                     │   │
│  │                    │                             │   │
│  │         ┌──────────▼─────────────┐              │   │
│  │         │   GraphQL Client       │              │   │
│  │         │  (Simple fetch-based)  │              │   │
│  │         └──────────┬─────────────┘              │   │
│  └────────────────────┼──────────────────────────────┘
│                       │                              │
└───────────────────────┼──────────────────────────────┘
                        │ POST /graphql + JWT
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ noti-service  │ │ chat-service  │ │ classroom-sys │
│  Port: 6666   │ │  Port: 5555   │ │  Port: 4949   │
│               │ │               │ │               │
│   /graphql    │ │   /graphql    │ │   /graphql    │
│               │ │               │ │               │
│  Simple       │ │  Simple       │ │  Simple       │
│  handler      │ │  handler      │ │  handler      │
│  (no lib)     │ │  (no lib)     │ │  (no lib)     │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        ▼                 ▼                 ▼
   PostgreSQL        PostgreSQL        PostgreSQL
   noti_db           chat_db           classroom_db
```

## Files Structure

```
share-ui/qmf/
├── services/
│   ├── graphql/
│   │   ├── client.js      # GraphQL client (no dependencies)
│   │   ├── utils.js       # Query builder helpers
│   │   └── index.js       # Main exports
│   ├── notification/
│   │   └── index.js       # Updated with GraphQL queries
│   ├── chat/
│   │   └── index.js       # Updated with GraphQL queries
│   └── auth/
│       └── index.js       # JWT token management
└── test-graphql.html      # Test page for GraphQL endpoints
```

## Installation

No installation needed! The GraphQL client is built with native `fetch` API.

```javascript
// Just import and use
import { notiGraphQL, chatGraphQL, classGraphQL } from './services/graphql/client.js';
```

## Usage

### Basic Query

```javascript
import { notiGraphQL } from './services/graphql/client.js';

// Get notification count
const data = await notiGraphQL.query(`
  query {
    notificationCount {
      total
      unread
    }
  }
`);

console.log(data.notificationCount); // { total: 10, unread: 3 }
```

### Query with Variables

```javascript
import { chatGraphQL } from './services/graphql/client.js';

const data = await chatGraphQL.query(`
  query GetMessages($roomId: ID!, $limit: Int) {
    messages(roomId: $roomId, limit: $limit) {
      messages {
        id
        content
        senderId
        createdAt
      }
      hasMore
      nextCursor
    }
  }
`, {
  roomId: 'room-123',
  limit: 50
});
```

### Mutations

```javascript
import { notiGraphQL } from './services/graphql/client.js';

// Mark notification as read
await notiGraphQL.mutate(`
  mutation MarkRead($id: ID!) {
    markNotificationRead(id: $id)
  }
`, { id: 'noti-456' });

// Mark all as read
await notiGraphQL.mutate(`
  mutation {
    markAllNotificationsRead
  }
`);
```

### Using in Services

The notification and chat services automatically use GraphQL:

```javascript
import { notificationService } from './services/notification/index.js';

// Initialize
await notificationService.init({
  notiUrl: 'https://noti.quizzman.com'
});

// Automatically uses GraphQL behind the scenes
await notificationService.loadNotifications(); // GraphQL query
await notificationService.markAsRead(notiId);  // GraphQL mutation
```

## API Reference

### Notification Service

#### Queries
```graphql
# Get notifications with pagination
query GetNotifications($limit: Int, $offset: Int) {
  notifications(limit: $limit, offset: $offset) {
    id
    type
    title
    message
    data
    read
    priority
    createdAt
  }
  notificationCount {
    total
    unread
  }
}

# Get single notification
query GetNotification($id: ID!) {
  notification(id: $id) {
    id
    type
    title
    message
    data
    read
    priority
    createdAt
  }
}
```

#### Mutations
```graphql
# Mark notification as read
mutation MarkRead($id: ID!) {
  markNotificationRead(id: $id)
}

# Mark all as read
mutation MarkAllRead {
  markAllNotificationsRead
}

# Delete notification
mutation DeleteNotification($id: ID!) {
  deleteNotification(id: $id)
}
```

### Chat Service

#### Queries
```graphql
# Get conversations
query GetConversations {
  conversations {
    roomId
    room {
      id
      name
      type
    }
    lastMessage {
      content
      createdAt
    }
    unreadCount
    updatedAt
  }
}

# Get messages for a room
query GetMessages($roomId: ID!, $limit: Int, $cursor: String) {
  messages(roomId: $roomId, limit: $limit, cursor: $cursor) {
    messages {
      id
      roomId
      senderId
      content
      status
      messageType
      createdAt
    }
    hasMore
    nextCursor
  }
}

# Get friends
query GetFriends($search: String) {
  friends(search: $search) {
    id
    name
    avatar
    online
    createdAt
  }
}

# Get friend requests
query GetFriendRequests {
  friendRequestsSent {
    id
    receiverId
    message
    status
    createdAt
  }
  friendRequestsReceived {
    id
    senderId
    message
    status
    createdAt
  }
}

# Get total unread count
query GetTotalUnread {
  totalUnreadCount
}
```

#### Mutations
```graphql
# Send friend request
mutation SendFriendRequest($receiverId: ID!, $message: String) {
  sendFriendRequest(receiverId: $receiverId, message: $message) {
    id
    status
    createdAt
  }
}

# Accept friend request
mutation AcceptFriendRequest($requestId: ID!) {
  acceptFriendRequest(requestId: $requestId) {
    id
    status
  }
}

# Send message
mutation SendMessage($roomId: ID!, $content: String!, $messageType: String) {
  sendMessage(roomId: $roomId, content: $content, messageType: $messageType) {
    id
    content
    createdAt
  }
}

# Mark room as read
mutation MarkRoomRead($roomId: ID!) {
  markRoomRead(roomId: $roomId)
}
```

### Classroom Service

#### Queries
```graphql
# Get my classrooms
query GetMyClassrooms {
  myClassrooms {
    id
    name
    description
    teacherId
    code
    createdAt
  }
}

# Get specific classroom
query GetClassroom($id: ID!) {
  classroom(id: $id) {
    id
    name
    description
    teacherId
    code
    createdAt
  }
}

# Get homework for classroom
query GetClassroomHomework($classroomId: ID!) {
  classroomHomework(classroomId: $classroomId) {
    id
    title
    description
    dueDate
    createdBy
    createdAt
  }
}

# Get my homework
query GetMyHomework {
  myHomework {
    id
    title
    description
    dueDate
    createdAt
  }
}
```

#### Mutations
```graphql
# Create classroom
mutation CreateClassroom($name: String!, $description: String) {
  createClassroom(name: $name, description: $description) {
    id
    name
    code
    createdAt
  }
}

# Join classroom
mutation JoinClassroom($code: String!) {
  joinClassroom(code: $code) {
    id
    name
    code
  }
}

# Create homework
mutation CreateHomework($classroomId: ID!, $title: String!, $description: String, $dueDate: DateTime) {
  createHomework(classroomId: $classroomId, title: $title, description: $description, dueDate: $dueDate) {
    id
    title
    dueDate
    createdAt
  }
}

# Submit homework
mutation SubmitHomework($homeworkId: ID!, $content: String) {
  submitHomework(homeworkId: $homeworkId, content: $content) {
    id
    submittedAt
  }
}
```

## Authentication

JWT token is automatically included in all requests:

```javascript
import { authService } from './services/auth/index.js';

// Login (sets token)
await authService.login(username, password);

// All GraphQL requests now include: Authorization: Bearer <token>

// Logout (clears token)
authService.logout();
```

## Error Handling

```javascript
try {
  const data = await notiGraphQL.query(`{ notificationCount { total } }`);
  console.log(data);
} catch (error) {
  // error.message contains the error from backend
  console.error('GraphQL Error:', error.message);
  
  if (error.message === 'Unauthorized') {
    // Redirect to login
  }
}
```

## Testing

Open `test-graphql.html` in browser:

```bash
# Serve the file
cd /opt/quizzman-backup/quizzman-new/share-ui/qmf
python3 -m http.server 8080

# Open in browser
# http://localhost:8080/test-graphql.html
```

Or access via domain:
```
https://share.quizzman.com/qmf/test-graphql.html
```

## Hybrid Architecture

The system uses a **hybrid approach**:

1. **GraphQL** for data fetching and mutations
   - Initial data loading
   - Pagination
   - Create/Update/Delete operations

2. **Socket.io** for real-time updates
   - New notifications
   - New messages
   - Typing indicators
   - User presence

```javascript
// Example: Chat service
// Load initial messages via GraphQL
const messages = await chatGraphQL.query(`
  query { messages(roomId: $roomId) { ... } }
`, { roomId });

// Listen for new messages via Socket.io
socket.on('chat:message', (newMessage) => {
  // Update UI in real-time
});
```

## Performance

- ✅ **No heavy dependencies** - Uses native fetch API
- ✅ **Automatic JWT handling** - Token from authService
- ✅ **Cursor-based pagination** - Efficient large datasets
- ✅ **Error handling** - Built-in error management
- ✅ **TypeScript ready** - Can add types easily

## Migration from REST

### Before (REST)
```javascript
const response = await fetch('/api/notifications', {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await response.json();
```

### After (GraphQL)
```javascript
const data = await notiGraphQL.query(`
  query { notifications { id title message } }
`);
```

Benefits:
- Request exactly what you need
- Single endpoint for all operations
- Built-in type safety in queries
- Better error handling

## Troubleshooting

### Unauthorized errors
```javascript
// Check if token exists
const token = authService.getToken();
if (!token) {
  // Redirect to login
}
```

### CORS issues
Ensure backend CORS settings allow your domain:
```javascript
// Backend should allow: https://quizzman.com, https://*.quizzman.com
```

### Network errors
```javascript
try {
  const data = await notiGraphQL.query(`...`);
} catch (error) {
  if (error.message.includes('fetch')) {
    console.error('Network error - check connection');
  }
}
```

## License

Internal use only - Quizzman Platform

## Support

For issues or questions, contact the backend team.
