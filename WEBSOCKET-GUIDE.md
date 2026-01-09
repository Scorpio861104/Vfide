# 🔌 WebSocket Server Implementation Guide

Complete guide for the VFIDE real-time WebSocket infrastructure.

## 📋 Overview

The VFIDE WebSocket server provides real-time communication for:
- Governance proposal updates and voting events
- Multi-channel chat and messaging
- Personal and broadcast notifications
- Presence and typing indicators

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Frontend App   │◄───────►│  Socket.IO       │
│  (React/Next)   │  WSS    │  Server          │
└─────────────────┘         │  (Node.js)       │
                            └──────────────────┘
                                     │
                            ┌────────┴────────┐
                            │                 │
                    ┌───────▼──────┐  ┌──────▼───────┐
                    │   Redis      │  │  Database    │
                    │   (Optional) │  │  (Future)    │
                    └──────────────┘  └──────────────┘
```

## 🚀 Quick Start

### 1. Server Setup

```bash
# Navigate to server directory
cd websocket-server

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration
nano .env

# Start development server
npm run dev
```

### 2. Frontend Configuration

```bash
# Navigate to frontend directory
cd ../frontend

# Add Socket.IO client (already installed)
npm install socket.io-client

# Configure WebSocket URL
echo "NEXT_PUBLIC_WS_URL=http://localhost:8080" >> .env.local

# Start frontend
npm run dev
```

### 3. Test Connection

Open browser console and test:

```javascript
const ws = new WebSocketManager({
  url: 'http://localhost:8080'
});

// Connect (requires wallet signature in production)
await ws.connect('0xYourAddress');

// Subscribe to governance
ws.subscribeToGovernance();

// Listen for updates
ws.on('governance:proposal:updated', (update) => {
  console.log('Proposal updated:', update);
});
```

## 🔐 Authentication

### Development (Simple)

```typescript
// Basic authentication with address only
const ws = new WebSocketManager({
  url: 'http://localhost:8080',
  auth: {
    address: userAddress,
    chainId: 8453
  }
});

await ws.connect(userAddress);
```

### Production (Secure)

```typescript
import { ethers } from 'ethers';

// Get wallet signature
const signer = await provider.getSigner();
const address = await signer.getAddress();
const message = `Sign in to VFIDE\nTimestamp: ${Date.now()}`;
const signature = await signer.signMessage(message);

// Connect with signature
const ws = new WebSocketManager({
  url: 'https://ws.vfide.com',
  auth: {
    signature,
    message,
    address,
    chainId: 8453
  }
});

await ws.connect(address, signature, message, 8453);
```

## 📡 Event Reference

### Governance Events

#### Subscribe to All Governance

```typescript
ws.emit('governance:subscribe', {});

ws.on('governance:subscribed', (data) => {
  console.log('Subscribed to governance');
});
```

#### Subscribe to Specific Proposal

```typescript
ws.emit('governance:proposal:subscribe', proposalId);

ws.on('governance:proposal:subscribed', ({ proposalId }) => {
  console.log(`Subscribed to proposal ${proposalId}`);
});
```

#### Listen for Proposal Updates

```typescript
ws.on('governance:proposal:updated', (update) => {
  console.log('Proposal updated:', {
    proposalId: update.proposalId,
    type: update.type, // 'created' | 'updated' | 'executed' | 'cancelled'
    data: update.data,
    timestamp: update.timestamp,
    chainId: update.chainId
  });
});
```

#### Listen for Votes

```typescript
ws.on('governance:vote:cast', (vote) => {
  console.log('Vote cast:', {
    proposalId: vote.proposalId,
    voter: vote.voter,
    support: vote.support,
    votes: vote.votes,
    reason: vote.reason,
    timestamp: vote.timestamp
  });
});
```

#### Broadcast Proposal Update

```typescript
// Requires authentication
ws.emit('governance:proposal:update', {
  proposalId: '1',
  type: 'created',
  data: {
    title: 'New Proposal',
    description: 'Proposal description',
    proposer: '0x...'
  },
  timestamp: Date.now(),
  chainId: 8453
});
```

### Chat Events

#### Join Channel

```typescript
ws.emit('chat:channel:join', 'general');

