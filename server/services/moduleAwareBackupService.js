/**
 * Module-Aware Backup Service
 * 
 * Extends the existing backup service to include module-specific collections
 * based on enabled modules and their configurations.
 * 
 * This service integrates with the module registry to determine which
 * collections should be included in backups based on enabled modules.
 */

import BackupService from './backupService.js';
import moduleRegistry from '../core/registry/moduleRegistry.js';
import moduleLoader from '../core/registry/moduleLoader.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ModuleAwareBackupService extends BackupService {
    constructor() {
        super();
        this.moduleRegistry = moduleRegistry;
        this.moduleLoader = moduleLoader;
    }

    /**
     * Get collections to backup based on enabled modules
     * @param {string} tenantId - Tenant ID (optional, for tenant-specific modules)
     * @returns {Array<string>} Array of collection names to backup
     */
    async getCollectionsToBackup(tenantId = null) {
        try {
            const collectionsToBackup = new Set();

            // Always include core collections (from hr-core module)
            const hrCoreModule = this.moduleRegistry.getModule('hr-core');
            if (hrCoreModule && hrCoreModule.backupCollections) {
                hrCoreModule.backupCollections.forEach(collection => {
                    collectionsToBackup.add(collection);
                });
            }

            // Get enabled modules for tenant or all modules if no tenant specified
            let enabledModules = [];
            
            if (tenantId) {
                // Get modules enabled for specific tenant
                enabledModules = this.moduleLoader.getModulesForTenant(tenantId);
            } else {
                // Get all registered modules for system-wide backup
                enabledModules = this.moduleRegistry.getAllModules().map(m => m.name);
            }

            // Add collections from enabled modules
            for (const moduleName of enabledModules) {
                const moduleConfig = this.moduleRegistry.getModule(moduleName);
                
                if (moduleConfig && moduleConfig.backupCollections) {
                    logger.debug(`Adding backup collections from module: ${moduleName}`, {
                        collections: moduleConfig.backupCollections
                    });
                    
                    moduleConfig.backupCollections.forEach(collection => {
                        collectionsToBackup.add(collection);
                    });
                }
            }

            const collections = Array.from(collectionsToBackup);
            
            logger.info('Determined collections to backup', {
                tenantId,
                enabledModules,
                collectionsCount: collections.length,
                collections
            });

            return collections;

        } catch (error) {
            logger.error('Failed to determine collections to backup', {
                tenantId,
                error: error.message
            });
            
            // Fallback to core collections only
            return [
                'attendances', 'requests', 'holidays', 'missions', 'vacations',
                'mixedvacations', 'vacationbalances', 'overtimes', 'users',
                'departments', 'positions', 'forgetchecks'
            ];
        }
    }

    /**
     * Create module-aware MongoDB backup
     * @param {string} dbName - Database name
     * @param {string} backupPath - Backup destination path
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Object} Backup component info
     */
    async backupMongoDatabase(dbName, backupPath, tenantId = null) {
        const outputPath = path.join(backupPath, `${dbName}-dump`);
        const archivePath = path.join(backupPath, `${dbName}.archive`);
        
        try {
            // Get collections to backup based on enabled modules
            const collectionsToBackup = await this.getCollectionsToBackup(tenantId);
            
            // Build mongodump command with specific collections
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            let command = `mongodump --uri="${mongoUri}" --db=${dbName} --archive=${archivePath} --gzip`;
            
            // Add collection filters for module-aware backup
            if (collectionsToBackup.length > 0) {
                const collectionArgs = collectionsToBackup.map(col => `--collection=${col}`).join(' ');
                command += ` ${collectionArgs}`;
            }
            
            logger.info('Creating module-aware database backup', {
                dbName,
                tenantId,
                collectionsCount: collectionsToBackup.length,
                collections: collectionsToBackup
            });
            
            await execAsync(command);
            
            const stats = fs.statSync(archivePath);
            
            return {
                type: 'mongodb',
                database: dbName,
                path: archivePath,
                size: stats.size,
                timestamp: new Date().toISOString(),
                moduleAware: true,
                collectionsIncluded: collectionsToBackup,
                tenantId: tenantId || 'system-wide'
            };
            
        } catch (error) {
            logger.error(`Failed to backup MongoDB database ${dbName}`, { 
                error: error.message,
                tenantId,
                dbName
            });
            throw error;
        }
    }

    /**
     * Create comprehensive daily backup with module awareness
     * @param {string} tenantId - Tenant ID (optional, for tenant-specific backup)
     * @returns {Object} Backup manifest
     */
    async createModuleAwareDailyBackup(tenantId = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = tenantId ? 
            `tenant-${tenantId}-backup-${timestamp}` : 
            `system-backup-${timestamp}`;
        
        this.logger.info('Starting module-aware daily backup', { backupId, tenantId });

        try {
            const backupPath = path.join(this.backupDir, 'daily', backupId);
            fs.mkdirSync(backupPath, { recursive: true });

            const backupManifest = {
                id: backupId,
                type: 'daily',
                tenantId: tenantId || 'system-wide',
                timestamp: new Date().toISOString(),
                components: [],
                status: 'in_progress',
                checksums: {},
                moduleAware: true,
                enabledModules: tenantId ? 
                    this.moduleLoader.getModulesForTenant(tenantId) : 
                    this.moduleRegistry.getAllModules().map(m => m.name)
            };

            // 1. Backup Main MongoDB Database with module awareness
            this.logger.info('Backing up main MongoDB database with module awareness');
            const mainDbBackup = await this.backupMongoDatabase('hrms', backupPath, tenantId);
            backupManifest.components.push(mainDbBackup);

            // 2. Backup License Server Database (always included for system-wide backups)
            if (!tenantId) {
                this.logger.info('Backing up license server database');
                const licenseDbBackup = await this.backupMongoDatabase('hrsm-licenses', backupPath);
                backupManifest.components.push(licenseDbBackup);
            }

            // 3. Backup File Uploads (module-aware)
            this.logger.info('Backing up file uploads');
            const uploadsBackup = await this.backupModuleAwareFileUploads(backupPath, tenantId);
            backupManifest.components.push(uploadsBackup);

            // 4. Backup Configuration Files
            this.logger.info('Backing up configuration files');
            const configBackup = await this.backupConfigurationFiles(backupPath);
            backupManifest.components.push(configBackup);

            // 5. Backup License Server RSA Keys (system-wide only)
            if (!tenantId) {
                this.logger.info('Backing up license server RSA keys');
                const keysBackup = await this.backupRSAKeys(backupPath);
                backupManifest.components.push(keysBackup);
            }

            // 6. Backup Application Code (system-wide only)
            if (!tenantId) {
                this.logger.info('Backing up application code');
                const codeBackup = await this.backupApplicationCode(backupPath);
                backupManifest.components.push(codeBackup);
            }

            // 7. Generate checksums for all components
            this.logger.info('Generating checksums');
            await this.generateChecksums(backupPath, backupManifest);

            // 8. Compress and encrypt the entire backup
            this.logger.info('Compressing and encrypting backup');
            const finalBackupPath = await this.compressAndEncryptBackup(backupPath, backupId);

            backupManifest.status = 'completed';
            backupManifest.finalPath = finalBackupPath;
            backupManifest.size = fs.statSync(finalBackupPath).size;

            // Save backup metadata
            await this.saveBackupMetadata(backupManifest);

            // Upload to cloud storage if enabled
            if (process.env.BACKUP_CLOUD_ENABLED === 'true') {
                try {
                    this.logger.info('Uploading backup to cloud storage');
                    await this.cloudStorage.uploadBackup(finalBackupPath, backupId, {
                        backupId: backupId,
                        type: 'daily',
                        tenantId: tenantId || 'system-wide',
                        moduleAware: true
                    });
                    backupManifest.cloudUploaded = true;
                } catch (error) {
                    this.logger.warn('Cloud upload failed, backup saved locally', { 
                        error: error.message 
                    });
                    backupManifest.cloudUploaded = false;
                    backupManifest.cloudError = error.message;
                }
            }

            // Clean up temporary files
            await this.cleanupTempFiles(backupPath);

            this.logger.info('Module-aware daily backup completed successfully', { 
                backupId, 
                tenantId,
                size: backupManifest.size,
                components: backupManifest.components.length,
                enabledModules: backupManifest.enabledModules
            });

            return backupManifest;

        } catch (error) {
            this.logger.error('Module-aware daily backup failed', { 
                backupId, 
                tenantId,
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Backup file uploads with module awareness
     * @param {string} backupPath - Backup destination path
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Object} Backup component info
     */
    async backupModuleAwareFileUploads(backupPath, tenantId = null) {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const serverUploadsDir = path.join(process.cwd(), 'server', 'uploads');
        const backupFilePath = path.join(backupPath, 'uploads.tar.gz');

        try {
            const output = fs.createWriteStream(backupFilePath);
            const archive = archiver('tar', { gzip: true });

            return new Promise((resolve, reject) => {
                output.on('close', () => {
                    const stats = fs.statSync(backupFilePath);
                    resolve({
                        type: 'files',
                        component: 'uploads',
                        path: backupFilePath,
                        size: stats.size,
                        timestamp: new Date().toISOString(),
                        moduleAware: true,
                        tenantId: tenantId || 'system-wide'
                    });
                });

                archive.on('error', reject);
                archive.pipe(output);

                // Add uploads directories if they exist
                if (fs.existsSync(uploadsDir)) {
                    if (tenantId) {
                        // Tenant-specific uploads
                        const tenantUploadsDir = path.join(uploadsDir, tenantId);
                        if (fs.existsSync(tenantUploadsDir)) {
                            archive.directory(tenantUploadsDir, `uploads/${tenantId}`);
                        }
                    } else {
                        // All uploads for system-wide backup
                        archive.directory(uploadsDir, 'uploads');
                    }
                }

                if (fs.existsSync(serverUploadsDir)) {
                    if (tenantId) {
                        // Tenant-specific server uploads
                        const tenantServerUploadsDir = path.join(serverUploadsDir, tenantId);
                        if (fs.existsSync(tenantServerUploadsDir)) {
                            archive.directory(tenantServerUploadsDir, `server-uploads/${tenantId}`);
                        }
                    } else {
                        // All server uploads for system-wide backup
                        archive.directory(serverUploadsDir, 'server-uploads');
                    }
                }

                // Add module-specific upload directories
                const enabledModules = tenantId ? 
                    this.moduleLoader.getModulesForTenant(tenantId) : 
                    this.moduleRegistry.getAllModules().map(m => m.name);

                enabledModules.forEach(moduleName => {
                    const moduleUploadsDir = path.join(uploadsDir, 'modules', moduleName);
                    if (fs.existsSync(moduleUploadsDir)) {
                        if (tenantId) {
                            const tenantModuleUploadsDir = path.join(moduleUploadsDir, tenantId);
                            if (fs.existsSync(tenantModuleUploadsDir)) {
                                archive.directory(tenantModuleUploadsDir, `uploads/modules/${moduleName}/${tenantId}`);
                            }
                        } else {
                            archive.directory(moduleUploadsDir, `uploads/modules/${moduleName}`);
                        }
                    }
                });

                archive.finalize();
            });
        } catch (error) {
            this.logger.error('Failed to backup file uploads', { 
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Verify module collections exist in database
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Object} Verification results
     */
    async verifyModuleCollections(tenantId = null) {
        try {
            const collectionsToBackup = await this.getCollectionsToBackup(tenantId);
            const db = mongoose.connection.db;
            const existingCollections = await db.listCollections().toArray();
            const existingCollectionNames = existingCollections.map(c => c.name);

            const verificationResults = {
                tenantId: tenantId || 'system-wide',
                expectedCollections: collectionsToBackup,
                existingCollections: existingCollectionNames,
                missingCollections: [],
                extraCollections: [],
                verificationStatus: 'passed'
            };

            // Check for missing collections
            verificationResults.missingCollections = collectionsToBackup.filter(
                col => !existingCollectionNames.includes(col)
            );

            // Check for extra collections (not in any module config)
            const allModuleCollections = new Set();
            this.moduleRegistry.getAllModules().forEach(module => {
                if (module.backupCollections) {
                    module.backupCollections.forEach(col => allModuleCollections.add(col));
                }
            });

            verificationResults.extraCollections = existingCollectionNames.filter(
                col => !allModuleCollections.has(col) && !col.startsWith('system.')
            );

            // Determine verification status
            if (verificationResults.missingCollections.length > 0) {
                verificationResults.verificationStatus = 'warning';
            }

            logger.info('Module collections verification completed', verificationResults);

            return verificationResults;

        } catch (error) {
            logger.error('Failed to verify module collections', {
                tenantId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get backup statistics with module awareness
     * @returns {Object} Enhanced backup statistics
     */
    async getModuleAwareBackupStatistics() {
        try {
            const baseStats = await super.getBackupStatistics();
            
            // Add module-aware statistics
            const moduleStats = {
                registeredModules: this.moduleRegistry.getAllModules().length,
                moduleCollections: {},
                tenantBackups: 0,
                systemBackups: 0
            };

            // Get collection counts per module
            this.moduleRegistry.getAllModules().forEach(module => {
                if (module.backupCollections) {
                    moduleStats.moduleCollections[module.name] = module.backupCollections.length;
                }
            });

            // Count tenant vs system backups (would need to query backup logs)
            // This is a placeholder for now
            moduleStats.tenantBackups = 0;
            moduleStats.systemBackups = baseStats.totalBackups;

            return {
                ...baseStats,
                moduleAware: moduleStats
            };

        } catch (error) {
            logger.error('Failed to get module-aware backup statistics', {
                error: error.message
            });
            return await super.getBackupStatistics();
        }
    }
}

export default ModuleAwareBackupService;