# Activity Feed Implementation Guide

## Overview

The Activity Feed component provides a comprehensive timeline view of user activities with advanced filtering, search, pagination, and export capabilities. It's designed for tracking all user interactions across the platform in a single, organized interface.

## Features

### Core Functionality
- **Timeline View**: Chronological display of activities with visual indicators
- **6 Activity Types**: Transaction, Governance, Merchant, Badge, Escrow, Wallet
- **Advanced Filtering**: Type, date range, and text search
- **Pagination**: Navigate through activities with page controls
- **Export**: Download filtered activities as CSV
- **Real-time Ready**: Architecture prepared for WebSocket integration
- **Statistics Dashboard**: Summary cards showing activity metrics
- **Activity Breakdown**: Visual breakdown by activity type

### User Experience
- **Mobile-responsive**: Optimized for all screen sizes
- **Dark Mode**: Complete dark theme support
- **Accessibility**: WCAG 2.1 AA compliant
- **Empty States**: Helpful messages when no activities match filters
- **Timeline Indicators**: Visual timeline with icons and connecting lines

## Component Structure

```
ActivityFeed
├── Header (title, description)
├── Statistics Cards (4 metric cards)
├── Filters Section
│   ├── Search Input
│   ├── Type Filter (dropdown)
│   ├── Date Range Filter (dropdown)
│   └── Action Buttons (Clear, Export)
├── Activity Timeline
│   ├── Activity Items (paginated)
│   │   ├── Timeline Indicator
│   │   ├── Activity Content
│   │   ├── Type Badge
│   │   ├── Metadata Tags
│   │   └── Timestamp
│   └── Pagination Controls
└── Activity Breakdown (by type)
```

## Usage

### Basic Integration

```tsx
import ActivityFeed from '@/components/activity/ActivityFeed';

export default function ActivityPage() {
  return (
    <div>
      <ActivityFeed />
    </div>
  );
}
```

### With Custom Wrapper

```tsx
import ActivityFeed from '@/components/activity/ActivityFeed';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl mb-4">My Dashboard</h1>
      <ActivityFeed />
    </div>
  );
}
```

## Activity Types

### Type Definitions

```typescript
type ActivityType = 
  | 'transaction'  // Payment send/receive
  | 'governance'   // Voting, proposals
  | 'merchant'     // Merchant portal actions
  | 'badge'        // Badge achievements
  | 'escrow'       // Escrow operations
  | 'wallet';      // Wallet connections

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  metadata?: Record<string, any>;
  icon?: string;
}
```

### Activity Examples

**Transaction**
```typescript
{
  id: '1',
  type: 'transaction',
  title: 'Payment Received',
  description: 'Received 500 USDC from merchant portal',
  timestamp: new Date(),
  user: 'John Doe',
  metadata: { amount: '500 USDC', status: 'completed' },
  icon: '💰'
}
```

**Governance**
```typescript
{
  id: '2',
  type: 'governance',
  title: 'Voted on Proposal',
  description: 'Voted YES on proposal #42: Treasury Allocation',
  timestamp: new Date(),
  user: 'John Doe',
  metadata: { proposalId: '42', status: 'active' },
  icon: '🗳️'
}
```

**Badge**
```typescript
{
  id: '3',
  type: 'badge',
  title: 'Badge Earned',
  description: 'Earned "Early Adopter" badge',
  timestamp: new Date(),
  user: 'John Doe',
  metadata: { badgeName: 'Early Adopter', status: 'active' },
  icon: '🏆'
}
```

## API Integration

### Backend Endpoints

```typescript
// Fetch user activities
GET /api/activities
Query Parameters:
  - type?: 'all' | ActivityType
  - dateRange?: 'all' | 'today' | 'week' | 'month' | 'year'
  - search?: string
  - page?: number
  - limit?: number

Response:
{
  activities: Activity[];
  total: number;
  page: number;
  limit: number;
}

// Get activity statistics
GET /api/activities/stats

Response:
{
  total: number;
  today: number;
  thisWeek: number;
  byType: {
    transaction: number;
    governance: number;
    merchant: number;
    badge: number;
    escrow: number;
    wallet: number;
  }
}

// Export activities
GET /api/activities/export
Query Parameters:
  - type?: ActivityType
  - dateRange?: string
  - search?: string
  - format?: 'csv' | 'json'

Response: CSV or JSON file download
```

### Frontend Integration

Replace placeholder data with real API calls:

```typescript
import { useState, useEffect } from 'react';

const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/activities');
        const data = await response.json();
        setActivities(data.activities);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // ... rest of component
};
```

## Real-Time Updates

### WebSocket Integration

```typescript
import { useEffect } from 'react';

const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('wss://api.example.com/activities');

    // Handle new activity
    ws.onmessage = (event) => {
      const newActivity = JSON.parse(event.data);
      
      if (newActivity.type === 'activity:new') {
        setActivities((prev) => [newActivity.data, ...prev]);
      }
    };

    // Handle updates
    ws.addEventListener('message', (event) => {
      const update = JSON.parse(event.data);
      
      if (update.type === 'activity:updated') {
        setActivities((prev) =>
          prev.map((a) => (a.id === update.data.id ? update.data : a))
        );
      }
    });

    // Cleanup
    return () => ws.close();
  }, []);

  // ... rest of component
};
```

