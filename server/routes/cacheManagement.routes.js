/**
 * Cache Management Routes
 * Provides administrative endpoints for cache management and monitoring
 */

import express from 'express';
import cacheService from '../services/cacheService.js';
import cacheInvalidationService from '../services/cacheInvalidationService.js';
import licenseValidationCacheService from '../services/licenseValidationCacheService.js';
import sessionService from '../services/sessionService.js';
import redisService from '../core/services/redis.service.js';
import cachePerformanceMonitor from '../services/cachePerformanceMonitor.js';
import asyncHandler from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../shared/middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication and admin role requirement to all routes
router.use(requireAuth);
router.use(requireRole(['Admin', 'SuperAdmin']));

/**
 * Get comprehensive cache statistics
 * GET /api/v1/cache/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const cacheStats = cacheService.getStats();
    const sessionStats = await sessionService.getStats();
    const licenseStats = await licenseValidationCacheService.getStats();
    const redisStats = redisService.getStats();
    const invalidationStats = cacheInvalidationService.getStats();

    res.json({
        success: true,
        data: {
            cache: cacheStats,
            sessions: sessionStats,
            license: licenseStats,
            redis: redisStats,
            invalidation: invalidationStats,
            timestamp: new Date().toISOString()
        }
    });
}));

/**
 * Get cache performance metrics
 * GET /api/v1/cache/performance
 */
router.get('/performance', asyncHandler(async (req, res) => {
    const performanceMetrics = await licenseValidationCacheService.getPerformanceMetrics();
    const cacheStats = cacheService.getStats();

    res.json({
        success: true,
        data: {
            hitRate: cacheStats.hitRate,
            totalRequests: cacheStats.hits + cacheStats.misses,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            errors: cacheStats.errors,
            inMemorySize: cacheStats.inMemorySize,
            redisConnected: cacheStats.redis?.connected || false,
            license: performanceMetrics,
            timestamp: new Date().toISOString()
        }
    });
}));

/**
 * Warm up cache for specific tenant
 * POST /api/v1/cache/warmup
 */
router.post('/warmup', asyncHandler(async (req, res) => {
    const { tenantId, tenantIds } = req.body;

    if (!tenantId && !tenantIds) {
        return res.status(400).json({
            success: false,
            message: 'tenantId or tenantIds array is required'
        });
    }

    try {
        let result;
        if (tenantId) {
            await cacheService.warmupCache(tenantId);
            result = { tenantId, warmedUp: 1 };
        } else if (tenantIds && Array.isArray(tenantIds)) {
            const warmedUp = await licenseValidationCacheService.warmupLicenseCache(tenantIds);
            result = { tenantIds, warmedUp };
        }

        logger.info('Cache warmup completed', { 
            tenantId, 
            tenantIds, 
            performedBy: req.user._id 
        });

        res.json({
            success: true,
            message: 'Cache warmup completed',
            data: result
        });
    } catch (error) {
        logger.error('Cache warmup failed', { 
            tenantId, 
            tenantIds, 
            error: error.message,
            performedBy: req.user._id 
        });

        res.status(500).json({
            success: false,
            message: 'Cache warmup failed',
            error: error.message
        });
    }
}));

/**
 * Invalidate cache for specific tenant
 * DELETE /api/v1/cache/tenant/:tenantId
 */
router.delete('/tenant/:tenantId', asyncHandler(async (req, res) => {
    const { tenantId } = req.params;

    try {
        const cacheInvalidated = await cacheService.invalidateTenant(tenantId);
        const licenseInvalidated = await licenseValidationCacheService.invalidateTenantLicenseCache(tenantId);
        const totalInvalidated = cacheInvalidated + licenseInvalidated;

        logger.info('Tenant cache invalidated', { 
            tenantId, 
            cacheInvalidated,
            licenseInvalidated,
            totalInvalidated,
            performedBy: req.user._id 
        });

        res.json({
            success: true,
            message: 'Tenant cache invalidated successfully',
            data: {
                tenantId,
                cacheKeysInvalidated: cacheInvalidated,
                licenseKeysInvalidated: licenseInvalidated,
                totalInvalidated
            }
        });
    } catch (error) {
        logger.error('Tenant cache invalidation failed', { 
            tenantId, 
            error: error.message,
            performedBy: req.user._id 
        });

        res.status(500).json({
            success: false,
            message: 'Cache invalidation failed',
            error: error.message
        });
    }
}));

/**
 * Invalidate cache for specific entity
 * DELETE /api/v1/cache/entity/:entityType/:entityId
 */
router.delete('/entity/:entityType/:entityId', asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { tenantId } = req.query;

    try {
        const invalidated = await cacheInvalidationService.invalidateEntity(
            entityType, 
            entityId, 
            tenantId
        );

        logger.info('Entity cache invalidated', { 
            entityType,
            entityId,
            tenantId,
            invalidated,
            performedBy: req.user._id 
        });

        res.json({
            success: true,
            message: 'Entity cache invalidated successfully',
            data: {
                entityType,
                entityId,
                tenantId,
                keysInvalidated: invalidated
            }
        });
    } catch (error) {
        logger.error('Entity cache invalidation failed', { 
            entityType,
            entityId,
            tenantId,
            error: error.message,
            performedBy: req.user._id 
        });

        res.status(500).json({
            success: false,
            message: 'Entity cache invalidation failed',
            error: error.message
        });
    }
}));

/**
 * Invalidate all license cache
 * DELETE /api/v1/cache/license/all
 */
