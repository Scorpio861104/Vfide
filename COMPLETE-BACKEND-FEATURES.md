# Complete Backend Features Documentation

This document provides comprehensive documentation for ALL backend features in the VFIDE platform, from small utilities to critical infrastructure.

## Table of Contents
1. [Authentication & Security](#authentication--security)
2. [Rate Limiting](#rate-limiting)
3. [Input Validation](#input-validation)
4. [Social Features](#social-features)
5. [Merchant Portal](#merchant-portal)
6. [Quest System](#quest-system)
7. [Analytics](#analytics)
8. [WebSocket Real-Time](#websocket-real-time)
9. [Smart Contract Integration](#smart-contract-integration)

---

## Authentication & Security

### JWT Authentication Framework (`lib/jwtAuth.ts`)

Ready-to-use JWT authentication system (requires `npm install jsonwebtoken`):

```typescript
import { generateAccessToken, generateRefreshToken, verifyToken } from '@/lib/jwtAuth';

// Generate tokens
const accessToken = generateAccessToken(userAddress, chainId);
const refreshToken = generateRefreshToken(userAddress, chainId);

// Verify token
const payload = verifyToken(accessToken);

// Refresh access token
const newAccessToken = refreshAccessToken(refreshToken);

// Logout (blacklist token)
blacklistToken(accessToken);
```

**Features:**
- Access tokens (24h expiry)
- Refresh tokens (7d expiry)
- Token blacklisting
- Secure token validation

**Environment Variables:**
```bash
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d
```

### CORS Configuration

WebSocket server includes production-ready CORS:

```bash
# Development
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# Production
CORS_ORIGIN=https://vfide.com,https://www.vfide.com,https://app.vfide.com

# Wildcard (NOT recommended)
CORS_ORIGIN=*
```

**Features:**
- Comma-separated origin list
- Origin validation callback
- Development vs production modes
- Security warnings for wildcard

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window | Purpose |
|--------------|-------|--------|---------|
| Authentication | 10 req | 1 min | Prevent brute force |
| Registration | 5 req | 1 hour | Prevent spam accounts |
| KYC Submission | 3 req | 1 hour | Prevent document spam |
| Quest Claims | 20 req | 1 min | Prevent reward farming |
| Story Creation | 10 req | 1 min | Reduce storage load |
| Post Creation | 20 req | 1 min | Prevent spam posts |
| Read Endpoints | 30-60 req | 1 min | Normal usage |

**Implementation:**
```typescript
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';

const clientId = getClientIdentifier(request);
const rateLimit = checkRateLimit(clientId, { maxRequests: 20, windowMs: 60000 });

if (!rateLimit.success) {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429, headers: getRateLimitHeaders(rateLimit) }
  );
}
```

**Headers Returned:**
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Timestamp when limit resets

---

## Input Validation

Comprehensive validation library (`lib/inputValidation.ts`):

### Address Validation
```typescript
import { validateAddress, isValidAddress } from '@/lib/inputValidation';

// Check format
if (isValidAddress('0x...')) { }

// Validate and normalize (lowercase)
const address = validateAddress(userInput); // Throws if invalid
```

### Numeric Validation
```typescript
import { validatePositiveInteger, validateLimit, validateOffset } from '@/lib/inputValidation';

const id = validatePositiveInteger(input, 'User ID');
const limit = validateLimit(params.get('limit')); // 1-100, default 50
const offset = validateOffset(params.get('offset')); // ≥0, default 0
```

### Enum Validation
```typescript
import { validateEnum, validateOptionalEnum } from '@/lib/inputValidation';

const STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;
const status = validateEnum(input, 'Status', STATUS_VALUES);
```

### String Validation
```typescript
import { validateStringLength, validateOptionalStringLength } from '@/lib/inputValidation';

const name = validateStringLength(input, 'Name', 3, 100);
const bio = validateOptionalStringLength(input, 1000);
```

### Consistent Error Responses
```typescript
import { createErrorResponse } from '@/lib/inputValidation';

return NextResponse.json(
  createErrorResponse('Invalid input'),
  { status: 400 }
);
```

---

## Social Features

### Posts API

**Create Post:**
```
POST /api/social/posts
{
  "userAddress": "0x...",
  "content": "Post text (max 5000 chars)",
  "mediaUrl": "https://...", // Optional
  "mediaType": "image" // Optional: image, video
}
```

**List Posts:**
```
GET /api/social/posts?userAddress=0x...&limit=50&offset=0
```

**Response:**
```json
{
  "posts": [
    {
      "id": 1,
      "author_address": "0x...",
      "author_username": "username",
      "content": "Post content",
      "like_count": 42,
      "comment_count": 10,
      "created_at": "2026-01-15T..."
    }
  ],
  "count": 50,
  "limit": 50,
  "offset": 0
}
```

### Stories API

**Create Story (24h expiry):**
```
POST /api/social/stories
{
  "userAddress": "0x...",
  "mediaUrl": "https://...",
  "mediaType": "image", // image or video
  "caption": "Story caption (max 500 chars)" // Optional
}
```

**List Active Stories:**
```
GET /api/social/stories?userAddress=0x...&limit=50&offset=0
```

**Delete Story:**
```
DELETE /api/social/stories?storyId=123&userAddress=0x...
```

**Database Schema:**
- `social_posts` - Permanent posts
- `post_likes` - Like tracking
- `post_comments` - Comments
- `social_stories` - 24-hour stories
- `story_views` - View tracking

---

## Merchant Portal

### Registration

**Register as Merchant:**
```
POST /api/merchant/registration
{
  "ownerAddress": "0x...",
  "businessName": "My Business",
  "businessType": "retail",
  "businessDescription": "We sell products...",
  "websiteUrl": "https://mybusiness.com", // Optional
  "contactEmail": "contact@mybusiness.com",
  "contactPhone": "+1234567890" // Optional
}
```

**Check Registration:**
```
GET /api/merchant/registration?userAddress=0x...
```

### KYC Verification

**Submit KYC Documents:**
```
POST /api/merchant/kyc
{
  "userAddress": "0x...",
  "documentType": "passport", // passport, drivers_license, national_id
  "documentNumber": "ABC123456",
  "documentFrontUrl": "https://storage.../front.jpg",
  "documentBackUrl": "https://storage.../back.jpg", // Optional
  "selfieUrl": "https://storage.../selfie.jpg",
  "additionalInfo": "Any additional notes" // Optional
}
```

**Check KYC Status:**
```
GET /api/merchant/kyc?userAddress=0x...
```

**Response:**
```json
{
  "submitted": true,
  "kyc": {
    "status": "pending", // pending, approved, rejected
    "submitted_at": "2026-01-15T...",
    "verified_at": null,
    "rejection_reason": null
  }
}
```

### Dashboard

**Get Dashboard Data:**
```
GET /api/merchant/dashboard?userAddress=0x...
```

**Response:**
```json
{
  "merchant": {
    "id": 1,
    "businessName": "My Business",
    "status": "approved",
    "createdAt": "2026-01-01T..."
  },
  "stats": {
    "total_transactions": 150,
    "completed_transactions": 145,
    "pending_transactions": 5,
    "total_revenue": "12500.50",
    "revenue_30_days": "3200.00",
    "revenue_7_days": "850.00"
  },
  "recentTransactions": [...],
  "revenueTrend": [...]
}
```

**Merchant Status Flow:**
1. `pending` - Registration submitted
2. `kyc_submitted` - KYC documents provided
3. `approved` - Ready to accept payments
4. `rejected` - Application denied

**Database Schema:**
- `merchants` - Business information
- `merchant_kyc` - KYC documents and status
- `merchant_transactions` - Transaction history

---

## Quest System

Automatic quest tracking system monitors user actions:

### Tracked Events
- `wallet_connected` - First connection
- `daily_login` - Login streaks
- `message_sent` - Messaging activity
- `friend_added` - Social connections
- `group_joined` - Community participation
- `vault_created` - Vault usage
- `proposal_voted` - Governance participation
- `badge_earned` - Achievement collection

### Usage

```typescript
import { trackQuestEvent } from '@/lib/questEvents';

// Track event (non-blocking)
await trackQuestEvent({
  userAddress: '0x...',
  eventType: 'message_sent',
  metadata: { recipientAddress: '0x...' }
});
```

**Features:**
- Automatic progress updates
- Daily and weekly quests
- Completion notifications
- XP and reward calculations
- Database persistence

---

## Analytics

### Track Events

```typescript
import { trackEvent, MetricType } from '@/lib/analytics';

// Client-side tracking (auto-persists to database)
trackEvent(MetricType.PAGE_VIEW, userAddress, { path: '/dashboard' });
trackEvent(MetricType.MESSAGE_SENT, userAddress, { recipientAddress: '0x...' });
```

### API Endpoints

**Store Event:**
```
POST /api/analytics/track
{
  "type": "page_view",
  "userId": "0x...",
  "metadata": { "path": "/dashboard" }
}
```

**Query Events:**
```
GET /api/analytics/track?type=page_view&userId=0x...&startTime=1234567890&endTime=1234567900
```

**Database Schema:**
- `analytics_events` table with indexed queries
- Supports filtering by type, user, time range

---

## WebSocket Real-Time

Production-ready Socket.IO server with authentication.

### Server Setup

```bash
cd websocket-server
npm install
npm run dev  # Development
npm start    # Production
```

### Client Connection

```typescript
import { useWebSocket } from '@/lib/websocket';

const { isConnected, send, subscribe, getWebSocket } = useWebSocket({
  url: 'http://localhost:8080',
  auth: {
    address: userAddress,
    signature: walletSignature,
    message: signedMessage,
    chainId: 8453
  }
}, userAddress);

// Send message
send({
  type: 'message',
  from: userAddress,
  to: recipientAddress,
  data: { content: 'Hello!' }
});

// Subscribe to events
subscribe('message', (msg) => {
  console.log('Received:', msg);
});
```

### Supported Events

**Client → Server:**
- `message` - Send DM
- `typing:start/stop` - Typing indicators
- `message:read` - Mark as read
- `notifications:subscribe` - Subscribe to notifications
- `governance:subscribe` - Subscribe to governance
- `chat:channel:join` - Join channel

**Server → Client:**
- `message` - Receive DM
- `typing` - Typing indicator
- `read` - Message read
- `presence` - User online/offline
- `notification` - Notification
- `governance:update` - Governance event

### Security Features
- Wallet signature authentication
- Origin validation (CORS)
- Heartbeat mechanism
- Graceful shutdown

---

## Smart Contract Integration

### Escrow Hooks

```typescript
import { useEscrow } from '@/lib/escrow/useEscrow';

const {
  escrows,
  loading,
  createEscrow,
  releaseEscrow,
  refundEscrow,
  activeEscrows,
  completedEscrows
} = useEscrow();

// Create escrow
await createEscrow(
  merchantAddress,
  '100', // Amount in tokens
  'order-123' // Order ID
);

// Release to merchant
await releaseEscrow(escrowId);
```

**Features:**
- Real contract reads (no mocks)
- Automatic token approval
- State management with enums
- Error handling

### Supported Contracts
- VFIDEToken (ERC20)
- VaultHub/VaultInfrastructure
- UserVault
- DAO/DAOTimelock
- SecurityHub
- GuardianRegistry
- VFIDEBadgeNFT
- MerchantPortal
- CommerceEscrow
- ProofScoreBurnRouter
- EmergencyBreaker

---

## Database Migrations

Run the complete schema:

```bash
psql $DATABASE_URL < init-db.sql
```

**Tables Created:**
- Core: users, messages, notifications
- Social: social_posts, post_likes, post_comments, social_stories, story_views
- Merchants: merchants, merchant_kyc, merchant_transactions
- Quests: daily_quests, weekly_quests, user_quest_progress
- Gamification: user_gamification, badges
- Analytics: analytics_events
- And 20+ more tables

**All tables include:**
- Primary keys
- Foreign key constraints
- Indexed columns
- Timestamps

---

## Environment Variables

Complete list of required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Blockchain
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_VAULT_HUB_ADDRESS=0x...
NEXT_PUBLIC_DAO_ADDRESS=0x...

# WebSocket
NEXT_PUBLIC_WS_URL=http://localhost:8080
WS_PORT=8080
CORS_ORIGIN=http://localhost:3000
ALLOW_DEV_AUTH_BYPASS=true # Development only!

# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# Node Environment
NODE_ENV=production
```

---

## Testing

### Rate Limiting
```bash
# Should fail after 10 requests
for i in {1..15}; do curl http://localhost:3000/api/auth; done
```

### Input Validation
```bash
# Should return 400 for invalid address
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"address": "invalid"}'
```

### WebSocket
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:8080');
socket.on('connect', () => console.log('Connected!'));
```

---

## Performance Considerations

### Current Implementation
- In-memory rate limiting (single instance)
- Direct database connections (pooled)
- Synchronous quest event processing
- No analytics aggregation

### Recommended Upgrades (Large Scale)
- Redis for distributed rate limiting
- Redis adapter for WebSocket scaling
- Queue system for quest events (Bull/BullMQ)
- Analytics pre-aggregation jobs
- CDN for media files

---

## Security Best Practices

✅ **Implemented:**
- Rate limiting on all endpoints
- Input validation
- SQL injection protection (parameterized queries)
- CORS validation
- Wallet signature verification
- Message encryption (ECIES)

⚠️ **Recommended Additions:**
- Enable JWT (install jsonwebtoken)
- Add CSRF tokens for state-changing operations
- Implement API key rotation
- Add security headers (helmet)
- Enable database query logging
- Add intrusion detection

---

## API Response Format

All APIs follow consistent format:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed"
}
```

**Error:**
```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2026-01-15T..."
}
```

**Rate Limited:**
```json
{
  "error": "Too many requests. Please slow down.",
  "status": 429
}
```

---

## Support

For questions or issues:
- Check the main documentation
- Review API endpoints in `/app/api`
- Check utility functions in `/lib`
- Review database schema in `init-db.sql`

---

**Last Updated:** 2026-01-15  
**Version:** 2.0.0 - Complete Feature Set
