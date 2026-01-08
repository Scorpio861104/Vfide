# 🗺️ VFIDE Navigation Guide

## 📍 Social Platform Routes

### Main Hub
- **`/social`** - Social Hub (landing page with all features)

### Core Features
- **`/social/messages`** - Direct Messages (encrypted 1-on-1 chats)
- **`/social/stories`** - Stories (24-hour ephemeral content)
- **`/social/communities`** - Communities (Discord-style servers)
- **`/social/calls`** - Voice & Video Calls (WebRTC)
- **`/social/discover`** - Discover (find users & communities)

### Demo & Showcase
- **`/social-showcase`** - Interactive demo of all components

---

## 📂 Project Structure

```
app/
├── social/                      # Social platform
│   ├── page.tsx                 # Hub (landing)
│   ├── messages/
│   │   └── page.tsx            # Messaging
│   ├── stories/
│   │   └── page.tsx            # Stories
│   ├── communities/
│   │   └── page.tsx            # Communities
│   ├── calls/
│   │   └── page.tsx            # Voice/Video
│   └── discover/
│       └── page.tsx            # Discovery
└── social-showcase/
    └── page.tsx                # Component demos

components/social/               # UI Components
├── MediaUploader.tsx           # File upload
├── MediaGallery.tsx            # Media viewer
├── CallModal.tsx               # Active call UI
├── IncomingCallModal.tsx       # Call notification
├── StoryViewer.tsx             # Story viewer
├── StoryCreator.tsx            # Create stories
├── StoryRing.tsx               # Story avatars
├── ThreadView.tsx              # Message threads
├── PollCard.tsx                # Polls
├── ReactionPicker.tsx          # Reactions
├── CommunityBrowser.tsx        # Browse communities
└── CommunityLayout.tsx         # Community UI

lib/                            # Feature Libraries
├── mediaSharing.ts             # Media upload/storage
├── callSystem.ts               # WebRTC calls
├── storiesSystem.ts            # Stories/status
├── advancedMessages.ts         # Threads/polls/etc
└── communitiesSystem.ts        # Communities
```

---

## 🎯 Quick Navigation

### For Users
1. Visit **`/social`** to see the main hub
2. Click any feature card to explore
3. Try **`/social-showcase`** for interactive demos

### For Developers
1. Components in `components/social/`
2. Logic libraries in `lib/`
3. Pages in `app/social/`

---

## 🚀 Feature Access Map

| Feature | Route | Components Used |
|---------|-------|----------------|
| Messages | `/social/messages` | MediaUploader, MediaGallery |
| Stories | `/social/stories` | StoryViewer, StoryCreator, StoryRing |
| Communities | `/social/communities` | CommunityBrowser, CommunityLayout |
| Calls | `/social/calls` | CallModal, IncomingCallModal |
| Discover | `/social/discover` | Search, Categories |
| Demo | `/social-showcase` | All components |

---

## 📱 Mobile Navigation

All routes are mobile-responsive with:
- Touch-friendly buttons
- Swipe gestures (stories)
- Collapsible sidebars
- Bottom navigation (coming soon)

---

## 🔗 Integration Points

### Add to Existing Navigation
```tsx
// In your main nav component:
<Link href="/social">Social</Link>
```

### Quick Links
```tsx
// Messages
<Link href="/social/messages">💬 Messages</Link>

// Stories
<Link href="/social/stories">📱 Stories</Link>

// Communities
<Link href="/social/communities">🏛️ Communities</Link>
```

---

## ⚡ Quick Access URLs

**Production Ready:**
- Main: `https://vfide.com/social`
- Messages: `https://vfide.com/social/messages`
- Stories: `https://vfide.com/social/stories`
- Communities: `https://vfide.com/social/communities`
- Calls: `https://vfide.com/social/calls`
- Discover: `https://vfide.com/social/discover`
- Demo: `https://vfide.com/social-showcase`

---

## 🎨 Navigation Patterns

### Hub Pattern (Recommended)
```
/social (Hub) → Choose feature → /social/[feature]
```

### Direct Access
```
Bookmark specific features → /social/messages, /social/stories, etc.
```

### Demo First
```
/social-showcase → Explore → Navigate to features
```

---

## 📊 Route Status

| Route | Status | Features |
|-------|--------|----------|
| `/social` | ✅ Live | Hub, stats, quick nav |
| `/social/messages` | 🚧 Placeholder | Ready for integration |
| `/social/stories` | ✅ Live | Create, view, react |
| `/social/communities` | ✅ Live | Browse, join, chat |
| `/social/calls` | ✅ Live | Voice, video, WebRTC |
| `/social/discover` | ✅ Live | Search, categories |
| `/social-showcase` | ✅ Live | All demos |

---

## 🔄 Navigation Flow

```
User lands on /social
    ↓
Sees feature cards
    ↓
Clicks "Messages" → /social/messages
Clicks "Stories" → /social/stories
Clicks "Communities" → /social/communities
    ↓
Uses features
    ↓
"Back to Social Hub" → Returns to /social
```

---

**Now 100% organized and ready to navigate!** 🎉
