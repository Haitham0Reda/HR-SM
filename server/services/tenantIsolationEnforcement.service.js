/**
 * Tenant Isolation Enforcement Service
 * 
 * Implements runtime tenant boundary checks, isolation validation for exports and analysis,
 * and cross-tenant access prevention
 * 
 * Requirements: 3.5 - Tenant isolation enforcement
 */

import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

// Mock __filename and __dirname for Jest compatibility
const __filename = 'tenantIsolationEnforcement.service.js';
const __dirname = '.';

/**
 * Tenant Boundary Violation Types
 */
const VIOLATION_TYPES = {
    CROSS_TENANT_DATA_ACCESS: 'cross_tenant_data_access',
    UNAUTHORIZED_EXPORT: 'unauthorized_export',
    PATH_TRAVERSAL: 'path_traversal',
    TENANT_SPOOFING: 'tenant_spoofing',
    ISOLATION_BYPASS: 'isolation_bypass',
    CROSS_COMPANY_QUERY: 'cross_company_query'
};

/**
 * Isolation Check Result
 */
class IsolationCheckResult {
    constructor(valid, violations = [], warnings = []) {
        this.valid = valid;
        this.violations = violations;
        this.warnings = warnings;
        this.timestamp = new Date().toISOString();
        this.checkId = crypto.randomUUID();
    }

    static success(warnings = []) {
        return new IsolationCheckResult(true, [], warnings);
    }

    static failure(violations, warnings = []) {
        return new IsolationCheckResult(false, violations, warnings);
    }

    addViolation(type, description, context = {}) {
        this.violations.push({
            type,
            description,
            context,
            timestamp: new Date().toISOString()
        });
        this.valid = false;
    }

