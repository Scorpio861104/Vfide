/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const hardhatJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  maxConcurrency: 1,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^uncrypto$': '<rootDir>/__mocks__/uncrypto.js',
    '^minimatch$': '<rootDir>/__mocks__/minimatch-compat.cjs',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(wagmi|@wagmi|viem|@tanstack|@rainbow-me|@walletconnect|@noble|@scure|abitype|ox|uncrypto|@upstash|chai)/)',
  ],
  testMatch: ['<rootDir>/test/hardhat/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/hardhat/generated/',
  ],
}

module.exports = createJestConfig(hardhatJestConfig)
