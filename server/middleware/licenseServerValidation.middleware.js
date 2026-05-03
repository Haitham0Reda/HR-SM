/**
 * License Server Validation Middleware
 * Validates licenses by calling the standalone license server microservice
 * with Redis caching and circuit breaker pattern
 */

import axios from 'axios';
import redisService from '../core/services/redis.service.js';
import logger from '../utils/logger.js';

// Circuit breaker state
const circuitBreaker = {
  failures: 0,
  lastFailureTime: null,
  isOpen: false,
  threshold: 5,
  timeout: 60000, // 60 seconds
  
  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.isOpen = true;
      logger.warn('Circuit breaker opened - license server unreachable', {
        failures: this.failures,
        threshold: this.threshold
      });
    }
  },
  
  recordSuccess() {
    this.failures = 0;
    this.isOpen = false;
    this.lastFailureTime = null;
  },
  
  shouldAttemptCall() {
    if (!this.isOpen) {
      return true;
    }
    
    // Check if timeout has elapsed
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    if (timeSinceLastFailure >= this.timeout) {
      logger.info('Circuit breaker attempting to close - timeout elapsed');
      this.isOpen = false;
      this.failures = 0;
      return true;
    }
    
    return false;
  },
  
  getStatus() {
    return {
      isOpen: this.isOpen,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      threshold: this.threshold,
      timeout: this.timeout
    };
  }
};

/**
 * Get license key for tenant from database
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<string|null>} License key or null
 */
async function getLicenseKeyForTenant(tenantId) {
  try {
    // Import dynamically to avoid circular dependencies
    const { platformDb } = await import('../config/database.js');
    
    const [results] = await platformDb.query(
      'SELECT license_key FROM companies WHERE id = ? LIMIT 1',
      [tenantId]
    );
    
    if (results && results.length > 0 && results[0].license_key) {
      return results[0].license_key;
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to get license key for tenant', {
      tenantId,
      error: error.message
    });
    return null;
  }
}

/**
 * Validate license with the license server
 * @param {string} licenseKey - License key to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateWithLicenseServer(licenseKey) {
  const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
  const timeout = parseInt(process.env.LICENSE_SERVER_TIMEOUT) || 5000;
  
  try {
    const response = await axios.get(
      `${licenseServerUrl}/licenses/${encodeURIComponent(licenseKey)}/validate`,
      {
        timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      throw new Error('LICENSE_SERVER_UNREACHABLE');
    }
    
    if (error.response) {
      // Server responded with error status
      return error.response.data;
    }
    
    throw error;
  }
}

/**
 * License validation middleware
 * Validates tenant licenses by calling the standalone license server
 * with Redis caching and circuit breaker pattern
 */
