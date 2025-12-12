import PlatformUser from '../../models/PlatformUser.js';
import { generatePlatformToken } from '../../../core/auth/platformAuth.js';
import AppError from '../../../core/errors/AppError.js';
import { ERROR_TYPES } from '../../../core/errors/errorTypes.js';

/**
 * Platform Authentication Service
 * Handles authentication logic for platform administrators
 */
class PlatformAuthService {
  /**
   * Authenticate platform user with email and password
   * 
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User object and token
   * @throws {AppError} If authentication fails
   */
  async login(email, password) {
    // Validate input
    if (!email || !password) {
      throw new AppError(
        'Email and password are required',
        400,
        ERROR_TYPES.INVALID_INPUT
      );
    }

    // Find user by email (include password field)
    const user = await PlatformUser.findOne({ email }).select('+password');

    if (!user) {
      throw new AppError(
        'Invalid email or password',
        401,
        ERROR_TYPES.INVALID_CREDENTIALS
      );
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AppError(
        `Account is ${user.status}. Please contact system administrator.`,
        403,
        ERROR_TYPES.ACCOUNT_INACTIVE
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new AppError(
        'Invalid email or password',
        401,
        ERROR_TYPES.INVALID_CREDENTIALS
      );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generatePlatformToken(user._id.toString(), user.role);

    // Return user (without password) and token
    return {
      user: user.toSafeObject(),
      token
    };
  }

  /**
   * Get platform user by ID
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object
   * @throws {AppError} If user not found
   */
  async getUserById(userId) {
    const user = await PlatformUser.findById(userId);

    if (!user) {
      throw new AppError(
        'Platform user not found',
        404,
        ERROR_TYPES.USER_NOT_FOUND
      );
    }

    if (user.status !== 'active') {
      throw new AppError(
        'User account is not active',
        403,
        ERROR_TYPES.ACCOUNT_INACTIVE
      );
    }

    return user.toSafeObject();
  }

  /**
   * Create new platform user
   * 
   * @param {Object} userData - User data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.firstName - First name
   * @param {string} userData.lastName - Last name
   * @param {string} userData.role - User role
   * @param {Array<string>} userData.permissions - User permissions
   * @returns {Promise<Object>} Created user object
   * @throws {AppError} If creation fails
   */
  async createUser(userData) {
    try {
      const user = new PlatformUser(userData);
      await user.save();
      return user.toSafeObject();
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(
          'Email already exists',
          400,
          ERROR_TYPES.DUPLICATE_EMAIL
        );
      }
      throw error;
    }
  }

  /**
   * Update platform user
   * 
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user object
   * @throws {AppError} If update fails
   */
  async updateUser(userId, updateData) {
    // Don't allow updating password through this method
    delete updateData.password;

    const user = await PlatformUser.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError(
        'Platform user not found',
        404,
        ERROR_TYPES.USER_NOT_FOUND
      );
    }

    return user.toSafeObject();
  }

  /**
   * Change user password
   * 
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   * @throws {AppError} If password change fails
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await PlatformUser.findById(userId).select('+password');

    if (!user) {
      throw new AppError(
        'Platform user not found',
        404,
        ERROR_TYPES.USER_NOT_FOUND
      );
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      throw new AppError(
        'Current password is incorrect',
        401,
        ERROR_TYPES.INVALID_CREDENTIALS
      );
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();
  }

  /**
   * Deactivate platform user
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user object
   * @throws {AppError} If deactivation fails
   */
  async deactivateUser(userId) {
    const user = await PlatformUser.findByIdAndUpdate(
      userId,
      { status: 'inactive', updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      throw new AppError(
        'Platform user not found',
        404,
        ERROR_TYPES.USER_NOT_FOUND
      );
    }

    return user.toSafeObject();
  }

  /**
   * List all platform users
   * 
   * @param {Object} filters - Filter options
   * @param {string} filters.role - Filter by role
   * @param {string} filters.status - Filter by status
   * @returns {Promise<Array>} Array of users
   */
  async listUsers(filters = {}) {
    const query = {};

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const users = await PlatformUser.find(query).sort({ createdAt: -1 });
    return users.map(user => user.toSafeObject());
  }
}

export default new PlatformAuthService();
