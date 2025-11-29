/**
 * Tests for Deprecation Middleware
 * 
 * Tests the backward compatibility features including:
 * - Deprecation headers
 * - Legacy usage logging
 * - Legacy endpoint enable/disable
 */

import { jest } from '@jest/globals';

// Mock the logger before importing the middleware
const mockLogger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
};

jest.unstable_mockModule('../../utils/logger.js', () => ({
    default: mockLogger
}));

// Mock the features config
const mockFeatures = {
    ENABLE_LEGACY_LEAVE: true,
    ENABLE_NEW_LEAVE_MODELS: true,
    LOG_LEGACY_USAGE: true,
    SEND_DEPRECATION_HEADERS: true
};

const mockDeprecationConfig = {
    DEPRECATION_DATE: '2025-12-01',
    SUNSET_DATE: '2026-06-01',
    REPLACEMENT_ENDPOINTS: {
        mission: '/api/missions',
        sick: '/api/sick-leaves'
    },
    REPLACEMENT_MESSAGE: 'Use new endpoints'
};

jest.unstable_mockModule('../../config/features.config.js', () => ({
    FEATURES: mockFeatures,
    DEPRECATION_CONFIG: mockDeprecationConfig,
    getReplacementEndpoint: (leaveType) => {
        return mockDeprecationConfig.REPLACEMENT_ENDPOINTS[leaveType] || mockDeprecationConfig.REPLACEMENT_MESSAGE;
    }
}));

// Import after mocking
const {
    addDeprecationHeaders,
    logLegacyUsage,
    deprecateEndpoint,
    checkLegacyEnabled
} = await import('../../middleware/deprecation.middleware.js');

describe('Deprecation Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Reset feature flags to defaults
        mockFeatures.ENABLE_LEGACY_LEAVE = true;
        mockFeatures.SEND_DEPRECATION_HEADERS = true;
        mockFeatures.LOG_LEGACY_USAGE = true;

        // Mock request
        req = {
            method: 'GET',
            path: '/api/leaves',
            body: {},
            query: {},
            user: {
                _id: '507f1f77bcf86cd799439011',
                role: 'employee'
            },
            get: jest.fn((header) => {
                if (header === 'user-agent') return 'Mozilla/5.0';
                return null;
            }),
            ip: '192.168.1.100',
            connection: { remoteAddress: '192.168.1.100' }
        };

        // Mock response
        res = {
            setHeader: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Mock next
        next = jest.fn();
    });

    describe('addDeprecationHeaders', () => {
        it('should add deprecation headers when enabled', () => {
            const middleware = addDeprecationHeaders({ endpoint: '/api/leaves' });
            middleware(req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('X-Deprecated', 'true');
            expect(res.setHeader).toHaveBeenCalledWith('X-Deprecation-Date', '2025-12-01');
            expect(res.setHeader).toHaveBeenCalledWith('X-Sunset', '2026-06-01');
            expect(res.setHeader).toHaveBeenCalledWith('X-Replacement', expect.any(String));
            expect(res.setHeader).toHaveBeenCalledWith('Warning', expect.stringContaining('Deprecated API'));
            expect(next).toHaveBeenCalled();
        });

        it('should add specific replacement endpoint for leave type', () => {
            const middleware = addDeprecationHeaders({ 
                endpoint: '/api/leaves',
                leaveType: 'mission'
            });
            middleware(req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('X-Replacement', '/api/missions');
            expect(next).toHaveBeenCalled();
        });

        it('should not add headers when deprecation headers are disabled', () => {
            mockFeatures.SEND_DEPRECATION_HEADERS = false;
            
            const middleware = addDeprecationHeaders({ endpoint: '/api/leaves' });
            middleware(req, res, next);

            expect(res.setHeader).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });
    });

    describe('logLegacyUsage', () => {
        it('should log legacy endpoint usage', () => {
            const middleware = logLegacyUsage('/api/leaves');
            middleware(req, res, next);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Legacy endpoint accessed',
                expect.objectContaining({
                    category: 'LEGACY_API_USAGE',
                    endpoint: '/api/leaves',
                    method: 'GET',
                    userId: '507f1f77bcf86cd799439011',
                    userRole: 'employee'
                })
            );
            expect(next).toHaveBeenCalled();
        });

        it('should not log when legacy usage logging is disabled', () => {
            mockFeatures.LOG_LEGACY_USAGE = false;
            
            const middleware = logLegacyUsage('/api/leaves');
            middleware(req, res, next);

            expect(mockLogger.warn).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });

        it('should handle requests without authenticated user', () => {
            req.user = undefined;
            
            const middleware = logLegacyUsage('/api/leaves');
            middleware(req, res, next);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Legacy endpoint accessed',
                expect.objectContaining({
                    userId: undefined,
                    userRole: undefined
                })
            );
            expect(next).toHaveBeenCalled();
        });
    });

    describe('deprecateEndpoint', () => {
        it('should apply both headers and logging', () => {
            const middleware = deprecateEndpoint({ endpoint: '/api/leaves' });
            middleware(req, res, next);

            expect(res.setHeader).toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });
    });

    describe('checkLegacyEnabled', () => {
        it('should call next when legacy is enabled', () => {
            mockFeatures.ENABLE_LEGACY_LEAVE = true;
            
            checkLegacyEnabled(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 410 Gone when legacy is disabled', () => {
            mockFeatures.ENABLE_LEGACY_LEAVE = false;
            
            checkLegacyEnabled(req, res, next);

            expect(res.status).toHaveBeenCalledWith(410);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'This endpoint has been removed',
                    replacement: expect.any(String)
                })
            );
            expect(next).not.toHaveBeenCalled();
        });
    });
});
