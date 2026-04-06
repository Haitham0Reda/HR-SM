import BackupService from './backupService.sequelize.js';
import moduleRegistry from '../core/registry/moduleRegistry.js';
import moduleLoader from '../core/registry/moduleLoader.js';
import logger from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * Module-Aware Backup Service (PostgreSQL)
 * 
 * Extends the backup service to include module-specific tables
 * based on enabled modules and their configurations.
 */
class ModuleAwareBackupService extends BackupService {
    constructor() {
        super();
        this.moduleRegistry = moduleRegistry;
        this.moduleLoader = moduleLoader;
    }

    /**
     * Get tables to backup based on enabled modules
     */
    async getTablesToBackup(tenantId = null) {
        try {
            const tablesToBackup = new Set();

            // Always include core tables
            const hrCoreModule = this.moduleRegistry.getModule('hr-core');
            if (hrCoreModule && hrCoreModule.backupTables) {
                hrCoreModule.backupTables.forEach(table => {
                    tablesToBackup.add(table);
                });
            }

            // Get enabled modules
            let enabledModules = [];
            
            if (tenantId) {
                // Get modules enabled for specific tenant
                enabledModules = this.moduleLoader.getModulesForTenant(tenantId);
            } else {
                // Get all registered modules for system-wide backup
                enabledModules = this.moduleRegistry.getAllModules().map(m => m.name);
            }

            // Add tables from enabled modules
            for (const moduleName of enabledModules) {
                const moduleConfig = this.moduleRegistry.getModule(moduleName);
                
                if (moduleConfig && moduleConfig.backupTables) {
                    logger.debug(`Adding backup tables from module: ${moduleName}`, {
                        tables: moduleConfig.backupTables
                    });
                    
                    moduleConfig.backupTables.forEach(table => {
                        tablesToBackup.add(table);
                    });
                }
            }

            const tables = Array.from(tablesToBackup);
            
            logger.info('Determined tables to backup', {
                tenantId,
                enabledModules,
                tablesCount: tables.length,
                tables
            });

            return tables;

        } catch (error) {
            logger.error('Failed to determine tables to backup', {
                tenantId,
                error: error.message
            });
            
            // Fallback to core tables only
            return [
                'users', 'departments', 'positions', 'roles',
                'attendances', 'requests', 'holidays', 'missions',
                'vacations', 'vacation_balances', 'mixed_vacations',
                'overtimes', 'events', 'announcements', 'notifications',
                'payrolls', 'surveys'
            ];
        }
    }

    /**
     * Create module-aware backup
     */
    async createModuleAwareBackup(tenantId = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = tenantId ? 
            `module-backup-${tenantId}-${timestamp}` :
            `module-backup-system-${timestamp}`;
        
        this.logger.info('Starting module-aware backup', { backupId, tenantId });

        try {
            const backupPath = path.join(this.backupDir, 'daily', backupId);
            fs.mkdirSync(backupPath, { recursive: true });

            const backupManifest = {
                id: backupId,
                type: 'module-aware',
                tenantId,
                timestamp: new Date().toISOString(),
                components: [],
                status: 'in_progress',
                checksums: {},
                method: 'pg_dump-selective'
            };

            // Get tables to backup
            const tables = await this.getTablesToBackup(tenantId);
            backupManifest.tables = tables;

            // Backup main database with specific tables
            this.logger.info('Backing up main database tables', { count: tables.length });
            const mainDbBackup = await this.backupDatabaseTables('main', tables, backupPath);
            backupManifest.components.push(mainDbBackup);

            // Backup license server database (always full backup)
            this.logger.info('Backing up license server database');
            const licenseDbBackup = await this.backupPostgreSQLDatabase('license', backupPath);
            backupManifest.components.push(licenseDbBackup);

            // Create compressed archive
            this.logger.info('Creating compressed archive');
            const archivePath = await this.createArchive(backupPath, backupId);
            backupManifest.archivePath = archivePath;
            backupManifest.archiveSize = fs.statSync(archivePath).size;

            // Calculate checksums
            this.logger.info('Calculating checksums');
            backupManifest.checksums.archive = await this.calculateChecksum(archivePath);

            // Save backup metadata
            backupManifest.status = 'completed';
            backupManifest.completedAt = new Date().toISOString();
            await this.saveBackupMetadata(backupManifest);

            // Log backup to database
            await this.logBackup(backupManifest);

            this.logger.info('Module-aware backup completed successfully', { 
                backupId,
                archiveSize: backupManifest.archiveSize,
                tablesCount: tables.length
            });

            return backupManifest;

        } catch (error) {
            this.logger.error('Module-aware backup failed', { 
                backupId, 
                error: error.message,
                stack: error.stack
            });
            
            // Log failed backup
            await this.logBackup({
                id: backupId,
                type: 'module-aware',
                tenantId,
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * Backup specific database tables
     */
    async backupDatabaseTables(dbType, tables, backupPath) {
        const startTime = Date.now();
        const dbConfig = dbType === 'main' ? 
            this.parseConnectionString(process.env.MAIN_DATABASE_URL) :
            this.parseConnectionString(process.env.LICENSE_DATABASE_URL);

        const backupFile = path.join(backupPath, `${dbType}-tables.sql`);
        
        // Build table list for pg_dump
        const tableArgs = tables.map(t => `-t ${t}`).join(' ');
        
        // Build pg_dump command with specific tables
        const pgDumpCmd = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} ${tableArgs} -F p -f "${backupFile}"`;

        try {
            await execAsync(pgDumpCmd);
            
            const stats = fs.statSync(backupFile);
            const duration = Date.now() - startTime;

            this.logger.info(`${dbType} tables backup completed`, {
                tables: tables.length,
                size: stats.size,
                duration: `${duration}ms`
            });

            return {
                name: `${dbType}-tables`,
                type: 'postgresql-selective',
                tables,
                path: backupFile,
                size: stats.size,
                duration,
                checksum: await this.calculateChecksum(backupFile)
            };

        } catch (error) {
            this.logger.error(`${dbType} tables backup failed`, { error: error.message });
            throw new Error(`Failed to backup ${dbType} tables: ${error.message}`);
        }
    }
}

export default ModuleAwareBackupService;
