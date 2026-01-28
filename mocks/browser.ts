/**
 * MSW Browser setup for development
 * This enables API mocking in the browser during development
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// Don't auto-start here - let the MockServiceWorker component control it
// This prevents double initialization which causes infinite loading
