// Mock frontend security detection service for server-side tests
export const initialize = jest.fn();
export const analyzeLogEntry = jest.fn().mockResolvedValue([]);
export const getSecurityStats = jest.fn().mockReturnValue({});
export const setDetectionEnabled = jest.fn();
export const clearSecurityEvents = jest.fn();
export const exportSecurityData = jest.fn().mockReturnValue({});

export default {
  initialize,
  analyzeLogEntry,
  getSecurityStats,
  setDetectionEnabled,
  clearSecurityEvents,
  exportSecurityData
};