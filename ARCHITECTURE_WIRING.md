# Vfide System Architecture & Wiring Diagram

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  

## System Overview

This document provides a comprehensive view of how all components in the Vfide application are wired together, including frontend, backend, blockchain, database, and external services.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Web App │  │  Mobile  │  │  Wallet  │  │ Browser  │       │
│  │ (Chrome) │  │  Safari  │  │Extension │  │ Desktop  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (Next.js 16)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  App Router (77 Pages)                                     │ │
│  │  - Dashboard, Profile, Pay, Wallet, Messaging, etc.       │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Components (246 Components)                               │ │
│  │  - UI, Forms, Modals, Charts, Navigation, etc.           │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Web3 Integration                                          │ │
│  │  - wagmi v2, RainbowKit, viem                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   API Layer       │  │  WebSocket       │  │  Blockchain      │
│  (49 Endpoints)   │  │  (Socket.IO)     │  │  (RPC Nodes)     │
└───────────────────┘  └──────────────────┘  └──────────────────┘
           │                    │                    │
           ▼                    ▼                    │
┌─────────────────────────────────────────────────┐ │
│           DATABASE LAYER (PostgreSQL)            │ │
│  - Users, Messages, Friends, Groups              │ │
│  - Transactions, Notifications, Rewards          │ │
│  - Proposals, Badges, Endorsements              │ │
└─────────────────────────────────────────────────┘ │
                                                     │
           ┌─────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 BLOCKCHAIN LAYER (Multi-Chain)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Base        │  │  Polygon     │  │  zkSync      │         │
│  │  Mainnet     │  │  PoS         │  │  Era         │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  Smart Contracts (21):                                          │
│  - VFIDEToken, VaultInfrastructure, DAO                        │
│  - SecurityHub, GuardianRegistry, CommerceEscrow               │
│  - MerchantPortal, ProofLedger, and more                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Wiring Details

### 1. Frontend → API Communication

```typescript
// Component makes authenticated API call
┌─────────────────────────────────────────┐
│ React Component                          │
│ (e.g., components/messages/ChatWindow)  │
└─────────────────────────────────────────┘
              │
              │ 1. User action (send message)
              ▼
┌─────────────────────────────────────────┐
│ API Client (lib/api-client.ts)          │
│ - Adds JWT token to headers             │
│ - Handles request/response               │
└─────────────────────────────────────────┘
              │
              │ 2. HTTP POST with JWT
              ▼
┌─────────────────────────────────────────┐
│ API Route (app/api/messages/route.ts)   │
│ - Rate limiting check                    │
│ - Authentication (requireAuth)           │
│ - Validation (Zod schema)                │
│ - Authorization check                    │
└─────────────────────────────────────────┘
              │
              │ 3. Validated data
              ▼
┌─────────────────────────────────────────┐
│ Database (lib/db.ts)                     │
│ - Parameterized query                    │
│ - Transaction support                    │
└─────────────────────────────────────────┘
              │
              │ 4. Query result
              ▼
┌─────────────────────────────────────────┐
│ API Response                             │
│ - JSON formatted                         │
│ - Proper status code                     │
└─────────────────────────────────────────┘
              │
              │ 5. Response data
              ▼
┌─────────────────────────────────────────┐
│ React Component                          │
│ - Update UI state                        │
│ - Display to user                        │
└─────────────────────────────────────────┘
```

---

### 2. Authentication Flow

```typescript
// User authentication via wallet
┌─────────────────────────────────────────┐
│ User clicks "Connect Wallet"             │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ RainbowKit Modal                         │
│ - Select wallet (MetaMask, etc.)        │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ wagmi useConnect Hook                    │
│ - Connect to wallet                      │
│ - Get user address                       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Request Signature                        │
│ - Message: "Sign in to Vfide..."        │
│ - User signs with wallet                 │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Backend Verification                     │
│ - Verify signature (lib/auth)           │
│ - Generate JWT token                     │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Store JWT                                │
│ - Client-side storage                    │
│ - Include in future requests             │
└─────────────────────────────────────────┘
```

