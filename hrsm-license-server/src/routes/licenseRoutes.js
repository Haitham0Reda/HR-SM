import express from 'express';
import licenseController from '../controllers/licenseController.js';
import { authenticateAPI, authorizeRole } from '../middleware/auth.js';
import { validateLicenseCreate as validateLicenseCreation, validateLicenseRenewal as validateLicenseUpdate } from '../middleware/validation.middleware.js';
import { generalRateLimit, validationRateLimit } from '../middleware/rateLimiting.middleware.js';

const router = express.Router();

/**
 * License Management Routes - License Server
 */

// Public routes (with rate limiting)
router.post('/validate/:licenseId', 
  validationRateLimit, // License validation rate limiting
  licenseController.validateLicense
);

// API Key protected routes
router.use(authenticateAPI);

// Company-specific routes (with company-based rate limiting)
router.get('/company/:companyId',
  generalRateLimit, // General rate limiting
  licenseController.getLicenseByCompany
);

router.put('/:licenseId/usage',
  generalRateLimit, // General rate limiting for usage updates
  licenseController.updateUsage
);

// Admin routes (require admin role)
router.use(authorizeRole(['admin', 'super-admin']));

// License CRUD operations
router.post('/',
  validateLicenseCreation,
  licenseController.createLicense
);

router.put('/:licenseId/status',
  validateLicenseUpdate,
  licenseController.updateLicenseStatus
);

router.put('/:licenseId/renew',
  licenseController.renewLicense
);

// Audit and monitoring routes
router.get('/:licenseId/audit',
  licenseController.getLicenseAudit
);

router.get('/expiring',
  licenseController.getExpiringLicenses
);

router.get('/statistics',
  licenseController.getLicenseStatistics
);

export default router;