/**
 * Module Configuration Controller
 * 
 * Provides REST API endpoints for logging module configuration management
 * Implements Requirements 13.1 and 13.4
 */

import loggingModuleService from '../services/loggingModule.service.js';
import configurationAuditService from '../services/configurationAudit.service.js';
import AppError from '../core/errors/AppError.js';

class ModuleConfigurationController {
    
    /**
     * Get module configuration for a company
     * GET /api/v1/logging/module/:companyId
     */
    async getModuleConfig(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            // Check authorization - users can only access their company's config
            // Platform admins can access any company's config
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            const config = await loggingModuleService.getConfig(companyId);
            
            res.json({
                success: true,
                data: {
                    companyId,
                    moduleConfig: config,
                    essentialEvents: loggingModuleService.getPlatformRequiredLogs(companyId)
                }
            });
        } catch (error) {
            console.error('Error getting module configuration:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Update module configuration for a company
     * PUT /api/v1/logging/module/:companyId
     */
    async updateModuleConfig(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            const configUpdates = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            // Check authorization - users can only update their company's config
            // Platform admins can update any company's config
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            // Validate request body
            if (!configUpdates || typeof configUpdates !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Configuration updates are required'
                });
            }
            
            const adminUser = user.isPlatformAdmin ? `platform:${user.id}` : `company:${user.id}`;
            const updatedConfig = await loggingModuleService.updateConfig(
                companyId, 
                configUpdates, 
                adminUser
            );
            
            res.json({
                success: true,
                message: 'Module configuration updated successfully',
                data: {
                    companyId,
                    moduleConfig: updatedConfig,
                    updatedBy: adminUser,
                    updatedAt: updatedConfig.lastModified
                }
            });
        } catch (error) {
            console.error('Error updating module configuration:', error);
            
            if (error.message.includes('Configuration validation failed')) {
                return res.status(400).json({
                    success: false,
                    error: 'Configuration validation failed',
                    details: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Enable or disable the logging module for a company
     * PUT /api/v1/logging/module/:companyId/status
     */
    async updateModuleStatus(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            const { enabled } = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'Enabled status must be a boolean'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            const adminUser = user.isPlatformAdmin ? `platform:${user.id}` : `company:${user.id}`;
            const updatedConfig = await loggingModuleService.updateConfig(
                companyId,
                { enabled },
                adminUser
            );
            
            res.json({
                success: true,
                message: `Logging module ${enabled ? 'enabled' : 'disabled'} successfully`,
                data: {
                    companyId,
                    enabled: updatedConfig.enabled,
                    essentialLoggingActive: !enabled, // Essential logging is active when module is disabled
                    updatedBy: adminUser,
                    updatedAt: updatedConfig.lastModified
                }
            });
        } catch (error) {
            console.error('Error updating module status:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get enabled features for a company
     * GET /api/v1/logging/module/:companyId/features
     */
    async getEnabledFeatures(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            const enabledFeatures = await loggingModuleService.getEnabledFeatures(companyId);
            const config = await loggingModuleService.getConfig(companyId);
            
            res.json({
                success: true,
                data: {
                    companyId,
                    moduleEnabled: config.enabled,
                    enabledFeatures,
                    allFeatures: config.features,
                    essentialFeatures: Object.keys(config.features).filter(feature => 
                        loggingModuleService.isEssentialFeature(feature)
                    )
                }
            });
        } catch (error) {
            console.error('Error getting enabled features:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Check if a specific feature is enabled
     * GET /api/v1/logging/module/:companyId/features/:featureName
     */
    async checkFeatureEnabled(req, res) {
        try {
            const { companyId, featureName } = req.params;
            const { user } = req;
            
            if (!companyId || !featureName) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID and feature name are required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            const isEnabled = await loggingModuleService.isFeatureEnabled(companyId, featureName);
            const isEssential = loggingModuleService.isEssentialFeature(featureName);
            
            res.json({
                success: true,
                data: {
                    companyId,
                    featureName,
                    enabled: isEnabled,
                    essential: isEssential,
                    reason: isEssential ? 'Essential feature - always enabled' : 
                           isEnabled ? 'Feature enabled by configuration' : 'Feature disabled by configuration'
                }
            });
        } catch (error) {
            console.error('Error checking feature status:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Export module configuration
     * GET /api/v1/logging/module/:companyId/export
     */
    async exportModuleConfig(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            const exportData = await loggingModuleService.exportConfig(companyId);
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="logging-module-config-${companyId}.json"`);
            res.json({
                success: true,
                data: exportData
            });
        } catch (error) {
            console.error('Error exporting module configuration:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Import module configuration
     * POST /api/v1/logging/module/:companyId/import
     */
    async importModuleConfig(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            const configData = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            if (!configData) {
                return res.status(400).json({
                    success: false,
                    error: 'Configuration data is required'
                });
            }
            
            const adminUser = user.isPlatformAdmin ? `platform:${user.id}` : `company:${user.id}`;
            const importedConfig = await loggingModuleService.importConfig(
                companyId, 
                configData, 
                adminUser
            );
            
            res.json({
                success: true,
                message: 'Module configuration imported successfully',
                data: {
                    companyId,
                    moduleConfig: importedConfig,
                    importedBy: adminUser,
                    importedAt: importedConfig.lastModified
                }
            });
        } catch (error) {
            console.error('Error importing module configuration:', error);
            
            if (error.message.includes('validation failed') || error.message.includes('Invalid import data')) {
                return res.status(400).json({
                    success: false,
                    error: 'Import validation failed',
                    details: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Reset module configuration to defaults
     * POST /api/v1/logging/module/:companyId/reset
     */
    async resetModuleConfig(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            const adminUser = user.isPlatformAdmin ? `platform:${user.id}` : `company:${user.id}`;
            const resetConfig = await loggingModuleService.resetConfig(companyId, adminUser);
            
            res.json({
                success: true,
                message: 'Module configuration reset to defaults successfully',
                data: {
                    companyId,
                    moduleConfig: resetConfig,
                    resetBy: adminUser,
                    resetAt: resetConfig.lastModified
                }
            });
        } catch (error) {
            console.error('Error resetting module configuration:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get configuration audit trail
     * GET /api/v1/logging/module/:companyId/audit
     */
    async getConfigurationAudit(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            const { limit = 50, timeRange = 24 } = req.query;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            const auditEntries = await configurationAuditService.getAuditLog(
                companyId, 
                parseInt(limit)
            );
            
            const auditStats = await configurationAuditService.getAuditStatistics(
                companyId,
                parseInt(timeRange) * 60 * 60 * 1000 // Convert hours to milliseconds
            );
            
            res.json({
                success: true,
                data: {
                    companyId,
                    auditEntries,
                    statistics: auditStats,
                    totalEntries: auditEntries.length
                }
            });
        } catch (error) {
            console.error('Error getting configuration audit:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Validate module configuration
     * POST /api/v1/logging/module/:companyId/validate
     */
    async validateModuleConfig(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            const configToValidate = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            if (!configToValidate) {
                return res.status(400).json({
                    success: false,
                    error: 'Configuration data is required for validation'
                });
            }
            
            const validationErrors = loggingModuleService.validateConfig(configToValidate);
            const isValid = validationErrors.length === 0;
            
            res.json({
                success: true,
                data: {
                    companyId,
                    valid: isValid,
                    errors: validationErrors,
                    warnings: this.generateConfigWarnings(configToValidate),
                    validatedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error validating module configuration:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Update individual feature toggle
     * PUT /api/v1/logging/module/:companyId/features/:featureName/toggle
     */
    async toggleFeature(req, res) {
        try {
            const { companyId, featureName } = req.params;
            const { user } = req;
            const { enabled } = req.body;
            
            if (!companyId || !featureName) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID and feature name are required'
                });
            }
            
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'Enabled status must be a boolean'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            // Check if feature is essential (cannot be disabled)
            if (!enabled && loggingModuleService.isEssentialFeature(featureName)) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot disable essential feature: ${featureName}`,
                    details: 'Essential features are required for platform security and compliance'
                });
            }
            
            const adminUser = user.isPlatformAdmin ? `platform:${user.id}` : `company:${user.id}`;
            const updatedConfig = await loggingModuleService.updateConfig(
                companyId,
                { features: { [featureName]: enabled } },
                adminUser
            );
            
            res.json({
                success: true,
                message: `Feature ${featureName} ${enabled ? 'enabled' : 'disabled'} successfully`,
                data: {
                    companyId,
                    featureName,
                    enabled: updatedConfig.features[featureName],
                    essential: loggingModuleService.isEssentialFeature(featureName),
                    updatedBy: adminUser,
                    updatedAt: updatedConfig.lastModified
                }
            });
        } catch (error) {
            console.error('Error toggling feature:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Batch update multiple features
     * PUT /api/v1/logging/module/:companyId/features/batch
     */
    async batchUpdateFeatures(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            const { features } = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            if (!features || typeof features !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Features object is required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            // Validate feature updates
            const validationErrors = [];
            const essentialFeatures = [];
            
            for (const [featureName, enabled] of Object.entries(features)) {
                if (typeof enabled !== 'boolean') {
                    validationErrors.push(`Feature ${featureName} must have a boolean value`);
                }
                
                if (!enabled && loggingModuleService.isEssentialFeature(featureName)) {
                    essentialFeatures.push(featureName);
                }
            }
            
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validationErrors
                });
            }
            
            if (essentialFeatures.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot disable essential features',
                    details: `Essential features cannot be disabled: ${essentialFeatures.join(', ')}`
                });
            }
            
            const adminUser = user.isPlatformAdmin ? `platform:${user.id}` : `company:${user.id}`;
            const updatedConfig = await loggingModuleService.updateConfig(
                companyId,
                { features },
                adminUser
            );
            
            res.json({
                success: true,
                message: 'Features updated successfully',
                data: {
                    companyId,
                    updatedFeatures: Object.keys(features),
                    currentFeatures: updatedConfig.features,
                    updatedBy: adminUser,
                    updatedAt: updatedConfig.lastModified
                }
            });
        } catch (error) {
            console.error('Error batch updating features:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Update retention policy for specific log type
     * PUT /api/v1/logging/module/:companyId/retention/:logType
     */
    async updateRetentionPolicy(req, res) {
        try {
            const { companyId, logType } = req.params;
            const { user } = req;
            const { retentionDays } = req.body;
            
            if (!companyId || !logType) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID and log type are required'
                });
            }
            
            if (!retentionDays || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
                return res.status(400).json({
                    success: false,
                    error: 'Retention days must be an integer between 1 and 3650'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            const adminUser = user.isPlatformAdmin ? `platform:${user.id}` : `company:${user.id}`;
            const updatedConfig = await loggingModuleService.updateConfig(
                companyId,
                { retentionPolicies: { [logType]: retentionDays } },
                adminUser
            );
            
            res.json({
                success: true,
                message: `Retention policy for ${logType} updated successfully`,
                data: {
                    companyId,
                    logType,
                    retentionDays: updatedConfig.retentionPolicies[logType],
                    allRetentionPolicies: updatedConfig.retentionPolicies,
                    updatedBy: adminUser,
                    updatedAt: updatedConfig.lastModified
                }
            });
        } catch (error) {
            console.error('Error updating retention policy:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Update alerting configuration
     * PUT /api/v1/logging/module/:companyId/alerting
     */
    async updateAlertingConfig(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            const alertingUpdates = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            if (!alertingUpdates || typeof alertingUpdates !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Alerting configuration is required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            // Validate alerting configuration
            const validAlertingFields = ['enabled', 'criticalErrors', 'securityEvents', 'performanceThresholds'];
            const invalidFields = Object.keys(alertingUpdates).filter(field => 
                !validAlertingFields.includes(field)
            );
            
            if (invalidFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid alerting configuration fields',
                    details: `Invalid fields: ${invalidFields.join(', ')}`
                });
            }
            
            // Validate boolean values
            for (const [field, value] of Object.entries(alertingUpdates)) {
                if (typeof value !== 'boolean') {
                    return res.status(400).json({
                        success: false,
                        error: `Alerting field ${field} must be a boolean`
                    });
                }
            }
            
            const adminUser = user.isPlatformAdmin ? `platform:${user.id}` : `company:${user.id}`;
            const updatedConfig = await loggingModuleService.updateConfig(
                companyId,
                { alerting: alertingUpdates },
                adminUser
            );
            
            res.json({
                success: true,
                message: 'Alerting configuration updated successfully',
                data: {
                    companyId,
                    alertingConfig: updatedConfig.alerting,
                    updatedBy: adminUser,
                    updatedAt: updatedConfig.lastModified
                }
            });
        } catch (error) {
            console.error('Error updating alerting configuration:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Preview configuration changes without applying them
     * POST /api/v1/logging/module/:companyId/preview
     */
    async previewConfigChanges(req, res) {
        try {
            const { companyId } = req.params;
            const { user } = req;
            const configChanges = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            if (!configChanges || typeof configChanges !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Configuration changes are required'
                });
            }
            
            // Check authorization
            if (!user.isPlatformAdmin && user.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: insufficient permissions'
                });
            }
            
            // Get current configuration
            const currentConfig = await loggingModuleService.getConfig(companyId);
            
            // Merge changes with current configuration
            const previewConfig = {
                ...currentConfig,
                ...configChanges,
                features: {
                    ...currentConfig.features,
                    ...(configChanges.features || {})
                },
                retentionPolicies: {
                    ...currentConfig.retentionPolicies,
                    ...(configChanges.retentionPolicies || {})
                },
                alerting: {
                    ...currentConfig.alerting,
                    ...(configChanges.alerting || {})
                }
            };
            
            // Validate the preview configuration
            const validationErrors = loggingModuleService.validateConfig(previewConfig);
            const warnings = this.generateConfigWarnings(previewConfig);
            
            // Check for essential feature violations
            const essentialViolations = [];
            if (configChanges.features) {
                for (const [featureName, enabled] of Object.entries(configChanges.features)) {
                    if (!enabled && loggingModuleService.isEssentialFeature(featureName)) {
                        essentialViolations.push(featureName);
                    }
                }
            }
            
            // Calculate impact
            const impact = this.calculateConfigImpact(currentConfig, previewConfig);
            
            res.json({
                success: true,
                data: {
                    companyId,
                    currentConfig,
                    previewConfig,
                    changes: configChanges,
                    validation: {
                        valid: validationErrors.length === 0 && essentialViolations.length === 0,
                        errors: validationErrors,
                        warnings,
                        essentialViolations
                    },
                    impact,
                    previewedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error previewing configuration changes:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Calculate the impact of configuration changes
     */
    calculateConfigImpact(currentConfig, newConfig) {
        const impact = {
            moduleStatusChange: currentConfig.enabled !== newConfig.enabled,
            featureChanges: [],
            retentionChanges: [],
            alertingChanges: [],
            estimatedLogVolumeChange: 0
        };
        
        // Calculate feature changes
        for (const [featureName, newValue] of Object.entries(newConfig.features)) {
            const currentValue = currentConfig.features[featureName];
            if (currentValue !== newValue) {
                impact.featureChanges.push({
                    feature: featureName,
                    from: currentValue,
                    to: newValue,
                    essential: loggingModuleService.isEssentialFeature(featureName)
                });
                
                // Estimate log volume impact
                if (newValue && !currentValue) {
                    impact.estimatedLogVolumeChange += this.getFeatureLogVolumeImpact(featureName);
                } else if (!newValue && currentValue) {
                    impact.estimatedLogVolumeChange -= this.getFeatureLogVolumeImpact(featureName);
                }
            }
        }
        
        // Calculate retention changes
        for (const [logType, newDays] of Object.entries(newConfig.retentionPolicies)) {
            const currentDays = currentConfig.retentionPolicies[logType];
            if (currentDays !== newDays) {
                impact.retentionChanges.push({
                    logType,
                    from: currentDays,
                    to: newDays,
                    storageImpact: newDays > currentDays ? 'increase' : 'decrease'
                });
            }
        }
        
        // Calculate alerting changes
        for (const [alertType, newValue] of Object.entries(newConfig.alerting)) {
            const currentValue = currentConfig.alerting[alertType];
            if (currentValue !== newValue) {
                impact.alertingChanges.push({
                    alertType,
                    from: currentValue,
                    to: newValue
                });
            }
        }
        
        return impact;
    }
    
    /**
     * Get estimated log volume impact for a feature
     */
    getFeatureLogVolumeImpact(featureName) {
        const volumeImpacts = {
            userActionLogging: 30, // 30% increase
            performanceLogging: 20, // 20% increase
            frontendLogging: 25, // 25% increase
            detailedErrorLogging: 15, // 15% increase
            auditLogging: 10, // 10% increase
            securityLogging: 5 // 5% increase
        };
        
        return volumeImpacts[featureName] || 0;
    }
    
    /**
     * Generate configuration warnings for potentially problematic settings
     */
    generateConfigWarnings(config) {
        const warnings = [];
        
        // Check for very short retention periods
        if (config.retentionPolicies) {
            for (const [logType, days] of Object.entries(config.retentionPolicies)) {
                if (days < 30) {
                    warnings.push(`Short retention period for ${logType}: ${days} days (recommended minimum: 30 days)`);
                }
                if (logType === 'auditLogs' && days < 365) {
                    warnings.push(`Audit log retention of ${days} days may not meet compliance requirements (recommended: 365+ days)`);
                }
            }
        }
        
        // Check for disabled essential features
        if (config.features) {
            if (!config.features.securityLogging) {
                warnings.push('Security logging is disabled - this may impact security monitoring capabilities');
            }
            if (!config.features.auditLogging) {
                warnings.push('Audit logging is disabled - this may impact compliance requirements');
            }
        }
        
        // Check for disabled alerting
        if (config.alerting && !config.alerting.enabled) {
            warnings.push('Alerting is disabled - critical issues may not be detected promptly');
        }
        
        return warnings;
    }
}

export default new ModuleConfigurationController();