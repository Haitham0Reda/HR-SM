export default {
  testEnvironment: 'node',
  // Use jsdom for tests that need window object
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!server/config/**/*.js',
    '!server/**/*.model.js',
    '!server/**/*.test.js'
  ],
  testMatch: ['**/server/testing/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/docs/'],
  modulePathIgnorePatterns: ['<rootDir>/server/backups/', '<rootDir>/client/*/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/server/testing/setup.js', '<rootDir>/server/testing/setupFrontendMocks.js'],
  verbose: false,
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
    // Mock PDFKit to avoid module resolution issues
    '^pdfkit$': '<rootDir>/server/testing/__mocks__/pdfkit.js',
    // Mock frontend logger to avoid window object issues
    '^.*client/hr-app/src/utils/logger.js$': '<rootDir>/server/testing/__mocks__/frontendLogger.js',
    // Mock frontend security detection service
    '^.*client/hr-app/src/services/frontendSecurityDetection.service.js$': '<rootDir>/server/testing/__mocks__/frontendSecurityDetection.service.js',
    // Mock correlation ID service
    '^.*server/services/correlationId.service.js$': '<rootDir>/server/testing/__mocks__/correlationId.service.js',
    '^\.\./\.\./services/correlationId\.service\.js$': '<rootDir>/server/testing/__mocks__/correlationId.service.js',
    // Mock log correlation service
    '^.*server/services/logCorrelation.service.js$': '<rootDir>/server/testing/__mocks__/logCorrelation.service.js',
    '^.*logCorrelation.service.js$': '<rootDir>/server/testing/__mocks__/logCorrelation.service.js',
    '^\.\./\.\./services/logCorrelation\.service\.js$': '<rootDir>/server/testing/__mocks__/logCorrelation.service.js',
    // Mock backend security detection service
    '^.*server/services/backendSecurityDetection.service.js$': '<rootDir>/server/testing/__mocks__/backendSecurityDetection.service.js',
    '^\.\./\.\./services/backendSecurityDetection\.service\.js$': '<rootDir>/server/testing/__mocks__/backendSecurityDetection.service.js',
    // Mock log storage service
    '^.*server/services/logStorage.service.js$': '<rootDir>/server/testing/__mocks__/logStorage.service.js',
    '^\.\./\.\./services/logStorage\.service\.js$': '<rootDir>/server/testing/__mocks__/logStorage.service.js',
    // Mock tenant isolation enforcement service
    '^.*server/services/tenantIsolationEnforcement.service.js$': '<rootDir>/server/testing/__mocks__/tenantIsolationEnforcement.service.js',
    '^\.\./\.\./services/tenantIsolationEnforcement\.service\.js$': '<rootDir>/server/testing/__mocks__/tenantIsolationEnforcement.service.js',
    // Mock company logger to avoid async issues in tests
    '^.*server/utils/companyLogger.js$': '<rootDir>/server/testing/__mocks__/companyLogger.js',
    // Mock controller logger to avoid logger function issues
    '^.*utils/controllerLogger.js$': '<rootDir>/server/testing/__mocks__/controllerLogger.js'
  },
  transform: {
    '^.+\.js$': ['babel-jest', { rootMode: 'upward' }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!uuid)/'
  ],

  // Memory and performance optimizations
  maxWorkers: '100%', // Increased parallelism for faster tests
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  testTimeout: 300000, // Increased timeout for long-running tests
  // Memory management
  errorOnDeprecated: false,
  detectOpenHandles: false, // Disable to save memory
  forceExit: true, // Force exit after tests complete
  // Additional memory optimizations
  logHeapUsage: false,
  // Node.js memory options
  workerIdleMemoryLimit: '1GB' // Increase memory limit
};