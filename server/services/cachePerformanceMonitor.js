/**
 * Cache Performance Monitor Service
 * Monitors cache performance, hit rates, and provides optimization recommendations
 * Integrates with existing performance monitoring system
 */

import cacheService from './cacheService.js';
import licenseValidationCacheService from './licenseValidationCacheService.js';
import sessionService from './sessionService.js';
import redisService from '../core/services/redis.service.js';
import logger from '../utils/logger.js';

class CachePerformanceMonitor {
    constructor() {
        this.metrics = {
            cache: {
                hits: 0,
                misses: 0,
                errors: 0,
                totalRequests: 0,
                hitRate: 0,
                avgResponseTime: 0,
                responseTimes: []
            },
            redis: {
                connected: false,
                connectionErrors: 0,
                operationErrors: 0,
                totalOperations: 0
            },
            sessions: {
                active: 0,
                created: 0,
                destroyed: 0,
                errors: 0
            },
            license: {
                validationHits: 0,
                validationMisses: 0,
                validationErrors: 0,
                hitRate: 0
            }
        };
        
        this.performanceHistory = [];
        this.alertThresholds = {
            hitRate: 70, // Alert if hit rate drops below 70%
            errorRate: 5, // Alert if error rate exceeds 5%
            responseTime: 100, // Alert if avg response time exceeds 100ms
            redisConnectionErrors: 3 // Alert after 3 connection errors
        };
        
        this.monitoringInterval = null;
        this.isMonitoring = false;
    }

    /**
     * Start performance monitoring
     * @param {number} intervalMs - Monitoring interval in milliseconds
     */
    startMonitoring(intervalMs = 30000) { // 30 seconds default
        if (this.isMonitoring) {
            logger.warn('Cache performance monitoring is already running');
            return;
        }

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, intervalMs);

