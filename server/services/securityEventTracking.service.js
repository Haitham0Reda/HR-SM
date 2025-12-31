import mongoose from 'mongoose';
import Tenant from '../platform/tenants/models/Tenant.js';

/**
 * Security Event Schema for MongoDB storage
 */
const securityEventSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'failed_login',
      'successful_login',
      'password_change',
      'account_lockout',
      'suspicious_activity',
      'rate_limit_exceeded',
      'unauthorized_access_attempt',
      'privilege_escalation_attempt',
      'data_access_violation',
      'license_validation_failure',
      'api_abuse',
      'malicious_request',
      'brute_force_attempt',
      'session_hijack_attempt',
      'csrf_attempt',
      'xss_attempt',
      'sql_injection_attempt',
      'file_upload_violation',
      'configuration_change',
      'admin_action'
    ],
    index: true
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    required: true,
    index: true
  },
  userId: { type: String, index: true },
  userEmail: String,
  ipAddress: { type: String, required: true, index: true },
  userAgent: String,
  requestPath: String,
  requestMethod: String,
  requestHeaders: mongoose.Schema.Types.Mixed,
  requestBody: mongoose.Schema.Types.Mixed,
  responseStatus: Number,
  description: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  geolocation: {
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  resolved: { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date,
  resolutionNotes: String,
  alertSent: { type: Boolean, default: false },
  alertSentAt: Date,
  correlationId: String,
  sessionId: String,
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'security_events'
});

// Indexes for performance
securityEventSchema.index({ tenantId: 1, timestamp: -1 });
securityEventSchema.index({ eventType: 1, severity: 1 });
securityEventSchema.index({ ipAddress: 1, timestamp: -1 });
securityEventSchema.index({ resolved: 1, severity: 1 });
securityEventSchema.index({ timestamp: -1 }); // For time-based queries

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);

/**
 * Security Event Tracking Service
 * Tracks and analyzes security events with MongoDB storage
 */
class SecurityEventTrackingService {
  constructor() {
    this.alertThresholds = {
      failed_login: { count: 5, timeWindow: 15 * 60 * 1000 }, // 5 attempts in 15 minutes
      rate_limit_exceeded: { count: 3, timeWindow: 5 * 60 * 1000 }, // 3 times in 5 minutes
      suspicious_activity: { count: 1, timeWindow: 0 }, // Immediate alert
      brute_force_attempt: { count: 10, timeWindow: 30 * 60 * 1000 }, // 10 attempts in 30 minutes
      unauthorized_access_attempt: { count: 3, timeWindow: 10 * 60 * 1000 } // 3 attempts in 10 minutes
    };
  }

  /**
   * Log a security event
   * @param {Object} eventData - Security event data
   * @returns {Promise<Object>} Created security event
   */
  async logSecurityEvent(eventData) {
    try {
      const {
        tenantId,
        eventType,
        severity,
        userId,
        userEmail,
        ipAddress,
        userAgent,
        requestPath,
        requestMethod,
        requestHeaders,
        requestBody,
        responseStatus,
        description,
        details,
        correlationId,
        sessionId
      } = eventData;

      // Get geolocation for IP address (simplified - in production use a geolocation service)
      const geolocation = await this.getGeolocation(ipAddress);

      const securityEvent = new SecurityEvent({
        tenantId,
        eventType,
        severity,
        userId,
        userEmail,
        ipAddress,
        userAgent,
        requestPath,
        requestMethod,
        requestHeaders: this.sanitizeHeaders(requestHeaders),
        requestBody: this.sanitizeRequestBody(requestBody),
        responseStatus,
        description,
        details,
        geolocation,
        correlationId,
        sessionId,
        timestamp: new Date()
      });

      await securityEvent.save();

      // Check if this event should trigger an alert
      await this.checkAlertThresholds(securityEvent);

      return securityEvent;
    } catch (error) {
      console.error('Error logging security event:', error);
      throw new Error(`Failed to log security event: ${error.message}`);
    }
  }

