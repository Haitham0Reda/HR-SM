/**
 * Platform Logging Control Service
 * 
 * Provides platform administrators with complete control over company logging capabilities.
 * Manages license enforcement, usage monitoring, and policy compliance for all company logging.
 */

import licenseControlledLoggingService from './licenseControlledLogging.service.js';
import loggingModuleService from './loggingModule.service.js';
import licenseValidator from '../platform/system/services/licenseValidator.service.js';
import { MODULES } from '../platform/system/models/license.model.js';
import platformLogger from '../utils/platformLogger.js';
import EventEmitter from 'events';

/**
 * Platform Logging Control Service
 */
class PlatformLoggingControlService extends EventEmitter {
    constructor() {
        super();
        this.monitoringInterval = null;
        this.initialized = false;
    }

    /**
     * Initialize the platform logging control service
     */
    async initialize() {
        try {
            // Initialize dependent services
            if (!licenseControlledLoggingService.initialized) {
                await licenseControlledLoggingService.initialize();
            }

            // Start monitoring
            this.startMonitoring();

            this.initialized = true;
            platformLogger.info('Platform Logging Control Service initialized');
        } catch (error) {
            platformLogger.error('Failed to initialize Platform Logging Control Service', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get comprehensive logging control dashboard data
     */
    async getControlDashboard() {
        const dashboard = {
            overview: {
                totalCompanies: 0,
                licensedCompanies: 0,
                unlicensedCompanies: 0,
                suspendedCompanies: 0,
                totalDailyEvents: 0,
                platformControlEvents: 0
            },
            licenseDistribution: {
                starter: 0,
                business: 0,
                enterprise: 0,
                unlicensed: 0
            },
            usageMetrics: {
                totalStorageUsed: 0,
                averageDailyEvents: 0,
                peakUsageCompany: null,
                lowUsageCompanies: []
            },
            complianceStatus: {
                compliantCompanies: 0,
                violatingCompanies: 0,
                recentViolations: []
            },
            platformPolicies: {
                mandatoryEventsEnforced: true,
                essentialLoggingActive: true,
                suspensionsPending: 0,
                policyViolations: 0
            }
        };

        // This would typically query the database for real data
        // For now, we return the structure
        return dashboard;
    }

    /**
     * Get detailed company logging status
     */
    async getCompanyLoggingStatus(tenantId) {
        const status = {
            tenantId,
            licenseStatus: null,
            capabilities: null,
            usage: null,
            compliance: null,
            platformControl: null
        };

        try {
            // Get license status
            status.licenseStatus = await licenseControlledLoggingService.hasValidLoggingLicense(tenantId);
            
            // Get capabilities
            status.capabilities = await licenseControlledLoggingService.getLoggingCapabilities(tenantId);
            
            // Get usage statistics
            status.usage = await licenseControlledLoggingService.getUsageStatistics(tenantId, 30);
            
            // Get compliance status
            status.compliance = await this.getComplianceStatus(tenantId);
            
            // Get platform control status
            status.platformControl = await this.getPlatformControlStatus(tenantId);

        } catch (error) {
            platformLogger.error('Failed to get company logging status', {
                tenantId,
                error: error.message
            });
            status.error = error.message;
        }

        return status;
    }

    /**
     * Enforce logging license for a company
     */
    async enforceLoggingLicense(tenantId, adminUser, reason = 'Platform policy enforcement') {
        try {
            const licenseCheck = await licenseControlledLoggingService.hasValidLoggingLicense(tenantId);
            
            if (!licenseCheck.valid) {
                // Suspend all non-essential logging
                await this.suspendCompanyLogging(tenantId, adminUser, 'No valid logging license');
                
                platformLogger.adminAction('Logging license enforcement applied', adminUser, {
                    tenantId,
                    reason,
                    action: 'suspend_logging',
                    licenseError: licenseCheck.error,
                    timestamp: new Date().toISOString()
                });

                return {
                    success: true,
                    action: 'suspended',
                    reason: 'No valid logging license'
                };
            }

            return {
                success: true,
                action: 'none_required',
                reason: 'Valid license found'
            };

        } catch (error) {
            platformLogger.error('Failed to enforce logging license', {
                tenantId,
                adminUser,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Suspend company logging (platform administrative action)
     */
    async suspendCompanyLogging(tenantId, adminUser, reason) {
        try {
            // Use the license-controlled logging service to suspend
            const suspension = await licenseControlledLoggingService.suspendLogging(tenantId, reason, adminUser);
            
            // Log platform action
            platformLogger.adminAction('Company logging suspended by platform', adminUser, {
                tenantId,
                reason,
                suspendedAt: suspension.suspendedAt,
                platformAction: true
            });

            // Emit event for other services
            this.emit('companyLoggingSuspended', {
                tenantId,
                adminUser,
                reason,
                timestamp: new Date().toISOString()
            });

            return suspension;

        } catch (error) {
            platformLogger.error('Failed to suspend company logging', {
                tenantId,
                adminUser,
                reason,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Restore company logging (after suspension)
     */
    async restoreCompanyLogging(tenantId, adminUser, reason) {
        try {
            // Check if they have a valid license first
            const licenseCheck = await licenseControlledLoggingService.hasValidLoggingLicense(tenantId);
            
            if (!licenseCheck.valid) {
                throw new Error('Cannot restore logging without valid license');
            }

            // Get their tier-appropriate configuration
            const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(tenantId);
            
            // Update logging module configuration
            await loggingModuleService.updateConfig(tenantId, {
                enabled: true,
                features: capabilities.features,
                restoredBy: adminUser,
                restoredAt: new Date().toISOString(),
                restorationReason: reason
            }, adminUser);

            // Log platform action
            platformLogger.adminAction('Company logging restored by platform', adminUser, {
                tenantId,
                reason,
                tier: capabilities.tier,
                restoredAt: new Date().toISOString(),
                platformAction: true
            });

            // Emit event
            this.emit('companyLoggingRestored', {
                tenantId,
                adminUser,
                reason,
                tier: capabilities.tier,
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                tier: capabilities.tier,
                features: capabilities.features,
                restoredAt: new Date().toISOString()
            };

        } catch (error) {
            platformLogger.error('Failed to restore company logging', {
                tenantId,
                adminUser,
                reason,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Force essential logging for a company (emergency override)
     */
    async forceEssentialLogging(tenantId, adminUser, reason, duration = '24h') {
        try {
            const override = await licenseControlledLoggingService.forceEssentialLogging(tenantId, reason, adminUser);
            
            // Log platform emergency action
            platformLogger.adminAction('Essential logging forced by platform', adminUser, {
                tenantId,
                reason,
                duration,
                emergencyOverride: true,
                timestamp: new Date().toISOString()
            });

            return override;

        } catch (error) {
            platformLogger.error('Failed to force essential logging', {
                tenantId,
                adminUser,
                reason,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Bulk enforce logging policies across all companies
     */
    async bulkEnforcePolicies(adminUser, options = {}) {
        const results = {
            processed: 0,
            suspended: 0,
            restored: 0,
            errors: 0,
            details: []
        };

        try {
            // This would typically get all companies from the database
            const companies = []; // Placeholder for actual company list
            
            for (const company of companies) {
                try {
                    const enforcement = await this.enforceLoggingLicense(company.tenantId, adminUser, 'Bulk policy enforcement');
                    
                    results.processed++;
                    if (enforcement.action === 'suspended') {
                        results.suspended++;
                    } else if (enforcement.action === 'restored') {
                        results.restored++;
                    }
                    
                    results.details.push({
                        tenantId: company.tenantId,
                        action: enforcement.action,
                        reason: enforcement.reason
                    });

                } catch (error) {
                    results.errors++;
                    results.details.push({
                        tenantId: company.tenantId,
                        error: error.message
                    });
                }
            }

            // Log bulk operation
            platformLogger.adminAction('Bulk logging policy enforcement completed', adminUser, {
                results,
                options,
                timestamp: new Date().toISOString()
            });

            return results;

        } catch (error) {
            platformLogger.error('Bulk policy enforcement failed', {
                adminUser,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get compliance status for a company
     */
    async getComplianceStatus(tenantId) {
        const compliance = {
            compliant: true,
            violations: [],
            lastChecked: new Date().toISOString(),
            mandatoryEventsLogged: true,
            retentionCompliant: true,
            licenseCompliant: true
        };

        try {
            // Check license compliance
            const licenseCheck = await licenseControlledLoggingService.hasValidLoggingLicense(tenantId);
            compliance.licenseCompliant = licenseCheck.valid;
            
            if (!licenseCheck.valid) {
                compliance.compliant = false;
                compliance.violations.push({
                    type: 'license_violation',
                    severity: 'high',
                    description: licenseCheck.reason,
                    detectedAt: new Date().toISOString()
                });
            }

            // Check usage compliance
            const capabilities = await licenseControlledLoggingService.getLoggingCapabilities(tenantId);
            const usage = await licenseControlledLoggingService.checkDailyUsage(tenantId, capabilities.limits);
            
            if (!usage.allowed) {
                compliance.violations.push({
                    type: 'usage_violation',
                    severity: 'medium',
                    description: 'Daily logging limit exceeded',
                    currentUsage: usage.currentUsage,
                    limit: usage.limit,
                    detectedAt: new Date().toISOString()
                });
            }

        } catch (error) {
            compliance.compliant = false;
            compliance.violations.push({
                type: 'check_error',
                severity: 'high',
                description: 'Failed to check compliance status',
                error: error.message,
                detectedAt: new Date().toISOString()
            });
        }

        return compliance;
    }

    /**
     * Get platform control status for a company
     */
    async getPlatformControlStatus(tenantId) {
        const controlStatus = {
            underPlatformControl: true,
            controlLevel: 'full', // full, partial, minimal
            restrictions: [],
            overrides: [],
            lastControlAction: null,
            mandatoryLoggingActive: true
        };

        try {
            // Check if company has any active restrictions
            const config = await loggingModuleService.getConfig(tenantId);
            
            if (config.suspendedBy) {
                controlStatus.restrictions.push({
                    type: 'suspended',
                    reason: config.suspensionReason,
                    appliedBy: config.suspendedBy,
                    appliedAt: config.suspendedAt
                });
                controlStatus.controlLevel = 'full';
            }

            // Check for any overrides
            if (config.forcedEssential) {
                controlStatus.overrides.push({
                    type: 'essential_logging_forced',
                    reason: config.essentialReason,
                    appliedBy: config.essentialForcedBy,
                    appliedAt: config.essentialForcedAt
                });
            }

        } catch (error) {
            platformLogger.error('Failed to get platform control status', {
                tenantId,
                error: error.message
            });
        }

        return controlStatus;
    }

    /**
     * Start monitoring company logging activities
     */
    startMonitoring() {
        // Monitor every 5 minutes
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.performMonitoringCheck();
            } catch (error) {
                platformLogger.error('Monitoring check failed', {
                    error: error.message
                });
            }
        }, 5 * 60 * 1000);

        platformLogger.info('Platform logging monitoring started');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            platformLogger.info('Platform logging monitoring stopped');
        }
    }

    /**
     * Perform periodic monitoring check
     */
    async performMonitoringCheck() {
        const checkResults = {
            timestamp: new Date().toISOString(),
            companiesChecked: 0,
            violationsFound: 0,
            actionsRequired: 0
        };

        // This would typically check all companies
        // For now, we just log the monitoring activity
        platformLogger.systemHealth('logging_monitoring_check', 'healthy', checkResults);
    }

    /**
     * Generate platform logging control report
     */
    async generateControlReport(adminUser, options = {}) {
        const report = {
            generatedBy: adminUser,
            generatedAt: new Date().toISOString(),
            reportPeriod: options.period || '30 days',
            summary: await this.getControlDashboard(),
            companyDetails: [],
            recommendations: [],
            platformActions: []
        };

        // Add recommendations based on current state
        report.recommendations.push({
            priority: 'high',
            category: 'license_compliance',
            description: 'Ensure all companies have valid logging licenses',
            action: 'Review and enforce logging license requirements'
        });

        // Log report generation
        platformLogger.adminAction('Platform logging control report generated', adminUser, {
            reportId: `report_${Date.now()}`,
            options,
            timestamp: new Date().toISOString()
        });

        return report;
    }
}

// Create singleton instance
const platformLoggingControlService = new PlatformLoggingControlService();

export default platformLoggingControlService;
export { PlatformLoggingControlService };