# Advanced Search Implementation Guide

## Overview

The Advanced Search component provides a comprehensive search interface with advanced filtering, search history, saved searches, and autocomplete capabilities for the Vfide platform.

### Key Features

- **Advanced Filters**: Content type, date range, category, status, score, attachments
- **Search History**: Automatic tracking with timestamps and result counts
- **Saved Searches**: Save and reuse common search queries
- **Autocomplete**: Smart suggestions from history and common queries
- **Full-Text Search**: Search across all content types
- **Result Highlighting**: Highlight matching terms in results
- **Export Results**: Export search results to JSON
- **Sort Options**: Sort by relevance, date, score, or popularity
- **Mobile-First**: Fully responsive design

### Tech Stack

- **React 19.2.3**: Modern React with hooks
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **Custom UI Components**: MobileButton, MobileInput, MobileSelect, ResponsiveContainer

---

## Component Structure

### Main Component

```typescript
<AdvancedSearch 
  className="optional-classes"
  onResultSelect={(resultId) => console.log(resultId)}
/>
```

### Type Definitions

**SearchFilter**
```typescript
interface SearchFilter {
  contentType: ContentType[];       // Types to search
  dateRange: DateRange;             // Time period
  category: string[];               // Categories to filter
  users: string[];                  // Filter by users
  status: SearchStatus[];           // Status filter
  minScore?: number;                // Minimum score (0-100)
  hasAttachments?: boolean;         // Has attachments
  tags?: string[];                  // Tag filters
}
```

**SearchHistoryItem**
```typescript
interface SearchHistoryItem {
  id: string;                       // Unique ID
  query: string;                    // Search query
  filters: SearchFilter;            // Applied filters
  timestamp: Date;                  // When searched
  resultsCount: number;             // Result count
}
```

**SavedSearch**
```typescript
interface SavedSearch {
  id: string;                       // Unique ID
  name: string;                     // Display name
  query: string;                    // Search query
  filters: SearchFilter;            // Saved filters
  createdAt: Date;                  // Creation date
  lastUsed?: Date;                  // Last usage
  useCount: number;                 // Usage count
}
```

**SearchResult**
```typescript
interface SearchResult {
  id: string;                       // Result ID
  type: ContentType;                // Content type
  title: string;                    // Result title
  description: string;              // Description
  author: {                         // Author info
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  createdAt: Date;                  // Creation date
  score: number;                    // Relevance score (0-100)
  category: string;                 // Category
  status: SearchStatus;             // Current status
  highlights?: string[];            // Highlighted terms
  tags?: string[];                  // Associated tags
  attachments?: number;             // Attachment count
}
```

### Content Types

```typescript
type ContentType = 
  | 'proposal'      // Governance proposals
  | 'user'          // User profiles
  | 'transaction'   // Transactions
  | 'activity'      // Activity items
  | 'post'          // Posts
  | 'comment'       // Comments
  | 'all';          // All content
```

### Search Statuses

```typescript
type SearchStatus = 
  | 'active'        // Active items
  | 'completed'     // Completed items
  | 'pending'       // Pending items
  | 'archived'      // Archived items
  | 'all';          // All statuses
```

---

## Basic Usage

### Simple Search

```typescript
import AdvancedSearch from '@/components/search/AdvancedSearch';

function SearchPage() {
  return <AdvancedSearch />;
}
```

### With Result Handler

```typescript
function SearchPage() {
  const handleResultSelect = (resultId: string) => {
    console.log('Selected result:', resultId);
    router.push(`/result/${resultId}`);
  };

  return (
    <AdvancedSearch onResultSelect={handleResultSelect} />
  );
}
```

### With Custom Styling

```typescript
<AdvancedSearch 
  className="max-w-7xl mx-auto"
  onResultSelect={handleSelect}
/>
```

---

## Filter System

### Available Filters

#### 1. Content Type Filter
Select what type of content to search:
- All Content (default)
- Proposals
- Users
- Transactions
- Activities
- Posts
- Comments

#### 2. Date Range Filter
Filter by creation date:
- All Time (default)
- Today
- Past Week
- Past Month
- Past Year
- Custom Range

