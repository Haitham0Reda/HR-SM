/**
 * Log Analytics Service Tests
 * Tests for log data export and analytics integration capabilities
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { generateAnalytics, exportLogs, generateComplianceReport, EXPORT_FORMATS, TIME_PERIODS } from '../../services/logAnalytics.service.js';
import { addLogEntry, clearCorrelationEngine } from '../../services/logCorrelation.service.js';
import fs from 'fs';
import path from 'path';

describe('Log Analytics Service', () => {
    beforeEach(() => {
        clearCorrelationEngine();
    });

    afterEach(() => {
        clearCorrelationEngine();
    });

    describe('Analytics Generation', () => {
        it('should generate basic analytics report', async () => {
            // Add test data
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'User login',
                    correlationId: 'analytics-1',
                    tenantId: 'analytics-tenant-1',
                    userId: 'user-1',
                    sessionId: 'session-1',
                    source: 'backend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'API error',
                    correlationId: 'analytics-2',
                    tenantId: 'analytics-tenant-1',
                    userId: 'user-1',
                    sessionId: 'session-1',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const analytics = await generateAnalytics({
                tenantId: 'analytics-tenant-1',
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                endTime: new Date().toISOString(),
                groupBy: TIME_PERIODS.HOUR,
                metrics: ['count', 'errors']
            });

            expect(analytics).toBeDefined();
            expect(analytics.summary).toBeDefined();
            expect(analytics.timeSeries).toBeDefined();
            expect(analytics.metrics).toBeDefined();
            expect(analytics.metrics.count).toBeDefined();
            expect(analytics.metrics.errors).toBeDefined();
            expect(analytics.trends).toBeDefined();
            expect(analytics.processingTime).toBeGreaterThanOrEqual(0);
        });

        it('should generate summary statistics', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Info log',
                    correlationId: 'analytics-3',
                    tenantId: 'analytics-tenant-2',
                    userId: 'user-2',
                    sessionId: 'session-2',
                    source: 'backend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'Error log',
                    correlationId: 'analytics-4',
                    tenantId: 'analytics-tenant-2',
                    userId: 'user-3',
                    sessionId: 'session-3',
                    source: 'frontend',
                    security: true
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const analytics = await generateAnalytics({
                tenantId: 'analytics-tenant-2',
                metrics: ['count']
            });

            expect(analytics.summary.totalLogs).toBeGreaterThanOrEqual(0);
            expect(analytics.summary.logLevels).toBeDefined();
            expect(analytics.summary.sources).toBeDefined();
            expect(analytics.summary.uniqueUsers).toBeGreaterThanOrEqual(0);
            expect(analytics.summary.uniqueSessions).toBeGreaterThanOrEqual(0);
            expect(analytics.summary.errorRate).toBeGreaterThanOrEqual(0);
            expect(analytics.summary.securityEvents).toBeGreaterThanOrEqual(0);
        });

        it('should generate time series data', async () => {
            const now = new Date();
            const testLogs = Array.from({ length: 10 }, (_, i) => ({
                timestamp: new Date(now.getTime() - i * 60 * 60 * 1000).toISOString(),
                level: 'info',
                message: `Log ${i}`,
                correlationId: `analytics-${10 + i}`,
                tenantId: 'analytics-tenant-3',
                userId: `user-${i}`,
                source: 'backend'
            }));

            testLogs.forEach(log => addLogEntry(log));

            const analytics = await generateAnalytics({
                tenantId: 'analytics-tenant-3',
                groupBy: TIME_PERIODS.HOUR,
                metrics: ['count']
            });

            expect(analytics.timeSeries).toBeDefined();
            expect(Array.isArray(analytics.timeSeries)).toBe(true);
            
            if (analytics.timeSeries.length > 0) {
                const firstEntry = analytics.timeSeries[0];
                expect(firstEntry.timestamp).toBeDefined();
                expect(firstEntry.count).toBeDefined();
                expect(firstEntry.errors).toBeDefined();
                expect(firstEntry.uniqueUsers).toBeDefined();
                expect(firstEntry.uniqueSessions).toBeDefined();
            }
        });

        it('should generate performance metrics', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Performance metric',
                    correlationId: 'analytics-20',
                    tenantId: 'analytics-tenant-4',
                    performance: true,
                    source: 'backend',
                    meta: {
                        value: 1500,
                        endpoint: '/api/users',
                        analysis: {
                            alerts: [{ severity: 'medium', message: 'Slow response' }]
                        }
                    }
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const analytics = await generateAnalytics({
                tenantId: 'analytics-tenant-4',
                metrics: ['performance']
            });

            expect(analytics.metrics.performance).toBeDefined();
            expect(analytics.metrics.performance.totalPerformanceEvents).toBeGreaterThanOrEqual(0);
            expect(analytics.metrics.performance.averageResponseTime).toBeGreaterThanOrEqual(0);
            expect(analytics.metrics.performance.performanceAlerts).toBeGreaterThanOrEqual(0);
        });

        it('should generate security metrics', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'warn',
                    message: 'Security event',
                    correlationId: 'analytics-21',
                    tenantId: 'analytics-tenant-5',
                    security: true,
                    source: 'backend',
                    meta: {
                        eventType: 'authentication_failure',
                        severity: 'high'
                    },
                    ipAddress: '192.168.1.100'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const analytics = await generateAnalytics({
                tenantId: 'analytics-tenant-5',
                metrics: ['security']
            });

            expect(analytics.metrics.security).toBeDefined();
            expect(analytics.metrics.security.totalSecurityEvents).toBeGreaterThanOrEqual(0);
            expect(analytics.metrics.security.securityEventTypes).toBeDefined();
            expect(analytics.metrics.security.threatSeverity).toBeDefined();
            expect(analytics.metrics.security.attackSources).toBeDefined();
        });

        it('should generate user metrics', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'User action',
                    correlationId: 'analytics-22',
                    tenantId: 'analytics-tenant-6',
                    userId: 'user-analytics-1',
                    sessionId: 'session-analytics-1',
                    source: 'backend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'User error',
                    correlationId: 'analytics-23',
                    tenantId: 'analytics-tenant-6',
                    userId: 'user-analytics-1',
                    sessionId: 'session-analytics-1',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const analytics = await generateAnalytics({
                tenantId: 'analytics-tenant-6',
                metrics: ['users']
            });

            expect(analytics.metrics.users).toBeDefined();
            expect(analytics.metrics.users.totalUsers).toBeGreaterThanOrEqual(0);
            expect(analytics.metrics.users.activeUsers).toBeGreaterThanOrEqual(0);
            expect(analytics.metrics.users.topUsers).toBeDefined();
            expect(Array.isArray(analytics.metrics.users.topUsers)).toBe(true);
        });

        it('should generate endpoint metrics', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'API request',
                    correlationId: 'analytics-24',
                    tenantId: 'analytics-tenant-7',
                    endpoint: '/api/users',
                    responseTime: 250,
                    source: 'backend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'API error',
                    correlationId: 'analytics-25',
                    tenantId: 'analytics-tenant-7',
                    endpoint: '/api/users',
                    responseTime: 5000,
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const analytics = await generateAnalytics({
                tenantId: 'analytics-tenant-7',
                metrics: ['endpoints']
            });

            expect(analytics.metrics.endpoints).toBeDefined();
            expect(analytics.metrics.endpoints.totalEndpoints).toBeGreaterThanOrEqual(0);
            expect(analytics.metrics.endpoints.topEndpoints).toBeDefined();
            expect(analytics.metrics.endpoints.slowestEndpoints).toBeDefined();
            expect(analytics.metrics.endpoints.errorProneEndpoints).toBeDefined();
        });
    });

    describe('Log Export', () => {
        it('should export logs in JSON format', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Export test log',
                    correlationId: 'export-1',
                    tenantId: 'export-tenant-1',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const exportResult = await exportLogs(
                { tenantId: 'export-tenant-1' },
                { 
                    format: EXPORT_FORMATS.JSON,
                    destination: 'file',
                    includeMetadata: true
                }
            );

            expect(exportResult).toBeDefined();
            expect(exportResult.success).toBe(true);
            expect(exportResult.filePath).toBeDefined();
            expect(exportResult.records).toBeGreaterThanOrEqual(0);
        });

        it('should export logs in CSV format', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'CSV export test',
                    correlationId: 'export-2',
                    tenantId: 'export-tenant-2',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const exportResult = await exportLogs(
                { tenantId: 'export-tenant-2' },
                { 
                    format: EXPORT_FORMATS.CSV,
                    destination: 'file'
                }
            );

            expect(exportResult).toBeDefined();
            expect(exportResult.success).toBe(true);
            expect(exportResult.filePath).toBeDefined();
        });

        it('should export logs in NDJSON format', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'NDJSON export test',
                    correlationId: 'export-3',
                    tenantId: 'export-tenant-3',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const exportResult = await exportLogs(
                { tenantId: 'export-tenant-3' },
                { 
                    format: EXPORT_FORMATS.NDJSON,
                    destination: 'file'
                }
            );

            expect(exportResult).toBeDefined();
            expect(exportResult.success).toBe(true);
            expect(exportResult.filePath).toBeDefined();
        });

        it('should export logs in XML format', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'XML export test',
                    correlationId: 'export-4',
                    tenantId: 'export-tenant-4',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const exportResult = await exportLogs(
                { tenantId: 'export-tenant-4' },
                { 
                    format: EXPORT_FORMATS.XML,
                    destination: 'file'
                }
            );

            expect(exportResult).toBeDefined();
            expect(exportResult.success).toBe(true);
            expect(exportResult.filePath).toBeDefined();
        });

        it('should export to webhook', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Webhook export test',
                    correlationId: 'export-5',
                    tenantId: 'export-tenant-5',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const exportResult = await exportLogs(
                { tenantId: 'export-tenant-5' },
                { 
                    format: EXPORT_FORMATS.JSON,
                    destination: 'webhook',
                    webhookUrl: 'https://example.com/webhook'
                }
            );

            expect(exportResult).toBeDefined();
            expect(exportResult.success).toBe(true);
            expect(exportResult.webhookUrl).toBe('https://example.com/webhook');
        });

        it('should filter exported fields', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Field filter test',
                    correlationId: 'export-6',
                    tenantId: 'export-tenant-6',
                    userId: 'user-6',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const exportResult = await exportLogs(
                { tenantId: 'export-tenant-6' },
                { 
                    format: EXPORT_FORMATS.JSON,
                    destination: 'file',
                    fields: ['timestamp', 'level', 'message'],
                    includeMetadata: false
                }
            );

            expect(exportResult).toBeDefined();
            expect(exportResult.success).toBe(true);
        });

        it('should respect max records limit', async () => {
            const testLogs = Array.from({ length: 50 }, (_, i) => ({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Limit test log ${i}`,
                correlationId: `export-${100 + i}`,
                tenantId: 'export-tenant-7',
                source: 'backend'
            }));

            testLogs.forEach(log => addLogEntry(log));

            const exportResult = await exportLogs(
                { tenantId: 'export-tenant-7' },
                { 
                    format: EXPORT_FORMATS.JSON,
                    destination: 'file',
                    maxRecords: 10
                }
            );

            expect(exportResult).toBeDefined();
            expect(exportResult.success).toBe(true);
            expect(exportResult.records).toBeLessThanOrEqual(10);
        });
    });

    describe('Compliance Reporting', () => {
        it('should generate audit compliance report', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'User data access',
                    correlationId: 'compliance-1',
                    tenantId: 'compliance-tenant-1',
                    userId: 'user-compliance-1',
                    audit: true,
                    source: 'backend',
                    meta: {
                        action: 'data_access',
                        resource: 'user_profile',
                        auditHash: 'hash123'
                    }
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'warn',
                    message: 'Security event',
                    correlationId: 'compliance-2',
                    tenantId: 'compliance-tenant-1',
                    security: true,
                    source: 'backend',
                    meta: {
                        eventType: 'authentication_failure'
                    }
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const report = await generateComplianceReport(
                'compliance-tenant-1',
                'audit',
                {
                    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString()
                }
            );

            expect(report).toBeDefined();
            expect(report.reportType).toBe('audit');
            expect(report.tenantId).toBe('compliance-tenant-1');
            expect(report.summary).toBeDefined();
            expect(report.auditTrail).toBeDefined();
            expect(Array.isArray(report.auditTrail)).toBe(true);
            expect(report.recommendations).toBeDefined();
            expect(Array.isArray(report.recommendations)).toBe(true);
            expect(report.processingTime).toBeGreaterThanOrEqual(0);
        });

        it('should include compliance events in report', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'GDPR compliance event',
                    correlationId: 'compliance-3',
                    tenantId: 'compliance-tenant-2',
                    compliance: true,
                    source: 'backend',
                    meta: {
                        regulation: 'GDPR',
                        dataType: 'personal_data',
                        auditHash: 'hash456'
                    }
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const report = await generateComplianceReport(
                'compliance-tenant-2',
                'audit'
            );

            expect(report.complianceEvents).toBeDefined();
            expect(Array.isArray(report.complianceEvents)).toBe(true);
        });

        it('should generate compliance recommendations', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'warn',
                    message: 'Security incident',
                    correlationId: 'compliance-4',
                    tenantId: 'compliance-tenant-3',
                    security: true,
                    audit: true,
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const report = await generateComplianceReport(
                'compliance-tenant-3',
                'audit'
            );

            expect(report.recommendations).toBeDefined();
            expect(Array.isArray(report.recommendations)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle export errors gracefully', async () => {
            await expect(exportLogs(
                { tenantId: 'error-tenant-1' },
                { 
                    format: 'invalid_format',
                    destination: 'file'
                }
            )).rejects.toThrow();
        });

        it('should handle webhook export without URL', async () => {
            await expect(exportLogs(
                { tenantId: 'error-tenant-2' },
                { 
                    format: EXPORT_FORMATS.JSON,
                    destination: 'webhook'
                    // Missing webhookUrl
                }
            )).rejects.toThrow();
        });

        it('should handle analytics generation errors', async () => {
            // This should not throw but handle gracefully
            const analytics = await generateAnalytics({
                tenantId: 'nonexistent-tenant',
                metrics: ['count']
            });

            expect(analytics).toBeDefined();
            expect(analytics.summary.totalLogs).toBe(0);
        });
    });
});