/**
 * Setup Daily Backups Script
 * Creates two automatic backups per day: 1:00 AM and 6:00 AM
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Backup from '../modules/hr-core/backup/models/backup.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const setupDailyBackups = async () => {
    try {
        console.log('🔄 Connecting to database...');
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not found in environment variables');
        }
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database\n');

        // Find admin user to set as creator
        const adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) {
            console.error('❌ No admin user found. Please create an admin user first.');
            process.exit(1);
        }

        console.log('📅 Setting up daily backups...\n');

        // Backup 1: Daily at 1:00 AM
        const backup1AM = await Backup.findOneAndUpdate(
            { name: 'Daily Backup - 1:00 AM' },
            {
                name: 'Daily Backup - 1:00 AM',
                description: 'Automatic full backup at 1:00 AM daily',
                backupType: 'full',
                schedule: {
                    enabled: true,
                    frequency: 'daily',
                    time: '01:00'
                },
                settings: {
                    encryption: {
                        enabled: true,
                        algorithm: 'aes-256-cbc',
                        encryptionKey: crypto.randomBytes(32).toString('hex')
                    },
                    compression: {
                        enabled: true,
                        level: 6
                    },
                    retention: {
                        enabled: true,
                        days: 30,
                        maxBackups: 60
                    },
                    notification: {
                        enabled: true,
                        onSuccess: false,
                        onFailure: true
                    }
                },
                sources: {
                    databases: [{
                        name: 'hrms',
                        collections: []
                    }],
                    filePaths: ['./uploads', './documents']
                },
                storage: {
                    location: './backups/full',
                    maxSize: 5120
                },
                isActive: true,
                createdBy: adminUser._id
            },
            { upsert: true, new: true }
        );

        console.log('✅ Created: Daily Backup - 1:00 AM');
        console.log(`   Schedule: Every day at 1:00 AM`);
        console.log(`   Type: Full (Database + Files)`);
        console.log(`   Retention: 30 days\n`);

        // Backup 2: Daily at 6:00 AM
        const backup6AM = await Backup.findOneAndUpdate(
            { name: 'Daily Backup - 6:00 AM' },
            {
                name: 'Daily Backup - 6:00 AM',
                description: 'Automatic full backup at 6:00 AM daily',
                backupType: 'full',
                schedule: {
                    enabled: true,
                    frequency: 'daily',
                    time: '06:00'
                },
                settings: {
                    encryption: {
                        enabled: true,
                        algorithm: 'aes-256-cbc',
                        encryptionKey: crypto.randomBytes(32).toString('hex')
                    },
                    compression: {
                        enabled: true,
                        level: 6
                    },
                    retention: {
                        enabled: true,
                        days: 30,
                        maxBackups: 60
                    },
                    notification: {
                        enabled: true,
                        onSuccess: false,
                        onFailure: true
                    }
                },
                sources: {
                    databases: [{
                        name: 'hrms',
                        collections: []
                    }],
                    filePaths: ['./uploads', './documents']
                },
                storage: {
                    location: './backups/full',
                    maxSize: 5120
                },
                isActive: true,
                createdBy: adminUser._id
            },
            { upsert: true, new: true }
        );

        console.log('✅ Created: Daily Backup - 6:00 AM');
        console.log(`   Schedule: Every day at 6:00 AM`);
        console.log(`   Type: Full (Database + Files)`);
        console.log(`   Retention: 30 days\n`);

        // Calculate next run times
        backup1AM.schedule.nextRun = backup1AM.calculateNextRun();
        await backup1AM.save();

        backup6AM.schedule.nextRun = backup6AM.calculateNextRun();
        await backup6AM.save();

        console.log('📅 Next scheduled runs:');
        console.log(`   1:00 AM backup: ${backup1AM.schedule.nextRun}`);
        console.log(`   6:00 AM backup: ${backup6AM.schedule.nextRun}\n`);

        console.log('✅ Daily backups configured successfully!');
        console.log('💡 Backups will be saved to: ./server/backups/full/\n');

    } catch (error) {
        console.error('❌ Error setting up backups:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from database');
    }
};

setupDailyBackups();
