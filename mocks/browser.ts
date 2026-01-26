/**
 * MSW Browser setup for development
 * This enables API mocking in the browser during development
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// Start the worker only in development
if (process.env.NODE_ENV === 'development') {
  worker.start({
    onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
  });
}
