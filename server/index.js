import dotenv from 'dotenv';
import http from 'http';
import app, { initializeRoutes, initializeModuleSystem } from './app.js';
import connectDatabase from './config/database.js';
import { ensureDirectoryExists } from './shared/utils/fileUtils.js';
import licenseFileLoader from './services/licenseFileLoader.service.js';
import licenseWebSocketService from './services/licenseWebSocket.service.js';
import redisService from './services/redis.service.js';
import licenseMonitoringJob from './jobs/licenseMonitoring.job.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Ensure upload directories exist
const setupDirectories = async () => {
    await ensureDirectoryExists('uploads/task-reports');
    await ensureDirectoryExists('uploads/documents');
    await ensureDirectoryExists('uploads/profile-pictures');
    console.log('✓ Upload directories ready');
};

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDatabase();

        // Connect to Redis (if enabled)
        await redisService.connect();
        const redisStats = redisService.getStats();
        if (redisStats.enabled && redisStats.connected) {
            console.log('✓ Redis cache connected');
        } else if (redisStats.enabled && !redisStats.connected) {
            console.warn('⚠️  Redis enabled but connection failed, using in-memory cache fallback');
        } else {
            console.log('ℹ️  Redis disabled, using in-memory cache');
        }

        // Setup directories
        await setupDirectories();

        // Initialize module system (discover and register all modules)
        const redisClient = redisStats.enabled && redisStats.connected ? redisService.getClient() : null;
        await initializeModuleSystem({
            redisClient,
            cacheTTL: 300 // 5 minutes
        });

        // Initialize license file loader (On-Premise mode)
        if (process.env.DEPLOYMENT_MODE === 'on-premise') {
            console.log('🔐 Initializing On-Premise license file loader...');
            const licenseInitialized = await licenseFileLoader.initialize();
            if (!licenseInitialized) {
                console.warn('⚠️  Warning: License file loader initialization failed');
                console.warn('   Only Core HR will be available');
            } else {
                const status = licenseFileLoader.getStatus();
                console.log(`✓ License file loaded: ${status.enabledModules.length} modules enabled`);
            }
        }

        // Initialize routes (legacy and modular)
        await initializeRoutes();

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize WebSocket server for real-time license updates
        licenseWebSocketService.initialize(server);
        console.log('✓ License WebSocket server initialized');

        // Start license monitoring job
        licenseMonitoringJob.start();
        console.log('✓ License monitoring job started');

        // Start listening
        server.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 HRMS Server Running                                  ║
║                                                           ║
║   Port: ${PORT}                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}  ║
║   Mode: ${process.env.DEPLOYMENT_MODE || 'saas'}         ║
║   WebSocket: ws://localhost:${PORT}/ws/license           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Shutdown WebSocket server
    licenseWebSocketService.shutdown();

    // Shutdown license file loader
    if (process.env.DEPLOYMENT_MODE === 'on-premise') {
        licenseFileLoader.shutdown();
    }

    // Disconnect from Redis
    redisService.disconnect().then(() => {
        console.log('✓ Redis disconnected');
        process.exit(0);
    }).catch((err) => {
        console.error('Error disconnecting Redis:', err);
        process.exit(1);
    });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Start the server
startServer();
