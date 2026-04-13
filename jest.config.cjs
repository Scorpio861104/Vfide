/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  maxConcurrency: 1, // Run tests serially to avoid axe-core concurrency issues
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^uncrypto$': '<rootDir>/__mocks__/uncrypto.js',
    '^minimatch$': '<rootDir>/__mocks__/minimatch-compat.cjs',
  },
  collectCoverageFrom: [
    'lib/utils.ts',
    'lib/price-utils.ts',
    'components/ui/EmptyState.tsx',
    'components/ui/ProgressSteps.tsx',
    'components/ui/Skeleton.tsx',
    'components/ui/progress.tsx',
    'components/ui/alert.tsx',
    'components/ui/button.tsx',
    'components/ui/card.tsx',
    'components/ui/tabs.tsx',
    'components/ui/dialog.tsx',
    'components/ui/DashboardCards.tsx',
    'components/DemoModeBanner.tsx',
    'hooks/useVFIDEBalance.ts',
    'hooks/useMerchantStatus.ts',
    'hooks/useProofScore.ts',
    'hooks/useVaultHooks.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 81,
      functions: 82,
      lines: 85,
      statements: 84,
    },
    './hooks/useVFIDEBalance.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './hooks/useMerchantStatus.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './hooks/useProofScore.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/utils.ts': {
      branches: 87,
      functions: 100,
      lines: 99,
      statements: 94,
    },
    './lib/price-utils.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(wagmi|@wagmi|viem|@tanstack|@rainbow-me|@walletconnect|@noble|@scure|abitype|ox|uncrypto|@upstash|chai)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__mocks__/',
    '/vfide-complete/',
    '/test/hardhat/',
    '/test/contracts/',
    '/test/payment-system/',
    '/test/security/',
    '/websocket-server/test/',
    '/test/integration/', // Hardhat/Chai integration specs should run via on-chain test runner
    '/test/performance/load.test.js', // k6 scenario; execute with `k6 run`, not Jest
    '<rootDir>/playwright/',
    '/e2e/',  // E2E tests run via Playwright, not Jest
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
