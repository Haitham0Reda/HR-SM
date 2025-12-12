/**
 * Core Logging Module
 * 
 * Central exports for logging utilities
 * Includes Winston logger and audit logging
 */

export { logger, auditLogger } from './logger.js';
export { default as requestLogger, errorLogger } from '../middleware/requestLogger.js';

export default {
    logger,
    auditLogger,
    requestLogger,
    errorLogger
};