  /**
   * Get security events with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Security events with pagination
   */
  async getSecurityEvents(filters = {}, options = {}) {
    const {
      tenantId,
      eventType,
      severity,
      ipAddress,
      userId,
      resolved,
      startDate,
      endDate
    } = filters;

    const {
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = options;

    const query = {};

    if (tenantId) query.tenantId = tenantId;
    if (eventType) query.eventType = eventType;
    if (severity) query.severity = severity;
    if (ipAddress) query.ipAddress = ipAddress;
    if (userId) query.userId = userId;
    if (resolved !== undefined) query.resolved = resolved;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      SecurityEvent.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      SecurityEvent.countDocuments(query)
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get security analytics dashboard data
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Security analytics data
   */
  async getSecurityAnalytics(options = {}) {
    const {
      tenantId,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      groupBy = 'day'
    } = options;

    const matchStage = {
      timestamp: { $gte: startDate, $lte: endDate }
    };

    if (tenantId) {
      matchStage.tenantId = tenantId;
    }

    // Get event counts by type and severity
    const eventsByType = await SecurityEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            eventType: '$eventType',
            severity: '$severity'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.eventType',
          total: { $sum: '$count' },
          severityBreakdown: {
            $push: {
              severity: '$_id.severity',
              count: '$count'
            }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get top IP addresses with suspicious activity
    const topSuspiciousIPs = await SecurityEvent.aggregate([
      {
        $match: {
          ...matchStage,
          severity: { $in: ['high', 'critical'] }
        }
      },
      {
        $group: {
          _id: '$ipAddress',
          count: { $sum: 1 },
          eventTypes: { $addToSet: '$eventType' },
          lastSeen: { $max: '$timestamp' },
          geolocation: { $first: '$geolocation' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get time series data
    let groupFormat;
    switch (groupBy) {
      case 'hour':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
        break;
      case 'week':
        groupFormat = {
          year: { $year: '$timestamp' },
          week: { $week: '$timestamp' }
        };
        break;
      case 'month':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' }
        };
        break;
      default: // day
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
    }

    const timeSeriesData = await SecurityEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupFormat,
          totalEvents: { $sum: 1 },
          criticalEvents: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          },
          highEvents: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
          },
          mediumEvents: {
            $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] }
          },
          lowEvents: {
            $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] }
          },
          uniqueIPs: { $addToSet: '$ipAddress' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          uniqueIPCount: { $size: '$uniqueIPs' },
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $project: {
          uniqueIPs: 0,
          uniqueUsers: 0
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    // Get unresolved critical events
    const unresolvedCritical = await SecurityEvent.find({
      ...matchStage,
      severity: 'critical',
      resolved: false
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();

    // Calculate summary statistics
    const totalEvents = await SecurityEvent.countDocuments(matchStage);
    const criticalEvents = await SecurityEvent.countDocuments({
      ...matchStage,
      severity: 'critical'
    });
    const unresolvedEvents = await SecurityEvent.countDocuments({
      ...matchStage,
      resolved: false
    });

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents,
        criticalEvents,
        unresolvedEvents,
        resolutionRate: totalEvents > 0 ? ((totalEvents - unresolvedEvents) / totalEvents) * 100 : 0
      },
      eventsByType,
      topSuspiciousIPs,
      timeSeriesData,
      unresolvedCritical,
      generatedAt: new Date()
    };
  }

  /**
   * Check if event should trigger alerts based on thresholds
   * @param {Object} securityEvent - Security event
   */
  async checkAlertThresholds(securityEvent) {
    const threshold = this.alertThresholds[securityEvent.eventType];
    if (!threshold) return;

    const timeWindow = new Date(Date.now() - threshold.timeWindow);
    
    const recentEvents = await SecurityEvent.countDocuments({
      tenantId: securityEvent.tenantId,
      eventType: securityEvent.eventType,
      ipAddress: securityEvent.ipAddress,
      timestamp: { $gte: timeWindow }
    });

    if (recentEvents >= threshold.count) {
      await this.triggerSecurityAlert(securityEvent, recentEvents);
    }
  }

  /**
   * Trigger security alert
   * @param {Object} securityEvent - Security event that triggered alert
   * @param {number} eventCount - Number of events that triggered the alert
   */
  async triggerSecurityAlert(securityEvent, eventCount) {
    try {
      // Mark event as having alert sent
      await SecurityEvent.updateOne(
        { _id: securityEvent._id },
        { 
          alertSent: true, 
          alertSentAt: new Date() 
        }
      );

      // In a real implementation, this would send notifications via email, Slack, etc.
      console.log(`🚨 SECURITY ALERT: ${securityEvent.eventType} threshold exceeded`, {
        tenantId: securityEvent.tenantId,
        eventType: securityEvent.eventType,
        severity: securityEvent.severity,
        ipAddress: securityEvent.ipAddress,
        eventCount,
        description: securityEvent.description
      });

      // Log the alert as a separate security event
      await this.logSecurityEvent({
        tenantId: securityEvent.tenantId,
        eventType: 'security_alert_triggered',
        severity: 'high',
        ipAddress: securityEvent.ipAddress,
        description: `Security alert triggered for ${securityEvent.eventType}`,
        details: {
          originalEventId: securityEvent._id,
          triggerEventType: securityEvent.eventType,
          eventCount,
          threshold: this.alertThresholds[securityEvent.eventType]
        }
      });
    } catch (error) {
      console.error('Error triggering security alert:', error);
    }
  }

  /**
   * Resolve security event
   * @param {string} eventId - Security event ID
   * @param {Object} resolutionData - Resolution data
   * @returns {Promise<Object>} Updated security event
   */
  async resolveSecurityEvent(eventId, resolutionData) {
    const { resolvedBy, resolutionNotes } = resolutionData;

    const updatedEvent = await SecurityEvent.findByIdAndUpdate(
      eventId,
      {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes
      },
      { new: true }
    );

    if (!updatedEvent) {
      throw new Error('Security event not found');
    }

    return updatedEvent;
  }

  /**
   * Get geolocation for IP address (simplified implementation)
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Geolocation data
   */
  async getGeolocation(ipAddress) {
    // In production, use a real geolocation service like MaxMind or IPStack
    // This is a simplified implementation
    if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return {
        country: 'Local',
        region: 'Local',
        city: 'Local',
        latitude: 0,
        longitude: 0
      };
    }

    // Return placeholder data
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      latitude: null,
      longitude: null
    };
  }

  /**
   * Sanitize request headers for storage
   * @param {Object} headers - Request headers
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    if (!headers) return {};

    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }

  /**
   * Sanitize request body for storage
   * @param {Object} body - Request body
   * @returns {Object} Sanitized body
   */
  sanitizeRequestBody(body) {
    if (!body) return {};

    const sanitized = { ...body };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.apiKey;
    delete sanitized.secret;
    
    return sanitized;
  }

  /**
   * Get security metrics for tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Security metrics
   */
  async getTenantSecurityMetrics(tenantId, options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;

    const matchStage = {
      tenantId,
      timestamp: { $gte: startDate, $lte: endDate }
    };

    const [
      totalEvents,
      criticalEvents,
      unresolvedEvents,
      topEventTypes,
      uniqueIPs
    ] = await Promise.all([
      SecurityEvent.countDocuments(matchStage),
      SecurityEvent.countDocuments({ ...matchStage, severity: 'critical' }),
      SecurityEvent.countDocuments({ ...matchStage, resolved: false }),
      SecurityEvent.aggregate([
        { $match: matchStage },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      SecurityEvent.distinct('ipAddress', matchStage)
    ]);

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      totalEvents,
      criticalEvents,
      unresolvedEvents,
      resolutionRate: totalEvents > 0 ? ((totalEvents - unresolvedEvents) / totalEvents) * 100 : 0,
      topEventTypes,
      uniqueIPCount: uniqueIPs.length,
      riskScore: this.calculateRiskScore({
        totalEvents,
        criticalEvents,
        unresolvedEvents,
        uniqueIPCount: uniqueIPs.length
      })
    };
  }

  /**
   * Calculate risk score based on security metrics
   * @param {Object} metrics - Security metrics
   * @returns {number} Risk score (0-100)
   */
  calculateRiskScore(metrics) {
    const { totalEvents, criticalEvents, unresolvedEvents, uniqueIPCount } = metrics;
    
    let score = 0;
    
    // Base score from total events (0-30 points)
    score += Math.min(totalEvents / 100 * 30, 30);
    
    // Critical events weight (0-40 points)
    score += Math.min(criticalEvents / 10 * 40, 40);
    
    // Unresolved events weight (0-20 points)
    score += Math.min(unresolvedEvents / 20 * 20, 20);
    
    // Unique IP diversity (0-10 points)
    score += Math.min(uniqueIPCount / 50 * 10, 10);
    
    return Math.min(Math.round(score), 100);
  }
}

export default new SecurityEventTrackingService();