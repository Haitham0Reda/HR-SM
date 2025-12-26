import jwt from 'jsonwebtoken';
import PlatformUser from '../models/PlatformUser.js';
import logger from '../../utils/logger.js';

/**
 * Platform Authentication Middleware
 * Authenticates platform users (admins) for platform management operations
 */

/**
 * Authenticate platform user from JWT token
 */
export const authenticatePlatformUser = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);
    
    // Check if it's a platform user token
    if (decoded.type !== 'platform') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token type.'
      });
    }

    // Get user from database
    const user = await PlatformUser.findById(decoded.userId).select('+permissions');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User account is not active.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Add user to request
    req.platformUser = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token expired.'
      });
    }

    logger.error('Platform authentication error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

/**
 * Generate platform user JWT token
 * @param {Object} user - Platform user object
 * @returns {string} JWT token
 */
export const generatePlatformToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    type: 'platform'
  };

  return jwt.sign(payload, process.env.PLATFORM_JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require authentication
 */
export const optionalPlatformAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.PLATFORM_JWT_SECRET);
    
    if (decoded.type === 'platform') {
      const user = await PlatformUser.findById(decoded.userId).select('+permissions');
      if (user && user.status === 'active') {
        req.platformUser = user;
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
};

export default {
  authenticatePlatformUser,
  generatePlatformToken,
  optionalPlatformAuth
};