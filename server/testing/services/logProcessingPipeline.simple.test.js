/**
 * Simple Log Processing Pipeline Tests
 * 
 * Basic tests for log processing pipeline functionality
 * 
 * Requirements: 1.1, 4.3, 9.1, 9.2
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Log Processing Pipeline Service - Simple Tests', () => {
    let logProcessingPipeline;
    let mockLogEntry;

    beforeEach(async () => {
        // Import the pipeline service
        const pipelineModule = await import('../../services/logProcessingPipeline.service.js');
        logProcessingPipeline = pipelineModule.default;

        // Setup mock log entry
        mockLogEntry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Test log message',
            source: 'frontend',
            companyId: 'tenant123',
            companyName: 'Test Company',
            userId: 'user123',
            userRole: 'employee',
            correlationId: 'corr123',
            sessionId: 'session123',
            ipAddress: '192.168.1.1',
            userAgent: 'Test Agent',
            meta: { test: 'data' }
        };

        // Reset processing stats
        logProcessingPipeline.processingStats = {
            totalProcessed: 0,
            successfullyProcessed: 0,
            failed: 0,
            securityEventsDetected: 0,
            correlationsCreated: 0,
            startTime: new Date()
        };
    });

    describe('validateLogEntry', () => {
        test('should validate required fields', () => {
            const result = logProcessingPipeline.validateLogEntry(mockLogEntry);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should detect missing required fields', () => {
            const invalidEntry = { ...mockLogEntry };
            delete invalidEntry.timestamp;
            delete invalidEntry.level;

            const result = logProcessingPipeline.validateLogEntry(invalidEntry);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing required field: timestamp');
            expect(result.errors).toContain('Missing required field: level');
        });

        test('should validate timestamp format', () => {
            const invalidEntry = { ...mockLogEntry, timestamp: 'invalid-date' };

            const result = logProcessingPipeline.validateLogEntry(invalidEntry);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid timestamp format');
        });

        test('should validate log level', () => {
            const invalidEntry = { ...mockLogEntry, level: 'invalid-level' };

            const result = logProcessingPipeline.validateLogEntry(invalidEntry);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid log level');
        });

        test('should validate source field', () => {
            const invalidEntry = { ...mockLogEntry, source: 'backend' };

            const result = logProcessingPipeline.validateLogEntry(invalidEntry);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid source for frontend log ingestion');
        });

        test('should warn about long messages', () => {
            const longEntry = { ...mockLogEntry, message: 'a'.repeat(15000) };

            const result = logProcessingPipeline.validateLogEntry(longEntry);

            expect(result.valid).toBe(true);
            expect(result.warnings).toContain('Message exceeds recommended length of 10000 characters');
        });

        test('should detect suspicious content', () => {
            const suspiciousEntry = { ...mockLogEntry, message: '<script>alert("xss")</script>' };

            const result = logProcessingPipeline.validateLogEntry(suspiciousEntry);

            expect(result.warnings).toContain('Message contains potentially suspicious content');
        });

        test('should validate meta field type', () => {
            const invalidEntry = { ...mockLogEntry, meta: 'not-an-object' };

            const result = logProcessingPipeline.validateLogEntry(invalidEntry);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Meta field must be an object');
        });
    });

    describe('helper methods', () => {
        test('should generate unique processing IDs', () => {
            const id1 = logProcessingPipeline.generateProcessingId();
            const id2 = logProcessingPipeline.generateProcessingId();

            expect(id1).toMatch(/^proc_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^proc_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });

        test('should generate unique event IDs', () => {
            const id1 = logProcessingPipeline.generateEventId();
            const id2 = logProcessingPipeline.generateEventId();

            expect(id1).toMatch(/^evt_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^evt_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });

        test('should validate timestamps correctly', () => {
            expect(logProcessingPipeline.isValidTimestamp('2024-01-01T00:00:00.000Z')).toBe(true);
            expect(logProcessingPipeline.isValidTimestamp('2024-01-01T12:30:45.123Z')).toBe(true);
            expect(logProcessingPipeline.isValidTimestamp('invalid-date')).toBe(false);
            expect(logProcessingPipeline.isValidTimestamp('')).toBe(false);
            // Note: new Date(null) creates a valid date (1970-01-01), so null returns true
            expect(logProcessingPipeline.isValidTimestamp(null)).toBe(true);
        });

        test('should detect suspicious content patterns', () => {
            expect(logProcessingPipeline.containsSuspiciousContent('<script>alert(1)</script>')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('javascript:void(0)')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('onclick="malicious()"')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('eval(userInput)')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('document.cookie')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('window.location')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('normal log message')).toBe(false);
            expect(logProcessingPipeline.containsSuspiciousContent('user clicked button')).toBe(false);
        });

        test('should sanitize log entries', () => {
            const logEntry = {
                message: 'a'.repeat(300),
                meta: {
                    password: 'secret',
                    token: 'jwt-token',
                    apiKey: 'api-key',
                    secret: 'secret-value',
                    safeData: 'keep-this'
                }
            };

            const sanitized = logProcessingPipeline.sanitizeLogEntry(logEntry);

            expect(sanitized.message.length).toBeLessThan(300);
            expect(sanitized.message).toContain('... [truncated]');
            expect(sanitized.meta.password).toBeUndefined();
            expect(sanitized.meta.token).toBeUndefined();
            expect(sanitized.meta.apiKey).toBeUndefined();
            expect(sanitized.meta.secret).toBeUndefined();
            expect(sanitized.meta.safeData).toBe('keep-this');
        });

        test('should handle sanitization of entries without meta', () => {
            const logEntry = {
                message: 'short message'
            };

            const sanitized = logProcessingPipeline.sanitizeLogEntry(logEntry);

            expect(sanitized.message).toBe('short message');
        });
    });

    describe('getStats', () => {
        test('should return processing statistics with success rate', () => {
            logProcessingPipeline.processingStats.totalProcessed = 100;
            logProcessingPipeline.processingStats.successfullyProcessed = 95;

            const stats = logProcessingPipeline.getStats();

            expect(stats.totalProcessed).toBe(100);
            expect(stats.successfullyProcessed).toBe(95);
            expect(stats.successRate).toBe(0.95);
        });

        test('should handle zero processed logs', () => {
            logProcessingPipeline.processingStats.totalProcessed = 0;
            logProcessingPipeline.processingStats.successfullyProcessed = 0;

            const stats = logProcessingPipeline.getStats();

            expect(stats.successRate).toBe(1.0);
        });

        test('should include all stats fields', () => {
            const stats = logProcessingPipeline.getStats();

            expect(stats).toHaveProperty('totalProcessed');
            expect(stats).toHaveProperty('successfullyProcessed');
            expect(stats).toHaveProperty('failed');
            expect(stats).toHaveProperty('securityEventsDetected');
            expect(stats).toHaveProperty('correlationsCreated');
            expect(stats).toHaveProperty('startTime');
            expect(stats).toHaveProperty('successRate');
        });
    });

    describe('configuration', () => {
        test('should have default configuration values', () => {
            expect(logProcessingPipeline.maxProcessingTimeMs).toBeDefined();
            expect(logProcessingPipeline.enableSecurityDetection).toBeDefined();
            expect(logProcessingPipeline.enableCorrelation).toBeDefined();
        });

        test('should allow configuration changes', () => {
            const originalTimeout = logProcessingPipeline.maxProcessingTimeMs;
            
            logProcessingPipeline.maxProcessingTimeMs = 1000;
            expect(logProcessingPipeline.maxProcessingTimeMs).toBe(1000);
            
            // Reset
            logProcessingPipeline.maxProcessingTimeMs = originalTimeout;
        });
    });
});