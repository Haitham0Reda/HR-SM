/**
 * Tenant Model Registry Utility
 * 
 * Handles safe registration of models on tenant database connections
 * Prevents duplicate registration errors and provides consistent error handling
 */

/**
 * Safely register a model on a tenant connection
 * @param {mongoose.Connection} connection - Tenant database connection
 * @param {string} modelName - Name of the model
 * @param {mongoose.Schema} schema - Mongoose schema
 * @returns {mongoose.Model} - Registered model
 */
export const registerTenantModel = (connection, modelName, schema) => {
    try {
        // Check if model is already registered
        if (connection.models[modelName]) {
            return connection.models[modelName];
        }
        
        // Register new model
        return connection.model(modelName, schema);
    } catch (error) {
        console.error(`Error registering model ${modelName}:`, error.message);
        throw new Error(`Failed to register model ${modelName}: ${error.message}`);
    }
};

/**
 * Register all HR core models on a tenant connection
 * @param {mongoose.Connection} connection - Tenant database connection
 * @returns {Object} - Object containing all registered models
 */
export const registerHRModels = async (connection) => {
    try {
        // Import models
        const { default: User } = await import('../modules/hr-core/users/models/user.model.js');
        const { default: Department } = await import('../modules/hr-core/users/models/department.model.js');
        const { default: Position } = await import('../modules/hr-core/users/models/position.model.js');
        
        // Register models safely
        const TenantUser = registerTenantModel(connection, 'User', User.schema);
        const TenantDepartment = registerTenantModel(connection, 'Department', Department.schema);
        const TenantPosition = registerTenantModel(connection, 'Position', Position.schema);
        
        return {
            User: TenantUser,
            Department: TenantDepartment,
            Position: TenantPosition
        };
    } catch (error) {
        console.error('Error registering HR models:', error.message);
        throw new Error(`Failed to register HR models: ${error.message}`);
    }
};

export default {
    registerTenantModel,
    registerHRModels
};