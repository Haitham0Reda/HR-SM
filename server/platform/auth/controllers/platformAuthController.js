import platformAuthService from '../services/platformAuthService.js';
import { generatePlatformToken } from '../../middleware/platformAuth.js';
import logger from '../../../utils/logger.js';
import platformLogger from '../../../utils/platformLogger.js';
import { 
    logControllerAction, 
    logControllerError, 
    logAuthenticationEvent,
    logSecurityEvent 
} from '../../../utils/controllerLogger.js';

/**
 * Platform Authentication Controller
 * Handles HTTP requests for platform authentication
 */

/**
 * Login platform user
 * POST /api/platform/auth/login
 * 
 * @param {Object} req.body.email - User email
 * @param {Object} req.body.password - User password
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Log platform login attempt
    logControllerAction(req, 'platform_login_attempt', {
      controller: 'PlatformAuthController',
      userEmail: email
    });

    if (!email || !password) {
      logSecurityEvent(req, 'incomplete_platform_login', {
        severity: 'medium',
        missingFields: !email ? 'email' : 'password'
      });
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const { user, token } = await platformAuthService.login(email, password);

    // Log successful platform authentication
    logAuthenticationEvent(req, 'platform_login_success', {
      success: true,
      userId: user.id,
      userEmail: email,
      userRole: user.role,
      platformAccess: true
    });
    
    // Log to platform logger
    platformLogger.adminAction('platform_login', user.id, {
      correlationId: req.correlationId,
      userEmail: email,
      userRole: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        token
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Platform login failed', { error: error.message, email: req.body.email });
    
    // Enhanced error logging for platform authentication
    logAuthenticationEvent(req, 'platform_login_failed', {
      success: false,
      userEmail: req.body.email,
      reason: error.message,
      platformAccess: true
    });
    
    logControllerError(req, error, {
      controller: 'PlatformAuthController',
      action: 'login',
      userEmail: req.body.email
    });
    
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
};

/**
 * Logout platform user
 * POST /api/platform/auth/logout
 */
export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Platform logout failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * Get current platform user
 * GET /api/platform/auth/me
 * 
 * Requires authentication middleware
 */
export const me = async (req, res) => {
  try {
    const user = req.platformUser.toSafeObject();

    res.status(200).json({
      success: true,
      data: {
        user
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get platform user', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
};

/**
 * Change password
 * POST /api/platform/auth/change-password
 * 
 * @param {Object} req.body.currentPassword - Current password
 * @param {Object} req.body.newPassword - New password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.platformUser._id;

    await platformAuthService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password changed successfully'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to change password', { error: error.message, userId: req.platformUser._id });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to change password'
    });
  }
};
