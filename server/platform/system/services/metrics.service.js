// services/metrics.service.js
import { register, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import logger from '../utils/logger.js';

/**
 * Prometheus Metrics Service
 * Collects and exposes metrics for license validation, usage tracking, and system health
 */
class MetricsService {
    constructor() {
        // Enable default metrics (CPU, memory, etc.)
        collectDefaultMetrics({ register });

        // License Validation Metrics
        this.licenseValidationTotal = new Counter({
            name: 'license_validation_total',
            help: 'Total number of license validation attempts',
            labelNames: ['tenant_id', 'module_key', 'result', 'deployment_mode']
        });

        this.licenseValidationDuration = new Histogram({
            name: 'license_validation_duration_seconds',
            help: 'Duration of license validation operations',
            labelNames: ['tenant_id', 'module_key', 'deployment_mode'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        });

        this.licenseValidationErrors = new Counter({
            name: 'license_validation_errors_total',
            help: 'Total number of license validation errors',
            labelNames: ['tenant_id', 'module_key', 'error_type']
        });

        // Module Activation/Deactivation Metrics
        this.moduleActivations = new Counter({
            name: 'module_activations_total',
            help: 'Total number of module activations',
            labelNames: ['tenant_id', 'module_key']
        });

        this.moduleDeactivations = new Counter({
            name: 'module_deactivations_total',
            help: 'Total number of module deactivations',
            labelNames: ['tenant_id', 'module_key']
        });

        // License Expiration Metrics
        this.licenseExpiringCount = new Gauge({
            name: 'license_expiring_count',
            help: 'Number of licenses expiring within specified days',
            labelNames: ['days_until_expiration', 'module_key']
        });

        this.licenseExpiredCount = new Gauge({
            name: 'license_expired_count',
            help: 'Number of expired licenses',
            labelNames: ['module_key']
        });

        // Usage Limit Metrics
        this.usageLimitPercentage = new Gauge({
            name: 'usage_limit_percentage',
            help: 'Current usage as percentage of limit',
            labelNames: ['tenant_id', 'module_key', 'limit_type']
        });

        this.usageLimitWarnings = new Counter({
            name: 'usage_limit_warnings_total',
            help: 'Total number of usage limit warnings (>80%)',
            labelNames: ['tenant_id', 'module_key', 'limit_type']
        });

        this.usageLimitExceeded = new Counter({
            name: 'usage_limit_exceeded_total',
            help: 'Total number of times usage limits were exceeded',
            labelNames: ['tenant_id', 'module_key', 'limit_type']
        });

        // Cache Metrics
        this.cacheHits = new Counter({
            name: 'license_cache_hits_total',
            help: 'Total number of license validation cache hits',
            labelNames: ['cache_type']
        });

        this.cacheMisses = new Counter({
            name: 'license_cache_misses_total',
            help: 'Total number of license validation cache misses',
            labelNames: ['cache_type']
        });

        // Audit Log Metrics
        this.auditLogEntries = new Counter({
            name: 'audit_log_entries_total',
            help: 'Total number of audit log entries created',
            labelNames: ['event_type', 'severity']
        });

        // Active Licenses Gauge
        this.activeLicenses = new Gauge({
            name: 'active_licenses_count',
            help: 'Number of currently active licenses',
            labelNames: ['module_key', 'tier']
        });

        logger.info('Metrics service initialized');
    }

    /**
     * Record a license validation attempt
     */
    recordLicenseValidation(tenantId, moduleKey, result, deploymentMode, duration) {
        this.licenseValidationTotal.inc({
            tenant_id: tenantId,
            module_key: moduleKey,
            result: result ? 'success' : 'failure',
            deployment_mode: deploymentMode
        });

        if (duration !== undefined) {
            this.licenseValidationDuration.observe(
                {
                    tenant_id: tenantId,
                    module_key: moduleKey,
                    deployment_mode: deploymentMode
                },
                duration
            );
        }
    }

    /**
     * Record a license validation error
     */
    recordLicenseValidationError(tenantId, moduleKey, errorType) {
        this.licenseValidationErrors.inc({
            tenant_id: tenantId,
            module_key: moduleKey,
            error_type: errorType
        });
    }

    /**
     * Record module activation
     */
    recordModuleActivation(tenantId, moduleKey) {
        this.moduleActivations.inc({
            tenant_id: tenantId,
            module_key: moduleKey
        });
    }

    /**
     * Record module deactivation
     */
    recordModuleDeactivation(tenantId, moduleKey) {
        this.moduleDeactivations.inc({
            tenant_id: tenantId,
            module_key: moduleKey
        });
    }

    /**
     * Update license expiration metrics
     */
    updateLicenseExpirationMetrics(expiringIn30Days, expiringIn7Days, expired, moduleKey) {
        this.licenseExpiringCount.set(
            { days_until_expiration: '30', module_key: moduleKey },
            expiringIn30Days
        );
        this.licenseExpiringCount.set(
            { days_until_expiration: '7', module_key: moduleKey },
            expiringIn7Days
        );
        this.licenseExpiredCount.set(
            { module_key: moduleKey },
            expired
        );
    }

    /**
     * Update usage limit percentage
     */
    updateUsageLimitPercentage(tenantId, moduleKey, limitType, percentage) {
        this.usageLimitPercentage.set(
            {
                tenant_id: tenantId,
                module_key: moduleKey,
                limit_type: limitType
            },
            percentage
        );
    }

    /**
     * Record usage limit warning
     */
    recordUsageLimitWarning(tenantId, moduleKey, limitType) {
        this.usageLimitWarnings.inc({
            tenant_id: tenantId,
            module_key: moduleKey,
            limit_type: limitType
        });
    }

    /**
     * Record usage limit exceeded
     */
    recordUsageLimitExceeded(tenantId, moduleKey, limitType) {
        this.usageLimitExceeded.inc({
            tenant_id: tenantId,
            module_key: moduleKey,
            limit_type: limitType
        });
    }

    /**
     * Record cache hit
     */
    recordCacheHit(cacheType) {
        this.cacheHits.inc({ cache_type: cacheType });
    }

    /**
     * Record cache miss
     */
    recordCacheMiss(cacheType) {
        this.cacheMisses.inc({ cache_type: cacheType });
    }

    /**
     * Record audit log entry
     */
    recordAuditLogEntry(eventType, severity) {
        this.auditLogEntries.inc({
            event_type: eventType,
            severity: severity
        });
    }

    /**
     * Update active licenses count
     */
    updateActiveLicenses(moduleKey, tier, count) {
        this.activeLicenses.set(
            {
                module_key: moduleKey,
                tier: tier
            },
            count
        );
    }

    /**
     * Get metrics in Prometheus format
     */
    async getMetrics() {
        return register.metrics();
    }

    /**
     * Get metrics content type
     */
    getContentType() {
        return register.contentType;
    }

    /**
     * Reset all metrics (useful for testing)
     */
    reset() {
        register.resetMetrics();
    }
}

// Export singleton instance
const metricsService = new MetricsService();
export default metricsService;
