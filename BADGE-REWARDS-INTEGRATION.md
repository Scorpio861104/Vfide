# Automatic Badge Rewards System - Integration Guide

## Overview

The automatic badge rewards system monitors user activities in real-time and automatically assigns badges when users meet eligibility criteria. No manual claiming required!

## System Components

### 1. Badge Monitor Service (`lib/badge-monitor.ts`)
- **Purpose**: Automatically detects badge eligibility and triggers minting
- **Features**:
  - Real-time eligibility checking
  - Automatic badge minting
  - Deduplication (prevents double-minting)
  - Retry logic for failed mints
  - Event-driven architecture

### 2. Badge Event Tracking (`lib/badge-event-tracking.ts`)
- **Purpose**: Records all user activities that affect badge eligibility
- **Tracks**:
  - Transactions
  - Votes and proposals
  - Endorsements (given/received)
  - Merchant/Mentor registrations
  - Bug/security reports
  - Documentation contributions
  - Streaks (voting, daily activity, time patterns)

### 3. Auto-Assignment Logic (API Endpoints)
- `POST /api/badges/auto-mint` - Mints badge for eligible user
- `POST /api/badges/events` - Stores activity events
- `GET /api/badges/events/[userId]` - Retrieves user's event history

### 4. Notification System (`lib/badge-notifications.ts`)
- **Purpose**: Alerts users when they earn badges
- **Channels**:
  - In-app toast notifications
  - Browser push notifications
  - Badge showcase modals
  - Event dispatching for custom UI

### 5. React Integration Hook (`hooks/useBadgeRewards.ts`)
- **Purpose**: Easy integration into React components
- **Provides**:
  - Activity tracking methods
  - Real-time badge status
  - Notification management
  - Manual check triggers

## Quick Start

### Step 1: Add Hook to Your Component

```typescript
import { useBadgeRewards } from '@/hooks/useBadgeRewards';

function MyComponent() {
  const {
    isInitialized,
    recordTransaction,
    recordVote,
    checkBadgesNow,
    mintedBadges,
    notifications,
  } = useBadgeRewards();

  // Use activity tracking methods...
}
```

### Step 2: Track Activities

Whenever a user performs an activity, call the corresponding method:

```typescript
// After a transaction
const handleTransaction = async () => {
  // ... transaction logic ...
  recordTransaction();  // Automatically checks for new badges
};

// After voting
const handleVote = async () => {
  // ... voting logic ...
  recordVote();  // Tracks voting streak and checks badges
};

// After creating a proposal
const handleProposal = async () => {
  // ... proposal logic ...
  recordProposal();
};
```

### Step 3: Display Notifications

The system automatically shows notifications. To customize:

```typescript
useEffect(() => {
  const handleBadgeEarned = (event: CustomEvent) => {
    const { badgeName, points, badgeRarity } = event.detail;
    
    // Custom notification logic
    toast.success(`🏅 Badge Earned: ${badgeName} (+${points} points)`);
  };

  window.addEventListener('badgeEarned', handleBadgeEarned);
  return () => window.removeEventListener('badgeEarned', handleBadgeEarned);
}, []);
```

## Integration Examples

### Example 1: Transaction Component

```typescript
// components/TransactionForm.tsx
import { useBadgeRewards } from '@/hooks/useBadgeRewards';

export function TransactionForm() {
  const { recordTransaction } = useBadgeRewards();

  const handleSubmit = async (data: TransactionData) => {
    try {
      // Submit transaction
      await submitTransaction(data);
      
      // Record activity for badge system
      recordTransaction();
      
      toast.success('Transaction successful!');
    } catch (error) {
      toast.error('Transaction failed');
    }
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Example 2: Voting Component

```typescript
// components/VotingCard.tsx
import { useBadgeRewards } from '@/hooks/useBadgeRewards';

export function VotingCard({ proposalId }: { proposalId: string }) {
  const { recordVote, votingStreak } = useBadgeRewards();

  const handleVote = async (choice: 'for' | 'against') => {
    try {
      await castVote(proposalId, choice);
      
      // Track vote (updates voting streak)
      recordVote();
      
      toast.success('Vote recorded!');
    } catch (error) {
      toast.error('Vote failed');
    }
  };

  return (
    <div>
      <p>Current voting streak: {votingStreak}</p>
      <button onClick={() => handleVote('for')}>Vote For</button>
      <button onClick={() => handleVote('against')}>Vote Against</button>
    </div>
  );
}
```

### Example 3: Merchant Registration

```typescript
// app/merchant/register/page.tsx
import { useBadgeRewards } from '@/hooks/useBadgeRewards';

