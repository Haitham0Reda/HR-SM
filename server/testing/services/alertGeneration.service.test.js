/**
 * Alert Generation Service Tests
 */

import { jest } from '@jest/globals';
import alertGenerationService, { ALERT_SEVERITY, ALERT_TYPES, ALERT_CHANNELS } from '../../services/alertGeneration.service.js';

// Mock nodemailer
jest.unstable_mockModule('nodemailer', () => ({
    default: {
        createTransporter: jest.fn(() => ({
            sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
        }))
    }
}));

// Mock platform logger
jest.unstable_mockModule('../../utils/platformLogger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('AlertGenerationService', () => {
    beforeEach(() => {
        // Clear any existing alert history
        alertGenerationService.alertHistory.clear();
        alertGenerationService.rateLimiters.clear();
        jest.clearAllMocks();
    });

    describe('generateAlert', () => {
        test('should generate alert with required fields', async () => {
            const alertData = {
                severity: ALERT_SEVERITY.HIGH,
                type: ALERT_TYPES.SECURITY_BREACH,
                title: 'Test Security Alert',
                message: 'Test security breach detected',
                source: 'test'
            };

            const alert = await alertGenerationService.generateAlert(alertData);

            expect(alert).toBeDefined();
            expect(alert.id).toBeDefined();
            expect(alert.severity).toBe(ALERT_SEVERITY.HIGH);
            expect(alert.type).toBe(ALERT_TYPES.SECURITY_BREACH);
            expect(alert.title).toBe('Test Security Alert');
            expect(alert.message).toBe('Test security breach detected');
            expect(alert.timestamp).toBeDefined();
        });

        test('should apply default values for missing fields', async () => {
            const alertData = {
                message: 'Test alert message'
            };

            const alert = await alertGenerationService.generateAlert(alertData);

            expect(alert.severity).toBe(ALERT_SEVERITY.MEDIUM);
            expect(alert.type).toBe(ALERT_TYPES.SYSTEM_ERROR);
            expect(alert.title).toBe('System Alert');
            expect(alert.source).toBe('system');
        });

        test('should store alert in history', async () => {
            const alertData = {
                severity: ALERT_SEVERITY.CRITICAL,
                message: 'Critical test alert'
            };

            const alert = await alertGenerationService.generateAlert(alertData);

            expect(alertGenerationService.alertHistory.has(alert.id)).toBe(true);
            const storedAlert = alertGenerationService.alertHistory.get(alert.id);
            expect(storedAlert.processedAt).toBeDefined();
        });
    });

    describe('rate limiting', () => {
        test('should enforce rate limits', async () => {
            const alertData = {
                severity: ALERT_SEVERITY.CRITICAL,
                type: ALERT_TYPES.SECURITY_BREACH,
                message: 'Rate limit test'
            };

            // Generate multiple alerts quickly
            const alerts = [];
            for (let i = 0; i < 15; i++) {
                const alert = await alertGenerationService.generateAlert(alertData);
                if (alert) alerts.push(alert);
            }

            // Should have fewer alerts than attempts due to rate limiting
            expect(alerts.length).toBeLessThan(15);
            expect(alerts.length).toBeGreaterThan(0);
        });

        test('should not rate limit different alert types', async () => {
            const securityAlert = {
                severity: ALERT_SEVERITY.CRITICAL,
                type: ALERT_TYPES.SECURITY_BREACH,
                message: 'Security alert'
            };

            const performanceAlert = {
                severity: ALERT_SEVERITY.CRITICAL,
                type: ALERT_TYPES.PERFORMANCE_DEGRADATION,
                message: 'Performance alert'
            };

            const alert1 = await alertGenerationService.generateAlert(securityAlert);
            const alert2 = await alertGenerationService.generateAlert(performanceAlert);

            expect(alert1).toBeDefined();
            expect(alert2).toBeDefined();
            expect(alert1.type).not.toBe(alert2.type);
        });
    });

    describe('alert rules', () => {
        test('should match alerts to rules correctly', () => {
            const alert = {
                severity: ALERT_SEVERITY.CRITICAL,
                type: ALERT_TYPES.SECURITY_BREACH,
                source: 'test'
            };

            const matchingRules = alertGenerationService.findMatchingRules(alert);
            expect(matchingRules.length).toBeGreaterThan(0);

            // Should match the critical security rule
            const criticalSecurityRule = matchingRules.find(rule => rule.id === 'critical_security');
            expect(criticalSecurityRule).toBeDefined();
        });

        test('should not match alerts that do not meet rule conditions', () => {
            const alert = {
                severity: ALERT_SEVERITY.LOW,
                type: ALERT_TYPES.SYSTEM_ERROR,
                source: 'test'
            };

            const matchingRules = alertGenerationService.findMatchingRules(alert);
            
            // Should not match critical security rule
            const criticalSecurityRule = matchingRules.find(rule => rule.id === 'critical_security');
            expect(criticalSecurityRule).toBeUndefined();
        });

        test('should add and remove alert rules', () => {
            const testRule = {
                id: 'test_rule',
                conditions: {
                    severity: ALERT_SEVERITY.HIGH,
                    type: ALERT_TYPES.SYSTEM_ERROR
                },
                channels: [ALERT_CHANNELS.LOG]
            };

            alertGenerationService.addAlertRule(testRule);
            expect(alertGenerationService.alertRules.has('test_rule')).toBe(true);

            const removed = alertGenerationService.removeAlertRule('test_rule');
            expect(removed).toBe(true);
            expect(alertGenerationService.alertRules.has('test_rule')).toBe(false);
        });
    });

    describe('alert statistics', () => {
        test('should return correct alert statistics', () => {
            const stats = alertGenerationService.getAlertStats();
            
            expect(stats).toHaveProperty('queueLength');
            expect(stats).toHaveProperty('historyCount');
            expect(stats).toHaveProperty('rulesCount');
            expect(stats).toHaveProperty('rateLimitersActive');
            
            expect(typeof stats.queueLength).toBe('number');
            expect(typeof stats.historyCount).toBe('number');
            expect(typeof stats.rulesCount).toBe('number');
            expect(typeof stats.rateLimitersActive).toBe('number');
        });
    });

    describe('alert history cleanup', () => {
        test('should clear old alerts from history', async () => {
            // Generate some test alerts
            await alertGenerationService.generateAlert({
                message: 'Test alert 1'
            });
            await alertGenerationService.generateAlert({
                message: 'Test alert 2'
            });

            expect(alertGenerationService.alertHistory.size).toBe(2);

            // Clear alerts older than 0 hours (should clear all)
            const cleared = alertGenerationService.clearAlertHistory(0);
            
            expect(cleared).toBe(2);
            expect(alertGenerationService.alertHistory.size).toBe(0);
        });
    });

    describe('email content generation', () => {
        test('should generate proper HTML email content', () => {
            const alert = {
                id: 'test-alert-id',
                severity: ALERT_SEVERITY.HIGH,
                title: 'Test Alert',
                message: 'This is a test alert message',
                timestamp: new Date().toISOString(),
                source: 'test',
                tenantId: 'test-tenant',
                correlationId: 'test-correlation-id',
                context: {
                    ipAddress: '192.168.1.1',
                    userAgent: 'Test User Agent'
                },
                metadata: {
                    testData: 'test value'
                }
            };

            const htmlContent = alertGenerationService.generateEmailContent(alert);

            expect(htmlContent).toContain('HIGH ALERT');
            expect(htmlContent).toContain('Test Alert');
            expect(htmlContent).toContain('This is a test alert message');
            expect(htmlContent).toContain('test-tenant');
            expect(htmlContent).toContain('test-correlation-id');
            expect(htmlContent).toContain('192.168.1.1');
            expect(htmlContent).toContain('Test User Agent');
            expect(htmlContent).toContain('testData');
        });
    });

    describe('severity color mapping', () => {
        test('should return correct colors for each severity level', () => {
            expect(alertGenerationService.getSeverityColor(ALERT_SEVERITY.CRITICAL)).toBe('#dc3545');
            expect(alertGenerationService.getSeverityColor(ALERT_SEVERITY.HIGH)).toBe('#fd7e14');
            expect(alertGenerationService.getSeverityColor(ALERT_SEVERITY.MEDIUM)).toBe('#ffc107');
            expect(alertGenerationService.getSeverityColor(ALERT_SEVERITY.LOW)).toBe('#28a745');
        });

        test('should return default color for unknown severity', () => {
            expect(alertGenerationService.getSeverityColor('unknown')).toBe('#6c757d');
        });
    });
});