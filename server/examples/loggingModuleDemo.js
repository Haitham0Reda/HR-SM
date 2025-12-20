/**
 * Logging Module Configuration System Demo
 * 
 * Demonstrates the real-time configuration management capabilities
 * of the comprehensive logging system
 */

import loggingModuleInitializer from '../services/loggingModuleInitializer.service.js';

async function demonstrateLoggingModule() {
    console.log('=== Logging Module Configuration System Demo ===\n');

    try {
        // Initialize the logging module system
        console.log('1. Initializing Logging Module System...');
        await loggingModuleInitializer.initialize();
        
        // Get services
        const loggingModuleService = loggingModuleInitializer.getService('loggingModule');
        const configChangeHandler = loggingModuleInitializer.getService('configurationChangeHandler');
        const configAudit = loggingModuleInitializer.getService('configurationAudit');

        // Demo company
        const demoCompanyId = 'demo-company-123';
        const adminUser = 'admin@demo.com';

        console.log('\n2. Getting default configuration for demo company...');
        const defaultConfig = await loggingModuleService.getConfig(demoCompanyId);
        console.log('Default configuration:', {
            enabled: defaultConfig.enabled,
            features: defaultConfig.features,
            retentionPolicies: defaultConfig.retentionPolicies
        });

        console.log('\n3. Checking feature availability...');
        const auditEnabled = await loggingModuleService.isFeatureEnabled(demoCompanyId, 'auditLogging');
        const userActionEnabled = await loggingModuleService.isFeatureEnabled(demoCompanyId, 'userActionLogging');
        console.log(`Audit logging enabled: ${auditEnabled}`);
        console.log(`User action logging enabled: ${userActionEnabled}`);

        console.log('\n4. Updating configuration with real-time changes...');
        
        // Listen for configuration changes
        configChangeHandler.on('configurationApplied', (event) => {
            console.log(`✓ Configuration change applied for company ${event.companyId}`);
            console.log(`  Changes: ${event.changes.features?.length || 0} features, ${event.changes.retentionPolicies?.length || 0} retention policies`);
        });

        // Update configuration
        const configUpdates = {
            features: {
                userActionLogging: true,
                performanceLogging: false
            },
            retentionPolicies: {
                auditLogs: 3650, // 10 years
                performanceLogs: 30  // 1 month
            },
            alerting: {
                performanceThresholds: true
            }
        };

        const updatedConfig = await loggingModuleService.updateConfig(demoCompanyId, configUpdates, adminUser);
        console.log('Configuration updated successfully');

        console.log('\n5. Verifying updated features...');
        const updatedUserActionEnabled = await loggingModuleService.isFeatureEnabled(demoCompanyId, 'userActionLogging');
        const updatedPerformanceEnabled = await loggingModuleService.isFeatureEnabled(demoCompanyId, 'performanceLogging');
        console.log(`User action logging now enabled: ${updatedUserActionEnabled}`);
        console.log(`Performance logging now enabled: ${updatedPerformanceEnabled}`);

        console.log('\n6. Testing essential logging enforcement...');
        
        // Disable the module to test essential logging
        await loggingModuleService.updateConfig(demoCompanyId, { enabled: false }, adminUser);
        
        const essentialAuditEnabled = await loggingModuleService.isFeatureEnabled(demoCompanyId, 'auditLogging');
        const essentialUserActionEnabled = await loggingModuleService.isFeatureEnabled(demoCompanyId, 'userActionLogging');
        console.log(`With module disabled - Audit logging (essential): ${essentialAuditEnabled}`);
        console.log(`With module disabled - User action logging (non-essential): ${essentialUserActionEnabled}`);

        console.log('\n7. Testing event logging decisions...');
        const shouldLogAuth = await loggingModuleService.shouldLogEvent(demoCompanyId, 'authentication_attempt');
        const shouldLogUserAction = await loggingModuleService.shouldLogEvent(demoCompanyId, 'user_action');
        const shouldLogPerformance = await loggingModuleService.shouldLogEvent(demoCompanyId, 'performance_metric');
        
        console.log(`Should log authentication (essential): ${shouldLogAuth}`);
        console.log(`Should log user action (non-essential): ${shouldLogUserAction}`);
        console.log(`Should log performance (non-essential): ${shouldLogPerformance}`);

        console.log('\n8. Getting configuration summary...');
        const summary = loggingModuleService.getConfigSummary();
        console.log('System summary:', {
            totalCompanies: summary.totalCompanies,
            enabledCompanies: summary.enabledCompanies,
            disabledCompanies: summary.disabledCompanies,
            essentialEvents: summary.essentialEvents
        });

        console.log('\n9. Getting audit statistics...');
        const auditStats = await configAudit.getAuditStatistics();
        console.log('Audit statistics:', {
            totalEntries: auditStats.totalEntries,
            entriesByType: auditStats.entriesByType,
            totalChanges: auditStats.totalChanges
        });

        console.log('\n10. Performing health check...');
        const health = await loggingModuleInitializer.healthCheck();
        console.log('System health:', {
            overall: health.overall,
            serviceCount: Object.keys(health.services).length,
            timestamp: health.timestamp
        });

        console.log('\n=== Demo completed successfully! ===');

    } catch (error) {
        console.error('Demo failed:', error);
    } finally {
        // Cleanup
        await loggingModuleInitializer.shutdown();
    }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateLoggingModule().catch(console.error);
}

export default demonstrateLoggingModule;