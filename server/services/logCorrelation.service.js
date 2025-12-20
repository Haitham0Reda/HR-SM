/**
 * Log Correlation Service
 * Links related log entries by correlation ID and reconstructs user journeys
 */

import fs from 'fs';
import path from 'path';
import { getCorrelationContext, getLinkedCorrelationIds } from './correlationId.service.js';

// Mock __filename and __dirname for Jest compatibility
const __filename = 'logCorrelation.service.js';
const __dirname = '.';

/**
 * Log entry interface for correlation
 */
class LogEntry {
    constructor(data) {
        this.timestamp = data.timestamp;
        this.level = data.level;
        this.message = data.message;
        this.correlationId = data.correlationId;
        this.tenantId = data.tenantId;
        this.userId = data.userId;
        this.sessionId = data.sessionId;
        this.source = data.source || 'backend';
        this.meta = data.meta || {};
    }
}

/**
 * User journey reconstruction
 */
class UserJourney {
    constructor(userId, sessionId, tenantId) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.tenantId = tenantId;
        this.startTime = null;
        this.endTime = null;
        this.steps = [];
        this.correlationIds = new Set();
        this.errors = [];
        this.securityEvents = [];
        this.performanceMetrics = [];
    }

    addLogEntry(logEntry) {
        this.correlationIds.add(logEntry.correlationId);
        
        // Update journey timeline
        const entryTime = new Date(logEntry.timestamp);
        if (!this.startTime || entryTime < this.startTime) {
            this.startTime = entryTime;
        }
        if (!this.endTime || entryTime > this.endTime) {
            this.endTime = entryTime;
        }

        // Categorize log entries
        if (logEntry.level === 'error') {
            this.errors.push(logEntry);
        }
        
        if (logEntry.meta.security) {
            this.securityEvents.push(logEntry);
        }
        
        if (logEntry.meta.performance) {
            this.performanceMetrics.push(logEntry);
        }

        // Create journey step
        const step = {
            timestamp: logEntry.timestamp,
            correlationId: logEntry.correlationId,
            action: this.extractAction(logEntry),
            page: logEntry.meta.page || logEntry.meta.endpoint,
            duration: logEntry.meta.responseTime || logEntry.meta.duration,
            success: logEntry.level !== 'error',
            source: logEntry.source,
            details: logEntry.meta
        };

        this.steps.push(step);
    }

    extractAction(logEntry) {
        // Extract meaningful action from log entry
        if (logEntry.meta.action) {
            return logEntry.meta.action;
        }
        
        if (logEntry.meta.method && logEntry.meta.endpoint) {
            return `${logEntry.meta.method} ${logEntry.meta.endpoint}`;
        }
        
        if (logEntry.message.includes('login')) {
            return 'login';
        }
        
        if (logEntry.message.includes('logout')) {
            return 'logout';
        }
        
        if (logEntry.message.includes('navigation')) {
            return 'page_navigation';
        }
        
        return 'unknown_action';
    }

    getSummary() {
        const sortedSteps = this.steps.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return {
            userId: this.userId,
            sessionId: this.sessionId,
            tenantId: this.tenantId,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime && this.startTime ? this.endTime - this.startTime : 0,
            totalSteps: this.steps.length,
            errorCount: this.errors.length,
            securityEventCount: this.securityEvents.length,
            performanceMetricCount: this.performanceMetrics.length,
            correlationIdCount: this.correlationIds.size,
            firstAction: sortedSteps[0]?.action,
            lastAction: sortedSteps[sortedSteps.length - 1]?.action,
            riskScore: this.calculateRiskScore()
        };
    }

    calculateRiskScore() {
        let score = 0;
        
        // Add points for errors
        score += this.errors.length * 10;
        
        // Add points for security events
        score += this.securityEvents.length * 50;
        
        // Add points for failed actions
        const failedSteps = this.steps.filter(step => !step.success);
        score += failedSteps.length * 5;
        
        // Normalize to 0-100 scale
        return Math.min(score, 100);
    }
}

/**
 * Log Correlation Engine
 */
class LogCorrelationEngine {
    constructor() {
        this.correlatedLogs = new Map(); // correlationId -> LogEntry[]
        this.userJourneys = new Map(); // userId_sessionId -> UserJourney
        this.sessionLogs = new Map(); // sessionId -> LogEntry[]
        this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        this.cleanupInterval = 60 * 60 * 1000; // 1 hour
        
        this.startCleanup();
    }

