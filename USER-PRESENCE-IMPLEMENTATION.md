# User Presence System Implementation

## 🎯 Overview

Complete user presence system with online/offline indicators, last seen timestamps, and real-time status updates via WebSocket.

## 📦 Files Created

### 1. Core Library (`lib/presence.ts`)
**350 lines** - Presence tracking system

Key Features:
- In-memory presence cache
- Automatic status calculation (online/away/offline)
- Activity tracking with multiple event listeners
- WebSocket integration for real-time updates
- Bulk presence queries for performance

**Functions:**
- `getPresence(address)` - Get user's current presence
- `updatePresence(address, update)` - Update presence cache
- `getBulkPresence(addresses)` - Get multiple users at once
- `calculateStatus(lastActivity)` - Determine status from activity
- `formatLastSeen(timestamp)` - Human-readable last seen

**Hooks:**
- `usePresence(userAddress)` - Manage current user's presence
- `useUserPresence(address)` - Track another user's presence
- `useBulkPresence(addresses)` - Track multiple users efficiently

**Thresholds:**
- **Online**: Active within last 5 minutes
- **Away**: Inactive 5-15 minutes
- **Offline**: Inactive > 15 minutes

**Activity Detection:**
- Mouse events
- Keyboard events
- Scroll events
- Touch events
- Tab visibility changes

### 2. UI Components (`components/social/PresenceIndicator.tsx`)
**180 lines** - Visual presence indicators

**Components:**

1. **PresenceIndicator** - Flexible indicator with options
   - Size variants: sm, md, lg
   - Optional status label
   - Optional last seen text
   - Pulsing animation for online status

2. **PresenceBadge** - Colored badge with status
   - Status-specific colors (green/yellow/red/gray)
   - Rounded badge design
   - Icon + text

3. **PresenceDot** - Minimal dot indicator
   - For avatars
   - Configurable position (top-right, bottom-right, etc.)
   - Border to contrast with background
   - Pulse animation for online

4. **PresenceAvatar** - Avatar wrapper with dot
   - Wraps any avatar component
   - Automatic positioning
   - Clean composition

5. **OnlineCount** - Show count of online users
   - Green indicator
   - "X online" text
   - For group views

6. **LastSeenText** - Last activity timestamp
   - Human-readable format
   - Only shows for offline users
   - "Just now", "5 minutes ago", etc.

### 3. Presence Manager (`components/social/PresenceManager.tsx`)
**60 lines** - Global presence tracker

**Purpose:**
- Mount once in app root (RootLayout)
- Manages current user's presence
- Broadcasts status via WebSocket
- Handles cleanup on unmount

**Features:**
- Auto-detects user activity
- Sends periodic heartbeats
- Development mode indicator
- Graceful shutdown

### 4. Integration Updates

**FriendsList.tsx:**
- Added presence indicators to friend avatars
- Online filter now uses real presence data
- Replaced hardcoded online status with `useBulkPresence`

**MessagingCenter.tsx:**
- Added presence indicator to chat header
- Shows online/away/offline status
- Displays last seen for offline users
- Real-time status updates

**RootLayout.tsx:**
- Mounted `PresenceManager` globally
- Runs for all authenticated users
- Starts tracking automatically

## 🔧 How It Works

### 1. Initialization
```typescript
// In RootLayout
<PresenceManager />

// PresenceManager detects wallet address and starts tracking
const { status, isOnline } = usePresence(address);
```

### 2. Activity Tracking
```typescript
// Listen to user activity
['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
  window.addEventListener(event, handleActivity);
});

// Update status every 10 seconds
setInterval(() => {
  const newStatus = calculateStatus(lastActivity);
  updatePresence(address, { status: newStatus });
}, 10000);
```

### 3. WebSocket Broadcasting
```typescript
// Broadcast presence every 30 seconds
setInterval(() => {
  send('presence', {
    address,
    status,
    timestamp: Date.now(),
  });
}, 30000);

// Listen for updates from others
subscribe('presence', (data) => {
  updatePresence(data.address, {
    status: data.status,
    lastSeen: data.timestamp,
  });
});
```

