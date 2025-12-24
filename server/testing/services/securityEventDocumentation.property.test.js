/**
 * Property Test: Security Event Documentation
 * 
 * Tests that security events are properly documented with all required context information
 * as specified in Requirements 7.3
 */

import fc from 'fast-check';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import SecurityAudit from '../../platform/system/models/securityAudit.model.js';

describe('Security Event Documentation Properties', () => {
    beforeEach(async () => {
        // Clean database before each test
        await SecurityAudit.deleteMany({});
    });

    afterEach(async () => {
        // Clean up after each test
        await SecurityAudit.deleteMany({});
    });

    test('Property 26: Security Event Documentation', async () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 26: Security Event Documentation
         * Validates: Requirements 7.3
         * 
         * For any security event (failed login, suspicious activity), the system should create 
         * detailed audit entries with all relevant context information
         */
        
        await fc.assert(fc.asyncProperty(
            fc.record({
                // Security event types that should be documented
                eventType: fc.constantFrom(
                    'login-failed',
                    'unauthorized-access', 
                    'suspicious-activity',
                    'ip-blocked',
                    'account-locked',
                    'session-terminated'
                ),
                // User information (may be null for anonymous attacks)
                hasUserId: fc.boolean(),
                username: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: null }),
                userEmail: fc.option(fc.emailAddress(), { nil: null }),
                userRole: fc.option(fc.constantFrom('admin', 'user', 'manager'), { nil: null }),
                // Request context information
                ipAddress: fc.ipV4(),
                userAgent: fc.string({ minLength: 10, maxLength: 200 }),
                requestUrl: fc.webUrl(),
                requestMethod: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
                // Security-specific details
                details: fc.record({
                    attemptCount: fc.integer({ min: 1, max: 10 }),
                    reason: fc.string({ minLength: 5, maxLength: 100 }),
                    sourceCountry: fc.option(fc.string({ minLength: 2, maxLength: 2 }), { nil: null }),
                    threatLevel: fc.constantFrom('low', 'medium', 'high', 'critical')
                }),
                // Session information
                sessionId: fc.option(fc.string({ minLength: 32, maxLength: 64 }), { nil: null })
            }),
            async (securityEventData) => {
                // Generate unique ObjectId for userId if needed
                const userId = securityEventData.hasUserId ? 
                    new mongoose.Types.ObjectId() : null;

                // Create security event audit log
                const auditData = {
                    eventType: securityEventData.eventType,
                    user: userId,
                    username: securityEventData.username,
                    userEmail: securityEventData.userEmail,
                    userRole: securityEventData.userRole,
                    ipAddress: securityEventData.ipAddress,
                    userAgent: securityEventData.userAgent,
                    requestUrl: securityEventData.requestUrl,
                    requestMethod: securityEventData.requestMethod,
                    details: securityEventData.details,
                    sessionId: securityEventData.sessionId,
                    severity: 'warning', // Security events should be at least warning level
                    success: false // Security events typically represent failures
                };

                const auditLog = await SecurityAudit.logEvent(auditData);

                // Assertion 1: Audit log should be created successfully
                expect(auditLog).toBeDefined();
                expect(auditLog._id).toBeDefined();

                // Assertion 2: All required security event fields should be present
                expect(auditLog.eventType).toBe(securityEventData.eventType);
                expect(auditLog.ipAddress).toBe(securityEventData.ipAddress);
                expect(auditLog.userAgent).toBe(securityEventData.userAgent);
                expect(auditLog.requestUrl).toBe(securityEventData.requestUrl);
                expect(auditLog.requestMethod).toBe(securityEventData.requestMethod);

                // Assertion 3: User information should be properly stored (if provided)
                if (securityEventData.hasUserId) {
                    expect(auditLog.user.toString()).toBe(userId.toString());
                }
                if (securityEventData.username) {
                    expect(auditLog.username).toBe(securityEventData.username);
                }
                if (securityEventData.userEmail) {
                    expect(auditLog.userEmail).toBe(securityEventData.userEmail);
                }
                if (securityEventData.userRole) {
                    expect(auditLog.userRole).toBe(securityEventData.userRole);
                }

                // Assertion 4: Security-specific details should be preserved
                expect(auditLog.details).toBeDefined();
                expect(auditLog.details.attemptCount).toBe(securityEventData.details.attemptCount);
                expect(auditLog.details.reason).toBe(securityEventData.details.reason);
                expect(auditLog.details.threatLevel).toBe(securityEventData.details.threatLevel);
                
                if (securityEventData.details.sourceCountry) {
                    expect(auditLog.details.sourceCountry).toBe(securityEventData.details.sourceCountry);
                }

                // Assertion 5: Security events should have appropriate severity
                expect(auditLog.severity).toMatch(/^(warning|critical)$/);
                expect(auditLog.success).toBe(false);

                // Assertion 6: Timestamp should be automatically set and recent
                expect(auditLog.timestamp).toBeInstanceOf(Date);
                const timeDiff = Date.now() - auditLog.timestamp.getTime();
                expect(timeDiff).toBeLessThan(5000); // Within 5 seconds

                // Assertion 7: Session information should be preserved if provided
                if (securityEventData.sessionId) {
                    expect(auditLog.sessionId).toBe(securityEventData.sessionId);
                }

                // Assertion 8: Audit log should be retrievable for security reporting
                const retrievedLog = await SecurityAudit.findById(auditLog._id);
                expect(retrievedLog).toBeDefined();
                expect(retrievedLog.eventType).toBe(securityEventData.eventType);

                // Assertion 9: Security events should be included in suspicious activity queries
                const suspiciousActivities = await SecurityAudit.getSuspiciousActivities(1);
                const foundInSuspicious = suspiciousActivities.some(
                    activity => activity._id.toString() === auditLog._id.toString()
                );
                expect(foundInSuspicious).toBe(true);

                // Clean up
                await SecurityAudit.findByIdAndDelete(auditLog._id);
            }
        ), { numRuns: 100 });
    });

    test('Property 26.1: Failed Login Documentation Completeness', async () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 26.1: Failed Login Documentation Completeness
         * Validates: Requirements 7.3
         * 
         * For any failed login attempt, all relevant context should be documented
         */
        
        await fc.assert(fc.asyncProperty(
            fc.record({
                username: fc.string({ minLength: 3, maxLength: 50 }),
                ipAddress: fc.ipV4(),
                userAgent: fc.string({ minLength: 10, maxLength: 200 }),
                failureReason: fc.constantFrom(
                    'invalid_password',
                    'account_locked',
                    'account_disabled',
                    'invalid_username',
                    'too_many_attempts'
                ),
                attemptNumber: fc.integer({ min: 1, max: 10 })
            }),
            async (loginData) => {
                // Simulate failed login event
                const mockRequest = {
                    ip: loginData.ipAddress,
                    get: (header) => header === 'user-agent' ? loginData.userAgent : null,
                    originalUrl: '/api/auth/login',
                    method: 'POST'
                };

                const auditLog = await SecurityAudit.logAuth(
                    'login-failed',
                    null, // No user object for failed login
                    mockRequest,
                    {
                        username: loginData.username,
                        failureReason: loginData.failureReason,
                        attemptNumber: loginData.attemptNumber
                    }
                );

                // Assertion 1: Failed login should be documented
                expect(auditLog).toBeDefined();
                expect(auditLog.eventType).toBe('login-failed');
                expect(auditLog.success).toBe(false);

                // Assertion 2: All context information should be preserved
                expect(auditLog.ipAddress).toBe(loginData.ipAddress);
                expect(auditLog.userAgent).toBe(loginData.userAgent);
                expect(auditLog.requestUrl).toBe('/api/auth/login');
                expect(auditLog.requestMethod).toBe('POST');

                // Assertion 3: Login-specific details should be documented
                expect(auditLog.details.username).toBe(loginData.username);
                expect(auditLog.details.failureReason).toBe(loginData.failureReason);
                expect(auditLog.details.attemptNumber).toBe(loginData.attemptNumber);

                // Assertion 4: Failed logins should have warning severity
                expect(auditLog.severity).toBe('warning');

                // Clean up
                await SecurityAudit.findByIdAndDelete(auditLog._id);
            }
        ), { numRuns: 50 });
    });

    test('Property 26.2: Security Incident Context Preservation', async () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 26.2: Security Incident Context Preservation
         * Validates: Requirements 7.3
         * 
         * For any security incident, all relevant context information should be preserved
         */
        
        await fc.assert(fc.asyncProperty(
            fc.record({
                incidentType: fc.constantFrom(
                    'unauthorized-access',
                    'suspicious-activity',
                    'ip-blocked'
                ),
                hasUserId: fc.boolean(),
                ipAddress: fc.ipV4(),
                userAgent: fc.string({ minLength: 10, maxLength: 200 }),
                incidentDetails: fc.record({
                    description: fc.string({ minLength: 10, maxLength: 200 }),
                    riskLevel: fc.constantFrom('low', 'medium', 'high', 'critical'),
                    affectedResources: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
                    mitigationActions: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 0, maxLength: 3 })
                })
            }),
            async (incidentData) => {
                const userId = incidentData.hasUserId ? 
                    new mongoose.Types.ObjectId() : null;

                // Create security incident audit log
                const auditLog = await SecurityAudit.logEvent({
                    eventType: incidentData.incidentType,
                    user: userId,
                    ipAddress: incidentData.ipAddress,
                    userAgent: incidentData.userAgent,
                    details: incidentData.incidentDetails,
                    severity: incidentData.incidentDetails.riskLevel === 'critical' ? 'critical' : 'warning',
                    success: false
                });

                // Assertion 1: Security incident should be documented
                expect(auditLog).toBeDefined();
                expect(auditLog.eventType).toBe(incidentData.incidentType);

                // Assertion 2: All incident context should be preserved
                expect(auditLog.details.description).toBe(incidentData.incidentDetails.description);
                expect(auditLog.details.riskLevel).toBe(incidentData.incidentDetails.riskLevel);
                expect(auditLog.details.affectedResources).toEqual(incidentData.incidentDetails.affectedResources);
                expect(auditLog.details.mitigationActions).toEqual(incidentData.incidentDetails.mitigationActions);

                // Assertion 3: Severity should match risk level
                if (incidentData.incidentDetails.riskLevel === 'critical') {
                    expect(auditLog.severity).toBe('critical');
                } else {
                    expect(auditLog.severity).toBe('warning');
                }

                // Assertion 4: Security incidents should be retrievable for reporting
                const securityStats = await SecurityAudit.getSecurityStats(1);
                const eventFound = securityStats.eventStats.some(
                    stat => stat._id === incidentData.incidentType
                );
                expect(eventFound).toBe(true);

                // Clean up
                await SecurityAudit.findByIdAndDelete(auditLog._id);
            }
        ), { numRuns: 50 });
    });
});