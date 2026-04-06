import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';
import winston from 'winston';
import { mainAppDb, licenseServerDb } from '../config/database.js';

const execAsync = promisify(exec);

/**
 * Alternative Backup Service (PostgreSQL)
 * 
 * This service provides database backup functionality using PostgreSQL's
 * native pg_dump utility with custom format for flexibility.
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
     * Create comprehensive daily backup using pg_dump custom format
     */
    async createDailyBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `daily-backup-${timestamp}`;
        
        this.logger.info('Starting comprehensive daily backup (pg_dump custom format)', { backupId });

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
                method: 'pg_dump-custom'
            };

            // 1. Backup Main PostgreSQL Database using custom format
            this.logger.info('Backing up main PostgreSQL database (custom format)');
            const mainDbBackup = await this.backupDatabaseCustomFormat('main', backupPath);
            backupManifest.components.push(mainDbBackup);

            // 2. Backup License Server Database using custom format
            this.logger.info('Backing up license server database (custom format)');
            const licenseDbBackup = await this.backupDatabaseCustomFormat('license', backupPath);
            backupManifest.components.push(licenseDbBackup);

            // 3. Backup File Uploads
            this.logger.info('Backing up file uploads');
            const uploadsBackup = await this.backupFileUploads(backupPath);
            backupManifest.components.push(uploadsBackup);

            // 4. Create compressed archive
            this.logger.info('Creating compressed archive');
            const archivePath = await this.createArchive(backupPath, backupId);
            backupManifest.archivePath = archivePath;
            backupManifest.archiveSize = fs.statSync(archivePath).size;

            // 5. Calculate checksums
            this.logger.info('Calculating checksums');
            backupManifest.checksums.archive = await this.calculateChecksum(archivePath);

            // 6. Save backup metadata
            backupManifest.status = 'completed';
            backupManifest.completedAt = new Date().toISOString();
            await this.saveBackupMetadata(backupManifest);

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
            throw error;
        }
    }

    /**
     * Backup PostgreSQL database using pg_dump custom format (-Fc)
     * Custom format allows selective restore and is compressed
     */
    async backupDatabaseCustomFormat(dbType, backupPath) {
        const startTime = Date.now();
        const dbConfig = dbType === 'main' ? 
            this.parseConnectionString(process.env.MAIN_DATABASE_URL) :
            this.parseConnectionString(process.env.LICENSE_DATABASE_URL);

        const backupFile = path.join(backupPath, `${dbType}-database.dump`);
        
        // Build pg_dump command with custom format
        const pgDumpCmd = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F c -f "${backupFile}"`;

        try {
            await execAsync(pgDumpCmd);
            
            const stats = fs.statSync(backupFile);
            const duration = Date.now() - startTime;

            this.logger.info(`${dbType} database backup completed (custom format)`, {
                size: stats.size,
                duration: `${duration}ms`
            });

            return {
                name: `${dbType}-database`,
                type: 'postgresql-custom',
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
     * Backup specific tables from PostgreSQL database
     */
    async backupSpecificTables(dbType, tables, backupPath) {
        const startTime = Date.now();
        const dbConfig = dbType === 'main' ? 
            this.parseConnectionString(process.env.MAIN_DATABASE_URL) :
            this.parseConnectionString(process.env.LICENSE_DATABASE_URL);

        const backupFile = path.join(backupPath, `${dbType}-tables.dump`);
        
        // Build table list for pg_dump
        const tableArgs = tables.map(t => `-t ${t}`).join(' ');
        
        // Build pg_dump command with specific tables
        const pgDumpCmd = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} ${tableArgs} -F c -f "${backupFile}"`;

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
                type: 'postgresql-tables',
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
     * Restore database from custom format backup
     */
    async restoreDatabase(backupFile, dbType = 'main') {
        const dbConfig = dbType === 'main' ? 
            this.parseConnectionString(process.env.MAIN_DATABASE_URL) :
            this.parseConnectionString(process.env.LICENSE_DATABASE_URL);

        this.logger.info(`Restoring ${dbType} database from backup`, { backupFile });

        try {
            // Build pg_restore command for custom format
            const restoreCmd = `PGPASSWORD="${dbConfig.password}" pg_restore -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -c "${backupFile}"`;

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

    /**
     * Restore specific tables from backup
     */
    async restoreSpecificTables(backupFile, tables, dbType = 'main') {
        const dbConfig = dbType === 'main' ? 
            this.parseConnectionString(process.env.MAIN_DATABASE_URL) :
            this.parseConnectionString(process.env.LICENSE_DATABASE_URL);

        this.logger.info(`Restoring specific tables from backup`, { backupFile, tables });

        try {
            // Build table list for pg_restore
            const tableArgs = tables.map(t => `-t ${t}`).join(' ');
            
            // Build pg_restore command with specific tables
            const restoreCmd = `PGPASSWORD="${dbConfig.password}" pg_restore -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} ${tableArgs} "${backupFile}"`;

            await execAsync(restoreCmd);

            this.logger.info(`Tables restored successfully`, { tables });

            return {
                success: true,
                database: dbType,
                tables,
                backupFile
            };

        } catch (error) {
            this.logger.error(`Tables restore failed`, { error: error.message });
            throw new Error(`Failed to restore tables: ${error.message}`);
        }
    }
}

export default AlternativeBackupService;
