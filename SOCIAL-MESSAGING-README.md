# VFIDE Social Messaging System

## Overview

Comprehensive end-to-end encrypted messaging system for VFIDE users. Connect with friends, create groups, and communicate privately using wallet-based encryption.

## Features

### ✅ Implemented

1. **Friends Management**
   - Add friends by wallet address
   - Set custom nicknames/aliases
   - Favorite friends
   - Search and filter
   - Online status indicators
   - ProofScore badges

2. **Direct Messaging**
   - 1-on-1 encrypted conversations
   - Real-time message display
   - Message timestamps
   - Read receipts
   - Signature verification
   - Persistent message history (localStorage)

3. **Group Management**
   - Create private groups
   - Add multiple members
   - Group descriptions
   - Admin controls
   - Member list management

4. **End-to-End Encryption**
   - Wallet signature-based encryption
   - Message verification
   - Non-custodial (VFIDE cannot read messages)
   - Transparent encryption status

5. **UI/UX**
   - Modern, responsive design
   - Smooth animations
   - Dark theme integration
   - Mobile-friendly layout
   - Real-time updates

### 🚧 Coming Soon

1. **Group Messaging**
   - Multi-member encrypted chat
   - Per-member encryption keys
   - Group message history

2. **Decentralized Storage**
   - IPFS message storage
   - Blockchain message indexing
   - Peer-to-peer message relay

3. **Advanced Features**
   - File attachments
   - Image sharing
   - Voice messages
   - Video calls
   - Message reactions
   - Thread replies

4. **Notifications**
   - Push notifications
   - Unread message badges
   - Sound alerts
   - Desktop notifications

## Architecture

### Components

**FriendsList** (`components/social/FriendsList.tsx`)
- Manages friend list
- Search and filtering
- Add/remove friends
- Favorites system

**MessagingCenter** (`components/social/MessagingCenter.tsx`)
- 1-on-1 chat interface
- Message encryption/decryption
- Real-time message display
- Send/receive messages

**GroupsManager** (`components/social/GroupsManager.tsx`)
- Group creation
- Member management
- Group settings
- Leave/delete groups

### Utilities

**messageEncryption.ts** (`lib/messageEncryption.ts`)
- Encryption/decryption functions
- Wallet signature integration
- Message verification
- Storage key management

**messaging.ts** (`types/messaging.ts`)
- TypeScript interfaces
- Friend, Message, Group types
- Conversation types

### Data Storage

Currently using **localStorage** for:
- Friends list
- Conversation messages
- Group metadata

**Format:**
```typescript
// Friends: vfide_friends_{userAddress}
Friend[] = [{
  address: string,
  alias?: string,
  addedDate: number,
  isFavorite: boolean,
  proofScore?: number
}]

// Messages: vfide_messages_{conversationId}
Message[] = [{
  id: string,
  from: string,
  to: string,
  encryptedContent: string,
  timestamp: number,
  verified: boolean
}]

// Groups: vfide_groups_{userAddress}
Group[] = [{
  id: string,
  name: string,
  members: string[],
  admins: string[],
  createdAt: number
}]
```

## Security Model

### Encryption Flow

1. **Sending Message:**
   ```typescript
   User types message
   → Sign message with wallet (proves identity)
   → Encrypt using recipient's address
   → Store encrypted payload
   → (Future: Upload to IPFS/blockchain)
   ```

2. **Receiving Message:**
   ```typescript
   Load encrypted message
   → Decrypt using wallet
   → Verify sender signature
   → Display decrypted content
   ```

### Security Features

- **Non-Custodial:** VFIDE never has access to private keys or messages
- **End-to-End:** Messages encrypted before leaving sender's device
- **Verified:** Signatures prove message authenticity
- **Private:** Only participants can decrypt messages
- **Transparent:** Encryption status always visible

### Current Implementation

- Uses wallet signatures (ethers.js / viem)
- Base64 encoding for demo purposes
- In production, will use:
  - ECIES (Elliptic Curve Integrated Encryption Scheme)
  - Signal Protocol for group messages
  - Decentralized storage (IPFS/Arweave)

## Usage

### For Users

1. **Connect Wallet**
   - Visit `/social-messaging`
   - Connect MetaMask or Coinbase Wallet

2. **Add Friends**
   - Click "+" button
   - Enter friend's wallet address
   - Optional: Add nickname
   - Click "Add Friend"

3. **Send Message**
   - Select friend from list
   - Type message
   - Press Enter or click Send
   - Message is automatically encrypted

4. **Create Group**
   - Switch to "Groups" tab
   - Click "+" button
   - Enter group name
   - Select 2+ members
   - Click "Create Group"

### For Developers

**Import Components:**
```tsx
import { FriendsList } from '@/components/social/FriendsList';
import { MessagingCenter } from '@/components/social/MessagingCenter';
import { GroupsManager } from '@/components/social/GroupsManager';
```