### 4. Display
```typescript
// In any component
import { PresenceIndicator } from '@/components/social/PresenceIndicator';

<PresenceIndicator 
  address={friendAddress} 
  size="md" 
  showLabel 
  showLastSeen 
/>
```

## 📊 Status Logic

### Online
- User active within last 5 minutes
- Green dot with pulse animation
- No last seen text

### Away
- User inactive for 5-15 minutes
- Yellow dot (no animation)
- No last seen text

### Offline
- User inactive > 15 minutes
- Gray dot (no animation)
- Shows "Last seen X ago"

### Tab Visibility
- Hidden tab → Away
- Visible tab → Online (if recent activity)

## 🎨 Visual Design

### Status Colors
```typescript
{
  online: 'bg-green-500',  // #50C878
  away: 'bg-yellow-500',   // Warning yellow
  busy: 'bg-red-500',      // Alert red
  offline: 'bg-gray-400',  // Neutral gray
}
```

### Animations
- **Online**: Continuous pulse (1s cycle)
- **Ping Effect**: Expanding ring animation
- **Away/Offline**: Static (no animation)

### Sizes
- **sm**: 8px (h-2 w-2)
- **md**: 12px (h-3 w-3)
- **lg**: 16px (h-4 w-4)

## 💾 Data Flow

```
User Activity
    ↓
Activity Events (mouse, keyboard, etc.)
    ↓
Update lastActivity timestamp
    ↓
Calculate Status (online/away/offline)
    ↓
Update Local Cache (presenceCache Map)
    ↓
Broadcast via WebSocket
    ↓
Other Users Receive Update
    ↓
Update Their Local Cache
    ↓
UI Re-renders with New Status
```

## 🔗 Integration Examples

### Example 1: Friend List with Presence
```typescript
import { useBulkPresence } from '@/lib/presence';
import { PresenceDot } from '@/components/social/PresenceIndicator';

function FriendsList({ friends }) {
  const addresses = friends.map(f => f.address);
  const presenceMap = useBulkPresence(addresses);
  
  return friends.map(friend => (
    <div>
      <div className="relative">
        <Avatar user={friend} />
        <PresenceDot address={friend.address} />
      </div>
      <span>{friend.name}</span>
    </div>
  ));
}
```

### Example 2: Message Header with Status
```typescript
import { PresenceIndicator, LastSeenText } from '@/components/social/PresenceIndicator';

function MessageHeader({ recipient }) {
  return (
    <div>
      <h3>{recipient.name}</h3>
      <PresenceIndicator 
        address={recipient.address} 
        showLabel 
        size="sm" 
      />
      <LastSeenText address={recipient.address} />
    </div>
  );
}
```

### Example 3: Online Friends Count
```typescript
import { useBulkPresence } from '@/lib/presence';

function FriendsHeader({ friendAddresses }) {
  const presenceMap = useBulkPresence(friendAddresses);
  
  const onlineCount = Array.from(presenceMap.values())
    .filter(p => p.status === 'online')
    .length;
  
  return (
    <div>
      <h2>Friends ({friendAddresses.length})</h2>
      <span>{onlineCount} online</span>
    </div>
  );
}
```

## 🚀 Performance Optimizations

### 1. Bulk Queries
- `useBulkPresence` fetches multiple users at once
- Reduces re-renders
- Single subscription for all updates

### 2. In-Memory Cache
- Fast reads from Map
- No database queries needed
- Updates propagate via WebSocket

### 3. Debounced Updates
- Broadcast every 30 seconds (not every activity)
- Reduces network traffic
- Still feels real-time

### 4. Event Throttling
- Activity events update local state immediately
- WebSocket broadcasts are batched
- Best of both worlds

## 🔄 Production Migration

### Current State
- ✅ In-memory cache (development)
- ✅ WebSocket broadcasting
- ✅ Activity tracking
- ✅ UI components

