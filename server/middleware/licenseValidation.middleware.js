import axios from 'axios';
import crypto from 'crypto';
import os from 'os';
import cron from 'node-cron';
import redisService from '../core/services/redis.service.js';
import logger from '../utils/logger.js';

/**
 * Enhanced License Validation Middleware
 * Integrates with license server microservice with Redis caching and background validation
 * 
 * Features:
 * - HTTP client with exponential backoff retry logic
 * - Redis caching to reduce API calls
 * - Background license validation service (24-hour intervals)
 * - Graceful offline handling with cached validation
 * - Machine ID binding for hardware fingerprinting
 */

// Configuration
const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
const LICENSE_SERVER_API_KEY = process.env.LICENSE_SERVER_API_KEY;
const CACHE_TTL = 15 * 60; // 15 minutes in seconds
const OFFLINE_GRACE_PERIOD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY = 1000; // 1 second base delay
const RETRY_MAX_DELAY = 8000; // 8 seconds max delay

// In-memory fallback cache when Redis is unavailable
const memoryCache = new Map();
const machineIdCache = new Map();

// Background validation tracking
const backgroundValidationStatus = {
  isRunning: false,
  lastRun: null,
  nextRun: null,
  errors: [],
  validatedTenants: 0
};

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
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (1-based)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
  const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
  return Math.min(delay, RETRY_MAX_DELAY);
}

/**
 * Call license server validation endpoint with exponential backoff retry logic
 * @param {string} licenseToken - JWT license token
 * @param {string} machineId - Machine identifier
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object>} Validation result
 */
async function callLicenseServerWithRetry(licenseToken, machineId, attempt = 1) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'HR-SM-Backend/1.0'
    };

    // Add API key authentication if available
    if (LICENSE_SERVER_API_KEY) {
      headers['X-API-Key'] = LICENSE_SERVER_API_KEY;
    } else {
      logger.warn('LICENSE_SERVER_API_KEY not configured, license validation may fail');
    }

    const response = await axios.post(`${LICENSE_SERVER_URL}/licenses/validate`, {
      token: licenseToken,
      machineId: machineId
    }, {
      timeout: 5000, // 5 second timeout
      headers
    });

    return {
      success: true,
      data: response.data,
      timestamp: Date.now()
    };
  } catch (error) {
    logger.warn(`License server call failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`, {
      error: error.message,
      code: error.code,
      status: error.response?.status,
      attempt,
      hasApiKey: !!LICENSE_SERVER_API_KEY
    });

    // Retry logic with exponential backoff
    if (attempt < MAX_RETRY_ATTEMPTS && shouldRetry(error)) {
      const delay = calculateBackoffDelay(attempt);
      logger.debug(`Retrying license server call in ${delay}ms`, { attempt: attempt + 1 });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return callLicenseServerWithRetry(licenseToken, machineId, attempt + 1);
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
    error.code === 'ECONNRESET' ||
    (error.response && error.response.status >= 500)
  );
}

/**
 * Get cached validation result from Redis or memory fallback
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Cached result or null
 */
async function getCachedValidation(cacheKey) {
  try {
    // Try Redis first
    const cached = await redisService.get(cacheKey);
    if (cached) {
      logger.debug('License validation cache hit (Redis)', { cacheKey });
      return cached;
    }
  } catch (error) {
    logger.warn('Redis cache read failed, falling back to memory', { error: error.message });
  }

  // Fallback to memory cache
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached) {
    const age = Date.now() - memoryCached.timestamp;
    if (age <= CACHE_TTL * 1000) {
      logger.debug('License validation cache hit (memory)', { cacheKey });
      return memoryCached;
    } else {
      memoryCache.delete(cacheKey);
    }
  }

  return null;
}

/**
 * Cache validation result in Redis and memory fallback
 * @param {string} cacheKey - Cache key
 * @param {Object} result - Validation result
 */
async function cacheValidation(cacheKey, result) {
  const cacheData = {
    ...result,
    timestamp: Date.now()
  };

  try {
    // Try Redis first
    await redisService.set(cacheKey, cacheData, CACHE_TTL);
    logger.debug('License validation cached (Redis)', { cacheKey });
  } catch (error) {
    logger.warn('Redis cache write failed, using memory fallback', { error: error.message });
  }

  // Always cache in memory as fallback
  memoryCache.set(cacheKey, cacheData);

  // Clean up old memory cache entries periodically
  if (memoryCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (now - value.timestamp > CACHE_TTL * 1000) {
        memoryCache.delete(key);
      }
    }
  }
}

/**
 * Check if tenant can operate in offline mode
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<boolean>} Whether offline operation is allowed
 */
