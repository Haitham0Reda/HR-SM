/**
 * Platform JWT Authentication
 * 
 * Handles JWT generation and verification for Platform administrators
 * Uses separate JWT secret (PLATFORM_JWT_SECRET) for security isolation
 * Token expiration: 4 hours (shorter for security)
 */

import jwt from 'jsonwebtoken';
import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';

/**
 * Generate Platform JWT token
 * 
 * @param {string} userId - Platform user ID
 * @param {string} role - Platform user role (super-admin, support, operations)
 * @returns {string} JWT token
 */
export const generatePlatformToken = (userId, role) => {
    if (!process.env.PLATFORM_JWT_SECRET) {
        throw new AppError(
            'PLATFORM_JWT_SECRET is not configured',
            500,
            ERROR_TYPES.SYSTEM_CONFIGURATION_ERROR
        );
    }

    const token = jwt.sign(
        {
            userId,
            role,
            type: 'platform'
        },
        process.env.PLATFORM_JWT_SECRET,
        {
            expiresIn: '4h' // 4 hours for platform tokens
        }
    );

    return token;
};

/**
 * Verify Platform JWT token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {AppError} If token is invalid or expired
 */
export const verifyPlatformToken = (token) => {
    if (!process.env.PLATFORM_JWT_SECRET) {
        throw new AppError(
            'PLATFORM_JWT_SECRET is not configured',
            500,
            ERROR_TYPES.SYSTEM_CONFIGURATION_ERROR
        );
    }

    try {
        const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);
        
        // Verify token type
        if (decoded.type !== 'platform') {
            throw new AppError(
                'Invalid token type',
                401,
                ERROR_TYPES.INVALID_PLATFORM_TOKEN
            );
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new AppError(
                'Platform token has expired',
                401,
                ERROR_TYPES.TOKEN_EXPIRED
            );
        }
        
        if (error.name === 'JsonWebTokenError') {
            throw new AppError(
                'Invalid platform token',
                401,
                ERROR_TYPES.INVALID_PLATFORM_TOKEN
            );
        }

        throw error;
    }
};

/**
 * Set Platform JWT token in HTTP-only cookie
 * 
 * @param {Object} res - Express response object
 * @param {string} token - JWT token
 */
export const setPlatformTokenCookie = (res, token) => {
    res.cookie('platform_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 4 * 60 * 60 * 1000 // 4 hours in milliseconds
    });
};

/**
 * Clear Platform JWT token cookie
 * 
 * @param {Object} res - Express response object
 */
export const clearPlatformTokenCookie = (res) => {
    res.cookie('platform_token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
};

export default {
    generatePlatformToken,
    verifyPlatformToken,
    setPlatformTokenCookie,
    clearPlatformTokenCookie
};
