/**
 * Anomaly Detection Service
 * Implements log volume anomaly detection, pattern-based anomaly identification,
 * and automated response mechanisms
 */

import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import platformLogger from '../utils/platformLogger.js';
import alertGenerationService, { ALERT_SEVERITY, ALERT_TYPES } from './alertGeneration.service.js';
import performanceMonitoringService from './performanceMonitoring.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Anomaly types
const ANOMALY_TYPES = {
    LOG_VOLUME_SPIKE: 'log_volume_spike',
    LOG_VOLUME_DROP: 'log_volume_drop',
    ERROR_RATE_SPIKE: 'error_rate_spike',
    UNUSUAL_PATTERN: 'unusual_pattern',
    SECURITY_PATTERN: 'security_pattern',
    PERFORMANCE_ANOMALY: 'performance_anomaly',
    TENANT_BEHAVIOR_ANOMALY: 'tenant_behavior_anomaly',
    SYSTEM_BEHAVIOR_ANOMALY: 'system_behavior_anomaly'
};

// Detection algorithms
const DETECTION_ALGORITHMS = {
    STATISTICAL: 'statistical',
    MOVING_AVERAGE: 'moving_average',
    EXPONENTIAL_SMOOTHING: 'exponential_smoothing',
    PATTERN_MATCHING: 'pattern_matching',
    MACHINE_LEARNING: 'machine_learning'
};

// Response actions
const RESPONSE_ACTIONS = {
    ALERT: 'alert',
    THROTTLE: 'throttle',
    BLOCK: 'block',
    INVESTIGATE: 'investigate',
    ESCALATE: 'escalate',
    AUTO_REMEDIATE: 'auto_remediate'
};

class AnomalyDetectionService extends EventEmitter {
    constructor() {
        super();
        this.baselines = new Map();
        this.anomalies = new Map();
        this.detectionRules = new Map();
        this.logVolumeHistory = new Map();
        this.patternHistory = new Map();
        this.responseHandlers = new Map();
        this.detectionInterval = null;
        this.isRunning = false;
        
        this.initializeDetectionRules();
        this.setupResponseHandlers();
        this.startAnomalyDetection();
    }

    /**
     * Initialize default anomaly detection rules
     */
    initializeDetectionRules() {
        // Log volume spike detection
        this.addDetectionRule({
            id: 'log_volume_spike',
            type: ANOMALY_TYPES.LOG_VOLUME_SPIKE,
            algorithm: DETECTION_ALGORITHMS.STATISTICAL,
            parameters: {
                threshold: 3, // 3 standard deviations
                windowSize: 60, // 60 minutes
                minSamples: 10
            },
            severity: ALERT_SEVERITY.HIGH,
            responses: [RESPONSE_ACTIONS.ALERT, RESPONSE_ACTIONS.INVESTIGATE]
        });

        // Log volume drop detection
        this.addDetectionRule({
            id: 'log_volume_drop',
            type: ANOMALY_TYPES.LOG_VOLUME_DROP,
            algorithm: DETECTION_ALGORITHMS.STATISTICAL,
            parameters: {
                threshold: -2, // 2 standard deviations below mean
                windowSize: 30, // 30 minutes
                minSamples: 5
            },
            severity: ALERT_SEVERITY.MEDIUM,
            responses: [RESPONSE_ACTIONS.ALERT]
        });

        // Error rate spike detection
        this.addDetectionRule({
            id: 'error_rate_spike',
            type: ANOMALY_TYPES.ERROR_RATE_SPIKE,
            algorithm: DETECTION_ALGORITHMS.MOVING_AVERAGE,
            parameters: {
                threshold: 5, // 5x normal rate
                windowSize: 15, // 15 minutes
                baselineWindow: 60 // 1 hour baseline
            },
            severity: ALERT_SEVERITY.CRITICAL,
            responses: [RESPONSE_ACTIONS.ALERT, RESPONSE_ACTIONS.ESCALATE]
        });

        // Security pattern detection
        this.addDetectionRule({
            id: 'security_pattern_anomaly',
            type: ANOMALY_TYPES.SECURITY_PATTERN,
            algorithm: DETECTION_ALGORITHMS.PATTERN_MATCHING,
            parameters: {
                patterns: [
                    'multiple_failed_logins',
                    'privilege_escalation_attempts',
                    'unusual_access_patterns',
                    'data_exfiltration_indicators'
                ],
                threshold: 3, // 3 occurrences in window
                windowSize: 10 // 10 minutes
            },
            severity: ALERT_SEVERITY.CRITICAL,
            responses: [RESPONSE_ACTIONS.ALERT, RESPONSE_ACTIONS.BLOCK, RESPONSE_ACTIONS.ESCALATE]
        });

        // Performance anomaly detection
        this.addDetectionRule({
            id: 'performance_anomaly',
            type: ANOMALY_TYPES.PERFORMANCE_ANOMALY,
            algorithm: DETECTION_ALGORITHMS.EXPONENTIAL_SMOOTHING,
            parameters: {
                alpha: 0.3, // Smoothing factor
                threshold: 2.5, // 2.5x normal response time
                windowSize: 20 // 20 minutes
            },
            severity: ALERT_SEVERITY.HIGH,
            responses: [RESPONSE_ACTIONS.ALERT, RESPONSE_ACTIONS.THROTTLE]
        });

        platformLogger.info('Anomaly detection rules initialized', {
            rulesCount: this.detectionRules.size
        });
    }

