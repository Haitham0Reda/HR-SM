import dotenv from 'dotenv';
import app, { initializeRoutes } from './app.js';
import connectDatabase from './config/database.js';
import { ensureDirectoryExists } from './shared/utils/fileUtils.js';
import licenseFileLoader from './services/licenseFileLoader.service.js';

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

        // Setup directories
        await setupDirectories();

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

        // Initialize routes
        await initializeRoutes();

        // Start listening
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 HRMS Server Running                                  ║
║                                                           ║
║   Port: ${PORT}                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}  ║
║   Mode: ${process.env.DEPLOYMENT_MODE || 'saas'}         ║
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

    // Shutdown license file loader
    if (process.env.DEPLOYMENT_MODE === 'on-premise') {
        licenseFileLoader.shutdown();
    }

    process.exit(0);
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
