/**
 * Tenant JWT Authentication
 * 
 * Handles JWT generation and verification for Tenant users
 * Uses separate JWT secret (TENANT_JWT_SECRET) for security isolation
 * Token expiration: 7 days (longer for user convenience)
 */

import jwt from 'jsonwebtoken';
import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';

/**
 * Generate Tenant JWT token
 * 
 * @param {string} userId - Tenant user ID
 * @param {string} tenantId - Tenant ID
 * @param {string} role - User role (Admin, HR, Manager, Employee)
 * @returns {string} JWT token
 */
export const generateTenantToken = (userId, tenantId, role) => {
    if (!process.env.TENANT_JWT_SECRET) {
        throw new AppError(
            'TENANT_JWT_SECRET is not configured',
            500,
            ERROR_TYPES.SYSTEM_CONFIGURATION_ERROR
        );
    }

    const token = jwt.sign(
        {
            userId,
            tenantId,
            role,
            type: 'tenant'
        },
        process.env.TENANT_JWT_SECRET,
        {
            expiresIn: '7d' // 7 days for tenant tokens
        }
    );

    return token;
};

/**
 * Verify Tenant JWT token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {AppError} If token is invalid or expired
 */
export const verifyTenantToken = (token) => {
    if (!process.env.TENANT_JWT_SECRET) {
        throw new AppError(
            'TENANT_JWT_SECRET is not configured',
            500,
            ERROR_TYPES.SYSTEM_CONFIGURATION_ERROR
        );
    }

    try {
        const decoded = jwt.verify(token, process.env.TENANT_JWT_SECRET);
        
        // Verify token type
        if (decoded.type !== 'tenant') {
            throw new AppError(
                'Invalid token type',
                401,
                ERROR_TYPES.INVALID_TENANT_TOKEN
            );
        }

        // Verify tenantId exists
        if (!decoded.tenantId) {
            throw new AppError(
                'Token missing tenantId',
                401,
                ERROR_TYPES.INVALID_TENANT_TOKEN
            );
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new AppError(
                'Tenant token has expired',
                401,
                ERROR_TYPES.TOKEN_EXPIRED
            );
        }
        
        if (error.name === 'JsonWebTokenError') {
            throw new AppError(
                'Invalid tenant token',
                401,
                ERROR_TYPES.INVALID_TENANT_TOKEN
            );
        }

        throw error;
    }
};

/**
 * Set Tenant JWT token in HTTP-only cookie
 * 
 * @param {Object} res - Express response object
 * @param {string} token - JWT token
 */
export const setTenantTokenCookie = (res, token) => {
    res.cookie('tenant_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });
};

/**
 * Clear Tenant JWT token cookie
 * 
 * @param {Object} res - Express response object
 */
export const clearTenantTokenCookie = (res) => {
    res.cookie('tenant_token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
};

export default {
    generateTenantToken,
    verifyTenantToken,
    setTenantTokenCookie,
    clearTenantTokenCookie
};
