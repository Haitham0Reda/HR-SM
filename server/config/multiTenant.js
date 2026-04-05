/**
 * Multi-Tenant Database Configuration (PostgreSQL)
 * 
 * Manages tenant context for the single PostgreSQL database model.
 * All tenants share the same database with tenant_id column for isolation.
 */

import { mainAppDb } from './database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class MultiTenantDB {
    constructor() {
        this.db = mainAppDb; // Single database connection for all tenants
    }

    /**
     * Get the shared database connection
     * @returns {Sequelize} The main application database instance
     */
    getConnection() {
        return this.db;
    }

    /**
     * Validate tenant ID
     * @param {string} tenantId - Tenant identifier
     * @returns {string} Validated tenant ID
     * @throws {Error} If tenant ID is invalid
     */
    validateTenantId(tenantId) {
        if (!tenantId || typeof tenantId !== 'string') {
            throw new Error('Invalid tenant ID: must be a non-empty string');
        }

        if (tenantId.length > 100) {
            throw new Error('Invalid tenant ID: exceeds maximum length of 100 characters');
        }

        // Ensure tenant ID contains only safe characters
        const safePattern = /^[a-zA-Z0-9_-]+$/;
        if (!safePattern.test(tenantId)) {
            throw new Error('Invalid tenant ID: must contain only alphanumeric characters, hyphens, and underscores');
        }

        return tenantId;
    }

    /**
     * Check if a tenant exists in the database
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<boolean>}
     */
    async tenantExists(tenantId) {
        try {
            const validatedTenantId = this.validateTenantId(tenantId);
            
            // Query the tenants table in the license server database
            // This will be implemented once the Tenant model is created
            // For now, we'll return true to allow development to continue
            console.log(`Checking if tenant exists: ${validatedTenantId}`);
            return true;
        } catch (error) {
            console.error(`Error checking tenant existence: ${error.message}`);
            return false;
        }
    }

    /**
     * Get tenant metadata
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<Object|null>}
     */
    async getTenantMetadata(tenantId) {
        try {
            const validatedTenantId = this.validateTenantId(tenantId);
            
            // This will query the license server database for tenant metadata
            // Implementation will be completed when Tenant model is created
            console.log(`Fetching metadata for tenant: ${validatedTenantId}`);
            
            return {
                tenant_id: validatedTenantId,
                name: validatedTenantId,
                is_active: true
            };
        } catch (error) {
            console.error(`Error fetching tenant metadata: ${error.message}`);
            return null;
        }
    }

    /**
     * List all active tenants
     * @returns {Promise<string[]>}
     */
    async listActiveTenants() {
        try {
            // This will query the license server database for all active tenants
            // Implementation will be completed when Tenant model is created
            console.log('Listing all active tenants');
            
            // For now, return empty array
            return [];
        } catch (error) {
            console.error(`Error listing tenants: ${error.message}`);
            return [];
        }
    }

    /**
     * Close database connection
     * @returns {Promise<void>}
     */
    async closeConnection() {
        try {
            await this.db.close();
            console.log('Database connection closed');
        } catch (error) {
            console.error(`Error closing database connection: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get database health status
     * @returns {Promise<Object>}
     */
    async getHealthStatus() {
        try {
            await this.db.authenticate();
            return {
                status: 'healthy',
                database: this.db.config.database,
                host: this.db.config.host,
                poolSize: this.db.connectionManager.pool.size,
                poolAvailable: this.db.connectionManager.pool.available
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

// Singleton instance
const multiTenantDB = new MultiTenantDB();

export default multiTenantDB;
export { MultiTenantDB };