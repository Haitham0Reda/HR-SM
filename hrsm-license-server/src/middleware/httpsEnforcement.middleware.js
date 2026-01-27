/**
 * HTTPS Enforcement Middleware for License Server
 * 
 * Redirects HTTP requests to HTTPS and validates SSL certificates
 * Ensures all sensitive tenant data is transmitted over encrypted connections
 * 
 * Requirement: 8.5 - Use encrypted connections (HTTPS) for sensitive data
 */

/**
 * Enforce HTTPS for all requests
 * Redirects HTTP requests to HTTPS in production
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Enable HTTPS enforcement (default: true in production)
 * @param {boolean} options.trustProxy - Trust X-Forwarded-Proto header (default: true)
 * @param {Array<string>} options.excludePaths - Paths to exclude from HTTPS enforcement (e.g., health checks)
 * @returns {Function} Express middleware function
 */
export const enforceHTTPS = (options = {}) => {
    const {
        enabled = process.env.NODE_ENV === 'production',
        trustProxy = true,
        excludePaths = ['/health', '/health/live', '/health/ready']
    } = options;
    
    return (req, res, next) => {
        // Skip enforcement if disabled (e.g., in development)
        if (!enabled) {
            return next();
        }
        
        // Skip enforcement for excluded paths (e.g., health checks)
        if (excludePaths.some(path => req.path.startsWith(path))) {
            return next();
        }
        
        // Determine if request is secure
        let isSecure = req.secure;
        
        // Trust proxy headers if configured (for load balancers, reverse proxies)
        if (trustProxy) {
            const forwardedProto = req.headers['x-forwarded-proto'];
            if (forwardedProto) {
                isSecure = forwardedProto === 'https';
            }
        }
        
        // Redirect to HTTPS if not secure
        if (!isSecure) {
            const httpsUrl = `https://${req.hostname}${req.url}`;
            
            console.warn(`⚠️  HTTP request detected, redirecting to HTTPS: ${req.method} ${req.url}`);
            console.warn(`   From IP: ${req.ip}`);
            
            // Use 301 (permanent redirect) for GET/HEAD, 307 (temporary redirect) for others
            const statusCode = ['GET', 'HEAD'].includes(req.method) ? 301 : 307;
            
            return res.redirect(statusCode, httpsUrl);
        }
        
        next();
    };
};

/**
 * Set security headers for HTTPS
 * Adds Strict-Transport-Security and other security headers
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.maxAge - HSTS max age in seconds (default: 1 year)
 * @param {boolean} options.includeSubDomains - Include subdomains in HSTS (default: true)
 * @param {boolean} options.preload - Enable HSTS preload (default: true)
 * @returns {Function} Express middleware function
 */
export const setSecurityHeaders = (options = {}) => {
    const {
        maxAge = 31536000, // 1 year in seconds
        includeSubDomains = true,
        preload = true
    } = options;
    
    return (req, res, next) => {
        // Only set HSTS header for HTTPS requests
        if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
            let hstsValue = `max-age=${maxAge}`;
            
            if (includeSubDomains) {
                hstsValue += '; includeSubDomains';
            }
            
            if (preload) {
                hstsValue += '; preload';
            }
            
            res.setHeader('Strict-Transport-Security', hstsValue);
        }
        
        // Additional security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        next();
    };
};

/**
 * Validate SSL/TLS certificate (for client certificates if needed)
 * This is typically handled by the web server (nginx, Apache) or load balancer
 * But can be used for additional validation in Node.js
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireClientCert - Require client certificate (default: false)
 * @returns {Function} Express middleware function
 */
export const validateSSLCertificate = (options = {}) => {
    const {
        requireClientCert = false
    } = options;
    
    return (req, res, next) => {
        // Check if client certificate is required
        if (requireClientCert) {
            const clientCert = req.socket.getPeerCertificate();
            
            if (!clientCert || Object.keys(clientCert).length === 0) {
                console.warn(`❌ Client certificate required but not provided from IP: ${req.ip}`);
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'CLIENT_CERTIFICATE_REQUIRED',
                        message: 'Client SSL certificate required for this endpoint',
                        statusCode: 401
                    }
                });
            }
            
            // Validate certificate (basic validation)
            if (!clientCert.subject || !clientCert.issuer) {
                console.warn(`❌ Invalid client certificate from IP: ${req.ip}`);
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'INVALID_CLIENT_CERTIFICATE',
                        message: 'Invalid client SSL certificate',
                        statusCode: 401
                    }
                });
            }
            
            // Attach certificate info to request
            req.clientCert = {
                subject: clientCert.subject,
                issuer: clientCert.issuer,
                valid_from: clientCert.valid_from,
                valid_to: clientCert.valid_to,
                fingerprint: clientCert.fingerprint
            };
            
            console.log(`✅ Client certificate validated: ${clientCert.subject.CN}`);
        }
        
        next();
    };
};

/**
 * Check if request is using HTTPS
 * Utility function to check if a request is secure
 * 
 * @param {Object} req - Express request object
 * @param {boolean} trustProxy - Trust X-Forwarded-Proto header
 * @returns {boolean} - True if request is using HTTPS
 */
export const isHTTPS = (req, trustProxy = true) => {
    if (req.secure) {
        return true;
    }
    
    if (trustProxy && req.headers['x-forwarded-proto'] === 'https') {
        return true;
    }
    
    return false;
};

/**
 * Log HTTPS status for monitoring
 * 
 * @returns {Function} Express middleware function
 */
export const logHTTPSStatus = () => {
    return (req, res, next) => {
        const protocol = isHTTPS(req) ? 'HTTPS' : 'HTTP';
        console.log(`🔒 ${protocol} request: ${req.method} ${req.path} from ${req.ip}`);
        next();
    };
};

export default {
    enforceHTTPS,
    setSecurityHeaders,
    validateSSLCertificate,
    isHTTPS,
    logHTTPSStatus
};
