// Mock backend security detection service for server-side tests
export const initialize = jest.fn();
export const analyzeRequest = jest.fn().mockResolvedValue([]);
export const analyzeLogEntry = jest.fn().mockResolvedValue([]);
export const getSecurityStats = jest.fn().mockReturnValue({});
export const setDetectionEnabled = jest.fn();
export const clearSecurityEvents = jest.fn();
export const exportSecurityData = jest.fn().mockReturnValue({});

export default {
  initialize,
  analyzeRequest,
  analyzeLogEntry,
  getSecurityStats,
  setDetectionEnabled,
  clearSecurityEvents,
  exportSecurityData
};