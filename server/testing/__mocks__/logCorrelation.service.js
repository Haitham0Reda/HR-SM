/**
 * Mock Log Correlation Service
 * Links related log entries by correlation ID and reconstructs user journeys
 */

// Mock classes
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
        
        const entryTime = new Date(logEntry.timestamp);
        if (!this.startTime || entryTime < this.startTime) {
            this.startTime = entryTime;
        }
        if (!this.endTime || entryTime > this.endTime) {
            this.endTime = entryTime;
        }

        if (logEntry.level === 'error') {
            this.errors.push(logEntry);
        }
        
        if (logEntry.meta && logEntry.meta.security) {
            this.securityEvents.push(logEntry);
        }
        
        if (logEntry.meta && logEntry.meta.performance) {
            this.performanceMetrics.push(logEntry);
        }

        const step = {
            timestamp: logEntry.timestamp,
            correlationId: logEntry.correlationId,
            action: this.extractAction(logEntry),
            page: logEntry.meta && (logEntry.meta.page || logEntry.meta.endpoint),
            duration: logEntry.meta && (logEntry.meta.responseTime || logEntry.meta.duration),
            success: logEntry.level !== 'error',
            source: logEntry.source,
            details: logEntry.meta || {}
        };

        this.steps.push(step);
    }

    extractAction(logEntry) {
        if (logEntry.meta && logEntry.meta.action) {
            return logEntry.meta.action;
        }
        
        if (logEntry.meta && logEntry.meta.method && logEntry.meta.endpoint) {
            return `${logEntry.meta.method} ${logEntry.meta.endpoint}`;
        }
        
        if (logEntry.message && logEntry.message.includes('login')) {
            return 'login';
        }
        
        if (logEntry.message && logEntry.message.includes('logout')) {
            return 'logout';
        }
        
        if (logEntry.message && logEntry.message.includes('navigation')) {
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
            firstAction: sortedSteps[0] ? sortedSteps[0].action : null,
            lastAction: sortedSteps[sortedSteps.length - 1] ? sortedSteps[sortedSteps.length - 1].action : null,
            riskScore: this.calculateRiskScore()
        };
    }

    calculateRiskScore() {
        let score = 0;
        
        score += this.errors.length * 10;
        score += this.securityEvents.length * 50;
        const failedSteps = this.steps.filter(step => !step.success);
        score += failedSteps.length * 5;
        return Math.min(score, 100);
    }
}

// Individual function mocks
export const addLogEntry = jest.fn();
export const getCorrelatedLogs = jest.fn().mockReturnValue([]);
export const getUserJourney = jest.fn().mockReturnValue({});
export const getSessionLogs = jest.fn().mockReturnValue([]);
export const searchLogs = jest.fn().mockReturnValue([]);
export const getCorrelationStats = jest.fn().mockReturnValue({});
export const getTenantJourneySummaries = jest.fn().mockReturnValue([]);
export const detectJourneyAnomalies = jest.fn().mockReturnValue([]);
export const linkLog = jest.fn().mockResolvedValue({ success: true });
export const getRecentUserLogs = jest.fn().mockResolvedValue([]);
export const clearCorrelationEngine = jest.fn();

// Default export with all functions as methods
export default {
    addLogEntry,
    getCorrelatedLogs,
    getUserJourney,
    getSessionLogs,
    searchLogs,
    getCorrelationStats,
    getTenantJourneySummaries,
    detectJourneyAnomalies,
    linkLog,
    getRecentUserLogs,
    clearCorrelationEngine
};