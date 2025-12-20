/**
 * Monitoring Integration Service
 * Integrates alert generation, performance monitoring, and anomaly detection
 * Provides unified monitoring and alerting capabilities
 */

import EventEmitter from 'events';
import platformLogger from '../utils/platformLogger.js';
import alertGenerationService, { ALERT_SEVERITY, ALERT_TYPES } from './alertGeneration.service.js';
import performanceMonitoringService, { PERFORMANCE_METRICS, HEALTH_STATES } from './performanceMonitoring.service.js';
import anomalyDetectionService, { ANOMALY_TYPES, RESPONSE_ACTIONS } from './anomalyDetection.service.js';

class MonitoringIntegrationService extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.monitoringState = {
            systemHealth: HEALTH_STATES.HEALTHY,
            alertsActive: 0,
            anomaliesDetected: 0,
            backpressureActive: false,
            lastHealthCheck: null
        };
        
        this.initialize();
    }

    /**
     * Initialize the monitoring integration
     */
    initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Set up event listeners for cross-service integration
            this.setupPerformanceMonitoringIntegration();
            this.setupAnomalyDetectionIntegration();
            this.setupAlertGenerationIntegration();
            
            // Start integrated monitoring
            this.startIntegratedMonitoring();
            
            this.isInitialized = true;
            
            platformLogger.info('Monitoring integration service initialized', {
                services: ['alertGeneration', 'performanceMonitoring', 'anomalyDetection']
            });

        } catch (error) {
            platformLogger.error('Failed to initialize monitoring integration', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Setup performance monitoring integration
     */
    setupPerformanceMonitoringIntegration() {
        // Listen for performance metric recordings
        performanceMonitoringService.on('metricRecorded', (metric) => {
            this.handlePerformanceMetric(metric);
        });

        // Listen for health state changes
        performanceMonitoringService.on('healthStateChanged', (healthChange) => {
            this.handleHealthStateChange(healthChange);
        });

        // Listen for backpressure events
        performanceMonitoringService.on('backpressureActivated', (backpressureEvent) => {
            this.handleBackpressureActivated(backpressureEvent);
        });

        performanceMonitoringService.on('backpressureDeactivated', (backpressureEvent) => {
            this.handleBackpressureDeactivated(backpressureEvent);
        });
    }

    /**
     * Setup anomaly detection integration
     */
    setupAnomalyDetectionIntegration() {
        // Listen for anomaly detections
        anomalyDetectionService.on('anomalyDetected', (anomalyEvent) => {
            this.handleAnomalyDetected(anomalyEvent);
        });

        // Listen for automated responses
        anomalyDetectionService.on('throttleActivated', (throttleEvent) => {
            this.handleThrottleActivated(throttleEvent);
        });

        anomalyDetectionService.on('blockActivated', (blockEvent) => {
            this.handleBlockActivated(blockEvent);
        });

        anomalyDetectionService.on('investigationTriggered', (investigationEvent) => {
            this.handleInvestigationTriggered(investigationEvent);
        });

        anomalyDetectionService.on('autoRemediationTriggered', (remediationEvent) => {
            this.handleAutoRemediationTriggered(remediationEvent);
        });
    }

    /**
     * Setup alert generation integration
     */
    setupAlertGenerationIntegration() {
        // Listen for alert generation
        alertGenerationService.on('alertGenerated', (alert) => {
            this.handleAlertGenerated(alert);
        });
    }

    /**
     * Start integrated monitoring processes
     */
    startIntegratedMonitoring() {
        // Run health checks every 2 minutes
        setInterval(() => {
            this.performIntegratedHealthCheck();
        }, 2 * 60 * 1000);

        // Initial health check
        setTimeout(() => {
            this.performIntegratedHealthCheck();
        }, 10000); // Wait 10 seconds for services to initialize

        platformLogger.info('Integrated monitoring started');
    }

    /**
     * Handle performance metric recordings
     */
    handlePerformanceMetric(metric) {
        // Update monitoring state
        this.monitoringState.lastHealthCheck = new Date().toISOString();

        // Check for critical performance issues that need immediate attention
        if (metric.type === PERFORMANCE_METRICS.MEMORY_USAGE && metric.value > 0.95) {
            this.triggerEmergencyResponse('critical_memory_usage', {
                metric,
                message: 'Critical memory usage detected - system may become unstable'
            });
        }

        if (metric.type === PERFORMANCE_METRICS.CPU_USAGE && metric.value > 0.98) {
            this.triggerEmergencyResponse('critical_cpu_usage', {
                metric,
                message: 'Critical CPU usage detected - system performance severely degraded'
            });
        }

        // Emit integrated metric event
        this.emit('performanceMetricProcessed', {
            metric,
            monitoringState: this.monitoringState
        });
    }

    /**
     * Handle health state changes
     */
    handleHealthStateChange(healthChange) {
        const previousHealth = this.monitoringState.systemHealth;
        this.monitoringState.systemHealth = healthChange.current;

        platformLogger.systemHealth('integrated_monitoring', healthChange.current, {
            previousHealth,
            criticalCount: healthChange.criticalCount,
            warningCount: healthChange.warningCount,
            changeTimestamp: new Date().toISOString()
        });

        // Generate alerts for significant health degradation
        if (healthChange.current === HEALTH_STATES.CRITICAL && previousHealth !== HEALTH_STATES.CRITICAL) {
            alertGenerationService.generateAlert({
                severity: ALERT_SEVERITY.CRITICAL,
                type: ALERT_TYPES.SYSTEM_ERROR,
                title: 'System Health Critical',
                message: `System health has degraded to critical state. ${healthChange.criticalCount} critical issues detected.`,
                source: 'monitoring_integration',
                metadata: {
                    healthChange,
                    previousHealth,
                    systemState: this.monitoringState
                }
            });
        }

        this.emit('systemHealthChanged', {
            healthChange,
            monitoringState: this.monitoringState
        });
    }

    /**
     * Handle backpressure activation
     */
    handleBackpressureActivated(backpressureEvent) {
        this.monitoringState.backpressureActive = true;

        platformLogger.warn('Integrated monitoring: Backpressure activated', {
            reason: backpressureEvent.reason,
            context: backpressureEvent.context
        });

        // Coordinate with anomaly detection to adjust thresholds
        this.adjustAnomalyThresholdsForBackpressure(true);

        this.emit('backpressureStateChanged', {
            active: true,
            event: backpressureEvent,
            monitoringState: this.monitoringState
        });
    }

    /**
     * Handle backpressure deactivation
     */
    handleBackpressureDeactivated(backpressureEvent) {
        this.monitoringState.backpressureActive = false;

        platformLogger.info('Integrated monitoring: Backpressure deactivated', {
            timestamp: backpressureEvent.timestamp
        });

        // Restore normal anomaly detection thresholds
        this.adjustAnomalyThresholdsForBackpressure(false);

        this.emit('backpressureStateChanged', {
            active: false,
            event: backpressureEvent,
            monitoringState: this.monitoringState
        });
    }

    /**
     * Handle anomaly detection
     */
    handleAnomalyDetected(anomalyEvent) {
        this.monitoringState.anomaliesDetected++;

        platformLogger.warn('Integrated monitoring: Anomaly detected', {
            anomalyId: anomalyEvent.anomalyId,
            type: anomalyEvent.anomaly.type,
            severity: anomalyEvent.anomaly.severity
        });

        // Correlate with performance metrics for enhanced context
        const performanceContext = this.getPerformanceContextForAnomaly(anomalyEvent.anomaly);

        // Generate enhanced alert with correlation data
        alertGenerationService.generateAlert({
            severity: anomalyEvent.anomaly.severity,
            type: this.mapAnomalyTypeToAlertType(anomalyEvent.anomaly.type),
            title: `Anomaly Detected: ${anomalyEvent.anomaly.type}`,
            message: this.generateEnhancedAnomalyMessage(anomalyEvent.anomaly, performanceContext),
            source: 'monitoring_integration',
            correlationId: anomalyEvent.anomalyId,
            metadata: {
                anomaly: anomalyEvent.anomaly,
                rule: anomalyEvent.rule,
                performanceContext,
                monitoringState: this.monitoringState
            }
        });

        this.emit('anomalyProcessed', {
            anomalyEvent,
            performanceContext,
            monitoringState: this.monitoringState
        });
    }

    /**
     * Handle throttle activation
     */
    handleThrottleActivated(throttleEvent) {
        platformLogger.info('Integrated monitoring: Throttling activated', {
            anomaly: throttleEvent.anomaly.type,
            rule: throttleEvent.rule.id
        });

        // Coordinate throttling across services
        this.emit('throttleCoordination', {
            throttleEvent,
            recommendedActions: this.getThrottleRecommendations(throttleEvent)
        });
    }

    /**
     * Handle block activation
     */
    handleBlockActivated(blockEvent) {
        platformLogger.warn('Integrated monitoring: Blocking activated', {
            anomaly: blockEvent.anomaly.type,
            rule: blockEvent.rule.id
        });

        // Generate high-priority alert for blocking actions
        alertGenerationService.generateAlert({
            severity: ALERT_SEVERITY.HIGH,
            type: ALERT_TYPES.SECURITY_BREACH,
            title: 'Automated Blocking Activated',
            message: `System has automatically blocked activity due to detected anomaly: ${blockEvent.anomaly.type}`,
            source: 'monitoring_integration',
            metadata: {
                blockEvent,
                monitoringState: this.monitoringState
            }
        });

        this.emit('blockCoordination', {
            blockEvent,
            recommendedActions: this.getBlockRecommendations(blockEvent)
        });
    }

    /**
     * Handle investigation triggers
     */
    handleInvestigationTriggered(investigationEvent) {
        platformLogger.info('Integrated monitoring: Investigation triggered', {
            anomaly: investigationEvent.anomaly.type,
            rule: investigationEvent.rule.id
        });

        // Gather comprehensive investigation data
        const investigationData = this.gatherInvestigationData(investigationEvent);

        this.emit('investigationStarted', {
            investigationEvent,
            investigationData,
            monitoringState: this.monitoringState
        });
    }

    /**
     * Handle auto-remediation triggers
     */
    handleAutoRemediationTriggered(remediationEvent) {
        platformLogger.info('Integrated monitoring: Auto-remediation triggered', {
            anomaly: remediationEvent.anomaly.type,
            rule: remediationEvent.rule.id
        });

        // Execute coordinated remediation actions
        this.executeRemediationActions(remediationEvent);

        this.emit('remediationExecuted', {
            remediationEvent,
            monitoringState: this.monitoringState
        });
    }

    /**
     * Handle alert generation
     */
    handleAlertGenerated(alert) {
        this.monitoringState.alertsActive++;

        // Log alert generation for monitoring
        platformLogger.info('Integrated monitoring: Alert generated', {
            alertId: alert.id,
            severity: alert.severity,
            type: alert.type
        });

        this.emit('alertProcessed', {
            alert,
            monitoringState: this.monitoringState
        });
    }

    /**
     * Trigger emergency response for critical situations
     */
    async triggerEmergencyResponse(emergencyType, context) {
        platformLogger.error('Emergency response triggered', {
            emergencyType,
            context,
            timestamp: new Date().toISOString()
        });

        // Generate critical alert
        await alertGenerationService.generateAlert({
            severity: ALERT_SEVERITY.CRITICAL,
            type: ALERT_TYPES.SYSTEM_ERROR,
            title: `EMERGENCY: ${emergencyType}`,
            message: context.message || `Emergency condition detected: ${emergencyType}`,
            source: 'monitoring_integration_emergency',
            metadata: {
                emergencyType,
                context,
                monitoringState: this.monitoringState
            }
        });

        // Activate emergency backpressure if not already active
        if (!this.monitoringState.backpressureActive) {
            performanceMonitoringService.activateBackpressure(emergencyType, context);
        }

        this.emit('emergencyResponse', {
            emergencyType,
            context,
            monitoringState: this.monitoringState
        });
    }

    /**
     * Perform integrated health check
     */
    async performIntegratedHealthCheck() {
        try {
            const healthCheckData = {
                timestamp: new Date().toISOString(),
                performanceStatus: performanceMonitoringService.getPerformanceStatus(),
                anomalyStatus: anomalyDetectionService.getDetectionStatus(),
                alertStats: alertGenerationService.getAlertStats(),
                monitoringState: this.monitoringState
            };

            // Update monitoring state
            this.monitoringState.lastHealthCheck = healthCheckData.timestamp;

            // Log comprehensive health status
            platformLogger.systemHealth('integrated_monitoring', this.monitoringState.systemHealth, {
                healthCheckData,
                servicesHealthy: this.areAllServicesHealthy(healthCheckData)
            });

            this.emit('healthCheckCompleted', healthCheckData);

            return healthCheckData;

        } catch (error) {
            platformLogger.error('Integrated health check failed', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Check if all monitoring services are healthy
     */
    areAllServicesHealthy(healthCheckData) {
        return (
            healthCheckData.performanceStatus.healthState === HEALTH_STATES.HEALTHY &&
            healthCheckData.anomalyStatus.isRunning &&
            healthCheckData.alertStats.queueLength < 100 // Reasonable queue size
        );
    }

    /**
     * Adjust anomaly detection thresholds during backpressure
     */
    adjustAnomalyThresholdsForBackpressure(backpressureActive) {
        // During backpressure, we might want to be less sensitive to certain anomalies
        // to avoid alert storms while the system is already under stress
        
        if (backpressureActive) {
            platformLogger.info('Adjusting anomaly thresholds for backpressure mode');
            // Implementation would adjust thresholds in anomaly detection service
        } else {
            platformLogger.info('Restoring normal anomaly thresholds');
            // Implementation would restore normal thresholds
        }
    }

    /**
     * Get performance context for an anomaly
     */
    getPerformanceContextForAnomaly(anomaly) {
        const performanceStatus = performanceMonitoringService.getPerformanceStatus();
        
        return {
            systemHealth: performanceStatus.healthState,
            backpressureActive: performanceStatus.backpressureActive,
            memoryUsage: performanceStatus.metrics.memory_usage?.value,
            cpuUsage: performanceStatus.metrics.cpu_usage?.value,
            correlationTimestamp: new Date().toISOString()
        };
    }

    /**
     * Map anomaly types to alert types
     */
    mapAnomalyTypeToAlertType(anomalyType) {
        const mapping = {
            [ANOMALY_TYPES.LOG_VOLUME_SPIKE]: ALERT_TYPES.SYSTEM_ERROR,
            [ANOMALY_TYPES.LOG_VOLUME_DROP]: ALERT_TYPES.SYSTEM_ERROR,
            [ANOMALY_TYPES.ERROR_RATE_SPIKE]: ALERT_TYPES.SYSTEM_ERROR,
            [ANOMALY_TYPES.SECURITY_PATTERN]: ALERT_TYPES.SECURITY_BREACH,
            [ANOMALY_TYPES.PERFORMANCE_ANOMALY]: ALERT_TYPES.PERFORMANCE_DEGRADATION,
            [ANOMALY_TYPES.TENANT_BEHAVIOR_ANOMALY]: ALERT_TYPES.COMPLIANCE_VIOLATION,
            [ANOMALY_TYPES.SYSTEM_BEHAVIOR_ANOMALY]: ALERT_TYPES.SYSTEM_ERROR
        };
        
        return mapping[anomalyType] || ALERT_TYPES.SYSTEM_ERROR;
    }

    /**
     * Generate enhanced anomaly message with performance context
     */
    generateEnhancedAnomalyMessage(anomaly, performanceContext) {
        let message = `Anomaly detected: ${anomaly.type}`;
        
        if (performanceContext.systemHealth !== HEALTH_STATES.HEALTHY) {
            message += ` (System health: ${performanceContext.systemHealth})`;
        }
        
        if (performanceContext.backpressureActive) {
            message += ' (Backpressure active)';
        }
        
        if (performanceContext.memoryUsage > 0.8) {
            message += ` (High memory usage: ${(performanceContext.memoryUsage * 100).toFixed(1)}%)`;
        }
        
        return message;
    }

    /**
     * Get throttle recommendations
     */
    getThrottleRecommendations(throttleEvent) {
        return {
            reduceLogLevel: true,
            limitConcurrentRequests: true,
            increaseResponseTimeouts: true,
            pauseNonCriticalOperations: true
        };
    }

    /**
     * Get block recommendations
     */
    getBlockRecommendations(blockEvent) {
        return {
            blockSuspiciousIPs: true,
            temporaryServiceDisable: blockEvent.anomaly.severity === ALERT_SEVERITY.CRITICAL,
            increaseSecurityLogging: true,
            notifySecurityTeam: true
        };
    }

    /**
     * Gather investigation data
     */
    gatherInvestigationData(investigationEvent) {
        return {
            performanceMetrics: performanceMonitoringService.getPerformanceStatus(),
            recentAnomalies: anomalyDetectionService.getRecentAnomalies(10),
            recentAlerts: alertGenerationService.getAlertStats(),
            systemLogs: 'Would gather relevant system logs',
            networkActivity: 'Would gather network activity data',
            userActivity: 'Would gather user activity patterns'
        };
    }

    /**
     * Execute remediation actions
     */
    async executeRemediationActions(remediationEvent) {
        const actions = [];
        
        switch (remediationEvent.anomaly.type) {
            case ANOMALY_TYPES.PERFORMANCE_ANOMALY:
                actions.push('restart_slow_services');
                actions.push('clear_caches');
                break;
                
            case ANOMALY_TYPES.LOG_VOLUME_SPIKE:
                actions.push('increase_log_rotation_frequency');
                actions.push('compress_old_logs');
                break;
                
            case ANOMALY_TYPES.SECURITY_PATTERN:
                actions.push('block_suspicious_ips');
                actions.push('increase_security_monitoring');
                break;
        }
        
        platformLogger.info('Executing remediation actions', {
            anomaly: remediationEvent.anomaly.type,
            actions
        });
        
        // Implementation would execute actual remediation actions
        return actions;
    }

    /**
     * Get comprehensive monitoring status
     */
    getMonitoringStatus() {
        return {
            isInitialized: this.isInitialized,
            monitoringState: this.monitoringState,
            performanceStatus: performanceMonitoringService.getPerformanceStatus(),
            anomalyStatus: anomalyDetectionService.getDetectionStatus(),
            alertStats: alertGenerationService.getAlertStats(),
            lastHealthCheck: this.monitoringState.lastHealthCheck
        };
    }

    /**
     * Graceful shutdown
     */
    shutdown() {
        this.removeAllListeners();
        
        platformLogger.info('Monitoring integration service shutdown');
    }
}

// Create singleton instance
const monitoringIntegrationService = new MonitoringIntegrationService();

export default monitoringIntegrationService;