### Polling Alternative

```typescript
useEffect(() => {
  const pollActivities = async () => {
    try {
      const response = await fetch('/api/activities');
      const data = await response.json();
      setActivities(data.activities);
    } catch (error) {
      console.error('Polling failed:', error);
    }
  };

  // Poll every 30 seconds
  const interval = setInterval(pollActivities, 30000);
  
  // Initial fetch
  pollActivities();

  return () => clearInterval(interval);
}, []);
```

## Filtering System

### Filter Structure

```typescript
interface ActivityFilter {
  type: 'all' | ActivityType;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  search: string;
}
```

### Filter Logic

```typescript
const filterActivities = (
  activities: Activity[],
  filter: ActivityFilter
): Activity[] => {
  let filtered = [...activities];

  // Type filter
  if (filter.type !== 'all') {
    filtered = filtered.filter((a) => a.type === filter.type);
  }

  // Date range filter
  if (filter.dateRange !== 'all') {
    const cutoffDate = calculateCutoffDate(filter.dateRange);
    filtered = filtered.filter((a) => a.timestamp >= cutoffDate);
  }

  // Text search
  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower) ||
        a.user?.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
};
```

### Custom Filter Options

Extend filter options:

```typescript
interface ExtendedFilter extends ActivityFilter {
  user?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
}
```

## Export Functionality

### CSV Export

The component includes built-in CSV export:

```typescript
const exportActivitiesToCSV = (activities: Activity[]): void => {
  const headers = ['ID', 'Type', 'Title', 'Description', 'Timestamp', 'User'];
  
  const rows = activities.map((activity) => [
    activity.id,
    activity.type,
    activity.title,
    activity.description,
    activity.timestamp.toISOString(),
    activity.user || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `activities-${Date.now()}.csv`;
  link.click();
};
```

### JSON Export

Add JSON export option:

```typescript
const exportActivitiesToJSON = (activities: Activity[]): void => {
  const jsonContent = JSON.stringify(activities, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `activities-${Date.now()}.json`;
  link.click();
};
```

### PDF Export

For PDF export, use a library like jsPDF:

```typescript
import jsPDF from 'jspdf';

const exportActivitiesToPDF = (activities: Activity[]): void => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text('Activity Feed Export', 10, 10);
  
  let yPos = 20;
  activities.forEach((activity) => {
    doc.setFontSize(12);
    doc.text(activity.title, 10, yPos);
    doc.setFontSize(10);
    doc.text(activity.description, 10, yPos + 5);
    yPos += 15;
  });
  
  doc.save('activities.pdf');
};
```

## Statistics Calculation

### Stats Interface

```typescript
interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  byType: Record<ActivityType, number>;
}
```

### Calculation Logic

```typescript
const calculateActivityStats = (activities: Activity[]): ActivityStats => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    total: activities.length,
    today: activities.filter((a) => a.timestamp >= oneDayAgo).length,
    thisWeek: activities.filter((a) => a.timestamp >= oneWeekAgo).length,
    byType: {
      transaction: activities.filter((a) => a.type === 'transaction').length,
      governance: activities.filter((a) => a.type === 'governance').length,
      merchant: activities.filter((a) => a.type === 'merchant').length,
      badge: activities.filter((a) => a.type === 'badge').length,
      escrow: activities.filter((a) => a.type === 'escrow').length,
      wallet: activities.filter((a) => a.type === 'wallet').length,
    },
  };
};
```

## Security Considerations

### Input Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizeActivity = (activity: Activity): Activity => {
  return {
    ...activity,
    title: DOMPurify.sanitize(activity.title),
    description: DOMPurify.sanitize(activity.description),
  };
};
```

### Authentication

```typescript
const fetchActivities = async () => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('/api/activities', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Unauthorized');
  }
  
  return response.json();
};
```

### Rate Limiting

```typescript
import { throttle } from 'lodash';

const throttledSearch = throttle((searchTerm: string) => {
  setFilter((prev) => ({ ...prev, search: searchTerm }));
}, 300);
```

## Testing

### Run Tests

```bash
# Run all activity feed tests
npm test -- ActivityFeed.test.tsx

# Run with coverage
npm test -- ActivityFeed.test.tsx --coverage

# Run specific test suite
npm test -- ActivityFeed.test.tsx -t "Filtering"

