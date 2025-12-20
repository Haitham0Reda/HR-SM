import mongoose from 'mongoose';
import { companyLogger } from '../utils/companyLogger.js';

class UserAccessAnalyticsService {
  constructor() {
    this.accessPatterns = new Map();
    this.anomalyThresholds = {
      maxLoginAttemptsPerHour: 10,
      maxFailedLoginsPerDay: 5,
      maxUniqueIPsPerDay: 3,
      maxSessionDurationHours: 12,
      suspiciousHours: [0, 1, 2, 3, 4, 5] // Late night/early morning
    };
  }

  /**
   * Track user access event
   */
  async trackAccessEvent(tenantId, userId, eventData) {
    try {
      const {
        eventType, // 'login', 'logout', 'data_access', 'module_access', 'failed_login'
        ipAddress,
        userAgent,
        location,
        sessionId,
        resourceAccessed,
        success = true,
        timestamp = new Date()
      } = eventData;

      // Create access event record
      const accessEvent = {
        tenantId,
        userId,
        eventType,
        ipAddress,
        userAgent,
        location,
        sessionId,
        resourceAccessed,
        success,
        timestamp,
        metadata: {
          browser: this.parseBrowser(userAgent),
          device: this.parseDevice(userAgent),
          os: this.parseOS(userAgent)
        }
      };

      // Store in database (you would create an AccessEvent model)
      await this.storeAccessEvent(accessEvent);

      // Update real-time patterns
      this.updateAccessPatterns(tenantId, userId, accessEvent);

      // Check for anomalies
      const anomalies = await this.detectAnomalies(tenantId, userId, accessEvent);
      if (anomalies.length > 0) {
        await this.handleAnomalies(tenantId, userId, anomalies);
      }

      // Log for compliance
      companyLogger(tenantId).compliance('User access tracked', {
        userId,
        eventType,
        ipAddress,
        success,
        anomaliesDetected: anomalies.length,
        compliance: true,
        audit: true
      });

      return { success: true, anomalies };

    } catch (error) {
      companyLogger(tenantId).error('Failed to track access event', {
        error: error.message,
        userId,
        eventData
      });
      throw error;
    }
  }

