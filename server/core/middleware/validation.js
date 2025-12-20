import { validationResult } from 'express-validator';
import { sendError } from '../utils/response.js';

/**
 * Validation middleware to handle express-validator results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value
        }));
        
        return sendError(res, 'Validation failed', 400, formattedErrors);
    }
    
    next();
};

export default {
    validateRequest
};