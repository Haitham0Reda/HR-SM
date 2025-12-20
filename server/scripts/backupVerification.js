#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import BackupVerificationSystem from '../services/backupVerificationSystem.js';
import BackupLog from '../models/BackupLog.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

/**
 * Backup Verification CLI
 * Command-line interface for comprehensive backup verification
 */
class BackupVerificationCLI {
    constructor() {
        this.verificationSystem = new BackupVerificationSystem();
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
     * Run comprehensive verification
     */
    async runVerification(backupId, options) {
        console.log(chalk.blue(`🔍 Running comprehensive verification for backup: ${backupId}`));
        
        try {
            const verificationOptions = {
                includeRestorationTest: options.includeRestoration
            };

            const report = await this.verificationSystem.runComprehensiveVerification(
                backupId, 
                verificationOptions
            );

            this.displayVerificationReport(report, options);

        } catch (error) {
            console.error(chalk.red('✗ Verification failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Display verification report
     */
    displayVerificationReport(report, options) {
        console.log(chalk.green('\n🔍 Comprehensive Verification Report'));
        console.log(chalk.gray('═'.repeat(60)));
        
        // Header
        console.log(chalk.cyan(`Backup ID: ${report.backupId}`));
        console.log(chalk.cyan(`Overall Status: ${this.getStatusIcon(report.status)} ${report.status.toUpperCase()}`));
        console.log(chalk.cyan(`Overall Score: ${report.overallScore}/100`));
        console.log(chalk.cyan(`Duration: ${this.formatDuration(report.duration)}`));
        console.log(chalk.cyan(`Phases Completed: ${report.phases.length}`));

        // Phases
        console.log(chalk.yellow('\n📋 Verification Phases:'));
        report.phases.forEach((phase, index) => {
            const statusIcon = this.getStatusIcon(phase.status);
            const scoreColor = phase.score >= 80 ? chalk.green : phase.score >= 60 ? chalk.yellow : chalk.red;
            
            console.log(`\n${index + 1}. ${statusIcon} ${chalk.bold(phase.name)}`);
            console.log(`   Status: ${phase.status} | Score: ${scoreColor(phase.score + '/100')}`);
            console.log(`   Duration: ${this.formatDuration(phase.endTime - phase.startTime)}`);
            
            if (phase.error) {
                console.log(chalk.red(`   Error: ${phase.error}`));
            }

            // Show tests if verbose
            if (options.verbose && phase.tests) {
                console.log(chalk.gray('   Tests:'));
                phase.tests.forEach(test => {
                    const testIcon = this.getStatusIcon(test.status);
                    console.log(chalk.gray(`     ${testIcon} ${test.name}: ${test.message || test.status}`));
                });
            }
        });

        // Recommendations
        if (report.recommendations && report.recommendations.length > 0) {
            console.log(chalk.yellow('\n💡 Recommendations:'));
            report.recommendations.forEach((rec, index) => {
                const recIcon = rec.type === 'critical' ? '🚨' : 
                               rec.type === 'warning' ? '⚠️' : 
                               rec.type === 'improvement' ? '📈' : '💡';
                
                console.log(`${index + 1}. ${recIcon} ${rec.message}`);
            });
        }

        // Summary
        console.log(chalk.blue('\n📊 Summary:'));
        const passedPhases = report.phases.filter(p => p.status === 'passed' || p.status === 'excellent' || p.status === 'good').length;
        const failedPhases = report.phases.filter(p => p.status === 'failed').length;
        const warningPhases = report.phases.filter(p => p.status === 'warning').length;

        console.log(chalk.green(`✓ Passed phases: ${passedPhases}`));
        if (warningPhases > 0) {
            console.log(chalk.yellow(`⚠ Warning phases: ${warningPhases}`));
        }
        if (failedPhases > 0) {
            console.log(chalk.red(`✗ Failed phases: ${failedPhases}`));
        }

        // Overall assessment
        if (report.overallScore >= 90) {
            console.log(chalk.green('\n🎉 Excellent! This backup passed comprehensive verification.'));
        } else if (report.overallScore >= 80) {
            console.log(chalk.green('\n✅ Good! This backup is reliable with minor issues.'));
        } else if (report.overallScore >= 60) {
            console.log(chalk.yellow('\n⚠️ Warning! This backup has some issues that should be addressed.'));
        } else {
            console.log(chalk.red('\n❌ Critical! This backup has significant issues and may not be reliable.'));
        }
    }

    /**
     * Run automated verification
     */
    async runAutomatedVerification(options) {
        console.log(chalk.blue('🤖 Running automated verification for recent backups...'));
        
        try {
            const results = await this.verificationSystem.runAutomatedVerification();

            console.log(chalk.green(`\n✓ Automated verification completed for ${results.length} backups`));

            if (results.length > 0) {
                console.log(chalk.yellow('\n📊 Results Summary:'));
                results.forEach((result, index) => {
                    const statusIcon = this.getStatusIcon(result.status);
                    const scoreColor = result.overallScore >= 80 ? chalk.green : 
                                     result.overallScore >= 60 ? chalk.yellow : chalk.red;
                    
                    console.log(`${index + 1}. ${statusIcon} ${result.backupId}`);
                    console.log(`   Score: ${scoreColor(result.overallScore + '/100')} | Status: ${result.status}`);
                    console.log(`   Phases: ${result.phases.length} | Duration: ${this.formatDuration(result.duration)}`);
                });

                const avgScore = Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length);
                console.log(chalk.cyan(`\nAverage Score: ${avgScore}/100`));
            }

        } catch (error) {
            console.error(chalk.red('✗ Automated verification failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * List verification reports
     */
    async listReports(options) {
        console.log(chalk.blue('📋 Listing verification reports...'));
        
        try {
            const backups = await BackupLog.find({
                'verification.verified': true
            }).sort({ 'verification.verifiedAt': -1 }).limit(options.limit || 10);

            if (backups.length === 0) {
                console.log(chalk.yellow('No verification reports found.'));
                return;
            }

            console.log(chalk.green(`\n📊 Verification Reports (${backups.length}):`));
            console.log(chalk.gray('─'.repeat(80)));

            backups.forEach((backup, index) => {
                const statusIcon = this.getStatusIcon(backup.verification.verificationStatus);
                const date = new Date(backup.verification.verifiedAt).toLocaleString();
                
                console.log(`${index + 1}. ${statusIcon} ${chalk.cyan(backup.backupId)}`);
                console.log(`   Type: ${backup.type} | Verified: ${date}`);
                console.log(`   Status: ${backup.verification.verificationStatus}`);
                
                if (backup.verification.verificationErrors.length > 0) {
                    console.log(chalk.red(`   Errors: ${backup.verification.verificationErrors.length}`));
                }
                
                console.log('');
            });

        } catch (error) {
            console.error(chalk.red('✗ Failed to list reports:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Show verification system status
     */
    async showStatus() {
        console.log(chalk.blue('📊 Verification System Status'));
        
        try {
            const status = this.verificationSystem.getVerificationSystemStatus();

            console.log(chalk.green('\n🔧 System Configuration:'));
            console.log(chalk.cyan(`Staging Directory: ${status.stagingDirectory}`));
            
            console.log(chalk.yellow('\n📅 Verification Schedule:'));
            Object.entries(status.schedule).forEach(([key, value]) => {
                const icon = value ? '✅' : '❌';
                console.log(`  ${icon} ${key}: ${value ? 'Enabled' : 'Disabled'}`);
            });

            console.log(chalk.yellow('\n🔧 Components:'));
            Object.entries(status.components).forEach(([key, value]) => {
                const icon = value ? '✅' : '❌';
                console.log(`  ${icon} ${key}: ${value ? 'Available' : 'Not Available'}`);
            });

            // Get recent verification statistics
            const recentStats = await BackupLog.aggregate([
                {
                    $match: {
                        'verification.verified': true,
                        'verification.verifiedAt': {
                            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                },
                {
                    $group: {
                        _id: '$verification.verificationStatus',
                        count: { $sum: 1 }
                    }
                }
            ]);

            if (recentStats.length > 0) {
                console.log(chalk.yellow('\n📊 Recent Verifications (7 days):'));
                recentStats.forEach(stat => {
                    const icon = this.getStatusIcon(stat._id);
                    console.log(`  ${icon} ${stat._id}: ${stat.count}`);
                });
            }

        } catch (error) {
            console.error(chalk.red('✗ Failed to get status:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Update verification schedule
     */
    async updateSchedule(options) {
        console.log(chalk.blue('⚙️ Updating verification schedule...'));
        
        try {
            const newSchedule = {};
            
            if (options.daily !== undefined) newSchedule.daily = options.daily;
            if (options.weekly !== undefined) newSchedule.weekly = options.weekly;
            if (options.monthly !== undefined) newSchedule.monthly = options.monthly;
            if (options.restorationTest !== undefined) newSchedule.restorationTest = options.restorationTest;

            this.verificationSystem.updateVerificationSchedule(newSchedule);
            
            console.log(chalk.green('✓ Verification schedule updated'));
            console.log(chalk.cyan('New schedule:'));
            Object.entries(newSchedule).forEach(([key, value]) => {
                console.log(`  ${key}: ${value ? 'Enabled' : 'Disabled'}`);
            });

        } catch (error) {
            console.error(chalk.red('✗ Failed to update schedule:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        switch (status) {
            case 'excellent':
            case 'good':
            case 'passed':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'failed':
                return '❌';
            case 'in_progress':
                return '⏳';
            default:
                return '❓';
        }
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
const cli = new BackupVerificationCLI();

program
    .name('backup-verification')
    .description('HR-SM Backup Verification CLI')
    .version('1.0.0');

program
    .command('verify <backupId>')
    .description('Run comprehensive verification for a specific backup')
    .option('--include-restoration', 'Include restoration testing')
    .option('-v, --verbose', 'Show detailed test results')
    .action(async (backupId, options) => {
        await cli.connectDatabase();
        await cli.runVerification(backupId, options);
        await cli.disconnectDatabase();
    });

program
    .command('auto')
    .description('Run automated verification for recent backups')
    .option('-v, --verbose', 'Show detailed results')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.runAutomatedVerification(options);
        await cli.disconnectDatabase();
    });

program
    .command('list')
    .description('List verification reports')
    .option('-l, --limit <number>', 'Number of reports to show', '10')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.listReports(options);
        await cli.disconnectDatabase();
    });

program
    .command('status')
    .description('Show verification system status')
    .action(async () => {
        await cli.connectDatabase();
        await cli.showStatus();
        await cli.disconnectDatabase();
    });

program
    .command('schedule')
    .description('Update verification schedule')
    .option('--daily <boolean>', 'Enable/disable daily verification')
    .option('--weekly <boolean>', 'Enable/disable weekly verification')
    .option('--monthly <boolean>', 'Enable/disable monthly verification')
    .option('--restoration-test <boolean>', 'Enable/disable restoration testing')
    .action(async (options) => {
        await cli.updateSchedule(options);
    });

// Parse command line arguments
program.parse();