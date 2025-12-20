/**
 * Log Ingestion Controller
 * 
 * Handles frontend log ingestion requests with validation,
 * processing, and storage coordination
 * 
 * Requirements: 8.1, 4.2, 1.1
 */

import { validationResult } from 'express-validator';
import logProcessingPipeline from '../services/logProcessingPipeline.service.js';
import correlationIdService from '../services/correlationId.service.js';
import companyLogger from '../utils/companyLogger.js';
import platformLogger from '../utils/platformLogger.js';

class LogIngestionController {
    constructor() {
        this.ingestionStats = new Map(); // Company ID -> stats
        this.startTime = new Date();
    }

    /**
     * Ingest frontend logs
     * 
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async ingestLogs(req, res) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const logger = await companyLogger.getLoggerForTenant(req.tenant?.tenantId, req.tenant?.companyName);
                logger.warn('Log ingestion validation failed', {
                    correlationId: req.correlationId,
                    userId: req.user?.id,
                    errors: errors.array(),
                    requestId: req.id
                });

                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { logs } = req.body;
            const companyId = req.tenant.tenantId;
            const companyName = req.tenant.companyName;
            const userId = req.user.id;
            const userRole = req.user.role;
            const requestCorrelationId = req.correlationId;

            // Get company logger
            const logger = await companyLogger.getLoggerForTenant(companyId, companyName);

            // Log the ingestion request
            logger.info('Frontend log ingestion started', {
                correlationId: requestCorrelationId,
                userId,
                userRole,
                logCount: logs.length,
                requestId: req.id,
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            });

            // Process each log entry
            const processingResults = [];
            let successCount = 0;
            let errorCount = 0;

            for (const logEntry of logs) {
                try {
                    // Enrich log entry with request context
                    const enrichedLog = this.enrichLogEntry(logEntry, {
                        companyId,
                        companyName,
                        userId,
                        userRole,
                        requestCorrelationId,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        requestId: req.id
                    });

                    // Process through pipeline
                    const result = await logProcessingPipeline.processLog(enrichedLog);
                    
                    processingResults.push({
                        originalIndex: processingResults.length,
                        success: result.success,
                        correlationId: result.correlationId,
                        warnings: result.warnings || []
                    });

                    if (result.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        logger.warn('Log processing failed', {
                            correlationId: requestCorrelationId,
                            logIndex: processingResults.length - 1,
                            error: result.error,
                            logEntry: this.sanitizeLogForLogging(logEntry)
                        });
                    }
                } catch (error) {
                    errorCount++;
                    processingResults.push({
                        originalIndex: processingResults.length,
                        success: false,
                        error: error.message
                    });

                    logger.error('Log processing exception', {
                        correlationId: requestCorrelationId,
                        logIndex: processingResults.length - 1,
                        error: error.message,
                        stack: error.stack,
                        logEntry: this.sanitizeLogForLogging(logEntry)
                    });
                }
            }

            // Update ingestion statistics
            this.updateIngestionStats(companyId, successCount, errorCount);

            // Log completion
            logger.info('Frontend log ingestion completed', {
                correlationId: requestCorrelationId,
                userId,
                totalLogs: logs.length,
                successCount,
                errorCount,
                processingTimeMs: Date.now() - new Date(req.startTime).getTime()
            });

            // Platform logging for monitoring
            platformLogger.systemPerformance({
                component: 'log-ingestion',
                companyId,
                requestCount: 1,
                logCount: logs.length,
                successRate: successCount / logs.length,
                processingTimeMs: Date.now() - new Date(req.startTime).getTime()
            });

            // Return response
            const response = {
                success: true,
                processed: logs.length,
                successful: successCount,
                failed: errorCount,
                correlationId: requestCorrelationId,
                results: processingResults
            };

            // Include warnings if any processing had issues
            const allWarnings = processingResults
                .filter(r => r.warnings && r.warnings.length > 0)
                .flatMap(r => r.warnings);
            
            if (allWarnings.length > 0) {
                response.warnings = allWarnings;
            }

            res.status(200).json(response);

        } catch (error) {
            const logger = await companyLogger.getLoggerForTenant(req.tenant?.tenantId, req.tenant?.companyName);
            logger.error('Log ingestion controller error', {
                correlationId: req.correlationId,
                userId: req.user?.id,
                error: error.message,
                stack: error.stack,
                requestId: req.id
            });

            // Platform error logging
            platformLogger.systemHealth('log-ingestion', 'error', {
                error: error.message,
                companyId: req.tenant?.tenantId,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Internal server error during log ingestion',
                correlationId: req.correlationId
            });
        }
    }

    /**
     * Health check endpoint
     * 
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async healthCheck(req, res) {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.startTime.getTime(),
                service: 'log-ingestion',
                version: '1.0.0'
            };

            // Check pipeline health
            const pipelineHealth = await logProcessingPipeline.healthCheck();
            health.pipeline = pipelineHealth;

            // Check storage health
            health.storage = {
                available: true // This could be enhanced with actual storage checks
            };

            res.status(200).json(health);
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }

    /**
     * Get ingestion statistics
     * 
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getIngestionStats(req, res) {
        try {
            const companyId = req.tenant.tenantId;
            const stats = this.ingestionStats.get(companyId) || {
                totalRequests: 0,
                totalLogs: 0,
                successfulLogs: 0,
                failedLogs: 0,
                lastIngestion: null
            };

            const logger = await companyLogger.getLoggerForTenant(companyId, req.tenant.companyName);
            logger.info('Ingestion stats requested', {
                correlationId: req.correlationId,
                userId: req.user.id,
                stats
            });

            res.status(200).json({
                success: true,
                stats,
                correlationId: req.correlationId
            });
        } catch (error) {
            const logger = await companyLogger.getLoggerForTenant(req.tenant?.tenantId, req.tenant?.companyName);
            logger.error('Error retrieving ingestion stats', {
                correlationId: req.correlationId,
                userId: req.user?.id,
                error: error.message
            });

            res.status(500).json({
                success: false,
                error: 'Failed to retrieve ingestion statistics',
                correlationId: req.correlationId
            });
        }
    }

    /**
     * Enrich log entry with request context
     * 
     * @param {Object} logEntry - Original log entry
     * @param {Object} context - Request context
     * @returns {Object} Enriched log entry
     */
    enrichLogEntry(logEntry, context) {
        const enriched = {
            ...logEntry,
            // Ensure required fields
            timestamp: logEntry.timestamp || new Date().toISOString(),
            source: 'frontend',
            
            // Add company context
            companyId: context.companyId,
            companyName: context.companyName,
            
            // Add user context
            userId: context.userId,
            userRole: context.userRole,
            
            // Add request context
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            requestId: context.requestId,
            
            // Handle correlation ID
            correlationId: logEntry.correlationId || correlationIdService.generateCorrelationId(),
            
            // Add ingestion metadata
            ingestionTimestamp: new Date().toISOString(),
            ingestionSource: 'api'
        };

        // Ensure meta object exists
        if (!enriched.meta) {
            enriched.meta = {};
        }

        // Add request correlation ID to meta if different from log correlation ID
        if (context.requestCorrelationId && context.requestCorrelationId !== enriched.correlationId) {
            enriched.meta.requestCorrelationId = context.requestCorrelationId;
        }

        return enriched;
    }