#### 3. Status Filter
Filter by item status:
- All Statuses (default)
- Active
- Completed
- Pending
- Archived

#### 4. Score Filter
Filter by minimum score:
- Range: 0-100%
- Default: 0%
- Slider control

#### 5. Attachments Filter
Filter items with attachments:
- Checkbox control
- Show only items with attachments

### Programmatic Filter Access

```typescript
const [filters, setFilters] = useState<SearchFilter>({
  contentType: ['proposal'],
  dateRange: 'month',
  category: ['Governance'],
  users: [],
  status: ['active'],
  minScore: 50,
  hasAttachments: true
});
```

---

## Search History

### Automatic Tracking

Search history is automatically tracked when you perform a search:
- Query text
- Applied filters
- Timestamp
- Result count

### History Features

1. **View History**: Click "History" button
2. **Reuse Search**: Click on any history item
3. **Delete Item**: Click ✕ on history item
4. **Capacity**: Last 20 searches

### History Item Display

```
"governance proposal"
• 15 results
2h ago
```

---

## Saved Searches

### Saving a Search

1. Perform a search
2. Click "Save Search" button
3. Enter a name for the search
4. Search is saved

### Using Saved Searches

1. Click "Saved" button
2. View all saved searches
3. Click "Use Search" on any saved search
4. Search is executed with saved filters

### Saved Search Display

```
Active Proposals
proposal
Used 12 times
2h ago
```

### Managing Saved Searches

- **Use Count**: Tracks how often used
- **Last Used**: Shows last usage time
- **Delete**: Remove saved search with ✕

---

## Autocomplete

### How It Works

Autocomplete suggestions appear as you type, showing:
- Recent history items (🕐)
- Smart suggestions (💡)
- Result counts (when available)

### Suggestion Types

#### History Suggestions
Shows your 3 most recent searches matching your query

#### Smart Suggestions
Automatically suggests:
- `[query] governance`
- `[query] proposal`

### Using Autocomplete

1. Start typing in search box
2. Suggestions appear automatically
3. Click any suggestion to use it
4. Autocomplete hides when query is empty

---

## Search Results

### Result Display

Each result card shows:
- **Icon**: Content type indicator
- **Type Label**: Content type name
- **Status Badge**: Current status with color
- **Score**: Relevance percentage
- **Title**: Result title
- **Description**: Brief description (2 lines max)
- **Author**: Avatar, display name
- **Date**: Creation date
- **Category**: Category badge
- **Attachments**: Count (if any)
- **Tags**: Associated tags

### Result Interactions

#### Clicking Results
```typescript
<AdvancedSearch 
  onResultSelect={(id) => {
    // Handle result selection
    navigateToResult(id);
  }}
/>
```

#### Sorting Results
Available sort options:
- **Relevance** (default): Most relevant first
- **Date**: Newest first
- **Score**: Highest score first
- **Popular**: Most attachments first

### Empty States

#### Initial State
Shows when no search performed:
- Welcome message
- Links to view history
- Links to view saved searches

#### No Results
Shows when search returns no results:
- Friendly message
- Suggestion to adjust filters

---

## API Integration

### Search Endpoint

```typescript
POST /api/search
{
  query: string;
  filters: SearchFilter;
  sortBy: SortBy;
  page?: number;
  pageSize?: number;
}

Response:
{
  results: SearchResult[];
  totalCount: number;
  page: number;
  hasMore: boolean;
}
```

### Implementation Example

```typescript
const performSearch = async (
  query: string,
  filters: SearchFilter,
  sortBy: SortBy
) => {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters, sortBy })
  });

  const data = await response.json();
  return data;
};
```

### History Endpoints

```typescript
// Get history
GET /api/search/history

// Delete history item
DELETE /api/search/history/:id
```

### Saved Searches Endpoints

```typescript
// Get saved searches
GET /api/search/saved

// Create saved search
POST /api/search/saved
{
  name: string;
  query: string;
  filters: SearchFilter;
}

// Delete saved search
DELETE /api/search/saved/:id

// Update use count
PATCH /api/search/saved/:id/use
```

### Autocomplete Endpoint

```typescript
GET /api/search/autocomplete?q={query}

Response:
{
  suggestions: AutocompleteResult[];
}
```

