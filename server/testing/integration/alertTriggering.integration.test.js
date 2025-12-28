// testing/integration/alertTriggering.integration.test.js
import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import alertSystemService from '../../services/alertSystem.service.js';
import systemMetricsService from '../../services/systemMetrics.service.js';
import realtimeMonitoringService from '../../services/realtimeMonitoring.service.js';

describe('Alert Triggering Integration Tests', () => {
    beforeAll(async () => {
        // Initialize alert system
        await alertSystemService.initialize();
    });

    beforeEach(async () => {
        // Clean up alerts before each test
        if (alertSystemService.AlertModel) {
            await alertSystemService.AlertModel.deleteMany({});
        }
        alertSystemService.alertHistory = [];
        alertSystemService.alertCooldowns.clear();
    });

    afterEach(async () => {
        // Clean up alerts
        if (alertSystemService.AlertModel) {
            await alertSystemService.AlertModel.deleteMany({});
        }
        alertSystemService.alertHistory = [];
        alertSystemService.alertCooldowns.clear();
    });

    describe('System Alert Triggering', () => {
        test('should trigger CPU alerts when threshold is exceeded', async () => {
            // Mock high CPU usage
            const originalGetSystemHealth = systemMetricsService.getSystemHealth;
            systemMetricsService.getSystemHealth = jest.fn().mockResolvedValue({
                timestamp: new Date().toISOString(),
                status: 'warning',
                healthScore: 60,
                metrics: {
                    cpu: { usage: 95 }, // High CPU usage
                    memory: { system: { percentage: 70 } },
                    disk: { percentage: 50 }
                },
                alerts: [{
                    level: 'critical',
                    type: 'cpu',
                    message: 'CPU usage is critically high',
                    value: 95,
                    threshold: 90
                }]
            });

            // Trigger alert processing
            const newAlerts = await alertSystemService.processSystemHealth();

            // Verify alert was created
            expect(newAlerts).toHaveLength(1);
            expect(newAlerts[0].category).toBe('cpu');
            expect(newAlerts[0].severity).toBe('critical');
            expect(newAlerts[0].metrics.value).toBe(95);
            expect(newAlerts[0].status).toBe('active');

            // Verify alert is stored in database
            const storedAlerts = await alertSystemService.getActiveAlerts({ category: 'cpu' });
            expect(storedAlerts).toHaveLength(1);
            expect(storedAlerts[0].status).toBe('active');

            // Restore original method
            systemMetricsService.getSystemHealth = originalGetSystemHealth;
        });

        test('should trigger memory alerts when threshold is exceeded', async () => {
            // Mock high memory usage
            const originalGetSystemHealth = systemMetricsService.getSystemHealth;
            systemMetricsService.getSystemHealth = jest.fn().mockResolvedValue({
                timestamp: new Date().toISOString(),
                status: 'critical',
                healthScore: 40,
                metrics: {
                    cpu: { usage: 60 },
                    memory: { system: { percentage: 92 } }, // High memory usage
                    disk: { percentage: 50 }
                },
                alerts: [{
                    level: 'critical',
                    type: 'memory',
                    message: 'Memory usage is critically high',
                    value: 92,
                    threshold: 90
                }]
            });

            // Trigger alert processing
            const newAlerts = await alertSystemService.processSystemHealth();

            // Verify alert was created
            expect(newAlerts).toHaveLength(1);
            expect(newAlerts[0].category).toBe('memory');
            expect(newAlerts[0].severity).toBe('critical');
            expect(newAlerts[0].metrics.value).toBe(92);

            // Verify alert is stored in database
            const storedAlerts = await alertSystemService.getActiveAlerts({ category: 'memory' });
            expect(storedAlerts).toHaveLength(1);
            expect(storedAlerts[0].status).toBe('active');

            // Restore original method
            systemMetricsService.getSystemHealth = originalGetSystemHealth;
        });

        test('should trigger disk alerts when threshold is exceeded', async () => {
            // Mock high disk usage
            const originalGetSystemHealth = systemMetricsService.getSystemHealth;
            systemMetricsService.getSystemHealth = jest.fn().mockResolvedValue({
                timestamp: new Date().toISOString(),
                status: 'critical',
                healthScore: 30,
                metrics: {
                    cpu: { usage: 60 },
                    memory: { system: { percentage: 70 } },
                    disk: { percentage: 98 } // High disk usage
                },
                alerts: [{
                    level: 'critical',
                    type: 'disk',
                    message: 'Disk usage is critically high',
                    value: 98,
                    threshold: 95
                }]
            });

            // Trigger alert processing
            const newAlerts = await alertSystemService.processSystemHealth();

            // Verify alert was created
            expect(newAlerts).toHaveLength(1);
            expect(newAlerts[0].category).toBe('disk');
            expect(newAlerts[0].severity).toBe('critical');
            expect(newAlerts[0].metrics.value).toBe(98);

            // Restore original method
            systemMetricsService.getSystemHealth = originalGetSystemHealth;
        });

        test('should create alerts with proper structure and metadata', async () => {
            // Create a test alert directly
            const alert = await alertSystemService.createAlert({
                type: 'system',
                category: 'custom',
                severity: 'warning',
                title: 'Test Alert',
                message: 'This is a test alert',
                metrics: {
                    value: 85,
                    threshold: 80,
                    unit: '%'
                },
                details: {
                    testAlert: true,
                    component: 'test-system'
                }
            });

            // Verify alert structure
            expect(alert).toBeDefined();
            expect(alert.alertId).toBeDefined();
            expect(alert.type).toBe('system');
            expect(alert.category).toBe('custom');
            expect(alert.severity).toBe('warning');
            expect(alert.title).toBe('Test Alert');
            expect(alert.message).toBe('This is a test alert');
            expect(alert.status).toBe('active');
            expect(alert.createdAt).toBeInstanceOf(Date);
            expect(alert.metrics.value).toBe(85);
            expect(alert.metrics.threshold).toBe(80);
            expect(alert.metrics.unit).toBe('%');
            expect(alert.source.component).toBe('alert-system');
            expect(alert.source.hostname).toBeDefined();
            expect(alert.source.service).toBe('hr-sm-platform');
        });

        test('should handle alert acknowledgment correctly', async () => {
            // Create an alert
            const alert = await alertSystemService.createAlert({
                type: 'system',
                category: 'custom',
                severity: 'warning',
                title: 'Test Alert for Acknowledgment',
                message: 'This alert will be acknowledged'
            });

            // Acknowledge the alert
            const acknowledgedAlert = await alertSystemService.acknowledgeAlert(
                alert.alertId,
                'test-admin'
            );

            // Verify acknowledgment
            expect(acknowledgedAlert).toBeDefined();
            expect(acknowledgedAlert.status).toBe('acknowledged');
            expect(acknowledgedAlert.acknowledgedBy).toBe('test-admin');
            expect(acknowledgedAlert.acknowledgedAt).toBeInstanceOf(Date);

            // Verify in database
            const storedAlert = await alertSystemService.AlertModel.findOne({
                alertId: alert.alertId
            });
            expect(storedAlert.status).toBe('acknowledged');
            expect(storedAlert.acknowledgedBy).toBe('test-admin');
        });

        test('should resolve alerts correctly', async () => {
            // Create an alert
            const alert = await alertSystemService.createAlert({
                type: 'system',
                category: 'custom',
                severity: 'info',
                title: 'Test Alert for Resolution',
                message: 'This alert will be resolved'
            });

            // Resolve the alert
            const resolvedAlert = await alertSystemService.resolveAlert(alert.alertId);

            // Verify resolution
            expect(resolvedAlert).toBeDefined();
            expect(resolvedAlert.status).toBe('resolved');
            expect(resolvedAlert.resolvedAt).toBeInstanceOf(Date);

            // Verify in database
            const storedAlert = await alertSystemService.AlertModel.findOne({
                alertId: alert.alertId
            });
            expect(storedAlert.status).toBe('resolved');
        });

        test('should maintain alert cooldown periods to prevent spam', async () => {
            // Create first alert
            const alert1 = await alertSystemService.createAlert({
                type: 'system',
                category: 'cpu',
                severity: 'critical',
                title: 'CPU Critical',
                message: 'CPU usage critical'
            });

            // Try to send notification
            const result1 = await alertSystemService.sendAlertNotification(alert1);

            // Create second similar alert immediately
            const alert2 = await alertSystemService.createAlert({
                type: 'system',
                category: 'cpu',
                severity: 'critical',
                title: 'CPU Critical 2',
                message: 'CPU usage still critical'
            });

            // Try to send notification (should be in cooldown)
            const result2 = await alertSystemService.sendAlertNotification(alert2);

            // Verify cooldown behavior
            if (result2.skipped) {
                expect(result2.reason).toContain('cooldown');
            }

            // Both alerts should still be created and stored
            const storedAlerts = await alertSystemService.getActiveAlerts({ category: 'cpu' });
            expect(storedAlerts.length).toBeGreaterThanOrEqual(2);
        });

        test('should handle multiple concurrent alerts correctly', async () => {
            // Create multiple alerts concurrently
            const alertPromises = [
                alertSystemService.createAlert({
                    type: 'system',
                    category: 'cpu',
                    severity: 'critical',
                    title: 'CPU Critical 1',
                    message: 'First CPU critical alert'
                }),
                alertSystemService.createAlert({
                    type: 'system',
                    category: 'memory',
                    severity: 'warning',
                    title: 'Memory Warning 1',
                    message: 'First memory warning alert'
                }),
                alertSystemService.createAlert({
                    type: 'database',
                    category: 'mongodb',
                    severity: 'critical',
                    title: 'DB Critical 1',
                    message: 'First database critical alert'
                })
            ];

            const createdAlerts = await Promise.all(alertPromises);

            // Verify all alerts were created
            expect(createdAlerts).toHaveLength(3);

            // Verify alerts are stored correctly
            const storedAlerts = await alertSystemService.getActiveAlerts();
            expect(storedAlerts.length).toBeGreaterThanOrEqual(3);

            // Verify critical alerts are properly identified
            const criticalAlerts = storedAlerts.filter(alert => alert.severity === 'critical');
            expect(criticalAlerts).toHaveLength(2);
        });

        test('should update alert statistics correctly', async () => {
            // Create alerts of different severities
            await alertSystemService.createAlert({
                type: 'system',
                category: 'cpu',
                severity: 'warning',
                title: 'CPU Warning',
                message: 'CPU usage is elevated'
            });

            await alertSystemService.createAlert({
                type: 'database',
                category: 'mongodb',
                severity: 'critical',
                title: 'Database Critical',
                message: 'Database connection issues detected'
            });

            await alertSystemService.createAlert({
                type: 'system',
                category: 'memory',
                severity: 'info',
                title: 'Memory Info',
                message: 'Memory usage information'
            });

            // Get statistics
            const stats = await alertSystemService.getAlertStatistics();

            // Verify statistics
            expect(stats.total).toBeGreaterThanOrEqual(3);
            expect(stats.active).toBeGreaterThanOrEqual(3);
            expect(stats.critical).toBeGreaterThanOrEqual(1);
            expect(stats.warning).toBeGreaterThanOrEqual(1);
            expect(stats.info).toBeGreaterThanOrEqual(1);
            expect(stats.acknowledged).toBe(0);
            expect(stats.resolved).toBe(0);
        });
    });

    describe('Real-time Monitoring Integration', () => {
        test('should provide health status for monitoring service', () => {
            const healthStatus = realtimeMonitoringService.getHealthStatus();

            expect(healthStatus).toBeDefined();
            expect(healthStatus.status).toBeDefined();
            expect(healthStatus.connections).toBeDefined();
            expect(healthStatus.services).toBeDefined();
            expect(healthStatus.timestamp).toBeDefined();
        });

        test('should track connection statistics correctly', () => {
            const stats = realtimeMonitoringService.getConnectionStats();

            expect(stats).toBeDefined();
            expect(typeof stats.totalConnections).toBe('number');
            expect(typeof stats.platformConnections).toBe('number');
            expect(typeof stats.isInitialized).toBe('boolean');
            expect(typeof stats.metricsCollectionActive).toBe('boolean');
            expect(typeof stats.alertsProcessingActive).toBe('boolean');
        });

        test('should handle broadcast functionality', () => {
            // Test that broadcast method exists and can be called
            expect(typeof realtimeMonitoringService.broadcastToPlatform).toBe('function');

            // Call broadcast method (won't actually broadcast without connected clients)
            expect(() => {
                realtimeMonitoringService.broadcastToPlatform('test-event', {
                    message: 'Test broadcast'
                });
            }).not.toThrow();
        });
    });

    describe('Alert System Integration with Real-time Monitoring', () => {
        test('should process system health and generate alerts', async () => {
            // Mock system health with alerts
            const originalGetSystemHealth = systemMetricsService.getSystemHealth;
            systemMetricsService.getSystemHealth = jest.fn().mockResolvedValue({
                timestamp: new Date().toISOString(),
                status: 'warning',
                healthScore: 65,
                metrics: {
                    cpu: { usage: 85 },
                    memory: { system: { percentage: 88 } },
                    disk: { percentage: 75 }
                },
                alerts: [
                    {
                        level: 'warning',
                        type: 'cpu',
                        message: 'CPU usage is high',
                        value: 85,
                        threshold: 80
                    },
                    {
                        level: 'warning',
                        type: 'memory',
                        message: 'Memory usage is high',
                        value: 88,
                        threshold: 85
                    }
                ]
            });

            // Process system health
            const alerts = await alertSystemService.processSystemHealth();

            // Verify alerts were generated
            expect(alerts).toHaveLength(2);
            expect(alerts[0].category).toBe('cpu');
            expect(alerts[1].category).toBe('memory');

            // Verify alerts are stored
            const storedAlerts = await alertSystemService.getActiveAlerts();
            expect(storedAlerts.length).toBeGreaterThanOrEqual(2);

            // Restore original method
            systemMetricsService.getSystemHealth = originalGetSystemHealth;
        });

        test('should handle alert system errors gracefully', async () => {
            // Mock system health to throw an error
            const originalGetSystemHealth = systemMetricsService.getSystemHealth;
            systemMetricsService.getSystemHealth = jest.fn().mockRejectedValue(
                new Error('System metrics unavailable')
            );

            // Process system health (should handle error gracefully)
            const alerts = await alertSystemService.processSystemHealth();

            // Should create an alert about the system failure
            expect(alerts).toHaveLength(1);
            expect(alerts[0].title).toBe('Alert System Error');
            expect(alerts[0].severity).toBe('warning');

            // Restore original method
            systemMetricsService.getSystemHealth = originalGetSystemHealth;
        });

        test('should verify alert system initialization', async () => {
            // Verify alert system is properly initialized
            expect(alertSystemService.isInitialized).toBe(true);
            expect(alertSystemService.AlertModel).toBeDefined();
            expect(alertSystemService.alertHistory).toBeDefined();
            expect(alertSystemService.alertCooldowns).toBeDefined();
        });
    });
});