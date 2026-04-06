/**
 * Jest Configuration for PostgreSQL Tests
 * 
 * This configuration is specifically for running tests with PostgreSQL
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup/jest-setup-postgres.js'],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.postgres.test.js',
    '**/?(*.)+(spec|test).postgres.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/**/*.test.js',
    '!server/**/*.spec.js',
    '!server/**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Module paths
  modulePaths: ['<rootDir>'],

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Test timeout
  testTimeout: 30000, // 30 seconds for database operations

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Max workers (parallel test execution)
  maxWorkers: 1, // Run tests serially for database consistency

  // Global setup and teardown
  globalSetup: '<rootDir>/test/setup/global-setup-postgres.js',
  globalTeardown: '<rootDir>/test/setup/global-teardown-postgres.js'
};