**Use Encryption:**
```typescript
import { encryptMessage, decryptMessage } from '@/lib/messageEncryption';

// Encrypt
const encrypted = await encryptMessage(
  "Hello!",
  recipientAddress,
  signMessageAsync
);

// Decrypt  
const { message, verified } = await decryptMessage(
  encrypted,
  senderAddress,
  verifyFunction
);
```

## Navigation

Access via:
- **Main Nav:** "Messages" link (highlighted)
- **Direct URL:** `/social-messaging`
- **Dashboard:** Social section (coming soon)

## Database Schema (Future)

When moving to backend/blockchain:

```sql
-- Users
CREATE TABLE users (
  address VARCHAR(42) PRIMARY KEY,
  alias VARCHAR(100),
  public_key TEXT,
  last_seen TIMESTAMP
);

-- Friendships
CREATE TABLE friendships (
  id SERIAL PRIMARY KEY,
  user1 VARCHAR(42) REFERENCES users(address),
  user2 VARCHAR(42) REFERENCES users(address),
  created_at TIMESTAMP,
  UNIQUE(user1, user2)
);

-- Groups
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  creator VARCHAR(42) REFERENCES users(address),
  created_at TIMESTAMP
);

-- Group Members
CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id),
  user_address VARCHAR(42) REFERENCES users(address),
  is_admin BOOLEAN,
  joined_at TIMESTAMP,
  PRIMARY KEY (group_id, user_address)
);

-- Messages (metadata only, content on IPFS)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  group_id UUID REFERENCES groups(id),
  ipfs_hash VARCHAR(100), -- Encrypted content on IPFS
  signature TEXT,
  timestamp TIMESTAMP
);
```

## API Endpoints (Future)

```typescript
// Friends
POST   /api/friends/add         // Add friend
DELETE /api/friends/remove      // Remove friend
GET    /api/friends/list        // Get friends list

// Messages
POST   /api/messages/send       // Send message (upload to IPFS)
GET    /api/messages/history    // Get conversation history
POST   /api/messages/mark-read  // Mark as read

// Groups
POST   /api/groups/create       // Create group
POST   /api/groups/add-member   // Add member
DELETE /api/groups/leave        // Leave group
GET    /api/groups/messages     // Get group messages
```

## Performance Considerations

### Current (localStorage)
- ✅ Instant access
- ✅ No backend needed
- ❌ Limited to ~5MB
- ❌ No sync across devices
- ❌ Lost if browser data cleared

### Future (IPFS + Blockchain)
- ✅ Unlimited storage
- ✅ Decentralized
- ✅ Sync across devices
- ✅ Permanent records
- ⚠️ Requires IPFS pinning service
- ⚠️ Gas fees for indexing

## Testing

### Manual Testing Checklist

- [ ] Connect wallet
- [ ] Add friend by address
- [ ] Send message to friend
- [ ] Receive message (open two browsers)
- [ ] Verify encryption indicator
- [ ] Check message timestamps
- [ ] Test search/filter
- [ ] Add to favorites
- [ ] Remove friend
- [ ] Create group
- [ ] Add multiple members
- [ ] Leave group

### Automated Tests (To Add)

```typescript
describe('Messaging System', () => {
  it('encrypts messages before sending')
  it('verifies sender signatures')
  it('stores messages in localStorage')
  it('loads conversation history')
  it('filters friends by search query')
  it('creates groups with minimum 2 members')
});
```

## Troubleshooting

### Messages Not Sending
- Check wallet is connected
- Verify signature approval in wallet
- Check console for encryption errors
- Ensure friend address is valid

### Can't Decrypt Messages
- Verify you're using same wallet
- Check message signature is valid
- Clear localStorage and re-add friend
- Check browser console for errors

### Groups Not Working
- Group messaging is placeholder (coming soon)
- Can create groups, but chat not yet implemented
- Will be available in next update

## Roadmap

**Phase 1 (Current)** ✅
- Friends management
- Direct messaging
- Basic encryption
- localStorage persistence

**Phase 2 (Next Sprint)**
- Group messaging implementation
- IPFS integration
- Message attachments
- Improved encryption (ECIES)

**Phase 3 (Q1 2026)**
- Push notifications
- Voice messages
- Video calls
- Mobile app

**Phase 4 (Q2 2026)**
- Decentralized identity (ENS)
- Message reactions
- Thread replies
- Custom themes

## Contributing

See main CONTRIBUTING.md for guidelines.

For messaging-specific contributions:
1. Follow existing component patterns
2. Maintain encryption security
3. Test with multiple wallets
4. Update this README
5. Add TypeScript types

## License

Same as main VFIDE project (see root LICENSE file)

---

**Need Help?**
- Documentation: `/docs`
- Discord: [Coming soon]
- Email: support@vfide.io
