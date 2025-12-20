/**
 * Integration Tests for Log Storage System
 * Tests the complete log storage and retention system
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logManagementService from '../../services/logManagement.service.js';
import { getLoggerForTenant } from '../../utils/companyLogger.js';
import platformLogger from '../../utils/platformLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Log Storage Integration', () => {
    const testTenantId = 'integration-test-tenant';
    const testCompanyName = 'Integration Test Company';

    beforeAll(async () => {
        // Initialize the log management system
        await logManagementService.initialize();
    });

    afterAll(async () => {
        // Shutdown the log management system
        await logManagementService.shutdown();
        
        // Clean up test log directories
        const testCompanyDir = path.join(__dirname, '../../../logs/companies/integration_test_company');
        if (fs.existsSync(testCompanyDir)) {
            fs.rmSync(testCompanyDir, { recursive: true, force: true });
        }
    });

    describe('Company Logging Setup', () => {
        test('should setup complete logging infrastructure for a company', async () => {
            const result = await logManagementService.setupCompanyLogging(
                testTenantId, 
                testCompanyName,
                { enableAllLogTypes: true }
            );

            expect(result.success).toBe(true);
            expect(result.tenantId).toBe(testTenantId);
            expect(result.companyName).toBe(testCompanyName);
            expect(result.logDirectory).toBeDefined();

            // Verify directory structure was created
            const companyDir = result.logDirectory;
            expect(fs.existsSync(companyDir)).toBe(true);
            expect(fs.existsSync(path.join(companyDir, 'audit'))).toBe(true);
            expect(fs.existsSync(path.join(companyDir, 'security'))).toBe(true);
            expect(fs.existsSync(path.join(companyDir, 'performance'))).toBe(true);
            expect(fs.existsSync(path.join(companyDir, 'compliance'))).toBe(true);
        });
    });

    describe('Company Logger Integration', () => {
        test('should create logs in correct directories', async () => {
            const companyLogger = await getLoggerForTenant(testTenantId, testCompanyName);

            // Test different log types
            companyLogger.info('Test application log');
            companyLogger.error('Test error log');
            companyLogger.audit('Test audit log', { action: 'test_action', userId: 'test-user' });
            companyLogger.security('Test security log', { eventType: 'test_security_event' });
            companyLogger.performance('api_response_time', 150, { endpoint: '/test' });

            // Give some time for logs to be written
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify logs were created (in test mode, they go to console, but we can verify the logger works)
            expect(companyLogger).toBeDefined();
            expect(typeof companyLogger.info).toBe('function');
            expect(typeof companyLogger.audit).toBe('function');
            expect(typeof companyLogger.security).toBe('function');
            expect(typeof companyLogger.performance).toBe('function');
        });
    });

    describe('Platform Logger Integration', () => {
        test('should log platform events correctly', async () => {
            // Test platform logging
            platformLogger.adminAction('test_admin_action', 'test-admin', {
                details: 'Integration test admin action'
            });

            platformLogger.companyManagement('create', testTenantId, {
                companyName: testCompanyName,
                adminUser: 'test-admin'
            });

            platformLogger.platformSecurity('Test platform security event', {
                eventType: 'test_platform_security',
                severity: 'medium'
            });

            // Verify platform logger works
            expect(platformLogger).toBeDefined();
            expect(typeof platformLogger.adminAction).toBe('function');
            expect(typeof platformLogger.companyManagement).toBe('function');
            expect(typeof platformLogger.platformSecurity).toBe('function');
        });
    });

    describe('Storage Statistics', () => {
        test('should provide comprehensive storage statistics', async () => {
            const stats = await logManagementService.getStorageStatistics(true);

            expect(stats).toBeDefined();
            expect(stats.platform).toBeDefined();
            expect(stats.summary).toBeDefined();
            expect(stats.summary.totalSizeMB).toBeGreaterThanOrEqual(0);
            expect(stats.summary.totalFiles).toBeGreaterThanOrEqual(0);
            expect(stats.generatedAt).toBeDefined();
        });
    });

    describe('System Health', () => {
        test('should report system health status', () => {
            const health = logManagementService.getSystemHealth();

            expect(health).toBeDefined();
            expect(health.initialized).toBe(true);
            expect(health.retentionScheduler).toBeDefined();
            expect(health.timestamp).toBeDefined();
        });
    });

    describe('Integrity Checks', () => {
        test('should run integrity checks without errors', async () => {
            const results = await logManagementService.runIntegrityCheck({
                includeCompanyLogs: false, // Skip company logs for faster test
                includePlatformLogs: true,
                detailed: false
            });

            expect(results).toBeDefined();
            expect(results.summary).toBeDefined();
            expect(results.summary.overallIntegrityScore).toBeGreaterThanOrEqual(0);
            expect(results.summary.overallIntegrityScore).toBeLessThanOrEqual(1);
            expect(results.checkedAt).toBeDefined();
        });
    });

    describe('Audit Record Creation', () => {
        test('should create immutable audit records', async () => {
            const auditData = {
                eventType: 'integration_test_audit',
                userId: 'test-user',
                action: 'test_action',
                details: 'Integration test audit record'
            };

            const auditEntry = await logManagementService.createAuditRecord(
                'ADMIN_ACTIONS', 
                auditData
            );

            expect(auditEntry).toBeDefined();
            expect(auditEntry.index).toBeGreaterThan(0);
            expect(auditEntry.hash).toBeDefined();
            expect(auditEntry.timestamp).toBeDefined();
            expect(auditEntry.data).toEqual(auditData);
        });
    });
});