/**
 * Comprehensive Logging Configuration System
 * 
 * Provides per-company and per-environment logging configuration
 * with retention policies and feature toggles
 */

import path from 'path';
import fs from 'fs/promises';

// Default logging configuration
const DEFAULT_CONFIG = {
    // Global logging settings
    global: {
        level: 'info',
        format: 'json',
        enableConsole: true,
        enableFile: true,
        enableCorrelation: true,
        maxFileSize: '20m',
        maxFiles: 5,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true
    },
    
    // Environment-specific overrides
    environments: {
        development: {
            level: 'debug',
            enableConsole: true,
            enableFile: true,
            maxFiles: 3
        },
        test: {
            level: 'warn',
            enableConsole: false,
            enableFile: false
        },
        staging: {
            level: 'info',
            enableConsole: true,
            enableFile: true,
            maxFiles: 7
        },
        production: {
            level: 'warn',
            enableConsole: false,
            enableFile: true,
            maxFiles: 30
        }
    },
    
    // Log type specific settings
    logTypes: {
        application: {
            enabled: true,
            level: 'info',
            retentionDays: 30,
            directory: 'logs'
        },
        audit: {
            enabled: true,
            level: 'info',
            retentionDays: 2555, // 7 years for compliance
            directory: 'logs',
            tamperProof: true
        },
        security: {
            enabled: true,
            level: 'warn',
            retentionDays: 365,
            directory: 'logs',
            immediateAlert: true
        },
        performance: {
            enabled: true,
            level: 'info',
            retentionDays: 90,
            directory: 'logs',
            sampling: 0.1 // Sample 10% of performance logs
        },
        error: {
            enabled: true,
            level: 'error',
            retentionDays: 180,
            directory: 'logs',
            immediateAlert: true
        },
        platform: {
            enabled: true,
            level: 'info',
            retentionDays: 365,
            directory: 'logs/platform',
            crossTenant: true
        }
    },
    
    // Feature toggles for optional logging
    features: {
        userInteractionTracking: {
            enabled: false,
            samplingRate: 0.01, // 1% sampling by default
            privacyMode: true
        },
        performanceMonitoring: {
            enabled: true,
            detailedMetrics: false,
            thresholdMs: 1000
        },
        securityDetection: {
            enabled: true,
            frontendDetection: true,
            backendDetection: true,
            platformDetection: true,
            realTimeAlerts: true
        },
        logCorrelation: {
            enabled: true,
            crossSystemTracking: true,
            sessionTracking: true
        },
        complianceLogging: {
            enabled: true,
            extendedRetention: true,
            immutableLogs: true
        }
    },
    
    // Alert configuration
    alerts: {
        channels: {
            email: {
                enabled: false,
                recipients: [],
                severity: ['critical', 'high']
            },
            webhook: {
                enabled: false,
                url: '',
                severity: ['critical', 'high', 'medium']
            },
            slack: {
                enabled: false,
                webhookUrl: '',
                channel: '#alerts',
                severity: ['critical', 'high']
            }
        },
        thresholds: {
            errorRate: 0.05, // 5% error rate threshold
            responseTime: 2000, // 2 second response time threshold
            logVolume: 10000, // logs per minute threshold
            diskUsage: 0.85 // 85% disk usage threshold
        }
    }
};

// Company-specific configuration overrides
const COMPANY_CONFIGS = new Map();

/**
 * Logging Configuration Manager
 */
class LoggingConfigManager {
    constructor() {
        this.config = { ...DEFAULT_CONFIG };
        this.companyConfigs = new Map();
        this.environment = process.env.NODE_ENV || 'development';
        this.configPath = process.env.LOGGING_CONFIG_PATH || path.join(process.cwd(), 'config', 'logging');
    }
    
    /**
     * Initialize the configuration system
     */
    async initialize() {
        try {
            // Ensure config directory exists
            await fs.mkdir(this.configPath, { recursive: true });
            
            // Load global configuration
            await this.loadGlobalConfig();
            
            // Load company-specific configurations
            await this.loadCompanyConfigs();
            
            console.log('Logging configuration system initialized');
        } catch (error) {
            console.error('Failed to initialize logging configuration:', error);
            throw error;
        }
    }
    
