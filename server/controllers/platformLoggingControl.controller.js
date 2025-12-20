/**
 * Platform Logging Control Controller
 * 
 * Provides API endpoints for platform administrators to control and monitor
 * company logging capabilities, enforce license compliance, and manage policies.
 */

import platformLoggingControlService from '../services/platformLoggingControl.service.js';
import licenseControlledLoggingService from '../services/licenseControlledLogging.service.js';
import platformLogger from '../utils/platformLogger.js';

/**
 * Get platform logging control dashboard
 */
export const getControlDashboard = async (req, res) => {
    try {
        const dashboard = await platformLoggingControlService.getControlDashboard();
        
        platformLogger.adminAction('Platform logging dashboard accessed', req.user?.id || 'unknown', {
            timestamp: new Date().toISOString(),
            ip: req.ip
        });

        res.json({
            success: true,
            data: dashboard
        });

    } catch (error) {
        platformLogger.error('Failed to get control dashboard', {
            error: error.message,
            stack: error.stack,
            adminUser: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: 'DASHBOARD_FETCH_FAILED',
            message: 'Failed to retrieve platform logging dashboard'
        });
    }
};

/**
 * Get detailed logging status for a specific company
 */
export const getCompanyLoggingStatus = async (req, res) => {
    try {
        const { tenantId } = req.params;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_ID_REQUIRED',
                message: 'Tenant ID is required'
            });
        }

        const status = await platformLoggingControlService.getCompanyLoggingStatus(tenantId);
        
        platformLogger.adminAction('Company logging status accessed', req.user?.id || 'unknown', {
            tenantId,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        platformLogger.error('Failed to get company logging status', {
            tenantId: req.params.tenantId,
            error: error.message,
            adminUser: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: 'STATUS_FETCH_FAILED',
            message: 'Failed to retrieve company logging status'
        });
    }
};

/**
 * Enforce logging license for a company
 */
export const enforceLoggingLicense = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { reason } = req.body;
        const adminUser = req.user?.id || 'unknown';

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_ID_REQUIRED',
                message: 'Tenant ID is required'
            });
        }

        const result = await platformLoggingControlService.enforceLoggingLicense(
            tenantId, 
            adminUser, 
            reason || 'Platform administrator enforcement'
        );

        res.json({
            success: true,
            data: result,
            message: `License enforcement ${result.action} for company ${tenantId}`
        });

    } catch (error) {
        platformLogger.error('Failed to enforce logging license', {
            tenantId: req.params.tenantId,
            error: error.message,
            adminUser: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: 'ENFORCEMENT_FAILED',
            message: 'Failed to enforce logging license'
        });
    }
};

/**
 * Suspend company logging
 */
export const suspendCompanyLogging = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { reason } = req.body;
        const adminUser = req.user?.id || 'unknown';

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_ID_REQUIRED',
                message: 'Tenant ID is required'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'REASON_REQUIRED',
                message: 'Suspension reason is required'
            });
        }

        const suspension = await platformLoggingControlService.suspendCompanyLogging(
            tenantId, 
            adminUser, 
            reason
        );

        res.json({
            success: true,
            data: suspension,
            message: `Logging suspended for company ${tenantId}`
        });

    } catch (error) {
        platformLogger.error('Failed to suspend company logging', {
            tenantId: req.params.tenantId,
            error: error.message,
            adminUser: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: 'SUSPENSION_FAILED',
            message: 'Failed to suspend company logging'
        });
    }
};

/**
 * Restore company logging
 */
export const restoreCompanyLogging = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { reason } = req.body;
        const adminUser = req.user?.id || 'unknown';

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_ID_REQUIRED',
                message: 'Tenant ID is required'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'REASON_REQUIRED',
                message: 'Restoration reason is required'
            });
        }

        const restoration = await platformLoggingControlService.restoreCompanyLogging(
            tenantId, 
            adminUser, 
            reason
        );

        res.json({
            success: true,
            data: restoration,
            message: `Logging restored for company ${tenantId}`
        });

    } catch (error) {
        platformLogger.error('Failed to restore company logging', {
            tenantId: req.params.tenantId,
            error: error.message,
            adminUser: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: 'RESTORATION_FAILED',
            message: 'Failed to restore company logging'
        });
    }
};

