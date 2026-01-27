import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Custom error class for License Server communication errors
 */
class LicenseServerError extends Error {
  constructor(message, originalError = null, statusCode = null) {
    super(message);
    this.name = 'LicenseServerError';
    this.originalError = originalError;
    this.statusCode = statusCode;
    this.timestamp = new Date();
  }
}

/**
 * License Server Client
 * Handles communication with the License Server API for tenant metadata
 * 
 * This client is used by the main backend to query tenant information,
 * enabled modules, and subscription status from the centralized License Server.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.6
 */
class LicenseServerClient {
  /**
   * Create a new License Server client
   * @param {string} baseUrl - Base URL of the License Server (e.g., 'http://localhost:4000')
   * @param {string} apiKey - API key for authentication
   * @param {object} options - Additional configuration options
   */
  constructor(baseUrl, apiKey, options = {}) {
    if (!baseUrl) {
      throw new Error('License Server base URL is required');
    }
    
    if (!apiKey) {
      throw new Error('License Server API key is required');
    }

    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    
    // Configuration options
    this.timeout = options.timeout || 5000; // 5 seconds default
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
    
    // Create axios instance with default configuration
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'HRMS-Main-Backend/1.0'
      }
    });

    // Add request interceptor for comprehensive API logging
    // Requirement: 9.5 - Log all License Server API calls for audit purposes
    this.httpClient.interceptors.request.use(
      (config) => {
        // Add request timestamp for duration tracking
        config.metadata = { startTime: Date.now() };
        
        // Log API request with full details for audit
        logger.info('License Server API Request', {
          type: 'api_request',
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          fullUrl: `${config.baseURL}${config.url}`,
          hasData: !!config.data,
          dataSize: config.data ? JSON.stringify(config.data).length : 0,
          timestamp: new Date().toISOString(),
          userAgent: config.headers['User-Agent']
        });
        
        return config;
      },
      (error) => {
        logger.error('License Server request interceptor error', {
          type: 'api_request_error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for comprehensive API logging
    // Requirement: 9.5 - Include request details and response status for audit
    this.httpClient.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const duration = response.config.metadata?.startTime 
          ? Date.now() - response.config.metadata.startTime 
          : null;
        
        // Log successful API response with full details for audit
        logger.info('License Server API Response', {
          type: 'api_response',
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          fullUrl: `${response.config.baseURL}${response.config.url}`,
          status: response.status,
          statusText: response.statusText,
          duration: duration ? `${duration}ms` : 'unknown',
          responseSize: response.data ? JSON.stringify(response.data).length : 0,
          success: response.data?.success,
          timestamp: new Date().toISOString()
        });
        
        return response;
      },
      (error) => {
        // Calculate request duration even for errors
        const duration = error.config?.metadata?.startTime 
          ? Date.now() - error.config.metadata.startTime 
          : null;
        
        // Log failed API response with full details for audit
        logger.error('License Server API Error', {
          type: 'api_error',
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          fullUrl: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
          status: error.response?.status,
          statusText: error.response?.statusText,
          duration: duration ? `${duration}ms` : 'unknown',
          errorMessage: error.message,
          errorCode: error.code,
          responseData: error.response?.data,
          timestamp: new Date().toISOString()
        });
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get tenant information from License Server
   * 
   * @param {string} tenantId - The tenant identifier
   * @returns {Promise<object>} Tenant data including subscription and modules
   * @throws {LicenseServerError} If the request fails
   * 
   * Requirements: 4.1
   */
  async getTenant(tenantId) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    try {
      const response = await this._makeRequest('GET', `/api/tenants/${tenantId}`);
      
      if (!response.data || !response.data.data) {
        throw new LicenseServerError(
          'Invalid response format from License Server',
          null,
          response.status
        );
      }

      logger.info('Successfully retrieved tenant from License Server', {
        type: 'tenant_retrieval',
        tenantId,
        status: response.data.data.subscription?.status,
        enabledModules: response.data.data.enabledModules?.length || 0,
        timestamp: new Date().toISOString()
      });

      return response.data.data;
    } catch (error) {
      throw this._handleError('Failed to fetch tenant', error, tenantId);
    }
  }

  /**
   * Get enabled modules for a tenant
   * 
   * @param {string} tenantId - The tenant identifier
   * @returns {Promise<string[]>} Array of enabled module IDs
   * @throws {LicenseServerError} If the request fails
   * 
   * Requirements: 4.2
   */
  async getEnabledModules(tenantId) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    try {
      const response = await this._makeRequest('GET', `/api/tenants/${tenantId}/modules`);
      
      if (!response.data || !response.data.data) {
        throw new LicenseServerError(
          'Invalid response format from License Server',
          null,
          response.status
        );
      }

      const modules = response.data.data.modules || [];

      logger.info('Successfully retrieved enabled modules from License Server', {
        type: 'modules_retrieval',
        tenantId,
        moduleCount: modules.length,
        modules,
        timestamp: new Date().toISOString()
      });

      return modules;
    } catch (error) {
      throw this._handleError('Failed to fetch enabled modules', error, tenantId);
    }
  }

  /**
   * Validate license and get tenant information
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {string} licenseKey - The license key to validate
   * @returns {Promise<object>} Validation result with tenant data
   * @throws {LicenseServerError} If the request fails
   * 
   * Requirements: 4.3
   */
  async validateLicense(tenantId, licenseKey) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    
    if (!licenseKey) {
      throw new Error('License key is required');
    }

    try {
      const response = await this._makeRequest('POST', '/api/validate', {
        tenantId,
        licenseKey,
        timestamp: new Date().toISOString()
      });
      
      if (!response.data || !response.data.data) {
        throw new LicenseServerError(
          'Invalid response format from License Server',
          null,
          response.status
        );
      }

      logger.info('Successfully validated license with License Server', {
        type: 'license_validation',
        tenantId,
        valid: response.data.data.valid,
        timestamp: new Date().toISOString()
      });

      return response.data.data;
    } catch (error) {
      throw this._handleError('License validation failed', error, tenantId);
    }
  }

  /**
   * Check if a specific module is enabled for a tenant
   * 
   * @param {string} tenantId - The tenant identifier
   * @param {string} moduleId - The module identifier to check
   * @returns {Promise<boolean>} True if module is enabled, false otherwise
   * @throws {LicenseServerError} If the request fails
   * 
   * Requirements: 4.2
   */
  async isModuleEnabled(tenantId, moduleId) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    
    if (!moduleId) {
      throw new Error('Module ID is required');
    }

    try {
      const modules = await this.getEnabledModules(tenantId);
      const isEnabled = modules.includes(moduleId);

      logger.debug('Module enablement check', {
        type: 'module_check',
        tenantId,
        moduleId,
        isEnabled,
        timestamp: new Date().toISOString()
      });

      return isEnabled;
    } catch (error) {
      throw this._handleError('Failed to check module enablement', error, tenantId);
    }
  }

  /**
   * Get subscription details for a tenant
   * 
   * @param {string} tenantId - The tenant identifier
   * @returns {Promise<object>} Subscription details
   * @throws {LicenseServerError} If the request fails
   * 
   * Requirements: 4.1
   */
  async getSubscription(tenantId) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    try {
      const tenant = await this.getTenant(tenantId);
      
      if (!tenant.subscription) {
        throw new LicenseServerError(
          'Subscription data not found in tenant response',
          null,
          null
        );
      }

      logger.debug('Retrieved subscription details', {
        type: 'subscription_retrieval',
        tenantId,
        status: tenant.subscription.status,
        plan: tenant.subscription.plan,
        timestamp: new Date().toISOString()
      });

      return tenant.subscription;
    } catch (error) {
      throw this._handleError('Failed to fetch subscription', error, tenantId);
    }
  }

  /**
   * Make an HTTP request with retry logic
   * 
   * @private
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} url - Request URL path
   * @param {object} data - Request body data (for POST/PUT)
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<object>} Axios response object
   * @throws {Error} If all retries fail
   * 
   * Requirements: 4.6
   */
  async _makeRequest(method, url, data = null, retryCount = 0) {
    try {
      const config = {
        method,
        url
      };

      if (data) {
        config.data = data;
      }

      const response = await this.httpClient.request(config);
      return response;
    } catch (error) {
      // Check if we should retry
      if (this._shouldRetry(error) && retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        
        logger.warn('License Server request failed, retrying', {
          type: 'api_retry',
          method,
          url,
          retryCount: retryCount + 1,
          maxRetries: this.maxRetries,
          delayMs: delay,
          error: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString()
        });

        await this._sleep(delay);
        return this._makeRequest(method, url, data, retryCount + 1);
      }

      // All retries exhausted or non-retryable error
      throw error;
    }
  }

  /**
   * Determine if an error is retryable
   * 
   * @private
   * @param {Error} error - The error to check
   * @returns {boolean} True if the error is retryable
   * 
   * Requirements: 4.6
   */
  _shouldRetry(error) {
    // Retry on network errors
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET') {
      return true;
    }

    // Retry on timeout errors
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      return true;
    }

    // Retry on 5xx server errors
    if (error.response && error.response.status >= 500) {
      return true;
    }

    // Retry on 429 (Too Many Requests)
    if (error.response && error.response.status === 429) {
      return true;
    }

    // Don't retry on 4xx client errors (except 429)
    return false;
  }

  /**
   * Handle and transform errors into LicenseServerError
   * 
   * @private
   * @param {string} message - Error message
   * @param {Error} error - Original error
   * @param {string} tenantId - Tenant ID for context
   * @returns {LicenseServerError} Transformed error
   * 
   * Requirements: 4.6
   */
  _handleError(message, error, tenantId = null) {
    let statusCode = null;
    let errorMessage = message;

    if (error instanceof LicenseServerError) {
      // Already a LicenseServerError, just re-throw
      return error;
    }

    if (error.response) {
      // Server responded with error status
      statusCode = error.response.status;
      const serverMessage = error.response.data?.error?.message || 
                           error.response.data?.message ||
                           error.response.statusText;
      
      errorMessage = `${message}: ${serverMessage}`;

      logger.error('License Server HTTP error', {
        type: 'http_error',
        tenantId,
        status: statusCode,
        message: serverMessage,
        url: error.config?.url,
        timestamp: new Date().toISOString()
      });
    } else if (error.request) {
      // Request made but no response received (network error)
      errorMessage = `${message}: License Server unreachable`;
      
      logger.error('License Server network error', {
        type: 'network_error',
        tenantId,
        error: error.message,
        code: error.code,
        url: error.config?.url,
        timestamp: new Date().toISOString()
      });
    } else {
      // Error in request setup
      errorMessage = `${message}: ${error.message}`;
      
      logger.error('License Server request error', {
        type: 'request_error',
        tenantId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return new LicenseServerError(errorMessage, error, statusCode);
  }

  /**
   * Sleep for specified milliseconds
   * 
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to License Server
   * 
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      // Try to make a simple request to test connectivity
      await this.httpClient.get('/health');
      logger.info('License Server connection test successful', {
        type: 'connection_test',
        baseUrl: this.baseUrl,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      logger.error('License Server connection test failed', {
        type: 'connection_test_failed',
        error: error.message,
        baseUrl: this.baseUrl,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
}

// Export the class and error
export { LicenseServerClient, LicenseServerError };
export default LicenseServerClient;
