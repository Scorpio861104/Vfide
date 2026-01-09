# VFIDE API Documentation

Complete API reference for VFIDE's WebSocket and REST endpoints.

## Table of Contents

- [WebSocket API](#websocket-api)
- [REST API](#rest-api)
- [Authentication](#authentication)
- [Rate Limits](#rate-limits)
- [Error Handling](#error-handling)

## WebSocket API

### Connection

**URL**: `ws://localhost:3001` (development) or `wss://your-domain.com` (production)

**Protocol**: Socket.IO v4

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token',
    signature: 'ethereum-signature',
    address: '0x...'
  },
  transports: ['websocket', 'polling']
});
```

### Authentication

All WebSocket connections require authentication via JWT token and Ethereum signature.

**Auth Object**:
```typescript
{
  token: string;      // JWT token from login
  signature: string;  // Ethereum signature of message
  address: string;    // Ethereum address (0x...)
}
```

**Example Authentication Flow**:
```typescript
// 1. Request authentication message from server
const message = await fetch('/api/auth/message').then(r => r.json());

// 2. Sign message with wallet
const signature = await signer.signMessage(message);

// 3. Connect with auth
const socket = io(WEBSOCKET_URL, {
  auth: {
    token: jwtToken,
    signature,
    address: await signer.getAddress()
  }
});

// 4. Handle authentication success/failure
socket.on('authenticated', () => {
  console.log('Successfully authenticated');
});

socket.on('auth_error', (error) => {
  console.error('Authentication failed:', error);
});
```

---

## Governance Events

### Subscribe to Governance Updates

**Event**: `governance:subscribe`

Subscribe to all governance events.

**Emit**:
```typescript
socket.emit('governance:subscribe');
```

**Response**:
```typescript
socket.on('governance:subscribed', () => {
  console.log('Subscribed to governance events');
});
```

---

### Subscribe to Specific Proposal

**Event**: `governance:subscribe_proposal`

Subscribe to updates for a specific proposal.

**Emit**:
```typescript
socket.emit('governance:subscribe_proposal', {
  proposalId: '123'
});
```

**Payload**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `proposalId` | string | Yes | Unique proposal identifier |

**Response**:
```typescript
socket.on('governance:proposal_subscribed', (data) => {
  console.log(`Subscribed to proposal ${data.proposalId}`);
});
```

---

### New Proposal Created

**Event**: `governance:proposal_created`

Fired when a new proposal is created.

**Listen**:
```typescript
socket.on('governance:proposal_created', (proposal) => {
  console.log('New proposal:', proposal);
});
```

**Payload**:
```typescript
{
  id: string;              // Proposal ID
  title: string;           // Proposal title
  description: string;     // Detailed description
  proposer: string;        // Ethereum address of proposer
  status: 'pending' | 'active' | 'executed' | 'defeated';
  votesFor: number;        // Initial votes for (usually 0)
  votesAgainst: number;    // Initial votes against (usually 0)
  startTime: number;       // Unix timestamp
  endTime: number;         // Unix timestamp
  createdAt: string;       // ISO 8601 timestamp
}
```

---

### Proposal Updated

**Event**: `governance:proposal_updated`

Fired when proposal data changes (status, votes, etc.).

**Listen**:
```typescript
socket.on('governance:proposal_updated', (proposal) => {
  console.log('Proposal updated:', proposal);
});
```

**Payload**: Same as `proposal_created`

---

### New Vote Cast

**Event**: `governance:vote_cast`

Fired when a user casts a vote on a proposal.

**Listen**:
```typescript
socket.on('governance:vote_cast', (vote) => {
  console.log('Vote cast:', vote);
});
```

**Payload**:
```typescript
{
  proposalId: string;      // Proposal being voted on
  voter: string;           // Ethereum address of voter
  support: boolean;        // true = for, false = against
  weight: number;          // Voting power (based on ProofScore)
  timestamp: string;       // ISO 8601 timestamp
  txHash: string;          // Transaction hash
}
```

---

### Proposal Status Changed

**Event**: `governance:proposal_status_changed`

Fired when proposal status changes.

**Listen**:
```typescript
socket.on('governance:proposal_status_changed', (data) => {
  console.log('Proposal status changed:', data);
});
```

**Payload**:
```typescript
{
  proposalId: string;
  oldStatus: 'pending' | 'active' | 'executed' | 'defeated';
  newStatus: 'pending' | 'active' | 'executed' | 'defeated';
  timestamp: string;
}
```

---

### Proposal Executed

**Event**: `governance:proposal_executed`

Fired when a proposal is successfully executed.

**Listen**:
```typescript
socket.on('governance:proposal_executed', (data) => {
  console.log('Proposal executed:', data);
});
```

**Payload**:
```typescript
{
  proposalId: string;
  executor: string;        // Ethereum address of executor
  timestamp: string;
  txHash: string;
  result: any;             // Execution result data
}
```

---

## Chat Events

### Join Chat Room

**Event**: `chat:join`

Join a chat room to send/receive messages.

**Emit**:
```typescript
socket.emit('chat:join', {
  roomId: 'proposal-123'
});
```

**Payload**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roomId` | string | Yes | Chat room identifier (e.g., `proposal-123`, `general`) |

**Response**:
```typescript
socket.on('chat:joined', (data) => {
  console.log(`Joined room ${data.roomId}`);
  console.log(`${data.userCount} users in room`);
});
```

---

### Leave Chat Room

**Event**: `chat:leave`

Leave a chat room.

**Emit**:
```typescript
socket.emit('chat:leave', {
  roomId: 'proposal-123'
});
```

---

### Send Message

**Event**: `chat:message`

Send a message to a chat room.

**Emit**:
```typescript
socket.emit('chat:message', {
  roomId: 'proposal-123',
  message: 'Hello everyone!',
  replyTo: 'message-id-123' // Optional
});
```

**Payload**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roomId` | string | Yes | Target chat room |
| `message` | string | Yes | Message text (max 1000 chars) |
| `replyTo` | string | No | ID of message being replied to |

---

### Receive Message

**Event**: `chat:message`

Receive a message in a subscribed room.

**Listen**:
```typescript
socket.on('chat:message', (message) => {
  console.log('New message:', message);
});
```

**Payload**:
```typescript
{
  id: string;              // Message ID
  roomId: string;          // Room where message was sent
  sender: string;          // Ethereum address of sender
  senderName?: string;     // Display name (if set)
  senderAvatar?: string;   // Avatar URL (if set)
  message: string;         // Message text
  replyTo?: string;        // ID of message being replied to
  timestamp: string;       // ISO 8601 timestamp
  edited: boolean;         // Whether message was edited
}
```

---

### Edit Message

**Event**: `chat:edit`

Edit a previously sent message.

**Emit**:
```typescript
socket.emit('chat:edit', {
  messageId: 'msg-123',
  newMessage: 'Updated message text'
});
```

---

### Delete Message

**Event**: `chat:delete`

Delete a message (only sender can delete).

**Emit**:
```typescript
socket.emit('chat:delete', {
  messageId: 'msg-123'
});
```

---

### React to Message

**Event**: `chat:react`

Add emoji reaction to a message.

**Emit**:
```typescript
socket.emit('chat:react', {
  messageId: 'msg-123',
  emoji: '👍'
});
```

**Payload**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | Target message ID |
| `emoji` | string | Yes | Emoji character |

**Response**:
```typescript
socket.on('chat:reaction', (reaction) => {
  console.log('Reaction added:', reaction);
});
```

---

### User Typing

**Event**: `chat:typing`

Notify room that user is typing.

**Emit**:
```typescript
socket.emit('chat:typing', {
  roomId: 'proposal-123',
  isTyping: true
});
```

**Listen**:
```typescript
socket.on('chat:user_typing', (data) => {
  console.log(`${data.user} is typing in ${data.roomId}`);
});
```

---

## Notification Events

### Subscribe to Notifications

**Event**: `notification:subscribe`

Subscribe to user's notifications.

**Emit**:
```typescript
socket.emit('notification:subscribe');
```

---

### New Notification

**Event**: `notification:new`

Receive a new notification.

**Listen**:
```typescript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});
```

**Payload**:
```typescript
{
  id: string;              // Notification ID
  type: 'proposal' | 'vote' | 'mention' | 'system';
  title: string;           // Notification title
  message: string;         // Notification message
  link?: string;           // URL to related content
  read: boolean;           // Read status
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;       // ISO 8601 timestamp
  metadata?: any;          // Additional type-specific data
}
```

---

### Mark Notification as Read

**Event**: `notification:read`

Mark notification(s) as read.

**Emit**:
```typescript
socket.emit('notification:read', {
  notificationIds: ['notif-1', 'notif-2']
});
```

---

### Mark All as Read

**Event**: `notification:read_all`

Mark all user notifications as read.

**Emit**:
```typescript
socket.emit('notification:read_all');
```

---

### Delete Notification

**Event**: `notification:delete`

Delete a notification.

**Emit**:
```typescript
socket.emit('notification:delete', {
  notificationId: 'notif-123'
});
```

---

## System Events

### Connection Events

**Event**: `connect`

Fired when successfully connected to server.

```typescript
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});
```

---

**Event**: `disconnect`

Fired when disconnected from server.

```typescript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // Server disconnected the client, manual reconnection needed
    socket.connect();
  }
  // Else, Socket.IO will automatically reconnect
});
```

---

**Event**: `connect_error`

Fired when connection fails.

```typescript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

