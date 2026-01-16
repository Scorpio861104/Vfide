# Performance Test Suite

## Overview
Comprehensive performance tests for optimized components to ensure memoization, caching, and re-render prevention work correctly.

## Test Files

### 1. DailyQuestsPanel.perf.test.tsx
Tests for quest filtering and badge count optimizations:
- ✅ Memoized filtered quests
- ✅ Memoized badge counts
- ✅ Fast tab switching (<50ms)
- ✅ No unnecessary re-filtering
- ✅ Efficient state updates

**Coverage:** 20+ test cases

### 2. GlobalSearch.perf.test.tsx
Tests for localStorage caching optimizations:
- ✅ Cached friends/groups parsing
- ✅ No repeated JSON.parse calls
- ✅ Debounced search
- ✅ SSR safety
- ✅ Error handling
- ✅ Fast modal open/close

**Coverage:** 18+ test cases

### 3. SocialFeed.perf.test.tsx
Tests for filtered/sorted posts optimizations:
- ✅ Memoized filtered posts
- ✅ Memoized sorted posts
- ✅ Fast filtering (<50ms)
- ✅ Fast sorting (<50ms)
- ✅ Isolated post interactions
- ✅ Smooth scrolling

**Coverage:** 15+ test cases

### 4. Leaderboard.perf.test.tsx
Tests for data loading/sorting separation:
- ✅ Separated data loading from sorting
- ✅ Memoized sorted leaderboard
- ✅ Fast category switching (<50ms)
- ✅ Efficient large list handling
- ✅ No data reload on sort

**Coverage:** 15+ test cases

### 5. RealtimeMetrics.perf.test.tsx
Tests for async state updates with refs:
- ✅ Ref usage to avoid stale closures
- ✅ No double setState calls
- ✅ Memoized fetchUpdates
- ✅ Proper cleanup on unmount
- ✅ No race conditions
- ✅ Error handling

**Coverage:** 19+ test cases

### 6. CrossChainTransfer.perf.test.tsx
Tests for cached chain filtering:
- ✅ Memoized mainnet chains filter
- ✅ Fast chain switching (<50ms)
- ✅ Debounced route finding
- ✅ Efficient large chain lists
- ✅ No repeated filtering

**Coverage:** 13+ test cases

## Performance Benchmarks

All tests verify operations complete within performance targets:
- Tab/category switching: <50ms
- Search/filter operations: <100ms
- Modal open/close: <50ms
- Sort operations: <50ms
- Data updates: <30ms

## Running Tests

```bash
# Run all performance tests
npm run test -- __tests__/components/performance

# Run specific component tests
npm run test -- DailyQuestsPanel.perf.test.tsx
npm run test -- GlobalSearch.perf.test.tsx
npm run test -- SocialFeed.perf.test.tsx
npm run test -- Leaderboard.perf.test.tsx
npm run test -- RealtimeMetrics.perf.test.tsx
npm run test -- CrossChainTransfer.perf.test.tsx

# Run with coverage
npm run test:coverage -- __tests__/components/performance
```

## Test Coverage Metrics

- **Total Test Cases:** 100+
- **Components Covered:** 6/6 optimized components
- **Performance Assertions:** 80+
- **Memoization Tests:** 20+
- **Re-render Prevention Tests:** 15+
- **Memory Leak Tests:** 6+

## Validated Optimizations

### useMemo Usage
- ✅ DailyQuestsPanel: filteredQuests, questCounts
- ✅ GlobalSearch: cachedFriends, cachedGroups
- ✅ SocialFeed: filteredPosts, sortedPosts
- ✅ Leaderboard: leaderboard (sorted/ranked)
- ✅ CrossChainTransfer: mainnetChains

### useCallback Usage
- ✅ ActivityFeed: formatTime
- ✅ RealtimeMetrics: fetchUpdates

### useRef Usage
- ✅ RealtimeMetrics: metricsRef (avoid stale closures)

### State Optimization
- ✅ social-messaging: use cached state vs localStorage

### Interval Optimization
- ✅ ActivityFeed: 30s → 60s (50% reduction)

## Integration with CI/CD

These tests run as part of the test suite:
```json
{
  "scripts": {
    "test:performance": "jest --testPathPattern=performance",
    "test:ci": "jest --coverage --ci"
  }
}
```

## Performance Regression Prevention

Tests will fail if:
- Operations exceed time thresholds
- Unnecessary re-renders occur
- Memory leaks detected
- Memoization breaks

## Maintenance

Update tests when:
- Adding new performance optimizations
- Changing component APIs
- Modifying performance targets
- Adding new features requiring optimization