---

### 3. Real-Time Messaging Flow

```typescript
// Real-time message delivery
┌─────────────────────────────────────────┐
│ User A: Send Message                     │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ POST /api/messages                       │
│ - Authenticate sender                    │
│ - Validate message content               │
│ - Store in database                      │
└─────────────────────────────────────────┘
              │
              ├──────────────────────────────┐
              ▼                              ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ WebSocket Server          │  │ Database                  │
│ (Socket.IO)              │  │ - messages table          │
│ - Emit 'message' event   │  │ - notifications table     │
└──────────────────────────┘  └──────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ User B: WebSocket Client                 │
│ - Receive 'message' event                │
│ - Update UI instantly                    │
└─────────────────────────────────────────┘
```

---

### 4. Payment Transaction Flow

```typescript
// Crypto payment end-to-end
┌─────────────────────────────────────────┐
│ User A: Initiate Payment                 │
│ - Enter amount, recipient                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Frontend Validation                      │
│ - Validate amount (lib/validation.ts)   │
│ - Validate address (lib/sanitize.ts)    │
│ - Check balance                          │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Smart Contract Interaction               │
│ - Prepare transaction (viem)             │
│ - Estimate gas                           │
│ - Show preview to user                   │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ User Confirms in Wallet                  │
│ - Review transaction details             │
│ - Sign transaction                       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Broadcast to Blockchain                  │
│ - Submit transaction                     │
│ - Get transaction hash                   │
└─────────────────────────────────────────┘
              │
              ├──────────────────────────────┐
              ▼                              ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ Store in Database         │  │ Monitor Blockchain        │
│ POST /api/crypto/         │  │ - Wait for confirmations  │
│ transactions              │  │ - Listen for events       │
└──────────────────────────┘  └──────────────────────────┘
              │                              │
              └──────────────┬───────────────┘
                            ▼
              ┌─────────────────────────────────────────┐
              │ Update Transaction Status                │
              │ - Update database                        │
              │ - Notify both users                      │
              │ - Update UI                              │
              └─────────────────────────────────────────┘
```

---

### 5. Database Schema Wiring

```sql
-- Core tables and relationships
┌─────────────┐         ┌──────────────┐
│   users     │◄────────│  messages    │
│ - id        │         │ - sender_id  │
│ - address   │         │ - recipient  │
└─────────────┘         └──────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│  friends    │         │ notifications│
│ - user1_id  │         │ - user_id    │
│ - user2_id  │         │ - type       │
└─────────────┘         └──────────────┘
       │
       ▼
┌─────────────┐         ┌──────────────┐
│  groups     │◄────────│ group_members│
│ - id        │         │ - group_id   │
│ - name      │         │ - user_id    │
└─────────────┘         └──────────────┘
       │
       ▼
┌─────────────┐
│group_invites│
│ - code      │
│ - group_id  │
└─────────────┘
```

---

### 6. State Management Flow