### Heartbeat

**Event**: `ping` / `pong`

Server sends `ping` every 30 seconds to check connection health.

```typescript
socket.on('ping', () => {
  console.log('Received heartbeat ping');
  // Socket.IO automatically responds with pong
});
```

---

## REST API

### Health Check

**Endpoint**: `GET /health`

Check server health status.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-08T12:00:00Z",
  "uptime": 3600,
  "connections": 42
}
```

---

### Frontend Health Check

**Endpoint**: `GET /api/health`

Check frontend application health.

**Response**:
```json
{
  "status": "ok",
  "version": "1.2.0",
  "environment": "production"
}
```

---

## Authentication

### JWT Token Structure

```typescript
{
  address: string;         // Ethereum address
  iat: number;            // Issued at (Unix timestamp)
  exp: number;            // Expiration (Unix timestamp)
}
```

**Token Expiration**: 24 hours

**Refresh**: Request new token when `exp` is approaching

---

## Rate Limits

### WebSocket Connections

- **10 connections per minute** per IP address
- **1 reconnection attempt per 5 seconds**

### Message Events

- **10 messages per minute** per user
- **100 messages per hour** per user

### Subscriptions

- **50 active subscriptions** per connection
- **5 subscription requests per second**

---

## Error Handling

### Error Event Format

All errors are emitted via the `error` event:

```typescript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

