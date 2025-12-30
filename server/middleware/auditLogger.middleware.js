import auditLoggerService from '../services/auditLogger.service.js';

/**
 * Audit Logger Middleware
 * Automatically logs HTTP requests and responses for audit purposes
 */

/**
 * Extract user information from request
 * @param {Object} req - Express request object
 * @returns {Object} User information
 */
const extractUserInfo = (req) => {
  return {
    userId: req.user?._id || req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    tenantId: req.tenantId || req.user?.tenantId
  };
};

/**
 * Determine audit category based on request
 * @param {Object} req - Express request object
 * @returns {string} Audit category
 */
const determineCategory = (req) => {
  const path = req.path.toLowerCase();
  
  if (path.includes('/auth/') || path.includes('/login') || path.includes('/logout')) {
    return 'authentication';
  }
  if (path.includes('/license')) {
    return 'license_management';
  }
  if (path.includes('/tenant') || path.includes('/company')) {
    return 'tenant_management';
  }
  if (path.includes('/module')) {
    return 'module_management';
  }
  if (path.includes('/security') || path.includes('/audit')) {
    return 'security';
  }
  if (path.includes('/system') || path.includes('/health') || path.includes('/metrics')) {
    return 'system_operation';
  }
  
  return 'data_modification';
};

/**
 * Determine audit severity based on request method and path
 * @param {Object} req - Express request object
 * @returns {string} Audit severity
 */
const determineSeverity = (req) => {
  const method = req.method.toUpperCase();
  const path = req.path.toLowerCase();
  
  // Critical operations
  if (path.includes('/license') && (method === 'POST' || method === 'DELETE')) {
    return 'critical';
  }
  if (path.includes('/revoke') || path.includes('/suspend') || path.includes('/delete')) {
    return 'critical';
  }
  
  // High severity operations
  if (method === 'DELETE' || path.includes('/admin') || path.includes('/security')) {
    return 'high';
  }
  if (method === 'POST' && (path.includes('/user') || path.includes('/tenant'))) {
    return 'high';
  }
  
  // Medium severity operations
  if (method === 'PUT' || method === 'PATCH' || method === 'POST') {
    return 'medium';
  }
  
  // Low severity operations (GET requests, etc.)
  return 'low';
};

/**
 * Extract resource information from request
 * @param {Object} req - Express request object
 * @returns {Object} Resource information
 */
const extractResourceInfo = (req) => {
  const pathParts = req.path.split('/').filter(part => part);
  
  // Try to extract resource type and ID from path
  let resource = 'unknown';
  let resourceId = null;
  
  if (pathParts.length >= 2) {
    resource = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
    
    // Check if last part looks like an ID
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && (lastPart.match(/^[0-9a-fA-F]{24}$/) || lastPart.match(/^\d+$/))) {
      resourceId = lastPart;
      resource = pathParts[pathParts.length - 2] || resource;
    }
  }
  
  // Override with specific resource types
  if (req.path.includes('/license')) resource = 'license';
  if (req.path.includes('/tenant') || req.path.includes('/company')) resource = 'tenant';
  if (req.path.includes('/user')) resource = 'user';
  if (req.path.includes('/module')) resource = 'module';
  if (req.path.includes('/auth')) resource = 'authentication';
  
  return { resource, resourceId };
};

/**
 * Main audit logging middleware
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware function
 */
