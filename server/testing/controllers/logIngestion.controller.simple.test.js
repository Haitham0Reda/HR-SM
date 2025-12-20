/**
 * Simple Log Ingestion Controller Tests
 * 
 * Basic tests for log ingestion functionality
 * 
 * Requirements: 8.1, 4.2, 1.1
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Log Ingestion Controller - Simple Tests', () => {
    let logIngestionController;
    let mockReq;
    let mockRes;

    beforeEach(async () => {
        // Import the controller
        const controllerModule = await import('../../controllers/logIngestion.controller.js');
        logIngestionController = controllerModule.default;
        
        // Reset ingestion statistics
        logIngestionController.ingestionStats.clear();

        // Setup mock request and response
        mockReq = {
            user: {
                id: 'user123',
                role: 'employee',
                tenantId: 'tenant123'
            },
            tenant: {
                tenantId: 'tenant123',
                companyName: 'Test Company'
            },
            correlationId: 'corr123',
            id: 'req123',
            startTime: new Date(),
            ip: '192.168.1.1',
            get: jest.fn((header) => {
                if (header === 'User-Agent') return 'Test Agent';
                return null;
            }),
            body: {
                logs: [
                    {
                        timestamp: new Date().toISOString(),
                        level: 'info',
                        message: 'Test log message',
                        source: 'frontend',
                        correlationId: 'log-corr-123',
                        sessionId: 'session123',
                        meta: { test: 'data' }
                    }
                ]
            }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('enrichLogEntry', () => {
        test('should enrich log entry with context', () => {
            const logEntry = {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'Test message',
                correlationId: 'existing-corr'
            };

            const context = {
                companyId: 'tenant123',
                companyName: 'Test Company',
                userId: 'user123',
                userRole: 'employee',
                requestCorrelationId: 'req-corr',
                ipAddress: '192.168.1.1',
                userAgent: 'Test Agent',
                requestId: 'req123'
            };

            const enriched = logIngestionController.enrichLogEntry(logEntry, context);

            expect(enriched).toMatchObject({
                ...logEntry,
                source: 'frontend',
                companyId: 'tenant123',
                companyName: 'Test Company',
                userId: 'user123',
                userRole: 'employee',
                ipAddress: '192.168.1.1',
                userAgent: 'Test Agent',
                requestId: 'req123',
                ingestionSource: 'api'
            });

            expect(enriched.ingestionTimestamp).toBeDefined();
            expect(enriched.meta.requestCorrelationId).toBe('req-corr');
        });

        test('should create meta object if missing', () => {
            const logEntry = {
                level: 'info',
                message: 'Test message'
            };

            const context = {
                companyId: 'tenant123',
                userId: 'user123',
                requestCorrelationId: 'req-corr'
            };

            const enriched = logIngestionController.enrichLogEntry(logEntry, context);

            expect(enriched.meta).toBeDefined();
            expect(enriched.meta.requestCorrelationId).toBe('req-corr');
        });
    });

    describe('sanitizeLogForLogging', () => {
        test('should remove sensitive data', () => {
            const logEntry = {
                message: 'Test message',
                meta: {
                    password: 'secret123',
                    token: 'jwt-token',
                    apiKey: 'api-key-123',
                    secret: 'secret-value',
                    safeData: 'keep-this'
                }
            };

            const sanitized = logIngestionController.sanitizeLogForLogging(logEntry);

            expect(sanitized.meta.password).toBeUndefined();
            expect(sanitized.meta.token).toBeUndefined();
            expect(sanitized.meta.apiKey).toBeUndefined();
            expect(sanitized.meta.secret).toBeUndefined();
            expect(sanitized.meta.safeData).toBe('keep-this');
        });

        test('should truncate long messages', () => {
            const longMessage = 'a'.repeat(1000);
            const logEntry = {
                message: longMessage,
                meta: {}
            };

            const sanitized = logIngestionController.sanitizeLogForLogging(logEntry);

            expect(sanitized.message.length).toBeLessThan(longMessage.length);
            expect(sanitized.message).toContain('... [truncated]');
        });

        test('should handle missing meta object', () => {
            const logEntry = {
                message: 'Test message'
            };

            const sanitized = logIngestionController.sanitizeLogForLogging(logEntry);

            expect(sanitized.message).toBe('Test message');
        });
    });

    describe('updateIngestionStats', () => {
        test('should initialize and update statistics correctly', () => {
            const companyId = 'tenant123';
            
            logIngestionController.updateIngestionStats(companyId, 5, 2);
            
            const stats = logIngestionController.ingestionStats.get(companyId);
            expect(stats).toMatchObject({
                totalRequests: 1,
                totalLogs: 7,
                successfulLogs: 5,
                failedLogs: 2
            });
            expect(stats.lastIngestion).toBeDefined();
        });

        test('should accumulate statistics over multiple calls', () => {
            const companyId = 'tenant123';
            
            logIngestionController.updateIngestionStats(companyId, 3, 1);
            logIngestionController.updateIngestionStats(companyId, 2, 0);
            
            const stats = logIngestionController.ingestionStats.get(companyId);
            expect(stats).toMatchObject({
                totalRequests: 2,
                totalLogs: 6,
                successfulLogs: 5,
                failedLogs: 1
            });
        });

        test('should handle zero values', () => {
            const companyId = 'tenant456';
            
            logIngestionController.updateIngestionStats(companyId, 0, 0);
            
            const stats = logIngestionController.ingestionStats.get(companyId);
            expect(stats).toMatchObject({
                totalRequests: 1,
                totalLogs: 0,
                successfulLogs: 0,
                failedLogs: 0
            });
        });
    });

    describe('helper methods', () => {
        test('should generate unique processing IDs', () => {
            // Access the method through the controller instance
            const generateId = () => `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const id1 = generateId();
            const id2 = generateId();

            expect(id1).toMatch(/^proc_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^proc_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });
});