    /**
     * Setup automated response handlers
     */
    setupResponseHandlers() {
        this.responseHandlers.set(RESPONSE_ACTIONS.ALERT, this.handleAlertResponse.bind(this));
        this.responseHandlers.set(RESPONSE_ACTIONS.THROTTLE, this.handleThrottleResponse.bind(this));
        this.responseHandlers.set(RESPONSE_ACTIONS.BLOCK, this.handleBlockResponse.bind(this));
        this.responseHandlers.set(RESPONSE_ACTIONS.INVESTIGATE, this.handleInvestigateResponse.bind(this));
        this.responseHandlers.set(RESPONSE_ACTIONS.ESCALATE, this.handleEscalateResponse.bind(this));
        this.responseHandlers.set(RESPONSE_ACTIONS.AUTO_REMEDIATE, this.handleAutoRemediateResponse.bind(this));
    }

    /**
     * Start anomaly detection monitoring
     */
    startAnomalyDetection() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        
        // Run detection every 5 minutes
        this.detectionInterval = setInterval(() => {
            this.runAnomalyDetection();
        }, 5 * 60 * 1000);

        // Initial run
        setTimeout(() => {
            this.runAnomalyDetection();
        }, 30000); // Wait 30 seconds for initial data

        platformLogger.info('Anomaly detection started');
    }

    /**
     * Stop anomaly detection monitoring
     */
    stopAnomalyDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        this.isRunning = false;
        platformLogger.info('Anomaly detection stopped');
    }

    /**
     * Run anomaly detection across all rules
     */
    async runAnomalyDetection() {
        try {
            // Collect current metrics
            await this.collectLogVolumeMetrics();
            await this.collectErrorRateMetrics();
            await this.collectPerformanceMetrics();
            await this.collectSecurityPatterns();

            // Run detection for each rule
            for (const rule of this.detectionRules.values()) {
                await this.runDetectionRule(rule);
            }

            // Clean up old data
            this.cleanupOldData();

        } catch (error) {
            platformLogger.error('Failed to run anomaly detection', {
                error: error.message
            });
        }
    }

    /**
     * Collect log volume metrics from log files
     */
    async collectLogVolumeMetrics() {
        try {
            const logsDir = path.join(__dirname, '../../logs');
            const timestamp = new Date().toISOString();
            
            // Collect company log volumes
            const companyLogsDir = path.join(logsDir, 'companies');
            if (fs.existsSync(companyLogsDir)) {
                const companies = fs.readdirSync(companyLogsDir);
                
                for (const company of companies) {
                    const companyDir = path.join(companyLogsDir, company);
                    if (fs.statSync(companyDir).isDirectory()) {
                        const volume = await this.calculateLogVolume(companyDir);
                        this.recordLogVolume(`company_${company}`, volume, timestamp);
                    }
                }
            }

            // Collect platform log volumes
            const platformLogsDir = path.join(logsDir, 'platform');
            if (fs.existsSync(platformLogsDir)) {
                const volume = await this.calculateLogVolume(platformLogsDir);
                this.recordLogVolume('platform', volume, timestamp);
            }

        } catch (error) {
            platformLogger.error('Failed to collect log volume metrics', {
                error: error.message
            });
        }
    }

    /**
     * Calculate log volume for a directory
     */
    async calculateLogVolume(directory) {
        let totalSize = 0;
        let fileCount = 0;
        let lineCount = 0;

        try {
            const files = fs.readdirSync(directory, { recursive: true });
            
            for (const file of files) {
                const filePath = path.join(directory, file);
                
                try {
                    const stats = fs.statSync(filePath);
                    
                    if (stats.isFile() && file.endsWith('.log')) {
                        totalSize += stats.size;
                        fileCount++;
                        
                        // Count lines in recent log files (today's files)
                        const today = new Date().toISOString().split('T')[0];
                        if (file.includes(today)) {
                            const content = fs.readFileSync(filePath, 'utf8');
                            lineCount += content.split('\n').length;
                        }
                    }
                } catch (fileError) {
                    // Skip files that can't be read
                    continue;
                }
            }
        } catch (error) {
            platformLogger.warn('Error calculating log volume', {
                directory,
                error: error.message
            });
        }

        return {
            totalSize,
            fileCount,
            lineCount,
            sizeMB: (totalSize / 1024 / 1024).toFixed(2)
        };
    }

    /**
     * Record log volume metric
     */
    recordLogVolume(source, volume, timestamp) {
        if (!this.logVolumeHistory.has(source)) {
            this.logVolumeHistory.set(source, []);
        }

        const history = this.logVolumeHistory.get(source);
        history.push({
            timestamp,
            volume,
            lineCount: volume.lineCount,
            sizeBytes: volume.totalSize
        });

        // Keep only last 288 entries (24 hours at 5-minute intervals)
        if (history.length > 288) {
            history.shift();
        }
    }

    /**
     * Collect error rate metrics
     */
    async collectErrorRateMetrics() {
        // This would typically analyze recent log entries for error patterns
        // For now, we'll use a simplified approach
        const timestamp = new Date().toISOString();
        
        // Get error rate from performance monitoring service
        const performanceStatus = performanceMonitoringService.getPerformanceStatus();
        const errorRateMetric = performanceStatus.metrics.error_rate;
        
        if (errorRateMetric) {
            this.recordMetric('error_rate', errorRateMetric.value, timestamp);
        }
    }

    /**
     * Collect performance metrics
     */
    async collectPerformanceMetrics() {
        const timestamp = new Date().toISOString();
        const performanceStatus = performanceMonitoringService.getPerformanceStatus();
        
        // Record key performance metrics for anomaly detection
        const metricsToTrack = ['api_response_time', 'memory_usage', 'cpu_usage'];
        
        for (const metricName of metricsToTrack) {
            const metric = performanceStatus.metrics[metricName];
            if (metric) {
                this.recordMetric(metricName, metric.value, timestamp);
            }
        }
    }

    /**
     * Collect security patterns from recent logs
     */
    async collectSecurityPatterns() {
        // This would analyze recent log entries for security patterns
        // For now, we'll implement a basic pattern counter
        const timestamp = new Date().toISOString();
        
        // Simulate security pattern detection
        const patterns = {
            failed_logins: Math.floor(Math.random() * 5),
            privilege_escalation: Math.floor(Math.random() * 2),
            unusual_access: Math.floor(Math.random() * 3)
        };
        
        for (const [pattern, count] of Object.entries(patterns)) {
            this.recordPattern(pattern, count, timestamp);
        }
    }

    /**
     * Record a metric for anomaly detection
     */
    recordMetric(metricName, value, timestamp) {
        if (!this.patternHistory.has(metricName)) {
            this.patternHistory.set(metricName, []);
        }

        const history = this.patternHistory.get(metricName);
        history.push({ timestamp, value });

        // Keep only last 288 entries (24 hours at 5-minute intervals)
        if (history.length > 288) {
            history.shift();
        }
    }

    /**
     * Record a pattern occurrence
     */
    recordPattern(patternName, count, timestamp) {
        if (!this.patternHistory.has(patternName)) {
            this.patternHistory.set(patternName, []);
        }

        const history = this.patternHistory.get(patternName);
        history.push({ timestamp, count });

        // Keep only last 144 entries (12 hours at 5-minute intervals)
        if (history.length > 144) {
            history.shift();
        }
    }

    /**
     * Run detection for a specific rule
     */
    async runDetectionRule(rule) {
        try {
            let anomaly = null;

            switch (rule.algorithm) {
                case DETECTION_ALGORITHMS.STATISTICAL:
                    anomaly = this.detectStatisticalAnomaly(rule);
                    break;
                    
                case DETECTION_ALGORITHMS.MOVING_AVERAGE:
                    anomaly = this.detectMovingAverageAnomaly(rule);
                    break;
                    
                case DETECTION_ALGORITHMS.EXPONENTIAL_SMOOTHING:
                    anomaly = this.detectExponentialSmoothingAnomaly(rule);
                    break;
                    
                case DETECTION_ALGORITHMS.PATTERN_MATCHING:
                    anomaly = this.detectPatternAnomaly(rule);
                    break;
                    
                default:
                    platformLogger.warn('Unknown detection algorithm', {
                        ruleId: rule.id,
                        algorithm: rule.algorithm
                    });
            }

            if (anomaly) {
                await this.handleAnomaly(anomaly, rule);
            }

        } catch (error) {
            platformLogger.error('Failed to run detection rule', {
                ruleId: rule.id,
                error: error.message
            });
        }
    }

    /**
     * Detect statistical anomalies using z-score
     */
    detectStatisticalAnomaly(rule) {
        const dataKey = this.getDataKeyForRule(rule);
        const history = this.getHistoryForRule(rule, dataKey);
        
        if (!history || history.length < rule.parameters.minSamples) {
            return null;
        }

        const values = history.map(h => this.getValueFromHistory(h, rule));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        const currentValue = values[values.length - 1];
        const zScore = (currentValue - mean) / stdDev;
        
        if (Math.abs(zScore) >= Math.abs(rule.parameters.threshold)) {
            return {
                type: rule.type,
                severity: rule.severity,
                value: currentValue,
                baseline: mean,
                zScore,
                threshold: rule.parameters.threshold,
                dataKey,
                timestamp: new Date().toISOString()
            };
        }
        
        return null;
    }

    /**
     * Detect anomalies using moving average
     */
    detectMovingAverageAnomaly(rule) {
        const dataKey = this.getDataKeyForRule(rule);
        const history = this.getHistoryForRule(rule, dataKey);
        
        if (!history || history.length < rule.parameters.baselineWindow) {
            return null;
        }

        const baselineValues = history.slice(0, -rule.parameters.windowSize)
            .map(h => this.getValueFromHistory(h, rule));
        const recentValues = history.slice(-rule.parameters.windowSize)
            .map(h => this.getValueFromHistory(h, rule));
        
        const baselineAvg = baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length;
        const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
        
        const ratio = recentAvg / baselineAvg;
        
        if (ratio >= rule.parameters.threshold) {
            return {
                type: rule.type,
                severity: rule.severity,
                recentAverage: recentAvg,
                baselineAverage: baselineAvg,
                ratio,
                threshold: rule.parameters.threshold,
                dataKey,
                timestamp: new Date().toISOString()
            };
        }
        
        return null;
    }

    /**
     * Detect anomalies using exponential smoothing
     */
    detectExponentialSmoothingAnomaly(rule) {
        const dataKey = this.getDataKeyForRule(rule);
        const history = this.getHistoryForRule(rule, dataKey);
        
        if (!history || history.length < 10) {
            return null;
        }

        const values = history.map(h => this.getValueFromHistory(h, rule));
        const alpha = rule.parameters.alpha || 0.3;
        
        // Calculate exponentially smoothed values
        let smoothed = values[0];
        const smoothedValues = [smoothed];
        
        for (let i = 1; i < values.length; i++) {
            smoothed = alpha * values[i] + (1 - alpha) * smoothed;
            smoothedValues.push(smoothed);
        }
        
        const currentValue = values[values.length - 1];
        const expectedValue = smoothedValues[smoothedValues.length - 2];
        const ratio = currentValue / expectedValue;
        
        if (ratio >= rule.parameters.threshold) {
            return {
                type: rule.type,
                severity: rule.severity,
                currentValue,
                expectedValue,
                ratio,
                threshold: rule.parameters.threshold,
                dataKey,
                timestamp: new Date().toISOString()
            };
        }
        
        return null;
    }

    /**
     * Detect pattern-based anomalies
     */
    detectPatternAnomaly(rule) {
        const patterns = rule.parameters.patterns || [];
        const windowMinutes = rule.parameters.windowSize || 10;
        const threshold = rule.parameters.threshold || 3;
        
        const cutoffTime = Date.now() - (windowMinutes * 60 * 1000);
        
        for (const pattern of patterns) {
            const history = this.patternHistory.get(pattern);
            if (!history) continue;
            
            // Count occurrences in the time window
            const recentOccurrences = history.filter(h => 
                new Date(h.timestamp).getTime() > cutoffTime
            );
            
            const totalCount = recentOccurrences.reduce((sum, h) => sum + (h.count || 1), 0);
            
            if (totalCount >= threshold) {
                return {
                    type: rule.type,
                    severity: rule.severity,
                    pattern,
                    occurrences: totalCount,
                    threshold,
                    windowMinutes,
                    timestamp: new Date().toISOString()
                };
            }
        }
        
        return null;
    }

    /**
     * Get data key for a rule based on its type
     */
    getDataKeyForRule(rule) {
        switch (rule.type) {
            case ANOMALY_TYPES.LOG_VOLUME_SPIKE:
            case ANOMALY_TYPES.LOG_VOLUME_DROP:
                return 'platform'; // or could be company-specific
            case ANOMALY_TYPES.ERROR_RATE_SPIKE:
                return 'error_rate';
            case ANOMALY_TYPES.PERFORMANCE_ANOMALY:
                return 'api_response_time';
            default:
                return 'platform';
        }
    }

    /**
     * Get history data for a rule
     */
    getHistoryForRule(rule, dataKey) {
        switch (rule.type) {
            case ANOMALY_TYPES.LOG_VOLUME_SPIKE:
            case ANOMALY_TYPES.LOG_VOLUME_DROP:
                return this.logVolumeHistory.get(dataKey);
            default:
                return this.patternHistory.get(dataKey);
        }
    }

    /**
     * Extract value from history entry based on rule type
     */
    getValueFromHistory(historyEntry, rule) {
        switch (rule.type) {
            case ANOMALY_TYPES.LOG_VOLUME_SPIKE:
            case ANOMALY_TYPES.LOG_VOLUME_DROP:
                return historyEntry.lineCount || 0;
            default:
                return historyEntry.value || 0;
        }
    }

    /**
     * Handle detected anomaly
     */
    async handleAnomaly(anomaly, rule) {
        try {
            // Store anomaly
            const anomalyId = `${rule.id}_${Date.now()}`;
            this.anomalies.set(anomalyId, {
                id: anomalyId,
                ...anomaly,
                ruleId: rule.id,
                responses: rule.responses || []
            });

            platformLogger.warn('Anomaly detected', {
                anomalyId,
                ruleId: rule.id,
                anomaly
            });

            // Execute response actions
            for (const responseAction of rule.responses || []) {
                const handler = this.responseHandlers.get(responseAction);
                if (handler) {
                    await handler(anomaly, rule);
                } else {
                    platformLogger.warn('Unknown response action', {
                        responseAction,
                        anomalyId
                    });
                }
            }

            // Emit anomaly event
            this.emit('anomalyDetected', {
                anomalyId,
                anomaly,
                rule
            });

        } catch (error) {
            platformLogger.error('Failed to handle anomaly', {
                anomaly,
                ruleId: rule.id,
                error: error.message
            });
        }
    }

    /**
     * Handle alert response
     */
    async handleAlertResponse(anomaly, rule) {
        await alertGenerationService.generateAlert({
            severity: anomaly.severity,
            type: ALERT_TYPES.SYSTEM_ERROR, // Map to appropriate alert type
            title: `Anomaly Detected: ${anomaly.type}`,
            message: this.generateAnomalyMessage(anomaly),
            source: 'anomaly_detection',
            metadata: {
                anomaly,
                ruleId: rule.id,
                detectionAlgorithm: rule.algorithm
            }
        });
    }

    /**
     * Handle throttle response
     */
    async handleThrottleResponse(anomaly, rule) {
        platformLogger.info('Throttling activated due to anomaly', {
            anomaly,
            ruleId: rule.id
        });
        
        // Emit throttle event for other services
        this.emit('throttleActivated', {
            anomaly,
            rule,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle block response
     */
    async handleBlockResponse(anomaly, rule) {
        platformLogger.warn('Blocking activated due to anomaly', {
            anomaly,
            ruleId: rule.id
        });
        
        // Emit block event for other services
        this.emit('blockActivated', {
            anomaly,
            rule,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle investigate response
     */
    async handleInvestigateResponse(anomaly, rule) {
        platformLogger.info('Investigation triggered for anomaly', {
            anomaly,
            ruleId: rule.id
        });
        
        // Could trigger automated investigation processes
        this.emit('investigationTriggered', {
            anomaly,
            rule,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle escalate response
     */
    async handleEscalateResponse(anomaly, rule) {
        await alertGenerationService.generateAlert({
            severity: ALERT_SEVERITY.CRITICAL,
            type: ALERT_TYPES.SECURITY_BREACH,
            title: `[ESCALATED] Critical Anomaly: ${anomaly.type}`,
            message: `Critical anomaly requiring immediate attention: ${this.generateAnomalyMessage(anomaly)}`,
            source: 'anomaly_detection_escalation',
            metadata: {
                anomaly,
                ruleId: rule.id,
                escalated: true
            }
        });
    }

    /**
     * Handle auto-remediate response
     */
    async handleAutoRemediateResponse(anomaly, rule) {
        platformLogger.info('Auto-remediation triggered for anomaly', {
            anomaly,
            ruleId: rule.id
        });
        
        // Implement auto-remediation logic based on anomaly type
        // This could include restarting services, clearing caches, etc.
        this.emit('autoRemediationTriggered', {
            anomaly,
            rule,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate human-readable anomaly message
     */
    generateAnomalyMessage(anomaly) {
        switch (anomaly.type) {
            case ANOMALY_TYPES.LOG_VOLUME_SPIKE:
                return `Log volume spike detected: ${anomaly.value} (baseline: ${anomaly.baseline})`;
            case ANOMALY_TYPES.LOG_VOLUME_DROP:
                return `Log volume drop detected: ${anomaly.value} (baseline: ${anomaly.baseline})`;
            case ANOMALY_TYPES.ERROR_RATE_SPIKE:
                return `Error rate spike: ${anomaly.recentAverage} (${anomaly.ratio}x normal)`;
            case ANOMALY_TYPES.PERFORMANCE_ANOMALY:
                return `Performance anomaly: ${anomaly.currentValue} (expected: ${anomaly.expectedValue})`;
            case ANOMALY_TYPES.SECURITY_PATTERN:
                return `Security pattern anomaly: ${anomaly.pattern} (${anomaly.occurrences} occurrences)`;
            default:
                return `Anomaly detected: ${anomaly.type}`;
        }
    }

    /**
     * Add a new detection rule
     */
    addDetectionRule(rule) {
        if (!rule.id || !rule.type || !rule.algorithm) {
            throw new Error('Detection rule must have id, type, and algorithm');
        }
        
        this.detectionRules.set(rule.id, rule);
        platformLogger.info('Anomaly detection rule added', { ruleId: rule.id });
    }

    /**
     * Remove a detection rule
     */
    removeDetectionRule(ruleId) {
        const removed = this.detectionRules.delete(ruleId);
        if (removed) {
            platformLogger.info('Anomaly detection rule removed', { ruleId });
        }
        return removed;
    }

    /**
     * Clean up old data
     */
    cleanupOldData() {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        
        // Clean up anomaly history
        for (const [anomalyId, anomaly] of this.anomalies.entries()) {
            if (new Date(anomaly.timestamp).getTime() < cutoffTime) {
                this.anomalies.delete(anomalyId);
            }
        }
    }

    /**
     * Get anomaly detection status
     */
    getDetectionStatus() {
        return {
            isRunning: this.isRunning,
            rulesCount: this.detectionRules.size,
            activeAnomalies: this.anomalies.size,
            dataSourcesCount: this.logVolumeHistory.size + this.patternHistory.size
        };
    }

    /**
     * Get recent anomalies
     */
    getRecentAnomalies(limit = 50) {
        const anomalies = Array.from(this.anomalies.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
        
        return anomalies;
    }

    /**
     * Graceful shutdown
     */
    shutdown() {
        this.stopAnomalyDetection();
        this.removeAllListeners();
        
        platformLogger.info('Anomaly detection service shutdown');
    }
}

// Create singleton instance
const anomalyDetectionService = new AnomalyDetectionService();

export {
    ANOMALY_TYPES,
    DETECTION_ALGORITHMS,
    RESPONSE_ACTIONS,
    AnomalyDetectionService
};

export default anomalyDetectionService;