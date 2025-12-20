#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import BackupService from '../services/backupService.js';
import BackupScheduler from '../services/backupScheduler.js';
import BackupLog from '../models/BackupLog.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const program = new Command();

/**
 * Backup Manager CLI
 * Command-line interface for managing backups
 */
class BackupManagerCLI {
    constructor() {
        this.backupService = new BackupService();
        this.backupScheduler = new BackupScheduler();
    }

    async connectDatabase() {
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';
            await mongoose.connect(mongoUri);
            console.log(chalk.green('✓ Connected to MongoDB'));
        } catch (error) {
            console.error(chalk.red('✗ Failed to connect to MongoDB:'), error.message);
            process.exit(1);
        }
    }

    async disconnectDatabase() {
        await mongoose.disconnect();
    }

    /**
     * Create manual backup
     */
    async createBackup(options) {
        console.log(chalk.blue('🔄 Starting manual backup...'));
        
        try {
            const startTime = Date.now();
            const result = await this.backupService.createDailyBackup();
            const duration = Date.now() - startTime;

            console.log(chalk.green('✓ Backup completed successfully!'));
            console.log(chalk.cyan(`📦 Backup ID: ${result.id}`));
            console.log(chalk.cyan(`📊 Size: ${this.formatBytes(result.size)}`));
            console.log(chalk.cyan(`⏱️  Duration: ${this.formatDuration(duration)}`));
            console.log(chalk.cyan(`📁 Location: ${result.finalPath}`));
            console.log(chalk.cyan(`🔧 Components: ${result.components.length}`));

            // Show component details
            if (options.verbose) {
                console.log(chalk.yellow('\n📋 Component Details:'));
                result.components.forEach(component => {
                    console.log(chalk.gray(`  • ${component.type}: ${component.component || component.database} (${this.formatBytes(component.size)})`));
                });
            }

        } catch (error) {
            console.error(chalk.red('✗ Backup failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * List backups
     */
    async listBackups(options) {
        console.log(chalk.blue('📋 Listing backups...'));
        
        try {
            const limit = options.limit || 10;
            const backups = await BackupLog.getRecentBackups(limit);

            if (backups.length === 0) {
                console.log(chalk.yellow('No backups found.'));
                return;
            }

            console.log(chalk.green(`\n📦 Recent ${backups.length} backups:`));
            console.log(chalk.gray('─'.repeat(80)));

            backups.forEach(backup => {
                const status = backup.status === 'completed' ? 
                    chalk.green('✓') : 
                    backup.status === 'failed' ? 
                        chalk.red('✗') : 
                        chalk.yellow('⏳');
                
                const type = backup.type.toUpperCase().padEnd(8);
                const date = new Date(backup.startTime).toLocaleString();
                const size = backup.size ? this.formatBytes(backup.size) : 'N/A';
                const components = backup.components ? backup.components.length : 0;

                console.log(`${status} ${chalk.cyan(type)} ${date} ${chalk.gray('|')} ${size} ${chalk.gray('|')} ${components} components`);
                console.log(chalk.gray(`   ID: ${backup.backupId}`));
            });

        } catch (error) {
            console.error(chalk.red('✗ Failed to list backups:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Show backup details
     */
    async showBackup(backupId) {
        console.log(chalk.blue(`🔍 Showing backup details: ${backupId}`));
        
        try {
            const backup = await BackupLog.getBackupById(backupId);

            if (!backup) {
                console.log(chalk.red('✗ Backup not found'));
                return;
            }

            console.log(chalk.green('\n📦 Backup Details:'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.cyan(`ID: ${backup.backupId}`));
            console.log(chalk.cyan(`Type: ${backup.type.toUpperCase()}`));
            console.log(chalk.cyan(`Status: ${backup.status}`));
            console.log(chalk.cyan(`Started: ${new Date(backup.startTime).toLocaleString()}`));
            
            if (backup.endTime) {
                console.log(chalk.cyan(`Completed: ${new Date(backup.endTime).toLocaleString()}`));
                console.log(chalk.cyan(`Duration: ${backup.durationFormatted}`));
            }
            
            if (backup.size) {
                console.log(chalk.cyan(`Size: ${backup.sizeFormatted}`));
            }

            if (backup.finalPath) {
                console.log(chalk.cyan(`Location: ${backup.finalPath}`));
            }

            // Components
            if (backup.components && backup.components.length > 0) {
                console.log(chalk.yellow('\n🔧 Components:'));
                backup.components.forEach(component => {
                    const status = component.status === 'success' ? 
                        chalk.green('✓') : 
                        chalk.red('✗');
                    
                    console.log(`  ${status} ${component.type}: ${component.component || component.database}`);
                    console.log(chalk.gray(`     Size: ${this.formatBytes(component.size)}`));
                    
                    if (component.checksum) {
                        console.log(chalk.gray(`     Checksum: ${component.checksum.substring(0, 16)}...`));
                    }
                });
            }

            // Verification
            if (backup.verification.verified) {
                console.log(chalk.yellow('\n🔍 Verification:'));
                console.log(chalk.cyan(`Status: ${backup.verification.verificationStatus}`));
                console.log(chalk.cyan(`Verified: ${new Date(backup.verification.verifiedAt).toLocaleString()}`));
                
                if (backup.verification.verificationErrors.length > 0) {
                    console.log(chalk.red('Errors:'));
                    backup.verification.verificationErrors.forEach(error => {
                        console.log(chalk.red(`  • ${error}`));
                    });
                }
            }

            // Cloud storage
            if (backup.cloudStorage.uploaded) {
                console.log(chalk.yellow('\n☁️  Cloud Storage:'));
                console.log(chalk.cyan(`Provider: ${backup.cloudStorage.provider}`));
                console.log(chalk.cyan(`Bucket: ${backup.cloudStorage.bucket}`));
                console.log(chalk.cyan(`Key: ${backup.cloudStorage.key}`));
                console.log(chalk.cyan(`Uploaded: ${new Date(backup.cloudStorage.uploadedAt).toLocaleString()}`));
            }

        } catch (error) {
            console.error(chalk.red('✗ Failed to show backup details:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Get backup statistics
     */
    async getStatistics(options) {
        console.log(chalk.blue('📊 Getting backup statistics...'));
        
        try {
            const stats = await this.backupService.getBackupStatistics();
            const dbStats = await BackupLog.getStatistics();

            console.log(chalk.green('\n📊 Backup Statistics:'));
            console.log(chalk.gray('─'.repeat(50)));

            // File system stats
            console.log(chalk.yellow('File System:'));
            console.log(chalk.cyan(`  Daily backups: ${stats.daily.count} (${this.formatBytes(stats.daily.totalSize)})`));
            console.log(chalk.cyan(`  Weekly backups: ${stats.weekly.count} (${this.formatBytes(stats.weekly.totalSize)})`));
            console.log(chalk.cyan(`  Monthly backups: ${stats.monthly.count} (${this.formatBytes(stats.monthly.totalSize)})`));
            console.log(chalk.cyan(`  Total backups: ${stats.totalBackups}`));
            console.log(chalk.cyan(`  Total size: ${this.formatBytes(stats.totalSize)}`));

            // Database stats
            if (dbStats.length > 0) {
                console.log(chalk.yellow('\nDatabase Records:'));
                dbStats.forEach(stat => {
                    const successRate = stat.successCount / stat.count * 100;
                    console.log(chalk.cyan(`  ${stat._id}: ${stat.count} backups, ${successRate.toFixed(1)}% success rate`));
                    console.log(chalk.gray(`    Avg size: ${this.formatBytes(stat.avgSize)}`));
                    console.log(chalk.gray(`    Avg duration: ${this.formatDuration(stat.avgDuration)}`));
                });
            }

            // Last backup
            if (stats.lastBackup) {
                console.log(chalk.yellow('\nLast Backup:'));
                console.log(chalk.cyan(`  ID: ${stats.lastBackup.id}`));
                console.log(chalk.cyan(`  Type: ${stats.lastBackup.type}`));
                console.log(chalk.cyan(`  Status: ${stats.lastBackup.status}`));
                console.log(chalk.cyan(`  Date: ${new Date(stats.lastBackup.timestamp).toLocaleString()}`));
            }

        } catch (error) {
            console.error(chalk.red('✗ Failed to get statistics:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Start backup scheduler
     */
    async startScheduler() {
        console.log(chalk.blue('🚀 Starting backup scheduler...'));
        
        try {
            this.backupScheduler.start();
            console.log(chalk.green('✓ Backup scheduler started successfully'));
            
            const status = this.backupScheduler.getStatus();
            console.log(chalk.cyan('\n📅 Scheduled Tasks:'));
            Object.entries(status.tasks).forEach(([name, task]) => {
                const status = task.running ? chalk.green('Running') : chalk.red('Stopped');
                console.log(`  • ${name}: ${status}`);
            });

            console.log(chalk.cyan('\n⏰ Next Run Times:'));
            Object.entries(status.nextRuns).forEach(([name, time]) => {
                console.log(`  • ${name}: ${new Date(time).toLocaleString()}`);
            });

        } catch (error) {
            console.error(chalk.red('✗ Failed to start scheduler:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Stop backup scheduler
     */
    async stopScheduler() {
        console.log(chalk.blue('🛑 Stopping backup scheduler...'));
        
        try {
            this.backupScheduler.stop();
            console.log(chalk.green('✓ Backup scheduler stopped successfully'));

        } catch (error) {
            console.error(chalk.red('✗ Failed to stop scheduler:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Clean up old backups
     */
    async cleanup(options) {
        console.log(chalk.blue('🧹 Cleaning up old backups...'));
        
        try {
            await this.backupService.applyRetentionPolicies();
            console.log(chalk.green('✓ Cleanup completed successfully'));

        } catch (error) {
            console.error(chalk.red('✗ Cleanup failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Verify backup integrity
     */
    async verifyBackup(backupId) {
        console.log(chalk.blue(`🔍 Verifying backup: ${backupId}`));
        
        try {
            // This would implement backup verification logic
            console.log(chalk.yellow('⚠️  Backup verification not yet implemented'));
            
        } catch (error) {
            console.error(chalk.red('✗ Verification failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (!bytes) return '0 B';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * Format duration to human readable
     */
    formatDuration(ms) {
        if (!ms) return '0s';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

// CLI setup
const cli = new BackupManagerCLI();

program
    .name('backup-manager')
    .description('HR-SM Backup Management CLI')
    .version('1.0.0');

program
    .command('create')
    .description('Create a manual backup')
    .option('-v, --verbose', 'Show detailed component information')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.createBackup(options);
        await cli.disconnectDatabase();
    });

program
    .command('list')
    .description('List recent backups')
    .option('-l, --limit <number>', 'Number of backups to show', '10')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.listBackups(options);
        await cli.disconnectDatabase();
    });

program
    .command('show <backupId>')
    .description('Show detailed backup information')
    .action(async (backupId) => {
        await cli.connectDatabase();
        await cli.showBackup(backupId);
        await cli.disconnectDatabase();
    });

program
    .command('stats')
    .description('Show backup statistics')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.getStatistics(options);
        await cli.disconnectDatabase();
    });

program
    .command('start-scheduler')
    .description('Start the backup scheduler')
    .action(async () => {
        await cli.connectDatabase();
        await cli.startScheduler();
        // Keep process running
        process.on('SIGINT', async () => {
            console.log(chalk.yellow('\n🛑 Shutting down scheduler...'));
            await cli.stopScheduler();
            await cli.disconnectDatabase();
            process.exit(0);
        });
    });

program
    .command('stop-scheduler')
    .description('Stop the backup scheduler')
    .action(async () => {
        await cli.stopScheduler();
    });

program
    .command('cleanup')
    .description('Clean up old backups according to retention policy')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.cleanup(options);
        await cli.disconnectDatabase();
    });

program
    .command('verify <backupId>')
    .description('Verify backup integrity')
    .action(async (backupId) => {
        await cli.connectDatabase();
        await cli.verifyBackup(backupId);
        await cli.disconnectDatabase();
    });

// Parse command line arguments
program.parse();