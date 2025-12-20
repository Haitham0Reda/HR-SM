/**
 * Example: Enhanced User Controller with Redis Caching
 * Demonstrates how to use the Redis caching layer for improved performance
 * This is an example implementation showing best practices
 */

import User from '../modules/hr-core/models/User.js';
import { getCachedQueryBuilder } from '../utils/modelCacheEnhancer.js';
import cacheService from '../services/cacheService.js';
import cacheInvalidationService from '../services/cacheInvalidationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

/**
 * Enhanced User Controller with caching capabilities
 */
class CachedUserController {
    
    /**
     * Get all users with caching
     * Uses Redis cache with tenant isolation
     */
    static getUsers = asyncHandler(async (req, res) => {
        const { tenantId } = req;
        const { page = 1, limit = 50, status = 'active', department } = req.query;
        
        // Build query conditions
        const conditions = { tenantId, status };
        if (department) {
            conditions.department = department;
        }
        
        // Use cached query builder
        const userQuery = getCachedQueryBuilder(User, { 
            tenantId, 
            ttl: 600 // 10 minutes for user lists
        });
        
        try {
            // Get cached count and users
            const [totalUsers, users] = await Promise.all([
                userQuery.count(conditions),
                userQuery.find(conditions, parseInt(limit))
                    .skip((parseInt(page) - 1) * parseInt(limit))
                    .populate('department', 'name')
                    .populate('position', 'title')
                    .select('-password')
            ]);
            
            logger.info('Users retrieved with caching', { 
                tenantId, 
                count: users.length, 
                total: totalUsers,
                cached: true
            });
            
            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: totalUsers,
                        pages: Math.ceil(totalUsers / parseInt(limit))
                    }
                }
            });
            
        } catch (error) {
            logger.error('Error retrieving users', { 
                tenantId, 
                error: error.message 
            });
            
            // Fallback to non-cached query
            const users = await User.find(conditions)
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit))
                .populate('department', 'name')
                .populate('position', 'title')
                .select('-password');
                
            res.json({
                success: true,
                data: { users },
                cached: false,
                fallback: true
            });
        }
    });
    
    /**
     * Get user by ID with caching
     */
    static getUserById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { tenantId } = req;
        
        const userQuery = getCachedQueryBuilder(User, { 
            tenantId, 
            ttl: 900 // 15 minutes for individual users
        });
        
        try {
            const user = await userQuery.findById(id)
                .populate('department', 'name code')
                .populate('position', 'title level')
                .populate('manager', 'firstName lastName email')
                .select('-password');
            
            if (!user || user.tenantId.toString() !== tenantId) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            logger.debug('User retrieved by ID with caching', { 
                userId: id, 
                tenantId,
                cached: true
            });
            
            res.json({
                success: true,
                data: user
            });
            
        } catch (error) {
            logger.error('Error retrieving user by ID', { 
                userId: id, 
                tenantId, 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                message: 'Error retrieving user'
            });
        }
    });
    
    /**
     * Create user with cache invalidation
     */
    static createUser = asyncHandler(async (req, res) => {
        const { tenantId } = req;
        const userData = { ...req.body, tenantId };
        
        try {
            const user = await User.create(userData);
            
            // Invalidate related cache entries
            await Promise.all([
                cacheInvalidationService.invalidateEntity('user', user._id.toString(), tenantId),
                cacheService.delPattern(`hrms:model:user:tenant:${tenantId}:*`), // Invalidate user lists
                cacheService.delPattern(`hrms:tenant:tenant:${tenantId}:user_count`), // Invalidate counts
            ]);
            
            logger.info('User created with cache invalidation', { 
                userId: user._id, 
                tenantId,
                email: user.email
            });
            
            res.status(201).json({
                success: true,
                data: user,
                message: 'User created successfully'
            });
            
        } catch (error) {
            logger.error('Error creating user', { 
                tenantId, 
                error: error.message 
            });
            
            if (error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error creating user'
            });
        }
    });
    
    /**
     * Update user with cache invalidation
     */
    static updateUser = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { tenantId } = req;
        const updates = req.body;
        
        try {
            const user = await User.findOneAndUpdate(
                { _id: id, tenantId },
                updates,
                { new: true, runValidators: true }
            ).select('-password');
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Invalidate cache for this user and related data
            await Promise.all([
                cacheInvalidationService.invalidateEntity('user', id, tenantId),
                cacheService.delPattern(`hrms:model:user:tenant:${tenantId}:find:*`), // Invalidate user lists
            ]);
            
            logger.info('User updated with cache invalidation', { 
                userId: id, 
                tenantId,
                updatedFields: Object.keys(updates)
            });
            
            res.json({
                success: true,
                data: user,
                message: 'User updated successfully'
            });
            
        } catch (error) {
            logger.error('Error updating user', { 
                userId: id, 
                tenantId, 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                message: 'Error updating user'
            });
        }
    });
    
    /**
     * Delete user with cache invalidation
     */
    static deleteUser = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { tenantId } = req;
        
        try {
            const user = await User.findOneAndDelete({ _id: id, tenantId });
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Comprehensive cache invalidation for user deletion
            await Promise.all([
                cacheInvalidationService.invalidateEntity('user', id, tenantId),
                cacheService.delPattern(`hrms:model:user:tenant:${tenantId}:*`), // All user-related cache
                cacheService.delPattern(`hrms:tenant:tenant:${tenantId}:user_count`), // User counts
                cacheService.delPattern(`hrms:tenant:tenant:${tenantId}:active_users`), // Active user counts
            ]);
            
            logger.info('User deleted with cache invalidation', { 
                userId: id, 
                tenantId,
                email: user.email
            });
            
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
            
        } catch (error) {
            logger.error('Error deleting user', { 
                userId: id, 
                tenantId, 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                message: 'Error deleting user'
            });
        }
    });
    
    /**
     * Get user statistics with caching
     */
    static getUserStats = asyncHandler(async (req, res) => {
        const { tenantId } = req;
        
        try {
            // Use cache service for aggregated statistics
            const stats = await cacheService.cacheQuery(
                'user_stats',
                `tenant:${tenantId}`,
                async () => {
                    const [
                        totalUsers,
                        activeUsers,
                        inactiveUsers,
                        departmentStats
                    ] = await Promise.all([
                        User.countDocuments({ tenantId }),
                        User.countDocuments({ tenantId, status: 'active' }),
                        User.countDocuments({ tenantId, status: 'inactive' }),
                        User.aggregate([
                            { $match: { tenantId } },
                            { $group: { _id: '$department', count: { $sum: 1 } } },
                            { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
                            { $project: { departmentName: { $arrayElemAt: ['$dept.name', 0] }, count: 1 } }
                        ])
                    ]);
                    
                    return {
                        totalUsers,
                        activeUsers,
                        inactiveUsers,
                        departmentStats
                    };
                },
                600, // 10 minutes TTL for stats
                tenantId
            );
            
            logger.debug('User statistics retrieved with caching', { 
                tenantId,
                stats: {
                    total: stats.totalUsers,
                    active: stats.activeUsers
                }
            });
            
            res.json({
                success: true,
                data: stats
            });
            
        } catch (error) {
            logger.error('Error retrieving user statistics', { 
                tenantId, 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                message: 'Error retrieving user statistics'
            });
        }
    });
    
    /**
     * Search users with caching
     */
    static searchUsers = asyncHandler(async (req, res) => {
        const { tenantId } = req;
        const { q: query, limit = 20 } = req.query;
        
        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }
        
        try {
            // Create search conditions
            const searchConditions = {
                tenantId,
                $or: [
                    { firstName: { $regex: query, $options: 'i' } },
                    { lastName: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } },
                    { employeeId: { $regex: query, $options: 'i' } }
                ]
            };
            
            // Use caching for search results (shorter TTL due to dynamic nature)
            const users = await cacheService.cacheQuery(
                'user_search',
                `tenant:${tenantId}:query:${query}:limit:${limit}`,
                async () => {
                    return await User.find(searchConditions)
                        .limit(parseInt(limit))
                        .populate('department', 'name')
                        .populate('position', 'title')
                        .select('firstName lastName email employeeId department position status')
                        .lean();
                },
                180, // 3 minutes TTL for search results
                tenantId
            );
            
            logger.debug('User search completed with caching', { 
                tenantId,
                query,
                resultCount: users.length
            });
            
            res.json({
                success: true,
                data: {
                    users,
                    query,
                    count: users.length
                }
            });
            
        } catch (error) {
            logger.error('Error searching users', { 
                tenantId, 
                query, 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                message: 'Error searching users'
            });
        }
    });
}

export default CachedUserController;

/**
 * Usage Example in Routes:
 * 
 * import express from 'express';
 * import CachedUserController from './cachedUserController.example.js';
 * import { authenticateToken } from '../middleware/auth.js';
 * import { tenantContext } from '../middleware/tenantContext.js';
 * 
 * const router = express.Router();
 * 
 * // Apply middleware
 * router.use(authenticateToken);
 * router.use(tenantContext);
 * 
 * // Routes with caching
 * router.get('/', CachedUserController.getUsers);
 * router.get('/stats', CachedUserController.getUserStats);
 * router.get('/search', CachedUserController.searchUsers);
 * router.get('/:id', CachedUserController.getUserById);
 * router.post('/', CachedUserController.createUser);
 * router.put('/:id', CachedUserController.updateUser);
 * router.delete('/:id', CachedUserController.deleteUser);
 * 
 * export default router;
 */