/**
 * Configuration Audit Service
 * 
 * Handles audit logging for all configuration changes
 * as required by Requirements 12.5 and 13.4
 */

import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import configurationChangeHandler from './configurationChangeHandler.service.js';

/**
 * Configuration Audit Service
 */
class ConfigurationAuditService {
    constructor() {
        this.auditLogPath = path.join(process.cwd(), 'logs', 'platform', 'configuration-audit.log');
        this.initialized = false;
    }
    
    /**
     * Initialize the audit service
     */
    async initialize() {
        try {
            // Ensure audit log directory exists
            const auditDir = path.dirname(this.auditLogPath);
            await fs.mkdir(auditDir, { recursive: true });
            
            // Listen for configuration change events
            configurationChangeHandler.on('configurationApplied', this.logConfigurationChange.bind(this));
            configurationChangeHandler.on('configurationReset', this.logConfigurationReset.bind(this));
            configurationChangeHandler.on('configurationImported', this.logConfigurationImport.bind(this));
            configurationChangeHandler.on('essentialLoggingForced', this.logEssentialLoggingForced.bind(this));
            configurationChangeHandler.on('featureToggled', this.logFeatureToggle.bind(this));
            configurationChangeHandler.on('retentionPolicyChanged', this.logRetentionPolicyChange.bind(this));
            configurationChangeHandler.on('alertingConfigChanged', this.logAlertingConfigChange.bind(this));
            configurationChangeHandler.on('moduleStatusChanged', this.logModuleStatusChange.bind(this));
            
            this.initialized = true;
            console.log('Configuration Audit Service initialized');
        } catch (error) {
            console.error('Failed to initialize Configuration Audit Service:', error);
            throw error;
        }
    }
    
    /**
     * Log configuration change event
     */
    async logConfigurationChange(event) {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: event.timestamp,
            eventType: 'configuration_changed',
            companyId: event.companyId,
            changes: event.changes,
            changeCount: this.countChanges(event.changes),
            hash: this.generateHash(event)
        };
        
