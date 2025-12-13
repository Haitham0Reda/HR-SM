/**
 * User Activity Service
 * Handles API calls for user activity tracking and monitoring
 */

import apiClient from './apiClient';

class UserActivityService {
    /**
     * Get user activities for a company
     * @param {string} tenantId - Company tenant ID
     * @param {Object} options - Query options
     * @returns {Promise} User activities data
     */
    async getUserActivities(tenantId, options = {}) {
        const {
            userId = null,
            days = 7,
            activityType = null,
            includeRealTime = true,
            limit = 1000
        } = options;

        const params = new URLSearchParams({
            days: days.toString(),
            includeRealTime: includeRealTime.toString(),
            limit: limit.toString()
        });

        if (userId) params.append('userId', userId);
        if (activityType) params.append('activityType', activityType);

        const response = await apiClient.get(`/company-logs/${tenantId}/user-activities?${params}`);
        return response.data;
    }

    /**
     * Get real-time user sessions
     * @param {string} tenantId - Company tenant ID
     * @returns {Promise} Real-time sessions data
     */
    async getRealTimeSessions(tenantId) {
        const response = await apiClient.get(`/company-logs/${tenantId}/real-time-sessions`);
        return response.data;
    }

    /**
     * Get user activity timeline
     * @param {string} tenantId - Company tenant ID
     * @param {string} userId - User ID
     * @param {number} days - Number of days to look back
     * @returns {Promise} User timeline data
     */
    async getUserTimeline(tenantId, userId, days = 1) {
        const response = await apiClient.get(`/company-logs/${tenantId}/user-timeline/${userId}?days=${days}`);
        return response.data;
    }

    /**
     * Get routing analytics for a company
     * @param {string} tenantId - Company tenant ID
     * @param {number} days - Number of days to analyze
     * @returns {Promise} Routing analytics data
     */
    async getRoutingAnalytics(tenantId, days = 30) {
        const response = await apiClient.get(`/company-logs/${tenantId}/routing-analytics?days=${days}`);
        return response.data;
    }

    /**
     * Get feature usage report
     * @param {string} tenantId - Company tenant ID
     * @param {number} days - Number of days to analyze
     * @returns {Promise} Feature usage data
     */
    async getFeatureUsage(tenantId, days = 7) {
        const response = await apiClient.get(`/company-logs/${tenantId}/feature-usage?days=${days}`);
        return response.data;
    }

    /**
     * Search company logs
     * @param {string} tenantId - Company tenant ID
     * @param {Object} searchOptions - Search parameters
     * @returns {Promise} Search results
     */
    async searchLogs(tenantId, searchOptions = {}) {
        const {
            searchTerm,
            logType = null,
            dateFrom = null,
            dateTo = null,
            maxResults = 1000
        } = searchOptions;

        const response = await apiClient.post(`/company-logs/${tenantId}/search`, {
            searchTerm,
            logType,
            dateFrom,
            dateTo,
            maxResults
        });
        return response.data;
    }

    /**
     * Get log summary for a company
     * @param {string} tenantId - Company tenant ID
     * @param {number} days - Number of days to summarize
     * @returns {Promise} Log summary data
     */
    async getLogSummary(tenantId, days = 7) {
        const response = await apiClient.get(`/company-logs/${tenantId}/summary?days=${days}`);
        return response.data;
    }

    /**
     * Test logging for a company (development/testing)
     * @param {string} tenantId - Company tenant ID
     * @param {Object} testData - Test log data
     * @returns {Promise} Test result
     */
    async testLogging(tenantId, testData = {}) {
        const {
            level = 'info',
            message = 'Test log message',
            metadata = {}
        } = testData;

        const response = await apiClient.post(`/company-logs/${tenantId}/test`, {
            level,
            message,
            metadata
        });
        return response.data;
    }

    /**
     * Archive company logs
     * @param {string} tenantId - Company tenant ID
     * @returns {Promise} Archive result
     */
    async archiveLogs(tenantId) {
        const response = await apiClient.post(`/company-logs/${tenantId}/archive`);
        return response.data;
    }

    /**
     * Cleanup old log files
     * @param {string} tenantId - Company tenant ID
     * @param {Object} cleanupOptions - Cleanup parameters
     * @returns {Promise} Cleanup result
     */
    async cleanupLogs(tenantId, cleanupOptions = {}) {
        const {
            daysToKeep = 30,
            keepAuditLogs = true
        } = cleanupOptions;

        const response = await apiClient.delete(`/company-logs/${tenantId}/cleanup`, {
            data: {
                daysToKeep,
                keepAuditLogs
            }
        });
        return response.data;
    }
}

export default new UserActivityService();