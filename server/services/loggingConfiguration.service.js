/**
 * Logging Configuration Service
 * 
 * Provides API interface for managing logging configuration
 * including per-company settings and feature toggles
 */

import loggingConfigManager from '../config/logging.config.js';
import path from 'path';
import fs from 'fs/promises';

class LoggingConfigurationService {
    constructor() {
        this.configManager = loggingConfigManager;
    }
    
    /**
     * Initialize the configuration service
     */
    async initialize() {
        await this.configManager.initialize();
    }
    
    /**
     * Get logging configuration for a company
     */
    async getCompanyLoggingConfig(companyId) {
        try {
            const config = this.configManager.getCompanyConfig(companyId);
            
            return {
                success: true,
                data: {
                    companyId,
                    config,
                    features: this.getCompanyFeatures(companyId),
                    retentionPolicies: this.getCompanyRetentionPolicies(companyId),
                    alertSettings: this.configManager.getAlertConfig(companyId)
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Update company logging configuration
     */
    async updateCompanyLoggingConfig(companyId, configUpdates) {
        try {
            // Validate the configuration
            const validationErrors = this.configManager.validateConfig(configUpdates);
            if (validationErrors.length > 0) {
                return {
                    success: false,
                    error: 'Configuration validation failed',
                    details: validationErrors
                };
            }
            
            // Get current config and merge with updates
            const currentConfig = this.configManager.companyConfigs.get(companyId) || {};
            const mergedConfig = this.configManager.mergeConfigs(currentConfig, configUpdates);
            
            // Save the updated configuration
            await this.configManager.setCompanyConfig(companyId, mergedConfig);
            
            return {
                success: true,
                message: 'Company logging configuration updated successfully',
                data: mergedConfig
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Update feature toggle for a company
     */
    async updateFeatureToggle(companyId, featureName, enabled, additionalConfig = {}) {
        try {
            await this.configManager.updateFeatureToggle(companyId, featureName, enabled, additionalConfig);
            
            return {
                success: true,
                message: `Feature ${featureName} ${enabled ? 'enabled' : 'disabled'} for company ${companyId}`,
                data: {
                    companyId,
                    featureName,
                    enabled,
                    config: additionalConfig
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get feature status for a company
     */
    getCompanyFeatures(companyId) {
        const features = {};
        
        for (const featureName in this.configManager.config.features) {
            features[featureName] = {
                enabled: this.configManager.isFeatureEnabled(featureName, companyId),
                config: this.configManager.getFeatureConfig(featureName, companyId)
            };
        }
        
        return features;
    }
    
    /**
     * Get retention policies for a company
     */
    getCompanyRetentionPolicies(companyId) {
        const policies = {};
        
        for (const logType in this.configManager.config.logTypes) {
            policies[logType] = this.configManager.getRetentionPolicy(logType, companyId);
        }
        
        return policies;
    }
    
    /**
     * Update retention policy for a specific log type
     */
    async updateRetentionPolicy(companyId, logType, retentionDays) {
        try {
            if (retentionDays < 1 || retentionDays > 3650) {
                return {
                    success: false,
                    error: 'Retention days must be between 1 and 3650'
                };
            }
            
            const currentConfig = this.configManager.companyConfigs.get(companyId) || {};
            
            if (!currentConfig.logTypes) {
                currentConfig.logTypes = {};
            }
            
            if (!currentConfig.logTypes[logType]) {
                currentConfig.logTypes[logType] = {};
            }
            
            currentConfig.logTypes[logType].retentionDays = retentionDays;
            
            await this.configManager.setCompanyConfig(companyId, currentConfig);
            
            return {
                success: true,
                message: `Retention policy updated for ${logType} logs`,
                data: {
                    companyId,
                    logType,
                    retentionDays
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Configure alert settings for a company
     */
    async configureAlerts(companyId, alertConfig) {
        try {
            const currentConfig = this.configManager.companyConfigs.get(companyId) || {};
            
            currentConfig.alerts = this.configManager.mergeConfigs(
                currentConfig.alerts || {},
                alertConfig
            );
            
            await this.configManager.setCompanyConfig(companyId, currentConfig);
            
            return {
                success: true,
                message: 'Alert configuration updated successfully',
                data: currentConfig.alerts
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get global logging configuration
     */
    getGlobalConfig() {
        return {
            success: true,
            data: {
                environment: this.configManager.environment,
                config: this.configManager.config,
                summary: this.configManager.getConfigSummary()
            }
        };
    }
    
    /**
     * Update global logging configuration
     */
    async updateGlobalConfig(configUpdates) {
        try {
            // Validate the configuration
            const validationErrors = this.configManager.validateConfig(configUpdates);
            if (validationErrors.length > 0) {
                return {
                    success: false,
                    error: 'Configuration validation failed',
                    details: validationErrors
                };
            }
            
            // Merge with existing config
            this.configManager.config = this.configManager.mergeConfigs(
                this.configManager.config,
                configUpdates
            );
            
            // Save to file
            await this.configManager.saveGlobalConfig();
            
            return {
                success: true,
                message: 'Global logging configuration updated successfully',
                data: this.configManager.config
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get configuration for a specific log type
     */
    getLogTypeConfig(logType, companyId = null) {
        return {
            success: true,
            data: this.configManager.getLogTypeConfig(logType, companyId)
        };
    }
    
    /**
     * List all configured companies
     */
    getConfiguredCompanies() {
        return {
            success: true,
            data: {
                companies: Array.from(this.configManager.companyConfigs.keys()),
                count: this.configManager.companyConfigs.size
            }
        };
    }
    
    /**
     * Export company configuration
     */
    async exportCompanyConfig(companyId) {
        try {
            const config = this.configManager.getCompanyConfig(companyId);
            const features = this.getCompanyFeatures(companyId);
            const retentionPolicies = this.getCompanyRetentionPolicies(companyId);
            
            const exportData = {
                companyId,
                exportedAt: new Date().toISOString(),
                config,
                features,
                retentionPolicies,
                alertSettings: this.configManager.getAlertConfig(companyId)
            };
            
            return {
                success: true,
                data: exportData
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Import company configuration
     */
    async importCompanyConfig(companyId, configData) {
        try {
            // Validate the imported configuration
            if (configData.config) {
                const validationErrors = this.configManager.validateConfig(configData.config);
                if (validationErrors.length > 0) {
                    return {
                        success: false,
                        error: 'Imported configuration validation failed',
                        details: validationErrors
                    };
                }
            }
            
            // Import the configuration
            if (configData.config) {
                await this.configManager.setCompanyConfig(companyId, configData.config);
            }
            
            // Import feature toggles
            if (configData.features) {
                for (const [featureName, featureConfig] of Object.entries(configData.features)) {
                    await this.configManager.updateFeatureToggle(
                        companyId,
                        featureName,
                        featureConfig.enabled,
                        featureConfig.config || {}
                    );
                }
            }
            
            return {
                success: true,
                message: 'Company configuration imported successfully',
                data: {
                    companyId,
                    importedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Reset company configuration to defaults
     */
    async resetCompanyConfig(companyId) {
        try {
            // Remove company-specific configuration
            this.configManager.companyConfigs.delete(companyId);
            
            // Remove configuration file
            const companiesDir = path.join(this.configManager.configPath, 'companies');
            const configPath = path.join(companiesDir, `${companyId}.json`);
            
            try {
                await fs.unlink(configPath);
            } catch (error) {
                // File might not exist, which is fine
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
            
            return {
                success: true,
                message: 'Company configuration reset to defaults',
                data: {
                    companyId,
                    resetAt: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get configuration health status
     */
    getConfigHealth() {
        const summary = this.configManager.getConfigSummary();
        const health = {
            status: 'healthy',
            checks: {
                configLoaded: true,
                companiesConfigured: summary.companiesConfigured > 0,
                alertChannelsConfigured: summary.alertChannels.length > 0,
                featuresEnabled: summary.globalConfig.enabledFeatures.length > 0
            },
            summary
        };
        
        // Determine overall health status
        const failedChecks = Object.values(health.checks).filter(check => !check).length;
        if (failedChecks > 0) {
            health.status = failedChecks > 2 ? 'unhealthy' : 'warning';
        }
        
        return {
            success: true,
            data: health
        };
    }
}

// Create singleton instance
const loggingConfigurationService = new LoggingConfigurationService();

export default loggingConfigurationService;
export { LoggingConfigurationService };