ws.on('chat:channel:joined', ({ channel }) => {
  console.log(`Joined ${channel}`);
});

ws.on('chat:user:joined', ({ user, channel, timestamp }) => {
  console.log(`${user} joined ${channel}`);
});
```

#### Send Message

```typescript
ws.emit('chat:message:send', {
  id: 'msg-' + Date.now(),
  channel: 'general',
  author: userAddress,
  content: 'Hello everyone!',
  timestamp: Date.now(),
  chainId: 8453
});
```

#### Listen for Messages

```typescript
ws.on('chat:message:received', (message) => {
  console.log('New message:', {
    id: message.id,
    channel: message.channel,
    author: message.author,
    content: message.content,
    timestamp: message.timestamp
  });
});
```

#### Typing Indicator

```typescript
// Send typing indicator
ws.emit('chat:typing', {
  channel: 'general',
  user: userAddress,
  isTyping: true
});

// Listen for typing
ws.on('chat:typing:update', ({ user, channel, isTyping }) => {
  console.log(`${user} is ${isTyping ? 'typing' : 'not typing'} in ${channel}`);
});
```

#### Message History

```typescript
ws.emit('chat:history:request', {
  channel: 'general',
  limit: 50,
  before: Date.now()
});

ws.on('chat:history:received', ({ channel, messages, hasMore }) => {
  console.log(`History for ${channel}:`, messages);
});
```

#### React to Message

```typescript
ws.emit('chat:message:react', {
  messageId: 'msg-123',
  emoji: '👍',
  channel: 'general'
});

ws.on('chat:message:reaction', ({ messageId, emoji, user }) => {
  console.log(`${user} reacted with ${emoji}`);
});
```

### Notification Events

#### Subscribe to Personal Notifications

```typescript
ws.emit('notifications:subscribe', {});

ws.on('notifications:subscribed', ({ channel }) => {
  console.log('Subscribed to notifications');
});
```

#### Listen for Notifications

```typescript
ws.on('notifications:new', (notification) => {
  console.log('New notification:', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    timestamp: notification.timestamp
  });
});

ws.on('notifications:broadcast', (notification) => {
  console.log('Broadcast notification:', notification);
});
```

#### Mark as Read

```typescript
// Mark single notification as read
ws.emit('notifications:read', notificationId);

ws.on('notifications:read:confirmed', ({ notificationId }) => {
  console.log(`Notification ${notificationId} marked as read`);
});

// Mark all as read
ws.emit('notifications:read:all', {});

ws.on('notifications:read:all:confirmed', ({ timestamp }) => {
  console.log('All notifications marked as read');
});
```

#### Get Unread Count

```typescript
ws.emit('notifications:unread:count', {});

ws.on('notifications:unread:count:response', ({ count }) => {
  console.log(`${count} unread notifications`);
});
```

### Generic Channel Subscriptions

```typescript
// Subscribe to any channel
ws.emit('subscribe', 'custom-channel');

ws.on('subscribed', ({ channel }) => {
  console.log(`Subscribed to ${channel}`);
});

// Unsubscribe
ws.emit('unsubscribe', 'custom-channel');

ws.on('unsubscribed', ({ channel }) => {
  console.log(`Unsubscribed from ${channel}`);
});
```

## 🔧 React Integration

### Using the Hook

```typescript
import { useWebSocket, getWebSocketURL } from '@/lib/websocket';
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address } = useAccount();
  const { isConnected, send, subscribe, ws } = useWebSocket(
    { url: getWebSocketURL() },
    address
  );

  useEffect(() => {
    if (!isConnected || !ws) return;

    // Subscribe to governance
    ws.subscribeToGovernance();

    // Listen for updates
    const unsubscribe = ws.on('governance:proposal:updated', (update) => {
      console.log('Proposal updated:', update);
    });

    return () => {
      unsubscribe();
    };
  }, [isConnected, ws]);

  return (
    <div>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}
