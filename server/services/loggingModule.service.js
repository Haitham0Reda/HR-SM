/**
 * Logging Module Service
 * 
 * Manages logging module configuration for companies including
 * feature flags, granular controls, and real-time updates
 */

import path from 'path';
import fs from 'fs/promises';
import EventEmitter from 'events';
import loggingConfigManager from '../config/logging.config.js';
import platformLogger from '../utils/platformLogger.js';

// Default module configuration
const DEFAULT_MODULE_CONFIG = {
    enabled: true,
    features: {
        auditLogging: true,
        securityLogging: true,
        performanceLogging: true,
        userActionLogging: false,
        frontendLogging: true,
        detailedErrorLogging: true
    },
    retentionPolicies: {
        auditLogs: 2555, // 7 years for compliance
        securityLogs: 365,
        performanceLogs: 90,
        errorLogs: 180
    },
    alerting: {
        enabled: true,
        criticalErrors: true,
        securityEvents: true,
        performanceThresholds: false
    }
};

// Essential logging events that cannot be disabled
const ESSENTIAL_LOG_EVENTS = [
    'authentication_attempt',
    'authorization_failure',
    'security_breach',
    'data_access_violation',
    'system_error',
    'compliance_event',
    'platform_security_event'
];

/**
 * Logging Module Configuration Service
 */
class LoggingModuleService extends EventEmitter {
    constructor() {
        super();
        this.moduleConfigs = new Map();
        this.configPath = process.env.LOGGING_MODULE_CONFIG_PATH || 
            path.join(process.cwd(), 'config', 'logging', 'modules');
        this.initialized = false;
    }
    
    /**
     * Initialize the module service
     */
    async initialize() {
        try {
            // Ensure config directory exists
            await fs.mkdir(this.configPath, { recursive: true });
            
            // Load existing module configurations
            await this.loadModuleConfigs();
            
            this.initialized = true;
            console.log('Logging Module Service initialized');
        } catch (error) {
            console.error('Failed to initialize Logging Module Service:', error);
            throw error;
        }
    }
    
