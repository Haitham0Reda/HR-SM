import mongoose from 'mongoose';
import DataRetentionPolicy from '../models/DataRetentionPolicy.js';
import DataArchive from '../models/DataArchive.js';
import { companyLogger } from '../utils/companyLogger.js';
import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

class ComplianceReportingService {
  constructor() {
    this.reportTypes = [
      'data_retention_compliance',
      'audit_trail_report',
      'user_access_patterns',
      'license_compliance',
      'data_processing_activities',
      'security_incidents',
      'gdpr_compliance',
      'data_breach_report'
    ];
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(tenantId, reportType, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        endDate = new Date(),
        format = 'pdf', // pdf, excel, json
        includeDetails = true,
        userId = null
      } = options;

      companyLogger(tenantId).compliance('Generating compliance report', {
        reportType,
        startDate,
        endDate,
        format,
        requestedBy: userId,
        compliance: true,
        audit: true
      });

      let reportData;
      switch (reportType) {
        case 'data_retention_compliance':
          reportData = await this.generateDataRetentionReport(tenantId, startDate, endDate, includeDetails);
          break;
        case 'audit_trail_report':
          reportData = await this.generateAuditTrailReport(tenantId, startDate, endDate, includeDetails);
          break;
        case 'user_access_patterns':
          reportData = await this.generateUserAccessReport(tenantId, startDate, endDate, includeDetails);
          break;
        case 'license_compliance':
          reportData = await this.generateLicenseComplianceReport(tenantId, startDate, endDate, includeDetails);
          break;
        case 'data_processing_activities':
          reportData = await this.generateDataProcessingReport(tenantId, startDate, endDate, includeDetails);
          break;
        case 'security_incidents':
          reportData = await this.generateSecurityIncidentReport(tenantId, startDate, endDate, includeDetails);
          break;
        case 'gdpr_compliance':
          reportData = await this.generateGDPRComplianceReport(tenantId, startDate, endDate, includeDetails);
          break;
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Format the report
      let formattedReport;
      switch (format) {
        case 'pdf':
          formattedReport = await this.formatReportAsPDF(reportData, reportType);
          break;
        case 'excel':
          formattedReport = await this.formatReportAsExcel(reportData, reportType);
          break;
        case 'json':
          formattedReport = {
            data: reportData,
            contentType: 'application/json'
          };
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Log report generation
      companyLogger(tenantId).compliance('Compliance report generated', {
        reportType,
        format,
        recordCount: reportData.summary?.totalRecords || 0,
        generatedBy: userId,
        compliance: true,
        audit: true
      });

      return {
        reportType,
        format,
        generatedAt: new Date(),
        generatedBy: userId,
        summary: reportData.summary,
        ...formattedReport
      };

    } catch (error) {
      companyLogger(tenantId).error('Failed to generate compliance report', {
        error: error.message,
        reportType,
        options
      });
      throw error;
    }
  }

  /**
   * Generate data retention compliance report
   */
  async generateDataRetentionReport(tenantId, startDate, endDate, includeDetails) {
    try {
      // Get retention policies
      const policies = await DataRetentionPolicy.find({ tenantId })
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

      // Get archives created in the period
      const archives = await DataArchive.find({
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('retentionPolicyId', 'policyName dataType');

      // Calculate compliance metrics
      const activePolicies = policies.filter(p => p.status === 'active');
      const totalExecutions = policies.reduce((sum, p) => sum + p.statistics.successfulExecutions, 0);
      const failedExecutions = policies.reduce((sum, p) => sum + p.statistics.failedExecutions, 0);
      const totalRecordsProcessed = policies.reduce((sum, p) => sum + p.statistics.totalRecordsProcessed, 0);
      const totalRecordsArchived = policies.reduce((sum, p) => sum + p.statistics.recordsArchived, 0);
      const totalRecordsDeleted = policies.reduce((sum, p) => sum + p.statistics.recordsDeleted, 0);

      // Policy compliance status
      const policyCompliance = activePolicies.map(policy => {
        const isCompliant = !policy.statistics.lastError && 
                           policy.lastExecuted && 
                           policy.lastExecuted > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Within last 7 days

        return {
          policyId: policy._id,
          policyName: policy.policyName,
          dataType: policy.dataType,
          status: isCompliant ? 'compliant' : 'non-compliant',
          lastExecuted: policy.lastExecuted,
          lastError: policy.statistics.lastError,
          retentionPeriod: policy.retentionPeriod,
          totalProcessed: policy.statistics.totalRecordsProcessed,
          successRate: policy.statistics.successfulExecutions / 
                      (policy.statistics.successfulExecutions + policy.statistics.failedExecutions) * 100 || 0
        };
      });

      // Archive analysis
      const archiveAnalysis = {
        totalArchives: archives.length,
        totalArchivedRecords: archives.reduce((sum, a) => sum + a.recordCount, 0),
        totalArchiveSize: archives.reduce((sum, a) => sum + (a.fileInfo.compressedSize || a.fileInfo.originalSize), 0),
        archivesByDataType: {},
        archivesByStatus: {}
      };

      archives.forEach(archive => {
        // By data type
        if (!archiveAnalysis.archivesByDataType[archive.dataType]) {
          archiveAnalysis.archivesByDataType[archive.dataType] = {
            count: 0,
            records: 0,
            size: 0
          };
        }
        archiveAnalysis.archivesByDataType[archive.dataType].count++;
        archiveAnalysis.archivesByDataType[archive.dataType].records += archive.recordCount;
        archiveAnalysis.archivesByDataType[archive.dataType].size += (archive.fileInfo.compressedSize || archive.fileInfo.originalSize);

        // By status
        archiveAnalysis.archivesByStatus[archive.status] = (archiveAnalysis.archivesByStatus[archive.status] || 0) + 1;
      });

      const summary = {
        reportType: 'data_retention_compliance',
        tenantId,
        period: { startDate, endDate },
        totalPolicies: policies.length,
        activePolicies: activePolicies.length,
        compliantPolicies: policyCompliance.filter(p => p.status === 'compliant').length,
        totalExecutions,
        failedExecutions,
        successRate: totalExecutions > 0 ? ((totalExecutions - failedExecutions) / totalExecutions * 100) : 0,
        totalRecordsProcessed,
        totalRecordsArchived,
        totalRecordsDeleted,
        ...archiveAnalysis
      };

      const reportData = {
        summary,
        policies: includeDetails ? policies : policyCompliance,
        archives: includeDetails ? archives : archiveAnalysis,
        policyCompliance,
        recommendations: this.generateRetentionRecommendations(policyCompliance, archiveAnalysis)
      };

      return reportData;

    } catch (error) {
      throw new Error(`Failed to generate data retention report: ${error.message}`);
    }
  }

  /**
   * Generate audit trail report
   */
  async generateAuditTrailReport(tenantId, startDate, endDate, includeDetails) {
    try {
      // Get audit logs from various sources
      const auditLogs = await this.getAuditLogs(tenantId, startDate, endDate);
      const securityEvents = await this.getSecurityEvents(tenantId, startDate, endDate);
      const dataArchiveAudits = await this.getDataArchiveAudits(tenantId, startDate, endDate);
      const policyChanges = await this.getPolicyChanges(tenantId, startDate, endDate);

      // Combine and analyze audit data
      const allAuditEvents = [
        ...auditLogs.map(log => ({ ...log, source: 'audit_log' })),
        ...securityEvents.map(event => ({ ...event, source: 'security_event' })),
        ...dataArchiveAudits.map(audit => ({ ...audit, source: 'data_archive' })),
        ...policyChanges.map(change => ({ ...change, source: 'policy_change' }))
      ].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

      // Analyze patterns
      const userActivity = {};
      const actionTypes = {};
      const hourlyActivity = new Array(24).fill(0);
      const dailyActivity = {};

      allAuditEvents.forEach(event => {
        const userId = event.userId || event.performedBy || 'system';
        const action = event.action || event.eventType || 'unknown';
        const timestamp = new Date(event.timestamp || event.createdAt);

        // User activity
        if (!userActivity[userId]) {
          userActivity[userId] = { count: 0, actions: {} };
        }
        userActivity[userId].count++;
        userActivity[userId].actions[action] = (userActivity[userId].actions[action] || 0) + 1;

        // Action types
        actionTypes[action] = (actionTypes[action] || 0) + 1;

        // Hourly activity
        hourlyActivity[timestamp.getHours()]++;

        // Daily activity
        const dateKey = timestamp.toISOString().split('T')[0];
        dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
      });

      // Identify suspicious patterns
      const suspiciousActivity = this.identifySuspiciousActivity(allAuditEvents, userActivity);

      const summary = {
        reportType: 'audit_trail_report',
        tenantId,
        period: { startDate, endDate },
        totalEvents: allAuditEvents.length,
        uniqueUsers: Object.keys(userActivity).length,
        uniqueActions: Object.keys(actionTypes).length,
        suspiciousEvents: suspiciousActivity.length,
        eventsBySource: {
          audit_log: auditLogs.length,
          security_event: securityEvents.length,
          data_archive: dataArchiveAudits.length,
          policy_change: policyChanges.length
        }
      };

      return {
        summary,
        auditEvents: includeDetails ? allAuditEvents : allAuditEvents.slice(0, 100),
        userActivity,
        actionTypes,
        hourlyActivity,
        dailyActivity,
        suspiciousActivity,
        recommendations: this.generateAuditRecommendations(summary, suspiciousActivity)
      };

    } catch (error) {
      throw new Error(`Failed to generate audit trail report: ${error.message}`);
    }
  }

  /**
   * Generate user access patterns report
   */
  async generateUserAccessReport(tenantId, startDate, endDate, includeDetails) {
    try {
      // Get user access data from various sources
      const loginEvents = await this.getLoginEvents(tenantId, startDate, endDate);
      const dataAccess = await this.getDataAccessEvents(tenantId, startDate, endDate);
      const archiveAccess = await this.getArchiveAccessEvents(tenantId, startDate, endDate);
      const moduleAccess = await this.getModuleAccessEvents(tenantId, startDate, endDate);

      // Analyze access patterns
      const userProfiles = {};
      const accessByTime = {};
      const accessByLocation = {};
      const accessByDevice = {};

      // Process login events
      loginEvents.forEach(event => {
        const userId = event.userId;
        if (!userProfiles[userId]) {
          userProfiles[userId] = {
            totalLogins: 0,
            successfulLogins: 0,
            failedLogins: 0,
            uniqueIPs: new Set(),
            uniqueDevices: new Set(),
            firstAccess: event.timestamp,
            lastAccess: event.timestamp,
            accessPatterns: {}
          };
        }

        const profile = userProfiles[userId];
        profile.totalLogins++;
        
        if (event.success) {
          profile.successfulLogins++;
        } else {
          profile.failedLogins++;
        }

        profile.uniqueIPs.add(event.ipAddress);
        profile.uniqueDevices.add(event.userAgent);
        
        if (new Date(event.timestamp) < new Date(profile.firstAccess)) {
          profile.firstAccess = event.timestamp;
        }
        if (new Date(event.timestamp) > new Date(profile.lastAccess)) {
          profile.lastAccess = event.timestamp;
        }

        // Time-based analysis
        const hour = new Date(event.timestamp).getHours();
        const timeSlot = this.getTimeSlot(hour);
        profile.accessPatterns[timeSlot] = (profile.accessPatterns[timeSlot] || 0) + 1;
      });

      // Convert Sets to counts
      Object.keys(userProfiles).forEach(userId => {
        const profile = userProfiles[userId];
        profile.uniqueIPCount = profile.uniqueIPs.size;
        profile.uniqueDeviceCount = profile.uniqueDevices.size;
        delete profile.uniqueIPs;
        delete profile.uniqueDevices;
      });

      // Identify anomalies
      const anomalies = this.identifyAccessAnomalies(userProfiles, loginEvents);

      const summary = {
        reportType: 'user_access_patterns',
        tenantId,
        period: { startDate, endDate },
        totalUsers: Object.keys(userProfiles).length,
        totalLoginAttempts: loginEvents.length,
        successfulLogins: loginEvents.filter(e => e.success).length,
        failedLogins: loginEvents.filter(e => !e.success).length,
        uniqueIPs: [...new Set(loginEvents.map(e => e.ipAddress))].length,
        anomaliesDetected: anomalies.length,
        dataAccessEvents: dataAccess.length,
        archiveAccessEvents: archiveAccess.length,
        moduleAccessEvents: moduleAccess.length
      };

      return {
        summary,
        userProfiles,
        loginEvents: includeDetails ? loginEvents : loginEvents.slice(0, 100),
        dataAccess: includeDetails ? dataAccess : dataAccess.slice(0, 50),
        archiveAccess,
        moduleAccess,
        anomalies,
        recommendations: this.generateAccessRecommendations(summary, anomalies)
      };

    } catch (error) {
      throw new Error(`Failed to generate user access report: ${error.message}`);
    }
  }

  /**
   * Generate license compliance report
   */
  async generateLicenseComplianceReport(tenantId, startDate, endDate, includeDetails) {
    try {
      // Get license data (this would integrate with the license server)
      const licenseData = await this.getLicenseData(tenantId);
      const licenseValidations = await this.getLicenseValidations(tenantId, startDate, endDate);
      const moduleUsage = await this.getModuleUsage(tenantId, startDate, endDate);
      const licenseViolations = await this.getLicenseViolations(tenantId, startDate, endDate);

      // Analyze license compliance
      const complianceStatus = {
        isValid: licenseData.status === 'active' && new Date(licenseData.expiresAt) > new Date(),
        expiresAt: licenseData.expiresAt,
        daysUntilExpiry: Math.ceil((new Date(licenseData.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)),
        licenseType: licenseData.type,
        maxUsers: licenseData.features?.maxUsers || 0,
        currentUsers: await this.getCurrentUserCount(tenantId),
        maxStorage: licenseData.features?.maxStorage || 0,
        currentStorage: await this.getCurrentStorageUsage(tenantId),
        enabledModules: licenseData.features?.modules || [],
        usedModules: Object.keys(moduleUsage)
      };

      // Check for violations
      const violations = [];
      
      if (complianceStatus.currentUsers > complianceStatus.maxUsers) {
        violations.push({
          type: 'user_limit_exceeded',
          severity: 'high',
          current: complianceStatus.currentUsers,
          limit: complianceStatus.maxUsers,
          message: `User count (${complianceStatus.currentUsers}) exceeds license limit (${complianceStatus.maxUsers})`
        });
      }

      if (complianceStatus.currentStorage > complianceStatus.maxStorage) {
        violations.push({
          type: 'storage_limit_exceeded',
          severity: 'medium',
          current: complianceStatus.currentStorage,
          limit: complianceStatus.maxStorage,
          message: `Storage usage (${complianceStatus.currentStorage}MB) exceeds license limit (${complianceStatus.maxStorage}MB)`
        });
      }

      complianceStatus.usedModules.forEach(module => {
        if (!complianceStatus.enabledModules.includes(module)) {
          violations.push({
            type: 'unauthorized_module_usage',
            severity: 'high',
            module,
            message: `Module '${module}' is being used without proper license`
          });
        }
      });

      const summary = {
        reportType: 'license_compliance',
        tenantId,
        period: { startDate, endDate },
        licenseStatus: complianceStatus.isValid ? 'compliant' : 'non-compliant',
        violationCount: violations.length,
        highSeverityViolations: violations.filter(v => v.severity === 'high').length,
        totalValidations: licenseValidations.length,
        failedValidations: licenseValidations.filter(v => !v.success).length,
        userUtilization: (complianceStatus.currentUsers / complianceStatus.maxUsers * 100).toFixed(2),
        storageUtilization: (complianceStatus.currentStorage / complianceStatus.maxStorage * 100).toFixed(2)
      };

      return {
        summary,
        licenseData,
        complianceStatus,
        violations,
        licenseValidations: includeDetails ? licenseValidations : licenseValidations.slice(0, 50),
        moduleUsage,
        recommendations: this.generateLicenseRecommendations(complianceStatus, violations)
      };

    } catch (error) {
      throw new Error(`Failed to generate license compliance report: ${error.message}`);
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateGDPRComplianceReport(tenantId, startDate, endDate, includeDetails) {
    try {
      // Get GDPR-related data
      const dataProcessingActivities = await this.getDataProcessingActivities(tenantId, startDate, endDate);
      const dataSubjectRequests = await this.getDataSubjectRequests(tenantId, startDate, endDate);
      const consentRecords = await this.getConsentRecords(tenantId, startDate, endDate);
      const dataBreaches = await this.getDataBreaches(tenantId, startDate, endDate);
      const retentionCompliance = await this.getRetentionCompliance(tenantId);

      // Analyze GDPR compliance
      const gdprCompliance = {
        dataProcessingLawfulness: this.assessDataProcessingLawfulness(dataProcessingActivities),
        consentManagement: this.assessConsentManagement(consentRecords),
        dataSubjectRights: this.assessDataSubjectRights(dataSubjectRequests),
        dataRetention: this.assessDataRetention(retentionCompliance),
        dataBreachHandling: this.assessDataBreachHandling(dataBreaches),
        dataProtectionByDesign: this.assessDataProtectionByDesign(tenantId)
      };

      // Calculate overall compliance score
      const complianceScores = Object.values(gdprCompliance).map(assessment => assessment.score);
      const overallScore = complianceScores.reduce((sum, score) => sum + score, 0) / complianceScores.length;

      const summary = {
        reportType: 'gdpr_compliance',
        tenantId,
        period: { startDate, endDate },
        overallComplianceScore: overallScore.toFixed(2),
        complianceLevel: this.getComplianceLevel(overallScore),
        totalDataProcessingActivities: dataProcessingActivities.length,
        totalDataSubjectRequests: dataSubjectRequests.length,
        pendingRequests: dataSubjectRequests.filter(r => r.status === 'pending').length,
        totalConsentRecords: consentRecords.length,
        activeConsents: consentRecords.filter(c => c.status === 'active').length,
        dataBreaches: dataBreaches.length,
        criticalIssues: Object.values(gdprCompliance).filter(a => a.issues.some(i => i.severity === 'critical')).length
      };

      return {
        summary,
        gdprCompliance,
        dataProcessingActivities: includeDetails ? dataProcessingActivities : dataProcessingActivities.slice(0, 20),
        dataSubjectRequests,
        consentRecords: includeDetails ? consentRecords : consentRecords.slice(0, 50),
        dataBreaches,
        recommendations: this.generateGDPRRecommendations(gdprCompliance, summary)
      };

    } catch (error) {
      throw new Error(`Failed to generate GDPR compliance report: ${error.message}`);
    }
  }

  /**
   * Format report as PDF
   */
  async formatReportAsPDF(reportData, reportType) {
    try {
      const doc = new PDFDocument();
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {});

      // Header
      doc.fontSize(20).text(`${reportType.replace(/_/g, ' ').toUpperCase()} REPORT`, 50, 50);
      doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, 50, 80);
      doc.text(`Tenant ID: ${reportData.summary.tenantId}`, 50, 95);
      doc.text(`Period: ${reportData.summary.period.startDate.toISOString().split('T')[0]} to ${reportData.summary.period.endDate.toISOString().split('T')[0]}`, 50, 110);

      // Summary section
      doc.fontSize(16).text('EXECUTIVE SUMMARY', 50, 140);
      let yPosition = 160;

      Object.entries(reportData.summary).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) return;
        doc.fontSize(10).text(`${key.replace(/_/g, ' ')}: ${value}`, 50, yPosition);
        yPosition += 15;
      });

      // Recommendations section
      if (reportData.recommendations && reportData.recommendations.length > 0) {
        yPosition += 20;
        doc.fontSize(16).text('RECOMMENDATIONS', 50, yPosition);
        yPosition += 20;

        reportData.recommendations.forEach((rec, index) => {
          doc.fontSize(10).text(`${index + 1}. ${rec.title}`, 50, yPosition);
          yPosition += 12;
          doc.fontSize(8).text(`   ${rec.description}`, 50, yPosition);
          yPosition += 12;
          doc.fontSize(8).text(`   Priority: ${rec.priority} | Impact: ${rec.impact}`, 50, yPosition);
          yPosition += 20;
        });
      }

      doc.end();

      return new Promise((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({
            data: pdfBuffer,
            contentType: 'application/pdf',
            filename: `${reportType}_${Date.now()}.pdf`
          });
        });
      });

    } catch (error) {
      throw new Error(`Failed to format PDF report: ${error.message}`);
    }
  }

  /**
   * Format report as Excel
   */
  async formatReportAsExcel(reportData, reportType) {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Summary worksheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Report Type', reportType.replace(/_/g, ' ').toUpperCase()]);
      summarySheet.addRow(['Generated', new Date().toISOString()]);
      summarySheet.addRow(['Tenant ID', reportData.summary.tenantId]);
      summarySheet.addRow(['Period Start', reportData.summary.period.startDate.toISOString()]);
      summarySheet.addRow(['Period End', reportData.summary.period.endDate.toISOString()]);
      summarySheet.addRow([]);

      // Summary data
      Object.entries(reportData.summary).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) return;
        summarySheet.addRow([key.replace(/_/g, ' '), value]);
      });

      // Recommendations worksheet
      if (reportData.recommendations && reportData.recommendations.length > 0) {
        const recSheet = workbook.addWorksheet('Recommendations');
        recSheet.addRow(['Title', 'Description', 'Priority', 'Impact', 'Category']);
        
        reportData.recommendations.forEach(rec => {
          recSheet.addRow([rec.title, rec.description, rec.priority, rec.impact, rec.category]);
        });
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return {
        data: buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${reportType}_${Date.now()}.xlsx`
      };

    } catch (error) {
      throw new Error(`Failed to format Excel report: ${error.message}`);
    }
  }

  /**
   * Helper methods for data retrieval
   */
  async getAuditLogs(tenantId, startDate, endDate) {
    // This would query the actual audit log collection
    // For now, return mock data structure
    return [];
  }

  async getSecurityEvents(tenantId, startDate, endDate) {
    // This would query security events
    return [];
  }

  async getDataArchiveAudits(tenantId, startDate, endDate) {
    const archives = await DataArchive.find({
      tenantId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    return archives.flatMap(archive => 
      archive.auditTrail.map(audit => ({
        ...audit.toObject(),
        archiveId: archive.archiveId,
        dataType: archive.dataType
      }))
    );
  }

  async getPolicyChanges(tenantId, startDate, endDate) {
    const policies = await DataRetentionPolicy.find({ tenantId });
    
    return policies.flatMap(policy =>
      policy.configurationHistory
        .filter(change => change.changedAt >= startDate && change.changedAt <= endDate)
        .map(change => ({
          ...change.toObject(),
          policyId: policy._id,
          policyName: policy.policyName,
          dataType: policy.dataType
        }))
    );
  }

  async getLicenseData(tenantId) {
    // This would integrate with the license server
    // For now, return mock structure
    return {
      status: 'active',
      type: 'professional',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      features: {
        maxUsers: 100,
        maxStorage: 10240,
        modules: ['hr-core', 'tasks', 'reports']
      }
    };
  }

  async getCurrentUserCount(tenantId) {
    try {
      const User = mongoose.model('User');
      return await User.countDocuments({ tenantId, status: 'active' });
    } catch (error) {
      return 0;
    }
  }

  async getCurrentStorageUsage(tenantId) {
    // This would calculate actual storage usage
    return 5120; // Mock value in MB
  }

  /**
   * Helper methods for analysis
   */
  generateRetentionRecommendations(policyCompliance, archiveAnalysis) {
    const recommendations = [];

    const nonCompliantPolicies = policyCompliance.filter(p => p.status === 'non-compliant');
    if (nonCompliantPolicies.length > 0) {
      recommendations.push({
        title: 'Address Non-Compliant Retention Policies',
        description: `${nonCompliantPolicies.length} retention policies are not compliant. Review and fix execution issues.`,
        priority: 'high',
        impact: 'compliance',
        category: 'policy_management'
      });
    }

    if (archiveAnalysis.totalArchiveSize > 10 * 1024 * 1024 * 1024) { // 10GB
      recommendations.push({
        title: 'Consider Cloud Storage Migration',
        description: 'Archive storage is growing large. Consider migrating to cloud storage for better scalability.',
        priority: 'medium',
        impact: 'operational',
        category: 'storage_optimization'
      });
    }

    return recommendations;
  }

  generateAuditRecommendations(summary, suspiciousActivity) {
    const recommendations = [];

    if (suspiciousActivity.length > 0) {
      recommendations.push({
        title: 'Investigate Suspicious Activity',
        description: `${suspiciousActivity.length} suspicious activities detected. Review and investigate immediately.`,
        priority: 'high',
        impact: 'security',
        category: 'security_monitoring'
      });
    }

    if (summary.totalEvents > 100000) {
      recommendations.push({
        title: 'Implement Log Archival',
        description: 'High volume of audit events. Consider implementing automated log archival.',
        priority: 'medium',
        impact: 'performance',
        category: 'log_management'
      });
    }

    return recommendations;
  }

  identifySuspiciousActivity(auditEvents, userActivity) {
    const suspicious = [];

    // Check for unusual activity patterns
    Object.entries(userActivity).forEach(([userId, activity]) => {
      if (activity.count > 1000) { // High activity threshold
        suspicious.push({
          type: 'high_activity_volume',
          userId,
          count: activity.count,
          severity: 'medium',
          description: `User ${userId} has unusually high activity (${activity.count} events)`
        });
      }
    });

    return suspicious;
  }

  getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  getComplianceLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'acceptable';
    if (score >= 60) return 'needs_improvement';
    return 'poor';
  }

  // Additional helper methods would be implemented here...
  async getLoginEvents(tenantId, startDate, endDate) { return []; }
  async getDataAccessEvents(tenantId, startDate, endDate) { return []; }
  async getArchiveAccessEvents(tenantId, startDate, endDate) { return []; }
  async getModuleAccessEvents(tenantId, startDate, endDate) { return []; }
  async getLicenseValidations(tenantId, startDate, endDate) { return []; }
  async getModuleUsage(tenantId, startDate, endDate) { return {}; }
  async getLicenseViolations(tenantId, startDate, endDate) { return []; }
  async getDataProcessingActivities(tenantId, startDate, endDate) { return []; }
  async getDataSubjectRequests(tenantId, startDate, endDate) { return []; }
  async getConsentRecords(tenantId, startDate, endDate) { return []; }
  async getDataBreaches(tenantId, startDate, endDate) { return []; }
  async getRetentionCompliance(tenantId) { return {}; }

  identifyAccessAnomalies(userProfiles, loginEvents) { return []; }
  generateAccessRecommendations(summary, anomalies) { return []; }
  generateLicenseRecommendations(complianceStatus, violations) { return []; }
  generateGDPRRecommendations(gdprCompliance, summary) { return []; }

  assessDataProcessingLawfulness(activities) { return { score: 85, issues: [] }; }
  assessConsentManagement(records) { return { score: 90, issues: [] }; }
  assessDataSubjectRights(requests) { return { score: 88, issues: [] }; }
  assessDataRetention(compliance) { return { score: 92, issues: [] }; }
  assessDataBreachHandling(breaches) { return { score: 95, issues: [] }; }
  assessDataProtectionByDesign(tenantId) { return { score: 87, issues: [] }; }
}

export default new ComplianceReportingService();