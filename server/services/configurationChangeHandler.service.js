/**
 * Configuration Change Handler Service
 * 
 * Handles real-time configuration updates and propagates changes
 * throughout the logging system without requiring restart
 */

import EventEmitter from 'events';
import loggingModuleService from './loggingModule.service.js';
import loggingConfigManager from '../config/logging.config.js';

/**
 * Configuration Change Handler
 */
class ConfigurationChangeHandler extends EventEmitter {
    constructor() {
        super();
        this.activeConfigurations = new Map();
        this.changeListeners = new Map();
        this.auditLog = [];
        this.initialized = false;
    }
    
    /**
     * Initialize the configuration change handler
     */
    async initialize() {
        try {
            // Listen for module configuration changes
            loggingModuleService.on('configurationChanged', this.handleModuleConfigChange.bind(this));
            loggingModuleService.on('configurationReset', this.handleModuleConfigReset.bind(this));
            loggingModuleService.on('configurationImported', this.handleModuleConfigImport.bind(this));
            loggingModuleService.on('essentialLoggingForced', this.handleEssentialLoggingForced.bind(this));
            
            // Load current active configurations
            await this.loadActiveConfigurations();
            
            this.initialized = true;
            console.log('Configuration Change Handler initialized');
        } catch (error) {
            console.error('Failed to initialize Configuration Change Handler:', error);
            throw error;
        }
    }
    
    /**
     * Load current active configurations
     */
    async loadActiveConfigurations() {
        const companies = loggingModuleService.getConfiguredCompanies();
        
        for (const companyId of companies) {
            const config = await loggingModuleService.getConfig(companyId);
            this.activeConfigurations.set(companyId, config);
        }
    }
    
