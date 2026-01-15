# VFIDE WebSocket Server

Real-time messaging and notifications server using Socket.IO.

## Features

- ✅ Wallet signature authentication
- ✅ Real-time message delivery
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Presence tracking (online/offline status)
- ✅ Notification broadcasts
- ✅ Governance updates
- ✅ Chat channels
- ✅ Heartbeat mechanism

## Installation

```bash
cd websocket-server
npm install
```

## Running the Server

### Development (no auth required)
```bash
npm run dev
```

### Production
```bash
npm start
```

## Environment Variables

Create a `.env` file:

```bash
WS_PORT=8080

# CORS Configuration
# For development (allows localhost):
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# For production (comma-separated list of allowed origins):
CORS_ORIGIN=https://vfide.com,https://www.vfide.com,https://app.vfide.com

# To allow all origins (NOT RECOMMENDED for production):
# CORS_ORIGIN=*

NODE_ENV=production

# Development only: Allow auth bypass (NEVER set in production)
ALLOW_DEV_AUTH_BYPASS=true
```

**Security Notes**: 
- The `CORS_ORIGIN` can be a comma-separated list of allowed origins
- Setting `CORS_ORIGIN=*` allows all origins and should NEVER be used in production
- The `ALLOW_DEV_AUTH_BYPASS` flag should ONLY be set to `true` in local development environments

## Authentication

In production, clients must provide:
- `address` - User's wallet address
- `signature` - Signature of a message
- `message` - The message that was signed
- `chainId` - Network ID (8453 for Base mainnet)

Example client connection:
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080', {
  auth: {
    address: '0x...',
    signature: '0x...',
    message: 'Sign in to VFIDE',
    chainId: 8453
  }
});
```

## Events

### Client → Server

- `message` - Send a message
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `message:read` - Mark message as read
- `notifications:subscribe` - Subscribe to notifications
- `governance:subscribe` - Subscribe to governance updates
- `governance:proposal:subscribe` - Subscribe to specific proposal
- `chat:channel:join` - Join a chat channel
- `chat:channel:leave` - Leave a chat channel
- `chat:message` - Send message to channel

### Server → Client

- `message` - Receive a message
- `typing` - Typing indicator
- `read` - Message read receipt
- `presence` - User online/offline status
- `notification` - Notification broadcast
- `governance:update` - Governance event
- `chat:message` - Channel message
- `chat:user:joined` - User joined channel
- `chat:user:left` - User left channel
- `heartbeat:ping` - Server heartbeat
- `error` - Error message

## Deployment

For production deployment, consider:

1. **Reverse Proxy**: Use nginx or similar to proxy WebSocket connections
2. **Load Balancing**: Use Socket.IO Redis adapter for multiple instances
3. **SSL/TLS**: Enable HTTPS for secure connections
4. **Monitoring**: Add health check endpoints
5. **Logging**: Implement proper logging (Winston, etc.)

### Example nginx config:
```nginx
location /socket.io/ {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## Scaling with Redis

For multiple server instances:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## Testing

Test the server with `socket.io-client`:

```bash
npm install -g socket.io-client
```

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:8080');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.emit('message', { to: '0x...', content: 'Hello!' });
```
