# Privacy & Safety Enhancements

## What's New

Your social messaging system now has enterprise-grade privacy controls to protect you from unwanted contact:

### 🛡️ Friend Request System
- **No more random messages** - Users must send a friend request that you accept/reject
- **Request expiration** - Requests expire after 7 days if not accepted
- **Optional messages** - Requesters can include an introduction message
- **Trust indicators** - See ProofScore levels before accepting (Elite, Trusted, Standard, Low Trust)

### 🔒 Privacy Settings
Control exactly who can contact you:

1. **Message Privacy**
   - Friends Only (default) - Only accepted friends can message you
   - Trusted Users - ProofScore ≥54% + friends
   - Everyone - Anyone (not recommended)

2. **Friend Request Controls**
   - Trusted Users (default) - Only users with ProofScore ≥40%
   - Everyone - Anyone can send requests
   - No One - Block all friend requests

3. **Online Status Visibility**
   - Friends Only - Only friends see when you're online
   - Everyone - Public status
   - No One - Always appear offline (invisible mode)

4. **ProofScore Requirements**
   - Set minimum ProofScore for friend requests (slider: 0-100%)
   - Auto-reject low trust users (optional)
   - Protect yourself from spam/scam accounts

### 🚫 Block System
- **Block any wallet address** - They can't send requests or message you
- **Unblock anytime** - Manage your blocked list
- **Persistent** - Blocks persist across sessions

### ✅ Request Management
- **Pending requests** - See all incoming friend requests with trust indicators
- **Request history** - View accepted/rejected requests
- **Warning system** - Low trust score warnings (ProofScore < 40%)
- **One-click actions** - Accept or reject with visual feedback

## How It Works

### Sending a Friend Request

1. Click the "+" button in Friends List
2. Enter their wallet address
3. Add optional nickname and introduction message
4. Send request - they must accept before you can message

### Accepting Requests

1. Go to the "Requests" tab
2. Review pending requests with trust indicators
3. Check their ProofScore and message
4. Accept to add as friend, or Reject to decline

### Privacy Settings

1. Go to the "Privacy" tab
2. Configure who can message you
3. Set friend request permissions
4. Adjust ProofScore thresholds
5. Click "Save Settings"

## Benefits

✅ **No spam** - Random users can't message you without approval
✅ **Trust verification** - ProofScore shows who's trustworthy
✅ **Full control** - You decide who can contact you
✅ **Block protection** - Permanently block unwanted users
✅ **Privacy first** - Default settings protect you automatically

## Default Settings (Recommended)

- **Messages From:** Friends Only
- **Requests From:** Trusted Users (≥40% ProofScore)
- **Online Status:** Friends Only
- **Minimum ProofScore:** 40% (4000 points)
- **Auto-Reject Low Trust:** Disabled (manual review)

## Storage

All privacy settings, friend requests, and blocked users are stored in your browser's localStorage with your wallet address as the key. This means:

- ✅ Instant access (no backend needed)
- ✅ Privacy preserved (stored locally)
- ⚠️ Device-specific (settings don't sync across devices)
- 🔜 Future: IPFS integration for cross-device sync

## Architecture

### New Files
- `frontend/types/friendRequests.ts` - TypeScript types for requests, privacy settings, blocked users
- `frontend/components/social/FriendRequestsPanel.tsx` - Request management UI
- `frontend/components/social/PrivacySettings.tsx` - Privacy controls UI

### Updated Files
- `frontend/app/social-messaging/page.tsx` - Added Requests and Privacy tabs
- `frontend/components/social/FriendsList.tsx` - Changed from direct add to friend request system

## Future Enhancements

Phase 2:
- Backend API for request relay (maintains decentralization)
- Push notifications for new requests
- Batch accept/reject
- Request categories (family, work, community)

Phase 3:
- Decentralized identity verification (ENS integration)
- Reputation-based auto-accept (high ProofScore users)
- Request templates for different contexts
- Advanced filtering (location, badges, activity)

Phase 4:
- AI-powered spam detection
- Request analytics
- Network visualization (mutual friends)
- Social graph recommendations

## Testing Checklist

- [ ] Send a friend request with introduction message
- [ ] Receive and accept a request
- [ ] Reject a request and verify it moves to history
- [ ] Block a user and verify they can't send requests
- [ ] Unblock a user
- [ ] Change privacy settings and verify they persist
- [ ] Test ProofScore thresholds (40%, 54%, 80%)
- [ ] Verify expired requests are removed
- [ ] Test all three message privacy levels
- [ ] Test online status visibility settings