---

## Export Functionality

### Export Results

Export search results to JSON file:

```typescript
const handleExportResults = () => {
  const dataStr = JSON.stringify(searchResults, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `search-results-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
```

### Export Format

```json
[
  {
    "id": "r1",
    "type": "proposal",
    "title": "Increase Staking Rewards",
    "description": "...",
    "author": {...},
    "createdAt": "2026-01-04T...",
    "score": 95,
    "category": "Governance",
    "status": "active",
    "highlights": ["staking", "rewards"],
    "tags": ["finance", "staking"],
    "attachments": 2
  }
]
```

---

## Performance Optimization

### Debouncing

Autocomplete uses debouncing to avoid excessive API calls:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    if (searchQuery.length > 0) {
      fetchAutocompleteSuggestions(searchQuery);
    }
  }, 300); // 300ms debounce

  return () => clearTimeout(timer);
}, [searchQuery]);
```

### Memoization

Results are memoized to prevent unnecessary recalculation:

```typescript
const displayResults = useMemo(() => {
  let results = [...searchResults];
  // Apply filters and sorting
  return results;
}, [searchResults, filters, sortBy]);
```

### Pagination

Implement pagination for large result sets:

```typescript
const [page, setPage] = useState(1);
const pageSize = 20;

const loadMore = async () => {
  const newResults = await performSearch(query, filters, sortBy, page + 1);
  setSearchResults(prev => [...prev, ...newResults]);
  setPage(page + 1);
};
```

### Caching

Cache search results to improve performance:

```typescript
const searchCache = useRef<Map<string, SearchResult[]>>(new Map());

const getCacheKey = (query: string, filters: SearchFilter) => {
  return `${query}-${JSON.stringify(filters)}`;
};

const performSearch = async (query: string, filters: SearchFilter) => {
  const cacheKey = getCacheKey(query, filters);
  
  if (searchCache.current.has(cacheKey)) {
    return searchCache.current.get(cacheKey);
  }

  const results = await fetchSearchResults(query, filters);
  searchCache.current.set(cacheKey, results);
  return results;
};
```

---

## Accessibility

### Keyboard Navigation

- **Enter**: Trigger search from input field
- **Tab**: Navigate between controls
- **Escape**: Close autocomplete dropdown

### ARIA Labels

All interactive elements have proper ARIA labels:

```typescript
<button aria-label="Clear search">✕</button>
<button aria-label="Delete history item">✕</button>
<button aria-label="Delete saved search">✕</button>
```

### Screen Reader Support

- Form labels properly associated
- Status updates announced
- Result counts readable
- Loading states announced

### Focus Management

- Focus moves to results after search
- Autocomplete keyboard navigable
- Tab order logical and consistent

---

## Testing

### Test Categories

1. **Search Input Tests** (6 tests)
   - Input rendering
   - Query updates
   - Search triggering
   - Clear functionality

2. **Filter Panel Tests** (8 tests)
   - Panel toggle
   - All filter fields
   - Filter options
   - Value changes

3. **History Tests** (6 tests)
   - Display history
   - Reuse searches
   - Delete items
   - Empty state

4. **Saved Searches Tests** (6 tests)
   - Display saved
   - Use searches
   - Delete searches
   - Empty state

5. **Autocomplete Tests** (4 tests)
   - Show suggestions
   - History items
   - Selection
   - Hide behavior

6. **Results Tests** (5 tests)
   - Loading state
   - Display results
   - Result content
   - Selection callback

7. **Sorting Tests** (3 tests)
   - Sort dropdown
   - Sort options
   - Sort behavior

8. **Save/Export Tests** (3 tests)
   - Save search
   - Export button
   - Export download

9. **Empty States Tests** (4 tests)
   - Initial state
   - No results
   - View links

10. **Accessibility Tests** (4 tests)
    - ARIA labels
    - Button names
    - Form labels
    - Delete buttons

11. **Mobile Tests** (3 tests)
    - Responsive container
    - Button wrapping
    - Filter grid

12. **Integration Tests** (4 tests)
    - Complete search workflow
    - Save and reuse
    - History workflow
    - Filter updates

### Running Tests

