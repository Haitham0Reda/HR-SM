/**
 * PostgreSQL Backup Service
 * Handles database backups using pg_dump for PostgreSQL
 * Supports both license server and main application databases
 */
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class PostgresBackupService {
    constructor() {
        this.licenseDbUrl = process.env.LICENSE_DATABASE_URL;
        this.mainDbUrl = process.env.MAIN_DATABASE_URL;
    }

    /**
     * Perform database backup using pg_dump
     * @param {Object} backup - Backup configuration
     * @param {string} backupDir - Directory to store backup
     * @param {string} timestamp - Timestamp for backup file
     * @param {Object} options - Additional options
     * @returns {Object} Backup metadata
     */
    async performDatabaseBackup(backup, backupDir, timestamp, options = {}) {
        try {
            const {
                database = 'main', // 'main' or 'license'
                format = 'custom', // 'custom', 'plain', 'directory', 'tar'
                includeData = true,
                includeSchema = true
            } = options;

            // Determine which database to backup
            const dbUrl = database === 'license' ? this.licenseDbUrl : this.mainDbUrl;
            const dbName = database === 'license' ? 'license_server' : 'main_app';

            const backupFile = `database-${dbName}-${timestamp}.${this.getFileExtension(format)}`;
            const backupPath = path.join(backupDir, backupFile);

            // Build pg_dump command
            const dumpCommand = this.buildPgDumpCommand(dbUrl, backupPath, {
                format,
                includeData,
                includeSchema
            });

            console.log(`Starting PostgreSQL backup for ${dbName}...`);
            
            // Execute pg_dump
            const { stdout, stderr } = await execAsync(dumpCommand);
            
            if (stderr && !stderr.includes('WARNING')) {
                console.warn('pg_dump warnings:', stderr);
            }

            // Get backup file stats
            const stats = await fs.stat(backupPath);
            const backupSize = stats.size;

            // Compress the backup
            const gzipPath = `${backupPath}.gz`;
            await this.compressFile(backupPath, gzipPath);
            await fs.unlink(backupPath); // Remove uncompressed file

            let finalPath = gzipPath;
            let isEncrypted = false;
            let encryptionAlgorithm = null;

            // Encrypt if enabled
            if (backup.settings?.encryption?.enabled) {
                finalPath = await this.encryptFile(gzipPath, backup.settings.encryption);
                await fs.unlink(gzipPath); // Remove unencrypted file
                isEncrypted = true;
                encryptionAlgorithm = backup.settings.encryption.algorithm;
            }

            const finalStats = await fs.stat(finalPath);
            const checksum = await this.calculateChecksum(finalPath);

            // Get database statistics
            const dbStats = await this.getDatabaseStats(dbUrl);

            console.log(`✓ PostgreSQL backup completed for ${dbName}`);

            return {
                backupFile: path.basename(finalPath),
                backupPath: finalPath,
                backupSize,
                compressedSize: finalStats.size,
                compressionRatio: (backupSize / finalStats.size).toFixed(2),
                isEncrypted,
                encryptionAlgorithm,
                database: dbName,
                format,
                itemsBackedUp: {
                    tables: dbStats.tableCount,
                    totalRows: dbStats.totalRows,
                    databaseSize: dbStats.databaseSize
                },
                checksum
            };
        } catch (error) {
            console.error('PostgreSQL backup failed:', error.message);
            throw error;
        }
    }

    /**
     * Perform backup of both databases
     * @param {Object} backup - Backup configuration
     * @param {string} backupDir - Directory to store backups
     * @param {string} timestamp - Timestamp for backup files
     * @returns {Object} Combined backup metadata
     */
    async performFullBackup(backup, backupDir, timestamp) {
        try {
            console.log('Starting full PostgreSQL backup (both databases)...');

            // Backup license server
            const licenseBackup = await this.performDatabaseBackup(
                backup,
                backupDir,
                timestamp,
                { database: 'license' }
            );

            // Backup main application
            const mainBackup = await this.performDatabaseBackup(
                backup,
                backupDir,
                timestamp,
                { database: 'main' }
            );

            console.log('✓ Full PostgreSQL backup completed');

            return {
                licenseServer: licenseBackup,
                mainApplication: mainBackup,
                totalSize: licenseBackup.compressedSize + mainBackup.compressedSize,
                totalBackupSize: licenseBackup.backupSize + mainBackup.backupSize
            };
        } catch (error) {
            console.error('Full PostgreSQL backup failed:', error.message);
            throw error;
        }
    }

    /**
     * Build pg_dump command
     * @param {string} dbUrl - Database connection URL
     * @param {string} outputPath - Output file path
     * @param {Object} options - Dump options
     * @returns {string} pg_dump command
     */
    buildPgDumpCommand(dbUrl, outputPath, options = {}) {
        const {
            format = 'custom',
            includeData = true,
            includeSchema = true,
            verbose = false
        } = options;

        let command = `pg_dump "${dbUrl}"`;

        // Format option
        command += ` --format=${format}`;

        // Output file
        command += ` --file="${outputPath}"`;

        // Schema/Data options
        if (!includeData) {
            command += ' --schema-only';
        }
        if (!includeSchema) {
            command += ' --data-only';
        }

        // Additional options
        command += ' --no-owner'; // Don't output commands to set ownership
        command += ' --no-acl'; // Don't output commands to set access privileges
        command += ' --clean'; // Include commands to clean (drop) database objects
        command += ' --if-exists'; // Use IF EXISTS when dropping objects

        if (verbose) {
            command += ' --verbose';
        }

        return command;
    }

    /**
     * Restore database from backup
     * @param {string} backupPath - Path to backup file
     * @param {Object} options - Restore options
     * @returns {Object} Restore result
     */
    async restoreDatabase(backupPath, options = {}) {
        try {
            const {
                database = 'main', // 'main' or 'license'
                dropExisting = false,
                verbose = false
            } = options;

            console.log(`Starting PostgreSQL restore for ${database}...`);

            // Determine target database
            const dbUrl = database === 'license' ? this.licenseDbUrl : this.mainDbUrl;

            // Check if file is encrypted
            let processedPath = backupPath;
            if (backupPath.endsWith('.enc')) {
                console.log('Decrypting backup file...');
                processedPath = await this.decryptFile(backupPath, options.encryptionSettings);
            }

            // Check if file is compressed
            if (processedPath.endsWith('.gz')) {
                console.log('Decompressing backup file...');
                const decompressedPath = processedPath.replace('.gz', '');
                await this.decompressFile(processedPath, decompressedPath);
                processedPath = decompressedPath;
            }

            // Detect backup format
            const format = this.detectBackupFormat(processedPath);

            // Build restore command
            const restoreCommand = this.buildRestoreCommand(
                dbUrl,
                processedPath,
                { format, dropExisting, verbose }
            );

            // Execute restore
            const { stdout, stderr } = await execAsync(restoreCommand);

            if (stderr && !stderr.includes('WARNING')) {
                console.warn('pg_restore warnings:', stderr);
            }

            // Clean up temporary files
            if (processedPath !== backupPath) {
                await fs.unlink(processedPath);
            }

            console.log(`✓ PostgreSQL restore completed for ${database}`);

            return {
                success: true,
                database,
                restoredFrom: backupPath,
                message: 'Database restored successfully'
            };
        } catch (error) {
            console.error('PostgreSQL restore failed:', error.message);
            throw error;
        }
    }

    /**
     * Build restore command (pg_restore or psql)
     * @param {string} dbUrl - Database connection URL
     * @param {string} backupPath - Backup file path
     * @param {Object} options - Restore options
     * @returns {string} Restore command
     */
    buildRestoreCommand(dbUrl, backupPath, options = {}) {
        const {
            format = 'custom',
            dropExisting = false,
            verbose = false
        } = options;

        let command;

        if (format === 'plain') {
            // Use psql for plain SQL format
            command = `psql "${dbUrl}" -f "${backupPath}"`;
        } else {
            // Use pg_restore for custom/tar/directory formats
            command = `pg_restore "${dbUrl}"`;
            command += ` --format=${format}`;
            command += ` "${backupPath}"`;

            if (dropExisting) {
                command += ' --clean';
            }

            command += ' --no-owner';
            command += ' --no-acl';

            if (verbose) {
                command += ' --verbose';
            }
        }

        return command;
    }

    /**
     * Detect backup format from file
     * @param {string} filePath - Backup file path
     * @returns {string} Format ('custom', 'plain', 'tar', 'directory')
     */
    detectBackupFormat(filePath) {
        const ext = path.extname(filePath);
        
        if (ext === '.sql') return 'plain';
        if (ext === '.tar') return 'tar';
        if (ext === '.dump' || ext === '.backup') return 'custom';
        
        // Default to custom format
        return 'custom';
    }

    /**
     * Get file extension for backup format
     * @param {string} format - Backup format
     * @returns {string} File extension
     */
    getFileExtension(format) {
        const extensions = {
            custom: 'dump',
            plain: 'sql',
            directory: 'dir',
            tar: 'tar'
        };
        return extensions[format] || 'dump';
    }

    /**
     * Get database statistics
     * @param {string} dbUrl - Database connection URL
     * @returns {Object} Database statistics
     */
    async getDatabaseStats(dbUrl) {
        try {
            // Query to get table count and row counts
            const query = `
                SELECT 
                    COUNT(DISTINCT tablename) as table_count,
                    pg_database_size(current_database()) as database_size
                FROM pg_tables 
                WHERE schemaname = 'public';
            `;

            const command = `psql "${dbUrl}" -t -c "${query}"`;
            const { stdout } = await execAsync(command);

            // Parse output (simplified - actual parsing may vary)
            const lines = stdout.trim().split('\n');
            const values = lines[0].trim().split('|').map(v => v.trim());

            return {
                tableCount: parseInt(values[0]) || 0,
                totalRows: 0, // Would need separate query per table
                databaseSize: parseInt(values[1]) || 0
            };
        } catch (error) {
            console.warn('Could not get database stats:', error.message);
            return {
                tableCount: 0,
                totalRows: 0,
                databaseSize: 0
            };
        }
    }

    /**
     * Compress file using gzip
     * @param {string} inputPath - Input file path
     * @param {string} outputPath - Output file path
     */
    async compressFile(inputPath, outputPath) {
        const gzip = createGzip({ level: 6 });
        const source = createReadStream(inputPath);
        const destination = createWriteStream(outputPath);
        
        await pipeline(source, gzip, destination);
    }

    /**
     * Decompress file using gunzip
     * @param {string} inputPath - Input file path
     * @param {string} outputPath - Output file path
     */
    async decompressFile(inputPath, outputPath) {
        const gunzip = createGunzip();
        const source = createReadStream(inputPath);
        const destination = createWriteStream(outputPath);
        
        await pipeline(source, gunzip, destination);
    }

    /**
     * Encrypt file
     * @param {string} filePath - File to encrypt
     * @param {Object} encryptionSettings - Encryption settings
     * @returns {string} Path to encrypted file
     */
    async encryptFile(filePath, encryptionSettings) {
        const algorithm = encryptionSettings.algorithm || 'aes-256-cbc';
        const key = Buffer.from(encryptionSettings.encryptionKey, 'hex');
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);

        const encryptedPath = `${filePath}.enc`;
        const input = createReadStream(filePath);
        const output = createWriteStream(encryptedPath);

        output.write(iv);
        await pipeline(input, cipher, output);

        return encryptedPath;
    }

    /**
     * Decrypt file
     * @param {string} filePath - File to decrypt
     * @param {Object} encryptionSettings - Encryption settings
     * @returns {string} Path to decrypted file
     */
    async decryptFile(filePath, encryptionSettings) {
        const algorithm = encryptionSettings.algorithm || 'aes-256-cbc';
        const key = Buffer.from(encryptionSettings.encryptionKey, 'hex');

        const decryptedPath = filePath.replace('.enc', '');
        const input = createReadStream(filePath);
        const output = createWriteStream(decryptedPath);

        // Read IV from file
        const iv = await new Promise((resolve, reject) => {
            const chunks = [];
            input.once('readable', () => {
                const iv = input.read(16);
                resolve(iv);
            });
            input.once('error', reject);
        });

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        await pipeline(input, decipher, output);

        return decryptedPath;
    }

    /**
     * Calculate file checksum
     * @param {string} filePath - File path
     * @returns {string} SHA-256 checksum
     */
    async calculateChecksum(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = createReadStream(filePath);

            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * Verify backup integrity
     * @param {string} backupPath - Backup file path
     * @param {string} expectedChecksum - Expected checksum
     * @returns {boolean} True if checksum matches
     */
    async verifyBackup(backupPath, expectedChecksum) {
        try {
            const actualChecksum = await this.calculateChecksum(backupPath);
            return actualChecksum === expectedChecksum;
        } catch (error) {
            console.error('Backup verification failed:', error.message);
            return false;
        }
    }

    /**
     * List available backups
     * @param {string} backupDir - Backup directory
     * @returns {Array} List of backup files with metadata
     */
    async listBackups(backupDir) {
        try {
            const files = await fs.readdir(backupDir);
            const backups = [];

            for (const file of files) {
                if (file.startsWith('database-') && 
                    (file.endsWith('.gz') || file.endsWith('.enc'))) {
                    const filePath = path.join(backupDir, file);
                    const stats = await fs.stat(filePath);

                    backups.push({
                        filename: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    });
                }
            }

            // Sort by creation date (newest first)
            backups.sort((a, b) => b.created - a.created);

            return backups;
        } catch (error) {
            console.error('Failed to list backups:', error.message);
            return [];
        }
    }

    /**
     * Delete old backups (retention policy)
     * @param {string} backupDir - Backup directory
     * @param {number} retentionDays - Number of days to retain backups
     * @returns {Object} Deletion result
     */
    async cleanupOldBackups(backupDir, retentionDays = 30) {
        try {
            const backups = await this.listBackups(backupDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            let deletedCount = 0;
            let freedSpace = 0;

            for (const backup of backups) {
                if (backup.created < cutoffDate) {
                    await fs.unlink(backup.path);
                    deletedCount++;
                    freedSpace += backup.size;
                }
            }

            console.log(`Cleaned up ${deletedCount} old backups, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);

            return {
                deletedCount,
                freedSpace,
                remainingBackups: backups.length - deletedCount
            };
        } catch (error) {
            console.error('Backup cleanup failed:', error.message);
            throw error;
        }
    }
}

export default new PostgresBackupService();
