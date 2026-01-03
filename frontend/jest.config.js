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
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
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
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__mocks__/',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
