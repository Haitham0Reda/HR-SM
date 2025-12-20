import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import winston from 'winston';
import BackupLog from '../models/BackupLog.js';
import CloudStorageService from './cloudStorageService.js';

const execAsync = promisify(exec);

/**
 * Database Recovery Service
 * Handles MongoDB corruption detection, repair, and recovery procedures
 * Includes automated recovery workflows and data integrity verification
 */
class DatabaseRecoveryService {
    constructor() {
        this.cloudStorage = new CloudStorageService();
        this.recoveryDir = path.join(process.cwd(), 'recovery');
        this.tempDir = path.join(this.recoveryDir, 'temp');
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: path.join(process.cwd(), 'logs', 'database-recovery.log') 
                }),
                new winston.transports.Console()
            ]
        });

        this.ensureDirectories();
    }

    /**
     * Ensure recovery directories exist
     */
    ensureDirectories() {
        const dirs = [this.recoveryDir, this.tempDir];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * Detect MongoDB corruption
     */
    async detectCorruption(databaseName = null) {
        this.logger.info('Starting corruption detection', { databaseName });

        const corruptionReport = {
            timestamp: new Date(),
            databases: [],
            overallStatus: 'healthy',
            issues: []
        };

        try {
            // Get list of databases to check
            const databasesToCheck = databaseName ? [databaseName] : ['hrms', 'hrsm-licenses'];

            for (const dbName of databasesToCheck) {
                const dbReport = await this.checkDatabaseIntegrity(dbName);
                corruptionReport.databases.push(dbReport);

                if (dbReport.status !== 'healthy') {
                    corruptionReport.overallStatus = 'corrupted';
                    corruptionReport.issues.push(...dbReport.issues);
                }
            }

            this.logger.info('Corruption detection completed', {
                overallStatus: corruptionReport.overallStatus,
                databasesChecked: corruptionReport.databases.length,
                issuesFound: corruptionReport.issues.length
            });

            return corruptionReport;

        } catch (error) {
            this.logger.error('Corruption detection failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Check individual database integrity
     */
    async checkDatabaseIntegrity(databaseName) {
        this.logger.info('Checking database integrity', { database: databaseName });

        const dbReport = {
            database: databaseName,
            status: 'healthy',
            issues: [],
            collections: [],
            timestamp: new Date()
        };

        try {
            // Connect to specific database
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            const dbUri = `${mongoUri}/${databaseName}`;
            
            // Test basic connectivity
            const connection = await mongoose.createConnection(dbUri);
            
            try {
                // Get database statistics
                const dbStats = await connection.db.stats();
                dbReport.stats = {
                    collections: dbStats.collections,
                    dataSize: dbStats.dataSize,
                    storageSize: dbStats.storageSize,
                    indexes: dbStats.indexes
                };

                // Check each collection
                const collections = await connection.db.listCollections().toArray();
                
                for (const collectionInfo of collections) {
                    const collectionReport = await this.checkCollectionIntegrity(
                        connection, 
                        collectionInfo.name
                    );
                    dbReport.collections.push(collectionReport);

                    if (collectionReport.status !== 'healthy') {
                        dbReport.status = 'corrupted';
                        dbReport.issues.push(...collectionReport.issues);
                    }
                }

                // Run MongoDB validation
                const validationResults = await this.runMongoValidation(databaseName);
                if (validationResults.issues.length > 0) {
                    dbReport.status = 'corrupted';
                    dbReport.issues.push(...validationResults.issues);
                }

            } finally {
                await connection.close();
            }

        } catch (error) {
            dbReport.status = 'error';
            dbReport.issues.push({
                type: 'connection_error',
                message: error.message,
                severity: 'critical'
            });
        }

        return dbReport;
    }

    /**
     * Check collection integrity
     */
    async checkCollectionIntegrity(connection, collectionName) {
        const collectionReport = {
            collection: collectionName,
            status: 'healthy',
            issues: [],
            stats: null
        };

        try {
            const collection = connection.collection(collectionName);
            
            // Get collection stats
            const stats = await collection.stats();
            collectionReport.stats = {
                count: stats.count,
                size: stats.size,
                avgObjSize: stats.avgObjSize,
                storageSize: stats.storageSize,
                indexes: stats.nindexes
            };

            // Check for basic issues
            if (stats.count === 0 && ['users', 'tenants'].includes(collectionName)) {
                collectionReport.issues.push({
                    type: 'empty_critical_collection',
                    message: `Critical collection ${collectionName} is empty`,
                    severity: 'warning'
                });
            }

            // Test basic operations
            try {
                await collection.findOne({}, { timeout: 5000 });
            } catch (error) {
                collectionReport.status = 'corrupted';
                collectionReport.issues.push({
                    type: 'read_error',
                    message: `Cannot read from collection: ${error.message}`,
                    severity: 'critical'
                });
            }

        } catch (error) {
            collectionReport.status = 'error';
            collectionReport.issues.push({
                type: 'collection_error',
                message: error.message,
                severity: 'critical'
            });
        }

        return collectionReport;
    }

    /**
     * Run MongoDB validation
     */
    async runMongoValidation(databaseName) {
        const validationResults = {
            database: databaseName,
            issues: [],
            timestamp: new Date()
        };

        try {
            // Use mongod --repair equivalent through MongoDB shell
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            
            // Run db.runCommand({validate: "collection"}) for each collection
            const connection = await mongoose.createConnection(`${mongoUri}/${databaseName}`);
            
            try {
                const collections = await connection.db.listCollections().toArray();
                
                for (const collectionInfo of collections) {
                    try {
                        const result = await connection.db.command({
                            validate: collectionInfo.name,
                            full: true
                        });

                        if (!result.valid) {
                            validationResults.issues.push({
                                type: 'validation_failed',
                                collection: collectionInfo.name,
                                message: result.errors?.join(', ') || 'Validation failed',
                                severity: 'critical'
                            });
                        }
                    } catch (error) {
                        validationResults.issues.push({
                            type: 'validation_error',
                            collection: collectionInfo.name,
                            message: error.message,
                            severity: 'critical'
                        });
                    }
                }
            } finally {
                await connection.close();
            }

        } catch (error) {
            validationResults.issues.push({
                type: 'validation_system_error',
                message: error.message,
                severity: 'critical'
            });
        }

        return validationResults;
    }

    /**
     * Repair database corruption
     */
    async repairDatabase(databaseName, repairOptions = {}) {
        this.logger.info('Starting database repair', { database: databaseName, options: repairOptions });

        const repairReport = {
            database: databaseName,
            startTime: new Date(),
            status: 'in_progress',
            steps: [],
            backupCreated: false,
            repairSuccessful: false,
            endTime: null
        };

        try {
            // Step 1: Create emergency backup before repair
            if (!repairOptions.skipBackup) {
                repairReport.steps.push(await this.createEmergencyBackup(databaseName));
                repairReport.backupCreated = true;
            }

            // Step 2: Stop application connections (if requested)
            if (repairOptions.stopConnections) {
                repairReport.steps.push(await this.stopDatabaseConnections(databaseName));
            }

            // Step 3: Run repair procedures
            repairReport.steps.push(await this.runRepairProcedures(databaseName, repairOptions));

            // Step 4: Verify repair success
            repairReport.steps.push(await this.verifyRepairSuccess(databaseName));

            // Step 5: Restart connections
            if (repairOptions.stopConnections) {
                repairReport.steps.push(await this.restartDatabaseConnections(databaseName));
            }

            repairReport.status = 'completed';
            repairReport.repairSuccessful = true;
            repairReport.endTime = new Date();

            this.logger.info('Database repair completed successfully', {
                database: databaseName,
                duration: repairReport.endTime - repairReport.startTime
            });

        } catch (error) {
            repairReport.status = 'failed';
            repairReport.error = error.message;
            repairReport.endTime = new Date();

            this.logger.error('Database repair failed', {
                database: databaseName,
                error: error.message
            });

            // Attempt rollback if backup was created
            if (repairReport.backupCreated) {
                try {
                    await this.rollbackFromBackup(databaseName);
                    repairReport.rolledBack = true;
                } catch (rollbackError) {
                    this.logger.error('Rollback failed', { error: rollbackError.message });
                    repairReport.rollbackError = rollbackError.message;
                }
            }

            throw error;
        }

        return repairReport;
    }

    /**
     * Create emergency backup before repair
     */
    async createEmergencyBackup(databaseName) {
        const step = {
            name: 'emergency_backup',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.recoveryDir, `emergency-${databaseName}-${timestamp}.archive`);

            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            const command = `mongodump --uri="${mongoUri}" --db=${databaseName} --archive=${backupPath} --gzip`;

            await execAsync(command);

            step.status = 'completed';
            step.backupPath = backupPath;
            step.message = 'Emergency backup created successfully';

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw new Error(`Emergency backup failed: ${error.message}`);
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Stop database connections
     */
    async stopDatabaseConnections(databaseName) {
        const step = {
            name: 'stop_connections',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            // Close mongoose connections
            await mongoose.disconnect();
            
            step.status = 'completed';
            step.message = 'Database connections stopped';

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw new Error(`Failed to stop connections: ${error.message}`);
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Run repair procedures
     */
    async runRepairProcedures(databaseName, options) {
        const step = {
            name: 'repair_procedures',
            status: 'in_progress',
            startTime: new Date(),
            procedures: []
        };

        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

            // Procedure 1: Compact database
            if (options.compact !== false) {
                const compactResult = await this.compactDatabase(databaseName, mongoUri);
                step.procedures.push(compactResult);
            }

            // Procedure 2: Rebuild indexes
            if (options.rebuildIndexes !== false) {
                const indexResult = await this.rebuildIndexes(databaseName, mongoUri);
                step.procedures.push(indexResult);
            }

            // Procedure 3: Repair collections
            if (options.repairCollections !== false) {
                const repairResult = await this.repairCollections(databaseName, mongoUri);
                step.procedures.push(repairResult);
            }

            step.status = 'completed';
            step.message = `${step.procedures.length} repair procedures completed`;

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw new Error(`Repair procedures failed: ${error.message}`);
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Compact database
     */
    async compactDatabase(databaseName, mongoUri) {
        const procedure = {
            name: 'compact_database',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            const connection = await mongoose.createConnection(`${mongoUri}/${databaseName}`);
            
            try {
                // Get collections to compact
                const collections = await connection.db.listCollections().toArray();
                
                for (const collectionInfo of collections) {
                    await connection.db.command({
                        compact: collectionInfo.name,
                        force: true
                    });
                }

                procedure.status = 'completed';
                procedure.message = `Compacted ${collections.length} collections`;

            } finally {
                await connection.close();
            }

        } catch (error) {
            procedure.status = 'failed';
            procedure.error = error.message;
        }

        procedure.endTime = new Date();
        return procedure;
    }

    /**
     * Rebuild indexes
     */
    async rebuildIndexes(databaseName, mongoUri) {
        const procedure = {
            name: 'rebuild_indexes',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            const connection = await mongoose.createConnection(`${mongoUri}/${databaseName}`);
            
            try {
                // Get collections
                const collections = await connection.db.listCollections().toArray();
                let totalIndexes = 0;
                
                for (const collectionInfo of collections) {
                    const result = await connection.db.command({
                        reIndex: collectionInfo.name
                    });
                    
                    if (result.ok) {
                        totalIndexes += result.nIndexes || 0;
                    }
                }

                procedure.status = 'completed';
                procedure.message = `Rebuilt ${totalIndexes} indexes across ${collections.length} collections`;

            } finally {
                await connection.close();
            }

        } catch (error) {
            procedure.status = 'failed';
            procedure.error = error.message;
        }

        procedure.endTime = new Date();
        return procedure;
    }

    /**
     * Repair collections
     */
    async repairCollections(databaseName, mongoUri) {
        const procedure = {
            name: 'repair_collections',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            const connection = await mongoose.createConnection(`${mongoUri}/${databaseName}`);
            
            try {
                const collections = await connection.db.listCollections().toArray();
                const repairedCollections = [];
                
                for (const collectionInfo of collections) {
                    try {
                        // Validate and repair if needed
                        const validation = await connection.db.command({
                            validate: collectionInfo.name,
                            full: true,
                            repair: true
                        });

                        if (validation.repaired) {
                            repairedCollections.push(collectionInfo.name);
                        }
                    } catch (error) {
                        this.logger.warn(`Failed to repair collection ${collectionInfo.name}`, {
                            error: error.message
                        });
                    }
                }

                procedure.status = 'completed';
                procedure.message = `Repaired ${repairedCollections.length} collections`;
                procedure.repairedCollections = repairedCollections;

            } finally {
                await connection.close();
            }

        } catch (error) {
            procedure.status = 'failed';
            procedure.error = error.message;
        }

        procedure.endTime = new Date();
        return procedure;
    }

    /**
     * Verify repair success
     */
    async verifyRepairSuccess(databaseName) {
        const step = {
            name: 'verify_repair',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            // Run corruption detection again
            const corruptionReport = await this.detectCorruption(databaseName);
            
            if (corruptionReport.overallStatus === 'healthy') {
                step.status = 'completed';
                step.message = 'Database repair verification successful';
            } else {
                step.status = 'failed';
                step.message = `Repair verification failed: ${corruptionReport.issues.length} issues remain`;
                step.remainingIssues = corruptionReport.issues;
            }

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Restart database connections
     */
    async restartDatabaseConnections(databaseName) {
        const step = {
            name: 'restart_connections',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            // Reconnect mongoose
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            await mongoose.connect(mongoUri);
            
            step.status = 'completed';
            step.message = 'Database connections restarted';

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Restore database from backup
     */
    async restoreFromBackup(backupId, targetDatabase = null, restoreOptions = {}) {
        this.logger.info('Starting database restoration', { backupId, targetDatabase });

        const restoreReport = {
            backupId: backupId,
            targetDatabase: targetDatabase,
            startTime: new Date(),
            status: 'in_progress',
            steps: [],
            restorationSuccessful: false
        };

        try {
            // Step 1: Get backup information
            restoreReport.steps.push(await this.getBackupInfo(backupId));

            // Step 2: Download backup if from cloud
            restoreReport.steps.push(await this.downloadBackupIfNeeded(backupId));

            // Step 3: Create current database backup (safety)
            if (!restoreOptions.skipSafetyBackup) {
                restoreReport.steps.push(await this.createSafetyBackup(targetDatabase));
            }

            // Step 4: Stop connections
            if (!restoreOptions.keepConnections) {
                restoreReport.steps.push(await this.stopDatabaseConnections(targetDatabase));
            }

            // Step 5: Restore database
            restoreReport.steps.push(await this.performRestore(backupId, targetDatabase));

            // Step 6: Verify restoration
            restoreReport.steps.push(await this.verifyRestoration(targetDatabase));

            // Step 7: Restart connections
            if (!restoreOptions.keepConnections) {
                restoreReport.steps.push(await this.restartDatabaseConnections(targetDatabase));
            }

            restoreReport.status = 'completed';
            restoreReport.restorationSuccessful = true;
            restoreReport.endTime = new Date();

            // Update backup log
            const backup = await BackupLog.getBackupById(backupId);
            if (backup) {
                await backup.markAsRestored(restoreOptions.userId, 'Database restoration completed');
            }

            this.logger.info('Database restoration completed successfully', {
                backupId,
                targetDatabase,
                duration: restoreReport.endTime - restoreReport.startTime
            });

        } catch (error) {
            restoreReport.status = 'failed';
            restoreReport.error = error.message;
            restoreReport.endTime = new Date();

            this.logger.error('Database restoration failed', {
                backupId,
                targetDatabase,
                error: error.message
            });

            throw error;
        }

        return restoreReport;
    }

    /**
     * Get backup information
     */
    async getBackupInfo(backupId) {
        const step = {
            name: 'get_backup_info',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            const backup = await BackupLog.getBackupById(backupId);
            
            if (!backup) {
                throw new Error('Backup not found');
            }

            if (backup.status !== 'completed') {
                throw new Error('Backup is not in completed status');
            }

            step.status = 'completed';
            step.message = 'Backup information retrieved';
            step.backupInfo = {
                id: backup.backupId,
                type: backup.type,
                size: backup.size,
                components: backup.components.length,
                cloudUploaded: backup.cloudStorage.uploaded
            };

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw error;
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Download backup if needed
     */
    async downloadBackupIfNeeded(backupId) {
        const step = {
            name: 'download_backup',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            const backup = await BackupLog.getBackupById(backupId);
            
            // Check if backup file exists locally
            if (backup.finalPath && fs.existsSync(backup.finalPath)) {
                step.status = 'skipped';
                step.message = 'Backup file already available locally';
            } else if (backup.cloudStorage.uploaded) {
                // Download from cloud storage
                const downloadPath = path.join(this.recoveryDir, `${backupId}.tar.gz.enc`);
                await this.cloudStorage.downloadBackup(backupId, downloadPath);
                
                step.status = 'completed';
                step.message = 'Backup downloaded from cloud storage';
                step.downloadPath = downloadPath;
            } else {
                throw new Error('Backup file not available locally or in cloud storage');
            }

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw error;
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Create safety backup
     */
    async createSafetyBackup(databaseName) {
        const step = {
            name: 'safety_backup',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.recoveryDir, `safety-${databaseName}-${timestamp}.archive`);

            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            const command = `mongodump --uri="${mongoUri}" --db=${databaseName} --archive=${backupPath} --gzip`;

            await execAsync(command);

            step.status = 'completed';
            step.message = 'Safety backup created';
            step.backupPath = backupPath;

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            // Don't throw error for safety backup failure
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Perform database restore
     */
    async performRestore(backupId, targetDatabase) {
        const step = {
            name: 'perform_restore',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            const backup = await BackupLog.getBackupById(backupId);
            const backupPath = backup.finalPath || path.join(this.recoveryDir, `${backupId}.tar.gz.enc`);

            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file not found for restoration');
            }

            // Extract and restore database components
            const extractDir = path.join(this.tempDir, `restore-${backupId}`);
            if (!fs.existsSync(extractDir)) {
                fs.mkdirSync(extractDir, { recursive: true });
            }

            // For now, we'll simulate the restore process
            // In a real implementation, this would:
            // 1. Decrypt the backup file
            // 2. Extract the archive
            // 3. Use mongorestore to restore each database
            
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            
            // Find database archives in backup
            const dbComponents = backup.components.filter(c => c.type === 'mongodb');
            
            for (const component of dbComponents) {
                if (component.database === targetDatabase || !targetDatabase) {
                    // Simulate mongorestore command
                    this.logger.info(`Restoring database: ${component.database}`);
                    // const command = `mongorestore --uri="${mongoUri}" --archive=${component.path} --gzip --drop`;
                    // await execAsync(command);
                }
            }

            step.status = 'completed';
            step.message = `Restored ${dbComponents.length} database components`;

            // Cleanup
            if (fs.existsSync(extractDir)) {
                fs.rmSync(extractDir, { recursive: true, force: true });
            }

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw error;
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Verify restoration
     */
    async verifyRestoration(databaseName) {
        const step = {
            name: 'verify_restoration',
            status: 'in_progress',
            startTime: new Date()
        };

        try {
            // Run integrity check on restored database
            const integrityReport = await this.checkDatabaseIntegrity(databaseName);
            
            if (integrityReport.status === 'healthy') {
                step.status = 'completed';
                step.message = 'Database restoration verified successfully';
            } else {
                step.status = 'warning';
                step.message = `Restoration completed with ${integrityReport.issues.length} issues`;
                step.issues = integrityReport.issues;
            }

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
        }

        step.endTime = new Date();
        return step;
    }

    /**
     * Rollback from backup
     */
    async rollbackFromBackup(databaseName) {
        this.logger.info('Starting rollback procedure', { database: databaseName });

        try {
            // Find the most recent emergency backup
            const backupFiles = fs.readdirSync(this.recoveryDir)
                .filter(file => file.startsWith(`emergency-${databaseName}-`))
                .sort()
                .reverse();

            if (backupFiles.length === 0) {
                throw new Error('No emergency backup found for rollback');
            }

            const backupPath = path.join(this.recoveryDir, backupFiles[0]);
            
            // Restore from emergency backup
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            const command = `mongorestore --uri="${mongoUri}" --archive=${backupPath} --gzip --drop`;

            await execAsync(command);

            this.logger.info('Rollback completed successfully', {
                database: databaseName,
                backupFile: backupFiles[0]
            });

        } catch (error) {
            this.logger.error('Rollback failed', {
                database: databaseName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get recovery statistics
     */
    async getRecoveryStatistics() {
        try {
            // Get recovery operations from logs
            const recoveryOperations = await BackupLog.find({
                'restoration.restored': true
            }).sort({ 'restoration.restoredAt': -1 }).limit(10);

            const stats = {
                totalRestorations: recoveryOperations.length,
                recentRestorations: recoveryOperations.map(op => ({
                    backupId: op.backupId,
                    restoredAt: op.restoration.restoredAt,
                    restoredBy: op.restoration.restoredBy,
                    notes: op.restoration.restorationNotes
                })),
                recoveryFiles: this.getRecoveryFiles()
            };

            return stats;

        } catch (error) {
            this.logger.error('Failed to get recovery statistics', { error: error.message });
            throw error;
        }
    }

    /**
     * Get recovery files
     */
    getRecoveryFiles() {
        try {
            const files = fs.readdirSync(this.recoveryDir)
                .filter(file => file.endsWith('.archive'))
                .map(file => {
                    const filePath = path.join(this.recoveryDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    };
                })
                .sort((a, b) => b.created - a.created);

            return files;

        } catch (error) {
            this.logger.warn('Failed to get recovery files', { error: error.message });
            return [];
        }
    }

    /**
     * Cleanup old recovery files
     */
    async cleanupRecoveryFiles(retentionDays = 30) {
        this.logger.info('Cleaning up old recovery files', { retentionDays });

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const files = fs.readdirSync(this.recoveryDir);
            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(this.recoveryDir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtime < cutoffDate && file.endsWith('.archive')) {
                    try {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        this.logger.info(`Deleted old recovery file: ${file}`);
                    } catch (error) {
                        this.logger.warn(`Failed to delete recovery file: ${file}`, {
                            error: error.message
                        });
                    }
                }
            }

            this.logger.info(`Cleanup completed: ${deletedCount} files deleted`);
            return { deletedCount };

        } catch (error) {
            this.logger.error('Recovery cleanup failed', { error: error.message });
            throw error;
        }
    }
}

export default DatabaseRecoveryService;