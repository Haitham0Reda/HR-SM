/**
 * Log Analytics and Export Service
 * Provides APIs for log data export and integration with monitoring tools
 * Requirements: 6.5, 2.5
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { searchLogs } from './logSearch.service.js';
import { getCorrelatedLogs, getTenantJourneySummaries, detectJourneyAnomalies } from './logCorrelation.service.js';
import { getCompanyStorageStats, getPlatformStorageStats } from './logStorage.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Export formats
const EXPORT_FORMATS = {
    JSON: 'json',
    CSV: 'csv',
    XML: 'xml',
    NDJSON: 'ndjson' // Newline Delimited JSON
};

// Analytics time periods
const TIME_PERIODS = {
    HOUR: 'hour',
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
    QUARTER: 'quarter',
    YEAR: 'year'
};

/**
 * Analytics Query Builder
 */
class AnalyticsQuery {
    constructor(options = {}) {
        this.tenantId = options.tenantId;
        this.startTime = options.startTime ? new Date(options.startTime) : null;
        this.endTime = options.endTime ? new Date(options.endTime) : null;
        this.groupBy = options.groupBy || TIME_PERIODS.DAY;
        this.metrics = options.metrics || ['count', 'errors', 'performance'];
        this.filters = options.filters || {};
        this.includeDetails = options.includeDetails || false;
    }
}

/**
 * Export Configuration
 */
class ExportConfig {
    constructor(options = {}) {
        this.format = options.format || EXPORT_FORMATS.JSON;
        this.compression = options.compression || false;
        this.includeMetadata = options.includeMetadata !== false;
        this.batchSize = options.batchSize || 1000;
        this.maxRecords = options.maxRecords || 100000;
        this.fields = options.fields || null; // null means all fields
        this.destination = options.destination || 'file'; // 'file', 'stream', 'webhook'
        this.webhookUrl = options.webhookUrl;
        this.filename = options.filename;
    }
}

/**
 * Log Analytics Engine
 */
class LogAnalyticsEngine {
    constructor() {
        this.exportDir = path.join(__dirname, '../../exports');
        this.ensureExportDirectory();
    }

