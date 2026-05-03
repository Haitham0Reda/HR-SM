export default {
  testEnvironment: 'node',
  testMatch: ['**/server/testing/repositories/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/docs/'],
  modulePathIgnorePatterns: ['<rootDir>/server/backups/', '<rootDir>/client/*/node_modules/'],
  // No setup files for unit tests with mocked dependencies
  setupFilesAfterEnv: [],
  verbose: true,
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1'
  },
  transform: {
    '^.+\.js$': ['babel-jest', { rootMode: 'upward' }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!uuid)/'
  ],
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  testTimeout: 10000,
  errorOnDeprecated: false,
  detectOpenHandles: false,
  forceExit: true
};
