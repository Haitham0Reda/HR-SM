import axios from 'axios';
import crypto from 'crypto';
import os from 'os';
import logger from '../utils/logger.js';

/**
 * License Server Validation Middleware
 * Integrates with separate license server microservice at http://localhost:4000
 * Handles machine ID generation, periodic validation, and graceful offline handling
 */

// Configuration
const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
const VALIDATION_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const OFFLINE_GRACE_PERIOD = 60 * 60 * 1000; // 1 hour
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// In-memory cache for validation results
const validationCache = new Map();
const machineIdCache = new Map();

/**
 * Generate machine ID for hardware fingerprinting
 * Uses system information to create a unique identifier
 * @returns {string} Machine ID hash
 */
function generateMachineId() {
  try {
    // Check cache first
    if (machineIdCache.has('machineId')) {
      return machineIdCache.get('machineId');
    }

    // Collect system information
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalmem: os.totalmem(),
      networkInterfaces: Object.keys(os.networkInterfaces()).sort().join(',')
    };

    // Create hash from system info
    const machineId = crypto
      .createHash('sha256')
      .update(JSON.stringify(systemInfo))
      .digest('hex')
      .substring(0, 32);

    // Cache the machine ID
    machineIdCache.set('machineId', machineId);
    
    logger.debug('Generated machine ID', { 
      machineId: machineId.substring(0, 8) + '...',
      hostname: systemInfo.hostname 
    });

    return machineId;
  } catch (error) {
    logger.error('Failed to generate machine ID', { error: error.message });
    // Fallback to a static ID based on hostname
    return crypto.createHash('sha256').update(os.hostname()).digest('hex').substring(0, 32);
  }
}

/**
 * Call license server validation endpoint with retry logic
 * @param {string} licenseToken - JWT license token
 * @param {string} machineId - Machine identifier
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object>} Validation result
 */
async function callLicenseServer(licenseToken, machineId, attempt = 1) {
  try {
    const response = await axios.post(`${LICENSE_SERVER_URL}/licenses/validate`, {
      token: licenseToken,
      machineId: machineId
    }, {
      timeout: 5000, // 5 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HR-SM-Backend/1.0'
      }
    });

    return {
      success: true,
      data: response.data,
      timestamp: Date.now()
    };
  } catch (error) {
    logger.warn(`License server call failed (attempt ${attempt})`, {
      error: error.message,
      code: error.code,
      status: error.response?.status,
      attempt
    });

    // Retry logic
    if (attempt < MAX_RETRY_ATTEMPTS && shouldRetry(error)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      return callLicenseServer(licenseToken, machineId, attempt + 1);
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
      status: error.response?.status,
      timestamp: Date.now()
    };
  }
}

/**
 * Determine if error should trigger a retry
 * @param {Error} error - The error object
 * @returns {boolean} Whether to retry
 */
function shouldRetry(error) {
  // Retry on network errors, timeouts, and 5xx server errors
  return (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    (error.response && error.response.status >= 500)
  );
}

/**
 * Get cached validation result if still valid
 * @param {string} cacheKey - Cache key
 * @returns {Object|null} Cached result or null
 */
function getCachedValidation(cacheKey) {
  const cached = validationCache.get(cacheKey);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > VALIDATION_CACHE_TTL) {
    validationCache.delete(cacheKey);
    return null;
  }

  return cached;
}

/**
 * Cache validation result
 * @param {string} cacheKey - Cache key
 * @param {Object} result - Validation result
 */
function cacheValidation(cacheKey, result) {
  validationCache.set(cacheKey, {
    ...result,
    timestamp: Date.now()
  });

  // Clean up old cache entries periodically
  if (validationCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of validationCache.entries()) {
      if (now - value.timestamp > VALIDATION_CACHE_TTL) {
        validationCache.delete(key);
      }
    }
  }
}

/**
 * Check if tenant can operate in offline mode
 * @param {string} tenantId - Tenant identifier
 * @returns {boolean} Whether offline operation is allowed
 */
function canOperateOffline(tenantId) {
  const cacheKey = `offline_${tenantId}`;
  const lastValidation = validationCache.get(cacheKey);
  
  if (!lastValidation) return false;
  
  const timeSinceLastValidation = Date.now() - lastValidation.timestamp;
  return timeSinceLastValidation < OFFLINE_GRACE_PERIOD;
}