```typescript
// Client-side state management
┌─────────────────────────────────────────┐
│ Browser                                  │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ React Component State (useState)    │ │
│  │ - Local UI state                    │ │
│  │ - Form inputs, toggles, etc.        │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ TanStack Query (Server State)      │ │
│  │ - API response caching              │ │
│  │ - Automatic refetching              │ │
│  │ - Optimistic updates                │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ wagmi (Blockchain State)            │ │
│  │ - Wallet connection                 │ │
│  │ - Account info                      │ │
│  │ - Contract reads                    │ │
│  │ - Transaction status                │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Context Providers (Shared State)    │ │
│  │ - Theme context                     │ │
│  │ - Auth context                      │ │
│  │ - WebSocket context                 │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

### 7. Smart Contract Integration

```typescript
// Contract call flow
┌─────────────────────────────────────────┐
│ Frontend Component                       │
│ - User wants to transfer tokens          │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Import Contract ABI                      │
│ import { VFIDETokenABI } from '@/lib/   │
│   abis'                                  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Get Contract Address                     │
│ const address = CONTRACTS[chainId]      │
│   .VFIDE_TOKEN                           │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Prepare Transaction (wagmi)              │
│ const { writeContract } =                │
│   useWriteContract()                     │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Execute Transaction                      │
│ writeContract({                          │
│   address,                               │
│   abi: VFIDETokenABI,                   │
│   functionName: 'transfer',             │
│   args: [to, amount]                    │
│ })                                       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Wallet Signs Transaction                 │
│ - User approves in wallet UI             │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Transaction Submitted                    │
│ - Returns transaction hash               │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Wait for Confirmation (wagmi)            │
│ useWaitForTransactionReceipt({ hash })  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Update UI                                │
│ - Show success/failure                   │
│ - Update balances                        │
└─────────────────────────────────────────┘
```

---

### 8. Security Layer Wiring

```typescript
// Request security layers
┌─────────────────────────────────────────┐
│ Incoming Request                         │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Layer 1: Next.js Security Headers        │
│ - CSP, X-Frame-Options, etc.            │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Layer 2: Rate Limiting                   │
│ - Check request count                    │
│ - Return 429 if exceeded                 │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Layer 3: Authentication                  │
│ - Extract JWT from header                │
│ - Verify token signature                 │
│ - Return 401 if invalid                  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Layer 4: Input Validation                │
│ - Zod schema validation                  │
│ - Sanitize input                         │
│ - Return 400 if invalid                  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Layer 5: Authorization                   │
│ - Check resource ownership               │
│ - Verify permissions                     │
│ - Return 403 if unauthorized             │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Layer 6: Business Logic                  │
│ - Execute operation                      │
│ - Parameterized DB queries               │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Layer 7: Response                        │
│ - Format response                        │
│ - Set appropriate headers                │
│ - Return to client                       │
└─────────────────────────────────────────┘
```

---

### 9. Error Handling Cascade

```typescript
// Error handling flow
┌─────────────────────────────────────────┐
│ Error Occurs                             │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Try-Catch Block                          │
│ - Catch error in component/API           │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Error Logging                            │
│ - console.error for debugging            │
│ - Sentry for production tracking         │
└─────────────────────────────────────────┘
              │
              ├───────────────┬───────────────┐
              ▼               ▼               ▼
    ┌─────────────┐  ┌──────────┐  ┌──────────────┐
    │  Frontend   │  │ API Route│  │  Smart       │
    │  Error      │  │ Error    │  │  Contract    │
    │  Boundary   │  │ Response │  │  Error       │
    └─────────────┘  └──────────┘  └──────────────┘
              │               │               │
              └───────────────┴───────────────┘
                            ▼
              ┌─────────────────────────────────────────┐
              │ User-Friendly Error Message              │
              │ - Clear description                      │
              │ - Action items                           │
              │ - Contact support option                 │
              └─────────────────────────────────────────┘
```

---

### 10. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel Edge Network                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │  Region 1  │  │  Region 2  │  │  Region N  │               │
│  │  (CDN)     │  │  (CDN)     │  │  (CDN)     │               │
│  └────────────┘  └────────────┘  └────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Serverless Functions                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Next.js API Routes (Serverless)                           │ │
│  │  - Auto-scaling                                            │ │
│  │  - Distributed globally                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
  │ PostgreSQL  │  │ Upstash Redis│  │  WebSocket   │
  │ (Supabase/  │  │ (Rate Limit) │  │  Server      │
  │  Neon)      │  │              │  │  (Separate)  │
  └─────────────┘  └──────────────┘  └──────────────┘
```

---

## Data Flow Examples

### Example 1: User Registration

```
1. User clicks "Connect Wallet" button
   └─> RainbowKit modal opens
   
2. User selects MetaMask
   └─> wagmi calls wallet_requestAccounts
   
3. User approves connection
   └─> Frontend receives wallet address
   
4. Frontend requests signature for "Sign in to Vfide"
   └─> User signs message in wallet
   
5. Frontend sends signature to /api/auth/verify
   └─> Backend verifies signature
   └─> Backend checks if user exists in DB
   └─> If not, creates new user record
   
6. Backend generates JWT token
   └─> Returns token to frontend
   
7. Frontend stores JWT
   └─> Includes in Authorization header for future requests
   
8. Frontend redirects to dashboard
   └─> User is now authenticated
```

