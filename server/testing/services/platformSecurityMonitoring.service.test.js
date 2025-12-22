/**
 * Platform Security Monitoring Service Tests
 * Tests for unauthorized admin access detection, cross-tenant violation monitoring,
 * and infrastructure attack detection
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import platformSecurityMonitoring from '../../services/platformSecurityMonitoring.service.js';

describe('Platform Security Monitoring Service', () => {
    beforeEach(() => {
        // Reset monitoring state before each test
        platformSecurityMonitoring.requestTracking.clear();
        platformSecurityMonitoring.adminAccessAttempts.clear();
        platformSecurityMonitoring.crossTenantViolations.clear();
        platformSecurityMonitoring.alertCooldowns.clear();
    });

    afterEach(() => {
        // Clean up after each test
        platformSecurityMonitoring.requestTracking.clear();
        platformSecurityMonitoring.adminAccessAttempts.clear();
        platformSecurityMonitoring.crossTenantViolations.clear();
        platformSecurityMonitoring.alertCooldowns.clear();
    });

    describe('Unauthorized Admin Access Detection', () => {
        test('should detect failed authentication to admin endpoint', async () => {
            const requestData = {
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0',
                endpoint: '/api/platform/admin/users',
                method: 'GET',
                statusCode: 401,
                userId: 'user123'
            };

            const violations = await platformSecurityMonitoring.detectUnauthorizedAdminAccess(requestData);

            expect(violations).toBeTruthy();
            expect(violations).toHaveLength(1);
            expect(violations[0].type).toBe('unauthorized_admin_access');
            expect(violations[0].severity).toBe('high');
            expect(violations[0].description).toBe('Failed authentication to admin endpoint');
        });

        test('should detect brute force attack on admin endpoint', async () => {
            const baseRequestData = {
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0',
                endpoint: '/api/platform/admin/login',
                method: 'POST',
                statusCode: 401,
                userId: 'attacker'
            };

            // Simulate 5 failed attempts
            let violations = null;
            for (let i = 0; i < 5; i++) {
                violations = await platformSecurityMonitoring.detectUnauthorizedAdminAccess(baseRequestData);
            }

            expect(violations).toBeTruthy();
            expect(violations.length).toBeGreaterThan(1);
            expect(violations.some(v => v.description.includes('Brute force attack'))).toBe(true);
        });

        test('should detect access without proper admin role', async () => {
            const requestData = {
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0',
                endpoint: '/api/platform/admin/settings',
                method: 'GET',
                statusCode: 200,
                userId: 'user123',
                adminRole: 'user' // Not an admin role
            };

            const violations = await platformSecurityMonitoring.detectUnauthorizedAdminAccess(requestData);

            expect(violations).toBeTruthy();
            expect(violations.some(v =>
                v.description.includes('Successful access to admin endpoint without admin role')
            )).toBe(true);
        });

        test('should detect suspicious user agent', async () => {
            const requestData = {
                ipAddress: '192.168.1.100',
                userAgent: 'curl/7.68.0',
                endpoint: '/api/platform/admin/users',
                method: 'GET',
                statusCode: 200,
                userId: 'user123',
                adminRole: 'admin'
            };

            const violations = await platformSecurityMonitoring.detectUnauthorizedAdminAccess(requestData);

            expect(violations).toBeTruthy();
            expect(violations.some(v =>
                v.description.includes('Suspicious user agent')
            )).toBe(true);
        });
    });

    describe('Cross-Tenant Violation Detection', () => {
        test('should detect cross-tenant data access attempt', async () => {
            const operationData = {
                userId: 'user123',
                userCompanyId: 'company-a',
                requestedCompanyId: 'company-b',
                operation: 'read',
                resource: 'employee_data',
                endpoint: '/api/employees',
                method: 'GET',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0'
            };

            const violations = await platformSecurityMonitoring.detectCrossTenantViolations(operationData);

            expect(violations).toBeTruthy();
            expect(violations).toHaveLength(1);
            expect(violations[0].type).toBe('tenant_boundary_breach');
            expect(violations[0].severity).toBe('critical');
            expect(violations[0].description).toBe('Cross-tenant data access attempt detected');
        });

        test('should detect systematic cross-tenant violation pattern', async () => {
            const baseOperationData = {
                userId: 'user123',
                userCompanyId: 'company-a',
                requestedCompanyId: 'company-b',
                operation: 'read',
                resource: 'employee_data',
                endpoint: '/api/employees',
                method: 'GET',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0'
            };

            // Simulate 10 violations to the same target company to trigger pattern detection
            let violations = null;
            for (let i = 0; i < 10; i++) {
                violations = await platformSecurityMonitoring.detectCrossTenantViolations(baseOperationData);
            }

            expect(violations).toBeTruthy();
            expect(violations.some(v =>
                v.description.includes('Systematic cross-tenant violation pattern')
            )).toBe(true);
        });

        test('should detect multi-tenant data harvesting', async () => {
            const baseOperationData = {
                userId: 'user123',
                userCompanyId: 'company-a',
                operation: 'read',
                resource: 'employee_data',
                endpoint: '/api/employees',
                method: 'GET',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0'
            };

            // Access 5 different companies from the same user/company combination
            let violations = null;
            for (let i = 0; i < 5; i++) {
                violations = await platformSecurityMonitoring.detectCrossTenantViolations({
                    ...baseOperationData,
                    requestedCompanyId: `target-company-${i}`
                });
            }

            expect(violations).toBeTruthy();
            expect(violations.some(v =>
                v.description.includes('Multi-tenant data harvesting attempt')
            )).toBe(true);
        });

        test('should not detect violation for same company access', async () => {
            const operationData = {
                userId: 'user123',
                userCompanyId: 'company-a',
                requestedCompanyId: 'company-a', // Same company
                operation: 'read',
                resource: 'employee_data',
                endpoint: '/api/employees',
                method: 'GET',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0'
            };

            const violations = await platformSecurityMonitoring.detectCrossTenantViolations(operationData);

            expect(violations).toBeNull();
        });
    });

    describe('Infrastructure Attack Detection', () => {
        test('should detect DDoS attack pattern', async () => {
            const baseRequestData = {
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0',
                endpoint: '/api/data',
                method: 'GET',
                responseTime: 100
            };

            // Simulate 101 requests to trigger DDoS detection
            let violations = null;
            for (let i = 0; i < 101; i++) {
                violations = await platformSecurityMonitoring.detectInfrastructureAttacks(baseRequestData);
            }

            expect(violations).toBeTruthy();
            expect(violations.some(v =>
                v.description.includes('High-volume request pattern detected')
            )).toBe(true);
        });

        test('should detect large request attack', async () => {
            const requestData = {
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0',
                endpoint: '/api/upload',
                method: 'POST',
                responseTime: 1000,
                requestSize: 15 * 1024 * 1024 // 15MB request
            };

            const violations = await platformSecurityMonitoring.detectInfrastructureAttacks(requestData);

            expect(violations).toBeTruthy();
            expect(violations.some(v =>
                v.description.includes('Unusually large request detected')
            )).toBe(true);
        });

        test('should detect systematic targeting of sensitive endpoints', async () => {
            const baseRequestData = {
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0',
                endpoint: '/api/platform/sensitive',
                method: 'GET',
                responseTime: 100
            };

            // Simulate 21 requests to sensitive endpoints
            let violations = null;
            for (let i = 0; i < 21; i++) {
                violations = await platformSecurityMonitoring.detectInfrastructureAttacks(baseRequestData);
            }

            expect(violations).toBeTruthy();
            expect(violations.some(v =>
                v.description.includes('Systematic targeting of sensitive endpoints')
            )).toBe(true);
        });
    });

    describe('Helper Methods', () => {
        test('should correctly identify admin endpoints', () => {
            expect(platformSecurityMonitoring.isAdminEndpoint('/api/platform/admin')).toBe(true);
            expect(platformSecurityMonitoring.isAdminEndpoint('/api/admin/users')).toBe(true);
            expect(platformSecurityMonitoring.isAdminEndpoint('/api/system/config')).toBe(true);
            expect(platformSecurityMonitoring.isAdminEndpoint('/api/users')).toBe(false);
            expect(platformSecurityMonitoring.isAdminEndpoint('/api/public/data')).toBe(false);
        });

        test('should correctly identify suspicious user agents', () => {
            expect(platformSecurityMonitoring.isSuspiciousUserAgent('curl/7.68.0')).toBe(true);
            expect(platformSecurityMonitoring.isSuspiciousUserAgent('wget/1.20.3')).toBe(true);
            expect(platformSecurityMonitoring.isSuspiciousUserAgent('python-requests/2.25.1')).toBe(true);
            expect(platformSecurityMonitoring.isSuspiciousUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
            expect(platformSecurityMonitoring.isSuspiciousUserAgent(null)).toBe(true);
        });

        test('should get monitoring statistics', () => {
            const stats = platformSecurityMonitoring.getMonitoringStats();

            expect(stats).toHaveProperty('isInitialized');
            expect(stats).toHaveProperty('monitoringEnabled');
            expect(stats).toHaveProperty('trackedIPs');
            expect(stats).toHaveProperty('adminAccessAttempts');
            expect(stats).toHaveProperty('crossTenantViolations');
            expect(stats).toHaveProperty('systemThresholds');
            expect(typeof stats.trackedIPs).toBe('number');
        });
    });

    describe('System Resource Monitoring', () => {
        test('should get system metrics', () => {
            const metrics = platformSecurityMonitoring.getSystemMetrics();

            expect(metrics).toHaveProperty('memoryUsage');
            expect(metrics).toHaveProperty('cpuUsage');
            expect(metrics).toHaveProperty('totalMemory');
            expect(metrics).toHaveProperty('freeMemory');
            expect(metrics).toHaveProperty('cpuCount');
            expect(metrics).toHaveProperty('loadAverage');
            expect(metrics).toHaveProperty('uptime');

            expect(typeof metrics.memoryUsage).toBe('number');
            expect(typeof metrics.cpuUsage).toBe('number');
            expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
            expect(metrics.memoryUsage).toBeLessThanOrEqual(1);
        });

        test('should identify impacted resources correctly', () => {
            const ddosResources = platformSecurityMonitoring.getImpactedResources('ddos_attack');
            expect(ddosResources).toContain('network');
            expect(ddosResources).toContain('cpu');
            expect(ddosResources).toContain('memory');

            const infraResources = platformSecurityMonitoring.getImpactedResources('infrastructure_attack');
            expect(infraResources).toContain('cpu');
            expect(infraResources).toContain('memory');
            expect(infraResources).toContain('disk');
            expect(infraResources).toContain('network');
        });
    });
});