router.delete('/license/all', asyncHandler(async (req, res) => {
    try {
        const invalidated = await licenseValidationCacheService.invalidateAllLicenseCache();

        logger.info('All license cache invalidated', { 
            invalidated,
            performedBy: req.user._id 
        });

        res.json({
            success: true,
            message: 'All license cache invalidated successfully',
            data: {
                keysInvalidated: invalidated
            }
        });
    } catch (error) {
        logger.error('License cache invalidation failed', { 
            error: error.message,
            performedBy: req.user._id 
        });

        res.status(500).json({
            success: false,
            message: 'License cache invalidation failed',
            error: error.message
        });
    }
}));

/**
 * Get active sessions for a user
 * GET /api/v1/cache/sessions/user/:userId
 */
router.get('/sessions/user/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
        return res.status(400).json({
            success: false,
            message: 'tenantId query parameter is required'
        });
    }

    try {
        const sessions = await sessionService.getUserSessions(userId, tenantId);

        res.json({
            success: true,
            data: {
                userId,
                tenantId,
                sessions,
                count: sessions.length
            }
        });
    } catch (error) {
        logger.error('Error getting user sessions', { 
            userId,
            tenantId,
            error: error.message 
        });

        res.status(500).json({
            success: false,
            message: 'Failed to get user sessions',
            error: error.message
        });
    }
}));

/**
 * Destroy all sessions for a user
 * DELETE /api/v1/cache/sessions/user/:userId
 */
router.delete('/sessions/user/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
        return res.status(400).json({
            success: false,
            message: 'tenantId query parameter is required'
        });
    }

    try {
        const destroyedCount = await sessionService.destroyUserSessions(userId, tenantId);

        logger.info('User sessions destroyed', { 
            userId,
            tenantId,
            destroyedCount,
            performedBy: req.user._id 
        });

        res.json({
            success: true,
            message: 'User sessions destroyed successfully',
            data: {
                userId,
                tenantId,
                sessionsDestroyed: destroyedCount
            }
        });
    } catch (error) {
        logger.error('Error destroying user sessions', { 
            userId,
            tenantId,
            error: error.message,
            performedBy: req.user._id 
        });

        res.status(500).json({
            success: false,
            message: 'Failed to destroy user sessions',
            error: error.message
        });
    }
}));

/**
 * Reset cache statistics
 * POST /api/v1/cache/stats/reset
 */
router.post('/stats/reset', asyncHandler(async (req, res) => {
    try {
        cacheService.resetStats();

        logger.info('Cache statistics reset', { 
            performedBy: req.user._id 
        });

        res.json({
            success: true,
            message: 'Cache statistics reset successfully'
        });
    } catch (error) {
        logger.error('Error resetting cache statistics', { 
            error: error.message,
            performedBy: req.user._id 
        });

        res.status(500).json({
            success: false,
            message: 'Failed to reset cache statistics',
            error: error.message
        });
    }
}));

/**
 * Get cache performance report
 * GET /api/v1/cache/performance/report
 */
router.get('/performance/report', asyncHandler(async (req, res) => {
    const report = cachePerformanceMonitor.generatePerformanceReport();
    
    res.json({
        success: true,
        data: report
    });
}));

/**
 * Get cache performance trends
 * GET /api/v1/cache/performance/trends
 */
router.get('/performance/trends', asyncHandler(async (req, res) => {
    const trends = cachePerformanceMonitor.getPerformanceTrends();
    const recommendations = cachePerformanceMonitor.getOptimizationRecommendations();
    
    res.json({
        success: true,
        data: {
            trends,
            recommendations,
            status: cachePerformanceMonitor.getOverallStatus()
        }
    });
}));

/**
 * Get cache performance history
 * GET /api/v1/cache/performance/history
 */
router.get('/performance/history', asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;
    const history = cachePerformanceMonitor.getPerformanceHistory(parseInt(limit));
    
    res.json({
        success: true,
        data: {
            history,
            count: history.length
        }
    });
}));

/**
 * Reset cache performance metrics
 * POST /api/v1/cache/performance/reset
 */
router.post('/performance/reset', asyncHandler(async (req, res) => {
    try {
        cachePerformanceMonitor.resetMetrics();
        
        logger.info('Cache performance metrics reset', { 
            performedBy: req.user._id 
        });
        
        res.json({
            success: true,
            message: 'Cache performance metrics reset successfully'
        });
    } catch (error) {
        logger.error('Error resetting cache performance metrics', { 
            error: error.message,
            performedBy: req.user._id 
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to reset cache performance metrics',
            error: error.message
        });
    }
}));

/**
 * Test Redis connection
 * GET /api/v1/cache/redis/test
 */
router.get('/redis/test', asyncHandler(async (req, res) => {
    try {
        const testKey = 'test:connection';
        const testValue = { timestamp: new Date().toISOString(), test: true };
        
        // Test set operation
        const setResult = await redisService.set(testKey, JSON.stringify(testValue), 60);
        
        // Test get operation
        const getValue = await redisService.get(testKey);
        
        // Test delete operation
        await redisService.del(testKey);
        
        const redisStats = redisService.getStats();

        res.json({
            success: true,
            message: 'Redis connection test completed',
            data: {
                setResult,
                getValue: getValue ? JSON.parse(getValue) : null,
                redisStats,
                testPassed: setResult && getValue !== null
            }
        });
    } catch (error) {
        logger.error('Redis connection test failed', { 
            error: error.message 
        });

        res.status(500).json({
            success: false,
            message: 'Redis connection test failed',
            error: error.message
        });
    }
}));

export default router;