    /**
     * Add log entry to correlation engine
     */
    addLogEntry(logData) {
        const logEntry = new LogEntry(logData);
        
        // Add to correlation map
        if (!this.correlatedLogs.has(logEntry.correlationId)) {
            this.correlatedLogs.set(logEntry.correlationId, []);
        }
        this.correlatedLogs.get(logEntry.correlationId).push(logEntry);
        
        // Add to session logs
        if (logEntry.sessionId) {
            if (!this.sessionLogs.has(logEntry.sessionId)) {
                this.sessionLogs.set(logEntry.sessionId, []);
            }
            this.sessionLogs.get(logEntry.sessionId).push(logEntry);
        }
        
        // Add to user journey
        if (logEntry.userId && logEntry.sessionId) {
            const journeyKey = `${logEntry.userId}_${logEntry.sessionId}`;
            if (!this.userJourneys.has(journeyKey)) {
                this.userJourneys.set(journeyKey, new UserJourney(
                    logEntry.userId, 
                    logEntry.sessionId, 
                    logEntry.tenantId
                ));
            }
            this.userJourneys.get(journeyKey).addLogEntry(logEntry);
        }
    }

    /**
     * Get correlated logs by correlation ID
     */
    getCorrelatedLogs(correlationId) {
        const logs = this.correlatedLogs.get(correlationId) || [];
        
        // Also get linked correlation IDs
        const linkedIds = getLinkedCorrelationIds(correlationId);
        for (const linkedData of linkedIds) {
            const linkedLogs = this.correlatedLogs.get(linkedData.correlationId) || [];
            logs.push(...linkedLogs);
        }
        
        // Sort by timestamp
        return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    /**
     * Get user journey
     */
    getUserJourney(userId, sessionId) {
        const journeyKey = `${userId}_${sessionId}`;
        return this.userJourneys.get(journeyKey);
    }

    /**
     * Get session logs
     */
    getSessionLogs(sessionId) {
        const logs = this.sessionLogs.get(sessionId) || [];
        return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    /**
     * Search logs by criteria
     */
    searchLogs(criteria) {
        const results = [];
        
        for (const logs of this.correlatedLogs.values()) {
            for (const log of logs) {
                if (this.matchesCriteria(log, criteria)) {
                    results.push(log);
                }
            }
        }
        
        return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Check if log matches search criteria
     */
    matchesCriteria(log, criteria) {
        if (criteria.userId && log.userId !== criteria.userId) return false;
        if (criteria.tenantId && log.tenantId !== criteria.tenantId) return false;
        if (criteria.sessionId && log.sessionId !== criteria.sessionId) return false;
        if (criteria.level && log.level !== criteria.level) return false;
        if (criteria.source && log.source !== criteria.source) return false;
        
        if (criteria.timeRange) {
            const logTime = new Date(log.timestamp);
            if (criteria.timeRange.start && logTime < new Date(criteria.timeRange.start)) return false;
            if (criteria.timeRange.end && logTime > new Date(criteria.timeRange.end)) return false;
        }
        
        if (criteria.message && !log.message.toLowerCase().includes(criteria.message.toLowerCase())) {
            return false;
        }
        
        if (criteria.security && !log.meta.security) return false;
        if (criteria.performance && !log.meta.performance) return false;
        if (criteria.audit && !log.meta.audit) return false;
        
        return true;
    }

    /**
     * Get correlation statistics
     */
    getStats() {
        const totalLogs = Array.from(this.correlatedLogs.values())
            .reduce((sum, logs) => sum + logs.length, 0);
        
        return {
            totalCorrelationIds: this.correlatedLogs.size,
            totalLogs,
            totalUserJourneys: this.userJourneys.size,
            totalSessions: this.sessionLogs.size,
            averageLogsPerCorrelation: totalLogs / this.correlatedLogs.size || 0
        };
    }

    /**
     * Get user journey summaries for a tenant
     */
    getTenantJourneySummaries(tenantId, limit = 100) {
        const summaries = [];
        
        for (const journey of this.userJourneys.values()) {
            if (journey.tenantId === tenantId) {
                summaries.push(journey.getSummary());
            }
        }
        
        // Sort by start time (most recent first)
        summaries.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        return summaries.slice(0, limit);
    }

    /**
     * Detect anomalous patterns in user journeys
     */
    detectAnomalies(tenantId) {
        const anomalies = [];
        
        for (const journey of this.userJourneys.values()) {
            if (journey.tenantId !== tenantId) continue;
            
            const summary = journey.getSummary();
            
            // High error rate
            if (summary.errorCount > 5) {
                anomalies.push({
                    type: 'high_error_rate',
                    severity: 'medium',
                    userId: journey.userId,
                    sessionId: journey.sessionId,
                    errorCount: summary.errorCount,
                    details: 'User session has unusually high error rate'
                });
            }
            
            // Security events
            if (summary.securityEventCount > 0) {
                anomalies.push({
                    type: 'security_events',
                    severity: 'high',
                    userId: journey.userId,
                    sessionId: journey.sessionId,
                    securityEventCount: summary.securityEventCount,
                    details: 'Security events detected in user session'
                });
            }
            
            // High risk score
            if (summary.riskScore > 70) {
                anomalies.push({
                    type: 'high_risk_score',
                    severity: 'high',
                    userId: journey.userId,
                    sessionId: journey.sessionId,
                    riskScore: summary.riskScore,
                    details: 'User session has high risk score'
                });
            }
            
            // Rapid actions (potential bot behavior)
            if (summary.totalSteps > 50 && summary.duration < 60000) { // 50 actions in less than 1 minute
                anomalies.push({
                    type: 'rapid_actions',
                    severity: 'medium',
                    userId: journey.userId,
                    sessionId: journey.sessionId,
                    actionCount: summary.totalSteps,
                    duration: summary.duration,
                    details: 'Unusually rapid user actions detected'
                });
            }
        }
        
        return anomalies;
    }

    /**
     * Start cleanup timer
     */
    startCleanup() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }

    /**
     * Clean up old entries
     */
    cleanup() {
        const now = Date.now();
        
        // Clean correlation logs
        for (const [correlationId, logs] of this.correlatedLogs.entries()) {
            const filteredLogs = logs.filter(log => {
                const logTime = new Date(log.timestamp).getTime();
                return now - logTime < this.maxAge;
            });
            
            if (filteredLogs.length === 0) {
                this.correlatedLogs.delete(correlationId);
            } else {
                this.correlatedLogs.set(correlationId, filteredLogs);
            }
        }
        
        // Clean session logs
        for (const [sessionId, logs] of this.sessionLogs.entries()) {
            const filteredLogs = logs.filter(log => {
                const logTime = new Date(log.timestamp).getTime();
                return now - logTime < this.maxAge;
            });
            
            if (filteredLogs.length === 0) {
                this.sessionLogs.delete(sessionId);
            } else {
                this.sessionLogs.set(sessionId, filteredLogs);
            }
        }
        
        // Clean user journeys
        for (const [journeyKey, journey] of this.userJourneys.entries()) {
            if (journey.endTime && now - journey.endTime.getTime() > this.maxAge) {
                this.userJourneys.delete(journeyKey);
            }
        }
    }

    /**
     * Clear all data (for testing)
     */
    clear() {
        this.correlatedLogs.clear();
        this.userJourneys.clear();
        this.sessionLogs.clear();
    }
}

// Create singleton instance
const logCorrelationEngine = new LogCorrelationEngine();

/**
 * Add log entry to correlation engine
 */
export function addLogEntry(logData) {
    return logCorrelationEngine.addLogEntry(logData);
}

/**
 * Get correlated logs by correlation ID
 */
export function getCorrelatedLogs(correlationId) {
    return logCorrelationEngine.getCorrelatedLogs(correlationId);
}

/**
 * Get user journey
 */
export function getUserJourney(userId, sessionId) {
    return logCorrelationEngine.getUserJourney(userId, sessionId);
}

/**
 * Get session logs
 */
export function getSessionLogs(sessionId) {
    return logCorrelationEngine.getSessionLogs(sessionId);
}

/**
 * Search logs by criteria
 */
export function searchLogs(criteria) {
    return logCorrelationEngine.searchLogs(criteria);
}

/**
 * Get correlation statistics
 */
export function getCorrelationStats() {
    return logCorrelationEngine.getStats();
}

/**
 * Get tenant journey summaries
 */
export function getTenantJourneySummaries(tenantId, limit = 100) {
    return logCorrelationEngine.getTenantJourneySummaries(tenantId, limit);
}

/**
 * Detect anomalies in user journeys
 */
export function detectJourneyAnomalies(tenantId) {
    return logCorrelationEngine.detectAnomalies(tenantId);
}

/**
 * Clear correlation engine (for testing)
 */
export function clearCorrelationEngine() {
    return logCorrelationEngine.clear();
}

export default {
    addLogEntry,
    getCorrelatedLogs,
    getUserJourney,
    getSessionLogs,
    searchLogs,
    getCorrelationStats,
    getTenantJourneySummaries,
    detectJourneyAnomalies,
    clearCorrelationEngine
};