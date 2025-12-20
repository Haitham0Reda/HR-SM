/**
 * Correlation ID Service
 * Generates and manages correlation IDs for linking related log entries
 * across frontend and backend systems
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Generate a new correlation ID
 * Uses UUID v4 for uniqueness with optional prefix
 */
export function generateCorrelationId(prefix = 'corr') {
    const uuid = uuidv4();
    const timestamp = Date.now().toString(36);
    return `${prefix}_${timestamp}_${uuid.substring(0, 8)}`;
}

/**
 * Generate a short correlation ID for performance-sensitive operations
 */
export function generateShortCorrelationId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}_${random}`;
}

/**
 * Validate correlation ID format
 */
export function isValidCorrelationId(correlationId) {
    if (!correlationId || typeof correlationId !== 'string') {
        return false;
    }
    
    // Check for basic format: prefix_timestamp_uuid
    const parts = correlationId.split('_');
    return parts.length >= 3 && parts[0].length > 0;
}

/**
 * Extract timestamp from correlation ID
 */
export function extractTimestamp(correlationId) {
    if (!isValidCorrelationId(correlationId)) {
        return null;
    }
    
    try {
        const parts = correlationId.split('_');
        const timestamp = parseInt(parts[1], 36);
        return new Date(timestamp);
    } catch (error) {
        return null;
    }
}

/**
 * Generate session-based correlation ID
 * Links all activities within a user session
 */
export function generateSessionCorrelationId(sessionId, userId) {
    const hash = crypto.createHash('md5')
        .update(`${sessionId}_${userId}`)
        .digest('hex')
        .substring(0, 8);
    return `sess_${hash}_${Date.now().toString(36)}`;
}

/**
 * Generate request-based correlation ID
 * Links frontend and backend activities for a single request
 */
export function generateRequestCorrelationId(method, endpoint) {
    const hash = crypto.createHash('md5')
        .update(`${method}_${endpoint}`)
        .digest('hex')
        .substring(0, 6);
    return `req_${hash}_${Date.now().toString(36)}`;
}

/**
 * Correlation ID storage for linking related operations
 */
class CorrelationStore {
    constructor() {
        this.store = new Map();
        this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        this.cleanupInterval = 60 * 60 * 1000; // 1 hour
        
        // Start cleanup timer
        this.startCleanup();
    }
    
    /**
     * Store correlation data
     */
    store(correlationId, data) {
        this.store.set(correlationId, {
            ...data,
            timestamp: Date.now(),
            correlationId
        });
    }
    
    /**
     * Retrieve correlation data
     */
    get(correlationId) {
        const data = this.store.get(correlationId);
        if (!data) return null;
        
        // Check if data is expired
        if (Date.now() - data.timestamp > this.maxAge) {
            this.store.delete(correlationId);
            return null;
        }
        
        return data;
    }
    
    /**
     * Link multiple correlation IDs
     */
    link(primaryId, secondaryId, relationship = 'related') {
        const primaryData = this.get(primaryId) || { correlationId: primaryId };
        const secondaryData = this.get(secondaryId) || { correlationId: secondaryId };
        
        // Add relationship information
        primaryData.linkedIds = primaryData.linkedIds || [];
        secondaryData.linkedIds = secondaryData.linkedIds || [];
        
        if (!primaryData.linkedIds.includes(secondaryId)) {
            primaryData.linkedIds.push(secondaryId);
        }
        if (!secondaryData.linkedIds.includes(primaryId)) {
            secondaryData.linkedIds.push(primaryId);
        }
        
        primaryData.relationships = primaryData.relationships || {};
        secondaryData.relationships = secondaryData.relationships || {};
        
        primaryData.relationships[secondaryId] = relationship;
        secondaryData.relationships[primaryId] = relationship;
        
        this.store.set(primaryId, primaryData);
        this.store.set(secondaryId, secondaryData);
    }
    
    /**
     * Get all linked correlation IDs
     */
    getLinked(correlationId) {
        const data = this.get(correlationId);
        if (!data || !data.linkedIds) return [];
        
        return data.linkedIds.map(id => this.get(id)).filter(Boolean);
    }
    
    /**
     * Start cleanup timer to remove expired entries
     */
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [id, data] of this.store.entries()) {
                if (now - data.timestamp > this.maxAge) {
                    this.store.delete(id);
                }
            }
        }, this.cleanupInterval);
    }
    
    /**
     * Get store statistics
     */
    getStats() {
        return {
            totalEntries: this.store.size,
            maxAge: this.maxAge,
            cleanupInterval: this.cleanupInterval
        };
    }
    
    /**
     * Clear all entries (for testing)
     */
    clear() {
        this.store.clear();
    }
}

// Create singleton instance
const correlationStore = new CorrelationStore();

/**
 * Middleware to generate and propagate correlation IDs
 */
export function correlationMiddleware(req, res, next) {
    // Check if correlation ID already exists in headers
    let correlationId = req.headers['x-correlation-id'] || 
                       req.headers['correlation-id'] ||
                       req.get('X-Correlation-ID');
    
    // Generate new correlation ID if none exists
    if (!correlationId || !isValidCorrelationId(correlationId)) {
        correlationId = generateRequestCorrelationId(req.method, req.path);
    }
    
    // Add correlation ID to request object
    req.correlationId = correlationId;
    
    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Store correlation context
    correlationStore.store(correlationId, {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        userId: req.user?.id || req.user?._id,
        tenantId: req.tenantId,
        sessionId: req.sessionID,
        startTime: Date.now()
    });
    
    next();
}

/**
 * Get correlation context for a correlation ID
 */
export function getCorrelationContext(correlationId) {
    return correlationStore.get(correlationId);
}

/**
 * Link correlation IDs
 */
export function linkCorrelationIds(primaryId, secondaryId, relationship = 'related') {
    return correlationStore.link(primaryId, secondaryId, relationship);
}

/**
 * Get linked correlation IDs
 */
export function getLinkedCorrelationIds(correlationId) {
    return correlationStore.getLinked(correlationId);
}

/**
 * Update correlation context
 */
export function updateCorrelationContext(correlationId, updates) {
    const existing = correlationStore.get(correlationId);
    if (existing) {
        correlationStore.store(correlationId, { ...existing, ...updates });
    }
}

/**
 * Get correlation store statistics
 */
export function getCorrelationStats() {
    return correlationStore.getStats();
}

/**
 * Clear correlation store (for testing)
 */
export function clearCorrelationStore() {
    return correlationStore.clear();
}

export default {
    generateCorrelationId,
    generateShortCorrelationId,
    generateSessionCorrelationId,
    generateRequestCorrelationId,
    isValidCorrelationId,
    extractTimestamp,
    correlationMiddleware,
    getCorrelationContext,
    linkCorrelationIds,
    getLinkedCorrelationIds,
    updateCorrelationContext,
    getCorrelationStats,
    clearCorrelationStore
};