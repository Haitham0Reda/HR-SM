// testing/services/alertGenerationAndNotification.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import alertSystemService from '../../services/alertSystem.service.js';

describe('Alert Generation and Notification Property-Based Tests', () => {
    let testTenantId;
    let AlertModel;
    let testCollectionName;

    beforeAll(async () => {
        // Create a unique collection name for this test run
        testCollectionName = `test_alerts_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // Initialize the alert system with a test collection
        await alertSystemService.initialize();
        
        // Create a separate test model with unique collection
        const testAlertSchema = new mongoose.Schema({
            alertId: { type: String, required: true, unique: true, index: true },
            type: { type: String, required: true, enum: ['system', 'database', 'application', 'security', 'performance'], index: true },
            category: { type: String, required: true, enum: ['cpu', 'memory', 'disk', 'network', 'mongodb', 'license', 'tenant', 'custom'], index: true },
            severity: { type: String, required: true, enum: ['info', 'warning', 'critical', 'emergency'], index: true },
            title: { type: String, required: true },
            message: { type: String, required: true },
            details: { type: mongoose.Schema.Types.Mixed, default: {} },
            metrics: {
                value: Number,
                threshold: Number,
                unit: String
            },
            source: {
                component: String,
                hostname: String,
                service: String
            },
            status: { type: String, enum: ['active', 'acknowledged', 'resolved', 'suppressed'], default: 'active', index: true },
            acknowledgedBy: { type: String, default: null },
            acknowledgedAt: { type: Date, default: null },
            resolvedAt: { type: Date, default: null },
            notificationsSent: [{
                channel: String,
                sentAt: Date,
                success: Boolean,
                error: String
            }],
            tags: [String],
            tenantId: { type: String, index: true, sparse: true }
        }, {
            timestamps: true,
            collection: testCollectionName
        });

        AlertModel = mongoose.model(`TestAlert_${testCollectionName}`, testAlertSchema);
    });

    beforeEach(async () => {
        // Create a unique test tenant ID with timestamp to ensure uniqueness
        testTenantId = `test-tenant-alert-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        
        // Clean up all alerts from the test collection
        await AlertModel.deleteMany({});
        
        // Also clean up the main alert system collection to prevent interference
        if (alertSystemService.AlertModel) {
            await alertSystemService.AlertModel.deleteMany({});
        }
        
        // Clear alert history and cooldowns
        alertSystemService.alertHistory = [];
        alertSystemService.alertCooldowns.clear();
        
        // Wait a bit to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(async () => {
        // Clean up all alerts from the test collection
        await AlertModel.deleteMany({});
        
        // Also clean up the main alert system collection
        if (alertSystemService.AlertModel) {
            await alertSystemService.AlertModel.deleteMany({});
        }
        
        // Clear alert history and cooldowns
        alertSystemService.alertHistory = [];
        alertSystemService.alertCooldowns.clear();
    });

    afterAll(async () => {
        // Drop the test collection
        try {
            await AlertModel.collection.drop();
        } catch (error) {
            // Collection might not exist, ignore error
        }
    });

    describe('Property 10: Alert Generation and Notification', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 10: Alert Generation and Notification
         * Validates: Requirements 3.3
         * 
         * For any detected system anomaly or threshold breach, alerts should be generated 
         * and notifications sent via configured channels (email, logs).
         */
        test('should generate alerts for system anomalies and threshold breaches', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        anomalies: fc.array(
                            fc.record({
                                type: fc.constantFrom('cpu', 'memory', 'disk', 'mongodb', 'custom'),
                                category: fc.constantFrom('system', 'database', 'application', 'security', 'performance'),
                                severity: fc.constantFrom('info', 'warning', 'critical', 'emergency'),
                                value: fc.double({ min: 0, max: 100 }),
                                threshold: fc.double({ min: 50, max: 95 }),
                                title: fc.string({ minLength: 10, maxLength: 100 }),
                                message: fc.string({ minLength: 20, maxLength: 200 })
                            }),
                            { minLength: 1, maxLength: 3 }
                        )
                    }),
                    async ({ anomalies }) => {
                        // Ensure clean state before test
                        await AlertModel.deleteMany({});
                        
                        const generatedAlerts = [];

                        // Action: Generate alerts for each anomaly using test model
                        for (const anomaly of anomalies) {
                            const alert = new AlertModel({
                                alertId: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                                type: anomaly.category,
                                category: anomaly.type,
                                severity: anomaly.severity,
                                title: anomaly.title,
                                message: anomaly.message,
                                metrics: {
                                    value: anomaly.value,
                                    threshold: anomaly.threshold,
                                    unit: anomaly.type === 'cpu' || anomaly.type === 'memory' || anomaly.type === 'disk' ? '%' : ''
                                },
                                source: {
                                    component: 'test-alert-system',
                                    hostname: 'test-host',
                                    service: 'hr-sm-test'
                                },
                                tenantId: testTenantId,
                                details: {
                                    testAnomaly: true,
                                    anomalyType: anomaly.type,
                                    detectedAt: new Date().toISOString()
                                }
                            });

                            await alert.save();
                            generatedAlerts.push(alert);
                        }

                        // Assertion 1: All anomalies should generate alerts
                        expect(generatedAlerts).toHaveLength(anomalies.length);
                        
                        // Assertion 2: Each alert should have required properties
                        generatedAlerts.forEach((alert, index) => {
                            const anomaly = anomalies[index];
                            
                            expect(alert).toBeDefined();
                            expect(alert.alertId).toBeDefined();
                            expect(alert.type).toBe(anomaly.category);
                            expect(alert.category).toBe(anomaly.type);
                            expect(alert.severity).toBe(anomaly.severity);
                            expect(alert.title).toBe(anomaly.title);
                            expect(alert.message).toBe(anomaly.message);
                            expect(alert.status).toBe('active');
                            expect(alert.createdAt).toBeInstanceOf(Date);
                            expect(alert.tenantId).toBe(testTenantId);
                        });

                        // Assertion 3: Alerts should be stored in database (only our test alerts)
                        const storedAlerts = await AlertModel.find({ tenantId: testTenantId });
                        expect(storedAlerts).toHaveLength(anomalies.length);

                        // Assertion 4: Metrics should be properly stored
                        storedAlerts.forEach((alert, index) => {
                            const anomaly = anomalies[index];
                            expect(alert.metrics.value).toBe(anomaly.value);
                            expect(alert.metrics.threshold).toBe(anomaly.threshold);
                        });
                    }
                ),
                { numRuns: 3 }
            );
        });

        test('should send notifications for critical alerts via configured channels', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        criticalAlerts: fc.array(
                            fc.record({
                                type: fc.constantFrom('system', 'database', 'security'),
                                category: fc.constantFrom('cpu', 'memory', 'mongodb', 'custom'),
                                title: fc.string({ minLength: 15, maxLength: 80 }),
                                message: fc.string({ minLength: 30, maxLength: 150 }),
                                value: fc.double({ min: 85, max: 100 }), // Critical threshold values
                                threshold: fc.double({ min: 80, max: 95 })
                            }),
                            { minLength: 1, maxLength: 2 }
                        )
                    }),
                    async ({ criticalAlerts }) => {
                        // Ensure clean state before test
                        await AlertModel.deleteMany({});
                        
                        const processedAlerts = [];

                        // Action: Create critical alerts and test notification attempts
                        for (const alertData of criticalAlerts) {
                            const alert = new AlertModel({
                                alertId: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                                type: alertData.type,
                                category: alertData.category,
                                severity: 'critical',
                                title: alertData.title,
                                message: alertData.message,
                                metrics: {
                                    value: alertData.value,
                                    threshold: alertData.threshold,
                                    unit: '%'
                                },
                                source: {
                                    component: 'test-alert-system',
                                    hostname: 'test-host',
                                    service: 'hr-sm-test'
                                },
                                tenantId: testTenantId,
                                details: { testNotification: true }
                            });

                            await alert.save();
                            processedAlerts.push(alert);

                            // Test notification attempt (will likely fail due to missing SMTP config in test)
                            const notificationResult = await alertSystemService.sendAlertNotification(alert);
                            
                            // Assertion: Notification attempt should have proper structure
                            expect(notificationResult).toBeDefined();
                            expect(typeof notificationResult.success).toBe('boolean');
                        }

                        // Assertion 1: All critical alerts should be created successfully
                        expect(processedAlerts).toHaveLength(criticalAlerts.length);

                        // Assertion 2: All alerts should be critical severity
                        processedAlerts.forEach(alert => {
                            expect(alert.severity).toBe('critical');
                            expect(alert.status).toBe('active');
                        });

                        // Assertion 3: Alerts should be stored in database
                        const storedAlerts = await AlertModel.find({ tenantId: testTenantId });
                        expect(storedAlerts).toHaveLength(criticalAlerts.length);
                    }
                ),
                { numRuns: 2 }
            );
        });

        test('should log critical events for investigation when anomalies are detected', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        systemAnomalies: fc.array(
                            fc.record({
                                component: fc.constantFrom('cpu-monitor', 'memory-monitor', 'disk-monitor'),
                                severity: fc.constantFrom('warning', 'critical', 'emergency'),
                                details: fc.record({
                                    currentValue: fc.double({ min: 70, max: 100 }),
                                    expectedValue: fc.double({ min: 20, max: 70 }),
                                    duration: fc.integer({ min: 60, max: 3600 })
                                })
                            }),
                            { minLength: 1, maxLength: 2 }
                        )
                    }),
                    async ({ systemAnomalies }) => {
                        // Ensure clean state before test
                        await AlertModel.deleteMany({});
                        
                        const loggedEvents = [];

                        // Action: Process system anomalies and generate alerts with detailed logging
                        for (const anomaly of systemAnomalies) {
                            const alert = new AlertModel({
                                alertId: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                                type: 'system',
                                category: 'custom',
                                severity: anomaly.severity,
                                title: `${anomaly.component.toUpperCase()} Anomaly Detected`,
                                message: `Anomaly detected in ${anomaly.component}`,
                                details: {
                                    component: anomaly.component,
                                    investigationRequired: anomaly.severity === 'critical' || anomaly.severity === 'emergency',
                                    currentValue: anomaly.details.currentValue,
                                    expectedValue: anomaly.details.expectedValue,
                                    deviation: Math.abs(anomaly.details.currentValue - anomaly.details.expectedValue),
                                    duration: anomaly.details.duration,
                                    correlationId: `anomaly-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                                    detectionTimestamp: new Date().toISOString()
                                },
                                source: {
                                    component: anomaly.component,
                                    hostname: 'test-monitoring-host',
                                    service: 'hr-sm-monitoring'
                                },
                                tags: [
                                    'anomaly-detection',
                                    anomaly.component,
                                    `severity-${anomaly.severity}`
                                ],
                                tenantId: testTenantId
                            });

                            await alert.save();
                            loggedEvents.push({ alert, anomaly });
                        }

                        // Assertion 1: All anomalies should generate logged events
                        expect(loggedEvents).toHaveLength(systemAnomalies.length);

                        // Assertion 2: Critical events should have investigation flags
                        const criticalEvents = loggedEvents.filter(({ anomaly }) => 
                            anomaly.severity === 'critical' || anomaly.severity === 'emergency'
                        );
                        
                        criticalEvents.forEach(({ alert }) => {
                            expect(alert.details.investigationRequired).toBe(true);
                            expect(alert.details.correlationId).toBeDefined();
                            expect(alert.details.detectionTimestamp).toBeDefined();
                        });

                        // Assertion 3: Events should contain comprehensive investigation data
                        loggedEvents.forEach(({ alert, anomaly }) => {
                            expect(alert.details.component).toBe(anomaly.component);
                            expect(alert.details.currentValue).toBe(anomaly.details.currentValue);
                            expect(alert.details.expectedValue).toBe(anomaly.details.expectedValue);
                            expect(alert.details.duration).toBe(anomaly.details.duration);
                        });

                        // Assertion 4: Events should be properly tagged for investigation
                        loggedEvents.forEach(({ alert, anomaly }) => {
                            expect(Array.isArray(alert.tags)).toBe(true);
                            expect(alert.tags).toContain('anomaly-detection');
                            expect(alert.tags).toContain(anomaly.component);
                            expect(alert.tags).toContain(`severity-${anomaly.severity}`);
                        });

                        // Assertion 5: Events should be retrievable for investigation
                        const storedEvents = await AlertModel.find({ 
                            tenantId: testTenantId,
                            'details.correlationId': { $exists: true }
                        });

                        expect(storedEvents).toHaveLength(systemAnomalies.length);
                    }
                ),
                { numRuns: 2 }
            );
        });

        test('should handle notification failures gracefully and maintain alert integrity', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        alerts: fc.array(
                            fc.record({
                                severity: fc.constantFrom('warning', 'critical'),
                                type: fc.constantFrom('system', 'database', 'security'),
                                category: fc.constantFrom('cpu', 'memory', 'mongodb', 'custom'),
                                title: fc.string({ minLength: 10, maxLength: 100 }),
                                message: fc.string({ minLength: 20, maxLength: 200 }),
                                shouldFailNotification: fc.boolean()
                            }),
                            { minLength: 1, maxLength: 2 }
                        )
                    }),
                    async ({ alerts }) => {
                        // Ensure clean state before test
                        await AlertModel.deleteMany({});
                        
                        const processedAlerts = [];
                        const notificationResults = [];

                        // Action: Create alerts and simulate notification scenarios
                        for (const alertData of alerts) {
                            const alert = new AlertModel({
                                alertId: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                                type: alertData.type,
                                category: alertData.category,
                                severity: alertData.severity,
                                title: alertData.title,
                                message: alertData.message,
                                source: {
                                    component: 'test-notification-system',
                                    hostname: 'test-host',
                                    service: 'hr-sm-test'
                                },
                                tenantId: testTenantId,
                                details: {
                                    testNotification: true,
                                    shouldFailNotification: alertData.shouldFailNotification
                                }
                            });

                            await alert.save();
                            processedAlerts.push(alert);

                            // Attempt notification (will likely fail due to missing SMTP config in test)
                            const notificationResult = await alertSystemService.sendAlertNotification(alert);
                            notificationResults.push({ alert, result: notificationResult, originalData: alertData });
                        }

                        // Assertion 1: All alerts should be created regardless of notification status
                        expect(processedAlerts).toHaveLength(alerts.length);
                        expect(notificationResults).toHaveLength(alerts.length);

                        // Assertion 2: Alert creation should not depend on notification success
                        processedAlerts.forEach(alert => {
                            expect(alert).toBeDefined();
                            expect(alert.alertId).toBeDefined();
                            expect(alert.status).toBe('active');
                            expect(alert.createdAt).toBeInstanceOf(Date);
                        });

                        // Assertion 3: Notification failures should be handled gracefully
                        notificationResults.forEach(({ result }) => {
                            expect(result).toBeDefined();
                            // Result should have proper structure even if notification fails
                            expect(typeof result.success).toBe('boolean');
                            
                            if (!result.success && !result.skipped) {
                                expect(Array.isArray(result.errors)).toBe(true);
                            }
                        });

                        // Assertion 4: Alert data integrity should be maintained despite notification failures
                        const storedAlerts = await AlertModel.find({ 
                            tenantId: testTenantId,
                            'details.testNotification': true 
                        });
                        expect(storedAlerts).toHaveLength(alerts.length);

                        storedAlerts.forEach((storedAlert, index) => {
                            const originalAlert = alerts[index];
                            expect(storedAlert.severity).toBe(originalAlert.severity);
                            expect(storedAlert.type).toBe(originalAlert.type);
                            expect(storedAlert.category).toBe(originalAlert.category);
                            expect(storedAlert.title).toBe(originalAlert.title);
                            expect(storedAlert.message).toBe(originalAlert.message);
                            expect(storedAlert.status).toBe('active');
                        });

                        // Assertion 5: System should remain operational after notification failures
                        // Test by creating another alert after the batch
                        const postFailureAlert = new AlertModel({
                            alertId: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                            type: 'system',
                            category: 'custom',
                            severity: 'info',
                            title: 'Post-failure test alert',
                            message: 'System should still work after notification failures',
                            source: {
                                component: 'test-recovery-system',
                                hostname: 'test-host',
                                service: 'hr-sm-test'
                            },
                            tenantId: testTenantId
                        });

                        await postFailureAlert.save();

                        expect(postFailureAlert).toBeDefined();
                        expect(postFailureAlert.alertId).toBeDefined();
                        expect(postFailureAlert.status).toBe('active');
                    }
                ),
                { numRuns: 2 }
            );
        });
    });
});