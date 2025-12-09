/**
 * Centralized Error Handler Middleware
 * 
 * Provides consistent error handling across platform, tenant, and module layers
 * - Handles operational and programming errors
 * - Logs errors with appropriate context
 * - Sends consistent error responses
 * - Prevents data leakage across tenants
 */

import logger from '../../utils/logger.js';
import AppError from './AppError.js';
import { ERROR_TYPES } from './errorTypes.js';

/**
 * 404 Not Found Handler
 * Catches requests to undefined routes
 */
export const notFound = (req, res, next) => {
    logger.warn(`404 Not Found - ${req.originalUrl}`, {
        method: req.method,
        ip: req.ip,
        tenantId: req.tenant?.id
    });
    
    next(new AppError(
        `Not Found - ${req.originalUrl}`,
        404,
        ERROR_TYPES.NOT_FOUND
    ));
};

/**
 * Global Error Handler
 * Handles all errors passed to next()
 */
export const errorHandler = (err, req, res, next) => {
    // Default to 500 if no status code is set
    let statusCode = err.statusCode || res.statusCode || 500;
    if (statusCode === 200) statusCode = 500;

    // Determine error code
    const errorCode = err.code || ERROR_TYPES.INTERNAL_SERVER_ERROR;

    // Log error with context (tenant-aware)
    logger.error(err.message, {
        statusCode,
        code: errorCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        tenantId: req.tenant?.id,
        userId: req.user?.id,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        isOperational: err.isOperational,
        details: err.details
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
        // Mongoose validation error
        statusCode = 400;
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        
        return res.status(statusCode).json({
            success: false,
            error: {
                code: ERROR_TYPES.VALIDATION_ERROR,
                message: 'Validation failed',
                details: { errors }
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id,
                path: req.path,
                method: req.method
            }
        });
    }

    if (err.name === 'CastError') {
        // Mongoose cast error (invalid ObjectId)
        statusCode = 400;
        return res.status(statusCode).json({
            success: false,
            error: {
                code: ERROR_TYPES.INVALID_INPUT,
                message: `Invalid ${err.path}: ${err.value}`,
                details: {}
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id,
                path: req.path,
                method: req.method
            }
        });
    }

    if (err.code === 11000) {
        // Mongoose duplicate key error
        statusCode = 409;
        const field = Object.keys(err.keyPattern)[0];
        return res.status(statusCode).json({
            success: false,
            error: {
                code: ERROR_TYPES.CONFLICT,
                message: `${field} already exists`,
                details: { field }
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id,
                path: req.path,
                method: req.method
            }
        });
    }

    if (err.name === 'JsonWebTokenError') {
        // JWT error
        statusCode = 401;
        return res.status(statusCode).json({
            success: false,
            error: {
                code: ERROR_TYPES.UNAUTHORIZED,
                message: 'Invalid token',
                details: {}
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id,
                path: req.path,
                method: req.method
            }
        });
    }

    if (err.name === 'TokenExpiredError') {
        // JWT expired
        statusCode = 401;
        return res.status(statusCode).json({
            success: false,
            error: {
                code: ERROR_TYPES.TOKEN_EXPIRED,
                message: 'Token has expired',
                details: {}
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id,
                path: req.path,
                method: req.method
            }
        });
    }

    // Send consistent error response
    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message: err.message || 'Internal server error',
            details: err.details || {}
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id,
            path: req.path,
            method: req.method
        }
    });
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
