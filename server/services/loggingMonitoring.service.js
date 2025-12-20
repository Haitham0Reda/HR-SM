/**
 * Logging Monitoring Service
 * 
 * Provides real-time monitoring and alerting for the logging system
 */

import loggingConfigManager from '../config/logging.config.js';
import logMaintenanceService from './logMaintenance.service.js';
import alertGenerationService from './alertGeneration.service.js';
import EventEmitter from 'events';

class LoggingMonitoringService extends EventEmitter {
    constructor() {
        super();
        this.configManager = loggingConfigManager;
        this.alertService = alertGenerationService;
        this.maintenanceService = logMaintenanceService;
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.metrics = {
            logVolume: new Map(), // companyId -> volume metrics
            errorRates: new Map(), // companyId -> error rate metrics
            performanceMetrics: new Map(), // companyId -> performance metrics
            systemHealth: {
                diskUsage: 0,
                memoryUsage: 0,
                cpuUsage: 0,
                lastUpdate: null
            }
        };
        
        this.thresholds = {
            logVolumePerMinute: 10000,
            errorRatePercent: 5,
            diskUsagePercent: 85,
            memoryUsagePercent: 80,
            responseTimeMs: 2000
        };
        
        this.alertCooldowns = new Map(); // Prevent alert spam
    }
    
