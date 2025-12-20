// Mock company logger for tests
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  security: jest.fn(),
  performance: jest.fn(),
  audit: jest.fn(),
  compliance: jest.fn(),
  securityEvent: jest.fn(),
  apiRequest: jest.fn(),
  databaseOperation: jest.fn()
};

// Mock the getLoggerForTenant function to return our mock logger
const getLoggerForTenant = jest.fn().mockResolvedValue(mockLogger);

// Mock the companyLoggerMiddleware to attach our mock logger to requests
const companyLoggerMiddleware = (req, res, next) => {
  req.companyLogger = mockLogger;
  next();
};

export {
  getLoggerForTenant,
  companyLoggerMiddleware
};

export default {
  getLoggerForTenant,
  companyLoggerMiddleware
};