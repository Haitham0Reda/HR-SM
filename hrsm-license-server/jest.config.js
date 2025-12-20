export default {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/*.test.js',
    '<rootDir>/src/**/*.property.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  testTimeout: 30000,
  maxWorkers: 1,
  transform: {}
};