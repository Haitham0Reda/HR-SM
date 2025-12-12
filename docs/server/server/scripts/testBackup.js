/**
 * Test Backup Script
 * Manually trigger a backup for testing
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Backup from '../modules/hr-core/backup/models/backup.model.js';
import BackupExecution from '../modules/hr-core/backup/models/backupExecution.model.js';
import backupScheduler from '../modules/hr-core/backup/services/backupScheduler.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testBackup = async () => {
    try {
        console.log('🔄 Connecting to database...');
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database\n');

        // Find one of the scheduled backups
        const backup = await Backup.findOne({ name: 'Daily Backup - 1:00 AM' });
        
        if (!backup) {
            console.error('❌ Backup configuration not found. Run: npm run setup-backups');
            process.exit(1);
        }

        console.log('📦 Found backup configuration:');
        console.log(`   Name: ${backup.name}`);
        console.log(`   Type: ${backup.backupType}`);
        console.log(`   Storage: ${backup.storage.location}\n`);

        console.log('🔄 Starting backup execution...\n');
        
        // Execute the backup
        await backupScheduler.executeBackup(backup);

        // Wait a moment for the backup to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check the latest execution
        const execution = await BackupExecution.findOne({ backup: backup._id })
            .sort({ createdAt: -1 });

        if (execution) {
            console.log('\n📊 Backup Execution Results:');
            console.log(`   Status: ${execution.status}`);
            console.log(`   Execution Type: ${execution.executionType}`);
            console.log(`   Start Time: ${execution.startTime}`);
            
            if (execution.status === 'completed') {
                console.log(`   End Time: ${execution.endTime}`);
                console.log(`   Duration: ${execution.duration}ms`);
                console.log(`   Backup File: ${execution.backupFile}`);
                console.log(`   Backup Path: ${execution.backupPath}`);
                console.log(`   Backup Size: ${(execution.backupSize / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   Compressed Size: ${(execution.compressedSize / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   Compression Ratio: ${execution.compressionRatio}`);
                console.log(`   Encrypted: ${execution.isEncrypted ? 'Yes' : 'No'}`);
                console.log(`   Checksum: ${execution.checksum?.substring(0, 16)}...`);
                console.log('\n✅ Backup completed successfully!');
            } else if (execution.status === 'failed') {
                console.log(`   Error: ${execution.error}`);
                console.log('\n❌ Backup failed!');
            } else {
                console.log('\n⏳ Backup is still running...');
            }
        }

    } catch (error) {
        console.error('\n❌ Error during backup test:', error.message);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from database');
        process.exit(0);
    }
};

testBackup();
