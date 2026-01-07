/**
 * Audit Service Tests
 * 
 * Tests for comprehensive audit logging functionality
 * Requirements: 6.2, 6.4, 6.5, 7.5
 */

import auditService from '../services/auditService.js';
import SecurityAudit from '../../../platform/system/models/securityAudit.model.js';
import logger from '../../../utils/logger.js';

// Mock dependencies
jest.mock('../../../platform/system/models/securityAudit.model.js');
jest.mock('../../../utils/logger.js');
jest.mock('../../../utils/controllerLogger.js', () => ({
    logAuthenticationEvent: jest.fn(),
    logDataAccess: jest.fn(),
    logSecurityEvent: jest.fn(),
    logAdminAction: jest.fn()
}));

describe('Insurance Audit Service', () => {
    let mockReq;
    let mockUser;
    let mockTenant;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockUser = {
            _id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            role: 'employee'
        };

        mockTenant = {
            id: 'tenant123',
            companyName: 'Test Company'
        };

        mockReq = {
            user: mockUser,
            tenant: mockTenant,
            ip: '192.168.1.1',
            get: jest.fn().mockReturnValue('Mozilla/5.0'),
            originalUrl: '/api/v1/life-insurance/policies',
            method: 'GET',
            sessionID: 'session123',
            correlationId: 'corr123'
        };

        SecurityAudit.logEvent = jest.fn().mockResolvedValue({});
    });

    describe('logInsuranceAuthEvent', () => {
        it('should log authentication events with proper structure', async () => {
            await auditService.logInsuranceAuthEvent(mockReq, 'policy-creation-attempt', {
                policyType: 'CAT_A'
            });

            expect(SecurityAudit.logEvent).toHaveBeenCalledWith({
                eventType: 'insurance-policy-creation-attempt',
                user: mockUser._id,
                username: mockUser.username,
                userEmail: mockUser.email,
                userRole: mockUser.role,
                ipAddress: mockReq.ip,
                userAgent: 'Mozilla/5.0',
                requestUrl: mockReq.originalUrl,
                requestMethod: mockReq.method,
                sessionId: mockReq.sessionID,
                correlationId: mockReq.correlationId,
                details: {
                    module: 'life-insurance',
                    tenantId: mockTenant.id,
                    companyName: mockTenant.companyName,
                    policyType: 'CAT_A'
                },
                severity: 'info',
                success: true
            });

            expect(logger.audit).toHaveBeenCalledWith(
                'Insurance authentication event: policy-creation-attempt',
                expect.objectContaining({
                    userId: mockUser._id,
                    eventType: 'policy-creation-attempt'
                })
            );
        });

        it('should handle failed authentication events', async () => {
            await auditService.logInsuranceAuthEvent(mockReq, 'access-denied', {
                reason: 'insufficient-permissions'
            });

            expect(SecurityAudit.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'insurance-access-denied',
                    severity: 'warning',
                    success: false
                })
            );
        });
    });

    describe('logInsuranceAuthorizationEvent', () => {
        it('should log authorization granted events', async () => {
            await auditService.logInsuranceAuthorizationEvent(
                mockReq, 
                'create-policy', 
                'employee:123', 
                true, 
                { employeeId: '123' }
            );

            expect(SecurityAudit.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'insurance-authorization-granted',
                    severity: 'info',
                    success: true,
                    details: expect.objectContaining({
                        action: 'create-policy',
                        resource: 'employee:123',
                        granted: true,
                        employeeId: '123'
                    })
                })
            );
        });

        it('should log authorization denied events', async () => {
            await auditService.logInsuranceAuthorizationEvent(
                mockReq, 
                'delete-policy', 
                'policy:456', 
                false, 
                { reason: 'insufficient-role' }
            );

            expect(SecurityAudit.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'insurance-authorization-denied',
                    severity: 'warning',
                    success: false,
                    details: expect.objectContaining({
                        action: 'delete-policy',
                        resource: 'policy:456',
                        granted: false,
                        reason: 'insufficient-role'
                    })
                })
            );
        });
    });

    describe('logInsuranceDataAccess', () => {
        it('should log data access events with record information', async () => {
            const recordIds = ['policy123', 'policy456'];
            
            await auditService.logInsuranceDataAccess(
                mockReq, 
                'read', 
                'policy', 
                recordIds, 
                { operation: 'get-policies' }
            );

            expect(SecurityAudit.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'insurance-data-accessed',
                    details: expect.objectContaining({
                        operation: 'read',
                        dataType: 'policy',
                        recordIds: recordIds,
                        recordsAccessed: 2
                    })
                })
            );
        });

        it('should handle single record ID', async () => {
            await auditService.logInsuranceDataAccess(
                mockReq, 
                'update', 
                'family-member', 
                'fm123'
            );

            expect(SecurityAudit.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    details: expect.objectContaining({
                        recordIds: ['fm123'],
                        recordsAccessed: 1
                    })
                })
            );
        });
    });

    describe('logPolicyOperation', () => {
        it('should log policy operations with policy details', async () => {
            const policyData = {
                policyNumber: 'POL-001',
                employeeId: 'emp123',
                policyType: 'CAT_A',
                coverageAmount: 50000
            };

            await auditService.logPolicyOperation(
                mockReq, 
                'created', 
                'policy123', 
                policyData
            );

            expect(SecurityAudit.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'insurance-policy-created',
                    details: expect.objectContaining({
                        operation: 'created',
                        policyId: 'policy123',
                        policyNumber: 'POL-001',
                        employeeId: 'emp123',
                        policyType: 'CAT_A',
                        coverageAmount: 50000
                    })
                })
            );
        });
    });

    describe('logAccessDenied', () => {
        it('should log access denial with context', async () => {
            await auditService.logAccessDenied(
                mockReq, 
                'policy-creation', 
                'feature-not-available', 
                { requestedFeature: 'policyManagement' }
            );

            // Should log both authorization denial and security event
            expect(SecurityAudit.logEvent).toHaveBeenCalledTimes(1);
            expect(logger.warn).toHaveBeenCalledWith(
                'Insurance access denied: policy-creation',
                expect.objectContaining({
                    resource: 'policy-creation',
                    reason: 'feature-not-available',
                    requestedFeature: 'policyManagement'
                })
            );
        });
    });

    describe('logTenantStatusAccess', () => {
        it('should log tenant status access events', async () => {
            await auditService.logTenantStatusAccess(
                mockReq, 
                'suspended', 
                false, 
                { reason: 'account-suspended' }
            );

            expect(SecurityAudit.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'insurance-tenant-access-denied',
                    severity: 'warning',
                    success: false,
                    details: expect.objectContaining({
                        tenantStatus: 'suspended',
                        allowed: false,
                        reason: 'account-suspended'
                    })
                })
            );
        });
    });

    describe('error handling', () => {
        it('should handle SecurityAudit.logEvent failures gracefully', async () => {
            SecurityAudit.logEvent.mockRejectedValue(new Error('Database error'));

            // Should not throw error
            await expect(
                auditService.logInsuranceAuthEvent(mockReq, 'test-event')
            ).resolves.not.toThrow();

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to log insurance authentication event',
                expect.objectContaining({
                    eventType: 'test-event',
                    error: 'Database error'
                })
            );
        });
    });

    describe('getInsuranceAuditLogs', () => {
        it('should retrieve audit logs with proper filtering', async () => {
            const mockLogs = [
                { _id: 'log1', eventType: 'insurance-policy-created' },
                { _id: 'log2', eventType: 'insurance-claim-submitted' }
            ];

            SecurityAudit.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            skip: jest.fn().mockResolvedValue(mockLogs)
                        })
                    })
                })
            });

            SecurityAudit.countDocuments = jest.fn().mockResolvedValue(2);

            const result = await auditService.getInsuranceAuditLogs('tenant123', {
                limit: 10,
                skip: 0,
                eventType: 'policy'
            });

            expect(result).toEqual({
                logs: mockLogs,
                total: 2,
                limit: 10,
                skip: 0,
                hasMore: false
            });

            expect(SecurityAudit.find).toHaveBeenCalledWith({
                'details.module': 'life-insurance',
                'details.tenantId': 'tenant123',
                eventType: { $regex: 'policy', $options: 'i' }
            });
        });
    });
});