import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import mongoose from 'mongoose';
import winston from 'winston';

/**
 * Alternative Backup Service
 * 
 * This service provides database backup functionality without requiring mongodump.
 * It uses MongoDB's native JavaScript methods to export data.
 */
class AlternativeBackupService {
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
     * Create comprehensive daily backup using JavaScript methods
     */
    async createDailyBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `daily-backup-${timestamp}`;
        
        this.logger.info('Starting comprehensive daily backup (JavaScript method)', { backupId });

        try {
            const backupPath = path.join(this.backupDir, 'daily', backupId);
            fs.mkdirSync(backupPath, { recursive: true });

            const backupManifest = {
                id: backupId,
                type: 'daily',
                timestamp: new Date().toISOString(),
                components: [],
                status: 'in_progress',
                checksums: {},
                method: 'javascript-export'
            };

            // 1. Backup Main MongoDB Database (hrms) using JavaScript
            this.logger.info('Backing up main MongoDB database (JavaScript method)');
            const mainDbBackup = await this.backupDatabaseJS('hrms', backupPath);
            backupManifest.components.push(mainDbBackup);

            // 2. Backup License Server Database (hrsm-licenses) using JavaScript
            this.logger.info('Backing up license server database (JavaScript method)');
            const licenseDbBackup = await this.backupDatabaseJS('hrsm-licenses', backupPath);
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
            if (keysBackup) {
                backupManifest.components.push(keysBackup);
            }

            // 6. Generate checksums for all components
            this.logger.info('Generating checksums');
            await this.generateChecksums(backupPath, backupManifest);

            // 7. Compress and encrypt the entire backup
            this.logger.info('Compressing and encrypting backup');
            const finalBackupPath = await this.compressAndEncryptBackup(backupPath, backupId);

            backupManifest.status = 'completed';
            backupManifest.finalPath = finalBackupPath;
            backupManifest.size = fs.statSync(finalBackupPath).size;

            // Save backup metadata
            await this.saveBackupMetadata(backupManifest);

            // Clean up temporary files
            await this.cleanupTempFiles(backupPath);

            this.logger.info('Daily backup completed successfully (JavaScript method)', { 
                backupId, 
                size: backupManifest.size,
                components: backupManifest.components.length
            });

            return backupManifest;

        } catch (error) {
            this.logger.error('Daily backup failed (JavaScript method)', { backupId, error: error.message });
            throw error;
        }
    }

    /**
     * Backup MongoDB database using JavaScript/Mongoose methods
     */
    async backupDatabaseJS(dbName, backupPath) {
        const outputPath = path.join(backupPath, `${dbName}-export.json`);
        
        try {
            this.logger.info(`Starting JavaScript export for database: ${dbName}`);
            
            // Connect to the specific database
            const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
            const dbUri = mongoUri.replace(/\/[^\/]*(\?|$)/, `/${dbName}$1`);
            
            // Create a separate connection for this database
            const connection = await mongoose.createConnection(dbUri);
            
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
                this.logger.warn('RSA keys directory not found, skipping key backup');
                return null;
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
            return null;
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
        
        const cipher = crypto.createCipher(algorithm, key);
        let encrypted = cipher.update(data);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        return Buffer.concat([iv, encrypted]);
    }

    /**
     * Save backup metadata
     */
    async saveBackupMetadata(manifest) {
        const metadataPath = path.join(this.backupDir, 'metadata', `${manifest.id}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(manifest, null, 2));
        
        this.logger.info('Backup metadata saved', { 
            backupId: manifest.id,
            metadataPath 
        });
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
     * Test the backup functionality
     */
    async testBackup() {
        this.logger.info('Testing alternative backup functionality');
        
        try {
            const result = await this.createDailyBackup();
            this.logger.info('Backup test completed successfully', {
                backupId: result.id,
                size: result.size,
                components: result.components.length
            });
            return result;
        } catch (error) {
            this.logger.error('Backup test failed', { error: error.message });
            throw error;
        }
    }
}

export default AlternativeBackupService;