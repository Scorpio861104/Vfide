# Live Testing Tools - Complete Setup Guide

This guide covers setup and usage for all 4 advanced live testing tools now available in the project.

## Table of Contents
1. [Vitest UI](#vitest-ui)
2. [Testing Playground](#testing-playground)
3. [React DevTools Profiler](#react-devtools-profiler)
4. [MSW (Mock Service Worker)](#msw-mock-service-worker)

---

## 1. Vitest UI

### Overview
Modern, fast test runner with beautiful browser-based UI for real-time test visualization.

### Installation
✅ **Already installed** - Ready to use immediately

### Usage

```bash
# Run tests with UI
npm run test:ui

# Opens http://localhost:51204/__vitest__/
```

### Features
- 🎨 **Visual test explorer** - Browse tests in a tree structure
- 🔍 **Search and filter** - Find tests quickly
- 📊 **Coverage visualization** - See coverage in real-time
- 🐛 **Debug in browser** - Set breakpoints and inspect
- ⚡ **Hot reload** - Tests re-run on file save
- 📈 **Performance graphs** - See test execution time

### Example Test

```typescript
// __tests__/example.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Configuration

File: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### When to Use
- ✅ Want visual feedback while developing tests
- ✅ Need to debug test failures interactively
- ✅ Want to see coverage in real-time
- ✅ Prefer browser-based test exploration
- ✅ Need faster test execution than Jest

### Comparison with Jest
| Feature | Vitest | Jest |
|---------|--------|------|
| Speed | ⚡ 2-5x faster | Standard |
| UI | 🎨 Beautiful browser UI | CLI only |
| Hot Reload | ✅ Built-in | Via --watch |
| Modern | ✅ ES modules native | Requires transform |
| Setup | Minimal | More config needed |

---

## 2. Testing Playground

### Overview
Interactive tool for finding the best queries to select elements in your tests.

### Installation
✅ **Already installed** - Ready to use

### Usage

#### In Tests
```typescript
import { screen } from '@testing-library/react';

test('example', () => {
  render(<YourComponent />);
  
  // Open Testing Playground
  screen.logTestingPlaygroundURL();
  
  // Click the URL in console to open interactive playground
});
```

#### Browser Extension
Install from:
- Chrome: https://chrome.google.com/webstore/detail/testing-playground
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/testing-playground/

### Features
- 🎯 **Find best query** - Automatically suggests best selector
- 📋 **Copy to clipboard** - One-click copy query code
- 🔍 **Explore DOM** - Interactive element inspection
- ♿ **Accessibility-first** - Prioritizes ARIA queries
- 📝 **Query suggestions** - Shows all possible selectors

### Example Workflow

1. Write test and call `screen.logTestingPlaygroundURL()`
2. Run test: `npm run test:ui`
3. Click URL in console
4. Inspect element in playground
5. Copy generated query
6. Paste into test

### Query Priority (Accessibility-First)

1. **getByRole** - Best (accessible name)
2. **getByLabelText** - Good (form labels)
3. **getByPlaceholderText** - OK (inputs)
4. **getByText** - OK (visible text)
5. **getByDisplayValue** - OK (form values)
6. **getByAltText** - OK (images)
7. **getByTitle** - OK (tooltips)
8. **getByTestId** - Last resort

### Example

```typescript
// Instead of:
const button = container.querySelector('.submit-button');

// Testing Playground suggests:
const button = screen.getByRole('button', { name: /submit/i });

// Or with label:
const input = screen.getByLabelText('Email address');
```

### When to Use
- ✅ Learning testing-library best practices
- ✅ Unsure which query to use
- ✅ Want accessible selectors
- ✅ Debugging failing queries
- ✅ Teaching others testing-library

---

## 3. React DevTools Profiler

### Overview
Browser extension for performance profiling of React components.

### Installation

**Chrome:**
https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

**Firefox:**
https://addons.mozilla.org/en-US/firefox/addon/react-devtools/

**Edge:**
https://microsoftedge.microsoft.com/addons/detail/react-developer-tools/

### Usage

1. Install browser extension
2. Open DevTools (F12)
3. Go to **Profiler** tab
4. Click **Record** button
5. Interact with your app
6. Click **Stop** button
7. Analyze results

### Features

#### Component Tree
- 📊 **Flame graph** - Visual render time
- 🔍 **Component hierarchy** - See component structure
- ⏱️ **Render duration** - Time each component took
- 🎯 **Highlight updates** - See what re-rendered

#### Why Did It Render?
- 📝 **Props changed** - Which props triggered render
- 🔄 **State changed** - Which state triggered render
- 👪 **Parent rendered** - Parent component caused re-render
- 🪝 **Hooks changed** - Which hooks triggered render

#### Performance Metrics
- ⚡ **Commit phase** - Total time for commit
- 🎨 **Render phase** - Time to calculate changes
- 📈 **Ranked chart** - Components sorted by render time
- 🔥 **Flame graph** - Visual representation

### Example Analysis

```
Flamegraph shows:
├── App (4ms)
│   ├── Header (1ms)
│   ├── Dashboard (15ms) ⚠️ SLOW
│   │   ├── Chart (10ms) ⚠️ SLOW
│   │   └── Stats (5ms)
│   └── Footer (1ms)
```

**Fix slow components:**
```typescript
// Before: Renders on every parent update
const Chart = ({ data }) => {
  return <ExpensiveChart data={data} />;
};

// After: Only renders when data changes
const Chart = memo(({ data }) => {
  return <ExpensiveChart data={data} />;
});

// Or with custom comparison
const Chart = memo(({ data }) => {
  return <ExpensiveChart data={data} />;
}, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id;
});
```

### Profiling Best Practices

1. **Record realistic interactions** - Profile actual user flows
2. **Focus on slow components** - Optimize components >50ms
3. **Check unnecessary renders** - Use memo/useMemo/useCallback
4. **Measure before and after** - Verify optimizations work
5. **Profile in production mode** - Development mode is slower

### Common Issues & Fixes

#### Issue: Component renders too often
```typescript
// Problem: Creates new function every render
<Button onClick={() => handleClick(item.id)} />

// Solution: Use useCallback
const handleItemClick = useCallback(
  (id) => handleClick(id),
  [handleClick]
);
<Button onClick={() => handleItemClick(item.id)} />
```

#### Issue: Expensive calculation on every render
```typescript
// Problem: Recalculates on every render
const total = items.reduce((sum, item) => sum + item.price, 0);

// Solution: Use useMemo
const total = useMemo(
  () => items.reduce((sum, item) => sum + item.price, 0),
  [items]
);
```

### When to Use
- ✅ App feels slow
- ✅ Identifying performance bottlenecks
- ✅ Optimizing component renders
- ✅ Measuring optimization impact
- ✅ Understanding component behavior

---

## 4. MSW (Mock Service Worker)

### Overview
API mocking library that intercepts requests at the network level. Works in both browser and Node.js.

### Installation
✅ **Already installed** - Configuration files created

### Setup

#### 1. Initialize MSW (One-time setup)

```bash
# Generate service worker file
npx msw init public/ --save
```

This creates `public/mockServiceWorker.js`

#### 2. Enable in Development

Add to `app/layout.tsx`:

```typescript
// app/layout.tsx
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  import('../mocks/browser').then(({ worker }) => {
    worker.start();
  });
}
```

#### 3. Enable in Tests

Already configured in `mocks/server.ts` and loaded automatically.

### Usage

#### Viewing Mock Handlers

File: `mocks/handlers.ts`

```typescript
export const handlers = [
  // User profile
  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    });
  }),

  // Payment requests
  http.get('/api/crypto/payment-requests', () => {
    return HttpResponse.json([...]);
  }),
];
```

#### Adding New Mocks

```typescript
// mocks/handlers.ts
export const handlers = [
  // ... existing handlers

  // New handler
  http.post('/api/your-endpoint', async ({ request }) => {
    const body = await request.json();
    
    // Validate
    if (!body.required Field) {
      return HttpResponse.json(
        { error: 'Required field missing' },
        { status: 400 }
      );
    }

    // Success response
    return HttpResponse.json({
      id: Date.now(),
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),
];
```

### Features

#### 🌐 Network-level Interception
- Intercepts `fetch` and `XMLHttpRequest`
- Works with any HTTP client
- No modifications to application code

#### 🎭 Realistic Mocking
- Same mocks for dev and test
- Simulates delays, errors, edge cases
- Request/response logging

#### 🔧 Flexible Handlers
- Match by URL, method, headers
- Programmatic responses
- Conditional logic

### Common Scenarios

#### Error Simulation
```typescript
http.get('/api/user/profile', () => {
  return HttpResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
});
```

#### Network Delay
```typescript
http.get('/api/slow-endpoint', async () => {
  await new Promise(resolve => setTimeout(resolve, 3000));
  return HttpResponse.json({ data: 'slow response' });
});
```

#### Conditional Response
```typescript
http.get('/api/items', ({ request }) => {
  const url = new URL(request.url);
  const page = url.searchParams.get('page');
  
  return HttpResponse.json({
    items: getItemsForPage(parseInt(page || '1')),
    hasMore: parseInt(page || '1') < 10,
  });
});
```

#### Override in Tests
```typescript
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

test('handles 404 error', async () => {
  // Override for this test only
  server.use(
    http.get('/api/user/profile', () => {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    })
  );

  // Test your error handling
});
```

### Debugging

#### Enable Request Logging

```typescript
// mocks/browser.ts
worker.start({
  onUnhandledRequest: 'warn', // Log unhandled requests
});
```

#### View Network Tab

MSW shows up in browser DevTools Network tab:
- ⚙️ Requests show "from ServiceWorker"
- 📋 Full request/response visible
- ⏱️ Timing information available

### When to Use
- ✅ Develop frontend without backend
- ✅ Consistent API responses in dev
- ✅ Test error scenarios easily
- ✅ Prototype with mock data
- ✅ Offline development
- ✅ Storybook API mocking

---

## Integrated Workflow

### Multi-Tool Development Setup

```bash
# Terminal 1: Dev server with MSW
npm run dev

# Terminal 2: Vitest UI for tests
npm run test:ui

# Terminal 3: Storybook with MSW
npm run storybook
```

### Testing Workflow

1. **Write component** in Storybook
2. **Add MSW handlers** for API calls
3. **Write tests** with Testing Playground
4. **Run Vitest UI** for instant feedback
5. **Profile** with React DevTools
6. **Optimize** based on profiler data

### Complete Example

```typescript
// Component with API call
export function UserProfile() {
  const { data, isLoading } = useFetch('/api/user/profile');
  
  if (isLoading) return <Skeleton />;
  
  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}

// MSW handler (mocks/handlers.ts)
http.get('/api/user/profile', () => {
  return HttpResponse.json({
    name: 'John Doe',
    email: 'john@example.com',
  });
}),

// Storybook story
export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/user/profile', () => {
          return HttpResponse.json({
            name: 'Story User',
            email: 'story@example.com',
          });
        }),
      ],
    },
  },
};

