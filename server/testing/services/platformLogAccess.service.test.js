/**
 * Platform Log Access Service Tests
 * 
 * Tests for platform administrator universal access functionality
 */

import { jest } from '@jest/globals';
import platformLogAccessService, { 
    PlatformLogAccessContext, 
    LogAggregationResult,
    PLATFORM_ADMIN_ROLES,
    ESSENTIAL_LOG_TYPES 
} from '../../services/platformLogAccess.service.js';

// Mock dependencies
jest.mock('../../services/loggingModule.service.js');
jest.mock('../../services/logSearch.service.js');
jest.mock('../../utils/platformLogger.js');

describe('PlatformLogAccessService', () => {
    let mockReq;
    
    beforeEach(() => {
        mockReq = {
            user: {
                id: 'platform-admin-1',
                role: 'platform_admin'
            },
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-user-agent'),
            originalUrl: '/api/logs',
            method: 'GET'
        };
        
        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('PlatformLogAccessContext', () => {
        test('should create platform context for platform admin', () => {
            const context = new PlatformLogAccessContext(
                'platform-admin-1', 
                'platform_admin',
                { ipAddress: '127.0.0.1' }
            );
            
            expect(context.userId).toBe('platform-admin-1');
            expect(context.userRole).toBe('platform_admin');
            expect(context.isPlatformAdmin).toBe(true);
            expect(context.hasUniversalAccess()).toBe(true);
            expect(context.canBypassModuleSettings()).toBe(true);
            expect(context.getAccessLevel()).toBe('universal_platform_admin');
        });

        test('should create platform context for super admin', () => {
            const context = new PlatformLogAccessContext(
                'super-admin-1', 
                'super_admin',
                { ipAddress: '127.0.0.1' }
            );
            
            expect(context.isPlatformAdmin).toBe(true);
            expect(context.hasUniversalAccess()).toBe(true);
            expect(context.getAccessLevel()).toBe('universal_super_admin');
        });

        test('should create restricted context for company admin', () => {
            const context = new PlatformLogAccessContext(
                'company-admin-1', 
                'company_admin',
                { ipAddress: '127.0.0.1' }
            );
            
            expect(context.isPlatformAdmin).toBe(false);
            expect(context.hasUniversalAccess()).toBe(false);
            expect(context.canBypassModuleSettings()).toBe(false);
            expect(context.getAccessLevel()).toBe('company_restricted');
        });
    });

    describe('createPlatformContext', () => {
        test('should create platform context from request', () => {
            const context = platformLogAccessService.createPlatformContext(mockReq);
            
            expect(context.userId).toBe('platform-admin-1');
            expect(context.userRole).toBe('platform_admin');
            expect(context.requestContext.ipAddress).toBe('127.0.0.1');
            expect(context.requestContext.userAgent).toBe('test-user-agent');
        });

        test('should throw error for missing user ID', () => {
            delete mockReq.user.id;
            
            expect(() => {
                platformLogAccessService.createPlatformContext(mockReq);
            }).toThrow('Invalid platform context: missing userId');
        });
    });

    describe('validatePlatformAccess', () => {
        test('should allow access for platform admin', () => {
            const context = new PlatformLogAccessContext('admin-1', 'platform_admin');
            
            expect(() => {
                platformLogAccessService.validatePlatformAccess(context);
            }).not.toThrow();
        });

        test('should allow access for super admin', () => {
            const context = new PlatformLogAccessContext('admin-1', 'super_admin');
            
            expect(() => {
                platformLogAccessService.validatePlatformAccess(context);
            }).not.toThrow();
        });

        test('should deny access for company admin', () => {
            const context = new PlatformLogAccessContext('admin-1', 'company_admin');
            
            expect(() => {
                platformLogAccessService.validatePlatformAccess(context);
            }).toThrow('Insufficient privileges for platform log access');
        });

        test('should deny access for regular employee', () => {
            const context = new PlatformLogAccessContext('user-1', 'employee');
            
            expect(() => {
                platformLogAccessService.validatePlatformAccess(context);
            }).toThrow('Insufficient privileges for platform log access');
        });
    });

    describe('LogAggregationResult', () => {
        test('should create empty aggregation result', () => {
            const result = new LogAggregationResult();
            
            expect(result.companies.size).toBe(0);
            expect(result.totalEntries).toBe(0);
            expect(result.moduleStatusSummary.size).toBe(0);
        });

        test('should add company logs correctly', () => {
            const result = new LogAggregationResult();
            const logs = [
                { timestamp: '2023-01-01T10:00:00Z', message: 'Test log 1' },
                { timestamp: '2023-01-01T11:00:00Z', message: 'Test log 2' }
            ];
            
            result.addCompanyLogs('company1', logs, true, ['auditLogging', 'securityLogging']);
            
            expect(result.companies.size).toBe(1);
            expect(result.totalEntries).toBe(2);
            expect(result.companies.get('company1').count).toBe(2);
            expect(result.companies.get('company1').moduleEnabled).toBe(true);
        });

        test('should get aggregated logs sorted by timestamp', () => {
            const result = new LogAggregationResult();
            
            const logs1 = [
                { timestamp: '2023-01-01T10:00:00Z', message: 'Company 1 log 1' },
                { timestamp: '2023-01-01T12:00:00Z', message: 'Company 1 log 2' }
            ];
            
            const logs2 = [
                { timestamp: '2023-01-01T11:00:00Z', message: 'Company 2 log 1' }
            ];
            
            result.addCompanyLogs('company1', logs1, true, []);
            result.addCompanyLogs('company2', logs2, false, []);
            
            const aggregated = result.getAggregatedLogs();
            
            expect(aggregated).toHaveLength(3);
            expect(aggregated[0].timestamp).toBe('2023-01-01T12:00:00Z'); // Newest first
            expect(aggregated[1].timestamp).toBe('2023-01-01T11:00:00Z');
            expect(aggregated[2].timestamp).toBe('2023-01-01T10:00:00Z');
            
            expect(aggregated[0].sourceCompany).toBe('company1');
            expect(aggregated[1].sourceCompany).toBe('company2');
            expect(aggregated[1].logSource).toBe('essential'); // Module disabled
        });

        test('should generate correct summary', () => {
            const result = new LogAggregationResult();
            
            result.addCompanyLogs('company1', [{ message: 'log1' }], true, []);
            result.addCompanyLogs('company2', [{ message: 'log2' }], false, []);
            result.addCompanyLogs('company3', [{ message: 'log3' }], true, []);
            
            const summary = result.getSummary();
            
            expect(summary.totalCompanies).toBe(3);
            expect(summary.enabledCompanies).toBe(2);
            expect(summary.disabledCompanies).toBe(1);
            expect(summary.totalLogEntries).toBe(3);
        });
    });

    describe('PLATFORM_ADMIN_ROLES', () => {
        test('should include correct platform admin roles', () => {
            expect(PLATFORM_ADMIN_ROLES).toContain('super_admin');
            expect(PLATFORM_ADMIN_ROLES).toContain('platform_admin');
            expect(PLATFORM_ADMIN_ROLES).not.toContain('company_admin');
            expect(PLATFORM_ADMIN_ROLES).not.toContain('employee');
        });
    });

    describe('ESSENTIAL_LOG_TYPES', () => {
        test('should include essential log types', () => {
            expect(ESSENTIAL_LOG_TYPES).toContain('authentication_attempt');
            expect(ESSENTIAL_LOG_TYPES).toContain('authorization_failure');
            expect(ESSENTIAL_LOG_TYPES).toContain('security_breach');
            expect(ESSENTIAL_LOG_TYPES).toContain('audit');
            expect(ESSENTIAL_LOG_TYPES).toContain('security');
        });
    });
});