    /**
     * Handle module configuration changes
     */
    async handleModuleConfigChange(changeEvent) {
        const { companyId, previousConfig, newConfig, adminUser, timestamp } = changeEvent;
        
        try {
            // Update active configuration
            this.activeConfigurations.set(companyId, newConfig);
            
            // Create audit log entry
            const auditEntry = {
                id: this.generateAuditId(),
                timestamp,
                companyId,
                adminUser,
                action: 'configuration_changed',
                previousConfig,
                newConfig,
                changes: this.calculateConfigChanges(previousConfig, newConfig),
                applied: false
            };
            
            this.auditLog.push(auditEntry);
            
            // Apply configuration changes immediately
            await this.applyConfigurationChanges(companyId, previousConfig, newConfig);
            
            // Mark as applied
            auditEntry.applied = true;
            auditEntry.appliedAt = new Date().toISOString();
            
            // Emit change event for other services
            this.emit('configurationApplied', {
                companyId,
                changes: auditEntry.changes,
                timestamp: auditEntry.appliedAt
            });
            
            console.log(`Configuration changes applied for company ${companyId} by ${adminUser}`);
            
        } catch (error) {
            console.error(`Failed to apply configuration changes for company ${companyId}:`, error);
            
            // Emit error event
            this.emit('configurationError', {
                companyId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * Handle module configuration reset
     */
    async handleModuleConfigReset(resetEvent) {
        const { companyId, adminUser, timestamp } = resetEvent;
        
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp,
            companyId,
            adminUser,
            action: 'configuration_reset',
            applied: true,
            appliedAt: timestamp
        };
        
        this.auditLog.push(auditEntry);
        
        // Update active configuration
        const newConfig = await loggingModuleService.getConfig(companyId);
        this.activeConfigurations.set(companyId, newConfig);
        
        // Emit reset event
        this.emit('configurationReset', {
            companyId,
            timestamp
        });
        
        console.log(`Configuration reset for company ${companyId} by ${adminUser}`);
    }
    
    /**
     * Handle module configuration import
     */
    async handleModuleConfigImport(importEvent) {
        const { companyId, adminUser, timestamp } = importEvent;
        
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp,
            companyId,
            adminUser,
            action: 'configuration_imported',
            applied: true,
            appliedAt: timestamp
        };
        
        this.auditLog.push(auditEntry);
        
        // Update active configuration
        const newConfig = await loggingModuleService.getConfig(companyId);
        this.activeConfigurations.set(companyId, newConfig);
        
        // Emit import event
        this.emit('configurationImported', {
            companyId,
            timestamp
        });
        
        console.log(`Configuration imported for company ${companyId} by ${adminUser}`);
    }
    
    /**
     * Handle essential logging forced
     */
    handleEssentialLoggingForced(forceEvent) {
        const { companyId, reason, timestamp, essentialEvents } = forceEvent;
        
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp,
            companyId,
            adminUser: 'platform',
            action: 'essential_logging_forced',
            reason,
            essentialEvents,
            applied: true,
            appliedAt: timestamp
        };
        
        this.auditLog.push(auditEntry);
        
        // Emit force event
        this.emit('essentialLoggingForced', {
            companyId,
            reason,
            essentialEvents,
            timestamp
        });
        
        console.log(`Essential logging forced for company ${companyId}: ${reason}`);
    }
    
    /**
     * Apply configuration changes immediately
     */
    async applyConfigurationChanges(companyId, previousConfig, newConfig) {
        const changes = this.calculateConfigChanges(previousConfig, newConfig);
        
        // Apply feature toggle changes
        if (changes.features && changes.features.length > 0) {
            await this.applyFeatureChanges(companyId, changes.features);
        }
        
        // Apply retention policy changes
        if (changes.retentionPolicies && changes.retentionPolicies.length > 0) {
            await this.applyRetentionChanges(companyId, changes.retentionPolicies);
        }
        
        // Apply alerting changes
        if (changes.alerting && changes.alerting.length > 0) {
            await this.applyAlertingChanges(companyId, changes.alerting);
        }
        
        // Apply module enable/disable changes
        if (changes.moduleEnabled !== undefined) {
            await this.applyModuleStatusChange(companyId, changes.moduleEnabled);
        }
    }
    
    /**
     * Apply feature toggle changes
     */
    async applyFeatureChanges(companyId, featureChanges) {
        for (const change of featureChanges) {
            const { feature, oldValue, newValue } = change;
            
            // Update logging configuration manager
            await loggingConfigManager.updateFeatureToggle(
                companyId,
                feature,
                newValue
            );
            
            // Emit feature change event
            this.emit('featureToggled', {
                companyId,
                feature,
                enabled: newValue,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * Apply retention policy changes
     */
    async applyRetentionChanges(companyId, retentionChanges) {
        for (const change of retentionChanges) {
            const { logType, oldValue, newValue } = change;
            
            // Emit retention change event
            this.emit('retentionPolicyChanged', {
                companyId,
                logType,
                oldRetentionDays: oldValue,
                newRetentionDays: newValue,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * Apply alerting configuration changes
     */
    async applyAlertingChanges(companyId, alertingChanges) {
        for (const change of alertingChanges) {
            const { setting, oldValue, newValue } = change;
            
            // Emit alerting change event
            this.emit('alertingConfigChanged', {
                companyId,
                setting,
                oldValue,
                newValue,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * Apply module enable/disable changes
     */
    async applyModuleStatusChange(companyId, enabled) {
        // Emit module status change event
        this.emit('moduleStatusChanged', {
            companyId,
            enabled,
            timestamp: new Date().toISOString()
        });
        
        if (!enabled) {
            // Force essential logging when module is disabled
            loggingModuleService.forceEssentialLogging(
                companyId,
                'Module disabled by administrator'
            );
        }
    }
    
    /**
     * Calculate configuration changes
     */
    calculateConfigChanges(previousConfig, newConfig) {
        const changes = {
            features: [],
            retentionPolicies: [],
            alerting: []
        };
        
        // Check module enabled status
        if (previousConfig.enabled !== newConfig.enabled) {
            changes.moduleEnabled = newConfig.enabled;
        }
        
        // Check feature changes
        for (const feature in newConfig.features) {
            if (previousConfig.features[feature] !== newConfig.features[feature]) {
                changes.features.push({
                    feature,
                    oldValue: previousConfig.features[feature],
                    newValue: newConfig.features[feature]
                });
            }
        }
        
        // Check retention policy changes
        for (const logType in newConfig.retentionPolicies) {
            if (previousConfig.retentionPolicies[logType] !== newConfig.retentionPolicies[logType]) {
                changes.retentionPolicies.push({
                    logType,
                    oldValue: previousConfig.retentionPolicies[logType],
                    newValue: newConfig.retentionPolicies[logType]
                });
            }
        }
        
        // Check alerting changes
        for (const setting in newConfig.alerting) {
            if (previousConfig.alerting[setting] !== newConfig.alerting[setting]) {
                changes.alerting.push({
                    setting,
                    oldValue: previousConfig.alerting[setting],
                    newValue: newConfig.alerting[setting]
                });
            }
        }
        
        return changes;
    }
    
    /**
     * Register a configuration change listener
     */
    registerChangeListener(companyId, callback) {
        if (!this.changeListeners.has(companyId)) {
            this.changeListeners.set(companyId, []);
        }
        
        this.changeListeners.get(companyId).push(callback);
        
        // Return unregister function
        return () => {
            const listeners = this.changeListeners.get(companyId);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Get current configuration for a company
     */
    getCurrentConfig(companyId) {
        return this.activeConfigurations.get(companyId);
    }
    
    /**
     * Get configuration change audit log
     */
    getAuditLog(companyId = null, limit = 100) {
        let logs = this.auditLog;
        
        if (companyId) {
            logs = logs.filter(entry => entry.companyId === companyId);
        }
        
        // Sort by timestamp (newest first) and limit
        return logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }
    
    /**
     * Generate unique audit ID
     */
    generateAuditId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get configuration change statistics
     */
    getChangeStatistics(companyId = null, timeRange = 24 * 60 * 60 * 1000) { // 24 hours default
        const cutoffTime = new Date(Date.now() - timeRange);
        let logs = this.auditLog.filter(entry => new Date(entry.timestamp) > cutoffTime);
        
        if (companyId) {
            logs = logs.filter(entry => entry.companyId === companyId);
        }
        
        const stats = {
            totalChanges: logs.length,
            changesByAction: {},
            changesByCompany: {},
            changesByUser: {},
            appliedChanges: logs.filter(entry => entry.applied).length,
            failedChanges: logs.filter(entry => !entry.applied).length
        };
        
        for (const log of logs) {
            // Count by action
            stats.changesByAction[log.action] = (stats.changesByAction[log.action] || 0) + 1;
            
            // Count by company
            stats.changesByCompany[log.companyId] = (stats.changesByCompany[log.companyId] || 0) + 1;
            
            // Count by user
            stats.changesByUser[log.adminUser] = (stats.changesByUser[log.adminUser] || 0) + 1;
        }
        
        return stats;
    }
    
    /**
     * Clean up old audit log entries
     */
    cleanupAuditLog(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
        const cutoffTime = new Date(Date.now() - maxAge);
        const initialCount = this.auditLog.length;
        
        this.auditLog = this.auditLog.filter(entry => new Date(entry.timestamp) > cutoffTime);
        
        const removedCount = initialCount - this.auditLog.length;
        if (removedCount > 0) {
            console.log(`Cleaned up ${removedCount} old audit log entries`);
        }
        
        return removedCount;
    }
}

// Create singleton instance
const configurationChangeHandler = new ConfigurationChangeHandler();

export default configurationChangeHandler;
export { ConfigurationChangeHandler };