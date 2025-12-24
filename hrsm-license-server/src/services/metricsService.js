// License Server Metrics Service
import { register, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import logger from '../utils/logger.js';

/**
 * Prometheus Metrics Service for License Server
 * Collects and exposes metrics specific to license operations
 */
class LicenseMetricsService {
    constructor() {
        // Enable default metrics (CPU, memory, etc.)
        collectDefaultMetrics({ 
            register,
            prefix: 'license_server_'
        });

        // License Creation Metrics
        this.licenseCreationTotal = new Counter({
            name: 'license_creation_total',
            help: 'Total number of license creation attempts',
            labelNames: ['tenant_id', 'license_type', 'result']
        });

        this.licenseCreationDuration = new Histogram({
            name: 'license_creation_duration_seconds',
            help: 'Duration of license creation operations',
            labelNames: ['license_type'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        });

        // License Validation Metrics
        this.licenseValidationTotal = new Counter({
            name: 'license_validation_total',
            help: 'Total number of license validation requests',
            labelNames: ['tenant_id', 'result', 'validation_type']
        });

        this.licenseValidationDuration = new Histogram({
            name: 'license_validation_duration_seconds',
            help: 'Duration of license validation operations',
            labelNames: ['validation_type'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
        });

        this.licenseValidationErrors = new Counter({
            name: 'license_validation_errors_total',
            help: 'Total number of license validation errors',
            labelNames: ['error_type', 'tenant_id']
        });

        // License Status Metrics
        this.activeLicensesCount = new Gauge({
            name: 'license_active_count',
            help: 'Number of currently active licenses',
            labelNames: ['license_type']
        });

        this.expiredLicensesCount = new Gauge({
            name: 'license_expired_count',
            help: 'Number of expired licenses',
            labelNames: ['license_type']
        });

        this.revokedLicensesCount = new Gauge({
            name: 'license_revoked_count',
            help: 'Number of revoked licenses',
            labelNames: ['license_type']
        });

        // License Expiration Warnings
        this.licenseExpiringCount = new Gauge({
            name: 'license_expiring_count',
            help: 'Number of licenses expiring within specified days',
            labelNames: ['days_until_expiry', 'license_type']
        });

        // License Activation Metrics
        this.licenseActivationTotal = new Counter({
            name: 'license_activation_total',
            help: 'Total number of license activations',
            labelNames: ['tenant_id', 'machine_id']
        });

        this.licenseActivationFailures = new Counter({
            name: 'license_activation_failures_total',
            help: 'Total number of failed license activations',
            labelNames: ['tenant_id', 'failure_reason']
        });

        // License Renewal Metrics
        this.licenseRenewalTotal = new Counter({
            name: 'license_renewal_total',
            help: 'Total number of license renewals',
            labelNames: ['tenant_id', 'license_type', 'result']
        });

        // Cache Metrics
        this.validationCacheHits = new Counter({
            name: 'license_validation_cache_hits_total',
            help: 'Total number of license validation cache hits'
        });

        this.validationCacheMisses = new Counter({
            name: 'license_validation_cache_misses_total',
            help: 'Total number of license validation cache misses'
        });

        // Database Metrics
        this.databaseOperationTotal = new Counter({
            name: 'license_database_operations_total',
            help: 'Total number of database operations',
            labelNames: ['operation', 'collection', 'result']
        });

        this.databaseOperationDuration = new Histogram({
            name: 'license_database_operation_duration_seconds',
            help: 'Duration of database operations',
            labelNames: ['operation', 'collection'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
        });

        // API Request Metrics
        this.httpRequestsTotal = new Counter({
            name: 'license_http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code']
        });

        this.httpRequestDuration = new Histogram({
            name: 'license_http_request_duration_seconds',
            help: 'Duration of HTTP requests',
            labelNames: ['method', 'route'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        });

        // JWT Token Metrics
        this.jwtSigningTotal = new Counter({
            name: 'license_jwt_signing_total',
            help: 'Total number of JWT signing operations',
            labelNames: ['result']
        });

        this.jwtVerificationTotal = new Counter({
            name: 'license_jwt_verification_total',
            help: 'Total number of JWT verification operations',
            labelNames: ['result']
        });

        logger.info('License server metrics service initialized');
    }

    // License Creation Methods
    recordLicenseCreation(tenantId, licenseType, success, duration) {
        this.licenseCreationTotal.inc({
            tenant_id: tenantId,
            license_type: licenseType,
            result: success ? 'success' : 'failure'
        });

        if (duration !== undefined) {
            this.licenseCreationDuration.observe(
                { license_type: licenseType },
                duration
            );
        }
    }

    // License Validation Methods
    recordLicenseValidation(tenantId, success, validationType, duration) {
        this.licenseValidationTotal.inc({
            tenant_id: tenantId,
            result: success ? 'success' : 'failure',
            validation_type: validationType
        });

        if (duration !== undefined) {
            this.licenseValidationDuration.observe(
                { validation_type: validationType },
                duration
            );
        }
    }

    recordLicenseValidationError(errorType, tenantId) {
        this.licenseValidationErrors.inc({
            error_type: errorType,
            tenant_id: tenantId
        });
    }

    // License Status Methods
    updateLicenseStatusCounts(active, expired, revoked, licenseType = 'all') {
        this.activeLicensesCount.set({ license_type: licenseType }, active);
        this.expiredLicensesCount.set({ license_type: licenseType }, expired);
        this.revokedLicensesCount.set({ license_type: licenseType }, revoked);
    }

    updateLicenseExpiringCount(count, daysUntilExpiry, licenseType = 'all') {
        this.licenseExpiringCount.set({
            days_until_expiry: daysUntilExpiry.toString(),
            license_type: licenseType
        }, count);
    }

    // License Activation Methods
    recordLicenseActivation(tenantId, machineId) {
        this.licenseActivationTotal.inc({
            tenant_id: tenantId,
            machine_id: machineId
        });
    }

    recordLicenseActivationFailure(tenantId, failureReason) {
        this.licenseActivationFailures.inc({
            tenant_id: tenantId,
            failure_reason: failureReason
        });
    }

    // License Renewal Methods
    recordLicenseRenewal(tenantId, licenseType, success) {
        this.licenseRenewalTotal.inc({
            tenant_id: tenantId,
            license_type: licenseType,
            result: success ? 'success' : 'failure'
        });
    }

    // Cache Methods
    recordCacheHit() {
        this.validationCacheHits.inc();
    }

    recordCacheMiss() {
        this.validationCacheMisses.inc();
    }

    // Database Methods
    recordDatabaseOperation(operation, collection, success, duration) {
        this.databaseOperationTotal.inc({
            operation,
            collection,
            result: success ? 'success' : 'failure'
        });

        if (duration !== undefined) {
            this.databaseOperationDuration.observe(
                { operation, collection },
                duration
            );
        }
    }

    // HTTP Request Methods
    recordHttpRequest(method, route, statusCode, duration) {
        this.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode.toString()
        });

        if (duration !== undefined) {
            this.httpRequestDuration.observe(
                { method, route },
                duration
            );
        }
    }

    // JWT Methods
    recordJwtSigning(success) {
        this.jwtSigningTotal.inc({
            result: success ? 'success' : 'failure'
        });
    }

    recordJwtVerification(success) {
        this.jwtVerificationTotal.inc({
            result: success ? 'success' : 'failure'
        });
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
const licenseMetricsService = new LicenseMetricsService();
export default licenseMetricsService;