# Run in watch mode
npm test -- ActivityFeed.test.tsx --watch
```

### Test Coverage

The test suite includes 58 comprehensive tests covering:

- **Component Rendering** (6 tests): Headers, stats, filters, sections
- **Activity Display** (7 tests): Items, descriptions, badges, timestamps
- **Filtering** (8 tests): Type, date, search, combinations, empty states
- **Pagination** (5 tests): Controls, navigation, reset behavior
- **Export** (5 tests): Button state, count updates, disabled state
- **Statistics** (7 tests): All stat cards, breakdown display
- **Accessibility** (6 tests): Labels, buttons, timestamps, headings
- **Mobile Responsiveness** (5 tests): Grid layouts, spacing
- **Data Validation** (5 tests): Missing data, timestamps, colors
- **Integration** (4 tests): Full workflows, filter+pagination+export

### Sample Data

The component includes realistic sample data:

```typescript
const sampleActivities = [
  {
    id: '1',
    type: 'transaction',
    title: 'Payment Received',
    description: 'Received 500 USDC from merchant portal',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    user: 'John Doe',
    metadata: { amount: '500 USDC', status: 'completed' },
    icon: '💰',
  },
  // ... more activities
];
```

## Performance Optimization

### Memoization

```typescript
import { useMemo } from 'react';

const ActivityFeed = () => {
  const stats = useMemo(
    () => calculateActivityStats(activities),
    [activities]
  );

  const filteredActivities = useMemo(
    () => filterActivities(activities, filter),
    [activities, filter]
  );

  // ... rest of component
};
```

### Virtual Scrolling

For large activity lists, implement virtual scrolling:

```typescript
import { FixedSizeList } from 'react-window';

const VirtualActivityList = ({ activities }: { activities: Activity[] }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={activities.length}
      itemSize={120}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ActivityItem activity={activities[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

### Debounced Search

```typescript
import { useCallback } from 'react';
import debounce from 'lodash/debounce';

const ActivityFeed = () => {
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setFilter((prev) => ({ ...prev, search: searchTerm }));
    }, 300),
    []
  );

  // ... rest of component
};
```

### Lazy Loading

```typescript
const ActivityFeed = () => {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    const response = await fetch(`/api/activities?page=${page + 1}`);
    const data = await response.json();
    
    if (data.activities.length === 0) {
      setHasMore(false);
    } else {
      setActivities((prev) => [...prev, ...data.activities]);
      setPage((p) => p + 1);
    }
  };

  // ... rest of component
};
```

## Best Practices

### 1. Data Loading
- Load activities on mount
- Show loading indicators
- Handle errors gracefully
- Implement retry logic

### 2. Filtering
- Reset pagination when filters change
- Provide clear filter feedback
- Enable filter clearing
- Persist filters in URL params

### 3. Performance
- Memoize expensive calculations
- Debounce search input
- Use virtual scrolling for long lists
- Implement pagination or infinite scroll

### 4. Accessibility
- Provide descriptive labels
- Use semantic HTML
- Support keyboard navigation
- Include ARIA attributes

### 5. User Experience
- Show empty states
- Provide export functionality
- Display statistics
- Use visual timeline indicators

## Troubleshooting

### Activities Not Loading

**Problem**: Activities don't appear on mount

**Solution**:
```typescript
useEffect(() => {
  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setActivities(data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Show error message to user
    }
  };

  fetchActivities();
}, []);
```

### Filters Not Working

**Problem**: Filters don't update the activity list

**Solution**: Ensure filter state changes trigger re-computation:
```typescript
const filteredActivities = useMemo(
  () => filterActivities(activities, filter),
  [activities, filter] // Dependencies must include filter
);
```

### Performance Issues

**Problem**: Component sluggish with many activities

**Solution**: Implement pagination and memoization:
```typescript
const paginatedActivities = useMemo(
  () => filteredActivities.slice((page - 1) * 10, page * 10),
  [filteredActivities, page]
);
```

### Export Not Working

**Problem**: CSV export fails

**Solution**: Check blob creation and download:
```typescript
const exportCSV = () => {
  try {
    const csv = generateCSV(activities);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'activities.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

## Advanced Features

### Activity Notifications

Show toast when new activity arrives:

```typescript
import { toast } from 'react-hot-toast';

ws.onmessage = (event) => {
  const newActivity = JSON.parse(event.data);
  setActivities((prev) => [newActivity, ...prev]);
  toast.success(`New activity: ${newActivity.title}`);
};
```

### Activity Grouping

Group activities by date:

```typescript
const groupByDate = (activities: Activity[]) => {
  return activities.reduce((groups, activity) => {
    const date = activity.timestamp.toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);
};
```

### Activity Details Modal

Click activity to see full details:

```typescript
const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

<ActivityItem
  activity={activity}
  onClick={() => setSelectedActivity(activity)}
/>

{selectedActivity && (
  <Modal onClose={() => setSelectedActivity(null)}>
    <ActivityDetails activity={selectedActivity} />
  </Modal>
)}
```

## Resources

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Libraries
- [React Window](https://react-window.vercel.app/) - Virtual scrolling
- [date-fns](https://date-fns.org/) - Date formatting
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
- [react-hot-toast](https://react-hot-toast.com/) - Toast notifications

### Testing
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Maintainer**: Vfide Development Team
