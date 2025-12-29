export default {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/*.unit.test.js',
    '<rootDir>/src/**/*.integration.test.js',
    '<rootDir>/src/**/*.simple.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/licenseGenerator.test.js',
    '<rootDir>/src/__tests__/validationService.test.js',
    '<rootDir>/src/__tests__/auditService.test.js',
    '<rootDir>/src/__tests__/licenseGenerator.simple.test.js',
    '<rootDir>/src/__tests__/licenseWorkflows.e2e.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  testTimeout: 30000, // Increased for integration tests
  maxWorkers: '70%',
  workerIdleMemoryLimit: '512MB',
  detectOpenHandles: false,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  transform: {},
  // Optimize memory usage
  logHeapUsage: false,
  // Faster test discovery
  haste: {
    computeSha1: false,
    throwOnModuleCollision: false
  }
};