/**
 * Logging Dashboard Controller
 * 
 * Provides REST API endpoints for logging system monitoring dashboard
 */

import loggingMonitoringService from '../services/loggingMonitoring.service.js';
import loggingConfigurationService from '../services/loggingConfiguration.service.js';
import logMaintenanceService from '../services/logMaintenance.service.js';
import alertGenerationService from '../services/alertGeneration.service.js';

class LoggingDashboardController {
    
    /**
     * Get dashboard overview
     * GET /api/v1/logging/dashboard
     */
    async getDashboardOverview(req, res) {
        try {
            const dashboardData = loggingMonitoringService.getDashboardData();
            
            if (dashboardData.success) {
                res.json(dashboardData);
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to get dashboard data'
                });
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
     * Get monitoring status
     * GET /api/v1/logging/dashboard/monitoring
     */
    async getMonitoringStatus(req, res) {
        try {
            const status = loggingMonitoringService.getMonitoringStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Start monitoring
     * POST /api/v1/logging/dashboard/monitoring/start
     */
    async startMonitoring(req, res) {
        try {
            const { intervalMs = 60000 } = req.body;
            
            await loggingMonitoringService.startMonitoring(intervalMs);
            
            res.json({
                success: true,
                message: 'Monitoring started successfully',
                data: {
                    intervalMs,
                    startedAt: new Date()
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * Stop monitoring
     * POST /api/v1/logging/dashboard/monitoring/stop
     */
    async stopMonitoring(req, res) {
        try {
            loggingMonitoringService.stopMonitoring();
            
            res.json({
                success: true,
                message: 'Monitoring stopped successfully',
                data: {
                    stoppedAt: new Date()
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
     * Update monitoring thresholds
     * PUT /api/v1/logging/dashboard/monitoring/thresholds
     */
    async updateThresholds(req, res) {
        try {
            const thresholds = req.body;
            
            const result = loggingMonitoringService.updateThresholds(thresholds);
            
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
     * Get system health metrics
     * GET /api/v1/logging/dashboard/health
     */
    async getSystemHealth(req, res) {
        try {
            const configHealth = loggingConfigurationService.getConfigHealth();
            const monitoringStatus = loggingMonitoringService.getMonitoringStatus();
            const maintenanceStats = logMaintenanceService.getMaintenanceStats();
            
            const systemHealth = {
                success: true,
                data: {
                    timestamp: new Date(),
                    overall: {
                        status: 'healthy',
                        components: {
                            configuration: configHealth.data.status,
                            monitoring: monitoringStatus.data.isMonitoring ? 'active' : 'inactive',
                            maintenance: maintenanceStats.data.lastRun ? 'operational' : 'pending'
                        }
                    },
                    configuration: configHealth.data,
                    monitoring: monitoringStatus.data,
                    maintenance: maintenanceStats.data
                }
            };
            
            // Determine overall health status
            const componentStatuses = Object.values(systemHealth.data.overall.components);
            if (componentStatuses.includes('unhealthy') || componentStatuses.includes('error')) {
                systemHealth.data.overall.status = 'unhealthy';
            } else if (componentStatuses.includes('warning') || componentStatuses.includes('inactive')) {
                systemHealth.data.overall.status = 'warning';
            }
            
            res.json(systemHealth);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get log statistics
     * GET /api/v1/logging/dashboard/statistics
     */
    async getLogStatistics(req, res) {
        try {
            const { companyId, timeRange = '24h' } = req.query;
            
            // Get global statistics
            const globalStats = await logMaintenanceService.getLogDirectoryStats();
            
            const statistics = {
                success: true,
                data: {
                    timestamp: new Date(),
                    timeRange,
                    global: globalStats.success ? globalStats.data : null,
                    companies: {}
                }
            };
            
            // Get company-specific statistics
            if (companyId) {
                const companyStats = await logMaintenanceService.getLogDirectoryStats(companyId);
                if (companyStats.success) {
                    statistics.data.companies[companyId] = companyStats.data;
                }
            } else {
                // Get all configured companies
                const companiesResult = loggingConfigurationService.getConfiguredCompanies();
                if (companiesResult.success) {
                    for (const company of companiesResult.data.companies) {
                        const companyStats = await logMaintenanceService.getLogDirectoryStats(company);
                        if (companyStats.success) {
                            statistics.data.companies[company] = companyStats.data;
                        }
                    }
                }
            }
            
            res.json(statistics);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get recent alerts
     * GET /api/v1/logging/dashboard/alerts
     */
    async getRecentAlerts(req, res) {
        try {
            const { limit = 50, severity, type } = req.query;
            
            const alerts = await alertGenerationService.getRecentAlerts({
                limit: parseInt(limit),
                severity,
                type
            });
            
            res.json(alerts);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get alert statistics
     * GET /api/v1/logging/dashboard/alerts/statistics
     */
    async getAlertStatistics(req, res) {
        try {
            const { timeRange = '24h' } = req.query;
            
            const statistics = await alertGenerationService.getAlertStatistics(timeRange);
            
            res.json(statistics);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Run maintenance manually
     * POST /api/v1/logging/dashboard/maintenance/run
     */
    async runMaintenance(req, res) {
        try {
            const options = req.body || {};
            
            const result = await logMaintenanceService.runMaintenance(options);
            
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
     * Get maintenance status
     * GET /api/v1/logging/dashboard/maintenance
     */
    async getMaintenanceStatus(req, res) {
        try {
            const status = logMaintenanceService.getMaintenanceStats();
            res.json(status);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Get performance metrics
     * GET /api/v1/logging/dashboard/performance
     */
    async getPerformanceMetrics(req, res) {
        try {
            const { timeRange = '1h' } = req.query;
            
            const monitoringStatus = loggingMonitoringService.getMonitoringStatus();
            
            const performanceData = {
                success: true,
                data: {
                    timestamp: new Date(),
                    timeRange,
                    metrics: monitoringStatus.data.metrics.performanceMetrics,
                    systemHealth: monitoringStatus.data.metrics.systemHealth,
                    thresholds: monitoringStatus.data.thresholds
                }
            };
            
            res.json(performanceData);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
    
    /**
     * Export dashboard data
     * GET /api/v1/logging/dashboard/export
     */
    async exportDashboardData(req, res) {
        try {
            const { format = 'json' } = req.query;
            
            const dashboardData = loggingMonitoringService.getDashboardData();
            const configHealth = loggingConfigurationService.getConfigHealth();
            const maintenanceStats = logMaintenanceService.getMaintenanceStats();
            
            const exportData = {
                exportedAt: new Date().toISOString(),
                dashboard: dashboardData.data,
                configuration: configHealth.data,
                maintenance: maintenanceStats.data
            };
            
            if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="logging-dashboard-${Date.now()}.json"`);
                res.json(exportData);
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Unsupported export format'
                });
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
     * Get real-time metrics (for WebSocket or polling)
     * GET /api/v1/logging/dashboard/realtime
     */
    async getRealtimeMetrics(req, res) {
        try {
            const monitoringStatus = loggingMonitoringService.getMonitoringStatus();
            
            const realtimeData = {
                success: true,
                data: {
                    timestamp: new Date(),
                    isMonitoring: monitoringStatus.data.isMonitoring,
                    systemHealth: monitoringStatus.data.metrics.systemHealth,
                    logVolume: monitoringStatus.data.metrics.logVolume,
                    errorRates: monitoringStatus.data.metrics.errorRates,
                    performance: monitoringStatus.data.metrics.performanceMetrics,
                    activeCooldowns: monitoringStatus.data.activeCooldowns
                }
            };
            
            res.json(realtimeData);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }
}

export default new LoggingDashboardController();