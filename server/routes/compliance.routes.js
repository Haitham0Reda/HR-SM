import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  // Data Retention Policy Controllers
  createRetentionPolicy,
  getRetentionPolicies,
  getRetentionPolicy,
  updateRetentionPolicy,
  deleteRetentionPolicy,
  executeRetentionPolicies,
  getRetentionStatistics,
  
  // Data Archive Controllers
  getArchives,
  getArchive,
  restoreArchive,
  deleteArchive,
  
  // Compliance Reporting Controllers
  generateComplianceReport,
  getReportTypes,
  getComplianceDashboard,
  
  // Legal Hold Controllers
  placeLegalHold,
  removeLegalHold,
  getArchivesOnLegalHold,

  // User Access Analytics Controllers
  trackAccessEvent,
  analyzeAccessPatterns,
  generateAccessComplianceReport,

  // License Compliance Controllers
  generateLicenseComplianceReport,
  getLicenseComplianceSummary
} from '../controllers/complianceController.js';

import { authMiddleware } from '../middleware/authMiddleware.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { permissionMiddleware } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// Apply middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Data Retention Policy Routes
 */

// Create retention policy
router.post('/retention-policies',
  permissionMiddleware(['admin', 'compliance_officer']),
  [
    body('policyName')
      .notEmpty()
      .withMessage('Policy name is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Policy name must be between 3 and 100 characters'),
    
    body('dataType')
      .isIn([
        'audit_logs', 'security_logs', 'user_data', 'employee_records',
        'insurance_policies', 'insurance_claims', 'family_members', 'beneficiaries',
        'license_data', 'backup_logs', 'performance_logs', 'system_logs',
        'compliance_logs', 'financial_records', 'documents', 'reports'
      ])
      .withMessage('Invalid data type'),
    
    body('retentionPeriod.value')
      .isInt({ min: 1 })
      .withMessage('Retention period value must be a positive integer'),
    
    body('retentionPeriod.unit')
      .isIn(['days', 'months', 'years'])
      .withMessage('Retention period unit must be days, months, or years'),
    
    body('executionSchedule.frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Execution frequency must be daily, weekly, or monthly'),
    
    body('executionSchedule.time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Execution time must be in HH:MM format')
  ],
  handleValidationErrors,
  createRetentionPolicy
);

// Get retention policies
router.get('/retention-policies',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  [
    query('dataType')
      .optional()
      .isIn([
        'audit_logs', 'security_logs', 'user_data', 'employee_records',
        'insurance_policies', 'insurance_claims', 'family_members', 'beneficiaries',
        'license_data', 'backup_logs', 'performance_logs', 'system_logs',
        'compliance_logs', 'financial_records', 'documents', 'reports'
      ])
      .withMessage('Invalid data type'),
    
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status')
  ],
  handleValidationErrors,
  getRetentionPolicies
);

// Get single retention policy
router.get('/retention-policies/:policyId',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  [
    param('policyId')
      .isMongoId()
      .withMessage('Invalid policy ID')
  ],
  handleValidationErrors,
  getRetentionPolicy
);

// Update retention policy
router.put('/retention-policies/:policyId',
  permissionMiddleware(['admin', 'compliance_officer']),
  [
    param('policyId')
      .isMongoId()
      .withMessage('Invalid policy ID'),
    
    body('policyName')
      .optional()
      .isLength({ min: 3, max: 100 })
      .withMessage('Policy name must be between 3 and 100 characters'),
    
    body('retentionPeriod.value')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Retention period value must be a positive integer'),
    
    body('retentionPeriod.unit')
      .optional()
      .isIn(['days', 'months', 'years'])
      .withMessage('Retention period unit must be days, months, or years'),
    
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status')
  ],
  handleValidationErrors,
  updateRetentionPolicy
);

// Delete retention policy
router.delete('/retention-policies/:policyId',
  permissionMiddleware(['admin', 'compliance_officer']),
  [
    param('policyId')
      .isMongoId()
      .withMessage('Invalid policy ID')
  ],
  handleValidationErrors,
  deleteRetentionPolicy
);

// Execute retention policies
router.post('/retention-policies/execute',
  permissionMiddleware(['admin', 'compliance_officer']),
  executeRetentionPolicies
);

// Get retention statistics
router.get('/retention-statistics',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  getRetentionStatistics
);

/**
 * Data Archive Routes
 */

