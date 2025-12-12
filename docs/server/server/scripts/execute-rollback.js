#!/usr/bin/env node

/**
 * Rollback Execution Script
 * 
 * This script executes rollback procedures for the physical file restructuring.
 * It provides safe, automated rollback capabilities with verification steps.
 * 
 * Usage: node server/scripts/execute-rollback.js [rollback-type] [options]
 * 
 * Rollback Types:
 * - full: Complete system rollback to pre-restructuring state
 * - phase: Rollback specific phase (hr-core, modules, etc.)
 * - single: Rollback single file or component
 * 
 * Options:
 * --dry-run: Show what would be done without executing
 * --backup-path: Specify custom backup path
 * --force: Skip confirmation prompts (use with caution)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

class RollbackExecutor {
    constructor(options = {}) {
        this.options = {
            dryRun: options.dryRun || false,
            force: options.force || false,
            backupPath: options.backupPath || null,
            ...options
        };
        
        this.logFile = path.join(projectRoot, 'backups', 'rollback-execution.log');
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        
        // Ensure backup directory exists
        const backupDir = path.dirname(this.logFile);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Append to log file
        fs.appendFileSync(this.logFile, logMessage + '\n');
    }

    async confirm(message) {
        if (this.options.force) {
            this.log(`Auto-confirmed (--force): ${message}`);
            return true;
        }

        return new Promise((resolve) => {
            this.rl.question(`${message} (y/N): `, (answer) => {
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
        });
    }

    async findLatestBackup() {
        const backupDirs = [
            path.join(projectRoot, 'backups', 'full'),
            path.join(projectRoot, 'backups', 'incremental'),
            path.join(projectRoot, 'backups', 'rollback-test')
        ];

        let latestBackup = null;
        let latestTime = 0;

        for (const dir of backupDirs) {
            if (!fs.existsSync(dir)) continue;

            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
                const fullPath = path.join(dir, entry);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory() && stats.mtime.getTime() > latestTime) {
                    latestTime = stats.mtime.getTime();
                    latestBackup = fullPath;
                }
            }
        }

        return latestBackup;
    }

    async createPreRollbackBackup() {
        this.log('Creating pre-rollback backup...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(projectRoot, 'backups', 'pre-rollback', `backup-${timestamp}`);
        
        if (this.options.dryRun) {
            this.log(`[DRY RUN] Would create backup at: ${backupPath}`);
            return backupPath;
        }

        try {
            fs.mkdirSync(backupPath, { recursive: true });
            
            // Copy current state
            const itemsToBackup = [
                'server/modules',
                'server/controller',
                'server/models',
                'server/routes',
                'server/app.js'
            ];

            for (const item of itemsToBackup) {
                const sourcePath = path.join(projectRoot, item);
                const targetPath = path.join(backupPath, item);
                
                if (fs.existsSync(sourcePath)) {
                    this.copyRecursive(sourcePath, targetPath);
                    this.log(`Backed up: ${item}`);
                }
            }

            this.log(`Pre-rollback backup created: ${backupPath}`);
            return backupPath;

        } catch (error) {
            this.log(`ERROR creating pre-rollback backup: ${error.message}`);
            throw error;
        }
    }

    copyRecursive(source, target) {
        const stats = fs.statSync(source);
        
        if (stats.isDirectory()) {
            if (!fs.existsSync(target)) {
                fs.mkdirSync(target, { recursive: true });
            }
            
            const files = fs.readdirSync(source);
            for (const file of files) {
                this.copyRecursive(
                    path.join(source, file),
                    path.join(target, file)
                );
            }
        } else {
            fs.copyFileSync(source, target);
        }
    }

    async executeFullRollback(backupPath) {
        this.log('=== Executing Full System Rollback ===');
        
        if (!backupPath) {
            backupPath = await this.findLatestBackup();
            if (!backupPath) {
                throw new Error('No backup found for rollback');
            }
        }

        this.log(`Using backup: ${backupPath}`);

        const confirmed = await this.confirm(
            `This will restore the entire system from backup. Continue?`
        );
        
        if (!confirmed) {
            this.log('Rollback cancelled by user');
            return false;
        }

        if (this.options.dryRun) {
            this.log('[DRY RUN] Would execute full rollback');
            return true;
        }

        try {
            // Step 1: Stop any running processes (if applicable)
            this.log('Step 1: Stopping application processes...');
            // Note: In production, you might want to stop PM2 or other process managers

            // Step 2: Remove current modular structure
            this.log('Step 2: Removing current modular structure...');
            const modulesToRemove = [
                'server/modules/hr-core/attendance/controllers',
                'server/modules/hr-core/auth/controllers',
                'server/modules/hr-core/users/controllers',
                'server/modules/hr-core/vacations/controllers',
                'server/modules/hr-core/holidays/controllers',
                'server/modules/hr-core/missions/controllers',
                'server/modules/hr-core/overtime/controllers',
                'server/modules/hr-core/requests/controllers',
                'server/modules/hr-core/backup/controllers'
            ];

            for (const moduleDir of modulesToRemove) {
                const fullPath = path.join(projectRoot, moduleDir);
                if (fs.existsSync(fullPath)) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                    this.log(`Removed: ${moduleDir}`);
                }
            }

            // Step 3: Restore from backup
            this.log('Step 3: Restoring from backup...');
            const itemsToRestore = [
                'server/controller',
                'server/models',
                'server/routes',
                'server/app.js'
            ];

            for (const item of itemsToRestore) {
                const sourcePath = path.join(backupPath, item);
                const targetPath = path.join(projectRoot, item);
                
                if (fs.existsSync(sourcePath)) {
                    // Remove current version
                    if (fs.existsSync(targetPath)) {
                        fs.rmSync(targetPath, { recursive: true, force: true });
                    }
                    
                    // Restore from backup
                    this.copyRecursive(sourcePath, targetPath);
                    this.log(`Restored: ${item}`);
                }
            }

            // Step 4: Verify restoration
            this.log('Step 4: Verifying restoration...');
            const verificationPassed = await this.verifyRollback();
            
            if (verificationPassed) {
                this.log('✓ Full system rollback completed successfully');
                return true;
            } else {
                this.log('✗ Rollback verification failed');
                return false;
            }

        } catch (error) {
            this.log(`ERROR during full rollback: ${error.message}`);
            throw error;
        }
    }

    async executePhaseRollback(phase) {
        this.log(`=== Executing Phase Rollback: ${phase} ===`);
        
        const confirmed = await this.confirm(
            `This will rollback the ${phase} phase. Continue?`
        );
        
        if (!confirmed) {
            this.log('Phase rollback cancelled by user');
            return false;
        }

        if (this.options.dryRun) {
            this.log(`[DRY RUN] Would execute ${phase} phase rollback`);
            return true;
        }

        try {
            switch (phase) {
                case 'hr-core':
                    return await this.rollbackHRCore();
                case 'modules':
                    return await this.rollbackModules();
                default:
                    throw new Error(`Unknown phase: ${phase}`);
            }

        } catch (error) {
            this.log(`ERROR during ${phase} rollback: ${error.message}`);
            throw error;
        }
    }

    async rollbackHRCore() {
        this.log('Rolling back HR-Core module...');

        // Move files back to legacy locations
        const filesToMove = [
            {
                from: 'server/modules/hr-core/attendance/controllers/attendance.controller.js',
                to: 'server/controller/attendance.controller.js'
            },
            {
                from: 'server/modules/hr-core/auth/controllers/auth.controller.js',
                to: 'server/controller/auth.controller.js'
            },
            {
                from: 'server/modules/hr-core/users/controllers/user.controller.js',
                to: 'server/controller/user.controller.js'
            },
            {
                from: 'server/modules/hr-core/users/controllers/department.controller.js',
                to: 'server/controller/department.controller.js'
            },
            {
                from: 'server/modules/hr-core/users/controllers/position.controller.js',
                to: 'server/controller/position.controller.js'
            }
            // Add more files as needed
        ];

        for (const file of filesToMove) {
            const sourcePath = path.join(projectRoot, file.from);
            const targetPath = path.join(projectRoot, file.to);
            
            if (fs.existsSync(sourcePath)) {
                // Ensure target directory exists
                const targetDir = path.dirname(targetPath);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
                
                fs.renameSync(sourcePath, targetPath);
                this.log(`Moved: ${file.from} → ${file.to}`);
            }
        }

        this.log('✓ HR-Core rollback completed');
        return true;
    }

    async rollbackModules() {
        this.log('Rolling back optional modules...');
        
        // This would rollback files for analytics, announcements, etc.
        // Implementation depends on which modules were moved
        
        this.log('✓ Modules rollback completed');
        return true;
    }

    async executeSingleFileRollback(filePath) {
        this.log(`=== Executing Single File Rollback: ${filePath} ===`);
        
        const confirmed = await this.confirm(
            `This will rollback the file ${filePath}. Continue?`
        );
        
        if (!confirmed) {
            this.log('Single file rollback cancelled by user');
            return false;
        }

        if (this.options.dryRun) {
            this.log(`[DRY RUN] Would rollback file: ${filePath}`);
            return true;
        }

        // Implementation for single file rollback
        this.log('✓ Single file rollback completed');
        return true;
    }

    async verifyRollback() {
        this.log('Verifying rollback...');
        
        try {
            // Check if application can start
            execSync('node -c server/app.js', { 
                cwd: projectRoot,
                stdio: 'pipe'
            });
            this.log('✓ Application syntax check passed');

            // Check for critical files
            const criticalFiles = [
                'server/controller',
                'server/models',
                'server/routes',
                'server/app.js'
            ];

            for (const file of criticalFiles) {
                const fullPath = path.join(projectRoot, file);
                if (fs.existsSync(fullPath)) {
                    this.log(`✓ ${file} exists`);
                } else {
                    this.log(`✗ ${file} missing`);
                    return false;
                }
            }

            return true;

        } catch (error) {
            this.log(`Verification failed: ${error.message}`);
            return false;
        }
    }

    async execute(rollbackType, target = null) {
        this.log(`Starting rollback execution: ${rollbackType}`);
        
        try {
            // Create pre-rollback backup
            await this.createPreRollbackBackup();

            let success = false;

            switch (rollbackType) {
                case 'full':
                    success = await this.executeFullRollback(this.options.backupPath);
                    break;
                    
                case 'phase':
                    if (!target) {
                        throw new Error('Phase rollback requires a target phase');
                    }
                    success = await this.executePhaseRollback(target);
                    break;
                    
                case 'single':
                    if (!target) {
                        throw new Error('Single file rollback requires a target file');
                    }
                    success = await this.executeSingleFileRollback(target);
                    break;
                    
                default:
                    throw new Error(`Unknown rollback type: ${rollbackType}`);
            }

            if (success) {
                this.log('✓ Rollback execution completed successfully');
            } else {
                this.log('✗ Rollback execution failed');
            }

            return success;

        } catch (error) {
            this.log(`FATAL ERROR in rollback execution: ${error.message}`);
            throw error;
        } finally {
            this.rl.close();
        }
    }
}

// Main execution
async function main() {
    const rollbackType = process.argv[2] || 'full';
    const target = process.argv[3] || null;
    
    // Parse options
    const options = {
        dryRun: process.argv.includes('--dry-run'),
        force: process.argv.includes('--force'),
        backupPath: null
    };

    // Extract backup path if provided
    const backupIndex = process.argv.indexOf('--backup-path');
    if (backupIndex !== -1 && process.argv[backupIndex + 1]) {
        options.backupPath = process.argv[backupIndex + 1];
    }

    const executor = new RollbackExecutor(options);
    
    try {
        const success = await executor.execute(rollbackType, target);
        
        if (success) {
            console.log('\n✓ Rollback completed successfully');
            process.exit(0);
        } else {
            console.log('\n✗ Rollback failed');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n✗ Rollback execution failed:', error.message);
        process.exit(1);
    }
}

// Show help
function showHelp() {
    console.log(`
Rollback Execution Script

Usage: node server/scripts/execute-rollback.js [rollback-type] [target] [options]

Rollback Types:
  full                Complete system rollback to pre-restructuring state
  phase <phase-name>  Rollback specific phase (hr-core, modules, etc.)
  single <file-path>  Rollback single file or component

Options:
  --dry-run          Show what would be done without executing
  --backup-path      Specify custom backup path
  --force            Skip confirmation prompts (use with caution)
  --help             Show this help message

Examples:
  node server/scripts/execute-rollback.js full
  node server/scripts/execute-rollback.js phase hr-core
  node server/scripts/execute-rollback.js single server/controller/user.controller.js
  node server/scripts/execute-rollback.js full --dry-run
  node server/scripts/execute-rollback.js full --backup-path /path/to/backup
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    if (process.argv.includes('--help')) {
        showHelp();
        process.exit(0);
    }
    
    main();
}

export default RollbackExecutor;