        await this.writeAuditLog(auditEntry);
    }
    
    /**
     * Log configuration reset event
     */
    async logConfigurationReset(event) {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: event.timestamp,
            eventType: 'configuration_reset',
            companyId: event.companyId,
            hash: this.generateHash(event)
        };
        
        await this.writeAuditLog(auditEntry);
    }
    
    /**
     * Log configuration import event
     */
    async logConfigurationImport(event) {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: event.timestamp,
            eventType: 'configuration_imported',
            companyId: event.companyId,
            hash: this.generateHash(event)
        };
        
        await this.writeAuditLog(auditEntry);
    }
    
    /**
     * Log essential logging forced event
     */
    async logEssentialLoggingForced(event) {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: event.timestamp,
            eventType: 'essential_logging_forced',
            companyId: event.companyId,
            reason: event.reason,
            essentialEvents: event.essentialEvents,
            hash: this.generateHash(event)
        };
        
        await this.writeAuditLog(auditEntry);
    }
    
    /**
     * Log feature toggle event
     */
    async logFeatureToggle(event) {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: event.timestamp,
            eventType: 'feature_toggled',
            companyId: event.companyId,
            feature: event.feature,
            enabled: event.enabled,
            hash: this.generateHash(event)
        };
        
        await this.writeAuditLog(auditEntry);
    }
    
    /**
     * Log retention policy change event
     */
    async logRetentionPolicyChange(event) {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: event.timestamp,
            eventType: 'retention_policy_changed',
            companyId: event.companyId,
            logType: event.logType,
            oldRetentionDays: event.oldRetentionDays,
            newRetentionDays: event.newRetentionDays,
            hash: this.generateHash(event)
        };
        
        await this.writeAuditLog(auditEntry);
    }
    
    /**
     * Log alerting configuration change event
     */
    async logAlertingConfigChange(event) {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: event.timestamp,
            eventType: 'alerting_config_changed',
            companyId: event.companyId,
            setting: event.setting,
            oldValue: event.oldValue,
            newValue: event.newValue,
            hash: this.generateHash(event)
        };
        
        await this.writeAuditLog(auditEntry);
    }
    
    /**
     * Log module status change event
     */
    async logModuleStatusChange(event) {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: event.timestamp,
            eventType: 'module_status_changed',
            companyId: event.companyId,
            enabled: event.enabled,
            hash: this.generateHash(event)
        };
        
        await this.writeAuditLog(auditEntry);
    }
    
    /**
     * Write audit log entry to file
     */
    async writeAuditLog(auditEntry) {
        try {
            const logLine = JSON.stringify(auditEntry) + '\n';
            await fs.appendFile(this.auditLogPath, logLine);
        } catch (error) {
            console.error('Failed to write configuration audit log:', error);
        }
    }
    
    /**
     * Generate unique audit ID
     */
    generateAuditId() {
        return `config_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Generate tamper-proof hash for audit entry
     */
    generateHash(event) {
        const hashData = JSON.stringify({
            timestamp: event.timestamp,
            companyId: event.companyId,
            eventType: event.eventType || 'unknown',
            data: event
        });
        return crypto.createHash('sha256').update(hashData).digest('hex');
    }
    
    /**
     * Count the number of changes in a configuration change event
     */
    countChanges(changes) {
        let count = 0;
        
        if (changes.features) count += changes.features.length;
        if (changes.retentionPolicies) count += changes.retentionPolicies.length;
        if (changes.alerting) count += changes.alerting.length;
        if (changes.moduleEnabled !== undefined) count += 1;
        
        return count;
    }
    
    /**
     * Get audit log entries for a company
     */
    async getAuditLog(companyId = null, limit = 100) {
        try {
            const logContent = await fs.readFile(this.auditLogPath, 'utf8');
            const lines = logContent.trim().split('\n').filter(line => line.length > 0);
            
            let entries = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    return null;
                }
            }).filter(entry => entry !== null);
            
            // Filter by company if specified
            if (companyId) {
                entries = entries.filter(entry => entry.companyId === companyId);
            }
            
            // Sort by timestamp (newest first) and limit
            return entries
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // No audit log file yet
            }
            console.error('Failed to read configuration audit log:', error);
            return [];
        }
    }
    
    /**
     * Get audit statistics
     */
    async getAuditStatistics(companyId = null, timeRange = 24 * 60 * 60 * 1000) { // 24 hours default
        const entries = await this.getAuditLog(companyId, 1000); // Get more entries for statistics
        const cutoffTime = new Date(Date.now() - timeRange);
        
        const recentEntries = entries.filter(entry => new Date(entry.timestamp) > cutoffTime);
        
        const stats = {
            totalEntries: recentEntries.length,
            entriesByType: {},
            entriesByCompany: {},
            totalChanges: 0,
            timeRange: timeRange / (60 * 60 * 1000) // Convert to hours
        };
        
        for (const entry of recentEntries) {
            // Count by event type
            stats.entriesByType[entry.eventType] = (stats.entriesByType[entry.eventType] || 0) + 1;
            
            // Count by company
            stats.entriesByCompany[entry.companyId] = (stats.entriesByCompany[entry.companyId] || 0) + 1;
            
            // Count total changes
            if (entry.changeCount) {
                stats.totalChanges += entry.changeCount;
            } else {
                stats.totalChanges += 1;
            }
        }
        
        return stats;
    }
    
    /**
     * Verify audit log integrity
     */
    async verifyAuditLogIntegrity(companyId = null) {
        const entries = await this.getAuditLog(companyId, 1000);
        const results = {
            totalEntries: entries.length,
            validEntries: 0,
            invalidEntries: 0,
            corruptedEntries: []
        };
        
        for (const entry of entries) {
            try {
                // Regenerate hash and compare
                const expectedHash = this.generateHash({
                    timestamp: entry.timestamp,
                    companyId: entry.companyId,
                    eventType: entry.eventType,
                    ...entry
                });
                
                if (entry.hash === expectedHash) {
                    results.validEntries++;
                } else {
                    results.invalidEntries++;
                    results.corruptedEntries.push({
                        id: entry.id,
                        timestamp: entry.timestamp,
                        reason: 'Hash mismatch'
                    });
                }
            } catch (error) {
                results.invalidEntries++;
                results.corruptedEntries.push({
                    id: entry.id || 'unknown',
                    timestamp: entry.timestamp || 'unknown',
                    reason: 'Verification error: ' + error.message
                });
            }
        }
        
        results.integrityPercentage = results.totalEntries > 0 
            ? (results.validEntries / results.totalEntries * 100).toFixed(2)
            : 100;
        
        return results;
    }
    
    /**
     * Clean up old audit log entries
     */
    async cleanupOldEntries(maxAge = 365 * 24 * 60 * 60 * 1000) { // 1 year default
        try {
            const entries = await this.getAuditLog(null, 10000); // Get many entries
            const cutoffTime = new Date(Date.now() - maxAge);
            
            const recentEntries = entries.filter(entry => new Date(entry.timestamp) > cutoffTime);
            
            if (recentEntries.length < entries.length) {
                // Rewrite the audit log with only recent entries
                const logContent = recentEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
                await fs.writeFile(this.auditLogPath, logContent);
                
                const removedCount = entries.length - recentEntries.length;
                console.log(`Cleaned up ${removedCount} old configuration audit entries`);
                return removedCount;
            }
            
            return 0;
        } catch (error) {
            console.error('Failed to cleanup old audit entries:', error);
            return 0;
        }
    }
}

// Create singleton instance
const configurationAuditService = new ConfigurationAuditService();

export default configurationAuditService;
export { ConfigurationAuditService };