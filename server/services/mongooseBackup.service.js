/**
 * Mongoose Backup Service
 * Alternative backup method that doesn't require mongodump
 * Works with MongoDB Atlas and local MongoDB
 */
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import mongoose from 'mongoose';

class MongooseBackupService {
    /**
     * Perform database backup using Mongoose
     */
    async performDatabaseBackup(backup, backupDir, timestamp) {
        try {
            const backupFile = `database-${timestamp}.json`;
            const backupPath = path.join(backupDir, backupFile);

            console.log('📦 Starting database backup...');

            // Get all collections
            const collections = await mongoose.connection.db.listCollections().toArray();
            const backupData = {};

            // Export each collection
            for (const collectionInfo of collections) {
                const collectionName = collectionInfo.name;
                console.log(`   Exporting collection: ${collectionName}`);
                
                const collection = mongoose.connection.db.collection(collectionName);
                const documents = await collection.find({}).toArray();
                backupData[collectionName] = documents;
                
                console.log(`   ✓ Exported ${documents.length} documents from ${collectionName}`);
            }

            // Write to file
            await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
            console.log(`   ✓ Backup data written to file`);

            const stats = await fs.stat(backupPath);
            const backupSize = stats.size;

            // Compress the backup
            const gzipPath = `${backupPath}.gz`;
            await this.compressFile(backupPath, gzipPath);
            await fs.unlink(backupPath); // Remove uncompressed file
            console.log(`   ✓ Backup compressed`);

            let finalPath = gzipPath;
            let isEncrypted = false;
            let encryptionAlgorithm = null;

            // Encrypt if enabled
            if (backup.settings?.encryption?.enabled) {
                finalPath = await this.encryptFile(gzipPath, backup.settings.encryption);
                await fs.unlink(gzipPath); // Remove unencrypted file
                isEncrypted = true;
                encryptionAlgorithm = backup.settings.encryption.algorithm;
                console.log(`   ✓ Backup encrypted`);
            }

            const finalStats = await fs.stat(finalPath);
            const checksum = await this.calculateChecksum(finalPath);

            console.log(`✅ Database backup completed`);
            console.log(`   Size: ${(backupSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Compressed: ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Collections: ${collections.length}`);

            return {
                backupFile: path.basename(finalPath),
                backupPath: finalPath,
                backupSize,
                compressedSize: finalStats.size,
                compressionRatio: (backupSize / finalStats.size).toFixed(2),
                isEncrypted,
                encryptionAlgorithm,
                itemsBackedUp: {
                    collections: collections.length,
                    totalDocuments: Object.values(backupData).reduce((sum, docs) => sum + docs.length, 0)
                },
                checksum
            };
        } catch (error) {
            console.error('❌ Database backup failed:', error);
            throw error;
        }
    }

    /**
     * Compress file using gzip
     */
    async compressFile(inputPath, outputPath) {
        const gzip = createGzip({ level: 6 });
        const source = createReadStream(inputPath);
        const destination = createWriteStream(outputPath);
        
        await pipeline(source, gzip, destination);
    }

    /**
     * Encrypt file
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
     * Calculate file checksum
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
}

export default new MongooseBackupService();
