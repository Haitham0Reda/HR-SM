import asyncHandler from '../core/utils/asyncHandler.js';
import dataRetentionService from '../services/dataRetentionService.js';
import complianceReportingService from '../services/complianceReportingService.js';
import userAccessAnalyticsService from '../services/userAccessAnalytics.service.js';
import licenseComplianceService from '../services/licenseComplianceService.js';
import DataRetentionPolicy from '../models/DataRetentionPolicy.js';
import DataArchive from '../models/DataArchive.js';
import { companyLogger } from '../utils/companyLogger.js';

/**
 * Data Retention Policy Controllers
 */

// Create retention policy
export const createRetentionPolicy = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const userId = req.user._id;

  const policy = await dataRetentionService.createRetentionPolicy(
    tenantId,
    req.body,
    userId
  );

  res.status(201).json({
    success: true,
    message: 'Data retention policy created successfully',
    data: policy
  });
});

// Get retention policies
export const getRetentionPolicies = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { dataType, status } = req.query;

  const filters = {};
  if (dataType) filters.dataType = dataType;
  if (status) filters.status = status;

  const policies = await dataRetentionService.getRetentionPolicies(tenantId, filters);

  res.json({
    success: true,
    data: policies,
    count: policies.length
  });
});

// Get single retention policy
export const getRetentionPolicy = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { policyId } = req.params;

  const policy = await DataRetentionPolicy.findOne({
    _id: policyId,
    tenantId
  })
    .populate('createdBy', 'firstName lastName email')
    .populate('updatedBy', 'firstName lastName email');

  if (!policy) {
    return res.status(404).json({
      success: false,
      message: 'Retention policy not found'
    });
  }

  res.json({
    success: true,
    data: policy
  });
});

// Update retention policy
export const updateRetentionPolicy = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { policyId } = req.params;
  const userId = req.user._id;

  const policy = await dataRetentionService.updateRetentionPolicy(
    tenantId,
    policyId,
    req.body,
    userId
  );

  res.json({
    success: true,
    message: 'Retention policy updated successfully',
    data: policy
  });
});

// Delete retention policy
export const deleteRetentionPolicy = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { policyId } = req.params;
  const userId = req.user._id;

  const policy = await DataRetentionPolicy.findOne({
    _id: policyId,
    tenantId
  });

  if (!policy) {
    return res.status(404).json({
      success: false,
      message: 'Retention policy not found'
    });
  }

  // Soft delete - mark as inactive
  policy.status = 'inactive';
  policy.updatedBy = userId;
  await policy.save();

  // Log policy deletion
  companyLogger(tenantId).compliance('Data retention policy deleted', {
    policyId: policy._id,
    policyName: policy.policyName,
    dataType: policy.dataType,
    deletedBy: userId,
    compliance: true,
    audit: true
  });

  res.json({
    success: true,
    message: 'Retention policy deleted successfully'
  });
});

// Execute retention policies manually
export const executeRetentionPolicies = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const userId = req.user._id;

  companyLogger(tenantId).compliance('Manual retention policy execution initiated', {
    initiatedBy: userId,
    compliance: true,
    audit: true
  });

  const results = await dataRetentionService.executeRetentionPolicies(tenantId);

  res.json({
    success: true,
    message: 'Retention policies executed successfully',
    data: results
  });
});

// Get retention statistics
export const getRetentionStatistics = asyncHandler(async (req, res) => {
  const { tenantId } = req;

  const statistics = await dataRetentionService.getRetentionStatistics(tenantId);

  res.json({
    success: true,
    data: statistics
  });
});

/**
 * Data Archive Controllers
 */

// Get archives
export const getArchives = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { dataType, status, startDate, endDate } = req.query;

  const filters = {};
  if (dataType) filters.dataType = dataType;
  if (status) filters.status = status;
  if (startDate || endDate) {
    filters.createdAt = {};
    if (startDate) filters.createdAt.$gte = new Date(startDate);
    if (endDate) filters.createdAt.$lte = new Date(endDate);
  }

  const archives = await dataRetentionService.getArchives(tenantId, filters);

  res.json({
    success: true,
    data: archives,
    count: archives.length
  });
});

// Get single archive
export const getArchive = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { archiveId } = req.params;

  const archive = await DataArchive.findOne({
    tenantId,
    archiveId
  })
    .populate('retentionPolicyId', 'policyName dataType')
    .populate('createdBy', 'firstName lastName email');

  if (!archive) {
    return res.status(404).json({
      success: false,
      message: 'Archive not found'
    });
  }

  // Log archive access
  const userId = req.user._id;
  archive.logAccess(userId, 'view', req.ip, req.get('User-Agent'));
  await archive.save();

  res.json({
    success: true,
    data: archive
  });
});

// Restore archive
export const restoreArchive = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { archiveId } = req.params;
  const { targetCollection } = req.body;
  const userId = req.user._id;

  const result = await dataRetentionService.restoreArchive(
    tenantId,
    archiveId,
    targetCollection,
    userId
  );

  res.json({
    success: true,
    message: 'Archive restored successfully',
    data: result
  });
});

