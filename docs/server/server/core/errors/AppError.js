/**
 * Custom Application Error Class
 * 
 * Extends the native Error class with additional properties for enterprise SaaS architecture
 * Provides consistent error handling across platform, tenant, and module layers
 * 
 * Usage:
 * throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 * throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', { field: 'email' });
 */

class AppError extends Error {
    /**
     * Create an application error
     * 
     * @param {string} message - Human-readable error message
     * @param {number} statusCode - HTTP status code
     * @param {string} code - Error code constant (from errorTypes.js)
     * @param {Object} details - Additional error details (optional)
     */
    constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = {}) {
        super(message);
        
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.timestamp = new Date().toISOString();
        
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
