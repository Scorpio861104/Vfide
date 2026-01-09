# VFIDE WebSocket Server

Real-time communication server for the VFIDE DAO platform using Socket.IO.

## 🚀 Features

- **Authentication**: JWT token and Ethereum signature verification
- **Rate Limiting**: IP-based connection limits to prevent abuse
- **Heartbeat**: Automatic connection health monitoring
- **Governance Updates**: Real-time proposal and voting events
- **Chat/Messaging**: Multi-channel communication system
- **Notifications**: Personal and broadcast notifications
- **Room Management**: Subscribe/unsubscribe to specific channels
- **Multi-Chain Support**: Base, Polygon, zkSync Era

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## 🔧 Configuration

Edit `.env` file:

```env
# Server Configuration
PORT=8080
NODE_ENV=development

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Redis Configuration (optional, for scaling)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Rate Limiting
RATE_LIMIT_MAX_CONNECTIONS_PER_IP=10
RATE_LIMIT_WINDOW_MS=60000

# Heartbeat Configuration
HEARTBEAT_INTERVAL=30000
HEARTBEAT_TIMEOUT=5000

# Log Level (error, warn, info, debug)
LOG_LEVEL=info
```

## 🏃 Running

### Development

```bash
npm run dev
```

### Production

```bash
# Build TypeScript
npm run build

# Start server
npm start
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f websocket

# Stop
docker-compose down
```

## 📡 API Reference

### Authentication

Two authentication methods are supported:

#### Method 1: JWT Token

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Method 2: Ethereum Signature

```typescript
import { io } from 'socket.io-client';
import { ethers } from 'ethers';

const signer = await provider.getSigner();
const address = await signer.getAddress();
const message = `Sign in to VFIDE\nTimestamp: ${Date.now()}`;
const signature = await signer.signMessage(message);

const socket = io('http://localhost:8080', {
  auth: {
    signature,
    message,
    address,
    chainId: 8453 // Base mainnet
  }
});
```

### Events

#### Heartbeat

```typescript
// Server sends ping
socket.on('heartbeat:ping', () => {
  // Client responds with pong
  socket.emit('heartbeat:pong');
});
```

#### Governance

```typescript
// Subscribe to governance updates
socket.emit('governance:subscribe');

// Subscribe to specific proposal
socket.emit('governance:proposal:subscribe', proposalId);

// Listen for proposal updates
socket.on('governance:proposal:updated', (update) => {
  console.log('Proposal updated:', update);
});

// Listen for votes
socket.on('governance:vote:cast', (vote) => {
  console.log('Vote cast:', vote);
});

// Broadcast proposal update (authenticated users only)
socket.emit('governance:proposal:update', {
  proposalId: '1',
  type: 'created',
  data: { /* proposal data */ },
  timestamp: Date.now(),
  chainId: 8453
});

// Broadcast vote
socket.emit('governance:vote', {
  proposalId: '1',
  voter: '0x...',
  support: true,
  votes: '1000000000000000000',
  timestamp: Date.now(),
  chainId: 8453
});
```

#### Chat

```typescript
// Join chat channel
socket.emit('chat:channel:join', 'general');

// Send message
socket.emit('chat:message:send', {
  id: 'msg-123',
  channel: 'general',
  author: '0x...',
  content: 'Hello!',
  timestamp: Date.now(),
  chainId: 8453
});

// Listen for messages
socket.on('chat:message:received', (message) => {
  console.log('New message:', message);
});

// Typing indicator
socket.emit('chat:typing', {
  channel: 'general',
  user: '0x...',
  isTyping: true
});

// Listen for typing
socket.on('chat:typing:update', (indicator) => {
  console.log('User typing:', indicator);
});

// Request message history
socket.emit('chat:history:request', {
  channel: 'general',
  limit: 50,
  before: Date.now()
});

// React to message
socket.emit('chat:message:react', {
  messageId: 'msg-123',
  emoji: '👍',
  channel: 'general'
});

// Leave channel
socket.emit('chat:channel:leave', 'general');
```

#### Notifications

```typescript
// Subscribe to personal notifications
socket.emit('notifications:subscribe');

// Listen for notifications
socket.on('notifications:new', (notification) => {
  console.log('New notification:', notification);
});

// Listen for broadcasts
socket.on('notifications:broadcast', (notification) => {
  console.log('Broadcast notification:', notification);
});

// Mark as read
socket.emit('notifications:read', notificationId);

// Mark all as read
socket.emit('notifications:read:all');

// Get unread count
socket.emit('notifications:unread:count');
socket.on('notifications:unread:count:response', (data) => {
  console.log('Unread count:', data.count);
});

// Request history
socket.emit('notifications:history', { limit: 50, offset: 0 });
socket.on('notifications:history:response', (data) => {
  console.log('Notifications:', data.notifications);
});
```

#### Generic Channels

```typescript
// Subscribe to any channel
socket.emit('subscribe', 'my-channel');
socket.on('subscribed', (data) => {
  console.log('Subscribed to:', data.channel);
});

// Unsubscribe
socket.emit('unsubscribe', 'my-channel');
socket.on('unsubscribed', (data) => {
  console.log('Unsubscribed from:', data.channel);
});
```

## 🏗️ Architecture

```
websocket-server/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── middleware/
│   │   ├── auth.ts           # JWT & signature authentication
│   │   └── rateLimit.ts      # Connection rate limiting
│   ├── handlers/
│   │   ├── index.ts          # Event handler registration
│   │   ├── governance.ts     # Governance events
│   │   ├── chat.ts           # Chat/messaging events
│   │   └── notification.ts   # Notification events
│   └── utils/
│       ├── logger.ts         # Winston logger
│       └── heartbeat.ts      # Connection health check
├── Dockerfile                # Docker build configuration
├── docker-compose.yml        # Docker Compose setup
└── package.json              # Dependencies and scripts
```

## 🔒 Security

- **Authentication Required**: All connections must authenticate via JWT or Ethereum signature
- **Rate Limiting**: 10 connections per IP per minute (configurable)
- **Message Validation**: Author address must match authenticated address
- **CORS Protection**: Whitelist allowed origins
- **Signature Expiry**: Signatures valid for 5 minutes

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

### Logs

Logs are written to:
- Console (development)
- `logs/error.log` (production errors)
- `logs/combined.log` (production all logs)

## 🚀 Deployment

### Render.com

1. Connect GitHub repository
2. Create new Web Service
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables from `.env.example`
6. Deploy

### Railway

```bash
railway init
railway up
railway variables set JWT_SECRET=your-secret
```

### Heroku

```bash
heroku create vfide-websocket
heroku config:set JWT_SECRET=your-secret
heroku config:set CORS_ORIGINS=https://your-frontend.com
git push heroku main
```

### DigitalOcean App Platform

1. Create new app from GitHub
2. Select `websocket-server` as source directory
3. Set environment variables
4. Deploy

## 🧪 Testing

Frontend WebSocket tests are located in `frontend/__tests__/websocket.test.tsx`.

To test manually:

```bash
# Start server
npm run dev

# In another terminal, use wscat
npm install -g wscat

# Connect (replace with actual token)
wscat -c ws://localhost:8080 -H "Authorization: Bearer your-token"
```

## 📈 Scaling

For production scaling, enable Redis:

```env
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-host:6379
```

Then configure Socket.IO adapter:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Scorpio861104/Vfide/issues)
- **Documentation**: See [TESTING.md](../frontend/TESTING.md)
- **Discord**: [Join our community](#)

---

**Built with ❤️ by the VFIDE team**
