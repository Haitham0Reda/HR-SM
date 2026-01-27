import dotenv from 'dotenv';
import http from 'http';
import app, { initializeRoutes, initializeModuleSystem } from './app.js';
import connectDatabase from './config/database.js';
import databaseMonitor from './services/databaseMonitor.js';
import { ensureDirectoryExists } from './shared/utils/fileUtils.js';
import licenseFileLoader from './platform/system/services/licenseFileLoader.service.js';
import licenseWebSocketService from './platform/system/services/licenseWebSocket.service.js';
import redisService from './core/services/redis.service.js';
import licenseMonitoringJob from './jobs/licenseMonitoring.job.js';
import cacheRefreshJob from './jobs/cacheRefresh.job.js';
import licenseValidationService from './services/licenseValidationService.js';
import realtimeMonitoringService from './services/realtimeMonitoring.service.js';
import BackupIntegration from './services/backupIntegration.js';
import { enhanceSpecificModels } from './utils/modelCacheEnhancer.js';
import cachePerformanceMonitor from './services/cachePerformanceMonitor.js';
import mongoose from 'mongoose';
import initializeSystemCollections from './utils/initializeSystemCollections.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize backup system
const backupIntegration = new BackupIntegration();

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

        // Initialize system collections (performance metrics, security events, system alerts)
        await initializeSystemCollections();

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

        // Enhance Mongoose models with Redis caching
        try {
            const modelsToCache = [
                'User', 'Department', 'Position', 'Tenant', 'License',
                'InsurancePolicy', 'InsuranceClaim', 'FamilyMember',
                'Attendance', 'Vacation', 'SickLeave', 'Mission',
                'Payroll', 'Document', 'Announcement',
                'Task', 'Request', 'Report', 'AuditLog'
            ];
            
            const enhancedModels = enhanceSpecificModels(modelsToCache, mongoose, {
                defaultTTL: 300, // 5 minutes
                autoInvalidate: true
            });
            
            console.log(`✓ Enhanced ${enhancedModels.length} models with Redis caching`);
        } catch (error) {
            console.warn('⚠️  Model cache enhancement failed:', error.message);
        }

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize WebSocket server for real-time license updates
        licenseWebSocketService.initialize(server);
        console.log('✓ License WebSocket server initialized');

        // Initialize real-time monitoring service
        realtimeMonitoringService.initialize(server);
        console.log('✓ Real-time monitoring service initialized');

        // Start license monitoring job
        licenseMonitoringJob.start();
        console.log('✓ License monitoring job started');

        // Start cache refresh job
        cacheRefreshJob.start();
        console.log('✓ Cache refresh job started');

        // Initialize and start license validation service
        const licenseServiceInitialized = await licenseValidationService.initialize();
        if (licenseServiceInitialized) {
            licenseValidationService.start();
            console.log('✓ License validation service started');
        } else {
            console.warn('⚠️  License validation service initialization failed');
        }

        // Initialize backup system
        try {
            await backupIntegration.initialize();
            console.log('✓ Backup system initialized');
        } catch (error) {
            console.warn('⚠️  Backup system initialization failed:', error.message);
        }

        // Start cache performance monitoring
        try {
            cachePerformanceMonitor.startMonitoring(30000); // 30 seconds interval
            console.log('✓ Cache performance monitoring started');
        } catch (error) {
            console.warn('⚠️  Cache performance monitoring failed to start:', error.message);
        }

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
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Shutdown WebSocket server
    licenseWebSocketService.shutdown();

    // Shutdown real-time monitoring service
    realtimeMonitoringService.shutdown();

    // Shutdown license validation service
    licenseValidationService.stop();

    // Shutdown backup system
    try {
        await backupIntegration.shutdown();
        console.log('✓ Backup system shut down');
    } catch (error) {
        console.warn('⚠️  Backup system shutdown failed:', error.message);
    }

    // Stop cache performance monitoring
    try {
        cachePerformanceMonitor.stopMonitoring();
        console.log('✓ Cache performance monitoring stopped');
    } catch (error) {
        console.warn('⚠️  Cache performance monitoring shutdown failed:', error.message);
    }

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




