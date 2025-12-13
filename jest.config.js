export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/server/testing'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!server/config/**/*.js',
    '!server/**/*.model.js',
    '!server/**/*.test.js'
  ],
  testMatch: ['**/server/testing/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/docs/', '<rootDir>/server/backups/'],
  modulePathIgnorePatterns: ['<rootDir>/docs/', '<rootDir>/server/backups/', '<rootDir>/client/'],
  setupFilesAfterEnv: ['<rootDir>/server/testing/setup.js'],
  verbose: false,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  // Memory and performance optimizations
  maxWorkers: 1,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  testTimeout: 60000,
  errorOnDeprecated: false,
  detectOpenHandles: false,
  forceExit: true,
  logHeapUsage: false
};