export default function MerchantRegistration() {
  const { recordMerchantRegistration } = useBadgeRewards();

  const handleRegister = async (formData: MerchantData) => {
    try {
      await registerMerchant(formData);
      
      // Triggers "Verified Merchant" badge check
      recordMerchantRegistration();
      
      toast.success('Registered as merchant!');
    } catch (error) {
      toast.error('Registration failed');
    }
  };

  return <form onSubmit={handleRegister}>{/* ... */}</form>;
}
```

## Activity Types Reference

| Activity Method | When to Call | Affects Badges |
|-----------------|--------------|----------------|
| `recordTransaction()` | After any transaction | Bronze/Silver/Gold Trader, Trade Master, Whale, Transaction Milestones |
| `recordVote()` | After voting on proposal | Governance Voter, Voting Streaks (5/10/20) |
| `recordProposal()` | After creating proposal | Proposal Creator |
| `recordEndorsementGiven()` | After endorsing someone | Trusted Endorser, Endorsement Milestones (100/500/1K) |
| `recordEndorsementReceived()` | When received endorsement | Highly Endorsed |
| `recordMerchantRegistration()` | After merchant signup | Verified Merchant |
| `recordMentorRegistration()` | After mentor signup | Mentor badges |
| `recordMenteeAdded()` | When mentee is added | Community Builder, Mentor Extraordinaire |
| `recordBugReport()` | After reporting bug | Bug Hunter |
| `recordSecurityReport()` | After security report | Security Researcher |
| `recordDocumentationContribution()` | After doc contribution | Documentation Hero |
| `recordTutorialCreated()` | After creating tutorial | Tutorial Creator |

## Manual Badge Check

For situations where automatic checking isn't triggered:

```typescript
const { checkBadgesNow } = useBadgeRewards();

// Force check all badges
await checkBadgesNow();
```

## Monitoring & Stats

Track user progress:

```typescript
const {
  mintedBadges,      // Array of badge IDs user has earned
  pendingBadges,     // Badges being processed
  activityStats,     // Aggregated activity statistics
  votingStreak,      // Current voting streak count
  dailyStreak,       // Current daily activity streak
  notifications,     // Pending notifications
} = useBadgeRewards();

console.log(`User has ${mintedBadges.length} badges`);
console.log(`Voting streak: ${votingStreak} consecutive votes`);
console.log(`Daily streak: ${dailyStreak} days`);
```

## Event Listeners

Listen to badge events for custom functionality:

```typescript
// Badge earned event
window.addEventListener('badgeEarned', (event: CustomEvent) => {
  const {
    userId,
    badgeId,
    badgeName,
    badgeRarity,
    points,
  } = event.detail;
  
  // Custom logic (analytics, confetti, etc.)
  trackAnalytics('badge_earned', { badgeId, badgeName });
  showConfetti();
});

// Badge toast event
window.addEventListener('showBadgeToast', (event: CustomEvent) => {
  const notification = event.detail;
  // Show custom toast
});

// Badge showcase event
window.addEventListener('showBadgeShowcase', (event: CustomEvent) => {
  const notification = event.detail;
  // Show custom modal
});
```

## Best Practices

1. **Call tracking methods immediately after successful actions**
   - Don't wait for confirmations
   - Badge checks are async and won't block UI

2. **Use the hook at the app root level for global state**
   ```typescript
   // app/layout.tsx
   function RootLayout({ children }) {
     const badgeRewards = useBadgeRewards();
     
     return (
       <BadgeRewardsContext.Provider value={badgeRewards}>
         {children}
       </BadgeRewardsContext.Provider>
     );
   }
   ```

3. **Handle edge cases**
   - Check `isInitialized` before calling methods
   - Handle offline scenarios gracefully

4. **Optimize for performance**
   - Badge checks are debounced internally
   - Multiple rapid calls won't cause issues

## Troubleshooting

### Badges not auto-minting
- Check browser console for errors
- Verify wallet is connected
- Ensure activities are being tracked (check logs)

### Notifications not showing
- Check browser notification permissions
- Verify event listeners are set up
- Check notification queue: `getPendingNotifications()`

### Stats not updating
- Refresh activity data: `checkBadgesNow()`
- Check event persistence logs
- Verify API endpoints are responding

## Production Considerations

### Database Integration
Currently uses in-memory storage. For production:
1. Replace Map storage with Redis/database
2. Implement event persistence
3. Add blockchain integration for badge minting
4. Set up background workers for processing

### Security
1. Verify eligibility server-side before minting
2. Rate limit badge checks
3. Validate all user inputs
4. Implement proper authentication

### Performance
1. Cache badge eligibility results
2. Batch process multiple badge checks
3. Use WebSockets for real-time updates
4. Implement pagination for large event lists

## Architecture Diagram

```
User Action
    ↓
Activity Tracking (recordX methods)
    ↓
Badge Event Storage
    ↓
Badge Monitor Service
    ↓
Eligibility Check → Auto-Mint API
    ↓
Blockchain Minting
    ↓
Notification System
    ↓
User UI Update
```

## Support

For questions or issues:
- Check the badge system documentation
- Review example integrations
- Open an issue on GitHub
- Contact the development team
