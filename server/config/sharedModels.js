/**
 * Shared Models Configuration (PostgreSQL/Sequelize)
 * 
 * Note: This file has been converted from Mongoose to Sequelize.
 * Multi-tenant model management is now handled through Sequelize connections.
 */

import { sequelize } from './database.js';

// Model Registry - Placeholder for Sequelize models
// In Sequelize, models are registered directly with the sequelize instance
export const MODEL_REGISTRY = {};

/**
 * Get a model for a specific connection (Sequelize version)
 * @param {object} connection - Sequelize instance
 * @param {string} modelName - Name of the model
 * @returns {object} - Model instance
 */
export function getModelForConnection(connection, modelName) {
    // In Sequelize, models are accessed via sequelize.models
    const model = (connection || sequelize).models[modelName];
    
    if (!model) {
        console.warn(`Model '${modelName}' not found in Sequelize models`);
        return null;
    }
    
    return model;
}

/**
 * Initialize all models for a connection
 * @param {object} connection - Sequelize instance
 * @returns {Object} - Object containing all models
 */
export function initializeAllModels(connection) {
    const conn = connection || sequelize;
    return conn.models || {};
}

/**
 * Get available model names
 * @returns {string[]} - Array of model names
 */
export function getAvailableModels() {
    return Object.keys(sequelize.models || {});
}

/**
 * Check if a model exists in the registry
 * @param {string} modelName - Name of the model
 * @returns {boolean} - True if model exists
 */
export function modelExists(modelName) {
    return !!(sequelize.models && sequelize.models[modelName]);
}

/**
 * Safe model getter - returns null if model doesn't exist
 * @param {object} connection - Sequelize instance
 * @param {string} modelName - Name of the model
 * @returns {object|null} - Model instance or null
 */
export function safeGetModel(connection, modelName) {
    try {
        return getModelForConnection(connection, modelName);
    } catch (error) {
        console.warn(`Model '${modelName}' not available:`, error.message);
        return null;
    }
}

export default {
    MODEL_REGISTRY,
    getModelForConnection,
    initializeAllModels,
    getAvailableModels,
    modelExists,
    safeGetModel
};
