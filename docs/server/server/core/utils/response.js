/**
 * Response Helper Utility
 * 
 * Provides standardized API response formats
 * Ensures consistent response structure across all endpoints
 */

import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from './constants.js';

/**
 * Send success response
 * 
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, data = null, message = SUCCESS_MESSAGES.CREATED, statusCode = HTTP_STATUS.OK) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

/**
 * Send error response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} errors - Validation errors (optional)
 */
export const sendError = (res, message = ERROR_MESSAGES.SERVER_ERROR, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) => {
    const response = {
        success: false,
        message,
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * 
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 * @param {string} message - Success message
 */
export const sendPaginatedResponse = (res, data, page, limit, total, message = 'Data retrieved successfully') => {
    return res.status(HTTP_STATUS.OK).json({
        success: true,
        message,
        data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        },
    });
};

/**
 * Send created response
 * 
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource data
 * @param {string} message - Success message
 */
export const sendCreated = (res, data, message = SUCCESS_MESSAGES.CREATED) => {
    return sendSuccess(res, data, message, HTTP_STATUS.CREATED);
};

/**
 * Send not found response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const sendNotFound = (res, message = ERROR_MESSAGES.NOT_FOUND) => {
    return sendError(res, message, HTTP_STATUS.NOT_FOUND);
};

/**
 * Send unauthorized response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const sendUnauthorized = (res, message = ERROR_MESSAGES.UNAUTHORIZED) => {
    return sendError(res, message, HTTP_STATUS.UNAUTHORIZED);
};

/**
 * Send forbidden response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const sendForbidden = (res, message = ERROR_MESSAGES.FORBIDDEN) => {
    return sendError(res, message, HTTP_STATUS.FORBIDDEN);
};

/**
 * Send bad request response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors
 */
export const sendBadRequest = (res, message = ERROR_MESSAGES.VALIDATION_ERROR, errors = null) => {
    return sendError(res, message, HTTP_STATUS.BAD_REQUEST, errors);
};

/**
 * Send validation error response
 * 
 * @param {Object} res - Express response object
 * @param {Object} errors - Validation errors
 */
export const sendValidationError = (res, errors) => {
    return sendBadRequest(res, ERROR_MESSAGES.VALIDATION_ERROR, errors);
};

/**
 * Send server error response
 * 
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
export const sendServerError = (res, error) => {
    // Log error for debugging

    return sendError(
        res,
        process.env.NODE_ENV === 'production' 
            ? ERROR_MESSAGES.SERVER_ERROR 
            : error.message,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
};

export default {
    sendSuccess,
    sendError,
    sendPaginatedResponse,
    sendCreated,
    sendNotFound,
    sendUnauthorized,
    sendForbidden,
    sendBadRequest,
    sendValidationError,
    sendServerError,
};
