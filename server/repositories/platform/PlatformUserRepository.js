import BaseRepository from '../BaseRepository.js';
import PlatformUser from '../../platform/models/PlatformUser.js';

/**
 * Platform User Repository
 * Handles database operations for PlatformUser model
 */
class PlatformUserRepository extends BaseRepository {
    constructor() {
        super(PlatformUser);
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} User or null
     */
    async findByEmail(email, options = {}) {
        try {
            const filter = { email: email.toLowerCase() };
            return await this.findOne(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByEmail');
        }
    }

    /**
     * Find users by role
     * @param {string} role - User role (super-admin, support, operations)
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of users
     */
    async findByRole(role, options = {}) {
        try {
            const filter = { role };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByRole');
        }
    }

    /**
     * Find active users by role
     * @param {string} role - User role
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of active users
     */
    async findActiveByRole(role, options = {}) {
        try {
            const filter = { role, status: 'active' };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findActiveByRole');
        }
    }

    /**
     * Find users by status
     * @param {string} status - User status (active, inactive, locked)
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of users
     */
    async findByStatus(status, options = {}) {
        try {
            const filter = { status };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    /**
     * Find users with specific permission
     * @param {string} permission - Permission to check
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of users with permission
     */
    async findByPermission(permission, options = {}) {
        try {
            const filter = {
                $or: [
                    { role: 'super-admin' }, // Super-admin has all permissions
                    { permissions: permission }
                ]
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByPermission');
        }
    }

    /**
     * Create user with password hashing
     * @param {Object} userData - User data
     * @param {Object} [options] - Create options
     * @returns {Promise<Object>} Created user
     */
    async createUser(userData, options = {}) {
        try {
            // Email normalization is handled by the schema
            const user = await this.create(userData, options);
            
            // Return user without password but with id
            const safeUser = user.toSafeObject();
            safeUser.id = user._id.toString();
            return safeUser;
        } catch (error) {
            throw this._handleError(error, 'createUser');
        }
    }

    /**
     * Update user password (with proper hashing)
     * @param {string} id - User ID
     * @param {string} newPassword - New password
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated user or null
     */
    async updatePassword(id, newPassword, options = {}) {
        try {
            // Find the user first
            const user = await this.findById(id);
            if (!user) {
                return null;
            }

            // Update password and save (this will trigger pre-save middleware for hashing)
            user.password = newPassword;
            await user.save();
            
            return user.toSafeObject();
        } catch (error) {
            throw this._handleError(error, 'updatePassword');
        }
    }

    /**
     * Update user permissions
     * @param {string} id - User ID
     * @param {Array<string>} permissions - New permissions array
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated user or null
     */
    async updatePermissions(id, permissions, options = {}) {
        try {
            const updateData = { permissions };
            const user = await this.update(id, updateData, options);
            
            return user ? user.toSafeObject() : null;
        } catch (error) {
            throw this._handleError(error, 'updatePermissions');
        }
    }

    /**
     * Add permission to user
     * @param {string} id - User ID
     * @param {string} permission - Permission to add
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated user or null
     */
    async addPermission(id, permission, options = {}) {
        try {
            const user = await this.findById(id);
            if (!user) {
                return null;
            }

            if (!user.permissions.includes(permission)) {
                user.permissions.push(permission);
                await user.save();
            }

            return user.toSafeObject();
        } catch (error) {
            throw this._handleError(error, 'addPermission');
        }
    }

    /**
     * Remove permission from user
     * @param {string} id - User ID
     * @param {string} permission - Permission to remove
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated user or null
     */
    async removePermission(id, permission, options = {}) {
        try {
            const user = await this.findById(id);
            if (!user) {
                return null;
            }

            user.permissions = user.permissions.filter(p => p !== permission);
            await user.save();

            return user.toSafeObject();
        } catch (error) {
            throw this._handleError(error, 'removePermission');
        }
    }

    /**
     * Update last login timestamp
     * @param {string} id - User ID
     * @param {Date} [loginTime] - Login timestamp (defaults to now)
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated user or null
     */
    async updateLastLogin(id, loginTime = new Date(), options = {}) {
        try {
            const updateData = { lastLogin: loginTime };
            const user = await this.update(id, updateData, options);
            
            return user ? user.toSafeObject() : null;
        } catch (error) {
            throw this._handleError(error, 'updateLastLogin');
        }
    }

    /**
     * Lock user account
     * @param {string} id - User ID
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated user or null
     */
    async lockUser(id, options = {}) {
        try {
            const updateData = { status: 'locked' };
            const user = await this.update(id, updateData, options);
            
            return user ? user.toSafeObject() : null;
        } catch (error) {
            throw this._handleError(error, 'lockUser');
        }
    }

    /**
     * Unlock user account
     * @param {string} id - User ID
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated user or null
     */
    async unlockUser(id, options = {}) {
        try {
            const updateData = { status: 'active' };
            const user = await this.update(id, updateData, options);
            
            return user ? user.toSafeObject() : null;
        } catch (error) {
            throw this._handleError(error, 'unlockUser');
        }
    }

    /**
     * Deactivate user account
     * @param {string} id - User ID
     * @param {Object} [options] - Update options
     * @returns {Promise<Object|null>} Updated user or null
     */
    async deactivateUser(id, options = {}) {
        try {
            const updateData = { status: 'inactive' };
            const user = await this.update(id, updateData, options);
            
            return user ? user.toSafeObject() : null;
        } catch (error) {
            throw this._handleError(error, 'deactivateUser');
        }
    }

    /**
     * Get user statistics by role
     * @param {Object} [filter] - Additional filter criteria
     * @returns {Promise<Object>} User statistics
     */
    async getUserStatistics(filter = {}) {
        try {
            const pipeline = [
                { $match: filter },
                {
                    $group: {
                        _id: '$role',
                        total: { $sum: 1 },
                        active: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                            }
                        },
                        inactive: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0]
                            }
                        },
                        locked: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'locked'] }, 1, 0]
                            }
                        },
                        lastLogin: { $max: '$lastLogin' }
                    }
                },
                {
                    $project: {
                        role: '$_id',
                        total: 1,
                        active: 1,
                        inactive: 1,
                        locked: 1,
                        lastLogin: 1,
                        _id: 0
                    }
                }
            ];

            const results = await this.model.aggregate(pipeline);
            
            // Calculate totals across all roles
            const totals = results.reduce((acc, item) => {
                acc.total += item.total;
                acc.active += item.active;
                acc.inactive += item.inactive;
                acc.locked += item.locked;
                return acc;
            }, { total: 0, active: 0, inactive: 0, locked: 0 });

            return {
                byRole: results,
                totals
            };
        } catch (error) {
            throw this._handleError(error, 'getUserStatistics');
        }
    }

    /**
     * Find users who haven't logged in recently
     * @param {number} [days=30] - Number of days to look back
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of inactive users
     */
    async findInactiveUsers(days = 30, options = {}) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const filter = {
                $or: [
                    { lastLogin: { $lt: cutoffDate } },
                    { lastLogin: null }
                ]
                // Removed status filter to include all users regardless of account status
            };

            return await this.find(filter, {
                ...options,
                select: 'email firstName lastName role lastLogin status createdAt'
            });
        } catch (error) {
            throw this._handleError(error, 'findInactiveUsers');
        }
    }

    /**
     * Search users by name or email
     * @param {string} searchTerm - Search term
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Array of matching users
     */
    async searchUsers(searchTerm, options = {}) {
        try {
            const regex = new RegExp(searchTerm, 'i');
            const filter = {
                $or: [
                    { email: regex },
                    { firstName: regex },
                    { lastName: regex }
                ]
            };

            return await this.find(filter, {
                ...options,
                select: 'email firstName lastName role status lastLogin'
            });
        } catch (error) {
            throw this._handleError(error, 'searchUsers');
        }
    }
}

export default PlatformUserRepository;