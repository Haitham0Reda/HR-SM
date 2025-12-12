/**
 * Core Configuration Module
 * 
 * Central exports for configuration utilities
 * Includes database, environment, and system configuration
 */

// Database configuration will be moved here in future phases
// For now, we export a placeholder that references the existing location
export { default as connectDatabase } from '../../config/database.js';

// Environment configuration
export const getEnvConfig = () => {
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        mongoUri: process.env.MONGODB_URI,
        platformJwtSecret: process.env.PLATFORM_JWT_SECRET,
        tenantJwtSecret: process.env.TENANT_JWT_SECRET,
        jwtSecret: process.env.JWT_SECRET // Legacy, will be deprecated
    };
};

export default {
    connectDatabase,
    getEnvConfig
};
