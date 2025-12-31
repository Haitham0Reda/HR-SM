import PerformanceMetrics from '../models/performanceMetrics.model.js';
import SecurityEvents from '../models/securityEvents.model.js';
import SystemAlerts from '../models/systemAlerts.model.js';
import logger from './logger.js';

/**
 * Initialize system collections with sample data to ensure they exist
 */
export const initializeSystemCollections = async () => {
    try {
        logger.info('🔧 Initializing system collections...');

        // Check if collections exist and create sample documents if they don't
        const performanceCount = await PerformanceMetrics.countDocuments();
        if (performanceCount === 0) {
            await PerformanceMetrics.create({
                tenantId: 'system',
                requestId: 'init-request',
                path: '/api/v1/health',
                method: 'GET',
                statusCode: 200,
                responseTime: 50,
                timestamp: new Date(),
                metadata: { source: 'initialization' }
            });
            logger.info('✅ Created sample performance metrics document');
        }

        const securityCount = await SecurityEvents.countDocuments();
        if (securityCount === 0) {
            await SecurityEvents.create({
                tenantId: 'system',
                eventType: 'successful_login',
                severity: 'low',
                description: 'System initialization login event',
                ipAddress: '127.0.0.1',
                timestamp: new Date(),
                metadata: { source: 'initialization' }
            });
            logger.info('✅ Created sample security events document');
        }

        const alertsCount = await SystemAlerts.countDocuments();
        if (alertsCount === 0) {
            await SystemAlerts.create({
                type: 'system_error',
                category: 'system',
                severity: 'info',
                status: 'resolved',
                title: 'System Initialization',
                description: 'System collections initialized successfully',
                source: 'initialization-service',
                resolvedAt: new Date(),
                timestamp: new Date(),
                metadata: { source: 'initialization' }
            });
            logger.info('✅ Created sample system alerts document');
        }

        logger.info('✅ System collections initialization completed');
        return true;

    } catch (error) {
        logger.error('❌ Failed to initialize system collections:', error.message);
        return false;
    }
};

export default initializeSystemCollections;