    /**
     * Sanitize log entry for safe logging (remove sensitive data)
     * 
     * @param {Object} logEntry - Log entry to sanitize
     * @returns {Object} Sanitized log entry
     */
    sanitizeLogForLogging(logEntry) {
        const sanitized = { ...logEntry };
        
        // Remove potentially sensitive fields
        if (sanitized.meta) {
            const safeMeta = { ...sanitized.meta };
            delete safeMeta.password;
            delete safeMeta.token;
            delete safeMeta.apiKey;
            delete safeMeta.secret;
            sanitized.meta = safeMeta;
        }

        // Truncate long messages
        if (sanitized.message && sanitized.message.length > 500) {
            sanitized.message = sanitized.message.substring(0, 500) + '... [truncated]';
        }

        return sanitized;
    }

    /**
     * Update ingestion statistics for a company
     * 
     * @param {string} companyId - Company ID
     * @param {number} successCount - Number of successful logs
     * @param {number} errorCount - Number of failed logs
     */
    updateIngestionStats(companyId, successCount, errorCount) {
        const stats = this.ingestionStats.get(companyId) || {
            totalRequests: 0,
            totalLogs: 0,
            successfulLogs: 0,
            failedLogs: 0,
            lastIngestion: null
        };

        stats.totalRequests += 1;
        stats.totalLogs += (successCount + errorCount);
        stats.successfulLogs += successCount;
        stats.failedLogs += errorCount;
        stats.lastIngestion = new Date().toISOString();

        this.ingestionStats.set(companyId, stats);
    }
}

export default new LogIngestionController();