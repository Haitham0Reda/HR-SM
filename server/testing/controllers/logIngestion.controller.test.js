/**
 * Log Ingestion Controller Tests
 * 
 * Tests for frontend log ingestion API endpoint with authentication,
 * validation, and processing pipeline integration
 * 
 * Requirements: 8.1, 4.2, 1.1
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import express from 'express';

// Mock dependencies before importing
const mockLogProcessingPipeline = {
    processLog: jest.fn(),
    healthCheck: jest.fn()
};

const mockCorrelationIdService = {
    generateCorrelationId: jest.fn()
};

const mockCompanyLogger = {
    getLoggerForTenant: jest.fn()
};

const mockPlatformLogger = {
    systemPerformance: jest.fn(),
    systemHealth: jest.fn()
};

const mockValidationResult = jest.fn();

// Mock modules
jest.unstable_mockModule('../../services/logProcessingPipeline.service.js', () => ({
    default: mockLogProcessingPipeline
}));

jest.unstable_mockModule('../../services/correlationId.service.js', () => ({
    default: mockCorrelationIdService
}));

jest.unstable_mockModule('../../utils/companyLogger.js', () => ({
    default: mockCompanyLogger
}));

jest.unstable_mockModule('../../utils/platformLogger.js', () => ({
    default: mockPlatformLogger
}));

jest.unstable_mockModule('express-validator', () => ({
    validationResult: mockValidationResult
}));

// Import after mocking
const logIngestionController = await import('../../controllers/logIngestion.controller.js');

describe('Log Ingestion Controller', () => {
    let app;
    let mockReq;
    let mockRes;

    beforeEach(() => {
        // Setup Express app for testing
        app = express();
        app.use(express.json());

        // Mock request and response objects
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

        // Reset mocks
        jest.clearAllMocks();
        mockLogProcessingPipeline.processLog.mockClear();
        mockCorrelationIdService.generateCorrelationId.mockClear();
        mockCompanyLogger.getLoggerForTenant.mockClear();

        // Setup default mock implementations
        mockLogProcessingPipeline.processLog.mockResolvedValue({
            success: true,
            correlationId: 'log-corr-123',
            warnings: []
        });

        mockCorrelationIdService.generateCorrelationId.mockReturnValue('new-corr-123');

        mockCompanyLogger.getLoggerForTenant.mockResolvedValue({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        });

        // Clear ingestionStats to ensure test isolation
        if (logIngestionController.default.ingestionStats) {
            logIngestionController.default.ingestionStats.clear();
        }
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('ingestLogs', () => {
        test('should successfully ingest valid logs', async () => {
            // Mock validation result (no errors)
            mockValidationResult.mockReturnValue({
                isEmpty: () => true,
                array: () => []
            });

            await logIngestionController.default.ingestLogs(mockReq, mockRes);

            expect(mockLogProcessingPipeline.processLog).toHaveBeenCalledTimes(1);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    processed: 1,
                    successful: 1,
                    failed: 0,
                    correlationId: 'corr123'
                })
            );
        });

        test('should handle validation errors', async () => {
            // Mock validation result with errors
            mockValidationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [
                    { msg: 'Invalid timestamp', param: 'logs.0.timestamp' }
                ]
            });

            await logIngestionController.default.ingestLogs(mockReq, mockRes);

            expect(mockLogProcessingPipeline.processLog).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Validation failed'
                })
            );
        });

        test('should handle processing pipeline failures', async () => {
            const mockValidationResult = {
                isEmpty: () => true,
                array: () => []
            };

            const { validationResult } = await import('express-validator');
            validationResult.mockReturnValue(mockValidationResult);

            // Mock pipeline failure
            mockLogProcessingPipeline.processLog.mockResolvedValue({
                success: false,
                error: 'Processing failed',
                correlationId: 'log-corr-123'
            });

            await logIngestionController.default.ingestLogs(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    processed: 1,
                    successful: 0,
                    failed: 1
                })
            );
        });

        test('should handle multiple logs with mixed results', async () => {
            const mockValidationResult = {
                isEmpty: () => true,
                array: () => []
            };

            const { validationResult } = await import('express-validator');
            validationResult.mockReturnValue(mockValidationResult);

            // Add multiple logs to request
            mockReq.body.logs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Success log',
                    source: 'frontend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'Error log',
                    source: 'frontend'
                }
            ];

            // Mock mixed results
            mockLogProcessingPipeline.processLog
                .mockResolvedValueOnce({
                    success: true,
                    correlationId: 'corr1'
                })
                .mockResolvedValueOnce({
                    success: false,
                    error: 'Processing failed',
                    correlationId: 'corr2'
                });

            await logIngestionController.default.ingestLogs(mockReq, mockRes);

            expect(mockLogProcessingPipeline.processLog).toHaveBeenCalledTimes(2);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    processed: 2,
                    successful: 1,
                    failed: 1
                })
            );
        });

        test('should handle processing exceptions', async () => {
            const mockValidationResult = {
                isEmpty: () => true,
                array: () => []
            };

            const { validationResult } = await import('express-validator');
            validationResult.mockReturnValue(mockValidationResult);

            // Mock pipeline exception
            mockLogProcessingPipeline.processLog.mockRejectedValue(new Error('Pipeline exception'));

            await logIngestionController.default.ingestLogs(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    processed: 1,
                    successful: 0,
                    failed: 1
                })
            );
        });

        test('should handle controller exceptions', async () => {
            // Mock validation to throw exception
            const { validationResult } = await import('express-validator');
            validationResult.mockImplementation(() => {
                throw new Error('Validation exception');
            });

            await logIngestionController.default.ingestLogs(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Internal server error during log ingestion'
                })
            );
        });
    });

    describe('healthCheck', () => {
        test('should return healthy status', async () => {
            mockLogProcessingPipeline.healthCheck.mockResolvedValue({
                status: 'healthy',
                components: {}
            });

            await logIngestionController.default.healthCheck(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'healthy',
                    service: 'log-ingestion',
                    version: '1.0.0'
                })
            );
        });

        test('should handle health check exceptions', async () => {
            mockLogProcessingPipeline.healthCheck.mockRejectedValue(new Error('Health check failed'));

            await logIngestionController.default.healthCheck(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(503);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'unhealthy',
                    error: 'Health check failed'
                })
            );
        });
    });

    describe('getIngestionStats', () => {
        test('should return ingestion statistics', async () => {
            await logIngestionController.default.getIngestionStats(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    stats: expect.objectContaining({
                        totalRequests: expect.any(Number),
                        totalLogs: expect.any(Number),
                        successfulLogs: expect.any(Number),
                        failedLogs: expect.any(Number)
                    })
                })
            );
        });

        test('should handle stats retrieval exceptions', async () => {
            // Mock missing tenant context
            mockReq.tenant = null;

            await logIngestionController.default.getIngestionStats(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Failed to retrieve ingestion statistics'
                })
            );
        });
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

            const enriched = logIngestionController.default.enrichLogEntry(logEntry, context);

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

        test('should generate correlation ID if missing', () => {
            const logEntry = {
                level: 'info',
                message: 'Test message'
            };

            const context = {
                companyId: 'tenant123',
                userId: 'user123'
            };

            const enriched = logIngestionController.default.enrichLogEntry(logEntry, context);

            expect(enriched.correlationId).toBe('new-corr-123');
            expect(mockCorrelationIdService.generateCorrelationId).toHaveBeenCalled();
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

            const sanitized = logIngestionController.default.sanitizeLogForLogging(logEntry);

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

            const sanitized = logIngestionController.default.sanitizeLogForLogging(logEntry);

            expect(sanitized.message.length).toBeLessThan(longMessage.length);
            expect(sanitized.message).toContain('... [truncated]');
        });
    });

    describe('updateIngestionStats', () => {
        test('should update statistics correctly', () => {
            const companyId = 'tenant123';

            logIngestionController.default.updateIngestionStats(companyId, 5, 2);

            const stats = logIngestionController.default.ingestionStats.get(companyId);
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

            logIngestionController.default.updateIngestionStats(companyId, 3, 1);
            logIngestionController.default.updateIngestionStats(companyId, 2, 0);

            const stats = logIngestionController.default.ingestionStats.get(companyId);
            expect(stats).toMatchObject({
                totalRequests: 2,
                totalLogs: 6,
                successfulLogs: 5,
                failedLogs: 1
            });
        });
    });
});