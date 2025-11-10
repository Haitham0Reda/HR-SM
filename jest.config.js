export default {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!server/config/**/*.js',
    '!server/**/*.model.js',
    '!server/**/*.test.js'
  ],
  testMatch: ['**/server/testing/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/server/testing/setup.js'],
  verbose: false,
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  // Aggressive performance optimizations
  maxWorkers: '75%', // Use more CPU cores
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  testTimeout: 30000, // 30 second timeout per test
  // Disable slow features
  errorOnDeprecated: false,
  detectOpenHandles: false,
  forceExit: true // Force exit after tests complete
};
