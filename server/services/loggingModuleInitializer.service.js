/**
 * Logging Module Initializer Service
 * 
 * Initializes all logging module services and sets up
 * real-time configuration change handling
 */

import loggingModuleService from './loggingModule.service.js';
import configurationChangeHandler from './configurationChangeHandler.service.js';
import configurationAuditService from './configurationAudit.service.js';

/**
 * Logging Module Initializer
 */
class LoggingModuleInitializer {
    constructor() {
        this.initialized = false;
        this.services = {
            loggingModule: loggingModuleService,
            configurationChangeHandler: configurationChangeHandler,
            configurationAudit: configurationAuditService
        };
    }
    
    /**
     * Initialize all logging module services
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        
        try {
            console.log('Initializing Logging Module System...');
            
            // Initialize services in order
            await this.services.loggingModule.initialize();
            await this.services.configurationChangeHandler.initialize();
            await this.services.configurationAudit.initialize();
            
            // Set up cross-service event handling
            this.setupEventHandling();
            
            this.initialized = true;
            console.log('Logging Module System initialized successfully');
            
            // Log the initialization
            this.services.configurationChangeHandler.emit('systemInitialized', {
                timestamp: new Date().toISOString(),
                services: Object.keys(this.services),
                version: process.env.npm_package_version || '1.0.0'
            });
            
        } catch (error) {
            console.error('Failed to initialize Logging Module System:', error);
            throw error;
        }
    }
    
    /**
     * Set up event handling between services
     */
    setupEventHandling() {
        // Handle configuration errors
        this.services.configurationChangeHandler.on('configurationError', (errorEvent) => {
            console.error(`Configuration error for company ${errorEvent.companyId}:`, errorEvent.error);
        });
        
        // Handle system events
        this.services.loggingModule.on('configurationChanged', (changeEvent) => {
            console.log(`Module configuration changed for company ${changeEvent.companyId} by ${changeEvent.adminUser}`);
        });
        
        // Handle essential logging events
        this.services.loggingModule.on('essentialLoggingForced', (forceEvent) => {
            console.warn(`Essential logging forced for company ${forceEvent.companyId}: ${forceEvent.reason}`);
        });
    }
    
    /**
     * Get initialization status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            services: Object.keys(this.services).reduce((status, serviceName) => {
                const service = this.services[serviceName];
                status[serviceName] = {
                    initialized: service.initialized || false,
                    name: service.constructor.name
                };
                return status;
            }, {}),
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Shutdown all services gracefully
     */
    async shutdown() {
        if (!this.initialized) {
            return;
        }
        
        try {
            console.log('Shutting down Logging Module System...');
            
            // Clean up event listeners
            this.services.configurationChangeHandler.removeAllListeners();
            this.services.loggingModule.removeAllListeners();
            
            // Perform cleanup operations
            await this.services.configurationAudit.cleanupOldEntries();
            
            this.initialized = false;
            console.log('Logging Module System shutdown complete');
            
        } catch (error) {
            console.error('Error during Logging Module System shutdown:', error);
        }
    }
    
    /**
     * Get service instance by name
     */
    getService(serviceName) {
        return this.services[serviceName];
    }
    
    /**
     * Get all services
     */
    getAllServices() {
        return { ...this.services };
    }
    
    /**
     * Health check for all services
     */
    async healthCheck() {
        const health = {
            overall: 'healthy',
            services: {},
            timestamp: new Date().toISOString()
        };
        
        let unhealthyCount = 0;
        
        for (const [serviceName, service] of Object.entries(this.services)) {
            try {
                const serviceHealth = {
                    status: 'healthy',
                    initialized: service.initialized || false,
                    name: service.constructor.name
                };
                
                // Perform service-specific health checks
                if (serviceName === 'loggingModule') {
                    const summary = service.getConfigSummary();
                    serviceHealth.companiesConfigured = summary.totalCompanies;
                    serviceHealth.enabledCompanies = summary.enabledCompanies;
                }
                
                if (serviceName === 'configurationChangeHandler') {
                    const stats = service.getChangeStatistics();
                    serviceHealth.recentChanges = stats.totalChanges;
                }
                
                if (serviceName === 'configurationAudit') {
                    const auditStats = await service.getAuditStatistics();
                    serviceHealth.auditEntries = auditStats.totalEntries;
                }
                
                health.services[serviceName] = serviceHealth;
                
            } catch (error) {
                health.services[serviceName] = {
                    status: 'unhealthy',
                    error: error.message,
                    name: service.constructor.name
                };
                unhealthyCount++;
            }
        }
        
        // Determine overall health
        if (unhealthyCount > 0) {
            health.overall = unhealthyCount === Object.keys(this.services).length ? 'critical' : 'degraded';
        }
        
        return health;
    }
}

// Create singleton instance
const loggingModuleInitializer = new LoggingModuleInitializer();

export default loggingModuleInitializer;
export { LoggingModuleInitializer };