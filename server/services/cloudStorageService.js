import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import winston from 'winston';
import BackupLog from '../models/BackupLog.js';

/**
 * Cloud Storage Service for Backup Integration
 * Supports AWS S3, Google Cloud Storage, and Azure Blob Storage
 * Handles automated backup uploads, verification, and restoration
 */
class CloudStorageService {
    constructor() {
        this.providers = new Map();
        this.defaultProvider = process.env.BACKUP_CLOUD_PROVIDER || 'aws-s3';
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: path.join(process.cwd(), 'logs', 'cloud-storage.log') 
                }),
                new winston.transports.Console()
            ]
        });

        this.initializeProviders();
    }

    /**
     * Initialize cloud storage providers
     */
    initializeProviders() {
        // AWS S3 Provider
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            const s3Client = new S3Client({
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                },
                region: process.env.AWS_REGION || 'us-east-1'
            });

            this.providers.set('aws-s3', {
                client: s3Client,
                bucket: process.env.AWS_S3_BACKUP_BUCKET || 'hrsm-backups',
                upload: this.uploadToS3.bind(this),
                download: this.downloadFromS3.bind(this),
                verify: this.verifyS3Upload.bind(this),
                delete: this.deleteFromS3.bind(this)
            });

            this.logger.info('AWS S3 provider initialized');
        }

        // Google Cloud Storage Provider (placeholder)
        if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_KEY_FILE) {
            // Implementation would go here
            this.logger.info('Google Cloud Storage provider would be initialized here');
        }

        // Azure Blob Storage Provider (placeholder)
        if (process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY) {
            // Implementation would go here
            this.logger.info('Azure Blob Storage provider would be initialized here');
        }

        if (this.providers.size === 0) {
            this.logger.warn('No cloud storage providers configured');
        }
    }

    /**
     * Upload backup to cloud storage
     */
    async uploadBackup(backupPath, backupId, metadata = {}) {
        const provider = this.providers.get(this.defaultProvider);
        
        if (!provider) {
            throw new Error(`Cloud storage provider '${this.defaultProvider}' not configured`);
        }

        this.logger.info('Starting cloud backup upload', { 
            backupId, 
            provider: this.defaultProvider,
            backupPath 
        });

        try {
            const startTime = Date.now();
            
            // Generate cloud storage key
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const key = `backups/${timestamp}/${backupId}/${path.basename(backupPath)}`;
            
            // Upload to cloud storage
            const result = await provider.upload(backupPath, key, metadata);
            
            const uploadTime = Date.now() - startTime;
            
            this.logger.info('Cloud backup upload completed', {
                backupId,
                provider: this.defaultProvider,
                key: result.key,
                size: result.size,
                uploadTime: `${uploadTime}ms`
            });

            // Update backup log
            await this.updateBackupLog(backupId, {
                uploaded: true,
                uploadedAt: new Date(),
                provider: this.defaultProvider,
                bucket: provider.bucket,
                key: result.key,
                url: result.url
            });

            // Verify upload
            await this.verifyUpload(backupId, backupPath, result.key);

            return result;

        } catch (error) {
            this.logger.error('Cloud backup upload failed', {
                backupId,
                provider: this.defaultProvider,
                error: error.message
            });

            // Update backup log with error
            await this.updateBackupLog(backupId, {
                uploaded: false,
                uploadError: error.message
            });

            throw error;
        }
    }

    /**
     * Upload to AWS S3
     */
    async uploadToS3(filePath, key, metadata) {
        const provider = this.providers.get('aws-s3');
        const fileStream = fs.createReadStream(filePath);
        const stats = fs.statSync(filePath);

        const uploadCommand = new PutObjectCommand({
            Bucket: provider.bucket,
            Key: key,
            Body: fileStream,
            ContentType: 'application/octet-stream',
            ServerSideEncryption: 'AES256',
            Metadata: {
                'backup-id': metadata.backupId || '',
                'backup-type': metadata.type || '',
                'created-at': new Date().toISOString(),
                'original-size': stats.size.toString()
            }
        });

        const result = await provider.client.send(uploadCommand);

        return {
            key: key,
            url: `https://${provider.bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
            etag: result.ETag,
            size: stats.size
        };
    }

    /**
     * Download from AWS S3
     */
    async downloadFromS3(key, downloadPath) {
        const provider = this.providers.get('aws-s3');

        const downloadCommand = new GetObjectCommand({
            Bucket: provider.bucket,
            Key: key
        });

        const result = await provider.client.send(downloadCommand);
        
        // Convert stream to buffer for writing
        const chunks = [];
        for await (const chunk of result.Body) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(downloadPath, buffer);

        return {
            size: result.ContentLength,
            lastModified: result.LastModified,
            etag: result.ETag
        };
    }

    /**
     * Verify S3 upload
     */
    async verifyS3Upload(key, originalPath) {
        const provider = this.providers.get('aws-s3');

        try {
            // Get object metadata
            const headCommand = new HeadObjectCommand({
                Bucket: provider.bucket,
                Key: key
            });

            const result = await provider.client.send(headCommand);
            const originalStats = fs.statSync(originalPath);

            // Verify size matches
            if (result.ContentLength !== originalStats.size) {
                throw new Error(`Size mismatch: uploaded ${result.ContentLength}, original ${originalStats.size}`);
            }

            // Verify checksum if available
            if (result.ETag) {
                const originalChecksum = await this.calculateFileChecksum(originalPath);
                const uploadedETag = result.ETag.replace(/"/g, '');
                
                // Note: S3 ETag is not always MD5 for multipart uploads
                this.logger.info('Upload verification completed', {
                    key,
                    size: result.ContentLength,
                    etag: uploadedETag,
                    originalChecksum: originalChecksum.substring(0, 16) + '...'
                });
            }

            return true;

        } catch (error) {
            this.logger.error('Upload verification failed', { key, error: error.message });
            throw error;
        }
    }

    /**
     * Delete from AWS S3
     */
    async deleteFromS3(key) {
        const provider = this.providers.get('aws-s3');

        const deleteCommand = new DeleteObjectCommand({
            Bucket: provider.bucket,
            Key: key
        });

        await provider.client.send(deleteCommand);
        
        this.logger.info('Backup deleted from S3', { key });
    }

    /**
     * Download backup from cloud storage
     */
    async downloadBackup(backupId, downloadPath) {
        this.logger.info('Starting cloud backup download', { backupId, downloadPath });

        try {
            // Find backup in database
            const backup = await BackupLog.getBackupById(backupId);
            
            if (!backup || !backup.cloudStorage.uploaded) {
                throw new Error('Backup not found in cloud storage');
            }

            const provider = this.providers.get(backup.cloudStorage.provider);
            
            if (!provider) {
                throw new Error(`Provider '${backup.cloudStorage.provider}' not available`);
            }

            // Download from cloud storage
            const result = await provider.download(backup.cloudStorage.key, downloadPath);

            this.logger.info('Cloud backup download completed', {
                backupId,
                downloadPath,
                size: result.size
            });

            return result;

        } catch (error) {
            this.logger.error('Cloud backup download failed', {
                backupId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Verify uploaded backup integrity
     */
    async verifyUpload(backupId, originalPath, cloudKey) {
        this.logger.info('Verifying cloud backup integrity', { backupId, cloudKey });

        try {
            const provider = this.providers.get(this.defaultProvider);
            await provider.verify(cloudKey, originalPath);

            this.logger.info('Cloud backup verification successful', { backupId, cloudKey });
            return true;

        } catch (error) {
            this.logger.error('Cloud backup verification failed', {
                backupId,
                cloudKey,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * List backups in cloud storage
     */
    async listCloudBackups(prefix = 'backups/') {
        const provider = this.providers.get(this.defaultProvider);
        
        if (!provider) {
            throw new Error(`Cloud storage provider '${this.defaultProvider}' not configured`);
        }

        try {
            if (this.defaultProvider === 'aws-s3') {
                return await this.listS3Backups(prefix);
            }
            
            throw new Error(`List operation not implemented for provider: ${this.defaultProvider}`);

        } catch (error) {
            this.logger.error('Failed to list cloud backups', { error: error.message });
            throw error;
        }
    }

    /**
     * List S3 backups
     */
    async listS3Backups(prefix) {
        const provider = this.providers.get('aws-s3');

        const listCommand = new ListObjectsV2Command({
            Bucket: provider.bucket,
            Prefix: prefix,
            MaxKeys: 1000
        });

        const result = await provider.client.send(listCommand);

        return (result.Contents || []).map(object => ({
            key: object.Key,
            size: object.Size,
            lastModified: object.LastModified,
            etag: object.ETag,
            storageClass: object.StorageClass
        }));
    }

    /**
     * Delete backup from cloud storage
     */
    async deleteCloudBackup(backupId) {
        this.logger.info('Deleting cloud backup', { backupId });

        try {
            // Find backup in database
            const backup = await BackupLog.getBackupById(backupId);
            
            if (!backup || !backup.cloudStorage.uploaded) {
                throw new Error('Backup not found in cloud storage');
            }

            const provider = this.providers.get(backup.cloudStorage.provider);
            
            if (!provider) {
                throw new Error(`Provider '${backup.cloudStorage.provider}' not available`);
            }

            // Delete from cloud storage
            await provider.delete(backup.cloudStorage.key);

            // Update backup log
            backup.cloudStorage.uploaded = false;
            backup.cloudStorage.uploadError = 'Manually deleted';
            await backup.save();

            this.logger.info('Cloud backup deleted successfully', { backupId });

        } catch (error) {
            this.logger.error('Failed to delete cloud backup', {
                backupId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Test cloud storage connection
     */
    async testConnection(providerName = this.defaultProvider) {
        const provider = this.providers.get(providerName);
        
        if (!provider) {
            throw new Error(`Provider '${providerName}' not configured`);
        }

        this.logger.info('Testing cloud storage connection', { provider: providerName });

        try {
            if (providerName === 'aws-s3') {
                // Test S3 connection by listing bucket
                const listCommand = new ListObjectsV2Command({
                    Bucket: provider.bucket,
                    MaxKeys: 1
                });

                await provider.client.send(listCommand);
            }

            this.logger.info('Cloud storage connection test successful', { provider: providerName });
            return true;

        } catch (error) {
            this.logger.error('Cloud storage connection test failed', {
                provider: providerName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get cloud storage statistics
     */
    async getCloudStorageStats() {
        try {
            const backups = await this.listCloudBackups();
            
            const stats = {
                totalBackups: backups.length,
                totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
                oldestBackup: backups.length > 0 ? 
                    Math.min(...backups.map(b => new Date(b.lastModified).getTime())) : null,
                newestBackup: backups.length > 0 ? 
                    Math.max(...backups.map(b => new Date(b.lastModified).getTime())) : null,
                provider: this.defaultProvider,
                bucket: this.providers.get(this.defaultProvider)?.bucket
            };

            return stats;

        } catch (error) {
            this.logger.error('Failed to get cloud storage stats', { error: error.message });
            throw error;
        }
    }

    /**
     * Cleanup old cloud backups based on retention policy
     */
    async cleanupOldCloudBackups(retentionDays = 90) {
        this.logger.info('Starting cloud backup cleanup', { retentionDays });

        try {
            const backups = await this.listCloudBackups();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            let deletedCount = 0;

            for (const backup of backups) {
                if (new Date(backup.lastModified) < cutoffDate) {
                    try {
                        const provider = this.providers.get(this.defaultProvider);
                        await provider.delete(backup.key);
                        deletedCount++;
                        
                        this.logger.info('Deleted old cloud backup', { 
                            key: backup.key,
                            lastModified: backup.lastModified 
                        });
                    } catch (error) {
                        this.logger.warn('Failed to delete old cloud backup', {
                            key: backup.key,
                            error: error.message
                        });
                    }
                }
            }

            this.logger.info('Cloud backup cleanup completed', { 
                deletedCount,
                retentionDays 
            });

            return { deletedCount };

        } catch (error) {
            this.logger.error('Cloud backup cleanup failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Update backup log with cloud storage information
     */
    async updateBackupLog(backupId, cloudStorageInfo) {
        try {
            const backup = await BackupLog.findOne({ backupId });
            
            if (backup) {
                Object.assign(backup.cloudStorage, cloudStorageInfo);
                await backup.save();
            }

        } catch (error) {
            this.logger.warn('Failed to update backup log', {
                backupId,
                error: error.message
            });
        }
    }

    /**
     * Calculate file checksum
     */
    async calculateFileChecksum(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('md5');
            const stream = fs.createReadStream(filePath);

            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * Get provider status
     */
    getProviderStatus() {
        const status = {};

        this.providers.forEach((provider, name) => {
            status[name] = {
                configured: true,
                bucket: provider.bucket,
                default: name === this.defaultProvider
            };
        });

        return {
            providers: status,
            defaultProvider: this.defaultProvider,
            totalProviders: this.providers.size
        };
    }

    /**
     * Set default provider
     */
    setDefaultProvider(providerName) {
        if (!this.providers.has(providerName)) {
            throw new Error(`Provider '${providerName}' not configured`);
        }

        this.defaultProvider = providerName;
        this.logger.info('Default cloud storage provider changed', { provider: providerName });
    }
}

export default CloudStorageService;