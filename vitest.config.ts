import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vitest configuration — used by `npm run test:vitest` and `npm run test:ui`.
// Jest remains the primary test runner (npx jest --ci --forceExit); this config
// covers any Vitest-specific test files that opt-in via *.vitest.{ts,tsx} naming.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.vitest.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'test/hardhat'],
  },
});
