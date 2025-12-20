// Mock frontend logger for server-side tests
// Window object is now handled by global setup
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  security: jest.fn(),
  performance: jest.fn(),
  audit: jest.fn(),
  userAction: jest.fn(),
  apiCall: jest.fn(),
  navigation: jest.fn(),
  setUserContext: jest.fn(),
  setCompanyContext: jest.fn(),
  setCorrelationId: jest.fn(),
  generateCorrelationId: jest.fn().mockReturnValue('mock-correlation-id'),
  setupPerformanceMonitoring: jest.fn(),
  setupSecurityMonitoring: jest.fn(),
  setupGlobalErrorHandler: jest.fn(),
  getStats: jest.fn().mockReturnValue({}),
  clearQueue: jest.fn()
};

export default mockLogger;