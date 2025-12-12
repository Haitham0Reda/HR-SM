/**
 * Error Handling Middleware
 * 
 * Provides centralized error handling for the application
 * - Handles 404 Not Found errors
 * - Handles operational and programming errors
 * - Logs errors appropriately
 * - Sends consistent error responses
 */

import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../utils/constants.js';

/**
 * 404 Not Found Handler
 * Catches requests to undefined routes
 */
export const notFound = (req, res, next) => {
    logger.warn(`404 Not Found - ${req.originalUrl}`, {
        method: req.method,
        ip: req.ip
    });
    
    next(new AppError(`Not Found - ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND));
};

/**
 * Global Error Handler
 * Handles all errors passed to next()
 */
export const errorHandler = (err, req, res, next) => {
    // Default to 500 if no status code is set
    let statusCode = err.statusCode || res.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    if (statusCode === 200) statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;

    // Log error details
    logger.error(err.message, {
        statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        stack: err.stack,
        isOperational: err.isOperational
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
        // Mongoose validation error
        statusCode = HTTP_STATUS.BAD_REQUEST;
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        
        return res.status(statusCode).json({
            success: false,
            message: ERROR_MESSAGES.VALIDATION_ERROR,
            errors
        });
    }

    if (err.name === 'CastError') {
        // Mongoose cast error (invalid ObjectId)
        statusCode = HTTP_STATUS.BAD_REQUEST;
        return res.status(statusCode).json({
            success: false,
            message: `Invalid ${err.path}: ${err.value}`
        });
    }

    if (err.code === 11000) {
        // Mongoose duplicate key error
        statusCode = HTTP_STATUS.CONFLICT;
        const field = Object.keys(err.keyPattern)[0];
        return res.status(statusCode).json({
            success: false,
            message: `${field} already exists`
        });
    }

    if (err.name === 'JsonWebTokenError') {
        // JWT error
        statusCode = HTTP_STATUS.UNAUTHORIZED;
        return res.status(statusCode).json({
            success: false,
            message: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        // JWT expired
        statusCode = HTTP_STATUS.UNAUTHORIZED;
        return res.status(statusCode).json({
            success: false,
            message: ERROR_MESSAGES.TOKEN_EXPIRED
        });
    }

    // Send error response
    const response = {
        success: false,
        message: err.message || ERROR_MESSAGES.SERVER_ERROR,
    };

    // Include additional error details if available
    if (err.errors) {
        response.errors = err.errors;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

/**
 * Async Error Handler
 * Wraps async functions to catch errors automatically
 */
export const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default {
    notFound,
    errorHandler,
    catchAsync
};
