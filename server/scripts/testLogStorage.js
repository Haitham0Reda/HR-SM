/**
 * Test Script for Log Storage System
 * Demonstrates the enhanced log storage and retention functionality
 */

import logManagementService from '../services/logManagement.service.js';
import { getLoggerForTenant } from '../utils/companyLogger.js';
import platformLogger from '../utils/platformLogger.js';

async function testLogStorageSystem() {
    console.log('🚀 Testing Enhanced Log Storage System\n');

    try {
        // Initialize the log management system
        console.log('1. Initializing log management system...');
        await logManagementService.initialize();
        console.log('✅ Log management system initialized\n');

        // Setup company logging
        console.log('2. Setting up company logging...');
        const testTenantId = 'demo-tenant-123';
        const testCompanyName = 'Demo Company Inc';
        
        const setupResult = await logManagementService.setupCompanyLogging(
            testTenantId, 
            testCompanyName
        );
        console.log('✅ Company logging setup completed');
        console.log(`   Directory: ${setupResult.logDirectory}\n`);

        // Test company logging
        console.log('3. Testing company logging...');
        const companyLogger = await getLoggerForTenant(testTenantId, testCompanyName);
        
        companyLogger.info('Demo application started');
        companyLogger.audit('User login', { 
            action: 'user_login', 
            userId: 'demo-user-123',
            ipAddress: '192.168.1.100'
        });
        companyLogger.security('Failed login attempt detected', {
            eventType: 'authentication_failure',
            severity: 'medium',
            ipAddress: '192.168.1.200'
        });
        companyLogger.performance('api_response_time', 250, {
            endpoint: '/api/users',
            method: 'GET'
        });
        console.log('✅ Company logs created\n');

        // Test platform logging
        console.log('4. Testing platform logging...');
        platformLogger.adminAction('demo_test', 'system', {
            details: 'Testing platform logging system'
        });
        platformLogger.companyManagement('create', testTenantId, {
            companyName: testCompanyName,
            adminUser: 'system'
        });
        platformLogger.platformSecurity('Demo security event', {
            eventType: 'test_security_event',
            severity: 'low'
        });
        console.log('✅ Platform logs created\n');

        // Create immutable audit record
        console.log('5. Creating immutable audit record...');
        const auditRecord = await logManagementService.createAuditRecord('ADMIN_ACTIONS', {
            eventType: 'demo_audit_event',
            userId: 'demo-user',
            action: 'test_action',
            details: 'Demo immutable audit record'
        });
        console.log('✅ Immutable audit record created');
        console.log(`   Index: ${auditRecord.index}, Hash: ${auditRecord.hash.substring(0, 16)}...\n`);

        // Get storage statistics
        console.log('6. Getting storage statistics...');
        const stats = await logManagementService.getStorageStatistics();
        console.log('✅ Storage statistics retrieved');
        console.log(`   Platform size: ${stats.platform?.totalSizeMB || 0} MB`);
        console.log(`   Platform files: ${stats.platform?.totalFiles || 0}`);
        console.log(`   Total size: ${stats.summary.totalSizeMB} MB\n`);

        // Run integrity check
        console.log('7. Running integrity check...');
        const integrityResults = await logManagementService.runIntegrityCheck({
            includeCompanyLogs: false,
            includePlatformLogs: true
        });
        console.log('✅ Integrity check completed');
        console.log(`   Integrity score: ${(integrityResults.summary.overallIntegrityScore * 100).toFixed(2)}%`);
        console.log(`   Valid entries: ${integrityResults.summary.totalValid}`);
        console.log(`   Invalid entries: ${integrityResults.summary.totalInvalid}\n`);

        // Get system health
        console.log('8. Checking system health...');
        const health = logManagementService.getSystemHealth();
        console.log('✅ System health check completed');
        console.log(`   Initialized: ${health.initialized}`);
        console.log(`   Retention scheduler running: ${health.retentionScheduler.running}`);
        console.log(`   Scheduled tasks: ${health.retentionScheduler.status.taskCount}\n`);

        // Test manual retention cleanup (dry run)
        console.log('9. Testing retention cleanup (dry run)...');
        const cleanupResults = await logManagementService.runRetentionCleanup({
            dryRun: true,
            includeCompanyLogs: true,
            includePlatformLogs: true
        });
        console.log('✅ Retention cleanup test completed (dry run)');
        console.log(`   Dry run: ${cleanupResults.dryRun}\n`);

        console.log('🎉 All log storage system tests completed successfully!');

    } catch (error) {
        console.error('❌ Error testing log storage system:', error.message);
        console.error(error.stack);
    } finally {
        // Shutdown the system
        console.log('\n10. Shutting down log management system...');
        await logManagementService.shutdown();
        console.log('✅ Log management system shutdown completed');
    }
}

// Run the test
testLogStorageSystem().catch(console.error);