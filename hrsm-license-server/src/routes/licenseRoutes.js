import express from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticatePlatformAdmin, authenticateHRSMBackend } from '../middleware/apiKeyAuth.middleware.js';
import {
    validateLicenseCreate,
    validateLicenseValidation,
    validateLicenseNumber,
    validateTenantId,
    validateLicenseRenewal,
    validateLicenseRevocation,
    validatePagination,
    preventInjection,
    validateJsonStructure,
    handleValidationErrors
} from '../middleware/validation.middleware.js';
import LicenseController from '../controllers/LicenseController.js';

const router = express.Router();

// Apply security middleware to all routes
router.use(preventInjection);
router.use(validateJsonStructure);

// Note: Rate limiting is applied globally in server.js using licenseServerRateLimit()
// Individual route-level rate limiting is not needed as the license server has its own global limits

// Create License (Platform Admin only)
router.post('/create', 
  authenticatePlatformAdmin,
  validateLicenseCreate,
  asyncHandler(LicenseController.createLicense)
);

// Validate License (HR-SM Backend calls this)
router.post('/validate',
  authenticateHRSMBackend,
  validateLicenseValidation,
  asyncHandler(LicenseController.validateLicense)
);

// Get License Statistics (Platform Admin only) - Must come before /:licenseNumber
router.get('/stats',
  authenticatePlatformAdmin,
  asyncHandler(LicenseController.getLicenseStatistics)
);

// Get Tenant's License - Must come before /:licenseNumber
router.get('/tenant/:tenantId',
  authenticatePlatformAdmin,
  validateTenantId,
  asyncHandler(LicenseController.getTenantLicenses)
);

// List All Licenses (with pagination) - Must come before /:licenseNumber
router.get('/',
  authenticatePlatformAdmin,
  validatePagination,
  asyncHandler(LicenseController.listLicenses)
);

// Get License Details - Must come after specific routes
router.get('/:licenseNumber',
  authenticatePlatformAdmin,
  validateLicenseNumber,
  asyncHandler(LicenseController.getLicenseDetails)
);

// Renew License
router.patch('/:licenseNumber/renew',
  authenticatePlatformAdmin,
  validateLicenseNumber,
  validateLicenseRenewal,
  asyncHandler(LicenseController.renewLicense)
);

// Update License Usage (HR-SM Backend calls this)
router.patch('/:licenseNumber/usage',
  authenticateHRSMBackend,
  validateLicenseNumber,
  [
    body('currentUsers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Current users must be a non-negative integer'),
    body('currentStorage')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Current storage must be a non-negative integer')
  ],
  handleValidationErrors,
  asyncHandler(LicenseController.updateLicenseUsage)
);

// Revoke License
router.delete('/:licenseNumber',
  authenticatePlatformAdmin,
  validateLicenseNumber,
  validateLicenseRevocation,
  asyncHandler(LicenseController.revokeLicense)
);

export default router;