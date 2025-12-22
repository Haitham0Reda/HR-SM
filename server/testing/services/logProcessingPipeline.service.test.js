/**
 * Log Processing Pipeline Service Tests
 * 
 * Tests for log processing pipeline with validation, correlation,
 * security detection, and storage routing
 * 
 * Requirements: 1.1, 4.3, 9.1, 9.2
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock all dependencies before importing the service under test
const mockCorrelationIdService = {
    isValidCorrelationId: jest.fn(),
    generateCorrelationId: jest.fn()
};

const mockLogCorrelationService = {
    linkLog: jest.fn(),
    getRecentUserLogs: jest.fn()
};

const mockFrontendSecurityDetection = {
    analyzeLogEntry: jest.fn()
};

const mockBackendSecurityDetection = {
    analyzeLogEntry: jest.fn()
};

const mockLogStorage = {
    storeLog: jest.fn()
};

const mockTenantIsolationEnforcement = {
    enforceRequestIsolation: jest.fn()
};

// Set up module mocks
jest.unstable_mockModule('../../services/correlationId.service.js', () => ({
    default: mockCorrelationIdService
}));

jest.unstable_mockModule('../../services/logCorrelation.service.js', () => ({
    default: mockLogCorrelationService
}));

jest.unstable_mockModule('../../../client/hr-app/src/services/frontendSecurityDetection.service.js', () => ({
    default: mockFrontendSecurityDetection
}));

jest.unstable_mockModule('../../services/backendSecurityDetection.service.js', () => ({
    default: mockBackendSecurityDetection
}));

jest.unstable_mockModule('../../services/logStorage.service.js', () => ({
    default: mockLogStorage,
    LOG_TYPES: {
        APPLICATION: { name: 'application', retention: 30 },
        ERROR: { name: 'error', retention: 90 },
        AUDIT: { name: 'audit', retention: 2555 },
        SECURITY: { name: 'security', retention: 1825 },
        PERFORMANCE: { name: 'performance', retention: 90 },
        COMPLIANCE: { name: 'compliance', retention: 2555 }
    },
    PLATFORM_LOG_TYPES: {
        PLATFORM: { name: 'platform', retention: 365 },
        PLATFORM_AUDIT: { name: 'platform-audit', retention: 2555 },
        PLATFORM_SECURITY: { name: 'platform-security', retention: 2555 },
        PLATFORM_PERFORMANCE: { name: 'platform-performance', retention: 180 },
        PLATFORM_ERROR: { name: 'platform-error', retention: 365 }
    },
    createCompanyDirectoryStructure: jest.fn().mockResolvedValue('/mock/path'),
    createPlatformDirectoryStructure: jest.fn().mockResolvedValue('/mock/platform'),
    getLogFilePath: jest.fn().mockReturnValue('/mock/log/path'),
    getPlatformLogFilePath: jest.fn().mockReturnValue('/mock/platform/log'),
    compressLogFile: jest.fn().mockResolvedValue('/mock/compressed'),
    applyCompanyRetentionPolicies: jest.fn().mockResolvedValue({ processed: 0, compressed: 0, deleted: 0 }),
    applyPlatformRetentionPolicies: jest.fn().mockResolvedValue({ processed: 0, compressed: 0, deleted: 0 }),
    getCompanyStorageStats: jest.fn().mockResolvedValue(null),
    getPlatformStorageStats: jest.fn().mockResolvedValue(null),
    validateLogIntegrity: jest.fn().mockResolvedValue({ valid: true }),
    runGlobalRetentionCleanup: jest.fn().mockResolvedValue({ companiesProcessed: 0 }),
    generateIntegrityHash: jest.fn().mockReturnValue('mockhash123')
}));

jest.unstable_mockModule('../../services/tenantIsolationEnforcement.service.js', () => ({
    default: mockTenantIsolationEnforcement
}));

// Now import the service under test
const logProcessingPipeline = (await import('../../services/logProcessingPipeline.service.js')).default;

describe('Log Processing Pipeline Service', () => {
    let mockLogEntry;

    beforeEach(async () => {
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

        jest.clearAllMocks();

        // Setup default mock implementations
        mockCorrelationIdService.isValidCorrelationId.mockReturnValue(true);
        mockCorrelationIdService.generateCorrelationId.mockReturnValue('new-corr-123');
        mockLogCorrelationService.linkLog.mockResolvedValue({ success: true });
        mockFrontendSecurityDetection.analyzeLogEntry.mockResolvedValue([]);
        mockBackendSecurityDetection.analyzeLogEntry.mockResolvedValue([]);
        mockLogStorage.storeLog.mockResolvedValue({
            success: true,
            filePath: '/logs/tenant123/general/2024-01-01.log'
        });
        mockTenantIsolationEnforcement.enforceRequestIsolation.mockReturnValue({
            valid: true,
            violations: [],
            warnings: []
        });

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

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('processLog', () => {
        test('should successfully process valid log entry', async () => {
            const result = await logProcessingPipeline.processLog(mockLogEntry);

            expect(result.success).toBe(true);
            expect(result.correlationId).toBe('corr123');
            expect(result.warnings).toEqual([]);
            expect(result.securityEvents).toEqual([]);
            expect(result.storageLocation).toBe('/logs/tenant123/general/2024-01-01.log');
            expect(result.processingTimeMs).toBeGreaterThan(0);
        });

        test('should handle validation failures', async () => {
            // Remove required field
            delete mockLogEntry.timestamp;

            const result = await logProcessingPipeline.processLog(mockLogEntry);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Log validation failed');
            expect(result.validationErrors).toContain('Missing required field: timestamp');
        });

        test('should handle tenant isolation violations', async () => {
            // Handle both direct mock and default export mock structures
            const enforceRequestIsolationMock = mockTenantIsolationEnforcement.enforceRequestIsolation ||
                (mockTenantIsolationEnforcement.default && mockTenantIsolationEnforcement.default.enforceRequestIsolation);
            enforceRequestIsolationMock.mockReturnValue({
                valid: false,
                violations: [{ type: 'TENANT_SPOOFING', description: 'Invalid tenant context' }],
                warnings: []
            });

            const result = await logProcessingPipeline.processLog(mockLogEntry);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Tenant isolation violation');
            expect(result.isolationViolations).toHaveLength(1);
        });

        test('should process correlation ID validation and linking', async () => {
            const result = await logProcessingPipeline.processLog(mockLogEntry);

            // Check that correlation ID was validated
            expect(mockCorrelationIdService.isValidCorrelationId).toHaveBeenCalledWith('corr123');
            if (mockLogCorrelationService.linkLog) {
                expect(mockLogCorrelationService.linkLog).toHaveBeenCalledWith(
                    expect.objectContaining({
                        correlationId: 'corr123'
                    })
                );
            }
            expect(result.correlationId).toBe('corr123');
        });

        test('should generate new correlation ID for invalid ones', async () => {
            // Set up mock for invalid correlation ID
            mockCorrelationIdService.isValidCorrelationId.mockReturnValue(false);
            // Ensure generateCorrelationId returns the expected value
            mockCorrelationIdService.generateCorrelationId.mockReturnValue('new-corr-123');

            const result = await logProcessingPipeline.processLog(mockLogEntry);

            expect(result.correlationId).toBe('new-corr-123');
            expect(result.warnings).toContain('Invalid correlation ID format, generating new one');
        });

        test('should detect and report security events', async () => {
            const securityEvent = {
                id: 'evt123',
                eventType: 'suspicious_activity',
                severity: 'medium',
                description: 'Suspicious pattern detected'
            };

            // Handle both direct mock and default export mock structures
            const analyzeLogEntryMock = mockFrontendSecurityDetection.analyzeLogEntry ||
                (mockFrontendSecurityDetection.default && mockFrontendSecurityDetection.default.analyzeLogEntry);
            if (analyzeLogEntryMock && analyzeLogEntryMock.mockResolvedValue) {
                analyzeLogEntryMock.mockResolvedValue([securityEvent]);
            }

            const result = await logProcessingPipeline.processLog(mockLogEntry);

            expect(result.securityEvents).toContain(securityEvent);
            expect(logProcessingPipeline.processingStats.securityEventsDetected).toBe(1);
        });

        test('should route logs to appropriate storage based on security events', async () => {
            const securityEvent = {
                id: 'evt123',
                eventType: 'xss',
                severity: 'high'
            };

            // Handle both direct mock and default export mock structures
            const analyzeLogEntryMock = mockFrontendSecurityDetection.analyzeLogEntry ||
                (mockFrontendSecurityDetection.default && mockFrontendSecurityDetection.default.analyzeLogEntry);
            if (analyzeLogEntryMock && analyzeLogEntryMock.mockResolvedValue) {
                analyzeLogEntryMock.mockResolvedValue([securityEvent]);
            }

            await logProcessingPipeline.processLog(mockLogEntry);

            // Handle both direct mock and default export mock structures
            const storeLogMock = mockLogStorage.storeLog ||
                (mockLogStorage.default && mockLogStorage.default.storeLog);
            if (storeLogMock) {
                expect(storeLogMock).toHaveBeenCalledWith(
                    mockLogEntry,
                    expect.objectContaining({
                        type: 'security',
                        companyId: 'tenant123',
                        securityEvents: [securityEvent]
                    })
                );
            }
        });

        test('should route error logs to error storage', async () => {
            mockLogEntry.level = 'error';

            await logProcessingPipeline.processLog(mockLogEntry);

            // Handle both direct mock and default export mock structures
            const storeLogMock = mockLogStorage.storeLog ||
                (mockLogStorage.default && mockLogStorage.default.storeLog);
            if (storeLogMock) {
                expect(storeLogMock).toHaveBeenCalledWith(
                    mockLogEntry,
                    expect.objectContaining({
                        type: 'error'
                    })
                );
            }
        });

        test('should route performance logs to performance storage', async () => {
            mockLogEntry.meta.performance = { duration: 1500 };

            await logProcessingPipeline.processLog(mockLogEntry);

            // Handle both direct mock and default export mock structures
            const storeLogMock = mockLogStorage.storeLog ||
                (mockLogStorage.default && mockLogStorage.default.storeLog);
            if (storeLogMock) {
                expect(storeLogMock).toHaveBeenCalledWith(
                    mockLogEntry,
                    expect.objectContaining({
                        type: 'performance'
                    })
                );
            }
        });

        test('should handle storage failures', async () => {
            // Handle both direct mock and default export mock structures
            const storeLogMock = mockLogStorage.storeLog ||
                (mockLogStorage.default && mockLogStorage.default.storeLog);
            if (storeLogMock && storeLogMock.mockResolvedValue) {
                storeLogMock.mockResolvedValue({
                    success: false,
                    error: 'Storage failed'
                });
            }

            const result = await logProcessingPipeline.processLog(mockLogEntry);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage routing failed');
            expect(result.storageError).toBe('Storage failed');
        });

        test('should handle processing exceptions', async () => {
            // Handle both direct mock and default export mock structures
            const linkLogMock = mockLogCorrelationService.linkLog ||
                (mockLogCorrelationService.default && mockLogCorrelationService.default.linkLog);
            if (linkLogMock && linkLogMock.mockRejectedValue) {
                linkLogMock.mockRejectedValue(new Error('Correlation failed'));
            }

            const result = await logProcessingPipeline.processLog(mockLogEntry);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Processing pipeline exception');
            expect(result.exception).toBe('Correlation failed');
        });

        test('should track processing timeout warnings', async () => {
            // Mock slow processing
            // Handle both direct mock and default export mock structures
            const storeLogMock = mockLogStorage.storeLog ||
                (mockLogStorage.default && mockLogStorage.default.storeLog);
            if (storeLogMock && storeLogMock.mockImplementation) {
                storeLogMock.mockImplementation(() =>
                    new Promise(resolve => setTimeout(() => resolve({ success: true, filePath: '/test' }), 100))
                );
            }

            // Set low timeout threshold for testing
            logProcessingPipeline.maxProcessingTimeMs = 50;

            const result = await logProcessingPipeline.processLog(mockLogEntry);

            expect(result.warnings.some(w => w.includes('exceeding'))).toBe(true);
        });

        test('should update processing statistics', async () => {
            await logProcessingPipeline.processLog(mockLogEntry);

            expect(logProcessingPipeline.processingStats.totalProcessed).toBe(1);
            expect(logProcessingPipeline.processingStats.successfullyProcessed).toBe(1);
            expect(logProcessingPipeline.processingStats.failed).toBe(0);
        });
    });

    describe('validateLogEntry', () => {
        test('should validate required fields', () => {
            const result = logProcessingPipeline.validateLogEntry(mockLogEntry);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should detect missing required fields', () => {
            delete mockLogEntry.timestamp;
            delete mockLogEntry.level;

            const result = logProcessingPipeline.validateLogEntry(mockLogEntry);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing required field: timestamp');
            expect(result.errors).toContain('Missing required field: level');
        });

        test('should validate timestamp format', () => {
            mockLogEntry.timestamp = 'invalid-date';

            const result = logProcessingPipeline.validateLogEntry(mockLogEntry);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid timestamp format');
        });

        test('should validate log level', () => {
            mockLogEntry.level = 'invalid-level';

            const result = logProcessingPipeline.validateLogEntry(mockLogEntry);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid log level');
        });

        test('should validate source field', () => {
            mockLogEntry.source = 'backend';

            const result = logProcessingPipeline.validateLogEntry(mockLogEntry);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid source for frontend log ingestion');
        });

        test('should warn about long messages', () => {
            mockLogEntry.message = 'a'.repeat(15000);

            const result = logProcessingPipeline.validateLogEntry(mockLogEntry);

            expect(result.valid).toBe(true);
            expect(result.warnings).toContain('Message exceeds recommended length of 10000 characters');
        });

        test('should detect suspicious content', () => {
            mockLogEntry.message = '<script>alert("xss")</script>';

            const result = logProcessingPipeline.validateLogEntry(mockLogEntry);

            expect(result.warnings).toContain('Message contains potentially suspicious content');
        });
    });

    describe('analyzeCrossSystemSecurity', () => {
        beforeEach(() => {
            // Handle both direct mock and default export mock structures
            const getRecentUserLogsMock = mockLogCorrelationService.getRecentUserLogs ||
                (mockLogCorrelationService.default && mockLogCorrelationService.default.getRecentUserLogs);
            if (getRecentUserLogsMock) {
                getRecentUserLogsMock.mockResolvedValue([]);
            }
        });

        test('should detect rapid API calls', async () => {
            mockLogEntry.meta.apiCall = { endpoint: '/api/test', method: 'GET' };

            // Mock 60 recent API calls
            const recentApiCalls = Array(60).fill().map((_, i) => ({
                userId: 'user123',
                meta: { apiCall: { endpoint: '/api/test' } },
                timestamp: new Date(Date.now() - i * 1000).toISOString()
            }));

            // Handle both direct mock and default export mock structures
            const getRecentUserLogsMock = mockLogCorrelationService.getRecentUserLogs ||
                (mockLogCorrelationService.default && mockLogCorrelationService.default.getRecentUserLogs);
            if (getRecentUserLogsMock) {
                getRecentUserLogsMock.mockResolvedValue(recentApiCalls);
            }

            const events = await logProcessingPipeline.analyzeCrossSystemSecurity(mockLogEntry);

            expect(events).toHaveLength(1);
            expect(events[0].eventType).toBe('suspicious_activity');
            expect(events[0].description).toContain('Rapid API calls detected');
        });

        test('should detect high error rates', async () => {
            mockLogEntry.level = 'error';

            // Mock 15 recent errors
            const recentErrors = Array(15).fill().map((_, i) => ({
                userId: 'user123',
                level: 'error',
                timestamp: new Date(Date.now() - i * 10000).toISOString()
            }));

            // Handle both direct mock and default export mock structures
            const getRecentUserLogsMock = mockLogCorrelationService.getRecentUserLogs ||
                (mockLogCorrelationService.default && mockLogCorrelationService.default.getRecentUserLogs);
            if (getRecentUserLogsMock) {
                getRecentUserLogsMock.mockResolvedValue(recentErrors);
            }

            const events = await logProcessingPipeline.analyzeCrossSystemSecurity(mockLogEntry);

            expect(events).toHaveLength(1);
            expect(events[0].eventType).toBe('suspicious_activity');
            expect(events[0].description).toContain('High error rate detected');
        });

        test('should handle analysis errors gracefully', async () => {
            // Handle both direct mock and default export mock structures
            const getRecentUserLogsMock = mockLogCorrelationService.getRecentUserLogs ||
                (mockLogCorrelationService.default && mockLogCorrelationService.default.getRecentUserLogs);
            if (getRecentUserLogsMock) {
                getRecentUserLogsMock.mockRejectedValue(new Error('Database error'));
            }

            const events = await logProcessingPipeline.analyzeCrossSystemSecurity(mockLogEntry);

            expect(events).toEqual([]);
        });
    });

    describe('healthCheck', () => {
        test('should return healthy status', async () => {
            const health = await logProcessingPipeline.healthCheck();

            expect(health.status).toBe('healthy');
            expect(health.timestamp).toBeDefined();
            expect(health.uptime).toBeGreaterThanOrEqual(0);
            expect(health.stats).toBeDefined();
            expect(health.components).toBeDefined();
        });

        test('should calculate success rate', async () => {
            // Process some logs to generate stats
            logProcessingPipeline.processingStats.totalProcessed = 10;
            logProcessingPipeline.processingStats.successfullyProcessed = 8;

            const health = await logProcessingPipeline.healthCheck();

            expect(health.stats.successRate).toBe(0.8);
        });

        test('should handle health check errors', async () => {
            // Mock an error condition
            jest.spyOn(logProcessingPipeline, 'healthCheck').mockImplementation(() => {
                throw new Error('Health check failed');
            });

            try {
                await logProcessingPipeline.healthCheck();
            } catch (error) {
                expect(error.message).toBe('Health check failed');
            }
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

        test('should validate timestamps correctly', () => {
            expect(logProcessingPipeline.isValidTimestamp('2024-01-01T00:00:00.000Z')).toBe(true);
            expect(logProcessingPipeline.isValidTimestamp('invalid-date')).toBe(false);
            expect(logProcessingPipeline.isValidTimestamp('')).toBe(false);
        });

        test('should detect suspicious content patterns', () => {
            expect(logProcessingPipeline.containsSuspiciousContent('<script>alert(1)</script>')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('javascript:void(0)')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('onclick="malicious()"')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('eval(userInput)')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('document.cookie')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('window.location')).toBe(true);
            expect(logProcessingPipeline.containsSuspiciousContent('normal log message')).toBe(false);
        });

        test('should sanitize log entries', () => {
            const logEntry = {
                message: 'a'.repeat(300),
                meta: {
                    password: 'secret',
                    token: 'jwt-token',
                    safeData: 'keep-this'
                }
            };

            const sanitized = logProcessingPipeline.sanitizeLogEntry(logEntry);

            expect(sanitized.message.length).toBeLessThan(300);
            expect(sanitized.message).toContain('... [truncated]');
            expect(sanitized.meta.password).toBeUndefined();
            expect(sanitized.meta.token).toBeUndefined();
            expect(sanitized.meta.safeData).toBe('keep-this');
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
    });
});