export const auditLogger = (options = {}) => {
  const {
    skipPaths = ['/health', '/metrics', '/favicon.ico'],
    skipMethods = ['OPTIONS'],
    logSuccessOnly = false,
    includeRequestBody = false,
    includeResponseBody = false
  } = options;

  return async (req, res, next) => {
    // Skip certain paths and methods
    if (skipPaths.some(path => req.path.includes(path)) || 
        skipMethods.includes(req.method)) {
      return next();
    }

    const startTime = Date.now();
    const userInfo = extractUserInfo(req);
    const category = determineCategory(req);
    const severity = determineSeverity(req);
    const { resource, resourceId } = extractResourceInfo(req);

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseBody = null;
    let responseSize = 0;

    // Override response methods to capture response data
    res.send = function(body) {
      if (includeResponseBody && body) {
        responseBody = body;
        responseSize = Buffer.byteLength(body.toString());
      }
      return originalSend.call(this, body);
    };

    res.json = function(obj) {
      if (includeResponseBody && obj) {
        responseBody = obj;
        responseSize = Buffer.byteLength(JSON.stringify(obj));
      }
      return originalJson.call(this, obj);
    };

    // Handle response completion
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 400;
        const isError = statusCode >= 400;

        // Skip logging if configured to log success only and this is an error
        if (logSuccessOnly && isError) {
          return;
        }

        // Determine action based on HTTP method
        let action = 'read';
        switch (req.method.toUpperCase()) {
          case 'POST':
            action = resource === 'authentication' ? 'login' : 'create';
            break;
          case 'PUT':
          case 'PATCH':
            action = 'update';
            break;
          case 'DELETE':
            action = 'delete';
            break;
          case 'GET':
            action = 'read';
            break;
        }

        // Special handling for specific endpoints
        if (req.path.includes('/logout')) action = 'logout';
        if (req.path.includes('/export')) action = 'export';
        if (req.path.includes('/import')) action = 'import';
        if (req.path.includes('/license/validate')) action = 'license_validate';
        if (req.path.includes('/license/create')) action = 'license_create';
        if (req.path.includes('/license/renew')) action = 'license_renew';
        if (req.path.includes('/license/revoke')) action = 'license_revoke';

        // Prepare audit log data
        const auditData = {
          action,
          resource,
          resourceId,
          userId: userInfo.userId,
          tenantId: userInfo.tenantId || 'system', // Provide default tenantId for system operations
          category,
          severity: isError ? 'high' : severity,
          status: isSuccess ? 'success' : 'failure',
          errorMessage: isError ? `HTTP ${statusCode}` : null,
          errorCode: isError ? statusCode.toString() : null,
          module: req.path.split('/')[2] || 'unknown', // Extract module from path
          
          // Request/Response data
          changes: {
            request: {
              method: req.method,
              path: req.path,
              query: req.query,
              body: includeRequestBody ? req.body : undefined,
              headers: {
                'user-agent': req.get('User-Agent'),
                'content-type': req.get('Content-Type'),
                'content-length': req.get('Content-Length')
              }
            },
            response: {
              statusCode,
              size: responseSize,
              body: includeResponseBody ? responseBody : undefined
            }
          },
          
          // Performance metrics
          performance: {
            duration,
            memoryUsage: process.memoryUsage().heapUsed
          },
          
          // License information (if available)
          licenseInfo: req.licenseInfo ? {
            licenseNumber: req.licenseInfo.licenseNumber,
            tenantId: req.licenseInfo.tenantId || userInfo.tenantId,
            licenseType: req.licenseInfo.type
          } : (userInfo.tenantId ? { tenantId: userInfo.tenantId } : undefined),
          
          // Tags for categorization
          tags: [
            req.method.toLowerCase(),
            resource,
            category,
            isSuccess ? 'success' : 'failure'
          ],
          
          // Compliance flags
          complianceFlags: {
            gdpr: category === 'authentication' || category === 'tenant_management',
            sox: category === 'license_management' || severity === 'critical'
          }
        };

        // Create audit log
        await auditLoggerService.createAuditLog(auditData, req);

      } catch (error) {
        console.error('Audit logging error:', error);
        // Don't throw error to avoid breaking the request flow
      }
    });

    next();
  };
};

/**
 * Middleware specifically for license operations
 * @param {string} operation - License operation type
 * @returns {Function} Express middleware function
 */
export const auditLicenseOperation = (operation) => {
  return async (req, res, next) => {
    // Store operation type for later use
    req.licenseOperation = operation;
    
    // Continue with normal flow
    next();
  };
};

/**
 * Middleware for high-security operations
 * @returns {Function} Express middleware function
 */
export const auditSecurityOperation = () => {
  return auditLogger({
    skipPaths: [],
    skipMethods: [],
    logSuccessOnly: false,
    includeRequestBody: true,
    includeResponseBody: false
  });
};

/**
 * Middleware for system operations
 * @returns {Function} Express middleware function
 */
export const auditSystemOperation = () => {
  return auditLogger({
    skipPaths: ['/health'],
    skipMethods: ['OPTIONS'],
    logSuccessOnly: true,
    includeRequestBody: false,
    includeResponseBody: false
  });
};

export default auditLogger;