/**
 * Main license validation middleware
 * Validates license with separate license server
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateLicense = async (req, res, next) => {
  try {
    // Skip validation for platform admin routes
    if (req.path.startsWith('/api/platform/')) {
      return next();
    }

    // Extract tenant information
    const tenantId = req.tenantId || 
                    req.tenant?.id || 
                    req.tenant?._id?.toString() || 
                    req.user?.tenant?.toString() ||
                    req.headers['x-tenant-id'];

    if (!tenantId) {
      logger.warn('License validation skipped: No tenant ID found', {
        path: req.path,
        method: req.method
      });
      return next(); // Allow request to continue for now
    }

    // Get tenant's license token (this will be populated by task 3.2)
    const licenseToken = req.tenant?.license?.licenseKey || 
                        req.headers['x-license-token'];

    if (!licenseToken) {
      logger.warn('No license token found for tenant', { tenantId });
      
      // Check if tenant can operate in offline mode
      if (canOperateOffline(tenantId)) {
        logger.info('Allowing offline operation for tenant', { tenantId });
        return next();
      }

      return res.status(403).json({
        success: false,
        error: 'LICENSE_REQUIRED',
        message: 'Valid license required to access this service',
        tenantId
      });
    }

    // Generate machine ID
    const machineId = generateMachineId();
    const cacheKey = `${tenantId}_${machineId}`;

    // Check cache first
    const cachedResult = getCachedValidation(cacheKey);
    if (cachedResult) {
      if (cachedResult.success && cachedResult.data?.valid) {
        // Attach license info to request
        req.licenseInfo = {
          valid: true,
          features: cachedResult.data.features || [],
          expiresAt: cachedResult.data.expiresAt,
          licenseType: cachedResult.data.licenseType,
          cached: true
        };
        return next();
      } else if (!cachedResult.success) {
        // Check if we can operate offline
        if (canOperateOffline(tenantId)) {
          logger.info('License server unavailable, allowing offline operation', { tenantId });
          return next();
        }
      }
    }

    // Call license server
    const validationResult = await callLicenseServer(licenseToken, machineId);

    // Cache the result
    cacheValidation(cacheKey, validationResult);

    if (!validationResult.success) {
      // License server is unavailable
      logger.error('License server validation failed', {
        tenantId,
        error: validationResult.error,
        status: validationResult.status
      });

      // Check if we can operate in offline mode
      if (canOperateOffline(tenantId)) {
        logger.info('License server unavailable, allowing offline operation', { tenantId });
        return next();
      }

      return res.status(503).json({
        success: false,
        error: 'LICENSE_SERVER_UNAVAILABLE',
        message: 'License validation service is temporarily unavailable',
        details: validationResult.error
      });
    }

    const { data: validationData } = validationResult;

    if (!validationData.valid) {
      logger.warn('License validation failed', {
        tenantId,
        error: validationData.error,
        reason: validationData.reason
      });

      return res.status(403).json({
        success: false,
        error: validationData.error || 'LICENSE_INVALID',
        message: validationData.reason || 'License validation failed',
        tenantId
      });
    }

    // License is valid - cache for offline operation
    cacheValidation(`offline_${tenantId}`, validationResult);

    // Attach license info to request for downstream middleware
    req.licenseInfo = {
      valid: true,
      features: validationData.features || [],
      expiresAt: validationData.expiresAt,
      licenseType: validationData.licenseType,
      maxUsers: validationData.maxUsers,
      maxStorage: validationData.maxStorage,
      maxAPI: validationData.maxAPI,
      cached: false
    };

    logger.debug('License validation successful', {
      tenantId,
      licenseType: validationData.licenseType,
      features: validationData.features
    });

    next();

  } catch (error) {
    logger.error('License validation middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path
    });

    // In case of unexpected errors, check offline operation
    const tenantId = req.tenantId || req.tenant?.id;
    if (tenantId && canOperateOffline(tenantId)) {
      logger.info('Unexpected error, allowing offline operation', { tenantId });
      return next();
    }

    return res.status(500).json({
      success: false,
      error: 'LICENSE_VALIDATION_ERROR',
      message: 'An error occurred during license validation'
    });
  }
};

/**
 * Middleware to check if specific feature is licensed
 * @param {string} featureName - Name of the feature to check
 * @returns {Function} Express middleware function
 */
export const requireFeature = (featureName) => {
  return (req, res, next) => {
    const licenseInfo = req.licenseInfo;

    if (!licenseInfo || !licenseInfo.valid) {
      return res.status(403).json({
        success: false,
        error: 'LICENSE_REQUIRED',
        message: 'Valid license required for this feature',
        feature: featureName
      });
    }

    if (!licenseInfo.features.includes(featureName)) {
      return res.status(403).json({
        success: false,
        error: 'FEATURE_NOT_LICENSED',
        message: `Feature '${featureName}' is not included in your license`,
        feature: featureName,
        licensedFeatures: licenseInfo.features
      });
    }

    next();
  };
};

/**
 * Get validation cache statistics
 * @returns {Object} Cache statistics
 */
export function getValidationStats() {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;
  let offlineEntries = 0;

  for (const [key, value] of validationCache.entries()) {
    const age = now - value.timestamp;
    if (key.startsWith('offline_')) {
      offlineEntries++;
    } else if (age > VALIDATION_CACHE_TTL) {
      expiredEntries++;
    } else {
      validEntries++;
    }
  }

  return {
    totalEntries: validationCache.size,
    validEntries,
    expiredEntries,
    offlineEntries,
    cacheTTL: VALIDATION_CACHE_TTL,
    offlineGracePeriod: OFFLINE_GRACE_PERIOD,
    licenseServerUrl: LICENSE_SERVER_URL
  };
}

/**
 * Clear validation cache (useful for testing)
 */
export function clearValidationCache() {
  const size = validationCache.size;
  validationCache.clear();
  machineIdCache.clear();
  logger.debug('License validation cache cleared', { entriesCleared: size });
}

export default {
  validateLicense,
  requireFeature,
  getValidationStats,
  clearValidationCache
};