  /**
   * Analyze user access patterns for a specific period
   */
  async analyzeAccessPatterns(tenantId, startDate, endDate, options = {}) {
    try {
      const {
        includeFailedAttempts = true,
        groupByUser = true,
        detectAnomalies = true
      } = options;

      // Get access events from database
      const accessEvents = await this.getAccessEvents(tenantId, startDate, endDate);

      // Analyze patterns
      const analysis = {
        summary: {
          totalEvents: accessEvents.length,
          uniqueUsers: new Set(accessEvents.map(e => e.userId)).size,
          uniqueIPs: new Set(accessEvents.map(e => e.ipAddress)).size,
          successfulLogins: accessEvents.filter(e => e.eventType === 'login' && e.success).length,
          failedLogins: accessEvents.filter(e => e.eventType === 'login' && !e.success).length,
          period: { startDate, endDate }
        },
        patterns: {},
        anomalies: [],
        recommendations: []
      };

      if (groupByUser) {
        analysis.patterns.byUser = this.analyzeByUser(accessEvents);
      }

      analysis.patterns.byTime = this.analyzeByTime(accessEvents);
      analysis.patterns.byLocation = this.analyzeByLocation(accessEvents);
      analysis.patterns.byDevice = this.analyzeByDevice(accessEvents);

      if (detectAnomalies) {
        analysis.anomalies = this.identifyPatternAnomalies(accessEvents);
      }

      analysis.recommendations = this.generateAccessRecommendations(analysis);

      return analysis;

    } catch (error) {
      companyLogger(tenantId).error('Failed to analyze access patterns', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Generate user access compliance report
   */
  async generateAccessComplianceReport(tenantId, startDate, endDate) {
    try {
      const analysis = await this.analyzeAccessPatterns(tenantId, startDate, endDate, {
        includeFailedAttempts: true,
        groupByUser: true,
        detectAnomalies: true
      });

      // Get additional compliance data
      const privilegedAccess = await this.getPrivilegedAccessEvents(tenantId, startDate, endDate);
      const dataAccessEvents = await this.getDataAccessEvents(tenantId, startDate, endDate);
      const sessionAnalysis = await this.analyzeSessionPatterns(tenantId, startDate, endDate);

      const complianceReport = {
        reportType: 'user_access_compliance',
        tenantId,
        period: { startDate, endDate },
        generatedAt: new Date(),
        
        summary: {
          ...analysis.summary,
          privilegedAccessEvents: privilegedAccess.length,
          dataAccessEvents: dataAccessEvents.length,
          averageSessionDuration: sessionAnalysis.averageDuration,
          complianceScore: this.calculateComplianceScore(analysis, privilegedAccess, sessionAnalysis)
        },

        accessPatterns: analysis.patterns,
        anomalies: analysis.anomalies,
        
        privilegedAccess: {
          events: privilegedAccess,
          analysis: this.analyzePrivilegedAccess(privilegedAccess)
        },

        dataAccess: {
          events: dataAccessEvents.slice(0, 100), // Limit for report size
          analysis: this.analyzeDataAccess(dataAccessEvents)
        },

        sessionAnalysis,
        
        complianceChecks: {
          failedLoginRatio: analysis.summary.failedLogins / (analysis.summary.successfulLogins + analysis.summary.failedLogins),
          offHoursAccess: this.calculateOffHoursAccess(analysis.patterns.byTime),
          multiLocationAccess: this.calculateMultiLocationAccess(analysis.patterns.byLocation),
          suspiciousPatterns: analysis.anomalies.filter(a => a.severity === 'high').length
        },

        recommendations: [
          ...analysis.recommendations,
          ...this.generateComplianceRecommendations(analysis, privilegedAccess, sessionAnalysis)
        ]
      };

      // Log report generation
      companyLogger(tenantId).compliance('User access compliance report generated', {
        reportType: 'user_access_compliance',
        period: { startDate, endDate },
        complianceScore: complianceReport.summary.complianceScore,
        anomaliesCount: analysis.anomalies.length,
        compliance: true,
        audit: true
      });

      return complianceReport;

    } catch (error) {
      companyLogger(tenantId).error('Failed to generate access compliance report', {
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Detect real-time access anomalies
   */
  async detectAnomalies(tenantId, userId, currentEvent) {
    const anomalies = [];

    try {
      // Get recent events for this user
      const recentEvents = await this.getRecentUserEvents(tenantId, userId, 24); // Last 24 hours

      // Check for excessive failed logins
      const recentFailedLogins = recentEvents.filter(e => 
        e.eventType === 'login' && !e.success &&
        e.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
      );

      if (recentFailedLogins.length >= this.anomalyThresholds.maxLoginAttemptsPerHour) {
        anomalies.push({
          type: 'excessive_failed_logins',
          severity: 'high',
          description: `${recentFailedLogins.length} failed login attempts in the last hour`,
          count: recentFailedLogins.length,
          threshold: this.anomalyThresholds.maxLoginAttemptsPerHour,
          timestamp: new Date()
        });
      }

      // Check for multiple IP addresses
      const uniqueIPs = new Set(recentEvents.map(e => e.ipAddress));
      if (uniqueIPs.size > this.anomalyThresholds.maxUniqueIPsPerDay) {
        anomalies.push({
          type: 'multiple_ip_addresses',
          severity: 'medium',
          description: `Access from ${uniqueIPs.size} different IP addresses in 24 hours`,
          ipAddresses: Array.from(uniqueIPs),
          count: uniqueIPs.size,
          threshold: this.anomalyThresholds.maxUniqueIPsPerDay,
          timestamp: new Date()
        });
      }

      // Check for off-hours access
      const currentHour = currentEvent.timestamp.getHours();
      if (this.anomalyThresholds.suspiciousHours.includes(currentHour)) {
        anomalies.push({
          type: 'off_hours_access',
          severity: 'low',
          description: `Access during suspicious hours (${currentHour}:00)`,
          hour: currentHour,
          timestamp: new Date()
        });
      }

      // Check for unusual location
      if (currentEvent.location) {
        const recentLocations = recentEvents
          .filter(e => e.location)
          .map(e => e.location);
        
        const isNewLocation = !recentLocations.includes(currentEvent.location);
        if (isNewLocation && recentLocations.length > 0) {
          anomalies.push({
            type: 'new_location_access',
            severity: 'medium',
            description: `Access from new location: ${currentEvent.location}`,
            newLocation: currentEvent.location,
            previousLocations: recentLocations,
            timestamp: new Date()
          });
        }
      }

      return anomalies;

    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      return [];
    }
  }

  /**
   * Handle detected anomalies
   */
  async handleAnomalies(tenantId, userId, anomalies) {
    try {
      for (const anomaly of anomalies) {
        // Log the anomaly
        companyLogger(tenantId).compliance('Access anomaly detected', {
          userId,
          anomalyType: anomaly.type,
          severity: anomaly.severity,
          description: anomaly.description,
          details: anomaly,
          compliance: true,
          audit: true,
          security: true
        });

        // Take action based on severity
        if (anomaly.severity === 'high') {
          // High severity - immediate action required
          await this.triggerSecurityAlert(tenantId, userId, anomaly);
          
          // Consider temporary account suspension for excessive failed logins
          if (anomaly.type === 'excessive_failed_logins') {
            await this.considerAccountSuspension(tenantId, userId, anomaly);
          }
        } else if (anomaly.severity === 'medium') {
          // Medium severity - flag for review
          await this.flagForReview(tenantId, userId, anomaly);
        }
        
        // Store anomaly for reporting
        await this.storeAnomaly(tenantId, userId, anomaly);
      }

    } catch (error) {
      console.error('Failed to handle anomalies:', error);
    }
  }

  /**
   * Helper methods for analysis
   */
  analyzeByUser(accessEvents) {
    const userStats = {};

    accessEvents.forEach(event => {
      if (!userStats[event.userId]) {
        userStats[event.userId] = {
          totalEvents: 0,
          successfulLogins: 0,
          failedLogins: 0,
          uniqueIPs: new Set(),
          uniqueDevices: new Set(),
          firstAccess: event.timestamp,
          lastAccess: event.timestamp,
          accessHours: {}
        };
      }

      const stats = userStats[event.userId];
      stats.totalEvents++;
      
      if (event.eventType === 'login') {
        if (event.success) {
          stats.successfulLogins++;
        } else {
          stats.failedLogins++;
        }
      }

      stats.uniqueIPs.add(event.ipAddress);
      stats.uniqueDevices.add(event.userAgent);
      
      if (event.timestamp < stats.firstAccess) {
        stats.firstAccess = event.timestamp;
      }
      if (event.timestamp > stats.lastAccess) {
        stats.lastAccess = event.timestamp;
      }

      const hour = event.timestamp.getHours();
      stats.accessHours[hour] = (stats.accessHours[hour] || 0) + 1;
    });

    // Convert Sets to counts
    Object.keys(userStats).forEach(userId => {
      const stats = userStats[userId];
      stats.uniqueIPCount = stats.uniqueIPs.size;
      stats.uniqueDeviceCount = stats.uniqueDevices.size;
      delete stats.uniqueIPs;
      delete stats.uniqueDevices;
    });

    return userStats;
  }

  analyzeByTime(accessEvents) {
    const hourlyStats = new Array(24).fill(0);
    const dailyStats = {};
    const weeklyStats = {};

    accessEvents.forEach(event => {
      const hour = event.timestamp.getHours();
      const date = event.timestamp.toISOString().split('T')[0];
      const dayOfWeek = event.timestamp.getDay();

      hourlyStats[hour]++;
      dailyStats[date] = (dailyStats[date] || 0) + 1;
      weeklyStats[dayOfWeek] = (weeklyStats[dayOfWeek] || 0) + 1;
    });

    return {
      hourly: hourlyStats,
      daily: dailyStats,
      weekly: weeklyStats
    };
  }

  analyzeByLocation(accessEvents) {
    const locationStats = {};

    accessEvents.forEach(event => {
      if (event.location) {
        locationStats[event.location] = (locationStats[event.location] || 0) + 1;
      }
    });

    return locationStats;
  }

  analyzeByDevice(accessEvents) {
    const deviceStats = {};
    const browserStats = {};
    const osStats = {};

    accessEvents.forEach(event => {
      if (event.metadata) {
        if (event.metadata.device) {
          deviceStats[event.metadata.device] = (deviceStats[event.metadata.device] || 0) + 1;
        }
        if (event.metadata.browser) {
          browserStats[event.metadata.browser] = (browserStats[event.metadata.browser] || 0) + 1;
        }
        if (event.metadata.os) {
          osStats[event.metadata.os] = (osStats[event.metadata.os] || 0) + 1;
        }
      }
    });

    return {
      devices: deviceStats,
      browsers: browserStats,
      operatingSystems: osStats
    };
  }

  calculateComplianceScore(analysis, privilegedAccess, sessionAnalysis) {
    let score = 100;

    // Deduct points for high failed login ratio
    const failedRatio = analysis.summary.failedLogins / (analysis.summary.successfulLogins + analysis.summary.failedLogins);
    if (failedRatio > 0.1) score -= 10; // More than 10% failed logins
    if (failedRatio > 0.2) score -= 10; // More than 20% failed logins

    // Deduct points for anomalies
    const highSeverityAnomalies = analysis.anomalies.filter(a => a.severity === 'high').length;
    const mediumSeverityAnomalies = analysis.anomalies.filter(a => a.severity === 'medium').length;
    
    score -= highSeverityAnomalies * 15;
    score -= mediumSeverityAnomalies * 5;

    // Deduct points for excessive privileged access
    if (privilegedAccess.length > analysis.summary.totalEvents * 0.1) {
      score -= 10; // More than 10% privileged access
    }

    // Deduct points for very long sessions
    if (sessionAnalysis.averageDuration > 8 * 60 * 60 * 1000) { // 8 hours
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Additional helper methods would be implemented here...
  async storeAccessEvent(accessEvent) {
    // Implementation would store in database
    console.log('Storing access event:', accessEvent.eventType);
  }

  async getAccessEvents(tenantId, startDate, endDate) {
    // Implementation would query database
    return [];
  }

  async getRecentUserEvents(tenantId, userId, hours) {
    // Implementation would query recent events
    return [];
  }

  updateAccessPatterns(tenantId, userId, accessEvent) {
    // Update in-memory patterns for real-time analysis
  }

  parseBrowser(userAgent) {
    // Parse browser from user agent
    return 'Chrome'; // Simplified
  }

  parseDevice(userAgent) {
    // Parse device from user agent
    return 'Desktop'; // Simplified
  }

  parseOS(userAgent) {
    // Parse OS from user agent
    return 'Windows'; // Simplified
  }

  identifyPatternAnomalies(accessEvents) {
    // Identify anomalies in access patterns
    return [];
  }

  generateAccessRecommendations(analysis) {
    // Generate recommendations based on analysis
    return [];
  }

  async getPrivilegedAccessEvents(tenantId, startDate, endDate) {
    // Get privileged access events
    return [];
  }

  async getDataAccessEvents(tenantId, startDate, endDate) {
    // Get data access events
    return [];
  }

  async analyzeSessionPatterns(tenantId, startDate, endDate) {
    // Analyze session patterns
    return { averageDuration: 2 * 60 * 60 * 1000 }; // 2 hours
  }

  analyzePrivilegedAccess(privilegedAccess) {
    // Analyze privileged access patterns
    return {};
  }

  analyzeDataAccess(dataAccessEvents) {
    // Analyze data access patterns
    return {};
  }

  calculateOffHoursAccess(timePatterns) {
    // Calculate off-hours access percentage
    return 0;
  }

  calculateMultiLocationAccess(locationPatterns) {
    // Calculate multi-location access patterns
    return 0;
  }

  generateComplianceRecommendations(analysis, privilegedAccess, sessionAnalysis) {
    // Generate compliance-specific recommendations
    return [];
  }

  async triggerSecurityAlert(tenantId, userId, anomaly) {
    // Trigger security alert
    console.log('Security alert triggered:', anomaly.type);
  }

  async considerAccountSuspension(tenantId, userId, anomaly) {
    // Consider account suspension
    console.log('Considering account suspension for user:', userId);
  }

  async flagForReview(tenantId, userId, anomaly) {
    // Flag for manual review
    console.log('Flagged for review:', anomaly.type);
  }

  async storeAnomaly(tenantId, userId, anomaly) {
    // Store anomaly in database
    console.log('Storing anomaly:', anomaly.type);
  }
}

export default new UserAccessAnalyticsService();