    /**
     * Initialize the monitoring service
     */
    async initialize() {
        await this.configManager.initialize();
        
        // Initialize alert service if it has an initialize method
        if (this.alertService && typeof this.alertService.initialize === 'function') {
            await this.alertService.initialize();
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('Logging monitoring service initialized');
    }
    
    /**
     * Start monitoring
     */
    async startMonitoring(intervalMs = 60000) { // Default 1 minute
        if (this.isMonitoring) {
            throw new Error('Monitoring is already running');
        }
        
        this.isMonitoring = true;
        
        // Start periodic monitoring
        this.monitoringInterval = setInterval(async () => {
            await this.performMonitoringCycle();
        }, intervalMs);
        
        // Perform initial monitoring cycle
        await this.performMonitoringCycle();
        
        console.log(`Logging monitoring started with ${intervalMs}ms interval`);
        
        this.emit('monitoring:started', { intervalMs });
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('Logging monitoring stopped');
        
        this.emit('monitoring:stopped');
    }
    
    /**
     * Perform a complete monitoring cycle
     */
    async performMonitoringCycle() {
        try {
            const cycleStart = Date.now();
            
            // Update system health metrics
            await this.updateSystemHealth();
            
            // Monitor log volumes
            await this.monitorLogVolumes();
            
            // Monitor error rates
            await this.monitorErrorRates();
            
            // Monitor performance metrics
            await this.monitorPerformanceMetrics();
            
            // Check alert thresholds
            await this.checkAlertThresholds();
            
            // Monitor maintenance service health
            await this.monitorMaintenanceHealth();
            
            const cycleDuration = Date.now() - cycleStart;
            
            this.emit('monitoring:cycle:completed', {
                duration: cycleDuration,
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Monitoring cycle failed:', error);
            
            this.emit('monitoring:cycle:error', {
                error: error.message,
                timestamp: new Date()
            });
            
            // Generate alert for monitoring system failure
            await this.alertService.generateAlert({
                type: 'system',
                severity: 'high',
                title: 'Monitoring System Error',
                message: `Monitoring cycle failed: ${error.message}`,
                source: 'logging-monitoring',
                timestamp: new Date(),
                metadata: {
                    error: error.message,
                    stack: error.stack
                }
            });
        }
    }
    
    /**
     * Update system health metrics
     */
    async updateSystemHealth() {
        try {
            // Get disk usage
            const diskStats = await this.maintenanceService.getLogDirectoryStats();
            if (diskStats.success) {
                // Simplified disk usage calculation
                const totalSize = diskStats.data.totalSize;
                const estimatedDiskUsage = Math.min((totalSize / (10 * 1024 * 1024 * 1024)) * 100, 100); // Assume 10GB total
                this.metrics.systemHealth.diskUsage = estimatedDiskUsage;
            }
            
            // Get memory usage (simplified)
            const memUsage = process.memoryUsage();
            const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            this.metrics.systemHealth.memoryUsage = memUsagePercent;
            
            // CPU usage would require additional monitoring (simplified to 0 for now)
            this.metrics.systemHealth.cpuUsage = 0;
            
            this.metrics.systemHealth.lastUpdate = new Date();
            
        } catch (error) {
            console.error('Failed to update system health:', error);
        }
    }
    
    /**
     * Monitor log volumes across companies
     */
    async monitorLogVolumes() {
        try {
            const companies = Array.from(this.configManager.companyConfigs.keys());
            
            // Add default company if no specific companies configured
            if (companies.length === 0) {
                companies.push('default');
            }
            
            for (const companyId of companies) {
                const stats = await this.maintenanceService.getLogDirectoryStats(companyId);
                
                if (stats.success) {
                    const currentMetrics = this.metrics.logVolume.get(companyId) || {
                        previousFileCount: 0,
                        previousSize: 0,
                        volumePerMinute: 0,
                        lastUpdate: new Date()
                    };
                    
                    // Calculate volume increase
                    const fileIncrease = stats.data.totalFiles - currentMetrics.previousFileCount;
                    const sizeIncrease = stats.data.totalSize - currentMetrics.previousSize;
                    
                    // Update metrics
                    const updatedMetrics = {
                        previousFileCount: stats.data.totalFiles,
                        previousSize: stats.data.totalSize,
                        volumePerMinute: fileIncrease, // Simplified calculation
                        sizeIncreasePerMinute: sizeIncrease,
                        lastUpdate: new Date(),
                        totalFiles: stats.data.totalFiles,
                        totalSize: stats.data.totalSize
                    };
                    
                    this.metrics.logVolume.set(companyId, updatedMetrics);
                    
                    // Check volume thresholds
                    if (fileIncrease > this.thresholds.logVolumePerMinute) {
                        await this.handleVolumeThresholdExceeded(companyId, fileIncrease);
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to monitor log volumes:', error);
        }
    }
    
    /**
     * Monitor error rates (simplified implementation)
     */
    async monitorErrorRates() {
        try {
            // This would typically analyze recent log entries for error patterns
            // For now, we'll use a simplified approach
            
            const companies = Array.from(this.configManager.companyConfigs.keys());
            
            for (const companyId of companies) {
                // Simulate error rate monitoring
                const errorRate = Math.random() * 10; // Random error rate for demo
                
                const errorMetrics = {
                    errorRate,
                    lastUpdate: new Date(),
                    threshold: this.thresholds.errorRatePercent
                };
                
                this.metrics.errorRates.set(companyId, errorMetrics);
                
                // Check error rate thresholds
                if (errorRate > this.thresholds.errorRatePercent) {
                    await this.handleErrorRateThresholdExceeded(companyId, errorRate);
                }
            }
            
        } catch (error) {
            console.error('Failed to monitor error rates:', error);
        }
    }
    
    /**
     * Monitor performance metrics
     */
    async monitorPerformanceMetrics() {
        try {
            // Monitor logging system performance
            const performanceMetrics = {
                averageResponseTime: Math.random() * 1000, // Simulated
                throughput: Math.random() * 1000, // Logs per second
                queueSize: Math.random() * 100, // Pending logs
                lastUpdate: new Date()
            };
            
            this.metrics.performanceMetrics.set('system', performanceMetrics);
            
            // Check performance thresholds
            if (performanceMetrics.averageResponseTime > this.thresholds.responseTimeMs) {
                await this.handlePerformanceThresholdExceeded('system', performanceMetrics);
            }
            
        } catch (error) {
            console.error('Failed to monitor performance metrics:', error);
        }
    }
    
    /**
     * Check all alert thresholds
     */
    async checkAlertThresholds() {
        try {
            // Check system health thresholds
            const systemHealth = this.metrics.systemHealth;
            
            if (systemHealth.diskUsage > this.thresholds.diskUsagePercent) {
                await this.handleDiskUsageThresholdExceeded(systemHealth.diskUsage);
            }
            
            if (systemHealth.memoryUsage > this.thresholds.memoryUsagePercent) {
                await this.handleMemoryUsageThresholdExceeded(systemHealth.memoryUsage);
            }
            
        } catch (error) {
            console.error('Failed to check alert thresholds:', error);
        }
    }
    
    /**
     * Monitor maintenance service health
     */
    async monitorMaintenanceHealth() {
        try {
            const maintenanceStats = this.maintenanceService.getMaintenanceStats();
            
            if (maintenanceStats.success) {
                const stats = maintenanceStats.data;
                
                // Check if maintenance hasn't run recently
                if (stats.lastRun) {
                    const lastRunAge = Date.now() - new Date(stats.lastRun).getTime();
                    const lastRunDays = lastRunAge / (24 * 60 * 60 * 1000);
                    
                    if (lastRunDays > 7) {
                        await this.handleMaintenanceOverdue(lastRunDays);
                    }
                }
                
                // Check for maintenance errors
                if (stats.stats && stats.stats.errors.length > 0) {
                    await this.handleMaintenanceErrors(stats.stats.errors);
                }
            }
            
        } catch (error) {
            console.error('Failed to monitor maintenance health:', error);
        }
    }
    
    /**
     * Handle volume threshold exceeded
     */
    async handleVolumeThresholdExceeded(companyId, volume) {
        const alertKey = `volume:${companyId}`;
        
        if (this.isAlertCooledDown(alertKey)) {
            return;
        }
        
        await this.alertService.generateAlert({
            type: 'volume',
            severity: 'medium',
            title: 'High Log Volume Detected',
            message: `Company ${companyId} is generating ${volume} logs per minute, exceeding threshold of ${this.thresholds.logVolumePerMinute}`,
            source: 'logging-monitoring',
            companyId,
            timestamp: new Date(),
            metadata: {
                volume,
                threshold: this.thresholds.logVolumePerMinute,
                companyId
            }
        });
        
        this.setAlertCooldown(alertKey, 15 * 60 * 1000); // 15 minute cooldown
    }
    
    /**
     * Handle error rate threshold exceeded
     */
    async handleErrorRateThresholdExceeded(companyId, errorRate) {
        const alertKey = `errorRate:${companyId}`;
        
        if (this.isAlertCooledDown(alertKey)) {
            return;
        }
        
        await this.alertService.generateAlert({
            type: 'error_rate',
            severity: 'high',
            title: 'High Error Rate Detected',
            message: `Company ${companyId} has an error rate of ${errorRate.toFixed(2)}%, exceeding threshold of ${this.thresholds.errorRatePercent}%`,
            source: 'logging-monitoring',
            companyId,
            timestamp: new Date(),
            metadata: {
                errorRate,
                threshold: this.thresholds.errorRatePercent,
                companyId
            }
        });
        
        this.setAlertCooldown(alertKey, 10 * 60 * 1000); // 10 minute cooldown
    }
    
    /**
     * Handle performance threshold exceeded
     */
    async handlePerformanceThresholdExceeded(component, metrics) {
        const alertKey = `performance:${component}`;
        
        if (this.isAlertCooledDown(alertKey)) {
            return;
        }
        
        await this.alertService.generateAlert({
            type: 'performance',
            severity: 'medium',
            title: 'Performance Threshold Exceeded',
            message: `${component} response time is ${metrics.averageResponseTime.toFixed(0)}ms, exceeding threshold of ${this.thresholds.responseTimeMs}ms`,
            source: 'logging-monitoring',
            timestamp: new Date(),
            metadata: {
                component,
                responseTime: metrics.averageResponseTime,
                threshold: this.thresholds.responseTimeMs
            }
        });
        
        this.setAlertCooldown(alertKey, 20 * 60 * 1000); // 20 minute cooldown
    }
    
    /**
     * Handle disk usage threshold exceeded
     */
    async handleDiskUsageThresholdExceeded(diskUsage) {
        const alertKey = 'diskUsage:system';
        
        if (this.isAlertCooledDown(alertKey)) {
            return;
        }
        
        await this.alertService.generateAlert({
            type: 'disk_usage',
            severity: 'high',
            title: 'High Disk Usage Alert',
            message: `Disk usage is at ${diskUsage.toFixed(1)}%, exceeding threshold of ${this.thresholds.diskUsagePercent}%`,
            source: 'logging-monitoring',
            timestamp: new Date(),
            metadata: {
                diskUsage,
                threshold: this.thresholds.diskUsagePercent
            }
        });
        
        this.setAlertCooldown(alertKey, 30 * 60 * 1000); // 30 minute cooldown
    }
    
    /**
     * Handle memory usage threshold exceeded
     */
    async handleMemoryUsageThresholdExceeded(memoryUsage) {
        const alertKey = 'memoryUsage:system';
        
        if (this.isAlertCooledDown(alertKey)) {
            return;
        }
        
        await this.alertService.generateAlert({
            type: 'memory_usage',
            severity: 'medium',
            title: 'High Memory Usage Alert',
            message: `Memory usage is at ${memoryUsage.toFixed(1)}%, exceeding threshold of ${this.thresholds.memoryUsagePercent}%`,
            source: 'logging-monitoring',
            timestamp: new Date(),
            metadata: {
                memoryUsage,
                threshold: this.thresholds.memoryUsagePercent
            }
        });
        
        this.setAlertCooldown(alertKey, 15 * 60 * 1000); // 15 minute cooldown
    }
    
    /**
     * Handle maintenance overdue
     */
    async handleMaintenanceOverdue(daysSinceLastRun) {
        const alertKey = 'maintenance:overdue';
        
        if (this.isAlertCooledDown(alertKey)) {
            return;
        }
        
        await this.alertService.generateAlert({
            type: 'maintenance',
            severity: 'medium',
            title: 'Log Maintenance Overdue',
            message: `Log maintenance hasn't run for ${daysSinceLastRun.toFixed(0)} days`,
            source: 'logging-monitoring',
            timestamp: new Date(),
            metadata: {
                daysSinceLastRun
            }
        });
        
        this.setAlertCooldown(alertKey, 24 * 60 * 60 * 1000); // 24 hour cooldown
    }
    
    /**
     * Handle maintenance errors
     */
    async handleMaintenanceErrors(errors) {
        const alertKey = 'maintenance:errors';
        
        if (this.isAlertCooledDown(alertKey)) {
            return;
        }
        
        await this.alertService.generateAlert({
            type: 'maintenance',
            severity: 'high',
            title: 'Log Maintenance Errors',
            message: `Log maintenance encountered ${errors.length} errors`,
            source: 'logging-monitoring',
            timestamp: new Date(),
            metadata: {
                errorCount: errors.length,
                errors: errors.slice(0, 5) // Include first 5 errors
            }
        });
        
        this.setAlertCooldown(alertKey, 60 * 60 * 1000); // 1 hour cooldown
    }
    
    /**
     * Check if alert is in cooldown period
     */
    isAlertCooledDown(alertKey) {
        const cooldownEnd = this.alertCooldowns.get(alertKey);
        return cooldownEnd && Date.now() < cooldownEnd;
    }
    
    /**
     * Set alert cooldown
     */
    setAlertCooldown(alertKey, durationMs) {
        this.alertCooldowns.set(alertKey, Date.now() + durationMs);
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for log events from other services
        this.on('log:volume:spike', async (data) => {
            await this.handleVolumeThresholdExceeded(data.companyId, data.volume);
        });
        
        this.on('log:error:rate:high', async (data) => {
            await this.handleErrorRateThresholdExceeded(data.companyId, data.errorRate);
        });
        
        // Clean up cooldowns periodically
        setInterval(() => {
            const now = Date.now();
            for (const [key, cooldownEnd] of this.alertCooldowns.entries()) {
                if (now >= cooldownEnd) {
                    this.alertCooldowns.delete(key);
                }
            }
        }, 5 * 60 * 1000); // Clean up every 5 minutes
    }
    
    /**
     * Get current monitoring status
     */
    getMonitoringStatus() {
        return {
            success: true,
            data: {
                isMonitoring: this.isMonitoring,
                metrics: {
                    systemHealth: this.metrics.systemHealth,
                    logVolume: Object.fromEntries(this.metrics.logVolume),
                    errorRates: Object.fromEntries(this.metrics.errorRates),
                    performanceMetrics: Object.fromEntries(this.metrics.performanceMetrics)
                },
                thresholds: this.thresholds,
                activeCooldowns: this.alertCooldowns.size
            }
        };
    }
    
    /**
     * Update monitoring thresholds
     */
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        
        this.emit('thresholds:updated', this.thresholds);
        
        return {
            success: true,
            message: 'Monitoring thresholds updated',
            data: this.thresholds
        };
    }
    
    /**
     * Get monitoring dashboard data
     */
    getDashboardData() {
        return {
            success: true,
            data: {
                timestamp: new Date(),
                status: this.isMonitoring ? 'active' : 'inactive',
                systemHealth: this.metrics.systemHealth,
                companies: Object.fromEntries(this.metrics.logVolume),
                alerts: {
                    activeCooldowns: this.alertCooldowns.size,
                    thresholds: this.thresholds
                },
                performance: Object.fromEntries(this.metrics.performanceMetrics)
            }
        };
    }
}

// Create singleton instance
const loggingMonitoringService = new LoggingMonitoringService();

export default loggingMonitoringService;
export { LoggingMonitoringService };