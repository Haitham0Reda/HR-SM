/**
 * Platform Authentication and Authorization Middleware
 * 
 * Provides authentication and authorization for platform administration endpoints
 * 
 * Requirements: 6.4, 9.1, 2.5
 */

import jwt from 'jsonwebtoken';
import PlatformUser from '../platform/models/PlatformUser.js';
import logger from '../utils/logger.js';
import platformLogger from '../utils/platformLogger.js';
import correlationIdService from '../services/correlationId.service.js';

/**
 * Authenticate platform user from JWT token
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticatePlatformUser = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No valid token provided.',
        correlationId: req.correlationId
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);
    
    // Check if it's a platform user token
    if (decoded.type !== 'platform') {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Invalid token type.',
        correlationId: req.correlationId
      });
    }

    // Get user from database
    const user = await PlatformUser.findById(decoded.userId).select('+permissions');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. User not found.',
        correlationId: req.correlationId
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Access denied. User account is not active.',
        correlationId: req.correlationId
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Add user to request
    req.platformUser = user;
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      type: 'platform',
      permissions: user.permissions || {}
    };

    // Add correlation ID if not present
    if (!req.correlationId) {
      req.correlationId = correlationIdService.generateCorrelationId();
    }

    // Log successful authentication
    platformLogger.platformSecurity('platform_user_authenticated', {
      correlationId: req.correlationId,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      endpoint: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();

  } catch (error) {
    // Log authentication failure
    platformLogger.platformSecurity('platform_authentication_failed', {
      error: error.message,
      endpoint: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      authHeader: req.headers.authorization ? 'present' : 'missing',
      correlationId: req.correlationId
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Invalid token.',
        correlationId: req.correlationId
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Token expired.',
        correlationId: req.correlationId
      });
    }

    logger.error('Platform authentication error', {
      error: error.message,
      stack: error.stack,
      correlationId: req.correlationId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication.',
      correlationId: req.correlationId
    });
  }
};

/**
 * Require platform admin privileges
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function requirePlatformAdmin(req, res, next) {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        correlationId: req.correlationId
      });
    }

    // Check if user has platform admin role
    const userRole = req.user.role;
    const allowedRoles = ['super_admin', 'platform_admin', 'admin'];
    
    if (!allowedRoles.includes(userRole)) {
      // Log the unauthorized access attempt
      platformLogger.platformSecurity('platform_admin_access_denied', {
        correlationId: req.correlationId,
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        endpoint: req.originalUrl,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        error: 'Platform admin privileges required',
        correlationId: req.correlationId
      });
    }

    // Log successful authorization
    platformLogger.platformSecurity('platform_admin_access_granted', {
      correlationId: req.correlationId,
      userId: req.user.id,
      userRole,
      endpoint: req.originalUrl,
      method: req.method,
      ipAddress: req.ip
    });

    next();

  } catch (error) {
    logger.error('Platform authorization error', {
      error: error.message,
      stack: error.stack,
      correlationId: req.correlationId
    });

    return res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      correlationId: req.correlationId
    });
  }
}

/**
 * Require super admin privileges
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function requireSuperAdmin(req, res, next) {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        correlationId: req.correlationId
      });
    }

    // Check if user has super admin role
    const userRole = req.user.role;
    
    if (userRole !== 'super_admin') {
      // Log the unauthorized access attempt
      platformLogger.platformSecurity('super_admin_access_denied', {
        correlationId: req.correlationId,
        userId: req.user.id,
        userRole,
        requiredRole: 'super_admin',
        endpoint: req.originalUrl,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        error: 'Super admin privileges required',
        correlationId: req.correlationId
      });
    }

    next();

  } catch (error) {
    logger.error('Super admin authorization error', {
      error: error.message,
      stack: error.stack,
      correlationId: req.correlationId
    });

    return res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      correlationId: req.correlationId
    });
  }
}

/**
 * Generate platform user JWT token
 * 
 * @param {Object} user - Platform user object
 * @returns {string} JWT token
 */
export const generatePlatformToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    type: 'platform',
    permissions: user.permissions || {}
  };

  return jwt.sign(payload, process.env.PLATFORM_JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'HRSM-Platform',
    subject: user._id.toString()
  });
};

/**
 * Optional platform authentication middleware
 * Adds user to request if token is valid, but doesn't require authentication
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalPlatformAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      if (!req.correlationId) {
        req.correlationId = correlationIdService.generateCorrelationId();
      }
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);
    
    if (decoded.type === 'platform') {
      const user = await PlatformUser.findById(decoded.userId).select('+permissions');
      if (user && user.status === 'active') {
        req.platformUser = user;
        req.user = {
          id: user._id,
          email: user.email,
          role: user.role,
          type: 'platform',
          permissions: user.permissions || {}
        };
      }
    }

    if (!req.correlationId) {
      req.correlationId = correlationIdService.generateCorrelationId();
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    req.user = null;
    if (!req.correlationId) {
      req.correlationId = correlationIdService.generateCorrelationId();
    }
    next();
  }
};

export default {
  authenticatePlatformUser,
  requirePlatformAdmin,
  requireSuperAdmin,
  generatePlatformToken,
  optionalPlatformAuth
};