/**
 * Company Log Management Service
 * Provides administrative functions for managing company-specific logs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { getLoggerForTenant, getCompanyLogStats } from '../utils/companyLogger.js';
import Tenant from '../platform/tenants/models/Tenant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseLogsDir = path.join(__dirname, '../../logs');
const companyLogsDir = path.join(baseLogsDir, 'companies');

class CompanyLogService {
    /**
     * Get all companies with their log statistics
     */
    async getAllCompanyLogStats() {
        try {
            const tenants = await Tenant.find({}, 'tenantId name status');
            const stats = [];
            
            for (const tenant of tenants) {
                const logStats = getCompanyLogStats(tenant.tenantId, tenant.name);
                if (logStats) {
                    stats.push({
                        ...logStats,
                        companyName: tenant.name,
                        status: tenant.status
                    });
                }
            }
            
            return stats;
        } catch (error) {
            throw new Error(`Failed to get company log stats: ${error.message}`);
        }
    }

    /**
     * Get log files for a specific company
     */
    async getCompanyLogFiles(tenantId) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            if (!tenant) {
                throw new Error('Company not found');
            }

            const sanitizedName = tenant.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            
            const companyDir = path.join(companyLogsDir, sanitizedName);
            
            if (!fs.existsSync(companyDir)) {
                return [];
            }

            const files = fs.readdirSync(companyDir);
            const logFiles = [];

            for (const file of files) {
                const filePath = path.join(companyDir, file);
                const stats = fs.statSync(filePath);
                
                // Extract date from filename (e.g., "2025-12-13-application.log" -> "2025-12-13")
                const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
                const fileDate = dateMatch ? dateMatch[1] : null;
                
                logFiles.push({
                    name: file,
                    size: stats.size,
                    sizeMB: (stats.size / 1024 / 1024).toFixed(2),
                    modified: stats.mtime,
                    type: this.getLogType(file),
                    path: filePath,
                    date: fileDate
                });
            }

            return logFiles.sort((a, b) => b.modified - a.modified);
        } catch (error) {
            throw new Error(`Failed to get log files: ${error.message}`);
        }
    }

    /**
     * Read log file content with pagination
     */
    async readLogFile(tenantId, fileName, options = {}) {
        try {
            const { lines = 100, offset = 0, search = null } = options;
            
            const tenant = await Tenant.findOne({ tenantId });
            if (!tenant) {
                throw new Error('Company not found');
            }

            const sanitizedName = tenant.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            
            const filePath = path.join(companyLogsDir, sanitizedName, fileName);
            
            if (!fs.existsSync(filePath)) {
                throw new Error('Log file not found');
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const allLines = content.split('\n').filter(line => line.trim());
            
            let filteredLines = allLines;
            
            // Apply search filter if provided
            if (search) {
                filteredLines = allLines.filter(line => 
                    line.toLowerCase().includes(search.toLowerCase())
                );
            }

            // Apply pagination
            const startIndex = offset;
            const endIndex = startIndex + lines;
            const paginatedLines = filteredLines.slice(startIndex, endIndex);

            return {
                lines: paginatedLines,
                totalLines: filteredLines.length,
                hasMore: endIndex < filteredLines.length,
                fileName,
                search
            };
        } catch (error) {
            throw new Error(`Failed to read log file: ${error.message}`);
        }
    }

    /**
     * Get log file content (helper method for getUserActivityTracking)
     */
    async getLogFileContent(tenantId, fileName) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            if (!tenant) {
                throw new Error('Company not found');
            }

            const sanitizedName = tenant.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            
            const filePath = path.join(companyLogsDir, sanitizedName, fileName);
            
            if (!fs.existsSync(filePath)) {
                throw new Error('Log file not found');
            }

            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            throw new Error(`Failed to get log file content: ${error.message}`);
        }
    }

    /**
     * Archive company logs
     */
    async archiveCompanyLogs(tenantId, outputPath = null) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            if (!tenant) {
                throw new Error('Company not found');
            }

            const sanitizedName = tenant.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            
            const companyDir = path.join(companyLogsDir, sanitizedName);
            
            if (!fs.existsSync(companyDir)) {
                throw new Error('No logs found for this company');
            }

            const archivePath = outputPath || path.join(baseLogsDir, 'archives', `${sanitizedName}-${Date.now()}.zip`);
            const archiveDir = path.dirname(archivePath);
            
            if (!fs.existsSync(archiveDir)) {
                fs.mkdirSync(archiveDir, { recursive: true });
            }

            return new Promise((resolve, reject) => {
                const output = fs.createWriteStream(archivePath);
                const archive = archiver('zip', { zlib: { level: 9 } });

                output.on('close', () => {
                    resolve({
                        archivePath,
                        size: archive.pointer(),
                        sizeMB: (archive.pointer() / 1024 / 1024).toFixed(2)
                    });
                });

                archive.on('error', reject);
                archive.pipe(output);
                archive.directory(companyDir, sanitizedName);
                archive.finalize();
            });
        } catch (error) {
            throw new Error(`Failed to archive logs: ${error.message}`);
        }
    }

    /**
     * Delete old log files for a company
     */
    async cleanupCompanyLogs(tenantId, daysToKeep = 30, keepAuditLogs = true) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            if (!tenant) {
                throw new Error('Company not found');
            }

            const sanitizedName = tenant.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            
            const companyDir = path.join(companyLogsDir, sanitizedName);
            
            if (!fs.existsSync(companyDir)) {
                return { deletedFiles: 0, message: 'No logs found for this company' };
            }

            const files = fs.readdirSync(companyDir);
            let deletedFiles = 0;
            const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));

            for (const file of files) {
                const filePath = path.join(companyDir, file);
                const stats = fs.statSync(filePath);
                
                // Skip audit logs if keepAuditLogs is true
                if (keepAuditLogs && file.includes('audit')) {
                    continue;
                }
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedFiles++;
                }
            }

            return {
                deletedFiles,
                message: `Deleted ${deletedFiles} old log files`
            };
        } catch (error) {
            throw new Error(`Failed to cleanup logs: ${error.message}`);
        }
    }

    /**
     * Get log type from filename
     */
    getLogType(fileName) {
        if (fileName.includes('error')) return 'error';
        if (fileName.includes('audit')) return 'audit';
        if (fileName.includes('application')) return 'application';
        return 'unknown';
    }

    /**
     * Search across all log files for a company
     */
    async searchCompanyLogs(tenantId, searchTerm, options = {}) {
        try {
            const { 
                logType = null, 
                dateFrom = null, 
                dateTo = null, 
                maxResults = 1000 
            } = options;

            const logFiles = await this.getCompanyLogFiles(tenantId);
            const results = [];

            for (const logFile of logFiles) {
                // Filter by log type if specified
                if (logType && logFile.type !== logType) {
                    continue;
                }

                // Filter by date range if specified
                if (dateFrom && logFile.modified < new Date(dateFrom)) {
                    continue;
                }
                if (dateTo && logFile.modified > new Date(dateTo)) {
                    continue;
                }

                try {
                    const content = fs.readFileSync(logFile.path, 'utf8');
                    const lines = content.split('\n');

                    lines.forEach((line, index) => {
                        if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
                            results.push({
                                file: logFile.name,
                                line: index + 1,
                                content: line.trim(),
                                timestamp: this.extractTimestamp(line),
                                type: logFile.type
                            });

                            if (results.length >= maxResults) {
                                return;
                            }
                        }
                    });
                } catch (error) {
                    console.error(`Error reading log file ${logFile.name}:`, error);
                }

                if (results.length >= maxResults) {
                    break;
                }
            }

            return {
                searchTerm,
                results: results.slice(0, maxResults),
                totalFound: results.length,
                truncated: results.length >= maxResults
            };
        } catch (error) {
            throw new Error(`Failed to search logs: ${error.message}`);
        }
    }

    /**
     * Extract timestamp from log line
     */
    extractTimestamp(line) {
        const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        return timestampMatch ? timestampMatch[1] : null;
    }

    /**
     * Get log summary for a company
     */
    async getCompanyLogSummary(tenantId, days = 7) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            if (!tenant) {
                throw new Error('Company not found');
            }

            const logFiles = await this.getCompanyLogFiles(tenantId);
            const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
            
            const summary = {
                totalFiles: logFiles.length,
                totalSize: 0,
                errorCount: 0,
                warningCount: 0,
                infoCount: 0,
                auditCount: 0,
                recentFiles: logFiles.filter(f => f.modified > cutoffDate).length
            };

            // Quick scan of recent files for log level counts
            for (const logFile of logFiles) {
                summary.totalSize += logFile.size;
                
                if (logFile.modified > cutoffDate) {
                    try {
                        const content = fs.readFileSync(logFile.path, 'utf8');
                        const lines = content.split('\n');
                        
                        for (const line of lines) {
                            if (line.includes('"level":"error"')) summary.errorCount++;
                            else if (line.includes('"level":"warn"')) summary.warningCount++;
                            else if (line.includes('"level":"info"')) summary.infoCount++;
                            if (line.includes('"audit":true')) summary.auditCount++;
                        }
                    } catch (error) {
                        console.error(`Error reading log file ${logFile.name}:`, error);
                    }
                }
            }

            summary.totalSizeMB = (summary.totalSize / 1024 / 1024).toFixed(2);
            
            return summary;
        } catch (error) {
            throw new Error(`Failed to get log summary: ${error.message}`);
        }
    }

    /**
     * Get company routing analytics
     * Provides detailed insights into company route usage
     */
    async getCompanyRoutingAnalytics(tenantId, days = 30) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            if (!tenant) {
                throw new Error('Company not found');
            }

            const logFiles = await this.getCompanyLogFiles(tenantId);
            const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
            
            const analytics = {
                tenantId,
                companyName: tenant.name,
                period: `${days} days`,
                totalCompanyRouteAccess: 0,
                featureUsage: {},
                routePerformance: {},
                navigationPatterns: {},
                errorsByRoute: {},
                peakUsageHours: {},
                userActivity: {}
            };

            // Process log files for routing data
            for (const file of logFiles) {
                if (file.type === 'application' && new Date(file.date) >= cutoffDate) {
                    try {
                        const content = await this.getLogFileContent(tenantId, file.name);
                        const lines = content.split('\n').filter(line => line.trim());
                        
                        for (const line of lines) {
                            try {
                                const logEntry = JSON.parse(line);
                                if (new Date(logEntry.timestamp) >= cutoffDate && 
                                    logEntry.routing && logEntry.routing.isCompanyRoute) {
                                    
                                    analytics.totalCompanyRouteAccess++;
                                    
                                    const internalPath = logEntry.routing.internalPath || '/';
                                    const companySlug = logEntry.routing.companySlug;
                                    const hour = new Date(logEntry.timestamp).getHours();
                                    const userId = logEntry.userId;
                                    
                                    // Feature usage tracking (extract from internal path)
                                    const pathSegments = internalPath.split('/').filter(Boolean);
                                    const feature = pathSegments[0] || 'dashboard';
                                    analytics.featureUsage[feature] = (analytics.featureUsage[feature] || 0) + 1;
                                    
                                    // Navigation patterns
                                    analytics.navigationPatterns[internalPath] = 
                                        (analytics.navigationPatterns[internalPath] || 0) + 1;
                                    
                                    // Route performance tracking
                                    if (logEntry.responseTime) {
                                        if (!analytics.routePerformance[internalPath]) {
                                            analytics.routePerformance[internalPath] = {
                                                count: 0,
                                                totalTime: 0,
                                                avgTime: 0
                                            };
                                        }
                                        analytics.routePerformance[internalPath].count++;
                                        const responseTime = parseInt(logEntry.responseTime.replace('ms', ''));
                                        analytics.routePerformance[internalPath].totalTime += responseTime;
                                    }
                                    
                                    // Peak usage hours
                                    analytics.peakUsageHours[hour] = (analytics.peakUsageHours[hour] || 0) + 1;
                                    
                                    // User activity tracking
                                    if (userId) {
                                        if (!analytics.userActivity[userId]) {
                                            analytics.userActivity[userId] = {
                                                totalRequests: 0,
                                                features: new Set(),
                                                lastActivity: logEntry.timestamp
                                            };
                                        }
                                        analytics.userActivity[userId].totalRequests++;
                                        analytics.userActivity[userId].features.add(feature);
                                        analytics.userActivity[userId].lastActivity = logEntry.timestamp;
                                    }
                                    
                                    // Error tracking by route
                                    if (logEntry.level === 'error') {
                                        analytics.errorsByRoute[internalPath] = 
                                            (analytics.errorsByRoute[internalPath] || 0) + 1;
                                    }
                                }
                            } catch (parseError) {
                                // Skip invalid JSON lines
                            }
                        }
                    } catch (fileError) {
                        console.error(`Error processing log file ${file.name}:`, fileError);
                    }
                }
            }

            // Calculate average response times
            Object.keys(analytics.routePerformance).forEach(route => {
                const perf = analytics.routePerformance[route];
                if (perf.count > 0) {
                    perf.avgTime = Math.round(perf.totalTime / perf.count);
                }
            });

            // Convert user activity Sets to counts
            Object.keys(analytics.userActivity).forEach(userId => {
                analytics.userActivity[userId].uniqueFeatures = analytics.userActivity[userId].features.size;
                delete analytics.userActivity[userId].features; // Remove Set object
            });
            
            return analytics;
        } catch (error) {
            throw new Error(`Failed to get routing analytics: ${error.message}`);
        }
    }

    /**
     * Get company feature usage report
     * Shows which HR features are most/least used
     */
    async getCompanyFeatureUsage(tenantId, days = 7) {
        try {
            const analytics = await this.getCompanyRoutingAnalytics(tenantId, days);
            
            const featureReport = {
                tenantId,
                companyName: analytics.companyName,
                period: analytics.period,
                totalAccess: analytics.totalCompanyRouteAccess,
                features: []
            };

            // Convert feature usage to sorted array
            const sortedFeatures = Object.entries(analytics.featureUsage)
                .sort(([,a], [,b]) => b - a)
                .map(([feature, count]) => ({
                    feature,
                    accessCount: count,
                    percentage: ((count / analytics.totalCompanyRouteAccess) * 100).toFixed(1)
                }));

            featureReport.features = sortedFeatures;
            
            return featureReport;
        } catch (error) {
            throw new Error(`Failed to get feature usage report: ${error.message}`);
        }
    }

    /**
     * Get detailed user activity tracking for a company
     * Shows what each user is doing in real-time and historically
     */
    async getUserActivityTracking(tenantId, options = {}) {
        try {
            const {
                userId = null,
                days = 7,
                activityType = null,
                includeRealTime = true,
                limit = 1000
            } = options;

            const tenant = await Tenant.findOne({ tenantId });
            if (!tenant) {
                throw new Error('Company not found');
            }

            const logFiles = await this.getCompanyLogFiles(tenantId);
            const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
            
            const userActivities = {
                tenantId,
                companyName: tenant.name,
                period: `${days} days`,
                totalActivities: 0,
                users: {},
                recentActivities: [],
                activitySummary: {
                    byType: {},
                    byUser: {},
                    byHour: {},
                    byDay: {}
                }
            };

            // Process log files for user activity data
            for (const file of logFiles) {
                if (file.type === 'application' && new Date(file.date) >= cutoffDate) {
                    try {
                        const content = await this.getLogFileContent(tenantId, file.name);
                        const lines = content.split('\n').filter(line => line.trim());
                        
                        for (const line of lines) {
                            try {
                                const logEntry = JSON.parse(line);
                                
                                // Filter for user activity entries
                                if (logEntry.eventType === 'user_activity' && 
                                    new Date(logEntry.timestamp) >= cutoffDate) {
                                    
                                    // Apply filters
                                    if (userId && logEntry.userId !== userId) continue;
                                    if (activityType && logEntry.activityType !== activityType) continue;
                                    
                                    userActivities.totalActivities++;
                                    
                                    const userKey = logEntry.userId;
                                    const activityTypeKey = logEntry.activityType;
                                    const hour = new Date(logEntry.timestamp).getHours();
                                    const day = logEntry.timestamp.split('T')[0];
                                    
                                    // Initialize user data if not exists
                                    if (!userActivities.users[userKey]) {
                                        userActivities.users[userKey] = {
                                            userId: logEntry.userId,
                                            userEmail: logEntry.userEmail,
                                            userName: logEntry.userName,
                                            userRole: logEntry.userRole,
                                            totalActivities: 0,
                                            activities: [],
                                            lastActivity: null,
                                            activityTypes: {},
                                            sessionsToday: 0,
                                            isOnline: false
                                        };
                                    }
                                    
                                    const user = userActivities.users[userKey];
                                    user.totalActivities++;
                                    user.lastActivity = logEntry.timestamp;
                                    
                                    // Check if user is currently online (activity within last 5 minutes)
                                    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                                    user.isOnline = new Date(logEntry.timestamp) > fiveMinutesAgo;
                                    
                                    // Track activity types per user
                                    user.activityTypes[activityTypeKey] = (user.activityTypes[activityTypeKey] || 0) + 1;
                                    
                                    // Add to recent activities (for real-time view)
                                    if (includeRealTime && userActivities.recentActivities.length < limit) {
                                        userActivities.recentActivities.push({
                                            userId: logEntry.userId,
                                            userEmail: logEntry.userEmail,
                                            userName: logEntry.userName,
                                            activityType: logEntry.activityType,
                                            internalPath: logEntry.internalPath,
                                            method: logEntry.method,
                                            timestamp: logEntry.timestamp,
                                            ip: logEntry.ip,
                                            userAgent: logEntry.userAgent
                                        });
                                    }
                                    
                                    // Update summary statistics
                                    userActivities.activitySummary.byType[activityTypeKey] = 
                                        (userActivities.activitySummary.byType[activityTypeKey] || 0) + 1;
                                    
                                    userActivities.activitySummary.byUser[userKey] = 
                                        (userActivities.activitySummary.byUser[userKey] || 0) + 1;
                                    
                                    userActivities.activitySummary.byHour[hour] = 
                                        (userActivities.activitySummary.byHour[hour] || 0) + 1;
                                    
                                    userActivities.activitySummary.byDay[day] = 
                                        (userActivities.activitySummary.byDay[day] || 0) + 1;
                                }
                            } catch (parseError) {
                                // Skip invalid JSON lines
                            }
                        }
                    } catch (fileError) {
                        console.error(`Error processing log file ${file.name}:`, fileError);
                    }
                }
            }

            // Sort recent activities by timestamp (newest first)
            userActivities.recentActivities.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );

            // Convert users object to array and sort by last activity
            userActivities.usersList = Object.values(userActivities.users)
                .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

            return userActivities;
        } catch (error) {
            throw new Error(`Failed to get user activity tracking: ${error.message}`);
        }
    }

    /**
     * Get real-time user sessions for a company
     * Shows currently active users and their current activities
     */
    async getRealTimeUserSessions(tenantId) {
        try {
            const tenant = await Tenant.findOne({ tenantId });
            if (!tenant) {
                throw new Error('Company not found');
            }

            // Get recent activities (last 30 minutes)
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const recentActivities = await this.getUserActivityTracking(tenantId, {
                days: 1, // Look at today only
                includeRealTime: true,
                limit: 500
            });

            const activeSessions = {
                tenantId,
                companyName: tenant.name,
                timestamp: new Date().toISOString(),
                activeUsers: [],
                totalActiveUsers: 0,
                sessionSummary: {
                    totalSessions: 0,
                    averageSessionDuration: 0,
                    mostActiveUser: null,
                    currentActivities: {}
                }
            };

            // Filter for truly active users (activity in last 30 minutes)
            const activeUserData = {};
            
            recentActivities.recentActivities.forEach(activity => {
                if (new Date(activity.timestamp) > thirtyMinutesAgo) {
                    const userId = activity.userId;
                    
                    if (!activeUserData[userId]) {
                        activeUserData[userId] = {
                            userId: activity.userId,
                            userEmail: activity.userEmail,
                            userName: activity.userName,
                            lastActivity: activity.timestamp,
                            currentPath: activity.internalPath,
                            currentActivity: activity.activityType,
                            activitiesCount: 0,
                            sessionStart: activity.timestamp,
                            ip: activity.ip,
                            userAgent: activity.userAgent
                        };
                    }
                    
                    const user = activeUserData[userId];
                    user.activitiesCount++;
                    
                    // Update to most recent activity
                    if (new Date(activity.timestamp) > new Date(user.lastActivity)) {
                        user.lastActivity = activity.timestamp;
                        user.currentPath = activity.internalPath;
                        user.currentActivity = activity.activityType;
                    }
                    
                    // Track current activities
                    activeSessions.sessionSummary.currentActivities[activity.activityType] = 
                        (activeSessions.sessionSummary.currentActivities[activity.activityType] || 0) + 1;
                }
            });

            activeSessions.activeUsers = Object.values(activeUserData)
                .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
            
            activeSessions.totalActiveUsers = activeSessions.activeUsers.length;
            activeSessions.sessionSummary.totalSessions = activeSessions.totalActiveUsers;

            // Find most active user
            if (activeSessions.activeUsers.length > 0) {
                activeSessions.sessionSummary.mostActiveUser = activeSessions.activeUsers
                    .reduce((prev, current) => 
                        (prev.activitiesCount > current.activitiesCount) ? prev : current
                    );
            }

            return activeSessions;
        } catch (error) {
            throw new Error(`Failed to get real-time user sessions: ${error.message}`);
        }
    }

    /**
     * Get user activity timeline for a specific user
     * Shows detailed chronological activity for a user
     */
    async getUserActivityTimeline(tenantId, userId, days = 1) {
        try {
            const userActivities = await this.getUserActivityTracking(tenantId, {
                userId,
                days,
                includeRealTime: true,
                limit: 10000
            });

            const timeline = {
                tenantId,
                companyName: userActivities.companyName,
                userId,
                period: `${days} days`,
                user: userActivities.users[userId] || null,
                timeline: [],
                summary: {
                    totalActivities: 0,
                    sessionsCount: 0,
                    averageSessionDuration: 0,
                    mostUsedFeatures: {},
                    activityPattern: {}
                }
            };

            if (!timeline.user) {
                return timeline; // User has no activities
            }

            // Build detailed timeline from recent activities
            const userTimelineActivities = userActivities.recentActivities
                .filter(activity => activity.userId === userId)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            timeline.timeline = userTimelineActivities;
            timeline.summary.totalActivities = userTimelineActivities.length;

            // Analyze activity patterns
            userTimelineActivities.forEach(activity => {
                const hour = new Date(activity.timestamp).getHours();
                const feature = activity.internalPath.split('/')[1] || 'dashboard';
                
                timeline.summary.mostUsedFeatures[feature] = 
                    (timeline.summary.mostUsedFeatures[feature] || 0) + 1;
                
                timeline.summary.activityPattern[hour] = 
                    (timeline.summary.activityPattern[hour] || 0) + 1;
            });

            return timeline;
        } catch (error) {
            throw new Error(`Failed to get user activity timeline: ${error.message}`);
        }
    }
}

export default new CompanyLogService();