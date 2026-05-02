/**
 * Security Event Tracking Service - PostgreSQL (Sequelize)
 * Tracks and analyzes security events
 */

import SecurityEvent from '../platform/system/models/securityEvent.model.js';
import { mainAppDb } from '../config/database.js';
import { Op, QueryTypes } from 'sequelize';

class SecurityEventTrackingService {
  constructor() {
    this.alertThresholds = {
      failed_login: { count: 5, timeWindow: 15 * 60 * 1000 },
      rate_limit_exceeded: { count: 3, timeWindow: 5 * 60 * 1000 },
      suspicious_activity: { count: 1, timeWindow: 0 },
      brute_force_attempt: { count: 10, timeWindow: 30 * 60 * 1000 },
      unauthorized_access_attempt: { count: 3, timeWindow: 10 * 60 * 1000 }
    };
  }

  /**
   * Log a security event
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

      const geolocation = await this.getGeolocation(ipAddress);

      const securityEvent = await SecurityEvent.create({
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

      await this.checkAlertThresholds(securityEvent);

      return securityEvent;
    } catch (error) {
      console.error('Error logging security event:', error);
      throw new Error(`Failed to log security event: ${error.message}`);
    }
  }

  /**
   * Get security events with filtering and pagination
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

    const where = {};

    if (tenantId) where.tenantId = tenantId;
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    if (ipAddress) where.ipAddress = ipAddress;
    if (userId) where.userId = userId;
    if (resolved !== undefined) where.resolved = resolved;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[Op.gte] = new Date(startDate);
      if (endDate) where.timestamp[Op.lte] = new Date(endDate);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await SecurityEvent.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit,
      offset,
      raw: true
    });

    return {
      events: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get security analytics dashboard data
   */
  async getSecurityAnalytics(options = {}) {
    const {
      tenantId,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      groupBy = 'day'
    } = options;

    const where = {
      timestamp: { [Op.between]: [startDate, endDate] }
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Get event counts by type and severity
    const eventsByType = await mainAppDb.query(`
      SELECT 
        event_type,
        severity,
        COUNT(*) as count
      FROM security_events
      WHERE timestamp >= :startDate AND timestamp <= :endDate
        ${tenantId ? 'AND tenant_id = :tenantId' : ''}
      GROUP BY event_type, severity
      ORDER BY count DESC
    `, {
      replacements: { startDate, endDate, tenantId },
      type: QueryTypes.SELECT
    });

    // Transform to match original format
    const eventsByTypeGrouped = {};
    eventsByType.forEach(row => {
      if (!eventsByTypeGrouped[row.event_type]) {
        eventsByTypeGrouped[row.event_type] = {
          _id: row.event_type,
          total: 0,
          severityBreakdown: []
        };
      }
      eventsByTypeGrouped[row.event_type].total += parseInt(row.count);
      eventsByTypeGrouped[row.event_type].severityBreakdown.push({
        severity: row.severity,
        count: parseInt(row.count)
      });
    });

    // Get top suspicious IPs
    const topSuspiciousIPs = await mainAppDb.query(`
      SELECT 
        ip_address,
        COUNT(*) as count,
        ARRAY_AGG(DISTINCT event_type) as event_types,
        MAX(timestamp) as last_seen,
        (geolocation)::jsonb as geolocation
      FROM security_events
      WHERE timestamp >= :startDate AND timestamp <= :endDate
        AND severity IN ('high', 'critical')
        ${tenantId ? 'AND tenant_id = :tenantId' : ''}
      GROUP BY ip_address, geolocation
      ORDER BY count DESC
      LIMIT 10
    `, {
      replacements: { startDate, endDate, tenantId },
      type: QueryTypes.SELECT
    });

    // Get time series data
    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = "TO_CHAR(timestamp, 'YYYY-MM-DD HH24')";
        break;
      case 'week':
        dateFormat = "TO_CHAR(timestamp, 'IYYY-IW')";
        break;
      case 'month':
        dateFormat = "TO_CHAR(timestamp, 'YYYY-MM')";
        break;
      default:
        dateFormat = "TO_CHAR(timestamp, 'YYYY-MM-DD')";
    }

    const timeSeriesData = await mainAppDb.query(`
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as total_events,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_events,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_events,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_events,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_events,
        COUNT(DISTINCT ip_address) as unique_ip_count,
        COUNT(DISTINCT user_id) as unique_user_count
      FROM security_events
      WHERE timestamp >= :startDate AND timestamp <= :endDate
        ${tenantId ? 'AND tenant_id = :tenantId' : ''}
      GROUP BY period
      ORDER BY period
    `, {
      replacements: { startDate, endDate, tenantId },
      type: QueryTypes.SELECT
    });

    // Get unresolved critical events
    const unresolvedCritical = await SecurityEvent.findAll({
      where: {
        ...where,
        severity: 'critical',
        resolved: false
      },
      order: [['timestamp', 'DESC']],
      limit: 10,
      raw: true
    });

    // Calculate summary statistics
    const totalEvents = await SecurityEvent.count({ where });
    const criticalEvents = await SecurityEvent.count({
      where: { ...where, severity: 'critical' }
    });
    const unresolvedEvents = await SecurityEvent.count({
      where: { ...where, resolved: false }
    });

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents,
        criticalEvents,
        unresolvedEvents,
        resolutionRate: totalEvents > 0 ? ((totalEvents - unresolvedEvents) / totalEvents) * 100 : 0
      },
      eventsByType: Object.values(eventsByTypeGrouped),
      topSuspiciousIPs,
      timeSeriesData,
      unresolvedCritical,
      generatedAt: new Date()
    };
  }

  /**
   * Check if event should trigger alerts
   */
  async checkAlertThresholds(securityEvent) {
    const threshold = this.alertThresholds[securityEvent.eventType];
    if (!threshold) return;

    const timeWindow = new Date(Date.now() - threshold.timeWindow);
    
    const recentEvents = await SecurityEvent.count({
      where: {
        tenantId: securityEvent.tenantId,
        eventType: securityEvent.eventType,
        ipAddress: securityEvent.ipAddress,
        timestamp: { [Op.gte]: timeWindow }
      }
    });

    if (recentEvents >= threshold.count) {
      await this.triggerSecurityAlert(securityEvent, recentEvents);
    }
  }

  /**
   * Trigger security alert
   */
  async triggerSecurityAlert(securityEvent, eventCount) {
    try {
      await SecurityEvent.update(
        { 
          alertSent: true, 
          alertSentAt: new Date() 
        },
        { where: { id: securityEvent.id } }
      );

      console.log(`🚨 SECURITY ALERT: ${securityEvent.eventType} threshold exceeded`, {
        tenantId: securityEvent.tenantId,
        eventType: securityEvent.eventType,
        severity: securityEvent.severity,
        ipAddress: securityEvent.ipAddress,
        eventCount,
        description: securityEvent.description
      });

      await this.logSecurityEvent({
        tenantId: securityEvent.tenantId,
        eventType: 'security_alert_triggered',
        severity: 'high',
        ipAddress: securityEvent.ipAddress,
        description: `Security alert triggered for ${securityEvent.eventType}`,
        details: {
          originalEventId: securityEvent.id,
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
   */
  async resolveSecurityEvent(eventId, resolutionData) {
    const { resolvedBy, resolutionNotes } = resolutionData;

    const [updated] = await SecurityEvent.update(
      {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes
      },
      {
        where: { id: eventId },
        returning: true
      }
    );

    if (!updated) {
      throw new Error('Security event not found');
    }

    return await SecurityEvent.findByPk(eventId);
  }

  /**
   * Get geolocation for IP address
   */
  async getGeolocation(ipAddress) {
    if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return {
        country: 'Local',
        region: 'Local',
        city: 'Local',
        latitude: 0,
        longitude: 0
      };
    }

    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      latitude: null,
      longitude: null
    };
  }

  /**
   * Sanitize request headers
   */
  sanitizeHeaders(headers) {
    if (!headers) return {};

    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }

  /**
   * Sanitize request body
   */
  sanitizeRequestBody(body) {
    if (!body) return {};

    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.apiKey;
    delete sanitized.secret;
    
    return sanitized;
  }

  /**
   * Get security metrics for tenant
   */
  async getTenantSecurityMetrics(tenantId, options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;

    const where = {
      tenantId,
      timestamp: { [Op.between]: [startDate, endDate] }
    };

    const [
      totalEvents,
      criticalEvents,
      unresolvedEvents,
      topEventTypes,
      uniqueIPs
    ] = await Promise.all([
      SecurityEvent.count({ where }),
      SecurityEvent.count({ where: { ...where, severity: 'critical' } }),
      SecurityEvent.count({ where: { ...where, resolved: false } }),
      mainAppDb.query(`
        SELECT event_type as "_id", COUNT(*) as count
        FROM security_events
        WHERE tenant_id = :tenantId
          AND timestamp >= :startDate AND timestamp <= :endDate
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 5
      `, {
        replacements: { tenantId, startDate, endDate },
        type: QueryTypes.SELECT
      }),
      mainAppDb.query(`
        SELECT DISTINCT ip_address
        FROM security_events
        WHERE tenant_id = :tenantId
          AND timestamp >= :startDate AND timestamp <= :endDate
      `, {
        replacements: { tenantId, startDate, endDate },
        type: QueryTypes.SELECT
      })
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
   * Calculate risk score
   */
  calculateRiskScore(metrics) {
    const { totalEvents, criticalEvents, unresolvedEvents, uniqueIPCount } = metrics;
    
    let score = 0;
    score += Math.min(totalEvents / 100 * 30, 30);
    score += Math.min(criticalEvents / 10 * 40, 40);
    score += Math.min(unresolvedEvents / 20 * 20, 20);
    score += Math.min(uniqueIPCount / 50 * 10, 10);
    
    return Math.min(Math.round(score), 100);
  }
}

export default new SecurityEventTrackingService();
