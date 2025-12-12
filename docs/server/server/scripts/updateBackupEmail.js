/**
 * Update Backup Email Configuration
 * Adds email recipient and enables email notifications
 * Usage: node server/scripts/updateBackupEmail.js your-email@example.com
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Backup from '../modules/hr-core/backup/models/backup.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const updateBackupEmail = async () => {
    try {
        console.log('📧 Backup Email Configuration\n');
        
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database\n');

        // Get email from command line argument
        const email = process.argv[2];
        
        if (!email || !email.includes('@')) {
            console.error('❌ Invalid email address');
            console.log('\nUsage: node server/scripts/updateBackupEmail.js your-email@example.com');
            console.log('   or: npm run setup-backup-email your-email@example.com\n');
            process.exit(1);
        }

        // Update all backup configurations
        const result = await Backup.updateMany(
            {},
            {
                $set: {
                    'settings.notification.enabled': true,
                    'settings.notification.onSuccess': true,
                    'settings.notification.onFailure': true,
                    'settings.notification.recipients': [email]
                }
            }
        );

        console.log(`\n✅ Updated ${result.modifiedCount} backup configuration(s)`);
        console.log(`📧 Backup files will be sent to: ${email}`);
        console.log('\n📝 Email notifications configured:');
        console.log('   ✅ On Success: Enabled (backup file attached)');
        console.log('   ✅ On Failure: Enabled (error notification)');
        console.log('\n💡 Note: Backup files larger than 25MB will not be attached to emails.');
        console.log('   You will receive a notification with the file location instead.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

updateBackupEmail();
