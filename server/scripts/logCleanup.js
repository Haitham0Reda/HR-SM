#!/usr/bin/env node

/**
 * Log Cleanup Script
 * 
 * Automated script for log rotation, compression, and cleanup
 * Can be run manually or scheduled via cron
 */

import logMaintenanceService from '../services/logMaintenance.service.js';
import { program } from 'commander';

// Configure command line options
program
    .name('log-cleanup')
    .description('Automated log maintenance and cleanup utility')
    .version('1.0.0')
    .option('-d, --dry-run', 'Show what would be done without making changes')
    .option('--skip-rotation', 'Skip log file rotation')
    .option('--skip-compression', 'Skip log file compression')
    .option('--skip-deletion', 'Skip expired log file deletion')
    .option('-c, --company <companyId>', 'Process logs for specific company only')
    .option('-t, --log-type <logType>', 'Process specific log type only')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--stats-only', 'Show log statistics without performing maintenance');

program.parse();

const options = program.opts();

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('🧹 Log Cleanup Utility Starting...');
        console.log('Options:', options);
        
        // Initialize the maintenance service
        await logMaintenanceService.initialize();
        
        if (options.statsOnly) {
            // Show statistics only
            await showLogStatistics();
        } else {
            // Run maintenance
            await runMaintenance();
        }
        
        console.log('✅ Log cleanup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Log cleanup failed:', error.message);
        if (options.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

/**
 * Run log maintenance
 */
async function runMaintenance() {
    const maintenanceOptions = {
        dryRun: options.dryRun,
        skipRotation: options.skipRotation,
        skipCompression: options.skipCompression,
        skipDeletion: options.skipDeletion,
        verbose: options.verbose
    };
    
    if (options.dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made');
    }
    
    const result = await logMaintenanceService.runMaintenance(maintenanceOptions);
    
    if (result.success) {
        console.log('📊 Maintenance Report:');
        console.log(`   Files Processed: ${result.report.filesProcessed}`);
        console.log(`   Files Deleted: ${result.report.filesDeleted}`);
        console.log(`   Bytes Compressed: ${formatBytes(result.report.bytesCompressed)}`);
        console.log(`   Duration: ${result.report.duration}ms`);
        
        if (result.report.errors.length > 0) {
            console.log(`   Errors: ${result.report.errors.length}`);
            if (options.verbose) {
                result.report.errors.forEach((error, index) => {
                    console.log(`     ${index + 1}. ${error.error}`);
                });
            }
        }
    } else {
        console.error('❌ Maintenance failed:', result.error);
        if (result.report && options.verbose) {
            console.log('Partial report:', result.report);
        }
    }
}

/**
 * Show log statistics
 */
async function showLogStatistics() {
    console.log('📈 Log Directory Statistics:');
    
    if (options.company) {
        // Show stats for specific company
        const result = await logMaintenanceService.getLogDirectoryStats(options.company);
        if (result.success) {
            displayStats(`Company: ${options.company}`, result.data);
        } else {
            console.error(`Error getting stats for company ${options.company}:`, result.error);
        }
    } else {
        // Show global stats
        const result = await logMaintenanceService.getLogDirectoryStats();
        if (result.success) {
            displayStats('Global', result.data);
        } else {
            console.error('Error getting global stats:', result.error);
        }
    }
    
    // Show maintenance service stats
    const serviceStats = logMaintenanceService.getMaintenanceStats();
    if (serviceStats.success) {
        console.log('\n🔧 Maintenance Service Status:');
        console.log(`   Running: ${serviceStats.data.isRunning ? 'Yes' : 'No'}`);
        console.log(`   Last Run: ${serviceStats.data.lastRun || 'Never'}`);
        if (serviceStats.data.stats.lastRun) {
            console.log(`   Last Run Stats:`);
            console.log(`     Files Processed: ${serviceStats.data.stats.filesProcessed}`);
            console.log(`     Files Deleted: ${serviceStats.data.stats.filesDeleted}`);
            console.log(`     Bytes Compressed: ${formatBytes(serviceStats.data.stats.bytesCompressed)}`);
            console.log(`     Errors: ${serviceStats.data.stats.errors.length}`);
        }
    }
}

/**
 * Display statistics in a formatted way
 */
function displayStats(title, stats) {
    console.log(`\n📁 ${title}:`);
    console.log(`   Total Files: ${stats.totalFiles}`);
    console.log(`   Total Size: ${formatBytes(stats.totalSize)}`);
    console.log(`   Compressed Files: ${stats.compressedFiles}`);
    console.log(`   Oldest File: ${stats.oldestFile || 'N/A'}`);
    console.log(`   Newest File: ${stats.newestFile || 'N/A'}`);
    
    if (options.verbose && stats.logTypes) {
        console.log('   Log Types:');
        for (const [logType, typeStats] of Object.entries(stats.logTypes)) {
            if (typeStats.error) {
                console.log(`     ${logType}: Error - ${typeStats.error}`);
            } else {
                console.log(`     ${logType}: ${typeStats.fileCount} files, ${formatBytes(typeStats.totalSize)}`);
            }
        }
    }
}

/**
 * Format bytes in human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Handle process signals for graceful shutdown
 */
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Run the main function
main();