export const validateLicense = async (req, res, next) => {
  try {
    // Skip license validation for certain paths
    const skipPaths = [
      '/health',
      '/metrics',
      '/auth/login',
      '/auth/logout',
      '/auth/refresh',
      '/test'
    ];
    
    if (skipPaths.some(path => req.path.includes(path))) {
      return next();
    }
    
    // Get tenant ID from request
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || req.query.tenantId;
    
    if (!tenantId) {
      // No tenant ID - skip validation (might be platform admin route)
      return next();
    }
    
    // Check Redis cache first (TTL: 5 minutes)
    const cacheKey = `license:${tenantId}`;
    const cachedValidation = await redisService.get(cacheKey);
    
    if (cachedValidation) {
      logger.debug('License validation cache hit', {
        tenantId,
        cacheKey
      });
      
      // Check if cached license is valid
      if (!cachedValidation.valid) {
        return res.status(402).json({
          success: false,
          error: 'License invalid or expired',
          code: 'LICENSE_INVALID',
          reason: cachedValidation.reason || 'License validation failed',
          expiresAt: cachedValidation.expiresAt
        });
      }
      
      // Attach license features to request
      req.licenseFeatures = cachedValidation.features || [];
      req.licenseValidation = {
        ...cachedValidation,
        cached: true
      };
      
      return next();
    }
    
    // Cache miss - need to validate with license server
    logger.debug('License validation cache miss', {
      tenantId,
      cacheKey
    });
    
    // Check circuit breaker
    if (!circuitBreaker.shouldAttemptCall()) {
      logger.warn('Circuit breaker open - failing open', {
        tenantId,
        circuitBreakerStatus: circuitBreaker.getStatus()
      });
      
      // Fail-open: allow request to continue without feature enforcement
      req.licenseFeatures = [];
      req.licenseValidation = {
        valid: true,
        failedOpen: true,
        reason: 'License server unreachable - circuit breaker open'
      };
      
      return next();
    }
    
    // Get license key for tenant
    const licenseKey = await getLicenseKeyForTenant(tenantId);
    
    if (!licenseKey) {
      logger.warn('No license key found for tenant', { tenantId });
      
      return res.status(402).json({
        success: false,
        error: 'License invalid or expired',
        code: 'LICENSE_INVALID',
        reason: 'No license key configured for tenant'
      });
    }
    
    // Call license server
    try {
      const validation = await validateWithLicenseServer(licenseKey);
      
      // Record success in circuit breaker
      circuitBreaker.recordSuccess();
      
      // Cache the validation result (TTL: 5 minutes = 300 seconds)
      await redisService.set(cacheKey, validation, 300);
      
      logger.info('License validated with license server', {
        tenantId,
        valid: validation.valid,
        features: validation.features?.length || 0
      });
      
      // Check if license is valid
      if (!validation.valid) {
        return res.status(402).json({
          success: false,
          error: 'License invalid or expired',
          code: 'LICENSE_INVALID',
          reason: validation.reason || 'License validation failed',
          expiresAt: validation.expiresAt
        });
      }
      
      // Attach license features to request
      req.licenseFeatures = validation.features || [];
      req.licenseValidation = {
        ...validation,
        cached: false
      };
      
      return next();
      
    } catch (error) {
      if (error.message === 'LICENSE_SERVER_UNREACHABLE') {
        // Record failure in circuit breaker
        circuitBreaker.recordFailure();
        
        logger.warn('License server unreachable - failing open', {
          tenantId,
          error: error.message,
          circuitBreakerStatus: circuitBreaker.getStatus()
        });
        
        // Fail-open: allow request to continue without feature enforcement
        req.licenseFeatures = [];
        req.licenseValidation = {
          valid: true,
          failedOpen: true,
          reason: 'License server unreachable'
        };
        
        return next();
      }
      
      // Other errors - log and fail-open
      logger.error('License validation error - failing open', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      
      req.licenseFeatures = [];
      req.licenseValidation = {
        valid: true,
        failedOpen: true,
        reason: 'License validation error'
      };
      
      return next();
    }
    
  } catch (error) {
    // Unexpected error - log and fail-open
    logger.error('License middleware unexpected error - failing open', {
      error: error.message,
      stack: error.stack,
      path: req.path
    });
    
    req.licenseFeatures = [];
    req.licenseValidation = {
      valid: true,
      failedOpen: true,
      reason: 'Unexpected error'
    };
    
    return next();
  }
};

/**
 * Require specific feature to be licensed
 * Use this middleware after validateLicense to enforce feature access
 */
export const requireFeature = (featureName) => {
  return (req, res, next) => {
    // If license validation failed open, allow access
    if (req.licenseValidation?.failedOpen) {
      logger.debug('Feature check skipped - license validation failed open', {
        feature: featureName
      });
      return next();
    }
    
    // Check if feature is in licensed features
    const hasFeature = req.licenseFeatures?.includes(featureName);
    
    if (!hasFeature) {
      logger.warn('Feature not licensed', {
        feature: featureName,
        tenantId: req.user?.tenantId,
        licensedFeatures: req.licenseFeatures
      });
      
      return res.status(403).json({
        success: false,
        error: `Feature '${featureName}' is not licensed`,
        code: 'FEATURE_NOT_LICENSED',
        feature: featureName
      });
    }
    
    next();
  };
};

/**
 * Require any of the specified features to be licensed
 */
export const requireAnyFeature = (featureNames) => {
  return (req, res, next) => {
    // If license validation failed open, allow access
    if (req.licenseValidation?.failedOpen) {
      return next();
    }
    
    // Check if any feature is in licensed features
    const hasAnyFeature = featureNames.some(feature => 
      req.licenseFeatures?.includes(feature)
    );
    
    if (!hasAnyFeature) {
      logger.warn('None of required features are licensed', {
        requiredFeatures: featureNames,
        tenantId: req.user?.tenantId,
        licensedFeatures: req.licenseFeatures
      });
      
      return res.status(403).json({
        success: false,
        error: `None of the required features are licensed: ${featureNames.join(', ')}`,
        code: 'FEATURES_NOT_LICENSED',
        requiredFeatures: featureNames
      });
    }
    
    next();
  };
};

/**
 * Get circuit breaker status (for monitoring/debugging)
 */
export const getCircuitBreakerStatus = () => {
  return circuitBreaker.getStatus();
};

/**
 * Reset circuit breaker (for testing/admin purposes)
 */
export const resetCircuitBreaker = () => {
  circuitBreaker.failures = 0;
  circuitBreaker.lastFailureTime = null;
  circuitBreaker.isOpen = false;
  logger.info('Circuit breaker manually reset');
};

export default {
  validateLicense,
  requireFeature,
  requireAnyFeature,
  getCircuitBreakerStatus,
  resetCircuitBreaker
};
