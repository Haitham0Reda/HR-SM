// Mock correlation ID service for server-side tests
console.log('Loading correlationId.service mock');

// Individual function mocks
export const generateCorrelationId = jest.fn().mockReturnValue('test-corr-id');
export const generateShortCorrelationId = jest.fn().mockReturnValue('short-corr-id');
export const isValidCorrelationId = jest.fn().mockReturnValue(true);
export const extractTimestamp = jest.fn().mockReturnValue(new Date());
export const generateSessionCorrelationId = jest.fn().mockReturnValue('sess-test-id');
export const generateRequestCorrelationId = jest.fn().mockReturnValue('req-test-id');
export const correlationMiddleware = jest.fn();
export const getCorrelationContext = jest.fn().mockReturnValue({});
export const linkCorrelationIds = jest.fn();
export const getLinkedCorrelationIds = jest.fn().mockReturnValue([]);
export const updateCorrelationContext = jest.fn();
export const getCorrelationStats = jest.fn().mockReturnValue({});
export const clearCorrelationStore = jest.fn();

// Default export with all functions as methods
const mockCorrelationIdService = {
  generateCorrelationId,
  generateShortCorrelationId,
  isValidCorrelationId,
  extractTimestamp,
  generateSessionCorrelationId,
  generateRequestCorrelationId,
  correlationMiddleware,
  getCorrelationContext,
  linkCorrelationIds,
  getLinkedCorrelationIds,
  updateCorrelationContext,
  getCorrelationStats,
  clearCorrelationStore
};

export default mockCorrelationIdService;