### Production Requirements

1. **Backend Storage**
   ```typescript
   // Store presence in Redis
   await redis.hset(`presence:${address}`, {
     status,
     lastSeen: Date.now(),
     lastActivity: Date.now(),
   });
   
   // Set TTL for auto-cleanup
   await redis.expire(`presence:${address}`, 900); // 15 minutes
   ```

2. **WebSocket Server**
   ```typescript
   // Handle presence updates
   io.on('connection', (socket) => {
     socket.on('presence', async (data) => {
       // Store in Redis
       await updatePresenceInRedis(data);
       
       // Broadcast to friends only
       const friends = await getFriends(data.address);
       friends.forEach(friend => {
         io.to(friend).emit('presence', data);
       });
     });
   });
   ```

3. **API Endpoints**
   ```typescript
   // GET /api/presence?addresses=0x1,0x2,0x3
   // Returns bulk presence data from Redis
   
   // POST /api/presence
   // Updates presence (fallback if WebSocket unavailable)
   ```

4. **Offline Detection**
   ```typescript
   // Cron job: Mark offline after 15 minutes
   setInterval(async () => {
     const staleUsers = await redis.keys('presence:*');
     for (const key of staleUsers) {
       const data = await redis.hget(key);
       if (Date.now() - data.lastActivity > 900000) {
         await redis.hset(key, 'status', 'offline');
       }
     }
   }, 60000); // Check every minute
   ```

## 📈 Metrics to Track

- **Online Users**: Current count
- **Peak Concurrent Users**: Daily/weekly max
- **Avg Session Duration**: Time between online → offline
- **Activity Patterns**: Hourly/daily active users
- **WebSocket Messages**: Presence broadcasts per minute
- **Cache Hit Rate**: Presence lookups served from cache

## ✅ Testing Checklist

- [x] Presence updates when user is active
- [x] Status changes to away after 5 minutes
- [x] Status changes to offline after 15 minutes
- [x] WebSocket broadcasts every 30 seconds
- [x] Tab hidden → away, tab visible → online
- [x] Presence indicators render correctly
- [x] Last seen shows for offline users
- [x] Bulk queries work with multiple users
- [x] Online filter in friends list works
- [x] Presence persists across component unmounts

## 🎯 Success Criteria

✅ **Real-time Updates**: Status changes reflect within 30 seconds
✅ **Visual Feedback**: Clear online/away/offline indicators
✅ **Performance**: No lag with 100+ friends
✅ **Accuracy**: Status matches actual user activity
✅ **User Experience**: Intuitive and informative

## 📝 Known Limitations

1. **In-Memory Cache**: Not persistent, resets on page refresh
   - **Solution**: Backend Redis storage (production)

2. **Public Keys Not Stored**: Each user needs to share public key
   - **Solution**: Backend user profiles with public keys

3. **No Busy Status**: Currently only online/away/offline
   - **Future**: Manual "Do Not Disturb" mode

4. **No Device Awareness**: Can't detect multiple devices
   - **Future**: Device-specific presence tracking

5. **WebSocket Required**: No fallback for polling
   - **Future**: Long polling fallback

## 🔜 Future Enhancements

1. **Custom Status Messages**
   - "In a meeting"
   - "On vacation"
   - User-defined statuses

2. **Do Not Disturb Mode**
   - Manual busy status
   - Mute notifications
   - Auto-reply

3. **Multi-Device Sync**
   - Show "Online on mobile"
   - "Online on desktop"
   - Device-specific indicators

4. **Presence History**
   - "Usually online 9am-5pm"
   - Active hours heatmap
   - Last 7 days activity

5. **Smart Status**
   - Detect calendar events
   - Auto-away for meetings
   - Timezone awareness

## 🎉 Completion Status

**16/27 items complete (59%)**

✅ User Presence & Online Status - **COMPLETE**

Next Priority: Profile Picture Upload System (4 days)
