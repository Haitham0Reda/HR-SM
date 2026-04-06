import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';
import winston from 'winston';
import CloudStorageService from './cloudStorageService.js';
import BackupLog from '../modules/system/models/backupLog.model.js';
import { mainAppDb, licenseServerDb } from '../config/database.js';

const execAsync = promisify(exec);

/**
 * Comprehensive Backup Service for HR-SM Enterprise (PostgreSQL)
 * Handles automated daily backups of ALL system components:
 * - Main PostgreSQL database (main app)
 * - License server PostgreSQL database
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
                checksums: {},
                method: 'pg_dump'
            };

            // 1. Backup Main PostgreSQL Database
            this.logger.info('Backing up main PostgreSQL database');
            const mainDbBackup = await this.backupPostgreSQLDatabase('main', backupPath);
            backupManifest.components.push(mainDbBackup);

            // 2. Backup License Server PostgreSQL Database
            this.logger.info('Backing up license server PostgreSQL database');
            const licenseDbBackup = await this.backupPostgreSQLDatabase('license', backupPath);
            backupManifest.components.push(licenseDbBackup);

            // 3. Backup File Uploads
            this.logger.info('Backing up file uploads');
            const uploadsBackup = await this.backupFileUploads(backupPath);
            backupManifest.components.push(uploadsBackup);

            // 4. Backup Configuration Files
            this.logger.info('Backing up configuration files');
            const configBackup = await this.backupConfigFiles(backupPath);
            backupManifest.components.push(configBackup);

            // 5. Backup License Server Keys (encrypted)
            this.logger.info('Backing up license server keys');
            const keysBackup = await this.backupLicenseKeys(backupPath);
            backupManifest.components.push(keysBackup);

            // 6. Create compressed archive
            this.logger.info('Creating compressed archive');
            const archivePath = await this.createArchive(backupPath, backupId);
            backupManifest.archivePath = archivePath;
            backupManifest.archiveSize = fs.statSync(archivePath).size;

            // 7. Calculate checksums
            this.logger.info('Calculating checksums');
            backupManifest.checksums.archive = await this.calculateChecksum(archivePath);

            // 8. Upload to cloud storage (if configured)
            if (process.env.CLOUD_BACKUP_ENABLED === 'true') {
                this.logger.info('Uploading to cloud storage');
                const cloudUpload = await this.cloudStorage.uploadBackup(archivePath, backupId);
                backupManifest.cloudStorage = cloudUpload;
            }

            // 9. Save backup metadata
            backupManifest.status = 'completed';
            backupManifest.completedAt = new Date().toISOString();
            await this.saveBackupMetadata(backupManifest);

            // 10. Log backup to database
            await this.logBackup(backupManifest);

            // 11. Clean up old backups
            await this.cleanupOldBackups('daily');

            this.logger.info('Daily backup completed successfully', { 
                backupId,
                archiveSize: backupManifest.archiveSize,
                components: backupManifest.components.length
            });

            return backupManifest;

        } catch (error) {
            this.logger.error('Daily backup failed', { 
                backupId, 
                error: error.message,
                stack: error.stack
            });
            
            // Log failed backup
            await this.logBackup({
                id: backupId,
                type: 'daily',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * Backup PostgreSQL database using pg_dump
     */
    async backupPostgreSQLDatabase(dbType, backupPath) {
        const startTime = Date.now();
        const dbConfig = dbType === 'main' ? 
            this.parseConnectionString(process.env.MAIN_DATABASE_URL) :
            this.parseConnectionString(process.env.LICENSE_DATABASE_URL);

        const backupFile = path.join(backupPath, `${dbType}-database.sql`);
        
        // Build pg_dump command
        const pgDumpCmd = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f "${backupFile}"`;

        try {
            await execAsync(pgDumpCmd);
            
            const stats = fs.statSync(backupFile);
            const duration = Date.now() - startTime;

            this.logger.info(`${dbType} database backup completed`, {
                size: stats.size,
                duration: `${duration}ms`
            });

            return {
                name: `${dbType}-database`,
                type: 'postgresql',
                path: backupFile,
                size: stats.size,
                duration,
                checksum: await this.calculateChecksum(backupFile)
            };

        } catch (error) {
            this.logger.error(`${dbType} database backup failed`, { error: error.message });
            throw new Error(`Failed to backup ${dbType} database: ${error.message}`);
        }
    }

    /**
     * Parse PostgreSQL connection string
     */
    parseConnectionString(connectionString) {
        const url = new URL(connectionString);
        return {
            host: url.hostname,
            port: url.port || 5432,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1)
        };
    }

    /**
     * Backup file uploads directory
     */
    async backupFileUploads(backupPath) {
        const startTime = Date.now();
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const backupFile = path.join(backupPath, 'uploads.tar.gz');

        if (!fs.existsSync(uploadsDir)) {
            this.logger.warn('Uploads directory does not exist, skipping');
            return {
                name: 'uploads',
                type: 'files',
                skipped: true,
                reason: 'Directory does not exist'
            };
        }

        try {
            await execAsync(`tar -czf "${backupFile}" -C "${uploadsDir}" .`);
            
            const stats = fs.statSync(backupFile);
            const duration = Date.now() - startTime;

            return {
                name: 'uploads',
                type: 'files',
                path: backupFile,
                size: stats.size,
                duration,
                checksum: await this.calculateChecksum(backupFile)
            };

        } catch (error) {
            this.logger.error('Uploads backup failed', { error: error.message });
            throw new Error(`Failed to backup uploads: ${error.message}`);
        }
    }

    /**
     * Backup configuration files
     */
    async backupConfigFiles(backupPath) {
        const startTime = Date.now();
        const configFiles = [
            '.env',
            '.env.production',
            'package.json',
            'package-lock.json'
        ];

        const configBackupDir = path.join(backupPath, 'config');
        fs.mkdirSync(configBackupDir, { recursive: true });

        let totalSize = 0;
        const backedUpFiles = [];

        for (const file of configFiles) {
            const sourcePath = path.join(process.cwd(), file);
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(configBackupDir, file);
                fs.copyFileSync(sourcePath, destPath);
                const stats = fs.statSync(destPath);
                totalSize += stats.size;
                backedUpFiles.push(file);
            }
        }

        const duration = Date.now() - startTime;

        return {
            name: 'config',
            type: 'files',
            path: configBackupDir,
            size: totalSize,
            duration,
            files: backedUpFiles
        };
    }

    /**
     * Backup license server RSA keys (encrypted)
     */
    async backupLicenseKeys(backupPath) {
        const startTime = Date.now();
        const keysDir = path.join(process.cwd(), 'hrsm-license-server', 'keys');
        const backupFile = path.join(backupPath, 'license-keys.enc');

        if (!fs.existsSync(keysDir)) {
            this.logger.warn('License keys directory does not exist, skipping');
            return {
                name: 'license-keys',
                type: 'encrypted',
                skipped: true,
                reason: 'Directory does not exist'
            };
        }

        try {
            // Create tar of keys directory
            const tempTar = path.join(this.tempDir, `keys-${Date.now()}.tar`);
            await execAsync(`tar -cf "${tempTar}" -C "${keysDir}" .`);

            // Encrypt the tar file
            const keyBuffer = Buffer.from(this.encryptionKey, 'hex');
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);

            const input = fs.createReadStream(tempTar);
            const output = fs.createWriteStream(backupFile);

            // Write IV to the beginning of the file
            output.write(iv);

            await new Promise((resolve, reject) => {
                input.pipe(cipher).pipe(output)
                    .on('finish', resolve)
                    .on('error', reject);
            });

            // Clean up temp file
            fs.unlinkSync(tempTar);

            const stats = fs.statSync(backupFile);
            const duration = Date.now() - startTime;

            return {
                name: 'license-keys',
                type: 'encrypted',
                path: backupFile,
                size: stats.size,
                duration,
                encrypted: true,
                checksum: await this.calculateChecksum(backupFile)
            };

        } catch (error) {
            this.logger.error('License keys backup failed', { error: error.message });
            throw new Error(`Failed to backup license keys: ${error.message}`);
        }
    }

    /**
     * Create compressed archive of backup
     */
    async createArchive(backupPath, backupId) {
        const archivePath = path.join(this.backupDir, 'daily', `${backupId}.tar.gz`);
        
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(archivePath);
            const archive = archiver('tar', {
                gzip: true,
                gzipOptions: { level: 9 }
            });

            output.on('close', () => {
                this.logger.info('Archive created', { 
                    size: archive.pointer(),
                    path: archivePath
                });
                resolve(archivePath);
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            archive.directory(backupPath, false);
            archive.finalize();
        });
    }

    /**
     * Calculate SHA-256 checksum of a file
     */
    async calculateChecksum(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * Save backup metadata to file
     */
    async saveBackupMetadata(manifest) {
        const metadataPath = path.join(this.backupDir, 'metadata', `${manifest.id}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(manifest, null, 2));
    }

    /**
     * Log backup to database
     */
    async logBackup(manifest) {
        try {
            await BackupLog.create({
                tenant_id: 'system',
                backup_id: manifest.id,
                type: manifest.type,
                status: manifest.status,
                started_at: manifest.timestamp,
                completed_at: manifest.completedAt,
                size: manifest.archiveSize,
                components: manifest.components,
                checksums: manifest.checksums,
                metadata: {
                    method: manifest.method,
                    cloudStorage: manifest.cloudStorage,
                    error: manifest.error
                }
            });
        } catch (error) {
            this.logger.error('Failed to log backup to database', { error: error.message });
        }
    }

    /**
     * Clean up old backups based on retention policy
     */
    async cleanupOldBackups(type) {
        const retentionDays = this.retentionPolicies[type];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const backupTypeDir = path.join(this.backupDir, type);
        
        if (!fs.existsSync(backupTypeDir)) {
            return;
        }

        const files = fs.readdirSync(backupTypeDir);
        
        for (const file of files) {
            const filePath = path.join(backupTypeDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime < cutoffDate) {
                this.logger.info('Removing old backup', { file, age: stats.mtime });
                
                if (stats.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(filePath);
                }
            }
        }
    }

    /**
     * Restore database from backup
     */
    async restoreDatabase(backupFile, dbType = 'main') {
        const dbConfig = dbType === 'main' ? 
            this.parseConnectionString(process.env.MAIN_DATABASE_URL) :
            this.parseConnectionString(process.env.LICENSE_DATABASE_URL);

        this.logger.info(`Restoring ${dbType} database from backup`, { backupFile });

        try {
            // Build psql restore command
            const restoreCmd = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${backupFile}"`;

            await execAsync(restoreCmd);

            this.logger.info(`${dbType} database restored successfully`);

            return {
                success: true,
                database: dbType,
                backupFile
            };

        } catch (error) {
            this.logger.error(`${dbType} database restore failed`, { error: error.message });
            throw new Error(`Failed to restore ${dbType} database: ${error.message}`);
        }
    }
}

export default BackupService;
