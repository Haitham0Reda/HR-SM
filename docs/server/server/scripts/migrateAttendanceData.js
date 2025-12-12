/**
 * Migration script to add new fields to existing attendance records
 * Run with: node server/scripts/migrateAttendanceData.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';

const migrateAttendanceData = async () => {
    try {
        console.log('🚀 Starting Attendance Data Migration...\n');

        // Connect to database
        console.log('📡 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Database connected\n');

        // Count existing records
        const totalRecords = await Attendance.countDocuments();
        console.log(`📊 Found ${totalRecords} attendance records\n`);

        if (totalRecords === 0) {
            console.log('ℹ️  No attendance records to migrate');
            return;
        }

        // Update records that don't have the new fields
        console.log('🔄 Updating records with new fields...');
        
        const result = await Attendance.updateMany(
            {
                $or: [
                    { source: { $exists: false } },
                    { rawDeviceData: { $exists: false } },
                    { device: { $exists: false } }
                ]
            },
            {
                $set: {
                    source: 'manual', // Default to manual for existing records
                    rawDeviceData: null,
                    device: null
                }
            }
        );

        console.log('✅ Migration completed:');
        console.log(`   Records matched: ${result.matchedCount}`);
        console.log(`   Records modified: ${result.modifiedCount}`);
        console.log('');

        // Verify migration
        console.log('🔍 Verifying migration...');
        const recordsWithSource = await Attendance.countDocuments({ source: { $exists: true } });
        const recordsWithRawData = await Attendance.countDocuments({ rawDeviceData: { $exists: true } });
        const recordsWithDevice = await Attendance.countDocuments({ device: { $exists: true } });

        console.log('✅ Verification results:');
        console.log(`   Records with source field: ${recordsWithSource}/${totalRecords}`);
        console.log(`   Records with rawDeviceData field: ${recordsWithRawData}/${totalRecords}`);
        console.log(`   Records with device field: ${recordsWithDevice}/${totalRecords}`);
        console.log('');

        if (recordsWithSource === totalRecords && 
            recordsWithRawData === totalRecords && 
            recordsWithDevice === totalRecords) {
            console.log('═══════════════════════════════════════════════════');
            console.log('🎉 Migration completed successfully!');
            console.log('═══════════════════════════════════════════════════');
            console.log('\n✅ All attendance records now have the new fields');
            console.log('✅ Your system is ready for device integration\n');
        } else {
            console.log('⚠️  Some records may not have been updated');
            console.log('   Please review the results above');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('📡 Database connection closed');
        process.exit(0);
    }
};

// Run migration
migrateAttendanceData();
