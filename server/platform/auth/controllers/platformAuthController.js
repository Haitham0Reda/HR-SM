import platformAuthService from '../services/platformAuthService.js';
import { generatePlatformToken } from '../../middleware/platformAuth.js';
import logger from '../../../utils/logger.js';

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

    const { user, token } = await platformAuthService.login(email, password);

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
