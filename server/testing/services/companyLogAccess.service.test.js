/**
 * Company Log Access Service Tests
 * 
 * Tests for company administrator access restrictions
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import companyLogAccessService, {
    CompanyAccessContext,
    AccessRestrictionResult,
    COMPANY_ADMIN_ROLES,
    PLATFORM_ADMIN_ROLES
} from '../../services/companyLogAccess.service.js';

// Note: Mocks not needed for this test suite

describe('CompanyLogAccessService', () => {
    let mockReq;

    beforeEach(() => {
        mockReq = {
            user: {
                id: 'company-admin-1',
                role: 'company_admin'
            },
            tenant: {
                id: 'company123'
            },
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-user-agent'),
            originalUrl: '/api/logs',
            method: 'GET'
        };

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('CompanyAccessContext', () => {
        test('should create company context for company admin', () => {
            const context = new CompanyAccessContext(
                'company-admin-1',
                'company_admin',
                'company123',
                { ipAddress: '127.0.0.1' }
            );

            expect(context.userId).toBe('company-admin-1');
            expect(context.userRole).toBe('company_admin');
            expect(context.companyId).toBe('company123');
            expect(context.isCompanyAdmin).toBe(true);
            expect(context.isPlatformAdmin).toBe(false);
            expect(context.isCompanyRestricted()).toBe(true);
            expect(context.canAccessOtherCompanies()).toBe(false);
            expect(context.getAccessLevel()).toBe('company_admin');
        });

        test('should create context for platform admin', () => {
            const context = new CompanyAccessContext(
                'platform-admin-1',
                'platform_admin',
                'company123',
                { ipAddress: '127.0.0.1' }
            );

            expect(context.isCompanyAdmin).toBe(false);
            expect(context.isPlatformAdmin).toBe(true);
            expect(context.isCompanyRestricted()).toBe(false);
            expect(context.canAccessOtherCompanies()).toBe(true);
            expect(context.getAccessLevel()).toBe('platform_admin');
        });

        test('should create context for HR manager', () => {
            const context = new CompanyAccessContext(
                'hr-manager-1',
                'hr_manager',
                'company123',
                { ipAddress: '127.0.0.1' }
            );

            expect(context.isCompanyAdmin).toBe(true);
            expect(context.isPlatformAdmin).toBe(false);
            expect(context.isCompanyRestricted()).toBe(true);
            expect(context.getAccessLevel()).toBe('company_admin');
        });

        test('should create context for regular employee', () => {
            const context = new CompanyAccessContext(
                'employee-1',
                'employee',
                'company123',
                { ipAddress: '127.0.0.1' }
            );

            expect(context.isCompanyAdmin).toBe(false);
            expect(context.isPlatformAdmin).toBe(false);
            expect(context.isCompanyRestricted()).toBe(false);
            expect(context.getAccessLevel()).toBe('employee');
        });

        test('should return correct accessible companies', () => {
            const companyContext = new CompanyAccessContext('admin-1', 'company_admin', 'company123');
            const platformContext = new CompanyAccessContext('admin-1', 'platform_admin', 'company123');

            expect(companyContext.getAccessibleCompanies()).toEqual(['company123']);
            expect(platformContext.getAccessibleCompanies()).toBe('all');
        });
    });

    describe('createCompanyContext', () => {
        test('should create company context from request', () => {
            const context = companyLogAccessService.createCompanyContext(mockReq);

            expect(context.userId).toBe('company-admin-1');
            expect(context.userRole).toBe('company_admin');
            expect(context.companyId).toBe('company123');
            expect(context.requestContext.ipAddress).toBe('127.0.0.1');
        });

        test('should throw error for missing user ID', () => {
            delete mockReq.user.id;

            expect(() => {
                companyLogAccessService.createCompanyContext(mockReq);
            }).toThrow('Invalid company context: missing userId or companyId');
        });

        test('should throw error for missing company ID', () => {
            delete mockReq.tenant;

            expect(() => {
                companyLogAccessService.createCompanyContext(mockReq);
            }).toThrow('Invalid company context: missing userId or companyId');
        });
    });

    describe('AccessRestrictionResult', () => {
        test('should create allow result', () => {
            const result = AccessRestrictionResult.allow('Test reason', { maxResults: 100 });

            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('Test reason');
            expect(result.restrictions.maxResults).toBe(100);
            expect(result.timestamp).toBeDefined();
        });

        test('should create deny result', () => {
            const result = AccessRestrictionResult.deny('Access denied');

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Access denied');
            expect(result.timestamp).toBeDefined();
        });
    });

    describe('validateCompanyAccess', () => {
        test('should allow platform admin to access any company', async () => {
            const context = new CompanyAccessContext('admin-1', 'platform_admin', 'company123');

            const result = await companyLogAccessService.validateCompanyAccess(context, 'company456');

            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('Platform administrator access granted');
        });

        test('should allow company admin to access their own company when module enabled', async () => {
            const context = new CompanyAccessContext('admin-1', 'company_admin', 'company123');

            // Mock module service to return enabled config
            const { default: loggingModuleService } = await import('../../services/loggingModule.service.js');
            loggingModuleService.getConfig.mockResolvedValue({ enabled: true });

            const result = await companyLogAccessService.validateCompanyAccess(context, 'company123');

            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('Company administrator access granted');
        });

        test('should deny company admin access to other companies', async () => {
            const context = new CompanyAccessContext('admin-1', 'company_admin', 'company123');

            const result = await companyLogAccessService.validateCompanyAccess(context, 'company456');

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Company administrator cannot access logs for company company456');
        });

        test('should deny company admin access when module is disabled', async () => {
            const context = new CompanyAccessContext('admin-1', 'company_admin', 'company123');

            // Mock module service to return disabled config
            const { default: loggingModuleService } = await import('../../services/loggingModule.service.js');
            loggingModuleService.getConfig.mockResolvedValue({ enabled: false });

            const result = await companyLogAccessService.validateCompanyAccess(context, 'company123');

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Logging module is disabled for this company');
        });

        test('should deny regular employee access', async () => {
            const context = new CompanyAccessContext('user-1', 'employee', 'company123');

            const result = await companyLogAccessService.validateCompanyAccess(context, 'company123');

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Insufficient privileges for log access');
        });
    });

    describe('validateCrossCompanyAccess', () => {
        test('should allow platform admin cross-company access', () => {
            const context = new CompanyAccessContext('admin-1', 'platform_admin', 'company123');

            const result = companyLogAccessService.validateCrossCompanyAccess(context, 'company456');

            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('Platform administrator can access all companies');
        });

        test('should deny company admin cross-company access', () => {
            const context = new CompanyAccessContext('admin-1', 'company_admin', 'company123');

            const result = companyLogAccessService.validateCrossCompanyAccess(context, 'company456');

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Company administrator cannot access company company456');
        });

        test('should allow same company access', () => {
            const context = new CompanyAccessContext('admin-1', 'company_admin', 'company123');

            const result = companyLogAccessService.validateCrossCompanyAccess(context, 'company123');

            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('Same company access allowed');
        });
    });

    describe('COMPANY_ADMIN_ROLES', () => {
        test('should include correct company admin roles', () => {
            expect(COMPANY_ADMIN_ROLES).toContain('company_admin');
            expect(COMPANY_ADMIN_ROLES).toContain('hr_manager');
            expect(COMPANY_ADMIN_ROLES).not.toContain('platform_admin');
            expect(COMPANY_ADMIN_ROLES).not.toContain('employee');
        });
    });

    describe('PLATFORM_ADMIN_ROLES', () => {
        test('should include correct platform admin roles', () => {
            expect(PLATFORM_ADMIN_ROLES).toContain('super_admin');
            expect(PLATFORM_ADMIN_ROLES).toContain('platform_admin');
            expect(PLATFORM_ADMIN_ROLES).not.toContain('company_admin');
        });
    });
});