/**
 * Force essential logging for a company
 */
export const forceEssentialLogging = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { reason, duration } = req.body;
        const adminUser = req.user?.id || 'unknown';

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_ID_REQUIRED',
                message: 'Tenant ID is required'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'REASON_REQUIRED',
                message: 'Reason for forcing essential logging is required'
            });
        }

        const override = await platformLoggingControlService.forceEssentialLogging(
            tenantId, 
            adminUser, 
            reason,
            duration || '24h'
        );

        res.json({
            success: true,
            data: override,
            message: `Essential logging forced for company ${tenantId}`
        });

    } catch (error) {
        platformLogger.error('Failed to force essential logging', {
            tenantId: req.params.tenantId,
            error: error.message,
            adminUser: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: 'FORCE_ESSENTIAL_FAILED',
            message: 'Failed to force essential logging'
        });
    }
};

/**
 * Bulk enforce logging policies
 */
export const bulkEnforcePolicies = async (req, res) => {
    try {
        const { options } = req.body;
        const adminUser = req.user?.id || 'unknown';

        const results = await platformLoggingControlService.bulkEnforcePolicies(adminUser, options);

        res.json({
            success: true,
            data: results,
            message: `Bulk policy enforcement completed. Processed ${results.processed} companies.`
        });

    } catch (error) {
        platformLogger.error('Failed to bulk enforce policies', {
            error: error.message,
            adminUser: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: 'BULK_ENFORCEMENT_FAILED',
            message: 'Failed to bulk enforce logging policies'
        });
    }
};

/**
 * Get company logging capabilities
 */
export const getCompanyCapabilities = async (req, res) => {
    try {
        const { tenantId } = req.params;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_ID_REQUIRED',
                message: 'Tenant ID is required'
            });
        }

        const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(tenantId);

        res.json({
            success: true,
            data: capabilities
        });

    } catch (error) {
        platformLogger.error('Failed to get company capabilities', {
            tenantId: req.params.tenantId,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: 'CAPABILITIES_FETCH_FAILED',
            message: 'Failed to retrieve company logging capabilities'
        });
    }
};

/**
 * Get company usage statistics
 */
export const getCompanyUsageStats = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { days } = req.query;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_ID_REQUIRED',
                message: 'Tenant ID is required'
            });
        }

        const stats = await licenseControlledLoggingService.getUsageStatistics(
            tenantId, 
            parseInt(days) || 30
        );

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        platformLogger.error('Failed to get company usage stats', {
            tenantId: req.params.tenantId,
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: 'USAGE_STATS_FAILED',
            message: 'Failed to retrieve company usage statistics'
        });
    }
};

/**
 * Generate platform logging control report
 */
export const generateControlReport = async (req, res) => {
    try {
        const { options } = req.body;
        const adminUser = req.user?.id || 'unknown';

        const report = await platformLoggingControlService.generateControlReport(adminUser, options);

        res.json({
            success: true,
            data: report,
            message: 'Platform logging control report generated successfully'
        });

    } catch (error) {
        platformLogger.error('Failed to generate control report', {
            error: error.message,
            adminUser: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: 'REPORT_GENERATION_FAILED',
            message: 'Failed to generate platform logging control report'
        });
    }
};

/**
 * Get platform control summary
 */
export const getPlatformControlSummary = async (req, res) => {
    try {
        const summary = await licenseControlledLoggingService.getPlatformControlSummary();

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        platformLogger.error('Failed to get platform control summary', {
            error: error.message
        });

        res.status(500).json({
            success: false,
            error: 'SUMMARY_FETCH_FAILED',
            message: 'Failed to retrieve platform control summary'
        });
    }
};

export default {
    getControlDashboard,
    getCompanyLoggingStatus,
    enforceLoggingLicense,
    suspendCompanyLogging,
    restoreCompanyLogging,
    forceEssentialLogging,
    bulkEnforcePolicies,
    getCompanyCapabilities,
    getCompanyUsageStats,
    generateControlReport,
    getPlatformControlSummary
};