/**
 * Performance Monitoring Service Tests
 */

import { jest } from '@jest/globals';
import performanceMonitoringService from '../../services/performanceMonitoring.service.js';

// Define test constants locally since service doesn't export them
const PERFORMANCE_METRICS = {
    API_RESPONSE_TIME: 'api_response_time',
    MEMORY_USAGE: 'memory_usage',
    CPU_USAGE: 'cpu_usage',
    THROUGHPUT: 'throughput',
    ERROR_RATE: 'error_rate'
};

const HEALTH_STATES = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    CRITICAL: 'critical'
};

// Mock platform logger
jest.unstable_mockModule('../../utils/platformLogger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        systemHealth: jest.fn(),
        systemPerformance: jest.fn()
    }
}));

// Mock alert generation service
jest.unstable_mockModule('../../services/alertGeneration.service.js', () => ({
    default: {
        generateAlert: jest.fn().mockResolvedValue({ id: 'test-alert-id' })
    }
}));

describe('PerformanceMonitoringService', () => {
    beforeEach(() => {
        // Clear metrics and history
        performanceMonitoringService.metrics?.clear();
        performanceMonitoringService.metricHistory?.clear();
        performanceMonitoringService.alertCooldowns?.clear();
        if (performanceMonitoringService.healthState) {
            performanceMonitoringService.healthState = HEALTH_STATES.HEALTHY;
        }
        if (performanceMonitoringService.backpressureActive !== undefined) {
            performanceMonitoringService.backpressureActive = false;
        }
        jest.clearAllMocks();
    });

    describe('recordMetric', () => {
        test('should record performance metric correctly', async () => {
            const metric = await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.API_RESPONSE_TIME,
                1500,
                { endpoint: '/api/test' }
            );

            expect(metric).toBeDefined();
            expect(metric.type).toBe(PERFORMANCE_METRICS.API_RESPONSE_TIME);
            expect(metric.value).toBe(1500);
            expect(metric.context.endpoint).toBe('/api/test');
            expect(metric.timestamp).toBeDefined();
        });

        test('should store metric in history', async () => {
            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.MEMORY_USAGE,
                0.75
            );

            const history = performanceMonitoringService.metricHistory.get(PERFORMANCE_METRICS.MEMORY_USAGE);
            expect(history).toBeDefined();
            expect(history.length).toBe(1);
            expect(history[0].value).toBe(0.75);
        });

        test('should limit history to 100 entries', async () => {
            // Record 150 metrics
            for (let i = 0; i < 150; i++) {
                await performanceMonitoringService.recordMetric(
                    PERFORMANCE_METRICS.CPU_USAGE,
                    0.5 + (i * 0.001)
                );
            }

            const history = performanceMonitoringService.metricHistory.get(PERFORMANCE_METRICS.CPU_USAGE);
            expect(history.length).toBe(100);

            // Should keep the most recent entries
            expect(history[history.length - 1].value).toBeCloseTo(0.649);
        });
    });

    describe('threshold checking', () => {
        test('should generate alert when critical threshold exceeded', async () => {
            const alertGeneration = await import('../../services/alertGeneration.service.js');

            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.MEMORY_USAGE,
                0.95 // Above critical threshold (0.9)
            );

            expect(alertGeneration.default.generateAlert).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'critical',
                    type: 'performance_degradation'
                })
            );
        });

        test('should generate alert when warning threshold exceeded', async () => {
            const alertGeneration = await import('../../services/alertGeneration.service.js');

            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.API_RESPONSE_TIME,
                3000 // Above warning threshold (2000)
            );

            expect(alertGeneration.default.generateAlert).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'high',
                    type: 'performance_degradation'
                })
            );
        });

        test('should not generate alert when below thresholds', async () => {
            const alertGeneration = await import('../../services/alertGeneration.service.js');

            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.MEMORY_USAGE,
                0.5 // Below warning threshold
            );

            expect(alertGeneration.default.generateAlert).not.toHaveBeenCalled();
        });

        test('should respect alert cooldowns', async () => {
            const alertGeneration = await import('../../services/alertGeneration.service.js');

            // Record first metric above threshold
            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.MEMORY_USAGE,
                0.95
            );

            // Record second metric above threshold immediately
            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.MEMORY_USAGE,
                0.96
            );

            // Should only generate one alert due to cooldown
            expect(alertGeneration.default.generateAlert).toHaveBeenCalledTimes(1);
        });
    });

    describe('health state management', () => {
        test('should update health state to critical when critical metrics present', async () => {
            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.MEMORY_USAGE,
                0.95 // Critical
            );

            expect(performanceMonitoringService.healthState).toBe(HEALTH_STATES.CRITICAL);
        });

        test('should update health state to degraded when warning metrics present', async () => {
            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.MEMORY_USAGE,
                0.85 // Warning
            );

            expect(performanceMonitoringService.healthState).toBe(HEALTH_STATES.DEGRADED);
        });

        test('should maintain healthy state when metrics are normal', async () => {
            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.MEMORY_USAGE,
                0.5 // Normal
            );

            expect(performanceMonitoringService.healthState).toBe(HEALTH_STATES.HEALTHY);
        });
    });

    describe('metric trend analysis', () => {
        test('should calculate increasing trend correctly', async () => {
            // Record increasing values
            for (let i = 0; i < 10; i++) {
                await performanceMonitoringService.recordMetric(
                    PERFORMANCE_METRICS.CPU_USAGE,
                    0.1 + (i * 0.05)
                );
            }

            const trend = performanceMonitoringService.getMetricTrend(PERFORMANCE_METRICS.CPU_USAGE);
            expect(trend.trend).toBe('increasing');
        });

        test('should calculate decreasing trend correctly', async () => {
            // Record decreasing values
            for (let i = 0; i < 10; i++) {
                await performanceMonitoringService.recordMetric(
                    PERFORMANCE_METRICS.CPU_USAGE,
                    0.9 - (i * 0.05)
                );
            }

            const trend = performanceMonitoringService.getMetricTrend(PERFORMANCE_METRICS.CPU_USAGE);
            expect(trend.trend).toBe('decreasing');
        });

        test('should calculate stable trend for consistent values', async () => {
            // Record stable values
            for (let i = 0; i < 10; i++) {
                await performanceMonitoringService.recordMetric(
                    PERFORMANCE_METRICS.CPU_USAGE,
                    0.5 + (Math.random() * 0.02 - 0.01) // Small random variation
                );
            }

            const trend = performanceMonitoringService.getMetricTrend(PERFORMANCE_METRICS.CPU_USAGE);
            expect(trend.trend).toBe('stable');
        });

        test('should return insufficient data for small datasets', () => {
            const trend = performanceMonitoringService.getMetricTrend(PERFORMANCE_METRICS.CPU_USAGE);
            expect(trend.trend).toBe('insufficient_data');
        });
    });

    describe('backpressure management', () => {
        test('should activate backpressure for high memory usage', async () => {
            const initialState = performanceMonitoringService.backpressureActive;
            expect(initialState).toBe(false);

            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.MEMORY_USAGE,
                0.87 // Above backpressure threshold (0.85)
            );

            expect(performanceMonitoringService.backpressureActive).toBe(true);
        });

        test('should activate backpressure for high CPU usage', async () => {
            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.CPU_USAGE,
                0.92 // Above backpressure threshold (0.9)
            );

            expect(performanceMonitoringService.backpressureActive).toBe(true);
        });

        test('should activate backpressure for high error rate', async () => {
            await performanceMonitoringService.recordMetric(
                PERFORMANCE_METRICS.ERROR_RATE,
                0.16 // Above backpressure threshold (0.15)
            );

            expect(performanceMonitoringService.backpressureActive).toBe(true);
        });
    });

    describe('custom thresholds', () => {
        test('should allow setting custom thresholds', () => {
            performanceMonitoringService.setThreshold(
                PERFORMANCE_METRICS.API_RESPONSE_TIME,
                1000, // warning
                3000  // critical
            );

            const thresholds = performanceMonitoringService.thresholds.get(PERFORMANCE_METRICS.API_RESPONSE_TIME);
            expect(thresholds.warning).toBe(1000);
            expect(thresholds.critical).toBe(3000);
        });
    });

    describe('performance status', () => {
        test('should return comprehensive performance status', async () => {
            await performanceMonitoringService.recordMetric(PERFORMANCE_METRICS.MEMORY_USAGE, 0.7);
            await performanceMonitoringService.recordMetric(PERFORMANCE_METRICS.CPU_USAGE, 0.6);

            const status = performanceMonitoringService.getPerformanceStatus();

            expect(status).toHaveProperty('healthState');
            expect(status).toHaveProperty('backpressureActive');
            expect(status).toHaveProperty('metrics');
            expect(status).toHaveProperty('thresholds');
            expect(status).toHaveProperty('uptime');

            expect(status.metrics).toHaveProperty(PERFORMANCE_METRICS.MEMORY_USAGE);
            expect(status.metrics).toHaveProperty(PERFORMANCE_METRICS.CPU_USAGE);
        });
    });

    describe('metric history management', () => {
        test('should return metric history with limit', async () => {
            // Record 20 metrics
            for (let i = 0; i < 20; i++) {
                await performanceMonitoringService.recordMetric(
                    PERFORMANCE_METRICS.THROUGHPUT,
                    100 + i
                );
            }

            const history = performanceMonitoringService.getMetricHistory(PERFORMANCE_METRICS.THROUGHPUT, 10);
            expect(history.length).toBe(10);

            // Should return the most recent 10
            expect(history[history.length - 1].value).toBe(119);
        });

        test('should clear old history correctly', async () => {
            // Record some metrics with old timestamps
            await performanceMonitoringService.recordMetric(PERFORMANCE_METRICS.MEMORY_USAGE, 0.5);
            await performanceMonitoringService.recordMetric(PERFORMANCE_METRICS.CPU_USAGE, 0.6);

            expect(performanceMonitoringService.metricHistory.size).toBe(2);

            // Manually set old timestamps for testing
            const memoryHistory = performanceMonitoringService.metricHistory.get(PERFORMANCE_METRICS.MEMORY_USAGE);
            const cpuHistory = performanceMonitoringService.metricHistory.get(PERFORMANCE_METRICS.CPU_USAGE);

            if (memoryHistory && memoryHistory.length > 0) {
                memoryHistory[0].timestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago
            }
            if (cpuHistory && cpuHistory.length > 0) {
                cpuHistory[0].timestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago
            }

            const cleared = performanceMonitoringService.clearOldHistory(24); // Clear items older than 24 hours
            expect(cleared).toBe(2);
        });
    });
});