    addWarning(description, context = {}) {
        this.warnings.push({
            description,
            context,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Tenant Context Validator
 */
class TenantContextValidator {
    constructor() {
        this.validationCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Validate tenant context from request
     */
    validateTenantContext(req) {
        const result = new IsolationCheckResult(true);

        // Handle null/undefined request gracefully
        if (!req) {
            result.addViolation(
                VIOLATION_TYPES.TENANT_SPOOFING,
                'Request object is required',
                { req }
            );
            return result;
        }

        // Extract tenant information from multiple sources
        const tokenTenantId = req.user?.tenantId;
        const headerTenantId = req.headers?.['x-tenant-id'];
        const contextTenantId = req.tenant?.tenantId;
        const bodyTenantId = req.body?.tenantId;
        const queryTenantId = req.query?.tenantId;

        // Check for tenant ID consistency
        const tenantIds = [tokenTenantId, headerTenantId, contextTenantId, bodyTenantId, queryTenantId]
            .filter(Boolean);

        if (tenantIds.length === 0) {
            result.addViolation(
                VIOLATION_TYPES.TENANT_SPOOFING,
                'No tenant ID found in request',
                { url: req.originalUrl, method: req.method }
            );
            return result;
        }

        // Check for tenant ID conflicts
        const uniqueTenantIds = [...new Set(tenantIds)];
        if (uniqueTenantIds.length > 1) {
            result.addViolation(
                VIOLATION_TYPES.TENANT_SPOOFING,
                'Conflicting tenant IDs in request',
                {
                    tenantIds: uniqueTenantIds,
                    sources: {
                        token: tokenTenantId,
                        header: headerTenantId,
                        context: contextTenantId,
                        body: bodyTenantId,
                        query: queryTenantId
                    }
                }
            );
        }

        // Validate primary tenant ID (from token)
        if (!tokenTenantId) {
            result.addViolation(
                VIOLATION_TYPES.TENANT_SPOOFING,
                'No tenant ID in authentication token',
                { url: req.originalUrl }
            );
            return result;
        }

        return result;
    }

    /**
     * Validate tenant isolation in file paths
     */
    validateFilePath(filePath, allowedTenantId, operation = 'read') {
        const result = new IsolationCheckResult(true);

        try {
            if (!filePath || !allowedTenantId) {
                result.addViolation(
                    VIOLATION_TYPES.ISOLATION_BYPASS,
                    'File path and tenant ID are required',
                    { filePath, allowedTenantId, operation }
                );
                return result;
            }

            // Normalize path to handle relative paths consistently
            const normalizedPath = path.normalize(filePath);
            
            // Check for directory traversal patterns before resolving
            if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
                result.addViolation(
                    VIOLATION_TYPES.PATH_TRAVERSAL,
                    'Directory traversal detected in file path',
                    { filePath, normalizedPath, operation }
                );
                return result;
            }

            // For relative paths starting with ../logs/, treat them as valid log paths
            let targetPath;
            if (normalizedPath.startsWith('../logs/') || normalizedPath.startsWith('logs/')) {
                // Extract the path after logs/
                const logsIndex = normalizedPath.indexOf('logs/');
                const pathAfterLogs = normalizedPath.substring(logsIndex + 5); // 5 = 'logs/'.length
                
                // Check if the path starts with the allowed tenant ID
                if (!pathAfterLogs.startsWith(allowedTenantId + '/') && pathAfterLogs !== allowedTenantId) {
                    result.addViolation(
                        VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS,
                        'File path violates tenant isolation',
                        {
                            filePath,
                            normalizedPath,
                            pathAfterLogs,
                            allowedTenantId,
                            operation
                        }
                    );
                    return result;
                }
                
                return result; // Valid tenant-specific path
            }

            // For absolute paths, resolve and check
            const resolvedPath = path.resolve(normalizedPath);
            
            // Check both server/logs and root logs directories
            const serverLogsDir = path.resolve(__dirname, '../logs');
            const rootLogsDir = path.resolve(process.cwd(), 'logs');
            
            // Ensure path is within either logs directory
            if (!resolvedPath.startsWith(serverLogsDir) && !resolvedPath.startsWith(rootLogsDir)) {
                result.addViolation(
                    VIOLATION_TYPES.ISOLATION_BYPASS,
                    'File path outside logs directory',
                    { filePath, resolvedPath, serverLogsDir, rootLogsDir, operation }
                );
                return result;
            }
            
            // Use the appropriate logs directory
            const logsDir = resolvedPath.startsWith(serverLogsDir) ? serverLogsDir : rootLogsDir;

            // Check tenant-specific directory isolation
            const expectedTenantPath = path.join(logsDir, allowedTenantId);
            if (!resolvedPath.startsWith(expectedTenantPath)) {
                result.addViolation(
                    VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS,
                    'File path violates tenant isolation',
                    {
                        filePath,
                        resolvedPath,
                        expectedTenantPath,
                        allowedTenantId,
                        operation
                    }
                );
            }

            return result;

        } catch (error) {
            result.addViolation(
                VIOLATION_TYPES.ISOLATION_BYPASS,
                `File path validation error: ${error.message}`,
                { filePath, error: error.message, operation }
            );
            return result;
        }
    }

    /**
     * Validate query parameters for tenant isolation
     */
    validateQueryParameters(queryParams, allowedTenantId) {
        const result = new IsolationCheckResult(true);

        // Check for explicit tenant parameters
        if (queryParams.tenantId && queryParams.tenantId !== allowedTenantId) {
            result.addViolation(
                VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS,
                'Query parameter contains different tenant ID',
                {
                    queryTenantId: queryParams.tenantId,
                    allowedTenantId,
                    allParams: queryParams
                }
            );
        }

        if (queryParams.companyId && queryParams.companyId !== allowedTenantId) {
            result.addViolation(
                VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS,
                'Query parameter contains different company ID',
                {
                    queryCompanyId: queryParams.companyId,
                    allowedTenantId,
                    allParams: queryParams
                }
            );
        }

        // Check for suspicious patterns in other parameters
        const suspiciousPatterns = [
            /tenant[_-]?id/i,
            /company[_-]?id/i,
            /org[_-]?id/i,
            /client[_-]?id/i
        ];

        for (const [key, value] of Object.entries(queryParams)) {
            if (typeof value === 'string') {
                // Check if parameter name suggests tenant-related data
                const isSuspiciousParam = suspiciousPatterns.some(pattern => pattern.test(key));
                if (isSuspiciousParam && value !== allowedTenantId) {
                    result.addWarning(
                        'Suspicious tenant-related parameter detected',
                        { paramName: key, paramValue: value, allowedTenantId }
                    );
                }

                // Check if parameter value contains other tenant IDs
                if (value.includes('-') && value.length > 10 && value !== allowedTenantId) {
                    result.addWarning(
                        'Parameter value resembles tenant ID',
                        { paramName: key, paramValue: value, allowedTenantId }
                    );
                }
            }
        }

        return result;
    }
}

/**
 * Export Isolation Validator
 */
class ExportIsolationValidator {
    /**
     * Validate export request for tenant isolation
     */
    validateExportRequest(exportConfig, allowedTenantId, userContext) {
        const result = new IsolationCheckResult(true);

        // Validate export filters
        if (exportConfig.filters) {
            const filterResult = this.validateExportFilters(exportConfig.filters, allowedTenantId);
            if (!filterResult.valid) {
                result.violations.push(...filterResult.violations);
                result.warnings.push(...filterResult.warnings);
            }
        }

        // Validate export destination
        if (exportConfig.destination) {
            const destResult = this.validateExportDestination(exportConfig.destination, allowedTenantId);
            if (!destResult.valid) {
                result.violations.push(...destResult.violations);
                result.warnings.push(...destResult.warnings);
            }
        }

        // Validate export scope
        if (exportConfig.includeAllTenants && !userContext.permissions?.canAccessAllCompanies) {
            result.addViolation(
                VIOLATION_TYPES.UNAUTHORIZED_EXPORT,
                'User not authorized to export data from all tenants',
                { userId: userContext.userId, exportConfig }
            );
        }

        // Validate time range restrictions
        if (exportConfig.timeRange) {
            const timeResult = this.validateExportTimeRange(exportConfig.timeRange, userContext);
            if (!timeResult.valid) {
                result.violations.push(...timeResult.violations);
                result.warnings.push(...timeResult.warnings);
            }
        }

        return result;
    }

    /**
     * Validate export filters for tenant isolation
     */
    validateExportFilters(filters, allowedTenantId) {
        const result = new IsolationCheckResult(true);

        // Check tenant-specific filters
        if (filters.tenantId && filters.tenantId !== allowedTenantId) {
            result.addViolation(
                VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS,
                'Export filter contains different tenant ID',
                { filterTenantId: filters.tenantId, allowedTenantId }
            );
        }

        if (filters.companyId && filters.companyId !== allowedTenantId) {
            result.addViolation(
                VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS,
                'Export filter contains different company ID',
                { filterCompanyId: filters.companyId, allowedTenantId }
            );
        }

        // Check for wildcard patterns that might bypass isolation
        const dangerousPatterns = ['*', '%', '.*', '.*'];
        for (const [key, value] of Object.entries(filters)) {
            if (typeof value === 'string' && dangerousPatterns.some(pattern => value.includes(pattern))) {
                result.addWarning(
                    'Export filter contains wildcard pattern',
                    { filterKey: key, filterValue: value }
                );
            }
        }

        return result;
    }

    /**
     * Validate export destination for security
     */
    validateExportDestination(destination, allowedTenantId) {
        const result = new IsolationCheckResult(true);

        if (destination.type === 'file') {
            // Validate file path
            const pathResult = new TenantContextValidator().validateFilePath(
                destination.path,
                allowedTenantId,
                'write'
            );
            if (!pathResult.valid) {
                result.violations.push(...pathResult.violations);
                result.valid = false;
            }
        }

        if (destination.type === 'webhook') {
            // Validate webhook URL for security
            try {
                const url = new URL(destination.url);
                
                // Block internal/private network addresses
                const hostname = url.hostname;
                if (this.isPrivateNetwork(hostname)) {
                    result.addViolation(
                        VIOLATION_TYPES.ISOLATION_BYPASS,
                        'Webhook URL points to private network',
                        { url: destination.url, hostname }
                    );
                }

                // Check for suspicious URL patterns
                if (url.pathname.includes('..') || url.pathname.includes('~')) {
                    result.addWarning(
                        'Webhook URL contains suspicious path patterns',
                        { url: destination.url }
                    );
                }

            } catch (error) {
                result.addViolation(
                    VIOLATION_TYPES.ISOLATION_BYPASS,
                    'Invalid webhook URL',
                    { url: destination.url, error: error.message }
                );
            }
        }

        return result;
    }

    /**
     * Validate export time range restrictions
     */
    validateExportTimeRange(timeRange, userContext) {
        const result = new IsolationCheckResult(true);

        const now = new Date();
        const startTime = new Date(timeRange.start);
        const endTime = new Date(timeRange.end);

        // Check for valid date range
        if (startTime >= endTime) {
            result.addViolation(
                VIOLATION_TYPES.UNAUTHORIZED_EXPORT,
                'Invalid time range: start time must be before end time',
                { timeRange }
            );
        }

        // Check for future dates
        if (startTime > now || endTime > now) {
            result.addViolation(
                VIOLATION_TYPES.UNAUTHORIZED_EXPORT,
                'Invalid time range: cannot export future data',
                { timeRange, currentTime: now.toISOString() }
            );
        }

        // Apply role-based time restrictions
        const maxTimeRange = userContext.permissions?.maxTimeRange;
        if (maxTimeRange) {
            const requestedRange = endTime.getTime() - startTime.getTime();
            if (requestedRange > maxTimeRange) {
                result.addViolation(
                    VIOLATION_TYPES.UNAUTHORIZED_EXPORT,
                    'Time range exceeds user permissions',
                    {
                        requestedRange: requestedRange,
                        maxAllowed: maxTimeRange,
                        userRole: userContext.userRole
                    }
                );
            }
        }

        return result;
    }

    /**
     * Check if hostname is in private network range
     */
    isPrivateNetwork(hostname) {
        // Check for localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
            return true;
        }

        // Check for private IP ranges
        const privateRanges = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^169\.254\./, // Link-local
            /^fc00:/, // IPv6 private
            /^fe80:/ // IPv6 link-local
        ];

        return privateRanges.some(range => range.test(hostname));
    }
}

/**
 * Analysis Isolation Validator
 */
class AnalysisIsolationValidator {
    /**
     * Validate analysis query for tenant isolation
     */
    validateAnalysisQuery(query, allowedTenantId, userContext) {
        const result = new IsolationCheckResult(true);

        // Validate query filters
        if (query.filters) {
            const filterResult = this.validateAnalysisFilters(query.filters, allowedTenantId);
            if (!filterResult.valid) {
                result.violations.push(...filterResult.violations);
                result.warnings.push(...filterResult.warnings);
            }
        }

        // Validate aggregation scope
        if (query.aggregation && query.aggregation.groupBy) {
            const groupResult = this.validateGroupByFields(query.aggregation.groupBy, allowedTenantId);
            if (!groupResult.valid) {
                result.violations.push(...groupResult.violations);
                result.warnings.push(...groupResult.warnings);
            }
        }

        // Validate cross-tenant analysis permissions
        if (query.includeCrossTenantAnalysis && !userContext.permissions?.canAccessAllCompanies) {
            result.addViolation(
                VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS,
                'User not authorized for cross-tenant analysis',
                { userId: userContext.userId, query }
            );
        }

        return result;
    }

    /**
     * Validate analysis filters for tenant isolation
     */
    validateAnalysisFilters(filters, allowedTenantId) {
        const result = new IsolationCheckResult(true);

        // Check for tenant-specific filters
        if (filters.tenantId) {
            if (Array.isArray(filters.tenantId)) {
                const invalidTenants = filters.tenantId.filter(id => id !== allowedTenantId);
                if (invalidTenants.length > 0) {
                    result.addViolation(
                        VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS,
                        'Analysis filter includes unauthorized tenant IDs',
                        { invalidTenants, allowedTenantId }
                    );
                }
            } else if (filters.tenantId !== allowedTenantId) {
                result.addViolation(
                    VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS,
                    'Analysis filter contains different tenant ID',
                    { filterTenantId: filters.tenantId, allowedTenantId }
                );
            }
        }

        return result;
    }

    /**
     * Validate group-by fields for potential isolation bypass
     */
    validateGroupByFields(groupByFields, allowedTenantId) {
        const result = new IsolationCheckResult(true);

        const sensitiveFields = ['tenantId', 'companyId', 'userId', 'sessionId'];
        
        for (const field of groupByFields) {
            if (sensitiveFields.includes(field)) {
                result.addWarning(
                    'Group-by field may expose cross-tenant information',
                    { field, allowedTenantId }
                );
            }
        }

        return result;
    }
}

/**
 * Main Tenant Isolation Enforcement Engine
 */
class TenantIsolationEnforcementEngine {
    constructor() {
        this.contextValidator = new TenantContextValidator();
        this.exportValidator = new ExportIsolationValidator();
        this.analysisValidator = new AnalysisIsolationValidator();
        this.violationLog = [];
        this.maxViolationEntries = 10000;
    }

    /**
     * Enforce tenant isolation for request
     */
    enforceRequestIsolation(req) {
        const result = new IsolationCheckResult(true);

        // Validate tenant context
        const contextResult = this.contextValidator.validateTenantContext(req);
        if (!contextResult.valid) {
            result.violations.push(...contextResult.violations);
            result.warnings.push(...contextResult.warnings);
            result.valid = false;
        }

        // Validate query parameters
        if (req && req.query && Object.keys(req.query).length > 0) {
            const allowedTenantId = req.user?.tenantId || req.tenant?.tenantId;
            if (allowedTenantId) {
                const queryResult = this.contextValidator.validateQueryParameters(req.query, allowedTenantId);
                if (!queryResult.valid) {
                    result.violations.push(...queryResult.violations);
                    result.warnings.push(...queryResult.warnings);
                    result.valid = false;
                }
            }
        }

        // Log violations
        if (result.violations.length > 0) {
            this.logViolation(req, result);
        }

        return result;
    }

    /**
     * Enforce tenant isolation for file operations
     */
    enforceFileIsolation(filePath, allowedTenantId, operation = 'read') {
        const result = this.contextValidator.validateFilePath(filePath, allowedTenantId, operation);
        
        if (result.violations.length > 0) {
            this.logViolation({ filePath, allowedTenantId, operation }, result);
        }

        return result;
    }

    /**
     * Enforce tenant isolation for exports
     */
    enforceExportIsolation(exportConfig, allowedTenantId, userContext) {
        const result = this.exportValidator.validateExportRequest(exportConfig, allowedTenantId, userContext);
        
        if (result.violations.length > 0) {
            this.logViolation({ exportConfig, allowedTenantId, userContext }, result);
        }

        return result;
    }

    /**
     * Enforce tenant isolation for analysis
     */
    enforceAnalysisIsolation(query, allowedTenantId, userContext) {
        const result = this.analysisValidator.validateAnalysisQuery(query, allowedTenantId, userContext);
        
        if (result.violations.length > 0) {
            this.logViolation({ query, allowedTenantId, userContext }, result);
        }

        return result;
    }

    /**
     * Log isolation violation
     */
    logViolation(context, result) {
        const violationEntry = {
            timestamp: new Date().toISOString(),
            checkId: result.checkId,
            context,
            violations: result.violations,
            warnings: result.warnings
        };

        this.violationLog.push(violationEntry);

        // Trim violation log if it gets too large
        if (this.violationLog.length > this.maxViolationEntries) {
            this.violationLog = this.violationLog.slice(-this.maxViolationEntries);
        }
    }

    /**
     * Get violation log (for security monitoring)
     */
    getViolationLog(filters = {}) {
        let filteredLog = [...this.violationLog];

        if (filters.startTime) {
            filteredLog = filteredLog.filter(entry => entry.timestamp >= filters.startTime);
        }
        if (filters.endTime) {
            filteredLog = filteredLog.filter(entry => entry.timestamp <= filters.endTime);
        }
        if (filters.violationType) {
            filteredLog = filteredLog.filter(entry => 
                entry.violations.some(v => v.type === filters.violationType)
            );
        }

        return filteredLog;
    }

    /**
     * Clear violation log (for maintenance)
     */
    clearViolationLog() {
        const clearedCount = this.violationLog.length;
        this.violationLog = [];
        return clearedCount;
    }
}

// Create singleton instance
const tenantIsolationEnforcement = new TenantIsolationEnforcementEngine();

// Export classes and singleton
export {
    IsolationCheckResult,
    TenantContextValidator,
    ExportIsolationValidator,
    AnalysisIsolationValidator,
    TenantIsolationEnforcementEngine,
    VIOLATION_TYPES
};

export default tenantIsolationEnforcement;