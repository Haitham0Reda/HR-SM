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
import { adminRateLimit, validationRateLimit, readRateLimit } from '../middleware/rateLimiting.middleware.js';
import LicenseGenerator from '../services/licenseGenerator.js';
import ValidationService from '../services/validationService.js';
import License from '../models/License.js';

const router = express.Router();

// Apply security middleware to all routes
router.use(preventInjection);
router.use(validateJsonStructure);

// Create License (Platform Admin only)
router.post('/create', 
  adminRateLimit, // Strict rate limiting for admin operations
  authenticatePlatformAdmin,
  validateLicenseCreate,
  asyncHandler(async (req, res) => {
    const { license, token } = await LicenseGenerator.createLicense({
      ...req.validatedData,
      createdBy: req.admin.id
    });
    
    res.status(201).json({
      success: true,
      message: 'License created successfully',
      data: {
        licenseNumber: license.licenseNumber,
        token,
        type: license.type,
        expiresAt: license.expiresAt,
        features: license.features,
        status: license.status
      }
    });
  })
);

// Validate License (HR-SM Backend calls this)
router.post('/validate',
  validationRateLimit, // Frequent validation requests allowed
  validateLicenseValidation,
  asyncHandler(async (req, res) => {
    const { token, machineId, ipAddress } = req.validatedData;
    const result = await ValidationService.validateToken(token, {
      machineId,
      ipAddress: ipAddress || req.ip
    });
    
    res.json({
      success: result.valid,
      valid: result.valid,
      data: result.valid ? result.license : null,
      error: result.valid ? null : result.error,
      timestamp: new Date().toISOString()
    });
  })
);

// Get License Details
router.get('/:licenseNumber',
  readRateLimit, // Lenient for read operations
  authenticatePlatformAdmin,
  validateLicenseNumber,
  asyncHandler(async (req, res) => {
    const { licenseNumber } = req.params;
    
    const license = await License.findOne({ licenseNumber })
      .select('-__v')
      .lean();
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }
    
    res.json({
      success: true,
      data: license
    });
  })
);

// Renew License
router.patch('/:licenseNumber/renew',
  adminRateLimit, // Strict for admin operations
  authenticatePlatformAdmin,
  validateLicenseNumber,
  validateLicenseRenewal,
  asyncHandler(async (req, res) => {
    const { licenseNumber } = req.params;
    const { expiresAt, notes } = req.validatedData;
    
    const license = await License.findOne({ licenseNumber });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }
    
    // Update license
    license.expiresAt = new Date(expiresAt);
    license.status = 'active'; // Reactivate if it was expired
    
    if (notes) {
      license.notes = `${license.notes || ''}\nRenewed: ${notes} (${new Date().toISOString()})`;
    }
    
    await license.save();
    
    // Generate new token
    const newToken = LicenseGenerator.generateToken(license);
    
    res.json({
      success: true,
      message: 'License renewed successfully',
      data: {
        licenseNumber: license.licenseNumber,
        token: newToken,
        expiresAt: license.expiresAt,
        status: license.status
      }
    });
  })
);

// Revoke License
router.delete('/:licenseNumber',
  adminRateLimit, // Strict for admin operations
  authenticatePlatformAdmin,
  validateLicenseNumber,
  validateLicenseRevocation,
  asyncHandler(async (req, res) => {
    const { licenseNumber } = req.params;
    const { reason } = req.validatedData;
    
    const license = await LicenseGenerator.revokeLicense(licenseNumber, reason);
    
    res.json({
      success: true,
      message: 'License revoked successfully',
      data: {
        licenseNumber: license.licenseNumber,
        status: license.status,
        revokedAt: new Date().toISOString()
      }
    });
  })
);

// Get Tenant's License
router.get('/tenant/:tenantId',
  readRateLimit, // Lenient for read operations
  authenticatePlatformAdmin,
  validateTenantId,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    
    const licenses = await License.find({ tenantId })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      data: {
        tenantId,
        licenses,
        count: licenses.length,
        activeLicense: licenses.find(l => l.status === 'active') || null
      }
    });
  })
);

// List All Licenses (with pagination)
router.get('/',
  readRateLimit, // Lenient for read operations
  authenticatePlatformAdmin,
  validatePagination,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const status = req.query.status;
    const type = req.query.type;
    const search = req.query.search;
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (search) {
      // Sanitized search from validation middleware
      query.$or = [
        { licenseNumber: { $regex: search, $options: 'i' } },
        { tenantName: { $regex: search, $options: 'i' } },
        { tenantId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [licenses, total] = await Promise.all([
      License.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      License.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        licenses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  })
);

// Update License Usage (HR-SM Backend calls this)
router.patch('/:licenseNumber/usage',
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
  asyncHandler(async (req, res) => {
    const { licenseNumber } = req.params;
    const { currentUsers, currentStorage } = req.body;
    
    const license = await License.findOne({ licenseNumber });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }
    
    // Update usage
    if (currentUsers !== undefined) {
      license.usage.currentUsers = currentUsers;
    }
    
    if (currentStorage !== undefined) {
      license.usage.currentStorage = currentStorage;
    }
    
    license.usage.lastValidatedAt = new Date();
    
    await license.save();
    
    res.json({
      success: true,
      message: 'License usage updated successfully',
      data: {
        licenseNumber: license.licenseNumber,
        usage: license.usage
      }
    });
  })
);

export default router;