// Vitest test
test('displays user profile', async () => {
  render(<UserProfile />);
  
  expect(await screen.findByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});
```

---

## Quick Reference

### Commands
```bash
# Vitest UI
npm run test:ui              # Visual test runner
npm run test:vitest          # Run tests once
npm run test:vitest:watch    # Watch mode

# MSW
npx msw init public/         # Initialize (one-time)

# Testing Playground
screen.logTestingPlaygroundURL()  # In test code

# React DevTools
# Install browser extension then use F12 → Profiler tab
```

### Files
- `vitest.config.ts` - Vitest configuration
- `vitest.setup.ts` - Test setup
- `mocks/handlers.ts` - API mocks
- `mocks/browser.ts` - Browser MSW setup
- `mocks/server.ts` - Node MSW setup

---

## Troubleshooting

### Vitest UI not loading
```bash
# Clear cache
rm -rf node_modules/.vite
npm run test:ui
```

### MSW not intercepting requests
1. Check `public/mockServiceWorker.js` exists
2. Verify worker.start() is called
3. Check browser console for MSW logs
4. Ensure requests match handler patterns

### React DevTools not showing
1. Verify extension is installed
2. Check running in development mode
3. Refresh page after installing extension
4. Check React version compatibility

---

## Next Steps

1. ✅ **Start with Vitest UI** - Convert a few tests
2. ✅ **Add MSW handlers** - Mock your API endpoints
3. ✅ **Install React DevTools** - Profile your app
4. ✅ **Use Testing Playground** - Learn best queries
5. ✅ **Integrate into workflow** - Use all tools together

---

**Status:** ✅ All tools installed and ready to use  
**Setup Required:** MSW init (one command), React DevTools extension  
**Documentation:** Complete with examples

For more details, see:
- Vitest: https://vitest.dev/
- MSW: https://mswjs.io/
- Testing Playground: https://testing-playground.com/
- React DevTools: https://react.dev/learn/react-developer-tools
