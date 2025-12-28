import BaseRepository from '../BaseRepository.js';
import User from '../../modules/hr-core/users/models/user.model.js';

/**
 * Repository for User model operations with role-based queries
 * Provides specialized methods for user management and authentication
 * 
 * @extends BaseRepository
 */
class UserRepository extends BaseRepository {
    constructor() {
        super(User);
    }

    /**
     * Find users by department
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of users in the department
     */
    async findByDepartment(departmentId, options = {}) {
        try {
            const filter = { department: departmentId };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    /**
     * Find users by role
     * @param {string} role - User role
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of users with the specified role
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
     * Find users by status
     * @param {string} status - User status (active, vacation, resigned, inactive)
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of users with the specified status
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
     * Find user by email (for authentication)
     * @param {string} email - User email
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {boolean} [options.includePassword=false] - Include password field
     * @returns {Promise<Object|null>} User document or null
     */
    async findByEmail(email, options = {}) {
        try {
            const { tenantId, includePassword = false } = options;
            const filter = { email: email.toLowerCase() };
            
            let query = this.model.findOne(filter);
            
            if (includePassword) {
                query = query.select('+password');
            }
            
            if (tenantId) {
                query = query.where({ tenantId });
            }
            
            return await query.exec();
        } catch (error) {
            throw this._handleError(error, 'findByEmail');
        }
    }

    /**
     * Find user by username (for authentication)
     * @param {string} username - Username
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {boolean} [options.includePassword=false] - Include password field
     * @returns {Promise<Object|null>} User document or null
     */
    async findByUsername(username, options = {}) {
        try {
            const { tenantId, includePassword = false } = options;
            const filter = { username };
            
            let query = this.model.findOne(filter);
            
            if (includePassword) {
                query = query.select('+password');
            }
            
            if (tenantId) {
                query = query.where({ tenantId });
            }
            
            return await query.exec();
        } catch (error) {
            throw this._handleError(error, 'findByUsername');
        }
    }

    /**
     * Find user by employee ID
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object|null>} User document or null
     */
    async findByEmployeeId(employeeId, options = {}) {
        try {
            const filter = { employeeId };
            return await this.findOne(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByEmployeeId');
        }
    }

    /**
     * Find active users (isActive: true and status: 'active')
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of active users
     */
    async findActiveUsers(options = {}) {
        try {
            const filter = { 
                isActive: true, 
                status: 'active' 
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findActiveUsers');
        }
    }

    /**
     * Find users by employment status
     * @param {string} employmentStatus - Employment status (active, on-leave, vacation, inactive, terminated, resigned)
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of users with the specified employment status
     */
    async findByEmploymentStatus(employmentStatus, options = {}) {
        try {
            const filter = { 'employment.employmentStatus': employmentStatus };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByEmploymentStatus');
        }
    }

    /**
     * Find users hired within a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of users hired within the date range
     */
    async findByHireDateRange(startDate, endDate, options = {}) {
        try {
            const filter = {
                'employment.hireDate': {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByHireDateRange');
        }
    }

    /**
     * Search users by name or email
     * @param {string} searchTerm - Search term
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of matching users
     */
    async searchUsers(searchTerm, options = {}) {
        try {
            const filter = {
                $or: [
                    { 'personalInfo.fullName': { $regex: searchTerm, $options: 'i' } },
                    { 'personalInfo.firstName': { $regex: searchTerm, $options: 'i' } },
                    { 'personalInfo.lastName': { $regex: searchTerm, $options: 'i' } },
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { username: { $regex: searchTerm, $options: 'i' } },
                    { employeeId: { $regex: searchTerm, $options: 'i' } }
                ]
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'searchUsers');
        }
    }

    /**
     * Get user statistics by department
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Array>} Array of department statistics
     */
    async getUserStatsByDepartment(options = {}) {
        try {
            const { tenantId } = options;
            
            const pipeline = [
                {
                    $match: tenantId ? { tenantId } : {}
                },
                {
                    $group: {
                        _id: '$department',
                        totalUsers: { $sum: 1 },
                        activeUsers: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                            }
                        },
                        inactiveUsers: {
                            $sum: {
                                $cond: [{ $ne: ['$status', 'active'] }, 1, 0]
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'departments',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'department'
                    }
                },
                {
                    $unwind: {
                        path: '$department',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        departmentId: '$_id',
                        departmentName: '$department.name',
                        totalUsers: 1,
                        activeUsers: 1,
                        inactiveUsers: 1
                    }
                }
            ];
            
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getUserStatsByDepartment');
        }
    }

    /**
     * Get user statistics by role
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Array>} Array of role statistics
     */
    async getUserStatsByRole(options = {}) {
        try {
            const { tenantId } = options;
            
            const pipeline = [
                {
                    $match: tenantId ? { tenantId } : {}
                },
                {
                    $group: {
                        _id: '$role',
                        totalUsers: { $sum: 1 },
                        activeUsers: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                            }
                        }
                    }
                },
                {
                    $project: {
                        role: '$_id',
                        totalUsers: 1,
                        activeUsers: 1
                    }
                },
                {
                    $sort: { totalUsers: -1 }
                }
            ];
            
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getUserStatsByRole');
        }
    }

    /**
     * Update user's last login timestamp
     * @param {string} userId - User ID
     * @param {Object} [options] - Update options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object|null>} Updated user document
     */
    async updateLastLogin(userId, options = {}) {
        try {
            const updateData = { lastLogin: new Date() };
            return await this.update(userId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'updateLastLogin');
        }
    }

    /**
     * Update user password
     * @param {string} userId - User ID
     * @param {string} newPassword - New password (will be hashed automatically)
     * @param {Object} [options] - Update options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object|null>} Updated user document
     */
    async updatePassword(userId, newPassword, options = {}) {
        try {
            const updateData = { password: newPassword };
            return await this.update(userId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'updatePassword');
        }
    }

    /**
     * Get users with populated department and position
     * @param {Object} [filter] - Query filter
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of users with populated references
     */
    async findWithDetails(filter = {}, options = {}) {
        try {
            const populateOptions = [
                { path: 'department', select: 'name code' },
                { path: 'position', select: 'title code' }
            ];
            
            return await this.find(filter, {
                ...options,
                populate: populateOptions
            });
        } catch (error) {
            throw this._handleError(error, 'findWithDetails');
        }
    }
}

export default UserRepository;