**Error Payload**:
```typescript
{
  code: string;            // Error code
  message: string;         // Human-readable message
  details?: any;           // Additional error details
  timestamp: string;       // ISO 8601 timestamp
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `AUTH_REQUIRED` | Authentication missing or invalid | Reconnect with valid auth credentials |
| `AUTH_EXPIRED` | JWT token expired | Request new token and reconnect |
| `RATE_LIMIT` | Rate limit exceeded | Wait before retrying |
| `INVALID_PAYLOAD` | Malformed request data | Check payload format |
| `PERMISSION_DENIED` | Insufficient permissions | Verify user has required ProofScore/role |
| `ROOM_NOT_FOUND` | Chat room doesn't exist | Check room ID |
| `MESSAGE_TOO_LONG` | Message exceeds max length | Trim message to 1000 chars |
| `ALREADY_SUBSCRIBED` | Already subscribed to resource | No action needed |
| `NOT_SUBSCRIBED` | Not subscribed to resource | Subscribe first |

---

## Examples

### Complete Integration Example

```typescript
import { io, Socket } from 'socket.io-client';

class VFIDEWebSocket {
  private socket: Socket;

  constructor(
    private url: string,
    private auth: { token: string; signature: string; address: string }
  ) {
    this.socket = io(url, {
      auth: this.auth,
      transports: ['websocket', 'polling']
    });

    this.setupListeners();
  }

  private setupListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to VFIDE WebSocket');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Authentication
    this.socket.on('authenticated', () => {
      console.log('Authentication successful');
      this.subscribeToEvents();
    });

    this.socket.on('auth_error', (error) => {
      console.error('Authentication failed:', error);
    });
  }

  private subscribeToEvents() {
    // Subscribe to governance
    this.socket.emit('governance:subscribe');
    this.socket.on('governance:subscribed', () => {
      console.log('Subscribed to governance');
    });

    // Listen for new proposals
    this.socket.on('governance:proposal_created', (proposal) => {
      console.log('New proposal:', proposal.title);
    });

    // Listen for votes
    this.socket.on('governance:vote_cast', (vote) => {
      console.log('Vote cast on proposal', vote.proposalId);
    });

    // Subscribe to notifications
    this.socket.emit('notification:subscribe');
    this.socket.on('notification:new', (notification) => {
      console.log('New notification:', notification.title);
    });
  }

  // Join a chat room
  joinChat(roomId: string) {
    this.socket.emit('chat:join', { roomId });
    
    this.socket.on('chat:joined', (data) => {
      console.log(`Joined ${data.roomId} with ${data.userCount} users`);
    });

    this.socket.on('chat:message', (message) => {
      console.log(`[${message.senderName}]: ${message.message}`);
    });
  }

  // Send a message
  sendMessage(roomId: string, message: string) {
    this.socket.emit('chat:message', { roomId, message });
  }

  // Vote on proposal
  subscribeToProposal(proposalId: string) {
    this.socket.emit('governance:subscribe_proposal', { proposalId });
    
    this.socket.on('governance:proposal_updated', (proposal) => {
      if (proposal.id === proposalId) {
        console.log('Proposal updated:', proposal);
      }
    });
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const ws = new VFIDEWebSocket(
  'ws://localhost:3001',
  {
    token: 'your-jwt-token',
    signature: 'ethereum-signature',
    address: '0x...'
  }
);

ws.joinChat('proposal-123');
ws.sendMessage('proposal-123', 'Great proposal!');
ws.subscribeToProposal('123');
```

---

## Testing

### Using Socket.IO Client

```bash
npm install socket.io-client
```

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3001', {
  auth: {
    token: 'test-token',
    signature: 'test-signature',
    address: '0xtest'
  }
});

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('governance:subscribe');
});
```

### Using wscat (CLI)

```bash
npm install -g wscat
wscat -c ws://localhost:3001
```

---

## Support

- **Documentation**: [README.md](README.md)
- **WebSocket Guide**: [WEBSOCKET-GUIDE.md](WEBSOCKET-GUIDE.md)
- **GitHub Issues**: [github.com/Scorpio861104/Vfide/issues](https://github.com/Scorpio861104/Vfide/issues)
- **Discord**: [discord.gg/vfide](https://discord.gg/vfide)