    /**
     * Ensure export directory exists
     */
    async ensureExportDirectory() {
        try {
            if (!fs.existsSync(this.exportDir)) {
                await mkdir(this.exportDir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to create export directory:', error);
        }
    }

    /**
     * Generate analytics report
     */
    async generateAnalytics(queryOptions) {
        const query = new AnalyticsQuery(queryOptions);
        const startTime = Date.now();
        
        try {
            // Get base log data
            const searchResults = await searchLogs({
                tenantId: query.tenantId,
                startTime: query.startTime,
                endTime: query.endTime,
                limit: 10000 // Large limit for analytics (within validation bounds)
            });
            
            // Generate analytics
            const analytics = {
                query: {
                    tenantId: query.tenantId,
                    startTime: query.startTime,
                    endTime: query.endTime,
                    groupBy: query.groupBy,
                    metrics: query.metrics
                },
                summary: this.generateSummary(searchResults.entries),
                timeSeries: this.generateTimeSeries(searchResults.entries, query.groupBy),
                metrics: {},
                trends: {},
                anomalies: [],
                generatedAt: new Date().toISOString(),
                processingTime: 0
            };
            
            // Generate specific metrics
            for (const metric of query.metrics) {
                analytics.metrics[metric] = await this.generateMetric(metric, searchResults.entries, query);
            }
            
            // Generate trends
            analytics.trends = this.generateTrends(analytics.timeSeries, query.groupBy);
            
            // Detect anomalies if tenant-specific
            if (query.tenantId) {
                analytics.anomalies = detectJourneyAnomalies(query.tenantId);
            }
            
            // Add user journey analytics if requested
            if (query.includeDetails && query.tenantId) {
                analytics.userJourneys = getTenantJourneySummaries(query.tenantId, 100);
            }
            
            analytics.processingTime = Date.now() - startTime;
            
            return analytics;
            
        } catch (error) {
            console.error('Analytics generation failed:', error);
            throw new Error(`Analytics generation failed: ${error.message}`);
        }
    }

    /**
     * Generate summary statistics
     */
    generateSummary(logEntries) {
        const summary = {
            totalLogs: logEntries.length,
            logLevels: {},
            logTypes: {},
            sources: {},
            uniqueUsers: new Set(),
            uniqueSessions: new Set(),
            timeRange: {
                start: null,
                end: null
            },
            errorRate: 0,
            securityEvents: 0,
            performanceIssues: 0
        };
        
        for (const entry of logEntries) {
            // Count log levels
            summary.logLevels[entry.level] = (summary.logLevels[entry.level] || 0) + 1;
            
            // Count log types
            const logType = entry.logType || 'application';
            summary.logTypes[logType] = (summary.logTypes[logType] || 0) + 1;
            
            // Count sources
            summary.sources[entry.source] = (summary.sources[entry.source] || 0) + 1;
            
            // Track unique users and sessions
            if (entry.userId) summary.uniqueUsers.add(entry.userId);
            if (entry.sessionId) summary.uniqueSessions.add(entry.sessionId);
            
            // Update time range
            const entryTime = new Date(entry.timestamp);
            if (!summary.timeRange.start || entryTime < summary.timeRange.start) {
                summary.timeRange.start = entryTime;
            }
            if (!summary.timeRange.end || entryTime > summary.timeRange.end) {
                summary.timeRange.end = entryTime;
            }
            
            // Count security events
            if (entry.security) {
                summary.securityEvents++;
            }
            
            // Count performance issues
            if (entry.performance && entry.meta && entry.meta.analysis && entry.meta.analysis.alerts) {
                summary.performanceIssues += entry.meta.analysis.alerts.length;
            }
        }
        
        // Calculate error rate
        const errorCount = summary.logLevels.error || 0;
        summary.errorRate = summary.totalLogs > 0 ? (errorCount / summary.totalLogs) * 100 : 0;
        
        // Convert sets to counts
        summary.uniqueUsers = summary.uniqueUsers.size;
        summary.uniqueSessions = summary.uniqueSessions.size;
        
        return summary;
    }

    /**
     * Generate time series data
     */
    generateTimeSeries(logEntries, groupBy) {
        const timeSeries = {};
        const timeFormat = this.getTimeFormat(groupBy);
        
        for (const entry of logEntries) {
            const timeKey = this.formatTimeKey(new Date(entry.timestamp), groupBy);
            
            if (!timeSeries[timeKey]) {
                timeSeries[timeKey] = {
                    timestamp: timeKey,
                    count: 0,
                    errors: 0,
                    warnings: 0,
                    security: 0,
                    performance: 0,
                    uniqueUsers: new Set(),
                    uniqueSessions: new Set()
                };
            }
            
            const bucket = timeSeries[timeKey];
            bucket.count++;
            
            if (entry.level === 'error') bucket.errors++;
            if (entry.level === 'warn') bucket.warnings++;
            if (entry.security) bucket.security++;
            if (entry.performance) bucket.performance++;
            
            if (entry.userId) bucket.uniqueUsers.add(entry.userId);
            if (entry.sessionId) bucket.uniqueSessions.add(entry.sessionId);
        }
        
        // Convert sets to counts and sort by timestamp
        const sortedTimeSeries = Object.values(timeSeries)
            .map(bucket => ({
                ...bucket,
                uniqueUsers: bucket.uniqueUsers.size,
                uniqueSessions: bucket.uniqueSessions.size
            }))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return sortedTimeSeries;
    }

    /**
     * Generate specific metric
     */
    async generateMetric(metricType, logEntries, query) {
        switch (metricType) {
            case 'count':
                return this.generateCountMetrics(logEntries);
            
            case 'errors':
                return this.generateErrorMetrics(logEntries);
            
            case 'performance':
                return this.generatePerformanceMetrics(logEntries);
            
            case 'security':
                return this.generateSecurityMetrics(logEntries);
            
            case 'users':
                return this.generateUserMetrics(logEntries);
            
            case 'endpoints':
                return this.generateEndpointMetrics(logEntries);
            
            default:
                return null;
        }
    }

    /**
     * Generate count metrics
     */
    generateCountMetrics(logEntries) {
        return {
            total: logEntries.length,
            byLevel: logEntries.reduce((acc, entry) => {
                acc[entry.level] = (acc[entry.level] || 0) + 1;
                return acc;
            }, {}),
            bySource: logEntries.reduce((acc, entry) => {
                acc[entry.source] = (acc[entry.source] || 0) + 1;
                return acc;
            }, {}),
            byHour: this.groupByTimeUnit(logEntries, 'hour')
        };
    }

    /**
     * Generate error metrics
     */
    generateErrorMetrics(logEntries) {
        const errorEntries = logEntries.filter(entry => entry.level === 'error');
        
        return {
            totalErrors: errorEntries.length,
            errorRate: logEntries.length > 0 ? (errorEntries.length / logEntries.length) * 100 : 0,
            topErrors: this.getTopErrors(errorEntries),
            errorsByEndpoint: this.groupErrorsByEndpoint(errorEntries),
            errorTrends: this.generateTimeSeries(errorEntries, TIME_PERIODS.HOUR)
        };
    }

    /**
     * Generate performance metrics
     */
    generatePerformanceMetrics(logEntries) {
        const performanceEntries = logEntries.filter(entry => entry.performance);
        
        const responseTimes = performanceEntries
            .filter(entry => entry.meta && entry.meta.value)
            .map(entry => entry.meta.value);
        
        return {
            totalPerformanceEvents: performanceEntries.length,
            averageResponseTime: responseTimes.length > 0 ? 
                responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
            medianResponseTime: this.calculateMedian(responseTimes),
            p95ResponseTime: this.calculatePercentile(responseTimes, 95),
            slowestEndpoints: this.getSlowestEndpoints(performanceEntries),
            performanceAlerts: this.countPerformanceAlerts(performanceEntries)
        };
    }

    /**
     * Generate security metrics
     */
    generateSecurityMetrics(logEntries) {
        const securityEntries = logEntries.filter(entry => entry.security);
        
        return {
            totalSecurityEvents: securityEntries.length,
            securityEventTypes: this.groupSecurityEventTypes(securityEntries),
            threatSeverity: this.groupThreatSeverity(securityEntries),
            attackSources: this.groupAttackSources(securityEntries),
            securityTrends: this.generateTimeSeries(securityEntries, TIME_PERIODS.HOUR)
        };
    }

    /**
     * Generate user metrics
     */
    generateUserMetrics(logEntries) {
        const userActivities = {};
        
        for (const entry of logEntries) {
            if (entry.userId) {
                if (!userActivities[entry.userId]) {
                    userActivities[entry.userId] = {
                        totalActions: 0,
                        errors: 0,
                        sessions: new Set(),
                        firstSeen: new Date(entry.timestamp),
                        lastSeen: new Date(entry.timestamp)
                    };
                }
                
                const user = userActivities[entry.userId];
                user.totalActions++;
                
                if (entry.level === 'error') user.errors++;
                if (entry.sessionId) user.sessions.add(entry.sessionId);
                
                const entryTime = new Date(entry.timestamp);
                if (entryTime < user.firstSeen) user.firstSeen = entryTime;
                if (entryTime > user.lastSeen) user.lastSeen = entryTime;
            }
        }
        
        // Convert to array and add calculated fields
        const userMetrics = Object.entries(userActivities).map(([userId, activity]) => ({
            userId,
            totalActions: activity.totalActions,
            errors: activity.errors,
            errorRate: (activity.errors / activity.totalActions) * 100,
            sessions: activity.sessions.size,
            firstSeen: activity.firstSeen,
            lastSeen: activity.lastSeen,
            sessionDuration: activity.lastSeen - activity.firstSeen
        }));
        
        return {
            totalUsers: userMetrics.length,
            activeUsers: userMetrics.filter(user => user.totalActions > 0).length,
            topUsers: userMetrics.sort((a, b) => b.totalActions - a.totalActions).slice(0, 10),
            averageActionsPerUser: userMetrics.length > 0 ? 
                userMetrics.reduce((sum, user) => sum + user.totalActions, 0) / userMetrics.length : 0
        };
    }

    /**
     * Generate endpoint metrics
     */
    generateEndpointMetrics(logEntries) {
        const endpointStats = {};
        
        for (const entry of logEntries) {
            if (entry.endpoint || entry.meta?.endpoint) {
                const endpoint = entry.endpoint || entry.meta.endpoint;
                
                if (!endpointStats[endpoint]) {
                    endpointStats[endpoint] = {
                        calls: 0,
                        errors: 0,
                        totalResponseTime: 0,
                        responseTimes: []
                    };
                }
                
                const stats = endpointStats[endpoint];
                stats.calls++;
                
                if (entry.level === 'error') stats.errors++;
                
                const responseTime = entry.responseTime || entry.meta?.responseTime;
                if (responseTime) {
                    stats.totalResponseTime += responseTime;
                    stats.responseTimes.push(responseTime);
                }
            }
        }
        
        // Calculate derived metrics
        const endpointMetrics = Object.entries(endpointStats).map(([endpoint, stats]) => ({
            endpoint,
            calls: stats.calls,
            errors: stats.errors,
            errorRate: (stats.errors / stats.calls) * 100,
            averageResponseTime: stats.responseTimes.length > 0 ? 
                stats.totalResponseTime / stats.responseTimes.length : 0,
            medianResponseTime: this.calculateMedian(stats.responseTimes)
        }));
        
        return {
            totalEndpoints: endpointMetrics.length,
            topEndpoints: endpointMetrics.sort((a, b) => b.calls - a.calls).slice(0, 10),
            slowestEndpoints: endpointMetrics.sort((a, b) => b.averageResponseTime - a.averageResponseTime).slice(0, 10),
            errorProneEndpoints: endpointMetrics.sort((a, b) => b.errorRate - a.errorRate).slice(0, 10)
        };
    }

    /**
     * Generate trends analysis
     */
    generateTrends(timeSeries, groupBy) {
        if (timeSeries.length < 2) {
            return { insufficient_data: true };
        }
        
        const trends = {
            volume: this.calculateTrend(timeSeries.map(t => t.count)),
            errors: this.calculateTrend(timeSeries.map(t => t.errors)),
            performance: this.calculateTrend(timeSeries.map(t => t.performance)),
            security: this.calculateTrend(timeSeries.map(t => t.security)),
            users: this.calculateTrend(timeSeries.map(t => t.uniqueUsers))
        };
        
        return trends;
    }

    /**
     * Export logs in specified format
     */
    async exportLogs(queryOptions, exportConfig) {
        const config = new ExportConfig(exportConfig);
        const startTime = Date.now();
        
        try {
            // Get log data
            const searchResults = await searchLogs({
                ...queryOptions,
                limit: Math.min(config.maxRecords, 10000) // Respect search service limits
            });
            
            // Prepare export data
            let exportData = searchResults.entries;
            
            // Filter fields if specified
            if (config.fields) {
                exportData = exportData.map(entry => {
                    const filtered = {};
                    for (const field of config.fields) {
                        if (entry.hasOwnProperty(field)) {
                            filtered[field] = entry[field];
                        }
                    }
                    return filtered;
                });
            }
            
            // Add metadata if requested
            if (config.includeMetadata) {
                const metadata = {
                    exportedAt: new Date().toISOString(),
                    totalRecords: exportData.length,
                    query: queryOptions,
                    format: config.format,
                    processingTime: Date.now() - startTime
                };
                
                exportData = {
                    metadata,
                    data: exportData
                };
            }
            
            // Export based on destination
            switch (config.destination) {
                case 'file':
                    return await this.exportToFile(exportData, config);
                
                case 'stream':
                    return this.exportToStream(exportData, config);
                
                case 'webhook':
                    return await this.exportToWebhook(exportData, config);
                
                default:
                    throw new Error(`Unsupported export destination: ${config.destination}`);
            }
            
        } catch (error) {
            console.error('Export failed:', error);
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    /**
     * Export to file
     */
    async exportToFile(data, config) {
        const filename = config.filename || `logs_export_${Date.now()}.${config.format}`;
        const filePath = path.join(this.exportDir, filename);
        
        let content;
        
        switch (config.format) {
            case EXPORT_FORMATS.JSON:
                content = JSON.stringify(data, null, 2);
                break;
            
            case EXPORT_FORMATS.NDJSON:
                const records = config.includeMetadata ? data.data : data;
                content = records.map(record => JSON.stringify(record)).join('\n');
                break;
            
            case EXPORT_FORMATS.CSV:
                content = this.convertToCSV(data);
                break;
            
            case EXPORT_FORMATS.XML:
                content = this.convertToXML(data);
                break;
            
            default:
                throw new Error(`Unsupported export format: ${config.format}`);
        }
        
        await writeFile(filePath, content, 'utf8');
        
        return {
            success: true,
            filePath,
            filename,
            size: content.length,
            records: Array.isArray(data) ? data.length : (data.data ? data.data.length : 1)
        };
    }

    /**
     * Export to stream (for real-time export)
     */
    exportToStream(data, config) {
        // This would return a readable stream in a real implementation
        // For now, return the data directly
        return {
            success: true,
            data: data,
            format: config.format
        };
    }

    /**
     * Export to webhook
     */
    async exportToWebhook(data, config) {
        if (!config.webhookUrl) {
            throw new Error('Webhook URL is required for webhook export');
        }
        
        try {
            // In a real implementation, this would make an HTTP request
            // For now, simulate the webhook call
            const payload = {
                timestamp: new Date().toISOString(),
                format: config.format,
                data: data
            };
            
            // Simulate HTTP request
            console.log(`Webhook export to ${config.webhookUrl}:`, payload);
            
            return {
                success: true,
                webhookUrl: config.webhookUrl,
                records: Array.isArray(data) ? data.length : (data.data ? data.data.length : 1),
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            throw new Error(`Webhook export failed: ${error.message}`);
        }
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(tenantId, reportType = 'audit', timeRange = {}) {
        const startTime = Date.now();
        
        try {
            // Get audit and compliance logs
            const auditLogs = await searchLogs({
                tenantId,
                audit: true,
                startTime: timeRange.start,
                endTime: timeRange.end,
                limit: 10000
            });
            
            const complianceLogs = await searchLogs({
                tenantId,
                compliance: true,
                startTime: timeRange.start,
                endTime: timeRange.end,
                limit: 10000
            });
            
            const report = {
                reportType,
                tenantId,
                generatedAt: new Date().toISOString(),
                timeRange: {
                    start: timeRange.start,
                    end: timeRange.end
                },
                summary: {
                    totalAuditEvents: auditLogs.entries.length,
                    totalComplianceEvents: complianceLogs.entries.length,
                    dataAccessEvents: 0,
                    securityEvents: 0,
                    configurationChanges: 0
                },
                auditTrail: [],
                complianceEvents: [],
                dataAccess: [],
                securityIncidents: [],
                recommendations: [],
                processingTime: 0
            };
            
            // Process audit logs
            for (const entry of auditLogs.entries) {
                report.auditTrail.push({
                    timestamp: entry.timestamp,
                    userId: entry.userId,
                    action: entry.meta?.action || 'unknown',
                    resource: entry.meta?.resource || 'unknown',
                    outcome: entry.level === 'error' ? 'failed' : 'success',
                    details: entry.message,
                    auditHash: entry.meta?.auditHash
                });
                
                // Count specific event types
                if (entry.message.includes('data access') || entry.message.includes('sensitive')) {
                    report.summary.dataAccessEvents++;
                }
                
                if (entry.security) {
                    report.summary.securityEvents++;
                }
                
                if (entry.message.includes('configuration') || entry.message.includes('settings')) {
                    report.summary.configurationChanges++;
                }
            }
            
            // Process compliance logs
            for (const entry of complianceLogs.entries) {
                report.complianceEvents.push({
                    timestamp: entry.timestamp,
                    regulation: entry.meta?.regulation || 'general',
                    dataType: entry.meta?.dataType || 'unknown',
                    event: entry.message,
                    complianceHash: entry.meta?.auditHash
                });
            }
            
            // Generate recommendations
            report.recommendations = this.generateComplianceRecommendations(report);
            
            report.processingTime = Date.now() - startTime;
            
            return report;
            
        } catch (error) {
            console.error('Compliance report generation failed:', error);
            throw new Error(`Compliance report generation failed: ${error.message}`);
        }
    }

    /**
     * Generate compliance recommendations
     */
    generateComplianceRecommendations(report) {
        const recommendations = [];
        
        // Check for missing audit events
        if (report.summary.totalAuditEvents < 10) {
            recommendations.push({
                type: 'audit_coverage',
                severity: 'medium',
                message: 'Low audit event volume detected. Consider increasing audit logging coverage.',
                action: 'Review audit logging configuration'
            });
        }
        
        // Check for security incidents
        if (report.summary.securityEvents > 0) {
            recommendations.push({
                type: 'security_review',
                severity: 'high',
                message: `${report.summary.securityEvents} security events detected. Review required.`,
                action: 'Investigate security incidents and implement additional controls'
            });
        }
        
        // Check for data access patterns
        if (report.summary.dataAccessEvents > 100) {
            recommendations.push({
                type: 'data_access_review',
                severity: 'medium',
                message: 'High volume of data access events. Review access patterns.',
                action: 'Analyze data access patterns for anomalies'
            });
        }
        
        return recommendations;
    }

    // Utility methods
    
    formatTimeKey(date, groupBy) {
        switch (groupBy) {
            case TIME_PERIODS.HOUR:
                return date.toISOString().substring(0, 13) + ':00:00.000Z';
            case TIME_PERIODS.DAY:
                return date.toISOString().substring(0, 10) + 'T00:00:00.000Z';
            case TIME_PERIODS.WEEK:
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                return weekStart.toISOString().substring(0, 10) + 'T00:00:00.000Z';
            case TIME_PERIODS.MONTH:
                return date.toISOString().substring(0, 7) + '-01T00:00:00.000Z';
            case TIME_PERIODS.QUARTER:
                const quarter = Math.floor(date.getMonth() / 3) * 3;
                return `${date.getFullYear()}-${String(quarter + 1).padStart(2, '0')}-01T00:00:00.000Z`;
            case TIME_PERIODS.YEAR:
                return `${date.getFullYear()}-01-01T00:00:00.000Z`;
            default:
                return date.toISOString();
        }
    }

    getTimeFormat(groupBy) {
        const formats = {
            [TIME_PERIODS.HOUR]: 'YYYY-MM-DD HH:00',
            [TIME_PERIODS.DAY]: 'YYYY-MM-DD',
            [TIME_PERIODS.WEEK]: 'YYYY-[W]WW',
            [TIME_PERIODS.MONTH]: 'YYYY-MM',
            [TIME_PERIODS.QUARTER]: 'YYYY-[Q]Q',
            [TIME_PERIODS.YEAR]: 'YYYY'
        };
        return formats[groupBy] || 'YYYY-MM-DD HH:mm:ss';
    }

    calculateMedian(values) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    calculateTrend(values) {
        if (values.length < 2) return { trend: 'insufficient_data' };
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
        
        return {
            trend,
            slope,
            intercept,
            correlation: this.calculateCorrelation(values)
        };
    }

    calculateCorrelation(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const indices = Array.from({ length: n }, (_, i) => i);
        
        const meanX = indices.reduce((sum, val) => sum + val, 0) / n;
        const meanY = values.reduce((sum, val) => sum + val, 0) / n;
        
        const numerator = indices.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
        const denomX = Math.sqrt(indices.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0));
        const denomY = Math.sqrt(values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));
        
        return denomX * denomY === 0 ? 0 : numerator / (denomX * denomY);
    }

    convertToCSV(data) {
        const records = Array.isArray(data) ? data : (data.data || [data]);
        if (records.length === 0) return '';
        
        const headers = Object.keys(records[0]);
        const csvRows = [headers.join(',')];
        
        for (const record of records) {
            const values = headers.map(header => {
                const value = record[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    convertToXML(data) {
        const records = Array.isArray(data) ? data : (data.data || [data]);
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<logs>\n';
        
        for (const record of records) {
            xml += '  <log>\n';
            for (const [key, value] of Object.entries(record)) {
                xml += `    <${key}>${this.escapeXML(String(value))}</${key}>\n`;
            }
            xml += '  </log>\n';
        }
        
        xml += '</logs>';
        return xml;
    }

    escapeXML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    groupByTimeUnit(entries, unit) {
        const groups = {};
        
        for (const entry of entries) {
            const date = new Date(entry.timestamp);
            let key;
            
            switch (unit) {
                case 'hour':
                    key = date.getHours();
                    break;
                case 'day':
                    key = date.getDay();
                    break;
                case 'month':
                    key = date.getMonth();
                    break;
                default:
                    key = date.getHours();
            }
            
            groups[key] = (groups[key] || 0) + 1;
        }
        
        return groups;
    }

    getTopErrors(errorEntries) {
        const errorCounts = {};
        
        for (const entry of errorEntries) {
            const errorKey = entry.message.substring(0, 100); // First 100 chars
            errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
        }
        
        return Object.entries(errorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([error, count]) => ({ error, count }));
    }

    groupErrorsByEndpoint(errorEntries) {
        const endpointErrors = {};
        
        for (const entry of errorEntries) {
            const endpoint = entry.endpoint || entry.meta?.endpoint || 'unknown';
            endpointErrors[endpoint] = (endpointErrors[endpoint] || 0) + 1;
        }
        
        return Object.entries(endpointErrors)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([endpoint, count]) => ({ endpoint, count }));
    }

    getSlowestEndpoints(performanceEntries) {
        const endpointTimes = {};
        
        for (const entry of performanceEntries) {
            const endpoint = entry.meta?.endpoint || 'unknown';
            const responseTime = entry.meta?.value || 0;
            
            if (!endpointTimes[endpoint]) {
                endpointTimes[endpoint] = { times: [], count: 0 };
            }
            
            endpointTimes[endpoint].times.push(responseTime);
            endpointTimes[endpoint].count++;
        }
        
        return Object.entries(endpointTimes)
            .map(([endpoint, data]) => ({
                endpoint,
                averageTime: data.times.reduce((sum, time) => sum + time, 0) / data.times.length,
                maxTime: Math.max(...data.times),
                count: data.count
            }))
            .sort((a, b) => b.averageTime - a.averageTime)
            .slice(0, 10);
    }

    countPerformanceAlerts(performanceEntries) {
        let alertCount = 0;
        
        for (const entry of performanceEntries) {
            if (entry.meta?.analysis?.alerts) {
                alertCount += entry.meta.analysis.alerts.length;
            }
        }
        
        return alertCount;
    }

    groupSecurityEventTypes(securityEntries) {
        const eventTypes = {};
        
        for (const entry of securityEntries) {
            const eventType = entry.meta?.eventType || 'unknown';
            eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;
        }
        
        return eventTypes;
    }

    groupThreatSeverity(securityEntries) {
        const severities = {};
        
        for (const entry of securityEntries) {
            const severity = entry.meta?.severity || 'unknown';
            severities[severity] = (severities[severity] || 0) + 1;
        }
        
        return severities;
    }

    groupAttackSources(securityEntries) {
        const sources = {};
        
        for (const entry of securityEntries) {
            const source = entry.ipAddress || entry.meta?.ipAddress || 'unknown';
            sources[source] = (sources[source] || 0) + 1;
        }
        
        return Object.entries(sources)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([source, count]) => ({ source, count }));
    }
}

// Create singleton instance
const logAnalyticsEngine = new LogAnalyticsEngine();

/**
 * Generate analytics report
 */
export async function generateAnalytics(queryOptions) {
    return await logAnalyticsEngine.generateAnalytics(queryOptions);
}

/**
 * Export logs in specified format
 */
export async function exportLogs(queryOptions, exportConfig) {
    return await logAnalyticsEngine.exportLogs(queryOptions, exportConfig);
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(tenantId, reportType, timeRange) {
    return await logAnalyticsEngine.generateComplianceReport(tenantId, reportType, timeRange);
}

export {
    EXPORT_FORMATS,
    TIME_PERIODS,
    AnalyticsQuery,
    ExportConfig
};

export default {
    generateAnalytics,
    exportLogs,
    generateComplianceReport,
    EXPORT_FORMATS,
    TIME_PERIODS,
    AnalyticsQuery,
    ExportConfig
};