/**
 * Platform Authentication Middleware
 * 
 * Verifies Platform JWT and attaches user info to request
 * Used on all protected platform routes
 */

import { verifyPlatformToken } from '../auth/platformAuth.js';
import AppError from '../errors/AppError.js';
import { ERROR_TYPES } from '../errors/errorTypes.js';

/**
 * Platform Authentication Middleware
 * Verifies Platform JWT and attaches user info to request
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticatePlatform = async (req, res, next) => {
  try {
    // Get token from header or cookie
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.platform_token) {
      token = req.cookies.platform_token;
    }

    if (!token) {
      throw new AppError(
        'No authentication token provided',
        401,
        ERROR_TYPES.INVALID_PLATFORM_TOKEN
      );
    }

    // Verify token
    const decoded = verifyPlatformToken(token);

    // Attach user info to request
    req.platformUser = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticatePlatform;
