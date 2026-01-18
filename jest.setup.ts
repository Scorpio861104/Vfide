/**
 * Jest Setup File
 */

import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/vfide_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.CSRF_SECRET = 'test-csrf-secret-for-testing-only';
process.env.NODE_ENV = 'test';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/test-path',
}));

// Mock Web3 providers
global.window = {
  ...global.window,
  ethereum: {
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
} as any;
