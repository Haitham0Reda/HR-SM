/**
 * Module Configuration API Demo
 * 
 * Demonstrates the module configuration API functionality
 * Requirements: 13.1, 13.4
 */

import loggingModuleService from '../services/loggingModule.service.js';
import configurationAuditService from '../services/configurationAudit.service.js';
import configurationChangeHandler from '../services/configurationChangeHandler.service.js';

async function demonstrateModuleConfiguration() {
    console.log('=== Module Configuration API Demo ===\n');
    
    try {
        // Initialize services
        console.log('1. Initializing services...');
        await loggingModuleService.initialize();
        await configurationChangeHandler.initialize();
        await configurationAuditService.initialize();
        console.log('✓ Services initialized\n');
        
        const demoCompanyId = 'demo-company-123';
        
        // 1. Get initial configuration
        console.log('2. Getting initial configuration...');
        const initialConfig = await loggingModuleService.getConfig(demoCompanyId);
        console.log('Initial configuration:', JSON.stringify(initialConfig, null, 2));
        console.log('');
        
        // 2. Update configuration
        console.log('3. Updating configuration...');
        const configUpdates = {
            features: {
                performanceLogging: false,
                userActionLogging: true,
                frontendLogging: true
            },
            retentionPolicies: {
                performanceLogs: 60,
                errorLogs: 120
            },
            alerting: {
                performanceThresholds: true
            }
        };
        
        const updatedConfig = await loggingModuleService.updateConfig(
            demoCompanyId,
            configUpdates,
            'demo-admin'
        );
        console.log('Updated configuration:', JSON.stringify(updatedConfig, null, 2));
        console.log('');
        
        // 3. Check feature status
        console.log('4. Checking feature status...');
        const features = ['performanceLogging', 'userActionLogging', 'securityLogging'];
        for (const feature of features) {
            const isEnabled = await loggingModuleService.isFeatureEnabled(demoCompanyId, feature);
            const isEssential = loggingModuleService.isEssentialFeature(feature);
            console.log(`${feature}: ${isEnabled ? 'enabled' : 'disabled'} ${isEssential ? '(essential)' : ''}`);
        }
        console.log('');
        
        // 4. Test module disable/enable
        console.log('5. Testing module disable/enable...');
        
        // Disable module
        await loggingModuleService.updateConfig(
            demoCompanyId,
            { enabled: false },
            'demo-admin'
        );
        console.log('Module disabled');
        
        // Check feature status when disabled
        console.log('Feature status when module disabled:');
        for (const feature of features) {
            const isEnabled = await loggingModuleService.isFeatureEnabled(demoCompanyId, feature);
            const isEssential = loggingModuleService.isEssentialFeature(feature);
            console.log(`${feature}: ${isEnabled ? 'enabled' : 'disabled'} ${isEssential ? '(essential)' : ''}`);
        }
        
        // Re-enable module
        await loggingModuleService.updateConfig(
            demoCompanyId,
            { enabled: true },
            'demo-admin'
        );
        console.log('Module re-enabled\n');
        
        // 5. Test event logging decisions
        console.log('6. Testing event logging decisions...');
        const eventTypes = [
            'user_action',
            'performance_metric',
            'security_breach',
            'authentication_attempt',
            'frontend_event'
        ];
        
        for (const eventType of eventTypes) {
            const shouldLog = await loggingModuleService.shouldLogEvent(demoCompanyId, eventType);
            console.log(`${eventType}: ${shouldLog ? 'should log' : 'should not log'}`);
        }
        console.log('');
        
        // 6. Configuration validation
        console.log('7. Testing configuration validation...');
        const validConfig = {
            enabled: true,
            features: {
                auditLogging: true,
                securityLogging: true
            },
            retentionPolicies: {
                auditLogs: 365
            }
        };
        
        const invalidConfig = {
            enabled: 'not-boolean',
            features: {
                invalidFeature: true
            },
            retentionPolicies: {
                auditLogs: -1
            }
        };
        
        const validErrors = loggingModuleService.validateConfig(validConfig);
        const invalidErrors = loggingModuleService.validateConfig(invalidConfig);
        
        console.log(`Valid config errors: ${validErrors.length}`);
        console.log(`Invalid config errors: ${invalidErrors.length}`);
        if (invalidErrors.length > 0) {
            console.log('Validation errors:', invalidErrors);
        }
        console.log('');
        
        // 7. Export/Import configuration
        console.log('8. Testing export/import...');
        const exportData = await loggingModuleService.exportConfig(demoCompanyId);
        console.log('Export data keys:', Object.keys(exportData));
        
        // Reset and import
        await loggingModuleService.resetConfig(demoCompanyId, 'demo-admin');
        console.log('Configuration reset');
        
        const importedConfig = await loggingModuleService.importConfig(
            demoCompanyId,
            exportData,
            'demo-admin'
        );
        console.log('Configuration imported successfully');
        console.log('');
        
        // 8. Audit trail
        console.log('9. Checking audit trail...');
        
        // Wait a bit for audit logs to be written
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const auditEntries = await configurationAuditService.getAuditLog(demoCompanyId, 5);
        console.log(`Found ${auditEntries.length} audit entries for ${demoCompanyId}`);
        
        if (auditEntries.length > 0) {
            console.log('Recent audit entries:');
            auditEntries.forEach((entry, index) => {
                console.log(`${index + 1}. ${entry.eventType} at ${entry.timestamp}`);
            });
        }
        console.log('');
        
        // 9. Configuration summary
        console.log('10. Configuration summary...');
        const summary = loggingModuleService.getConfigSummary();
        console.log('System summary:', JSON.stringify(summary, null, 2));
        console.log('');
        
        // 10. Audit statistics
        console.log('11. Audit statistics...');
        const auditStats = await configurationAuditService.getAuditStatistics(demoCompanyId);
        console.log('Audit statistics:', JSON.stringify(auditStats, null, 2));
        
        console.log('\n=== Demo completed successfully ===');
        
    } catch (error) {
        console.error('Demo failed:', error);
        process.exit(1);
    }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateModuleConfiguration()
        .then(() => {
            console.log('\nDemo finished. Exiting...');
            process.exit(0);
        })
        .catch(error => {
            console.error('Demo error:', error);
            process.exit(1);
        });
}

export default demonstrateModuleConfiguration;