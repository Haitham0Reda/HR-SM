// Mock tenant isolation enforcement service for server-side tests
export const enforceRequestIsolation = jest.fn().mockReturnValue({
  valid: true,
  violations: [],
  warnings: []
});
export const validateFilePath = jest.fn().mockReturnValue({
  valid: true,
  violations: [],
  warnings: []
});
export const validateTenantContext = jest.fn().mockReturnValue({
  valid: true,
  violations: [],
  warnings: []
});
export const validateCrossTenantOperation = jest.fn().mockReturnValue({
  valid: true,
  violations: [],
  warnings: []
});
export const validateExportScope = jest.fn().mockReturnValue({
  valid: true,
  violations: [],
  warnings: []
});

export default {
  enforceRequestIsolation,
  validateFilePath,
  validateTenantContext,
  validateCrossTenantOperation,
  validateExportScope
};