// Delete archive
export const deleteArchive = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { archiveId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  const archive = await DataArchive.findOne({
    tenantId,
    archiveId
  });

  if (!archive) {
    return res.status(404).json({
      success: false,
      message: 'Archive not found'
    });
  }

  // Check if archive is on legal hold
  if (archive.legalHold.isOnHold) {
    return res.status(403).json({
      success: false,
      message: 'Cannot delete archive - it is on legal hold'
    });
  }

  // Add audit entry
  archive.addAuditEntry('deleted', userId, {
    reason: reason || 'Manual deletion',
    deletedBy: userId
  }, req.ip);

  await archive.save();

  // Delete physical file if exists
  if (archive.storage.localPath) {
    try {
      await fs.unlink(archive.storage.localPath);
    } catch (error) {
      console.warn(`Failed to delete archive file: ${error.message}`);
    }
  }

  // Remove from database
  await DataArchive.deleteOne({ _id: archive._id });

  // Log deletion
  companyLogger(tenantId).compliance('Archive deleted', {
    archiveId,
    reason: reason || 'Manual deletion',
    deletedBy: userId,
    compliance: true,
    audit: true
  });

  res.json({
    success: true,
    message: 'Archive deleted successfully'
  });
});

/**
 * Compliance Reporting Controllers
 */

// Generate compliance report
export const generateComplianceReport = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { reportType } = req.params;
  const userId = req.user._id;

  const {
    startDate,
    endDate,
    format = 'json',
    includeDetails = true
  } = req.body;

  const options = {
    startDate: startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    endDate: endDate ? new Date(endDate) : new Date(),
    format,
    includeDetails,
    userId
  };

  const report = await complianceReportingService.generateComplianceReport(
    tenantId,
    reportType,
    options
  );

  // Set appropriate headers for file downloads
  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    return res.send(report.data);
  } else if (format === 'excel') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    return res.send(report.data);
  }

  // JSON response
  res.json({
    success: true,
    data: report
  });
});

// Get available report types
export const getReportTypes = asyncHandler(async (req, res) => {
  const reportTypes = [
    {
      type: 'data_retention_compliance',
      name: 'Data Retention Compliance',
      description: 'Comprehensive report on data retention policy compliance and execution',
      category: 'data_management'
    },
    {
      type: 'audit_trail_report',
      name: 'Audit Trail Report',
      description: 'Detailed audit trail with user activities and system events',
      category: 'security'
    },
    {
      type: 'user_access_patterns',
      name: 'User Access Patterns',
      description: 'Analysis of user access patterns and anomaly detection',
      category: 'security'
    },
    {
      type: 'license_compliance',
      name: 'License Compliance',
      description: 'License usage and compliance status report',
      category: 'licensing'
    },
    {
      type: 'data_processing_activities',
      name: 'Data Processing Activities',
      description: 'Record of data processing activities for compliance',
      category: 'privacy'
    },
    {
      type: 'security_incidents',
      name: 'Security Incidents',
      description: 'Security incident tracking and response report',
      category: 'security'
    },
    {
      type: 'gdpr_compliance',
      name: 'GDPR Compliance',
      description: 'Comprehensive GDPR compliance assessment',
      category: 'privacy'
    }
  ];

  res.json({
    success: true,
    data: reportTypes
  });
});

// Get compliance dashboard data
export const getComplianceDashboard = asyncHandler(async (req, res) => {
  const { tenantId } = req;

  // Get summary data for dashboard
  const [
    retentionStats,
    activePolicies,
    recentArchives,
    pendingExecutions
  ] = await Promise.all([
    dataRetentionService.getRetentionStatistics(tenantId),
    DataRetentionPolicy.countDocuments({ tenantId, status: 'active' }),
    DataArchive.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('retentionPolicyId', 'policyName'),
    DataRetentionPolicy.find({
      tenantId,
      status: 'active',
      nextExecution: { $lte: new Date() }
    }).countDocuments()
  ]);

  const dashboardData = {
    summary: {
      totalPolicies: retentionStats.totalPolicies,
      activePolicies,
      totalArchives: retentionStats.totalArchives,
      totalArchivedRecords: retentionStats.totalArchivedRecords,
      pendingExecutions
    },
    retentionStats,
    recentArchives,
    alerts: []
  };

  // Add alerts for issues
  if (pendingExecutions > 0) {
    dashboardData.alerts.push({
      type: 'warning',
      message: `${pendingExecutions} retention policies are due for execution`,
      action: 'execute_policies'
    });
  }

  if (retentionStats.totalArchiveSize > 10 * 1024 * 1024 * 1024) { // 10GB
    dashboardData.alerts.push({
      type: 'info',
      message: 'Archive storage is growing large. Consider cloud migration.',
      action: 'review_storage'
    });
  }

  res.json({
    success: true,
    data: dashboardData
  });
});