### Example 2: Sending a Message

```
1. User types message in chat
   └─> React state updates with input value
   
2. User clicks "Send"
   └─> Form validation (Zod schema)
   └─> Sanitization (DOMPurify)
   
3. POST /api/messages with JWT
   └─> Rate limit check (100 req/min)
   └─> Authentication (verify JWT)
   └─> Authorization (verify sender owns address)
   └─> Input validation (Zod)
   
4. Database transaction begins
   └─> Get sender and recipient IDs
   └─> Insert message record
   └─> Create notification for recipient
   └─> Commit transaction
   
5. WebSocket emit 'message' event
   └─> All connected clients for conversation receive event
   
6. Recipient's browser receives WebSocket event
   └─> Updates chat UI instantly
   └─> Shows notification
```

### Example 3: Token Transfer

```
1. User enters recipient address and amount
   └─> Frontend validates address format
   └─> Frontend validates amount is positive
   
2. User clicks "Send"
   └─> Check wallet balance
   └─> Estimate gas cost
   └─> Show transaction preview
   
3. User confirms in preview
   └─> Prepare transaction data
   └─> Call writeContract (wagmi)
   
4. Wallet popup appears
   └─> User reviews transaction
   └─> User signs transaction
   
5. Transaction submitted to blockchain
   └─> Returns transaction hash
   └─> Frontend displays pending status
   
6. Store transaction in database
   └─> POST /api/crypto/transactions
   └─> Status: "pending"
   
7. Wait for confirmation
   └─> useWaitForTransactionReceipt
   └─> Listen for Transfer event
   
8. Transaction confirmed
   └─> Update database status: "confirmed"
   └─> Notify both sender and recipient
   └─> Update UI balances
   └─> Show success message
```

---

## Critical Dependencies

### Frontend Dependencies
- **React 19** - UI library
- **Next.js 16** - Framework
- **wagmi v2** - Web3 hooks
- **viem** - Ethereum library
- **RainbowKit** - Wallet connection
- **TanStack Query** - Server state
- **Zod** - Validation
- **Tailwind CSS** - Styling

### Backend Dependencies
- **Next.js API Routes** - API framework
- **pg** - PostgreSQL client
- **jsonwebtoken** - JWT authentication
- **Socket.IO** - WebSocket
- **DOMPurify** - XSS prevention

### DevOps Dependencies
- **Vercel** - Deployment platform
- **Sentry** - Error tracking
- **Playwright** - E2E testing
- **Jest** - Unit testing

---

## Environment Variables Wiring

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-here
NEXTAUTH_SECRET=your-secret-here

# Web3
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_IS_TESTNET=true

# API Keys
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# WebSocket
NEXT_PUBLIC_WS_URL=https://ws.vfide.com

# Rate Limiting (if using Upstash)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Admin
ADMIN_ADDRESS=0x...
```

---

## Monitoring & Observability

```
┌─────────────────────────────────────────┐
│ Application                              │
└─────────────────────────────────────────┘
              │
              ├───────────────┬───────────────┐
              ▼               ▼               ▼
   ┌─────────────┐  ┌──────────────┐  ┌────────────┐
   │   Sentry    │  │   Vercel     │  │   Custom   │
   │  (Errors)   │  │ (Analytics)  │  │    Logs    │
   └─────────────┘  └──────────────┘  └────────────┘
```

---

## Conclusion

This wiring diagram provides a complete view of how all components in the Vfide application connect and communicate. Every request flows through multiple security layers, and all data interactions are properly validated and authenticated.

**Key Integration Points:**
- Frontend ↔ API Routes
- API Routes ↔ Database
- Frontend ↔ Blockchain
- WebSocket ↔ All Clients
- Security Layers on All Requests

---

**Document End**