    /**
     * Load all module configurations
     */
    async loadModuleConfigs() {
        try {
            const files = await fs.readdir(this.configPath);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const companyId = file.replace('.json', '');
                    const configPath = path.join(this.configPath, file);
                    
                    try {
                        const configData = await fs.readFile(configPath, 'utf8');
                        const moduleConfig = JSON.parse(configData);
                        
                        // Validate and merge with defaults
                        const validatedConfig = this.validateAndMergeConfig(moduleConfig);
                        this.moduleConfigs.set(companyId, validatedConfig);
                    } catch (error) {
                        console.error(`Error loading module config for company ${companyId}:`, error);
                    }
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading module configurations:', error);
            }
        }
    }
    
    /**
     * Get module configuration for a company
     */
    async getConfig(companyId) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        let config = this.moduleConfigs.get(companyId);
        
        if (!config) {
            // Create default configuration for new company
            config = {
                ...DEFAULT_MODULE_CONFIG,
                companyId,
                lastModified: new Date().toISOString(),
                modifiedBy: 'system'
            };
            
            await this.setConfig(companyId, config, 'system');
        }
        
        return config;
    }
    
    /**
     * Update module configuration for a company
     */
    async updateConfig(companyId, configUpdates, adminUser) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        const currentConfig = await this.getConfig(companyId);
        const previousConfig = { ...currentConfig };
        
        // Merge updates with current configuration
        const newConfig = {
            ...currentConfig,
            ...configUpdates,
            companyId,
            lastModified: new Date().toISOString(),
            modifiedBy: adminUser
        };
        
        // Validate the new configuration
        const validationErrors = this.validateConfig(newConfig);
        if (validationErrors.length > 0) {
            throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
        }
        
        // Save the configuration
        await this.setConfig(companyId, newConfig, adminUser);
        
        // Emit configuration change event
        this.emit('configurationChanged', {
            companyId,
            previousConfig,
            newConfig,
            adminUser,
            timestamp: new Date().toISOString()
        });
        
        return newConfig;
    }
    
    /**
     * Set module configuration for a company
     */
    async setConfig(companyId, config, adminUser) {
        // Validate and merge with defaults
        const validatedConfig = this.validateAndMergeConfig(config);
        validatedConfig.lastModified = new Date().toISOString();
        validatedConfig.modifiedBy = adminUser;
        
        // Store in memory
        this.moduleConfigs.set(companyId, validatedConfig);
        
        // Save to file
        const configPath = path.join(this.configPath, `${companyId}.json`);
        await fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
        
        return validatedConfig;
    }
    
    /**
     * Check if a feature is enabled for a company
     */
    async isFeatureEnabled(companyId, feature) {
        const config = await this.getConfig(companyId);
        
        // If module is disabled, only essential features are available
        if (!config.enabled) {
            return this.isEssentialFeature(feature);
        }
        
        return config.features[feature] || false;
    }
    
    /**
     * Get enabled features for a company
     */
    async getEnabledFeatures(companyId) {
        const config = await this.getConfig(companyId);
        
        if (!config.enabled) {
            // Return only essential features when module is disabled
            return Object.keys(config.features).filter(feature => 
                this.isEssentialFeature(feature)
            );
        }
        
        return Object.keys(config.features).filter(feature => 
            config.features[feature]
        );
    }
    
    /**
     * Force essential logging for a company (platform override)
     */
    forceEssentialLogging(companyId, reason) {
        this.emit('essentialLoggingForced', {
            companyId,
            reason,
            timestamp: new Date().toISOString(),
            essentialEvents: ESSENTIAL_LOG_EVENTS
        });
    }
    
    /**
     * Get platform required logs for a company
     */
    getPlatformRequiredLogs(companyId) {
        return ESSENTIAL_LOG_EVENTS;
    }
    
    /**
     * Check if a feature is essential (cannot be disabled)
     */
    isEssentialFeature(feature) {
        const essentialFeatures = [
            'securityLogging',
            'auditLogging'
        ];
        
        return essentialFeatures.includes(feature);
    }
    
    /**
     * Validate configuration object
     */
    validateConfig(config) {
        const errors = [];
        
        // Validate required fields
        if (typeof config.enabled !== 'boolean') {
            errors.push('enabled must be a boolean');
        }
        
        if (!config.features || typeof config.features !== 'object') {
            errors.push('features must be an object');
        } else {
            // Validate feature flags
            const validFeatures = Object.keys(DEFAULT_MODULE_CONFIG.features);
            for (const feature in config.features) {
                if (!validFeatures.includes(feature)) {
                    errors.push(`Invalid feature: ${feature}`);
                }
                if (typeof config.features[feature] !== 'boolean') {
                    errors.push(`Feature ${feature} must be a boolean`);
                }
            }
        }
        
        if (!config.retentionPolicies || typeof config.retentionPolicies !== 'object') {
            errors.push('retentionPolicies must be an object');
        } else {
            // Validate retention policies
            for (const logType in config.retentionPolicies) {
                const days = config.retentionPolicies[logType];
                if (!Number.isInteger(days) || days < 1 || days > 3650) {
                    errors.push(`Invalid retention days for ${logType}: ${days}`);
                }
            }
        }
        
        if (!config.alerting || typeof config.alerting !== 'object') {
            errors.push('alerting must be an object');
        }
        
        return errors;
    }
    
    /**
     * Validate and merge configuration with defaults
     */
    validateAndMergeConfig(config) {
        const merged = {
            ...DEFAULT_MODULE_CONFIG,
            ...config,
            features: {
                ...DEFAULT_MODULE_CONFIG.features,
                ...(config.features || {})
            },
            retentionPolicies: {
                ...DEFAULT_MODULE_CONFIG.retentionPolicies,
                ...(config.retentionPolicies || {})
            },
            alerting: {
                ...DEFAULT_MODULE_CONFIG.alerting,
                ...(config.alerting || {})
            }
        };
        
        return merged;
    }
    
    /**
     * Get all configured companies
     */
    getConfiguredCompanies() {
        return Array.from(this.moduleConfigs.keys());
    }
    
    /**
     * Export module configuration for a company
     */
    async exportConfig(companyId) {
        const config = await this.getConfig(companyId);
        
        return {
            companyId,
            exportedAt: new Date().toISOString(),
            moduleConfig: config,
            essentialEvents: ESSENTIAL_LOG_EVENTS
        };
    }
    
    /**
     * Import module configuration for a company
     */
    async importConfig(companyId, configData, adminUser) {
        if (!configData.moduleConfig) {
            throw new Error('Invalid import data: missing moduleConfig');
        }
        
        const validationErrors = this.validateConfig(configData.moduleConfig);
        if (validationErrors.length > 0) {
            throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
        }
        
        await this.setConfig(companyId, configData.moduleConfig, adminUser);
        
        this.emit('configurationImported', {
            companyId,
            adminUser,
            timestamp: new Date().toISOString()
        });
        
        return await this.getConfig(companyId);
    }
    
    /**
     * Reset module configuration to defaults
     */
    async resetConfig(companyId, adminUser) {
        const defaultConfig = {
            ...DEFAULT_MODULE_CONFIG,
            companyId,
            lastModified: new Date().toISOString(),
            modifiedBy: adminUser
        };
        
        await this.setConfig(companyId, defaultConfig, adminUser);
        
        this.emit('configurationReset', {
            companyId,
            adminUser,
            timestamp: new Date().toISOString()
        });
        
        return defaultConfig;
    }
    
    /**
     * Get module configuration summary
     */
    getConfigSummary() {
        const companies = Array.from(this.moduleConfigs.keys());
        const enabledCompanies = companies.filter(companyId => 
            this.moduleConfigs.get(companyId).enabled
        );
        
        const featureUsage = {};
        for (const feature of Object.keys(DEFAULT_MODULE_CONFIG.features)) {
            featureUsage[feature] = companies.filter(companyId => {
                const config = this.moduleConfigs.get(companyId);
                return config.enabled && config.features[feature];
            }).length;
        }
        
        return {
            totalCompanies: companies.length,
            enabledCompanies: enabledCompanies.length,
            disabledCompanies: companies.length - enabledCompanies.length,
            featureUsage,
            essentialEvents: ESSENTIAL_LOG_EVENTS.length
        };
    }
    
    /**
     * Check if logging should be captured for a specific event
     * Now integrates with license-controlled logging service
     */
    async shouldLogEvent(companyId, eventType, logLevel = 'info') {
        // Always log essential events regardless of module settings
        if (ESSENTIAL_LOG_EVENTS.includes(eventType)) {
            // Log to platform that essential event was captured
            platformLogger.adminAction('Essential event logged', 'system', {
                companyId,
                eventType,
                reason: 'Platform requirement',
                timestamp: new Date().toISOString()
            });
            return true;
        }
        
        const config = await this.getConfig(companyId);
        
        // If module is disabled, only log essential events
        if (!config.enabled) {
            // Log platform control action
            platformLogger.adminAction('Non-essential logging blocked', 'system', {
                companyId,
                eventType,
                reason: 'Module disabled',
                timestamp: new Date().toISOString()
            });
            return false;
        }
        
        // Check feature-specific logging
        let allowed = true;
        switch (eventType) {
            case 'user_action':
                allowed = config.features.userActionLogging;
                break;
            case 'performance_metric':
                allowed = config.features.performanceLogging;
                break;
            case 'frontend_event':
                allowed = config.features.frontendLogging;
                break;
            case 'detailed_error':
                allowed = config.features.detailedErrorLogging;
                break;
            default:
                allowed = true; // Log by default for unknown event types
        }
        
        // Log platform control decisions for audit
        if (!allowed) {
            platformLogger.adminAction('Feature-specific logging blocked', 'system', {
                companyId,
                eventType,
                reason: 'Feature not enabled in configuration',
                timestamp: new Date().toISOString()
            });
        }
        
        return allowed;
    }
}

// Create singleton instance
const loggingModuleService = new LoggingModuleService();

export default loggingModuleService;
export { LoggingModuleService, DEFAULT_MODULE_CONFIG, ESSENTIAL_LOG_EVENTS };