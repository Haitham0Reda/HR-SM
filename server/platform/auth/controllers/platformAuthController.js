const platformAuthService = require('../services/platformAuthService');
const { setPlatformTokenCookie, clearPlatformTokenCookie } = require('../../../core/auth/platformAuth');
const asyncHandler = require('../../../utils/asyncHandler');

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
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await platformAuthService.login(email, password);

  // Set token in HTTP-only cookie
  setPlatformTokenCookie(res, token);

  res.status(200).json({
    success: true,
    data: {
      user,
      token
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Logout platform user
 * POST /api/platform/auth/logout
 */
exports.logout = asyncHandler(async (req, res) => {
  // Clear token cookie
  clearPlatformTokenCookie(res);

  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Get current platform user
 * GET /api/platform/auth/me
 * 
 * Requires authentication middleware
 */
exports.me = asyncHandler(async (req, res) => {
  // User ID is set by authentication middleware
  const user = await platformAuthService.getUserById(req.platformUser.userId);

  res.status(200).json({
    success: true,
    data: {
      user
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

/**
 * Change password
 * POST /api/platform/auth/change-password
 * 
 * @param {Object} req.body.currentPassword - Current password
 * @param {Object} req.body.newPassword - New password
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.platformUser.userId;

  await platformAuthService.changePassword(userId, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    data: {
      message: 'Password changed successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});