/**
 * Legal Hold Controllers
 */

// Place archive on legal hold
export const placeLegalHold = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { archiveId } = req.params;
  const { reason, legalCaseReference, holdEndDate } = req.body;
  const userId = req.user._id;

  const archive = await DataArchive.findOne({
    tenantId,
    archiveId
  });

  if (!archive) {
    return res.status(404).json({
      success: false,
      message: 'Archive not found'
    });
  }

  // Place on legal hold
  archive.legalHold = {
    isOnHold: true,
    holdReason: reason,
    holdStartDate: new Date(),
    holdEndDate: holdEndDate ? new Date(holdEndDate) : null,
    holdRequestedBy: userId,
    legalCaseReference
  };

  // Add audit entry
  archive.addAuditEntry('legal_hold_placed', userId, {
    reason,
    legalCaseReference,
    holdEndDate
  }, req.ip);

  await archive.save();

  // Log legal hold
  companyLogger(tenantId).compliance('Legal hold placed on archive', {
    archiveId,
    reason,
    legalCaseReference,
    placedBy: userId,
    compliance: true,
    audit: true
  });

  res.json({
    success: true,
    message: 'Legal hold placed successfully',
    data: archive.legalHold
  });
});

// Remove legal hold
export const removeLegalHold = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { archiveId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  const archive = await DataArchive.findOne({
    tenantId,
    archiveId
  });

  if (!archive) {
    return res.status(404).json({
      success: false,
      message: 'Archive not found'
    });
  }

  if (!archive.legalHold.isOnHold) {
    return res.status(400).json({
      success: false,
      message: 'Archive is not on legal hold'
    });
  }

  // Remove legal hold
  archive.legalHold.isOnHold = false;

  // Add audit entry
  archive.addAuditEntry('legal_hold_removed', userId, {
    reason: reason || 'Legal hold removed',
    originalHoldReason: archive.legalHold.holdReason,
    holdDuration: Date.now() - archive.legalHold.holdStartDate.getTime()
  }, req.ip);

  await archive.save();

  // Log legal hold removal
  companyLogger(tenantId).compliance('Legal hold removed from archive', {
    archiveId,
    reason: reason || 'Legal hold removed',
    removedBy: userId,
    compliance: true,
    audit: true
  });

  res.json({
    success: true,
    message: 'Legal hold removed successfully'
  });
});

// Get archives on legal hold
export const getArchivesOnLegalHold = asyncHandler(async (req, res) => {
  const { tenantId } = req;

  const archives = await DataArchive.find({
    tenantId,
    'legalHold.isOnHold': true
  })
    .populate('retentionPolicyId', 'policyName dataType')
    .populate('legalHold.holdRequestedBy', 'firstName lastName email')
    .sort({ 'legalHold.holdStartDate': -1 });

  res.json({
    success: true,
    data: archives,
    count: archives.length
  });
});


/**
 * User Access Analytics Controllers
 */

// Track user access event
export const trackAccessEvent = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const userId = req.user._id;

  const result = await userAccessAnalyticsService.trackAccessEvent(
    tenantId,
    userId,
    req.body
  );

  res.json({
    success: true,
    message: 'Access event tracked successfully',
    data: result
  });
});

// Analyze user access patterns
export const analyzeAccessPatterns = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { startDate, endDate, groupByUser, detectAnomalies } = req.query;

  const options = {
    groupByUser: groupByUser === 'true',
    detectAnomalies: detectAnomalies !== 'false'
  };

  const analysis = await userAccessAnalyticsService.analyzeAccessPatterns(
    tenantId,
    startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate ? new Date(endDate) : new Date(),
    options
  );

  res.json({
    success: true,
    data: analysis
  });
});

// Generate user access compliance report
export const generateAccessComplianceReport = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { startDate, endDate } = req.body;

  const report = await userAccessAnalyticsService.generateAccessComplianceReport(
    tenantId,
    startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    endDate ? new Date(endDate) : new Date()
  );

  res.json({
    success: true,
    data: report
  });
});

/**
 * License Compliance Controllers
 */

// Generate license compliance report
export const generateLicenseComplianceReport = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const { startDate, endDate } = req.body;

  const report = await licenseComplianceService.generateLicenseComplianceReport(
    tenantId,
    startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate ? new Date(endDate) : new Date()
  );

  res.json({
    success: true,
    data: report
  });
});

// Get license compliance summary
export const getLicenseComplianceSummary = asyncHandler(async (req, res) => {
  const { tenantId } = req;

  const report = await licenseComplianceService.generateLicenseComplianceReport(
    tenantId,
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    new Date()
  );

  // Return only summary for quick dashboard view
  res.json({
    success: true,
    data: {
      summary: report.summary,
      licenseInfo: report.licenseInfo,
      usageAnalysis: report.usageAnalysis,
      violations: report.violations.filter(v => v.severity === 'critical'),
      topRecommendations: report.recommendations.slice(0, 3)
    }
  });
});