    /**
     * Load global logging configuration
     */
    async loadGlobalConfig() {
        const globalConfigPath = path.join(this.configPath, 'global.json');
        
        try {
            const configData = await fs.readFile(globalConfigPath, 'utf8');
            const globalConfig = JSON.parse(configData);
            this.config = this.mergeConfigs(this.config, globalConfig);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Create default global config if it doesn't exist
                await this.saveGlobalConfig();
            } else {
                console.error('Error loading global logging config:', error);
            }
        }
    }
    
    /**
     * Load company-specific configurations
     */
    async loadCompanyConfigs() {
        const companiesDir = path.join(this.configPath, 'companies');
        
        try {
            await fs.mkdir(companiesDir, { recursive: true });
            const files = await fs.readdir(companiesDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const companyId = file.replace('.json', '');
                    const configPath = path.join(companiesDir, file);
                    
                    try {
                        const configData = await fs.readFile(configPath, 'utf8');
                        const companyConfig = JSON.parse(configData);
                        this.companyConfigs.set(companyId, companyConfig);
                    } catch (error) {
                        console.error(`Error loading config for company ${companyId}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading company configurations:', error);
        }
    }
    
    /**
     * Get configuration for a specific company
     */
    getCompanyConfig(companyId) {
        const baseConfig = this.getEnvironmentConfig();
        const companyOverrides = this.companyConfigs.get(companyId) || {};
        
        return this.mergeConfigs(baseConfig, companyOverrides);
    }
    
    /**
     * Get environment-specific configuration
     */
    getEnvironmentConfig() {
        const envConfig = this.config.environments[this.environment] || {};
        return this.mergeConfigs(this.config.global, envConfig);
    }
    
    /**
     * Get configuration for a specific log type
     */
    getLogTypeConfig(logType, companyId = null) {
        const baseConfig = companyId ? this.getCompanyConfig(companyId) : this.getEnvironmentConfig();
        const logTypeConfig = this.config.logTypes[logType] || {};
        
        return {
            ...baseConfig,
            ...logTypeConfig,
            logType
        };
    }
    
    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(featureName, companyId = null) {
        const config = companyId ? this.getCompanyConfig(companyId) : this.getEnvironmentConfig();
        const featureConfig = this.config.features[featureName];
        
        if (!featureConfig) {
            return false;
        }
        
        // Check company-specific override
        if (companyId && this.companyConfigs.has(companyId)) {
            const companyConfig = this.companyConfigs.get(companyId);
            if (companyConfig.features && companyConfig.features[featureName]) {
                return companyConfig.features[featureName].enabled;
            }
        }
        
        return featureConfig.enabled;
    }
    
    /**
     * Get feature configuration
     */
    getFeatureConfig(featureName, companyId = null) {
        const baseFeatureConfig = this.config.features[featureName] || {};
        
        if (companyId && this.companyConfigs.has(companyId)) {
            const companyConfig = this.companyConfigs.get(companyId);
            if (companyConfig.features && companyConfig.features[featureName]) {
                return this.mergeConfigs(baseFeatureConfig, companyConfig.features[featureName]);
            }
        }
        
        return baseFeatureConfig;
    }
    
    /**
     * Set company-specific configuration
     */
    async setCompanyConfig(companyId, config) {
        this.companyConfigs.set(companyId, config);
        
        // Save to file
        const companiesDir = path.join(this.configPath, 'companies');
        await fs.mkdir(companiesDir, { recursive: true });
        
        const configPath = path.join(companiesDir, `${companyId}.json`);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
    
    /**
     * Update feature toggle for a company
     */
    async updateFeatureToggle(companyId, featureName, enabled, additionalConfig = {}) {
        let companyConfig = this.companyConfigs.get(companyId) || {};
        
        if (!companyConfig.features) {
            companyConfig.features = {};
        }
        
        if (!companyConfig.features[featureName]) {
            companyConfig.features[featureName] = {};
        }
        
        companyConfig.features[featureName] = {
            ...companyConfig.features[featureName],
            enabled,
            ...additionalConfig
        };
        
        await this.setCompanyConfig(companyId, companyConfig);
    }
    
    /**
     * Get retention policy for a log type
     */
    getRetentionPolicy(logType, companyId = null) {
        const config = this.getLogTypeConfig(logType, companyId);
        return {
            retentionDays: config.retentionDays || 30,
            directory: config.directory || 'logs',
            tamperProof: config.tamperProof || false,
            immediateAlert: config.immediateAlert || false
        };
    }
    
    /**
     * Get alert configuration
     */
    getAlertConfig(companyId = null) {
        const baseConfig = this.config.alerts;
        
        if (companyId && this.companyConfigs.has(companyId)) {
            const companyConfig = this.companyConfigs.get(companyId);
            if (companyConfig.alerts) {
                return this.mergeConfigs(baseConfig, companyConfig.alerts);
            }
        }
        
        return baseConfig;
    }
    
    /**
     * Save global configuration
     */
    async saveGlobalConfig() {
        const globalConfigPath = path.join(this.configPath, 'global.json');
        await fs.writeFile(globalConfigPath, JSON.stringify(this.config, null, 2));
    }
    
    /**
     * Merge configuration objects deeply
     */
    mergeConfigs(base, override) {
        const result = { ...base };
        
        for (const key in override) {
            if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
                result[key] = this.mergeConfigs(result[key] || {}, override[key]);
            } else {
                result[key] = override[key];
            }
        }
        
        return result;
    }
    
    /**
     * Validate configuration
     */
    validateConfig(config) {
        const errors = [];
        
        // Validate log levels
        const validLevels = ['error', 'warn', 'info', 'debug'];
        if (config.level && !validLevels.includes(config.level)) {
            errors.push(`Invalid log level: ${config.level}`);
        }
        
        // Validate retention days
        if (config.retentionDays && (config.retentionDays < 1 || config.retentionDays > 3650)) {
            errors.push(`Invalid retention days: ${config.retentionDays}`);
        }
        
        // Validate file size
        if (config.maxFileSize && !/^\d+[kmg]?$/i.test(config.maxFileSize)) {
            errors.push(`Invalid max file size format: ${config.maxFileSize}`);
        }
        
        return errors;
    }
    
    /**
     * Get configuration summary for monitoring
     */
    getConfigSummary() {
        return {
            environment: this.environment,
            companiesConfigured: this.companyConfigs.size,
            globalConfig: {
                level: this.config.global.level,
                enabledFeatures: Object.keys(this.config.features).filter(
                    feature => this.config.features[feature].enabled
                )
            },
            logTypes: Object.keys(this.config.logTypes),
            alertChannels: Object.keys(this.config.alerts.channels).filter(
                channel => this.config.alerts.channels[channel].enabled
            )
        };
    }
}

// Create singleton instance
const loggingConfigManager = new LoggingConfigManager();

export default loggingConfigManager;
export { LoggingConfigManager, DEFAULT_CONFIG };