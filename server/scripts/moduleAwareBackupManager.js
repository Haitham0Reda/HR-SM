#!/usr/bin/env node

/**
 * Module-Aware Backup Manager
 * 
 * Enhanced backup manager that includes module-specific collections
 * in backup operations based on enabled modules.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ModuleAwareBackupService from '../services/moduleAwareBackupService.js';
import BackupScheduler from '../services/backupScheduler.js';
import BackupLog from '../models/BackupLog.js';
import moduleRegistry from '../core/registry/moduleRegistry.js';
import moduleLoader from '../core/registry/moduleLoader.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

class ModuleAwareBackupManagerCLI {
    constructor() {
        this.backupService = new ModuleAwareBackupService();
        this.backupScheduler = new BackupScheduler();
    }

    async connectDatabase() {
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';
            await mongoose.connect(mongoUri);
            console.log(chalk.green('✓ Connected to MongoDB'));
            
            // Initialize module registry
            await moduleRegistry.initialize();
            console.log(chalk.green('✓ Module registry initialized'));
        } catch (error) {
            console.error(chalk.red('✗ Failed to connect to MongoDB:'), error.message);
            process.exit(1);
        }
    }

    async disconnectDatabase() {
        await mongoose.disconnect();
    }

    /**
     * Create module-aware backup
     */
    async createModuleAwareBackup(options) {
        const tenantId = options.tenant || null;
        
        console.log(chalk.blue(`🔄 Starting module-aware backup${tenantId ? ` for tenant: ${tenantId}` : ' (system-wide)'}...`));
        
        try {
            const startTime = Date.now();
            const result = await this.backupService.createModuleAwareDailyBackup(tenantId);
            const duration = Date.now() - startTime;

            console.log(chalk.green('✓ Module-aware backup completed successfully!'));
            console.log(chalk.cyan(`📦 Backup ID: ${result.id}`));
            console.log(chalk.cyan(`🏢 Scope: ${result.tenantId}`));
            console.log(chalk.cyan(`📊 Size: ${this.formatBytes(result.size)}`));
            console.log(chalk.cyan(`⏱️  Duration: ${this.formatDuration(duration)}`));
            console.log(chalk.cyan(`📁 Location: ${result.finalPath}`));
            console.log(chalk.cyan(`🔧 Components: ${result.components.length}`));
            console.log(chalk.cyan(`📚 Enabled Modules: ${result.enabledModules.join(', ')}`));

            // Show component details
            if (options.verbose) {
                console.log(chalk.yellow('\n📋 Component Details:'));
                result.components.forEach(component => {
                    const moduleInfo = component.moduleAware ? 
                        chalk.green(' [Module-Aware]') : 
                        chalk.gray(' [Standard]');
                    
                    console.log(chalk.gray(`  • ${component.type}: ${component.component || component.database} (${this.formatBytes(component.size)})${moduleInfo}`));
                    
                    if (component.collectionsIncluded) {
                        console.log(chalk.gray(`    Collections: ${component.collectionsIncluded.join(', ')}`));
                    }
                });
            }

        } catch (error) {
            console.error(chalk.red('✗ Module-aware backup failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Verify module collections
     */
    async verifyModuleCollections(options) {
        const tenantId = options.tenant || null;
        
        console.log(chalk.blue(`🔍 Verifying module collections${tenantId ? ` for tenant: ${tenantId}` : ' (system-wide)'}...`));
        
        try {
            const verification = await this.backupService.verifyModuleCollections(tenantId);

            console.log(chalk.green('\n✓ Module collections verification completed'));
            console.log(chalk.cyan(`🏢 Scope: ${verification.tenantId}`));
            console.log(chalk.cyan(`📊 Status: ${verification.verificationStatus.toUpperCase()}`));
            console.log(chalk.cyan(`📚 Expected Collections: ${verification.expectedCollections.length}`));
            console.log(chalk.cyan(`💾 Existing Collections: ${verification.existingCollections.length}`));

            if (verification.missingCollections.length > 0) {
                console.log(chalk.yellow('\n⚠️  Missing Collections:'));
                verification.missingCollections.forEach(collection => {
                    console.log(chalk.red(`  • ${collection}`));
                });
            }

            if (verification.extraCollections.length > 0) {
                console.log(chalk.yellow('\n📋 Extra Collections (not in module configs):'));
                verification.extraCollections.forEach(collection => {
                    console.log(chalk.gray(`  • ${collection}`));
                });
            }

            if (options.verbose) {
                console.log(chalk.yellow('\n📚 All Expected Collections:'));
                verification.expectedCollections.forEach(collection => {
                    const exists = verification.existingCollections.includes(collection);
                    const status = exists ? chalk.green('✓') : chalk.red('✗');
                    console.log(`  ${status} ${collection}`);
                });
            }

        } catch (error) {
            console.error(chalk.red('✗ Module collections verification failed:'), error.message);
            process.exit(1);
        }
    }

    /**
     * List enabled modules
     */
    async listEnabledModules(options) {
        const tenantId = options.tenant || null;
        
        console.log(chalk.blue(`📚 Listing enabled modules${tenantId ? ` for tenant: ${tenantId}` : ' (all registered)'}...`));
        
        try {
            let modules = [];
            
            if (tenantId) {
                modules = moduleLoader.getModulesForTenant(tenantId);
            } else {
                modules = moduleRegistry.getAllModules().map(m => m.name);
            }

            console.log(chalk.green(`\n📚 ${modules.length} modules found:`));
            console.log(chalk.gray('─'.repeat(80)));

            for (const moduleName of modules) {
                const moduleConfig = moduleRegistry.getModule(moduleName);
                
                if (moduleConfig) {
                    const status = moduleConfig.metadata?.required ? 
                        chalk.blue('[REQUIRED]') : 
                        chalk.green('[OPTIONAL]');
                    
                    const backupCollections = moduleConfig.backupCollections || [];
                    const collectionsInfo = backupCollections.length > 0 ? 
                        chalk.cyan(`(${backupCollections.length} collections)`) : 
                        chalk.gray('(no backup collections)');

                    console.log(`${status} ${chalk.cyan(moduleConfig.displayName || moduleName)} ${collectionsInfo}`);
                    console.log(chalk.gray(`   ${moduleConfig.description || 'No description'}`));
                    
                    if (options.verbose && backupCollections.length > 0) {
                        console.log(chalk.gray(`   Collections: ${backupCollections.join(', ')}`));
                    }
                }
            }

        } catch (error) {
            console.error(chalk.red('✗ Failed to list enabled modules:'), error.message);
            process.exit(1);
        }
    }

    /**
     * Show module-aware backup statistics
     */
    async showModuleAwareStatistics() {
        console.log(chalk.blue('📊 Getting module-aware backup statistics...'));
        
        try {
            const stats = await this.backupService.getModuleAwareBackupStatistics();

            console.log(chalk.green('\n📊 Module-Aware Backup Statistics:'));
            console.log(chalk.gray('─'.repeat(50)));

            // Standard backup stats
            console.log(chalk.yellow('File System:'));
            console.log(chalk.cyan(`  Daily backups: ${stats.daily.count} (${this.formatBytes(stats.daily.totalSize)})`));
            console.log(chalk.cyan(`  Weekly backups: ${stats.weekly.count} (${this.formatBytes(stats.weekly.totalSize)})`));
            console.log(chalk.cyan(`  Monthly backups: ${stats.monthly.count} (${this.formatBytes(stats.monthly.totalSize)})`));
            console.log(chalk.cyan(`  Total backups: ${stats.totalBackups}`));
            console.log(chalk.cyan(`  Total size: ${this.formatBytes(stats.totalSize)}`));

            // Module-aware stats
            if (stats.moduleAware) {
                console.log(chalk.yellow('\nModule Information:'));
                console.log(chalk.cyan(`  Registered modules: ${stats.moduleAware.registeredModules}`));
                console.log(chalk.cyan(`  System backups: ${stats.moduleAware.systemBackups}`));
                console.log(chalk.cyan(`  Tenant backups: ${stats.moduleAware.tenantBackups}`));

                if (Object.keys(stats.moduleAware.moduleCollections).length > 0) {
                    console.log(chalk.yellow('\nCollections per Module:'));
                    Object.entries(stats.moduleAware.moduleCollections).forEach(([module, count]) => {
                        console.log(chalk.cyan(`  ${module}: ${count} collections`));
                    });
                }
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
            console.error(chalk.red('✗ Failed to get module-aware statistics:'), error.message);
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
const cli = new ModuleAwareBackupManagerCLI();

program
    .name('module-aware-backup-manager')
    .description('HR-SM Module-Aware Backup Management CLI')
    .version('1.0.0');

program
    .command('create')
    .description('Create a module-aware backup')
    .option('-t, --tenant <tenantId>', 'Create backup for specific tenant')
    .option('-v, --verbose', 'Show detailed component information')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.createModuleAwareBackup(options);
        await cli.disconnectDatabase();
    });

program
    .command('verify-collections')
    .description('Verify module collections exist in database')
    .option('-t, --tenant <tenantId>', 'Verify collections for specific tenant')
    .option('-v, --verbose', 'Show detailed collection information')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.verifyModuleCollections(options);
        await cli.disconnectDatabase();
    });

program
    .command('list-modules')
    .description('List enabled modules and their backup collections')
    .option('-t, --tenant <tenantId>', 'List modules for specific tenant')
    .option('-v, --verbose', 'Show detailed module information')
    .action(async (options) => {
        await cli.connectDatabase();
        await cli.listEnabledModules(options);
        await cli.disconnectDatabase();
    });

program
    .command('stats')
    .description('Show module-aware backup statistics')
    .action(async () => {
        await cli.connectDatabase();
        await cli.showModuleAwareStatistics();
        await cli.disconnectDatabase();
    });

// Parse command line arguments
program.parse();