```bash
# Run all tests
npm test AdvancedSearch.test.tsx

# Run with coverage
npm test AdvancedSearch.test.tsx -- --coverage

# Watch mode
npm test AdvancedSearch.test.tsx -- --watch
```

---

## Customization

### Custom Result Card

```typescript
const CustomResultCard = ({ result }: { result: SearchResult }) => {
  return (
    <div className="custom-result-card">
      <h3>{result.title}</h3>
      <p>{result.description}</p>
      {/* Custom content */}
    </div>
  );
};
```

### Custom Filters

```typescript
// Add custom category filter
const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

const categories = ['Governance', 'Finance', 'Technical', 'Community'];

<select onChange={(e) => setCategoryFilter([e.target.value])}>
  {categories.map(cat => (
    <option key={cat} value={cat}>{cat}</option>
  ))}
</select>
```

### Custom Sort

```typescript
// Add custom sort option
type CustomSortBy = SortBy | 'custom';

const customSort = (results: SearchResult[]) => {
  return results.sort((a, b) => {
    // Custom sorting logic
    return customCompare(a, b);
  });
};
```

---

## Troubleshooting

### Common Issues

#### 1. Autocomplete Not Showing

**Problem**: Autocomplete doesn't appear when typing

**Solutions**:
- Check if `showAutocomplete` state is true
- Verify `autocompleteResults` has items
- Check z-index of dropdown
- Ensure query length > 0

#### 2. Filters Not Applied

**Problem**: Filter changes don't affect results

**Solutions**:
- Check if filters state is updating
- Verify filter logic in `displayResults`
- Ensure search is re-triggered after filter change

#### 3. History Not Saving

**Problem**: Search history doesn't persist

**Solutions**:
- Verify history state updates after search
- Check array size limit (20 items)
- Implement localStorage persistence
- Verify API endpoint for persistence

#### 4. Export Not Working

**Problem**: Export button doesn't download file

**Solutions**:
- Check browser download permissions
- Verify `URL.createObjectURL` support
- Check console for errors
- Ensure results array is populated

### Debug Mode

Enable debug mode to see component state:

```typescript
const DEBUG = true;

{DEBUG && (
  <pre className="bg-gray-100 p-4 text-xs overflow-auto">
    Query: {searchQuery}
    Filters: {JSON.stringify(filters, null, 2)}
    Results: {searchResults.length}
    History: {searchHistory.length}
    Saved: {savedSearches.length}
  </pre>
)}
```

---

## Best Practices

### 1. Query Optimization

- Use specific keywords
- Apply relevant filters
- Use saved searches for common queries
- Review search history for patterns

### 2. Filter Usage

- Start broad, then narrow
- Combine multiple filters
- Use date ranges for recent content
- Set minimum score for quality results

### 3. Search History

- Review history for repeated searches
- Save frequently used searches
- Delete irrelevant history items
- Use history for quick access

### 4. Performance

- Implement pagination for large result sets
- Cache frequently accessed results
- Debounce autocomplete requests
- Use lazy loading for result images

### 5. User Experience

- Provide clear empty states
- Show loading indicators
- Display result counts
- Enable keyboard navigation
- Maintain search context

---

## Advanced Features

### Real-Time Search

Implement real-time search as user types:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    if (searchQuery.length >= 3) {
      handleSearch();
    }
  }, 500);

  return () => clearTimeout(timer);
}, [searchQuery]);
```

### Search Analytics

Track search analytics:

```typescript
const trackSearch = async (query: string, resultsCount: number) => {
  await fetch('/api/analytics/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      resultsCount,
      timestamp: new Date(),
      filters: filters
    })
  });
};
```

### Advanced Autocomplete

Implement fuzzy matching:

```typescript
import Fuse from 'fuse.js';

const fuse = new Fuse(searchHistory, {
  keys: ['query'],
  threshold: 0.3
});

const suggestions = fuse.search(searchQuery);
```

---

## Resources

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)

### Testing
- [Jest Documentation](https://jestjs.io)
- [React Testing Library](https://testing-library.com/react)

### Accessibility
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

**Last Updated**: January 2026  
**Component Version**: 1.0.0  
**Status**: Production Ready
