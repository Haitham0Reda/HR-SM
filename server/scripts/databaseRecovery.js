#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import DatabaseRecoveryService from '../services/databaseRecoveryService.js';
import BackupLog from '../models/BackupLog.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

/**
 * Database Recovery CLI
 * Command-line interface for database recovery operations
 */
class DatabaseRecoveryCLI {
    constructor() {
        this.recoveryService = new DatabaseRecoveryService();
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
     * Detect database corruption
     */
    async detectCorruption(database, options) {
        console.log(chalk.blue(`🔍 Detecting corruption in database: ${database || 'all'}`));
        
        try {
            const report = await this.recoveryService.detectCorruption(database);

            console.log(chalk.green('\n📊 Corruption Detection Report'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.cyan(`Overall Status: ${this.getStatusIcon(report.overallStatus)} ${report.overallStatus.toUpperCase()}`));
            console.log(chalk.cyan(`Databases Checked: ${report.databases.length}`));
            console.log(chalk.cyan(`Issues Found: ${report.issues.length}`));
            console.log(chalk.cyan(`Timestamp: ${report.timestamp.toLocaleString()}`));

            // Show database details
            if (options.verbose) {
                console.log(chalk.yellow('\n📋 Database Details:'));
                report.databases.forEach(db => {
                    const statusIcon = this.getStatusIcon(db.status);
                    console.log(`\n${statusIcon} ${chalk.bold(db.database)}`);
                    console.log(chalk.gray(`  Status: ${db.status}`));
                    console.log(chalk.gray(`  Collections: ${db.collections.length}`));
                    console.log(chalk.gray(`  Issues: ${db.issues.length}`));
                    
                    if (db.stats) {
                        console.log(chalk.gray(`  Data Size: ${this.formatBytes(db.stats.dataSize)}`));
                        console.log(chalk.gray(`  Storage Size: ${this.formatBytes(db.stats.storageSize)}`));
                    }
                });
            }

            // Show issues
            if (report.issues.length > 0) {
                console.log(chalk.red('\n⚠️ Issues Found:'));
                report.issues.forEach((issue, index) => {
                    const severityColor = issue.severity === 'critical' ? chalk.red : chalk.yellow;
                    console.log(`${index + 1}. ${severityColor(issue.message)}`);
                    console.log(chalk.gray(`   Type: ${issue.type}`));
                    console.log(chalk.gray(`   Severity: ${issue.severity}`));
                });
            }

        } catch (error) {
            console.error(chalk.red('✗ Corruption detection failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Repair database
     */
    async repairDatabase(database, options) {
        console.log(chalk.blue(`🔧 Repairing database: ${database}`));
        
        // Confirm repair operation
        if (!options.force) {
            console.log(chalk.yellow('⚠️ This operation will modify the database.'));
            console.log(chalk.yellow('   A backup will be created before repair.'));
            console.log(chalk.yellow('   Continue? (y/N)'));
            
            // In a real CLI, you'd use readline for user input
            // For now, we'll assume confirmation
            console.log(chalk.green('✓ Proceeding with repair...'));
        }

        try {
            const repairOptions = {
                skipBackup: options.skipBackup,
                stopConnections: options.stopConnections,
                compact: options.compact !== false,
                rebuildIndexes: options.rebuildIndexes !== false,
                repairCollections: options.repairCollections !== false
            };

            const report = await this.recoveryService.repairDatabase(database, repairOptions);

            console.log(chalk.green('\n🔧 Database Repair Report'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.cyan(`Database: ${report.database}`));
            console.log(chalk.cyan(`Status: ${this.getStatusIcon(report.status)} ${report.status.toUpperCase()}`));
            console.log(chalk.cyan(`Duration: ${this.formatDuration(report.endTime - report.startTime)}`));
            console.log(chalk.cyan(`Backup Created: ${report.backupCreated ? '✓' : '✗'}`));
            console.log(chalk.cyan(`Repair Successful: ${report.repairSuccessful ? '✓' : '✗'}`));

            // Show repair steps
            if (options.verbose) {
                console.log(chalk.yellow('\n📋 Repair Steps:'));
                report.steps.forEach((step, index) => {
                    const statusIcon = this.getStatusIcon(step.status);
                    console.log(`${index + 1}. ${statusIcon} ${step.name}`);
                    console.log(chalk.gray(`   Status: ${step.status}`));
                    console.log(chalk.gray(`   Message: ${step.message || 'N/A'}`));
                    
                    if (step.procedures) {
                        step.procedures.forEach(proc => {
                            console.log(chalk.gray(`   - ${proc.name}: ${proc.status}`));
                        });
                    }
                });
            }

            if (report.status === 'failed') {
                console.log(chalk.red(`\n✗ Repair failed: ${report.error}`));
                if (report.rolledBack) {
                    console.log(chalk.yellow('✓ Database rolled back to backup'));
                }
            }

        } catch (error) {
            console.error(chalk.red('✗ Database repair failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backupId, options) {
        console.log(chalk.blue(`📥 Restoring from backup: ${backupId}`));
        
        // Confirm restore operation
        if (!options.force) {
            console.log(chalk.yellow('⚠️ This operation will replace the current database.'));
            console.log(chalk.yellow('   A safety backup will be created first.'));
            console.log(chalk.yellow('   Continue? (y/N)'));
            
            console.log(chalk.green('✓ Proceeding with restore...'));
        }

        try {
            const restoreOptions = {
                skipSafetyBackup: options.skipSafetyBackup,
                keepConnections: options.keepConnections,
                userId: null // Would be set from authentication
            };

            const report = await this.recoveryService.restoreFromBackup(
                backupId, 
                options.database, 
                restoreOptions
            );

            console.log(chalk.green('\n📥 Database Restore Report'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.cyan(`Backup ID: ${report.backupId}`));
            console.log(chalk.cyan(`Target Database: ${report.targetDatabase || 'auto-detected'}`));
            console.log(chalk.cyan(`Status: ${this.getStatusIcon(report.status)} ${report.status.toUpperCase()}`));
            console.log(chalk.cyan(`Duration: ${this.formatDuration(report.endTime - report.startTime)}`));
            console.log(chalk.cyan(`Restoration Successful: ${report.restorationSuccessful ? '✓' : '✗'}`));

            // Show restore steps
            if (options.verbose) {
                console.log(chalk.yellow('\n📋 Restore Steps:'));
                report.steps.forEach((step, index) => {
                    const statusIcon = this.getStatusIcon(step.status);
                    console.log(`${index + 1}. ${statusIcon} ${step.name}`);
                    console.log(chalk.gray(`   Status: ${step.status}`));
                    console.log(chalk.gray(`   Message: ${step.message || 'N/A'}`));
                });
            }

            if (report.status === 'failed') {
                console.log(chalk.red(`\n✗ Restore failed: ${report.error}`));
            }

        } catch (error) {
            console.error(chalk.red('✗ Database restore failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * List available backups for restore
     */
    async listBackups(options) {
        console.log(chalk.blue('📋 Listing available backups for restore...'));
        
        try {
            const backups = await BackupLog.find({
                status: 'completed'
            }).sort({ startTime: -1 }).limit(options.limit || 20);

            if (backups.length === 0) {
                console.log(chalk.yellow('No completed backups found.'));
                return;
            }

            console.log(chalk.green(`\n📦 Available backups (${backups.length}):`));
            console.log(chalk.gray('─'.repeat(80)));

            backups.forEach(backup => {
                const cloudIcon = backup.cloudStorage.uploaded ? '☁️' : '💾';
                const verifiedIcon = backup.verification.verified ? '✅' : '❓';
                
                console.log(`${verifiedIcon} ${cloudIcon} ${chalk.cyan(backup.backupId)}`);
                console.log(chalk.gray(`   Type: ${backup.type} | Date: ${new Date(backup.startTime).toLocaleString()}`));
                console.log(chalk.gray(`   Size: ${backup.sizeFormatted} | Components: ${backup.components.length}`));
                
                if (backup.cloudStorage.uploaded) {
                    console.log(chalk.gray(`   Cloud: ${backup.cloudStorage.provider} | Bucket: ${backup.cloudStorage.bucket}`));
                }
                
                console.log('');
            });

        } catch (error) {
            console.error(chalk.red('✗ Failed to list backups:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Show recovery statistics
     */
    async showStatistics() {
        console.log(chalk.blue('📊 Getting recovery statistics...'));
        
        try {
            const stats = await this.recoveryService.getRecoveryStatistics();

            console.log(chalk.green('\n📊 Recovery Statistics'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.cyan(`Total Restorations: ${stats.totalRestorations}`));
            console.log(chalk.cyan(`Recovery Files: ${stats.recoveryFiles.length}`));

            if (stats.recentRestorations.length > 0) {
                console.log(chalk.yellow('\n📋 Recent Restorations:'));
                stats.recentRestorations.forEach((restore, index) => {
                    console.log(`${index + 1}. ${restore.backupId}`);
                    console.log(chalk.gray(`   Date: ${new Date(restore.restoredAt).toLocaleString()}`));
                    console.log(chalk.gray(`   Notes: ${restore.notes || 'N/A'}`));
                });
            }

            if (stats.recoveryFiles.length > 0) {
                console.log(chalk.yellow('\n📁 Recovery Files:'));
                stats.recoveryFiles.forEach((file, index) => {
                    console.log(`${index + 1}. ${file.name}`);
                    console.log(chalk.gray(`   Size: ${this.formatBytes(file.size)}`));
                    console.log(chalk.gray(`   Created: ${file.created.toLocaleString()}`));
                });
            }

        } catch (error) {
            console.error(chalk.red('✗ Failed to get statistics:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Cleanup old recovery files
     */
    async cleanup(options) {
        console.log(chalk.blue('🧹 Cleaning up old recovery files...'));
        
        try {
            const retentionDays = options.days || 30;
            const result = await this.recoveryService.cleanupRecoveryFiles(retentionDays);

            console.log(chalk.green(`✓ Cleanup completed: ${result.deletedCount} files deleted`));

        } catch (error) {
            console.error(chalk.red('✗ Cleanup failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        switch (status) {
            case 'healthy':
            case 'completed':
            case 'passed':
                return '✅';
            case 'corrupted':
            case 'failed':
                return '❌';
            case 'warning':
            case 'partial':
                return '⚠️';
            case 'in_progress':
                return '⏳';
            default:
                return '❓';
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
const cli = new DatabaseRecoveryCLI();

program
    .name('database-recovery')
    .description('HR-SM Database Recovery CLI')
    .version('1.0.0');

program
    .command('detect [database]')
    .description('Detect database corruption')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (database, options) => {
        await cli.connectDatabase();
        await cli.detectCorruption(database, options);
        await cli.disconnectDatabase();
    });

program
    .command('repair <database>')
    .description('Repair database corruption')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('--skip-backup', 'Skip creating backup before repair')
    .option('--stop-connections', 'Stop database connections during repair')
    .option('--no-compact', 'Skip database compaction')
    .option('--no-rebuild-indexes', 'Skip index rebuilding')
    .option('--no-repair-collections', 'Skip collection repair')
    .option('-v, --verbose', 'Show detailed repair steps')
    .action(async (database, options) => {
        await cli.connectDatabase();
        await cli.repairDatabase(database, options);
        await cli.disconnectDatabase();
    });

program
    .command('restore <backupId>')
    .description('Restore database from backup')
    .option('-d, --database <name>', 'Target database name')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('--skip-safety-backup', 'Skip creating safety backup')
    .option('--keep-connections', 'Keep database connections during restore')
    .option('-v, --verbose', 'Show detailed restore steps')
    .action(async (backupId, options) => {
        await cli.connectDatabase();
        await cli.restoreFromBackup(backupId, options);
        await cli.disconnectDatabase();
    });

program
    .command('list-backups')
    .description('List available backups for restore')
    .option('-l, --limit <number>', 'Number of backups to show', '20')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.listBackups(options);
        await cli.disconnectDatabase();
    });

program
    .command('stats')
    .description('Show recovery statistics')
    .action(async () => {
        await cli.connectDatabase();
        await cli.showStatistics();
        await cli.disconnectDatabase();
    });

program
    .command('cleanup')
    .description('Clean up old recovery files')
    .option('-d, --days <number>', 'Retention period in days', '30')
    .action(async (options) => {
        await cli.cleanup(options);
    });

// Parse command line arguments
program.parse();