async function canOperateOffline(tenantId) {
  const offlineCacheKey = `license:offline:${tenantId}`;
  
  try {
    const lastValidation = await getCachedValidation(offlineCacheKey);
    if (!lastValidation) return false;
    
    const timeSinceLastValidation = Date.now() - lastValidation.timestamp;
    return timeSinceLastValidation < OFFLINE_GRACE_PERIOD;
  } catch (error) {
    logger.error('Error checking offline operation status', { tenantId, error: error.message });
    return false;
  }
}

/**
 * Background license validation service
 * Runs every 24 hours to validate all active tenant licenses
 */
async function runBackgroundValidation() {
  if (backgroundValidationStatus.isRunning) {
    logger.warn('Background license validation already running, skipping');
    return;
  }

  backgroundValidationStatus.isRunning = true;
  backgroundValidationStatus.lastRun = new Date();
  backgroundValidationStatus.errors = [];
  backgroundValidationStatus.validatedTenants = 0;

  logger.info('Starting background license validation');

  try {
    // Get all active tenants from cache or database
    const activeTenants = await getActiveTenants();
    const machineId = generateMachineId();

    for (const tenant of activeTenants) {
      try {
        if (!tenant.licenseToken) {
          logger.warn('Tenant has no license token, skipping background validation', { 
            tenantId: tenant.id 
          });
          continue;
        }

        // Validate license
        const validationResult = await callLicenseServerWithRetry(tenant.licenseToken, machineId);
        
        // Cache the result
        const cacheKey = `license:validation:${tenant.id}:${machineId}`;
        await cacheValidation(cacheKey, validationResult);

        // Cache for offline operation if valid
        if (validationResult.success && validationResult.data?.valid) {
          const offlineCacheKey = `license:offline:${tenant.id}`;
          await cacheValidation(offlineCacheKey, validationResult);
        }

        backgroundValidationStatus.validatedTenants++;
        
        logger.debug('Background validation completed for tenant', { 
          tenantId: tenant.id,
          valid: validationResult.success && validationResult.data?.valid
        });

      } catch (error) {
        const errorInfo = {
          tenantId: tenant.id,
          error: error.message,
          timestamp: new Date()
        };
        backgroundValidationStatus.errors.push(errorInfo);
        logger.error('Background validation failed for tenant', errorInfo);
      }
    }

    logger.info('Background license validation completed', {
      validatedTenants: backgroundValidationStatus.validatedTenants,
      errors: backgroundValidationStatus.errors.length
    });

  } catch (error) {
    logger.error('Background license validation failed', { error: error.message });
    backgroundValidationStatus.errors.push({
      error: error.message,
      timestamp: new Date()
    });
  } finally {
    backgroundValidationStatus.isRunning = false;
    backgroundValidationStatus.nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}

/**
 * Get active tenants for background validation
 * This is a placeholder - should be implemented based on your tenant model
 * @returns {Promise<Array>} Array of active tenants
 */
async function getActiveTenants() {
  // TODO: Implement based on your tenant model
  // This should query your database for active tenants with license tokens
  // For now, return empty array to prevent errors
  try {
    // Example implementation:
    // const Company = await import('../models/Company.js');
    // return await Company.find({ status: 'active', licenseToken: { $exists: true } });
    return [];
  } catch (error) {
    logger.error('Failed to get active tenants for background validation', { error: error.message });
    return [];
  }
}

/**
 * Initialize background license validation service
 * Schedules validation to run every 24 hours
 */
function initializeBackgroundValidation() {
  // Schedule background validation to run every 24 hours at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Scheduled background license validation starting');
    await runBackgroundValidation();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Run initial validation after 5 minutes of startup
  setTimeout(async () => {
    logger.info('Running initial background license validation');
    await runBackgroundValidation();
  }, 5 * 60 * 1000);

  logger.info('Background license validation service initialized');
}

/**
 * Main license validation middleware
 * Validates license with separate license server using Redis caching
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

    // Get tenant's license token
    const licenseToken = req.tenant?.license?.licenseKey || 
                        req.headers['x-license-token'];

    if (!licenseToken) {
      logger.warn('No license token found for tenant', { tenantId });
      
      // Check if tenant can operate in offline mode
      if (await canOperateOffline(tenantId)) {
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
    const cacheKey = `license:validation:${tenantId}:${machineId}`;

    // Check cache first
    const cachedResult = await getCachedValidation(cacheKey);
    if (cachedResult) {
      if (cachedResult.success && cachedResult.data?.valid) {
        // Attach license info to request
        req.licenseInfo = {
          valid: true,
          features: cachedResult.data.features || [],
          expiresAt: cachedResult.data.expiresAt,
          licenseType: cachedResult.data.licenseType,
          maxUsers: cachedResult.data.maxUsers,
          maxStorage: cachedResult.data.maxStorage,
          maxAPI: cachedResult.data.maxAPI,
          cached: true
        };
        return next();
      } else if (!cachedResult.success) {
        // Check if we can operate offline
        if (await canOperateOffline(tenantId)) {
          logger.info('License server unavailable, allowing offline operation', { tenantId });
          return next();
        }
      }
    }

    // Call license server with retry logic
    const validationResult = await callLicenseServerWithRetry(licenseToken, machineId);

    // Cache the result
    await cacheValidation(cacheKey, validationResult);

    if (!validationResult.success) {
      // License server is unavailable
      logger.error('License server validation failed', {
        tenantId,
        error: validationResult.error,
        status: validationResult.status
      });

      // Check if we can operate in offline mode
      if (await canOperateOffline(tenantId)) {
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
    const offlineCacheKey = `license:offline:${tenantId}`;
    await cacheValidation(offlineCacheKey, validationResult);

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
    if (tenantId && await canOperateOffline(tenantId)) {
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
 * Middleware to check if specific module is licensed
 * @param {string} moduleKey - Module key from MODULES constant
 * @returns {Function} Express middleware function
 */
export const requireModuleLicense = (moduleKey) => {
  return async (req, res, next) => {
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
        logger.warn('Module license validation skipped: No tenant ID found', {
          path: req.path,
          method: req.method,
          module: moduleKey
        });
        return res.status(400).json({
          success: false,
          error: 'TENANT_REQUIRED',
          message: 'Tenant identification required for module access'
        });
      }

      // First run general license validation
      await new Promise((resolve, reject) => {
        validateLicense(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Check if the specific module is licensed
      const licenseInfo = req.licenseInfo;
      
      if (!licenseInfo || !licenseInfo.valid) {
        return res.status(403).json({
          success: false,
          error: 'LICENSE_REQUIRED',
          message: 'Valid license required to access this module',
          module: moduleKey
        });
      }

      // Check if module is included in licensed features
      if (!licenseInfo.features.includes(moduleKey)) {
        return res.status(403).json({
          success: false,
          error: 'MODULE_NOT_LICENSED',
          message: `Module '${moduleKey}' is not included in your license`,
          module: moduleKey,
          licensedFeatures: licenseInfo.features
        });
      }

      logger.debug('Module license validation successful', {
        tenantId,
        module: moduleKey
      });

      next();

    } catch (error) {
      logger.error('Module license validation error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        module: moduleKey
      });

      return res.status(500).json({
        success: false,
        error: 'MODULE_LICENSE_VALIDATION_ERROR',
        message: 'An error occurred during module license validation'
      });
    }
  };
};

/**
 * Get license validation statistics
 * @returns {Object} Validation statistics
 */
export function getLicenseValidationStats() {
  const redisStats = redisService.getStats();
  
  return {
    caching: {
      redis: redisStats,
      memoryCache: {
        size: memoryCache.size,
        enabled: true
      }
    },
    backgroundValidation: {
      ...backgroundValidationStatus,
      nextRun: backgroundValidationStatus.nextRun?.toISOString()
    },
    configuration: {
      licenseServerUrl: LICENSE_SERVER_URL,
      hasApiKey: !!LICENSE_SERVER_API_KEY,
      cacheTTL: CACHE_TTL,
      offlineGracePeriod: OFFLINE_GRACE_PERIOD,
      maxRetryAttempts: MAX_RETRY_ATTEMPTS,
      retryBaseDelay: RETRY_BASE_DELAY,
      retryMaxDelay: RETRY_MAX_DELAY
    }
  };
}

/**
 * Clear license validation cache (useful for testing)
 */
export async function clearLicenseValidationCache() {
  try {
    // Clear Redis cache
    await redisService.delPattern('license:*');
    logger.debug('Redis license cache cleared');
  } catch (error) {
    logger.warn('Failed to clear Redis license cache', { error: error.message });
  }

  // Clear memory cache
  const memorySize = memoryCache.size;
  memoryCache.clear();
  machineIdCache.clear();
  
  logger.debug('License validation cache cleared', { 
    memoryCacheCleared: memorySize,
    machineIdCacheCleared: true
  });
}

/**
 * Manually trigger background validation (useful for testing)
 */
export async function triggerBackgroundValidation() {
  logger.info('Manually triggering background license validation');
  await runBackgroundValidation();
  return backgroundValidationStatus;
}

// Initialize background validation service
initializeBackgroundValidation();

export default {
  validateLicense,
  requireFeature,
  requireModuleLicense,
  getLicenseValidationStats,
  clearLicenseValidationCache,
  triggerBackgroundValidation
};