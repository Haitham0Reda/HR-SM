// Mock log storage service for server-side tests
export const storeLog = jest.fn().mockResolvedValue({
  success: true,
  filePath: '/logs/test.log'
});
export const getLog = jest.fn().mockResolvedValue(null);
export const searchLogs = jest.fn().mockResolvedValue([]);
export const deleteOldLogs = jest.fn().mockResolvedValue({ deleted: 0 });
export const archiveLogs = jest.fn().mockResolvedValue({ archived: 0 });
export const getStorageStats = jest.fn().mockReturnValue({
  totalSize: 0,
  fileCount: 0
});

export default {
  storeLog,
  getLog,
  searchLogs,
  deleteOldLogs,
  archiveLogs,
  getStorageStats
};