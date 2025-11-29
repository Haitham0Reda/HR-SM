/**
 * Feature Flags Configuration
 * 
 * This configuration file manages feature toggles for the leave system refactoring.
 * It allows for gradual migration from the legacy Leave model to the new specialized models
 * (Mission, SickLeave, Permissions, Overtime, Vacation).
 */

/**
 * Feature flags for leave system
 */
export const FEATURES = {
    /**
     * Enable legacy /api/leaves endpoints
     * Set to false to disable the old monolithic leave endpoints
     * Default: true (enabled during transition period)
     */
    ENABLE_LEGACY_LEAVE: process.env.ENABLE_LEGACY_LEAVE !== 'false',

    /**
     * Enable new specialized leave models and endpoints
     * - /api/missions
     * - /api/sick-leaves
     * - /api/permissions
     * - /api/overtime
     * - /api/vacations
     * Default: true (enabled by default)
     */
    ENABLE_NEW_LEAVE_MODELS: process.env.ENABLE_NEW_LEAVE_MODELS !== 'false',

    /**
     * Log usage of legacy endpoints for monitoring
     * Helps track which clients are still using old endpoints
     * Default: true
     */
    LOG_LEGACY_USAGE: process.env.LOG_LEGACY_USAGE !== 'false',

    /**
     * Send deprecation warning headers on legacy endpoints
     * Adds X-Deprecated, X-Deprecation-Date, X-Sunset headers
     * Default: true
     */
    SEND_DEPRECATION_HEADERS: process.env.SEND_DEPRECATION_HEADERS !== 'false'
};

/**
 * Deprecation timeline configuration
 */
export const DEPRECATION_CONFIG = {
    /**
     * Date when legacy endpoints were marked as deprecated
     * Format: YYYY-MM-DD
     */
    DEPRECATION_DATE: process.env.LEGACY_DEPRECATION_DATE || '2025-12-01',

    /**
     * Date when legacy endpoints will be removed (sunset date)
     * Format: YYYY-MM-DD
     */
    SUNSET_DATE: process.env.LEGACY_SUNSET_DATE || '2026-06-01',

    /**
     * Replacement endpoints mapping
     * Maps old leave types to new endpoints
     */
    REPLACEMENT_ENDPOINTS: {
        mission: '/api/missions',
        sick: '/api/sick-leaves',
        'late-arrival': '/api/permissions',
        'early-departure': '/api/permissions',
        overtime: '/api/overtime',
        annual: '/api/vacations',
        casual: '/api/vacations',
        unpaid: '/api/vacations'
    },

    /**
     * General replacement message for legacy endpoints
     */
    REPLACEMENT_MESSAGE: 'This endpoint is deprecated. Please use the specialized endpoints: /api/missions, /api/sick-leaves, /api/permissions, /api/overtime, /api/vacations'
};

/**
 * Check if legacy endpoints are enabled
 * @returns {boolean}
 */
export const isLegacyEnabled = () => {
    return FEATURES.ENABLE_LEGACY_LEAVE;
};

/**
 * Check if new leave models are enabled
 * @returns {boolean}
 */
export const areNewModelsEnabled = () => {
    return FEATURES.ENABLE_NEW_LEAVE_MODELS;
};

/**
 * Get replacement endpoint for a specific leave type
 * @param {string} leaveType - The type of leave
 * @returns {string} The replacement endpoint URL
 */
export const getReplacementEndpoint = (leaveType) => {
    return DEPRECATION_CONFIG.REPLACEMENT_ENDPOINTS[leaveType] || DEPRECATION_CONFIG.REPLACEMENT_MESSAGE;
};

export default FEATURES;