```

### Manual Connection

```typescript
import { WebSocketManager, getWebSocketURL } from '@/lib/websocket';
import { useEffect, useRef } from 'react';

function MyComponent() {
  const wsRef = useRef<WebSocketManager | null>(null);

  useEffect(() => {
    const ws = new WebSocketManager({
      url: getWebSocketURL()
    });

    ws.connect(userAddress).then(() => {
      ws.subscribeToGovernance();
      
      ws.on('governance:proposal:updated', (update) => {
        // Handle update
      });
    });

    wsRef.current = ws;

    return () => {
      ws.disconnect();
    };
  }, [userAddress]);

  return <div>My Component</div>;
}
```

## 🚢 Deployment

### Option 1: Render.com (Recommended)

```bash
# Push to GitHub
git push origin main

# Deploy using render.yaml
# 1. Go to render.com
# 2. Connect GitHub repository
# 3. Render will auto-detect render.yaml
# 4. Set JWT_SECRET in environment variables
# 5. Deploy
```

### Option 2: Docker

```bash
# Build image
docker build -t vfide-websocket .

# Run container
docker run -p 8080:8080 \
  -e JWT_SECRET=your-secret \
  -e CORS_ORIGINS=https://your-domain.com \
  vfide-websocket
```

### Option 3: Docker Compose

```bash
# Start services (WebSocket + Redis)
docker-compose up -d

# View logs
docker-compose logs -f websocket

# Stop services
docker-compose down
```

### Option 4: Railway

```bash
railway init
railway up
railway variables set JWT_SECRET=your-secret
railway variables set CORS_ORIGINS=https://your-domain.com
```

## 🔒 Security Best Practices

1. **Always use HTTPS/WSS in production**
2. **Validate message authors match authenticated addresses**
3. **Implement rate limiting** (configured by default)
4. **Use strong JWT secrets** (generate with `openssl rand -base64 32`)
5. **Whitelist CORS origins** (never use '*' in production)
6. **Validate all incoming data** before broadcasting
7. **Monitor connection counts** and implement DDoS protection
8. **Log security events** for audit trails

## 📊 Monitoring

### Health Check

```bash
curl https://ws.vfide.com/health
```

### Metrics to Monitor

- Active connections count
- Messages per second
- Authentication failures
- Memory usage
- CPU usage
- Network I/O

### Recommended Tools

- **PM2** for process management
- **Winston** for logging (already configured)
- **Prometheus** for metrics
- **Grafana** for visualization
- **Sentry** for error tracking

## 🧪 Testing

WebSocket tests are located in `frontend/__tests__/websocket.test.tsx`.

Run tests:

```bash
cd frontend
npm run test:websocket
```

Manual testing:

```bash
# Install wscat
npm install -g wscat

# Connect to server
wscat -c http://localhost:8080

# Send test message
{"auth":{"address":"0x123"}}
```

## 📈 Scaling

For high traffic, use Redis adapter:

```bash
# Install Redis
docker run -d -p 6379:6379 redis:7-alpine

# Enable in .env
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

Then update `src/index.ts`:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

## 🆘 Troubleshooting

### Connection Refused

- Check server is running: `curl http://localhost:8080/health`
- Verify CORS origins in `.env`
- Check firewall rules

### Authentication Failed

- Verify signature is recent (< 5 minutes)
- Check address matches signature
- Ensure JWT_SECRET matches on server

### Messages Not Received

- Verify subscription to correct channel
- Check client is connected: `ws.isConnected`
- Review server logs for errors

### High Memory Usage

- Enable Redis for distributed state
- Implement message persistence
- Add connection limits per user

## 📚 Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [WebSocket Protocol RFC](https://tools.ietf.org/html/rfc6455)
- [Frontend Testing Guide](../frontend/TESTING.md)

---

**Last Updated:** January 8, 2026  
**Server Version:** 1.0.0  
**Socket.IO Version:** 4.6.1
