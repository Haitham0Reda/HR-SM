/**
 * Custom Application Error Class
 * 
 * Extends the native Error class with additional properties
 * Provides consistent error handling across the application
 * 
 * Usage:
 * throw new AppError('User not found', 404);
 * throw new AppError('Validation failed', 400, validationErrors);
 */

class AppError extends Error {
    /**
     * Create an application error
     * 
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} errors - Additional error details (optional)
     */
    constructor(message, statusCode = 500, errors = null) {
        super(message);
        
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.errors = errors;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
