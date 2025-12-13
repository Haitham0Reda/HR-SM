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
  testPathIgnorePatterns: ['<rootDir>/docs/'],
  setupFilesAfterEnv: ['<rootDir>/server/testing/setup.js'],
  verbose: false,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  // Memory and performance optimizations
  maxWorkers: 1, // Run serially to avoid test interference
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  testTimeout: 60000, // Increase timeout for property tests
  // Memory management
  errorOnDeprecated: false,
  detectOpenHandles: false, // Disable to save memory
  forceExit: true, // Force exit after tests complete
  // Additional memory optimizations
  logHeapUsage: false,
  runInBand: true, // Run tests serially
  // Node.js memory options
  workerIdleMemoryLimit: '512MB'
};