        logger.info('Cache performance monitoring started', { intervalMs });
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.isMonitoring = false;
        logger.info('Cache performance monitoring stopped');
    }

    /**
     * Collect current performance metrics
     */
    async collectMetrics() {
        try {
            const timestamp = new Date();
            
            // Collect cache metrics
            const cacheStats = cacheService.getStats();
            this.updateCacheMetrics(cacheStats);
            
            // Collect Redis metrics
            const redisStats = redisService.getStats();
            this.updateRedisMetrics(redisStats);
            
            // Collect session metrics
            const sessionStats = await sessionService.getStats();
            this.updateSessionMetrics(sessionStats);
            
            // Collect license cache metrics
            const licenseStats = await licenseValidationCacheService.getStats();
            this.updateLicenseMetrics(licenseStats);
            
            // Store historical data
            const snapshot = {
                timestamp,
                ...JSON.parse(JSON.stringify(this.metrics))
            };
            
            this.performanceHistory.push(snapshot);
            
            // Keep only last 100 snapshots (about 50 minutes at 30s intervals)
            if (this.performanceHistory.length > 100) {
                this.performanceHistory.shift();
            }
            
            // Check for performance issues
            this.checkPerformanceAlerts(snapshot);
            
            logger.debug('Cache performance metrics collected', { 
                hitRate: this.metrics.cache.hitRate,
                redisConnected: this.metrics.redis.connected,
                activeSessions: this.metrics.sessions.active
            });
            
        } catch (error) {
            logger.error('Error collecting cache performance metrics', { error: error.message });
        }
    }

    /**
     * Update cache metrics
     * @param {Object} stats - Cache statistics
     */
    updateCacheMetrics(stats) {
        this.metrics.cache.hits = stats.hits || 0;
        this.metrics.cache.misses = stats.misses || 0;
        this.metrics.cache.errors = stats.errors || 0;
        this.metrics.cache.totalRequests = this.metrics.cache.hits + this.metrics.cache.misses;
        
        if (this.metrics.cache.totalRequests > 0) {
            this.metrics.cache.hitRate = Math.round(
                (this.metrics.cache.hits / this.metrics.cache.totalRequests) * 100
            );
        }
    }

    /**
     * Update Redis metrics
     * @param {Object} stats - Redis statistics
     */
    updateRedisMetrics(stats) {
        this.metrics.redis.connected = stats.connected || false;
        this.metrics.redis.enabled = stats.enabled || false;
        
        if (!this.metrics.redis.connected && this.metrics.redis.enabled) {
            this.metrics.redis.connectionErrors++;
        }
    }

    /**
     * Update session metrics
     * @param {Object} stats - Session statistics
     */
    updateSessionMetrics(stats) {
        // Session stats would need to be enhanced in sessionService
        // For now, we'll use basic information
        this.metrics.sessions.redisConnected = stats.redisConnected || false;
    }

    /**
     * Update license cache metrics
     * @param {Object} stats - License cache statistics
     */
    updateLicenseMetrics(stats) {
        if (stats.hits !== undefined && stats.misses !== undefined) {
            this.metrics.license.validationHits = stats.hits;
            this.metrics.license.validationMisses = stats.misses;
            this.metrics.license.validationErrors = stats.errors || 0;
            
            const totalValidations = this.metrics.license.validationHits + this.metrics.license.validationMisses;
            if (totalValidations > 0) {
                this.metrics.license.hitRate = Math.round(
                    (this.metrics.license.validationHits / totalValidations) * 100
                );
            }
        }
    }

    /**
     * Check for performance alerts
     * @param {Object} snapshot - Current metrics snapshot
     */
    checkPerformanceAlerts(snapshot) {
        const alerts = [];

        // Check cache hit rate
        if (snapshot.cache.hitRate < this.alertThresholds.hitRate && snapshot.cache.totalRequests > 100) {
            alerts.push({
                type: 'low_hit_rate',
                severity: 'warning',
                message: `Cache hit rate is ${snapshot.cache.hitRate}% (threshold: ${this.alertThresholds.hitRate}%)`,
                value: snapshot.cache.hitRate,
                threshold: this.alertThresholds.hitRate
            });
        }

        // Check error rate
        const errorRate = snapshot.cache.totalRequests > 0 
            ? (snapshot.cache.errors / snapshot.cache.totalRequests) * 100 
            : 0;
            
        if (errorRate > this.alertThresholds.errorRate) {
            alerts.push({
                type: 'high_error_rate',
                severity: 'critical',
                message: `Cache error rate is ${errorRate.toFixed(2)}% (threshold: ${this.alertThresholds.errorRate}%)`,
                value: errorRate,
                threshold: this.alertThresholds.errorRate
            });
        }

        // Check Redis connection
        if (!snapshot.redis.connected && snapshot.redis.enabled) {
            alerts.push({
                type: 'redis_disconnected',
                severity: 'critical',
                message: 'Redis is enabled but not connected',
                value: false,
                threshold: true
            });
        }

        // Check Redis connection errors
        if (snapshot.redis.connectionErrors > this.alertThresholds.redisConnectionErrors) {
            alerts.push({
                type: 'redis_connection_errors',
                severity: 'warning',
                message: `Redis connection errors: ${snapshot.redis.connectionErrors} (threshold: ${this.alertThresholds.redisConnectionErrors})`,
                value: snapshot.redis.connectionErrors,
                threshold: this.alertThresholds.redisConnectionErrors
            });
        }

        // Log alerts
        for (const alert of alerts) {
            if (alert.severity === 'critical') {
                logger.error('Cache performance alert', alert);
            } else {
                logger.warn('Cache performance alert', alert);
            }
        }

        return alerts;
    }

    /**
     * Get current performance metrics
     * @returns {Object} Current metrics
     */
    getCurrentMetrics() {
        return {
            ...this.metrics,
            isMonitoring: this.isMonitoring,
            lastUpdated: this.performanceHistory.length > 0 
                ? this.performanceHistory[this.performanceHistory.length - 1].timestamp 
                : null
        };
    }

    /**
     * Get performance history
     * @param {number} limit - Number of historical snapshots to return
     * @returns {Array} Performance history
     */
    getPerformanceHistory(limit = 50) {
        return this.performanceHistory.slice(-limit);
    }

    /**
     * Get performance trends
     * @returns {Object} Performance trends analysis
     */
    getPerformanceTrends() {
        if (this.performanceHistory.length < 2) {
            return { message: 'Insufficient data for trend analysis' };
        }

        const recent = this.performanceHistory.slice(-10); // Last 10 snapshots
        const older = this.performanceHistory.slice(-20, -10); // Previous 10 snapshots

        const recentAvgHitRate = recent.reduce((sum, s) => sum + s.cache.hitRate, 0) / recent.length;
        const olderAvgHitRate = older.length > 0 
            ? older.reduce((sum, s) => sum + s.cache.hitRate, 0) / older.length 
            : recentAvgHitRate;

        const hitRateTrend = recentAvgHitRate - olderAvgHitRate;

        const recentErrors = recent.reduce((sum, s) => sum + s.cache.errors, 0);
        const olderErrors = older.reduce((sum, s) => sum + s.cache.errors, 0);

        return {
            hitRate: {
                current: Math.round(recentAvgHitRate),
                trend: Math.round(hitRateTrend * 100) / 100,
                direction: hitRateTrend > 0 ? 'improving' : hitRateTrend < 0 ? 'declining' : 'stable'
            },
            errors: {
                recent: recentErrors,
                previous: olderErrors,
                trend: recentErrors - olderErrors,
                direction: recentErrors > olderErrors ? 'increasing' : recentErrors < olderErrors ? 'decreasing' : 'stable'
            },
            redis: {
                connected: this.metrics.redis.connected,
                stable: recent.every(s => s.redis.connected) || recent.every(s => !s.redis.connected)
            }
        };
    }

    /**
     * Get optimization recommendations
     * @returns {Array} Array of optimization recommendations
     */
    getOptimizationRecommendations() {
        const recommendations = [];
        const currentMetrics = this.getCurrentMetrics();
        const trends = this.getPerformanceTrends();

        // Low hit rate recommendations
        if (currentMetrics.cache.hitRate < 60) {
            recommendations.push({
                type: 'hit_rate',
                priority: 'high',
                title: 'Improve Cache Hit Rate',
                description: 'Cache hit rate is below 60%. Consider increasing TTL for frequently accessed data.',
                actions: [
                    'Review and increase TTL for stable data (users, departments, positions)',
                    'Implement cache warming for frequently accessed data',
                    'Analyze query patterns to identify cacheable operations'
                ]
            });
        }

        // Redis connection recommendations
        if (!currentMetrics.redis.connected && currentMetrics.redis.enabled) {
            recommendations.push({
                type: 'redis_connection',
                priority: 'critical',
                title: 'Fix Redis Connection',
                description: 'Redis is enabled but not connected. This impacts performance significantly.',
                actions: [
                    'Check Redis server status and connectivity',
                    'Verify Redis configuration and credentials',
                    'Consider Redis clustering for high availability'
                ]
            });
        }

        // Error rate recommendations
        const errorRate = currentMetrics.cache.totalRequests > 0 
            ? (currentMetrics.cache.errors / currentMetrics.cache.totalRequests) * 100 
            : 0;

        if (errorRate > 2) {
            recommendations.push({
                type: 'error_rate',
                priority: 'medium',
                title: 'Reduce Cache Errors',
                description: `Cache error rate is ${errorRate.toFixed(2)}%. Investigate and fix cache operation errors.`,
                actions: [
                    'Review cache error logs for patterns',
                    'Implement better error handling and fallbacks',
                    'Monitor Redis memory usage and performance'
                ]
            });
        }

        // Performance trend recommendations
        if (trends.hitRate && trends.hitRate.direction === 'declining') {
            recommendations.push({
                type: 'performance_trend',
                priority: 'medium',
                title: 'Address Declining Performance',
                description: 'Cache hit rate is declining over time.',
                actions: [
                    'Analyze recent changes in data access patterns',
                    'Review cache invalidation strategies',
                    'Consider adjusting cache TTL values'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Generate performance report
     * @returns {Object} Comprehensive performance report
     */
    generatePerformanceReport() {
        return {
            summary: {
                status: this.getOverallStatus(),
                metrics: this.getCurrentMetrics(),
                trends: this.getPerformanceTrends(),
                recommendations: this.getOptimizationRecommendations()
            },
            details: {
                history: this.getPerformanceHistory(20),
                thresholds: this.alertThresholds,
                monitoring: {
                    isActive: this.isMonitoring,
                    dataPoints: this.performanceHistory.length
                }
            },
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Get overall cache system status
     * @returns {string} Status (excellent, good, warning, critical)
     */
    getOverallStatus() {
        const metrics = this.getCurrentMetrics();
        
        // Critical issues
        if (!metrics.redis.connected && metrics.redis.enabled) {
            return 'critical';
        }
        
        const errorRate = metrics.cache.totalRequests > 0 
            ? (metrics.cache.errors / metrics.cache.totalRequests) * 100 
            : 0;
            
        if (errorRate > 10) {
            return 'critical';
        }
        
        // Warning issues
        if (metrics.cache.hitRate < 50 && metrics.cache.totalRequests > 100) {
            return 'warning';
        }
        
        if (errorRate > 2) {
            return 'warning';
        }
        
        // Good performance
        if (metrics.cache.hitRate > 80) {
            return 'excellent';
        }
        
        return 'good';
    }

    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this.metrics = {
            cache: { hits: 0, misses: 0, errors: 0, totalRequests: 0, hitRate: 0 },
            redis: { connected: false, connectionErrors: 0, operationErrors: 0, totalOperations: 0 },
            sessions: { active: 0, created: 0, destroyed: 0, errors: 0 },
            license: { validationHits: 0, validationMisses: 0, validationErrors: 0, hitRate: 0 }
        };
        
        this.performanceHistory = [];
        cacheService.resetStats();
        
        logger.info('Cache performance metrics reset');
    }
}

// Export singleton instance
const cachePerformanceMonitor = new CachePerformanceMonitor();
export default cachePerformanceMonitor;