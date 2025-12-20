/**
 * Logging Configuration Controller
 * 
 * Provides REST API endpoints for managing logging configuration
 */

import loggingConfigurationService from '../services/loggingConfiguration.service.js';

class LoggingConfigurationController {
    
    /**
     * Get company logging configuration
     * GET /api/v1/logging/config/:companyId
     */
    async getCompanyConfig(req, res) {
        try {
            const { companyId } = req.params;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            const result = await loggingConfigurationService.getCompanyLoggingConfig(companyId);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Update company logging configuration
     * PUT /api/v1/logging/config/:companyId
     */
    async updateCompanyConfig(req, res) {
        try {
            const { companyId } = req.params;
            const configUpdates = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            const result = await loggingConfigurationService.updateCompanyLoggingConfig(companyId, configUpdates);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Update feature toggle for a company
     * PUT /api/v1/logging/config/:companyId/features/:featureName
     */
    async updateFeatureToggle(req, res) {
        try {
            const { companyId, featureName } = req.params;
            const { enabled, config = {} } = req.body;
            
            if (!companyId || !featureName) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID and feature name are required'
                });
            }
            
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'Enabled flag must be a boolean'
                });
            }
            
            const result = await loggingConfigurationService.updateFeatureToggle(
                companyId,
                featureName,
                enabled,
                config
            );
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get company features
     * GET /api/v1/logging/config/:companyId/features
     */
    async getCompanyFeatures(req, res) {
        try {
            const { companyId } = req.params;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            const features = loggingConfigurationService.getCompanyFeatures(companyId);
            
            res.json({
                success: true,
                data: {
                    companyId,
                    features
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Update retention policy for a log type
     * PUT /api/v1/logging/config/:companyId/retention/:logType
     */
    async updateRetentionPolicy(req, res) {
        try {
            const { companyId, logType } = req.params;
            const { retentionDays } = req.body;
            
            if (!companyId || !logType) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID and log type are required'
                });
            }
            
            if (!retentionDays || typeof retentionDays !== 'number') {
                return res.status(400).json({
                    success: false,
                    error: 'Retention days must be a valid number'
                });
            }
            
            const result = await loggingConfigurationService.updateRetentionPolicy(
                companyId,
                logType,
                retentionDays
            );
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Configure alert settings
     * PUT /api/v1/logging/config/:companyId/alerts
     */
    async configureAlerts(req, res) {
        try {
            const { companyId } = req.params;
            const alertConfig = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            const result = await loggingConfigurationService.configureAlerts(companyId, alertConfig);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get global logging configuration
     * GET /api/v1/logging/config/global
     */
    async getGlobalConfig(req, res) {
        try {
            const result = loggingConfigurationService.getGlobalConfig();
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Update global logging configuration
     * PUT /api/v1/logging/config/global
     */
    async updateGlobalConfig(req, res) {
        try {
            const configUpdates = req.body;
            
            const result = await loggingConfigurationService.updateGlobalConfig(configUpdates);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get log type configuration
     * GET /api/v1/logging/config/logtype/:logType
     */
    async getLogTypeConfig(req, res) {
        try {
            const { logType } = req.params;
            const { companyId } = req.query;
            
            if (!logType) {
                return res.status(400).json({
                    success: false,
                    error: 'Log type is required'
                });
            }
            
            const result = loggingConfigurationService.getLogTypeConfig(logType, companyId);
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * List configured companies
     * GET /api/v1/logging/config/companies
     */
    async getConfiguredCompanies(req, res) {
        try {
            const result = loggingConfigurationService.getConfiguredCompanies();
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Export company configuration
     * GET /api/v1/logging/config/:companyId/export
     */
    async exportCompanyConfig(req, res) {
        try {
            const { companyId } = req.params;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            const result = await loggingConfigurationService.exportCompanyConfig(companyId);
            
            if (result.success) {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="logging-config-${companyId}.json"`);
                res.json(result.data);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Import company configuration
     * POST /api/v1/logging/config/:companyId/import
     */
    async importCompanyConfig(req, res) {
        try {
            const { companyId } = req.params;
            const configData = req.body;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            const result = await loggingConfigurationService.importCompanyConfig(companyId, configData);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Reset company configuration
     * DELETE /api/v1/logging/config/:companyId
     */
    async resetCompanyConfig(req, res) {
        try {
            const { companyId } = req.params;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    error: 'Company ID is required'
                });
            }
            
            const result = await loggingConfigurationService.resetCompanyConfig(companyId);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get configuration health status
     * GET /api/v1/logging/config/health
     */
    async getConfigHealth(req, res) {
        try {
            const result = loggingConfigurationService.getConfigHealth();
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
}

export default new LoggingConfigurationController();