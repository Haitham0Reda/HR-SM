import dotenv from 'dotenv';
import app, { initializeRoutes } from './app.js';
import connectDatabase from './config/database.js';
import { ensureDirectoryExists } from './shared/utils/fileUtils.js';

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
║   Mode: Multi-tenant SaaS + On-Premise Support           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

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
