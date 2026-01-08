# 🗺️ VFIDE Social - Visual Sitemap

```
                            🏠 /social (Hub)
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            💬 Messages      📱 Stories    🏛️ Communities
         /social/messages  /social/stories  /social/communities
                    │              │              │
                    │              │              │
         ┌──────────┼────────┐     │      ┌───────┴────────┐
         ▼          ▼        ▼     ▼      ▼                ▼
    📎 Upload  💬 Chat   👥 Group  📸 Create  🔍 Browse   ⚙️ Settings
               │                    │         │
               ▼                    ▼         ▼
         🧵 Threads           📊 View      👤 Members
         ❤️ Reactions         👁️ Analytics  🎨 Roles
         📊 Polls                          📢 Channels


                    📞 Calls                   🔍 Discover
                /social/calls              /social/discover
                    │                           │
            ┌───────┴────────┐         ┌────────┼─────────┐
            ▼                ▼         ▼        ▼         ▼
        📞 Voice        📹 Video    🔥 Trending  🏷️ Tags  👤 Users
         │                │
         ▼                ▼
    🔇 Mute          📷 Camera
    🔊 Speaker       🎥 Share
```

## 📍 Page Hierarchy

### Level 1: Hub
```
/social
└── Central hub with overview of all features
```

### Level 2: Main Features
```
/social/messages
/social/stories
/social/communities
/social/calls
/social/discover
```

### Level 3: Sub-features (Accessible from Level 2)
```
Messages:
├── Media Upload Modal
├── Thread View Sidebar
├── Reaction Picker
└── Poll Cards

Stories:
├── Story Creator Modal
├── Story Viewer (Full Screen)
└── Story Rings (Inline)

Communities:
├── Community Browser
├── Community Layout
│   ├── Channel List
│   ├── Message Area
│   └── Member List
└── Settings Modal

Calls:
├── Call Modal (Active)
├── Incoming Call Modal
└── Call History

Discover:
├── Search Bar
├── Category Filters
└── User Cards
```

---

## 🎯 Navigation Flow

### Primary Navigation (Top Bar)
```
┌─────────────────────────────────────────────────────┐
│  ⚡ VFIDE Social                                     │
│  🏠 Hub  💬 Messages  📱 Stories  🏛️ Communities    │
│  📞 Calls  🔍 Discover                              │
└─────────────────────────────────────────────────────┘
```

### Breadcrumb Navigation
```
← Back to Social Hub  (Appears on all sub-pages)
```

### Quick Actions
```
Hub Page:
├── Feature Cards → Click to navigate
├── Stats Display → Live metrics
└── CTA Buttons → Direct actions
```

---

## 🎨 Component Tree

```
SocialNav (All Pages)
│
├── /social (Hub)
│   ├── Stats Grid
│   ├── Feature Cards
│   ├── Why VFIDE Section
│   └── CTA Section
│
├── /social/messages
│   ├── Message List
│   ├── Media Upload Button
│   └── MediaUploader Modal
│
├── /social/stories
│   ├── Story Rings
│   ├── Create Button
│   ├── StoryCreator Modal
│   └── StoryViewer Modal
│
├── /social/communities
│   ├── CommunityBrowser
│   │   ├── Search Bar
│   │   ├── Category Filters
│   │   ├── Community Cards
│   │   └── Create Modal
│   └── CommunityLayout (When Selected)
│       ├── Channel Sidebar
│       ├── Chat Area
│       └── Member List
│
├── /social/calls
│   ├── Call Form
│   ├── Feature Cards
│   ├── CallModal (Active)
│   └── IncomingCallModal
│
└── /social/discover
    ├── Search Bar
    ├── Category Grid
    └── User Cards
```

---

## 🔄 User Journey Map

### First Visit
```
1. Connect Wallet
   ↓
2. Land on /social Hub
   ↓
3. See Overview & Stats
   ↓
4. Click Feature Card
   ↓
5. Explore Feature
   ↓
6. Use Top Nav to Switch Features
```

### Returning User
```
1. Direct URL to Feature
   ↓
2. Top Nav Always Available
   ↓
3. Quick Switching Between Features
```

---

## 📱 Mobile Navigation

```
Mobile View:
┌──────────────────┐
│  ⚡ VFIDE Social │
│                  │
│  🏠 💬 📱 🏛️     │
│  📞 🔍           │
└──────────────────┘
    (Collapsible)
```

---

## 🎮 Interactive Elements

### Hub Page
```
┌──────────────────────────┐
│  Feature Card            │
│  ┌────────────────────┐  │
│  │  Icon + Title      │  │
│  │  Description       │  │
│  │  [Explore →]       │  │
│  └────────────────────┘  │
└──────────────────────────┘
        Hover = Gradient
        Click = Navigate
```

### Stories Page
```
┌──────────────────────────┐
│  [+ Create Story]        │
│                          │
│  Story Rings:            │
│  ○ ○ ○ ○                │
│  (Blue = Unviewed)       │
└──────────────────────────┘
        Click = View Stories
```

### Communities Page
```
┌──────────────────────────┐
│  [Search] [Filters]      │
│                          │
│  Community Grid:         │
│  ┌────┐ ┌────┐ ┌────┐  │
│  │Card│ │Card│ │Card│  │
│  └────┘ └────┘ └────┘  │
└──────────────────────────┘
        Click = Open/Join
```

---

## 🎯 Key Pages Summary

| Page | Purpose | Key Features |
|------|---------|--------------|
| `/social` | Hub | Stats, cards, overview |
| `/social/messages` | Chat | DMs, media, payments |
| `/social/stories` | Content | Create, view, react |
| `/social/communities` | Groups | Servers, channels, roles |
| `/social/calls` | Calls | Voice, video, WebRTC |
| `/social/discover` | Search | Users, categories |
| `/social-showcase` | Demo | All components |

---

## 📊 Information Architecture

```
VFIDE Social Platform
│
├── Core Communication
│   ├── Messages (1-on-1)
│   ├── Communities (Groups)
│   └── Calls (Real-time)
│
├── Content Sharing
│   ├── Stories (Ephemeral)
│   ├── Media (Persistent)
│   └── Polls (Interactive)
│
├── Discovery
│   ├── Users
│   ├── Communities
│   └── Content
│
└── Supporting Features
    ├── Navigation
    ├── Authentication
    └── Settings
```

---

## ✨ Visual Design Flow

```
Dark Theme (Black Background)
    ↓
Gradient Accents (#00F0FF → #FF6B9D)
    ↓
Card-Based Layout
    ↓
Hover Effects & Transitions
    ↓
Mobile-Responsive Grid
```

---

**This sitemap shows the complete navigation structure of VFIDE Social!** 🗺️
