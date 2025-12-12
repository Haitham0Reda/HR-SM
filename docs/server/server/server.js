import http from 'http';
import { connectDatabase } from './core/config/database.js';
import { logger } from './core/logging/logger.js';
import app from './app.js';
import platformApp from './platformApp.js';
import tenantApp from './tenantApp.js';
import { initializeModuleSystem } from './app.js';

const PORT = process.env.PORT || 5000;
const PLATFORM_PORT = process.env.PLATFORM_PORT || 5001;

// Initialize database connection
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();
        logger.info('✅ Database connection successful');

        // Initialize module system
        await initializeModuleSystem();
        logger.info('✅ Module system initialized');

        // Create HTTP servers
        const server = http.createServer(app);
        const platformServer = http.createServer(platformApp);
        const tenantServer = http.createServer(tenantApp);

        // Start servers
        server.listen(PORT, () => {
            logger.info(`🚀 HR App running on port ${PORT}`);
        });

        platformServer.listen(PLATFORM_PORT, () => {
            logger.info(`🌐 Platform Admin running on port ${PLATFORM_PORT}`);
        });

        // For development, we'll use the same port for tenant app with a different path
        // In production, this would be handled by a reverse proxy
        if (process.env.NODE_ENV === 'development') {
            const TENANT_PORT = process.env.TENANT_PORT || 5002;
            tenantServer.listen(TENANT_PORT, () => {
                logger.info(`🏢 Tenant service running on port ${TENANT_PORT}`);
            });
        }

        // Handle graceful shutdown
        const gracefulShutdown = async () => {
            logger.info('🛑 Shutting down server...');

            // Close servers
            server.close(() => {
                logger.info('✅ HR App server closed');
                process.exit(0);
            });

            platformServer.close(() => {
                logger.info('✅ Platform Admin server closed');
            });

            if (tenantServer) {
                tenantServer.close(() => {
                    logger.info('✅ Tenant service server closed');
                });
            }
        };

        // Handle shutdown signals
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();
