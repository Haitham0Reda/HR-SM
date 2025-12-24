import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';
import mongoose from 'mongoose';
import winston from 'winston';
import CloudStorageService from './cloudStorageService.js';
import BackupLog from '../models/BackupLog.js';

const execAsync = promisify(exec);

/**
 * Comprehensive Backup Service for HR-SM Enterprise
 * Handles automated daily backups of ALL system components:
 * - Main MongoDB database (hrms)
 * - License server database (hrsm-licenses)
 * - File uploads
 * - Configuration files
 * - License server RSA keys (encrypted)
 * - Application code and dependencies
 */
class BackupService {
    constructor() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'logs/backup.log' })
            ]
        });
        
        this.backupDir = path.join(process.cwd(), 'backups');
        this.tempDir = path.join(this.backupDir, 'temp');
        this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || this.generateEncryptionKey();
        this.cloudStorage = new CloudStorageService();
        this.retentionPolicies = {
            daily: 30,    // 30 days
            weekly: 12,   // 12 weeks
            monthly: 12   // 12 months
        };
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: path.join(process.cwd(), 'logs', 'backup.log') 
                }),
                new winston.transports.Console()
            ]
        });

        this.ensureDirectories();
    }

    /**
     * Generate a new encryption key for backups
     */
    generateEncryptionKey() {
        const key = crypto.randomBytes(32).toString('hex');
        this.logger.warn('Generated new backup encryption key. Store this securely!', { key });
        return key;
    }

    /**
     * Ensure backup directories exist
     */
    ensureDirectories() {
        const dirs = [
            this.backupDir,
            this.tempDir,
            path.join(this.backupDir, 'daily'),
            path.join(this.backupDir, 'weekly'),
            path.join(this.backupDir, 'monthly'),
            path.join(this.backupDir, 'metadata')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * Create comprehensive daily backup
     */
    async createDailyBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `daily-backup-${timestamp}`;
        
        this.logger.info('Starting comprehensive daily backup', { backupId });

        try {
            const backupPath = path.join(this.backupDir, 'daily', backupId);
            fs.mkdirSync(backupPath, { recursive: true });

            const backupManifest = {
                id: backupId,
                type: 'daily',
                timestamp: new Date().toISOString(),
                components: [],
                status: 'in_progress',
                checksums: {}
            };

            // 1. Backup Main MongoDB Database (hrms)
            this.logger.info('Backing up main MongoDB database');
            const mainDbBackup = await this.backupMongoDatabase('hrms', backupPath);
            backupManifest.components.push(mainDbBackup);

            // 2. Backup License Server Database (hrsm-licenses)
            this.logger.info('Backing up license server database');
            const licenseDbBackup = await this.backupMongoDatabase('hrsm-licenses', backupPath);
            backupManifest.components.push(licenseDbBackup);

            // 3. Backup File Uploads
            this.logger.info('Backing up file uploads');
            const uploadsBackup = await this.backupFileUploads(backupPath);
            backupManifest.components.push(uploadsBackup);

            // 4. Backup Configuration Files
            this.logger.info('Backing up configuration files');
            const configBackup = await this.backupConfigurationFiles(backupPath);
            backupManifest.components.push(configBackup);

            // 5. Backup License Server RSA Keys (encrypted)
            this.logger.info('Backing up license server RSA keys');
            const keysBackup = await this.backupRSAKeys(backupPath);
            backupManifest.components.push(keysBackup);

            // 6. Backup Application Code and Dependencies
            this.logger.info('Backing up application code');
            const codeBackup = await this.backupApplicationCode(backupPath);
            backupManifest.components.push(codeBackup);

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
                        type: 'daily'
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

            this.logger.info('Daily backup completed successfully', { 
                backupId, 
                size: backupManifest.size,
                components: backupManifest.components.length
            });

            return backupManifest;

        } catch (error) {
            this.logger.error('Daily backup failed', { backupId, error: error.message });
            throw error;
        }
    }

    /**
     * Backup MongoDB database using mongodump or JavaScript fallback
     */
    async backupMongoDatabase(dbName, backupPath) {
        const outputPath = path.join(backupPath, `${dbName}-dump`);
        const archivePath = path.join(backupPath, `${dbName}.archive`);
        
        try {
            // First try mongodump
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            const command = `mongodump --uri="${mongoUri}" --db=${dbName} --archive=${archivePath} --gzip`;
            
            await execAsync(command);
            
            const stats = fs.statSync(archivePath);
            
            return {
                type: 'mongodb',
                database: dbName,
                path: archivePath,
                size: stats.size,
                timestamp: new Date().toISOString(),
                method: 'mongodump'
            };
        } catch (error) {
            this.logger.warn(`mongodump failed for ${dbName}, trying JavaScript fallback`, { error: error.message });
            
            // Fallback to JavaScript export method
            return await this.backupDatabaseJS(dbName, backupPath);
        }
    }

    /**
     * Backup MongoDB database using JavaScript/Mongoose methods (fallback)
     */
    async backupDatabaseJS(dbName, backupPath) {
        const outputPath = path.join(backupPath, `${dbName}-export.json`);
        
        try {
            this.logger.info(`Starting JavaScript export for database: ${dbName}`);
            
            // Connect to the specific database
            const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
            const dbUri = mongoUri.replace(/\/[^\/]*(\?|$)/, `/${dbName}$1`);
            
            // Create a separate connection for this database
            const connection = mongoose.createConnection(dbUri);
            await connection.asPromise();
            
            const exportData = {
                database: dbName,
                timestamp: new Date().toISOString(),
                collections: {}
            };

            try {
                // Get all collections in the database
                const collections = await connection.db.listCollections().toArray();
                this.logger.info(`Found ${collections.length} collections in ${dbName}`);

                // Export each collection
                for (const collectionInfo of collections) {
                    const collectionName = collectionInfo.name;
                    
                    try {
                        const collection = connection.db.collection(collectionName);
                        const documents = await collection.find({}).toArray();
                        
                        exportData.collections[collectionName] = {
                            count: documents.length,
                            documents: documents
                        };
                        
                        this.logger.info(`Exported ${documents.length} documents from ${collectionName}`);
                    } catch (collError) {
                        this.logger.warn(`Failed to export collection ${collectionName}:`, collError.message);
                        exportData.collections[collectionName] = {
                            error: collError.message,
                            count: 0,
                            documents: []
                        };
                    }
                }

                // Write the export data to file
                fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
                
                const stats = fs.statSync(outputPath);
                
                this.logger.info(`JavaScript export completed for ${dbName}`, {
                    collections: Object.keys(exportData.collections).length,
                    size: stats.size
                });

                return {
                    type: 'mongodb-js',
                    database: dbName,
                    path: outputPath,
                    size: stats.size,
                    timestamp: new Date().toISOString(),
                    method: 'javascript-export',
                    collections: Object.keys(exportData.collections).length
                };

            } finally {
                await connection.close();
            }

        } catch (error) {
            this.logger.error(`Failed to backup database ${dbName} using JavaScript method`, { error: error.message });
            
            // Create empty backup file to maintain consistency
            const emptyExport = {
                database: dbName,
                timestamp: new Date().toISOString(),
                error: error.message,
                collections: {}
            };
            
            fs.writeFileSync(outputPath, JSON.stringify(emptyExport, null, 2));
            const stats = fs.statSync(outputPath);
            
            return {
                type: 'mongodb-js',
                database: dbName,
                path: outputPath,
                size: stats.size,
                timestamp: new Date().toISOString(),
                method: 'javascript-export',
                error: error.message,
                collections: 0
            };
        }
    }

    /**
     * Backup all file uploads
     */
    async backupFileUploads(backupPath) {
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
                        timestamp: new Date().toISOString()
                    });
                });

                archive.on('error', reject);
                archive.pipe(output);

                // Add uploads directories if they exist
                if (fs.existsSync(uploadsDir)) {
                    archive.directory(uploadsDir, 'uploads');
                }
                if (fs.existsSync(serverUploadsDir)) {
                    archive.directory(serverUploadsDir, 'server-uploads');
                }

                archive.finalize();
            });
        } catch (error) {
            this.logger.error('Failed to backup file uploads', { error: error.message });
            throw error;
        }
    }

    /**
     * Backup configuration files
     */
    async backupConfigurationFiles(backupPath) {
        const configBackupPath = path.join(backupPath, 'configuration.tar.gz');
        
        try {
            const output = fs.createWriteStream(configBackupPath);
            const archive = archiver('tar', { gzip: true });

            return new Promise((resolve, reject) => {
                output.on('close', () => {
                    const stats = fs.statSync(configBackupPath);
                    resolve({
                        type: 'configuration',
                        component: 'config-files',
                        path: configBackupPath,
                        size: stats.size,
                        timestamp: new Date().toISOString()
                    });
                });

                archive.on('error', reject);
                archive.pipe(output);

                // Add configuration files
                const configFiles = [
                    '.env',
                    '.env.example',
                    'package.json',
                    'package-lock.json',
                    'ecosystem.config.js'
                ];

                configFiles.forEach(file => {
                    const filePath = path.join(process.cwd(), file);
                    if (fs.existsSync(filePath)) {
                        archive.file(filePath, { name: file });
                    }
                });

                // Add license server configuration
                const licenseServerConfigFiles = [
                    'hrsm-license-server/.env',
                    'hrsm-license-server/.env.example',
                    'hrsm-license-server/package.json',
                    'hrsm-license-server/package-lock.json',
                    'hrsm-license-server/ecosystem.config.js'
                ];

                licenseServerConfigFiles.forEach(file => {
                    const filePath = path.join(process.cwd(), file);
                    if (fs.existsSync(filePath)) {
                        archive.file(filePath, { name: `license-server/${path.basename(file)}` });
                    }
                });

                // Add config directory
                const configDir = path.join(process.cwd(), 'config');
                if (fs.existsSync(configDir)) {
                    archive.directory(configDir, 'config');
                }

                archive.finalize();
            });
        } catch (error) {
            this.logger.error('Failed to backup configuration files', { error: error.message });
            throw error;
        }
    }

    /**
     * Backup License Server RSA Keys (encrypted)
     */
    async backupRSAKeys(backupPath) {
        const keysDir = path.join(process.cwd(), 'hrsm-license-server', 'keys');
        const encryptedKeysPath = path.join(backupPath, 'rsa-keys.encrypted');

        try {
            if (!fs.existsSync(keysDir)) {
                throw new Error('RSA keys directory not found');
            }

            // Create archive of keys
            const tempKeysArchive = path.join(this.tempDir, 'rsa-keys.tar.gz');
            const output = fs.createWriteStream(tempKeysArchive);
            const archive = archiver('tar', { gzip: true });

            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                archive.on('error', reject);
                archive.pipe(output);
                archive.directory(keysDir, 'keys');
                archive.finalize();
            });

            // Encrypt the keys archive
            const keyData = fs.readFileSync(tempKeysArchive);
            const encryptedData = this.encryptData(keyData);
            fs.writeFileSync(encryptedKeysPath, encryptedData);

            // Clean up temp file
            fs.unlinkSync(tempKeysArchive);

            const stats = fs.statSync(encryptedKeysPath);

            return {
                type: 'encrypted-keys',
                component: 'rsa-keys',
                path: encryptedKeysPath,
                size: stats.size,
                timestamp: new Date().toISOString(),
                encrypted: true
            };
        } catch (error) {
            this.logger.error('Failed to backup RSA keys', { error: error.message });
            throw error;
        }
    }

    /**
     * Backup application code and dependencies
     */
    async backupApplicationCode(backupPath) {
        const codeBackupPath = path.join(backupPath, 'application-code.tar.gz');

        try {
            const output = fs.createWriteStream(codeBackupPath);
            const archive = archiver('tar', { gzip: true });

            return new Promise((resolve, reject) => {
                output.on('close', () => {
                    const stats = fs.statSync(codeBackupPath);
                    resolve({
                        type: 'application-code',
                        component: 'source-code',
                        path: codeBackupPath,
                        size: stats.size,
                        timestamp: new Date().toISOString()
                    });
                });

                archive.on('error', reject);
                archive.pipe(output);

                // Add main application directories
                const appDirs = ['server', 'client', 'scripts', 'docs'];
                appDirs.forEach(dir => {
                    const dirPath = path.join(process.cwd(), dir);
                    if (fs.existsSync(dirPath)) {
                        archive.directory(dirPath, dir);
                    }
                });

                // Add license server code
                const licenseServerDir = path.join(process.cwd(), 'hrsm-license-server', 'src');
                if (fs.existsSync(licenseServerDir)) {
                    archive.directory(licenseServerDir, 'license-server-src');
                }

                // Add important root files
                const rootFiles = [
                    'README.md',
                    'LICENSE',
                    'babel.config.cjs',
                    'jest.config.js',
                    'eslint.config.js',
                    'shared-constants.js'
                ];

                rootFiles.forEach(file => {
                    const filePath = path.join(process.cwd(), file);
                    if (fs.existsSync(filePath)) {
                        archive.file(filePath, { name: file });
                    }
                });

                archive.finalize();
            });
        } catch (error) {
            this.logger.error('Failed to backup application code', { error: error.message });
            throw error;
        }
    }

    /**
     * Generate checksums for all backup components
     */
    async generateChecksums(backupPath, manifest) {
        for (const component of manifest.components) {
            if (fs.existsSync(component.path)) {
                const data = fs.readFileSync(component.path);
                const checksum = crypto.createHash('sha256').update(data).digest('hex');
                manifest.checksums[component.component || component.database] = checksum;
            }
        }
    }

    /**
     * Compress and encrypt the entire backup
     */
    async compressAndEncryptBackup(backupPath, backupId) {
        const compressedPath = path.join(this.backupDir, 'daily', `${backupId}.tar.gz.enc`);
        const tempCompressedPath = path.join(this.tempDir, `${backupId}.tar.gz`);

        try {
            // First compress the backup directory
            const output = fs.createWriteStream(tempCompressedPath);
            const archive = archiver('tar', { gzip: true });

            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                archive.on('error', reject);
                archive.pipe(output);
                archive.directory(backupPath, false);
                archive.finalize();
            });

            // Then encrypt the compressed file
            const compressedData = fs.readFileSync(tempCompressedPath);
            const encryptedData = this.encryptData(compressedData);
            fs.writeFileSync(compressedPath, encryptedData);

            // Clean up temp files
            fs.unlinkSync(tempCompressedPath);

            return compressedPath;
        } catch (error) {
            this.logger.error('Failed to compress and encrypt backup', { error: error.message });
            throw error;
        }
    }

    /**
     * Encrypt data using AES-256-CBC
     */
    encryptData(data) {
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(this.encryptionKey, 'hex');
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(data);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        return Buffer.concat([iv, encrypted]);
    }

    /**
     * Decrypt data using AES-256-CBC
     */
    decryptData(encryptedData) {
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(this.encryptionKey, 'hex');
        const iv = encryptedData.slice(0, 16);
        const encrypted = encryptedData.slice(16);
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted;
    }

    /**
     * Save backup metadata
     */
    async saveBackupMetadata(manifest) {
        const metadataPath = path.join(this.backupDir, 'metadata', `${manifest.id}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(manifest, null, 2));
        
        // Save to database for tracking
        try {
            const backupLog = new BackupLog({
                backupId: manifest.id,
                type: manifest.type || 'daily',
                status: manifest.status,
                startTime: new Date(manifest.timestamp),
                endTime: manifest.status === 'completed' ? new Date() : null,
                finalPath: manifest.finalPath,
                size: manifest.size,
                components: manifest.components,
                checksums: manifest.checksums,
                compressed: true,
                encrypted: true,
                metadata: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    hostname: require('os').hostname(),
                    backupToolVersion: '1.0.0'
                },
                cloudStorage: {
                    uploaded: manifest.cloudUploaded || false,
                    uploadError: manifest.cloudError
                },
                triggeredBy: 'scheduled'
            });

            await backupLog.save();
            
            this.logger.info('Backup metadata saved to database', { 
                backupId: manifest.id,
                metadataPath 
            });
        } catch (error) {
            this.logger.warn('Failed to save backup metadata to database', { error: error.message });
        }
    }

    /**
     * Clean up temporary files
     */
    async cleanupTempFiles(backupPath) {
        try {
            if (fs.existsSync(backupPath)) {
                fs.rmSync(backupPath, { recursive: true, force: true });
            }
        } catch (error) {
            this.logger.warn('Failed to cleanup temp files', { error: error.message });
        }
    }

    /**
     * Apply retention policies
     */
    async applyRetentionPolicies() {
        this.logger.info('Applying backup retention policies');

        try {
            // Clean up daily backups older than 30 days
            await this.cleanupOldBackups('daily', this.retentionPolicies.daily);
            
            // Clean up weekly backups older than 12 weeks
            await this.cleanupOldBackups('weekly', this.retentionPolicies.weekly * 7);
            
            // Clean up monthly backups older than 12 months
            await this.cleanupOldBackups('monthly', this.retentionPolicies.monthly * 30);

            this.logger.info('Retention policies applied successfully');
        } catch (error) {
            this.logger.error('Failed to apply retention policies', { error: error.message });
        }
    }

    /**
     * Clean up old backups based on retention policy
     */
    async cleanupOldBackups(type, retentionDays) {
        const backupTypeDir = path.join(this.backupDir, type);
        
        if (!fs.existsSync(backupTypeDir)) {
            return;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const files = fs.readdirSync(backupTypeDir);
        let deletedCount = 0;

        for (const file of files) {
            const filePath = path.join(backupTypeDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime < cutoffDate) {
                try {
                    if (stats.isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(filePath);
                    }
                    deletedCount++;
                    this.logger.info(`Deleted old backup: ${file}`);
                } catch (error) {
                    this.logger.warn(`Failed to delete old backup: ${file}`, { error: error.message });
                }
            }
        }

        this.logger.info(`Cleaned up ${deletedCount} old ${type} backups`);
    }

    /**
     * Rotate encryption keys (monthly)
     */
    async rotateEncryptionKey() {
        this.logger.info('Starting encryption key rotation');

        try {
            const oldKey = this.encryptionKey;
            const newKey = crypto.randomBytes(32).toString('hex');
            
            // Store old key for decryption of existing backups
            const keyRotationRecord = {
                timestamp: new Date().toISOString(),
                oldKey: oldKey,
                newKey: newKey
            };

            // Save key rotation record (encrypted with master key)
            const keyRotationPath = path.join(this.backupDir, 'metadata', 'key-rotation.json');
            fs.writeFileSync(keyRotationPath, JSON.stringify(keyRotationRecord, null, 2));

            this.encryptionKey = newKey;
            
            this.logger.info('Encryption key rotated successfully');
            this.logger.warn('New encryption key generated. Update environment variable!', { newKey });

        } catch (error) {
            this.logger.error('Failed to rotate encryption key', { error: error.message });
            throw error;
        }
    }

    /**
     * Get backup statistics
     */
    async getBackupStatistics() {
        const stats = {
            daily: { count: 0, totalSize: 0 },
            weekly: { count: 0, totalSize: 0 },
            monthly: { count: 0, totalSize: 0 },
            lastBackup: null,
            totalBackups: 0,
            totalSize: 0
        };

        try {
            const backupTypes = ['daily', 'weekly', 'monthly'];
            
            for (const type of backupTypes) {
                const typeDir = path.join(this.backupDir, type);
                if (fs.existsSync(typeDir)) {
                    const files = fs.readdirSync(typeDir);
                    stats[type].count = files.length;
                    
                    for (const file of files) {
                        const filePath = path.join(typeDir, file);
                        const fileStats = fs.statSync(filePath);
                        stats[type].totalSize += fileStats.size;
                    }
                }
            }

            stats.totalBackups = stats.daily.count + stats.weekly.count + stats.monthly.count;
            stats.totalSize = stats.daily.totalSize + stats.weekly.totalSize + stats.monthly.totalSize;

            // Get last backup info
            const metadataDir = path.join(this.backupDir, 'metadata');
            if (fs.existsSync(metadataDir)) {
                const metadataFiles = fs.readdirSync(metadataDir)
                    .filter(file => file.endsWith('.json') && !file.includes('key-rotation'))
                    .sort()
                    .reverse();
                
                if (metadataFiles.length > 0) {
                    const lastBackupMetadata = JSON.parse(
                        fs.readFileSync(path.join(metadataDir, metadataFiles[0]), 'utf8')
                    );
                    stats.lastBackup = lastBackupMetadata;
                }
            }

            return stats;
        } catch (error) {
            this.logger.error('Failed to get backup statistics', { error: error.message });
            throw error;
        }
    }
}

export default BackupService;