// Get archives
router.get('/archives',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  [
    query('dataType')
      .optional()
      .isIn([
        'audit_logs', 'security_logs', 'user_data', 'employee_records',
        'insurance_policies', 'insurance_claims', 'family_members', 'beneficiaries',
        'license_data', 'backup_logs', 'performance_logs', 'system_logs',
        'compliance_logs', 'financial_records', 'documents', 'reports'
      ])
      .withMessage('Invalid data type'),
    
    query('status')
      .optional()
      .isIn(['creating', 'completed', 'failed', 'verifying', 'verified', 'corrupted'])
      .withMessage('Invalid status'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ],
  handleValidationErrors,
  getArchives
);

// Get single archive
router.get('/archives/:archiveId',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  [
    param('archiveId')
      .matches(/^ARC-[A-Z0-9]+-[A-Z0-9]+$/)
      .withMessage('Invalid archive ID format')
  ],
  handleValidationErrors,
  getArchive
);

// Restore archive
router.post('/archives/:archiveId/restore',
  permissionMiddleware(['admin', 'compliance_officer']),
  [
    param('archiveId')
      .matches(/^ARC-[A-Z0-9]+-[A-Z0-9]+$/)
      .withMessage('Invalid archive ID format'),
    
    body('targetCollection')
      .optional()
      .isString()
      .withMessage('Target collection must be a string')
  ],
  handleValidationErrors,
  restoreArchive
);

// Delete archive
router.delete('/archives/:archiveId',
  permissionMiddleware(['admin', 'compliance_officer']),
  [
    param('archiveId')
      .matches(/^ARC-[A-Z0-9]+-[A-Z0-9]+$/)
      .withMessage('Invalid archive ID format'),
    
    body('reason')
      .notEmpty()
      .withMessage('Deletion reason is required')
      .isLength({ min: 10, max: 500 })
      .withMessage('Reason must be between 10 and 500 characters')
  ],
  handleValidationErrors,
  deleteArchive
);

/**
 * Compliance Reporting Routes
 */

// Get available report types
router.get('/reports/types',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  getReportTypes
);

// Generate compliance report
router.post('/reports/:reportType',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  [
    param('reportType')
      .isIn([
        'data_retention_compliance',
        'audit_trail_report',
        'user_access_patterns',
        'license_compliance',
        'data_processing_activities',
        'security_incidents',
        'gdpr_compliance'
      ])
      .withMessage('Invalid report type'),
    
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    
    body('format')
      .optional()
      .isIn(['json', 'pdf', 'excel'])
      .withMessage('Format must be json, pdf, or excel'),
    
    body('includeDetails')
      .optional()
      .isBoolean()
      .withMessage('Include details must be a boolean')
  ],
  handleValidationErrors,
  generateComplianceReport
);

// Get compliance dashboard
router.get('/dashboard',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  getComplianceDashboard
);

/**
 * Legal Hold Routes
 */

// Place legal hold on archive
router.post('/archives/:archiveId/legal-hold',
  permissionMiddleware(['admin', 'compliance_officer']),
  [
    param('archiveId')
      .matches(/^ARC-[A-Z0-9]+-[A-Z0-9]+$/)
      .withMessage('Invalid archive ID format'),
    
    body('reason')
      .notEmpty()
      .withMessage('Legal hold reason is required')
      .isLength({ min: 10, max: 500 })
      .withMessage('Reason must be between 10 and 500 characters'),
    
    body('legalCaseReference')
      .optional()
      .isString()
      .withMessage('Legal case reference must be a string'),
    
    body('holdEndDate')
      .optional()
      .isISO8601()
      .withMessage('Hold end date must be a valid ISO 8601 date')
  ],
  handleValidationErrors,
  placeLegalHold
);

// Remove legal hold from archive
router.delete('/archives/:archiveId/legal-hold',
  permissionMiddleware(['admin', 'compliance_officer']),
  [
    param('archiveId')
      .matches(/^ARC-[A-Z0-9]+-[A-Z0-9]+$/)
      .withMessage('Invalid archive ID format'),
    
    body('reason')
      .optional()
      .isString()
      .withMessage('Reason must be a string')
  ],
  handleValidationErrors,
  removeLegalHold
);

// Get archives on legal hold
router.get('/legal-holds',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  getArchivesOnLegalHold
);

/**
 * Scheduled Jobs Routes (for monitoring)
 */

// Get scheduled retention executions
router.get('/scheduled-executions',
  permissionMiddleware(['admin', 'compliance_officer']),
  async (req, res) => {
    try {
      const { tenantId } = req;
      
      const scheduledPolicies = await DataRetentionPolicy.find({
        tenantId,
        status: 'active',
        nextExecution: { $exists: true }
      })
        .select('policyName dataType nextExecution lastExecuted statistics.lastError')
        .sort({ nextExecution: 1 });

      const now = new Date();
      const overdue = scheduledPolicies.filter(p => p.nextExecution <= now);
      const upcoming = scheduledPolicies.filter(p => p.nextExecution > now);

      res.json({
        success: true,
        data: {
          overdue: overdue.length,
          upcoming: upcoming.length,
          total: scheduledPolicies.length,
          overdueExecutions: overdue,
          upcomingExecutions: upcoming.slice(0, 10) // Next 10
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get scheduled executions',
        error: error.message
      });
    }
  }
);

export default router;

/**
 * User Access Analytics Routes
 */

// Track access event
router.post('/access/track',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  [
    body('eventType')
      .isIn(['login', 'logout', 'data_access', 'module_access', 'failed_login'])
      .withMessage('Invalid event type'),
    
    body('ipAddress')
      .isIP()
      .withMessage('Valid IP address is required'),
    
    body('success')
      .optional()
      .isBoolean()
      .withMessage('Success must be a boolean')
  ],
  handleValidationErrors,
  trackAccessEvent
);

// Analyze access patterns
router.get('/access/patterns',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    
    query('groupByUser')
      .optional()
      .isBoolean()
      .withMessage('Group by user must be a boolean'),
    
    query('detectAnomalies')
      .optional()
      .isBoolean()
      .withMessage('Detect anomalies must be a boolean')
  ],
  handleValidationErrors,
  analyzeAccessPatterns
);

// Generate access compliance report
router.post('/reports/access-compliance',
  permissionMiddleware(['admin', 'compliance_officer']),
  [
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ],
  handleValidationErrors,
  generateAccessComplianceReport
);

/**
 * License Compliance Routes
 */

// Generate license compliance report
router.post('/reports/license-compliance',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  [
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ],
  handleValidationErrors,
  generateLicenseComplianceReport
);

// Get license compliance summary
router.get('/license/compliance-summary',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  getLicenseComplianceSummary
);

/**
 * Enhanced Dashboard Routes
 */

// Get comprehensive compliance overview
router.get('/overview',
  permissionMiddleware(['admin', 'compliance_officer', 'manager']),
  async (req, res) => {
    try {
      const { tenantId } = req;
      
      // Get data from multiple sources
      const [
        complianceDashboard,
        licenseComplianceSummary,
        retentionStats,
        recentAnomalies
      ] = await Promise.all([
        // Get basic compliance dashboard
        new Promise(async (resolve) => {
          try {
            const dashboard = await getComplianceDashboard(req, { json: (data) => resolve(data.data) });
          } catch (error) {
            resolve({ summary: {}, alerts: [] });
          }
        }),
        
        // Get license compliance summary
        new Promise(async (resolve) => {
          try {
            const summary = await getLicenseComplianceSummary(req, { json: (data) => resolve(data.data) });
          } catch (error) {
            resolve({ summary: {}, violations: [] });
          }
        }),
        
        // Get retention statistics
        dataRetentionService.getRetentionStatistics(tenantId).catch(() => ({})),
        
        // Get recent access anomalies (mock for now)
        Promise.resolve([])
      ]);

      const overview = {
        summary: {
          ...complianceDashboard.summary,
          licenseCompliance: licenseComplianceSummary.summary,
          retentionCompliance: {
            totalPolicies: retentionStats.totalPolicies || 0,
            activePolicies: retentionStats.activePolicies || 0,
            totalArchives: retentionStats.totalArchives || 0
          },
          securityCompliance: {
            recentAnomalies: recentAnomalies.length,
            accessPatternScore: 85 // Mock score
          }
        },
        
        alerts: [
          ...complianceDashboard.alerts || [],
          ...(licenseComplianceSummary.violations || []).map(v => ({
            type: 'license_violation',
            severity: v.severity,
            message: v.message,
            action: 'review_license'
          }))
        ],
        
        quickStats: {
          dataRetention: {
            policiesActive: retentionStats.activePolicies || 0,
            archivesTotal: retentionStats.totalArchives || 0,
            lastExecution: retentionStats.recentExecutions?.[0]?.lastExecuted || null
          },
          licenseCompliance: {
            complianceScore: licenseComplianceSummary.summary?.complianceScore || 0,
            violationsCount: licenseComplianceSummary.violations?.length || 0,
            daysUntilExpiry: licenseComplianceSummary.summary?.daysUntilExpiry || 0
          },
          accessSecurity: {
            anomaliesCount: recentAnomalies.length,
            lastAnalysis: new Date()
          }
        },
        
        recommendations: [
          ...(licenseComplianceSummary.topRecommendations || []),
          ...(complianceDashboard.alerts || []).map(alert => ({
            title: alert.message,
            priority: alert.type === 'warning' ? 'medium' : 'high',
            category: 'data_management'
          }))
        ].slice(0, 5) // Top 5 recommendations
      };

      res.json({
        success: true,
        data: overview
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get compliance overview',
        error: error.message
      });
    }
  }
);