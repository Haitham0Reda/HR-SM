import logger from './logger.js';

/**
 * Initialize system collections with sample data to ensure they exist
 * 
 * Note: System models are now tenant-specific and initialized per tenant connection.
 * This function is deprecated in favor of tenant-specific initialization.
 */
export const initializeSystemCollections = async () => {
    try {
        logger.info('🔧 System collections are now tenant-specific and initialized per tenant');
        logger.info('✅ System collections initialization skipped (tenant-specific architecture)');
        return true;

    } catch (error) {
        logger.error('❌ Failed to initialize system collections:', error.message);
        return false;
    }
};

export default initializeSystemCollections;