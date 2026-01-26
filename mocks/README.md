# MSW (Mock Service Worker) Configuration

This directory contains Mock Service Worker (MSW) configuration for intercepting and mocking API calls.

## Files

- **handlers.ts** - API route handlers with mock responses
- **browser.ts** - Browser setup for development mode
- **server.ts** - Node.js setup for testing

## Usage

### In Development

To enable MSW in development, import the browser worker in your app:

```typescript
// app/layout.tsx or similar entry point
if (process.env.NODE_ENV === 'development') {
  import('../mocks/browser');
}
```

### In Tests

MSW is automatically configured in test setup. Just import the server in your test setup file:

```typescript
// jest.setup.js or vitest.setup.ts
import { server } from './mocks/server';
```

### In Storybook

```typescript
// .storybook/preview.ts
import { worker } from '../mocks/browser';

if (typeof global.process === 'undefined') {
  worker.start();
}
```

## Adding New Handlers

Add handlers to `handlers.ts`:

```typescript
export const handlers = [
  http.get('/api/your-endpoint', () => {
    return HttpResponse.json({ data: 'your data' });
  }),
  
  http.post('/api/your-endpoint', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true });
  }),
];
```

## Testing Specific Scenarios

### Override handler in a test

```typescript
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

test('handles error', async () => {
  server.use(
    http.get('/api/user/profile', () => {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    })
  );
  
  // Your test code
});
```

### Simulate network delays

```typescript
http.get('/api/slow-endpoint', async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return HttpResponse.json({ data: 'slow response' });
});
```

## Benefits

- ✅ Same mocks for development and testing
- ✅ No backend required for frontend development
- ✅ Consistent API responses
- ✅ Test error scenarios easily
- ✅ Network request logging
- ✅ Works with Storybook

## Documentation

- MSW Docs: https://mswjs.io/
- Examples: https://github.com/mswjs/examples
