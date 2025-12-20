/**
 * Log Access Control Service Tests
 * 
 * Tests for user authorization for log access with company-specific restrictions
 * and role-based log viewing permissions
 * 
 * Requirements: 3.2 - Log access authorization system
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import logAccessControl, { 
    UserAccessContext, 
    AccessControlDecision, 
    ROLE_PERMISSIONS, 
    LOG_TYPES 
} from '../../services/logAccessControl.service.js';

describe('Log Access Control Service', () => {
    let mockReq;
    let userContext;

    beforeEach(() => {
        // Reset service state
        logAccessControl.accessAuditLog = [];
        
        // Create mock request
        mockReq = {
            user: {
                id: 'user123',
                role: 'company_admin'
            },
            tenant: {
                tenantId: 'tenant123',
                id: 'tenant123'
            },
            tenantId: 'tenant123',
            companyId: 'tenant123'
        };

        userContext = new UserAccessContext('user123', 'company_admin', 'tenant123', 'tenant123');
    });

    afterEach(() => {
        // Clean up
        logAccessControl.accessAuditLog = [];
    });

    describe('UserAccessContext', () => {
        test('should create user context with correct permissions', () => {
            const context = new UserAccessContext('user1', 'hr_manager', 'tenant1', 'company1');
            
            expect(context.userId).toBe('user1');
            expect(context.userRole).toBe('hr_manager');
            expect(context.tenantId).toBe('tenant1');
            expect(context.companyId).toBe('company1');
            expect(context.permissions).toEqual(ROLE_PERMISSIONS.hr_manager);
        });

        test('should handle additional permissions', () => {
            const additionalPerms = { canAccessSpecialLogs: true };
            const context = new UserAccessContext('user1', 'employee', 'tenant1', 'company1', additionalPerms);
            
            expect(context.permissions.canAccessSpecialLogs).toBe(true);
            expect(context.permissions.canAccessAuditLogs).toBe(false); // from base role
        });

        describe('canAccessCompany', () => {
            test('should allow super admin to access any company', () => {
                const context = new UserAccessContext('user1', 'super_admin', 'tenant1', 'company1');
                
                expect(context.canAccessCompany('company1')).toBe(true);
                expect(context.canAccessCompany('company2')).toBe(true);
                expect(context.canAccessCompany('any-company')).toBe(true);
            });

            test('should restrict regular users to their own company', () => {
                const context = new UserAccessContext('user1', 'company_admin', 'tenant1', 'company1');
                
                expect(context.canAccessCompany('company1')).toBe(true);
                expect(context.canAccessCompany('company2')).toBe(false);
            });
        });

        describe('canAccessLogType', () => {
            test('should allow company admin to access most log types', () => {
                const context = new UserAccessContext('user1', 'company_admin', 'tenant1', 'company1');
                
                expect(context.canAccessLogType('audit')).toBe(true);
                expect(context.canAccessLogType('security')).toBe(true);
                expect(context.canAccessLogType('error')).toBe(true);
                expect(context.canAccessLogType('performance')).toBe(true);
                expect(context.canAccessLogType('platform')).toBe(false);
            });

            test('should restrict employee access to log types', () => {
                const context = new UserAccessContext('user1', 'employee', 'tenant1', 'company1');
                
                expect(context.canAccessLogType('audit')).toBe(false);
                expect(context.canAccessLogType('security')).toBe(false);
                expect(context.canAccessLogType('error')).toBe(false);
                expect(context.canAccessLogType('general')).toBe(true);
            });

            test('should allow super admin to access all log types', () => {
                const context = new UserAccessContext('user1', 'super_admin', 'tenant1', 'company1');
                
                expect(context.canAccessLogType('audit')).toBe(true);
                expect(context.canAccessLogType('security')).toBe(true);
                expect(context.canAccessLogType('platform')).toBe(true);
            });
        });

        describe('canPerformAction', () => {
            test('should allow appropriate actions based on role', () => {
                const adminContext = new UserAccessContext('user1', 'company_admin', 'tenant1', 'company1');
                const employeeContext = new UserAccessContext('user2', 'employee', 'tenant1', 'company1');
                
                expect(adminContext.canPerformAction('export')).toBe(true);
                expect(adminContext.canPerformAction('delete')).toBe(false);
                expect(adminContext.canPerformAction('read')).toBe(true);
                
                expect(employeeContext.canPerformAction('export')).toBe(false);
                expect(employeeContext.canPerformAction('delete')).toBe(false);
                expect(employeeContext.canPerformAction('read')).toBe(true);
            });
        });
    });

    describe('AccessControlDecision', () => {
        test('should create allow decision', () => {
            const decision = AccessControlDecision.allow('Test reason', { maxResults: 100 });
            
            expect(decision.allowed).toBe(true);
            expect(decision.reason).toBe('Test reason');
            expect(decision.restrictions.maxResults).toBe(100);
            expect(decision.timestamp).toBeDefined();
        });

        test('should create deny decision', () => {
            const decision = AccessControlDecision.deny('Access denied');
            
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toBe('Access denied');
            expect(decision.restrictions).toEqual({});
        });
    });

    describe('LogAccessControlEngine', () => {
        describe('createUserContext', () => {
            test('should create user context from request', () => {
                const context = logAccessControl.createUserContext(mockReq);
                
                expect(context.userId).toBe('user123');
                expect(context.userRole).toBe('company_admin');
                expect(context.tenantId).toBe('tenant123');
                expect(context.companyId).toBe('tenant123');
            });

            test('should throw error for invalid request', () => {
                const invalidReq = { user: {} };
                
                expect(() => {
                    logAccessControl.createUserContext(invalidReq);
                }).toThrow('Invalid user context: missing userId or tenantId');
            });
        });

        describe('checkCompanyAccess', () => {
            test('should allow access to own company', () => {
                const decision = logAccessControl.checkCompanyAccess(userContext, 'tenant123', 'audit');
                
                expect(decision.allowed).toBe(true);
                expect(decision.reason).toContain('Access granted');
                expect(decision.restrictions).toBeDefined();
            });

            test('should deny access to different company', () => {
                const decision = logAccessControl.checkCompanyAccess(userContext, 'other-tenant', 'audit');
                
                expect(decision.allowed).toBe(false);
                expect(decision.reason).toContain('cannot access logs for company');
            });

            test('should deny access to restricted log type', () => {
                const employeeContext = new UserAccessContext('user1', 'employee', 'tenant123', 'tenant123');
                const decision = logAccessControl.checkCompanyAccess(employeeContext, 'tenant123', 'audit');
                
                expect(decision.allowed).toBe(false);
                expect(decision.reason).toContain('cannot access audit logs');
            });

            test('should allow super admin access to any company', () => {
                const superAdminContext = new UserAccessContext('admin1', 'super_admin', 'tenant1', 'company1');
                const decision = logAccessControl.checkCompanyAccess(superAdminContext, 'any-company', 'platform');
                
                expect(decision.allowed).toBe(true);
            });
        });

        describe('checkActionPermission', () => {
            test('should allow permitted actions', () => {
                const decision = logAccessControl.checkActionPermission(userContext, 'export', 'tenant123', 'audit');
                
                expect(decision.allowed).toBe(true);
                expect(decision.reason).toContain('Action export granted');
            });

            test('should deny unpermitted actions', () => {
                const decision = logAccessControl.checkActionPermission(userContext, 'delete', 'tenant123', 'audit');
                
                expect(decision.allowed).toBe(false);
                expect(decision.reason).toContain('cannot perform delete action');
            });

            test('should deny action if basic access is denied', () => {
                const decision = logAccessControl.checkActionPermission(userContext, 'read', 'other-tenant', 'audit');
                
                expect(decision.allowed).toBe(false);
                expect(decision.reason).toContain('cannot access logs for company');
            });
        });

        describe('getAccessibleCompanies', () => {
            test('should return all companies for super admin', () => {
                const superAdminContext = new UserAccessContext('admin1', 'super_admin', 'tenant1', 'company1');
                const result = logAccessControl.getAccessibleCompanies(superAdminContext);
                
                expect(result.all).toBe(true);
                expect(result.companies).toEqual([]);
            });

            test('should return own company for regular users', () => {
                const result = logAccessControl.getAccessibleCompanies(userContext);
                
                expect(result.all).toBe(false);
                expect(result.companies).toEqual(['tenant123']);
            });
        });

        describe('getAccessibleLogTypes', () => {
            test('should return appropriate log types for role', () => {
                const types = logAccessControl.getAccessibleLogTypes(userContext);
                
                const typeNames = types.map(t => t.type);
                expect(typeNames).toContain('audit');
                expect(typeNames).toContain('security');
                expect(typeNames).toContain('error');
                expect(typeNames).not.toContain('platform');
            });

            test('should return all log types for super admin', () => {
                const superAdminContext = new UserAccessContext('admin1', 'super_admin', 'tenant1', 'company1');
                const types = logAccessControl.getAccessibleLogTypes(superAdminContext);
                
                const typeNames = types.map(t => t.type);
                expect(typeNames).toContain('platform');
                expect(typeNames).toContain('audit');
                expect(typeNames).toContain('security');
            });
        });

        describe('calculateRestrictions', () => {
            test('should apply time restrictions for sensitive logs', () => {
                const restrictions = logAccessControl.calculateRestrictions(userContext, 'audit');
                
                expect(restrictions.maxTimeRange).toBeDefined();
                expect(restrictions.maxResults).toBeDefined();
            });

            test('should apply result size restrictions based on role', () => {
                const employeeContext = new UserAccessContext('user1', 'employee', 'tenant1', 'company1');
                const hrContext = new UserAccessContext('user2', 'hr_manager', 'tenant1', 'company1');
                
                const employeeRestrictions = logAccessControl.calculateRestrictions(employeeContext, 'general');
                const hrRestrictions = logAccessControl.calculateRestrictions(hrContext, 'general');
                
                expect(employeeRestrictions.maxResults).toBe(100);
                expect(hrRestrictions.maxResults).toBe(1000);
            });

            test('should exclude sensitive fields for non-admin users', () => {
                const restrictions = logAccessControl.calculateRestrictions(userContext, 'audit');
                
                expect(restrictions.excludeFields).toContain('ip');
                expect(restrictions.excludeFields).toContain('userAgent');
            });
        });

        describe('validateLogPath', () => {
            test('should allow valid company-specific path', () => {
                const validPath = 'logs/tenant123/audit.log';
                const decision = logAccessControl.validateLogPath(validPath, userContext, 'tenant123');
                
                expect(decision.allowed).toBe(true);
            });

            test('should deny directory traversal attempts', () => {
                const maliciousPath = '../../../etc/passwd';
                const decision = logAccessControl.validateLogPath(maliciousPath, userContext, 'tenant123');
                
                expect(decision.allowed).toBe(false);
                expect(decision.reason).toContain('directory traversal detected');
            });

            test('should deny cross-company access', () => {
                const crossCompanyPath = 'logs/other-tenant/audit.log';
                const decision = logAccessControl.validateLogPath(crossCompanyPath, userContext, 'tenant123');
                
                expect(decision.allowed).toBe(false);
                expect(decision.reason).toContain('cross-company access denied');
            });

            test('should allow super admin to access any path', () => {
                const superAdminContext = new UserAccessContext('admin1', 'super_admin', 'tenant1', 'company1');
                const anyPath = 'logs/any-tenant/audit.log';
                const decision = logAccessControl.validateLogPath(anyPath, superAdminContext, 'any-tenant');
                
                expect(decision.allowed).toBe(true);
            });
        });

        describe('auditAccess', () => {
            test('should record access attempts', () => {
                logAccessControl.auditAccess(userContext, 'test_event', { detail: 'test' });
                
                expect(logAccessControl.accessAuditLog).toHaveLength(1);
                expect(logAccessControl.accessAuditLog[0].eventType).toBe('test_event');
                expect(logAccessControl.accessAuditLog[0].userId).toBe('user123');
            });

            test('should trim audit log when it exceeds max size', () => {
                // Fill audit log to max capacity
                logAccessControl.maxAuditEntries = 3;
                
                for (let i = 0; i < 5; i++) {
                    logAccessControl.auditAccess(userContext, `event_${i}`, {});
                }
                
                expect(logAccessControl.accessAuditLog).toHaveLength(3);
                expect(logAccessControl.accessAuditLog[0].eventType).toBe('event_2');
                expect(logAccessControl.accessAuditLog[2].eventType).toBe('event_4');
            });
        });

        describe('getAccessAuditLog', () => {
            beforeEach(() => {
                // Add some test audit entries
                logAccessControl.auditAccess(userContext, 'event1', {});
                logAccessControl.auditAccess(userContext, 'event2', {});
            });

            test('should return audit log for super admin', () => {
                const superAdminContext = new UserAccessContext('admin1', 'super_admin', 'tenant1', 'company1');
                const log = logAccessControl.getAccessAuditLog(superAdminContext);
                
                expect(log).toHaveLength(2);
                expect(log[0].eventType).toBe('event1');
            });

            test('should deny audit log access for non-super admin', () => {
                expect(() => {
                    logAccessControl.getAccessAuditLog(userContext);
                }).toThrow('Insufficient permissions to access audit log');
            });

            test('should filter audit log by criteria', () => {
                const superAdminContext = new UserAccessContext('admin1', 'super_admin', 'tenant1', 'company1');
                const log = logAccessControl.getAccessAuditLog(superAdminContext, { eventType: 'event1' });
                
                expect(log).toHaveLength(1);
                expect(log[0].eventType).toBe('event1');
            });
        });

        describe('clearAccessAuditLog', () => {
            test('should clear audit log for super admin', () => {
                logAccessControl.auditAccess(userContext, 'test_event', {});
                
                const superAdminContext = new UserAccessContext('admin1', 'super_admin', 'tenant1', 'company1');
                const clearedCount = logAccessControl.clearAccessAuditLog(superAdminContext);
                
                expect(clearedCount).toBe(1);
                expect(logAccessControl.accessAuditLog).toHaveLength(1); // New audit entry for the clear action
            });

            test('should deny clear access for non-super admin', () => {
                expect(() => {
                    logAccessControl.clearAccessAuditLog(userContext);
                }).toThrow('Insufficient permissions to clear audit log');
            });
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete access control flow', () => {
            // Create user context
            const context = logAccessControl.createUserContext(mockReq);
            
            // Check company access
            const accessDecision = logAccessControl.checkCompanyAccess(context, 'tenant123', 'audit');
            expect(accessDecision.allowed).toBe(true);
            
            // Check action permission
            const actionDecision = logAccessControl.checkActionPermission(context, 'export', 'tenant123', 'audit');
            expect(actionDecision.allowed).toBe(true);
            
            // Validate file path
            const pathDecision = logAccessControl.validateLogPath('logs/tenant123/audit.log', context, 'tenant123');
            expect(pathDecision.allowed).toBe(true);
            
            // Check audit log was populated
            expect(logAccessControl.accessAuditLog.length).toBeGreaterThan(0);
        });

        test('should handle error conditions gracefully', () => {
            const invalidContext = new UserAccessContext('user1', 'invalid_role', 'tenant1', 'company1');
            
            // Should not crash with invalid role
            const decision = logAccessControl.checkCompanyAccess(invalidContext, 'tenant1', 'audit');
            expect(decision).toBeDefined();
        });
    });
});