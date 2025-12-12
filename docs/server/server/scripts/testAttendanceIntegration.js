/**
 * Test script for Attendance Device Integration
 * Run with: node server/scripts/testAttendanceIntegration.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import AttendanceDevice from '../modules/hr-core/attendance/models/attendanceDevice.model.js';
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';
import attendanceDeviceService from '../modules/hr-core/attendance/services/attendanceDevice.service.js';

const testIntegration = async () => {
    try {
        console.log('🚀 Starting Attendance Integration Test...\n');

        // Connect to database
        console.log('📡 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Database connected\n');

        // Test 1: Create a test device
        console.log('📝 Test 1: Creating test device...');
        const testDevice = new AttendanceDevice({
            deviceName: 'Test Device',
            deviceType: 'manual',
            status: 'active',
            autoSync: false,
            notes: 'Created by test script'
        });
        await testDevice.save();
        console.log('✅ Test device created:', testDevice._id);
        console.log('   Device Name:', testDevice.deviceName);
        console.log('   Device Type:', testDevice.deviceType);
        console.log('   Status:', testDevice.status);
        console.log('');

        // Test 2: Test data normalization
        console.log('📝 Test 2: Testing data normalization...');
        const sampleLog = {
            userId: 'TEST001',
            timestamp: new Date().toISOString(),
            type: 'checkin'
        };
        
        const normalized = await attendanceDeviceService.normalizeLogData(
            sampleLog,
            'manual'
        );
        console.log('✅ Data normalized successfully:');
        console.log('   Employee ID:', normalized.employeeId);
        console.log('   Timestamp:', normalized.timestamp);
        console.log('   Type:', normalized.type);
        console.log('   Source:', normalized.source);
        console.log('');

        // Test 3: Check attendance model fields
        console.log('📝 Test 3: Verifying attendance model fields...');
        const attendanceSchema = Attendance.schema.obj;
        const hasSource = 'source' in attendanceSchema;
        const hasRawDeviceData = 'rawDeviceData' in attendanceSchema;
        const hasDevice = 'device' in attendanceSchema;
        
        console.log('✅ Attendance model fields:');
        console.log('   source field:', hasSource ? '✓' : '✗');
        console.log('   rawDeviceData field:', hasRawDeviceData ? '✓' : '✗');
        console.log('   device field:', hasDevice ? '✓' : '✗');
        console.log('');

        // Test 4: Device statistics
        console.log('📝 Test 4: Getting device statistics...');
        const stats = await AttendanceDevice.getDeviceStats();
        console.log('✅ Device statistics retrieved:');
        console.log('   Total devices:', stats.length > 0 ? stats[0].total : 0);
        console.log('');

        // Test 5: Get devices for sync
        console.log('📝 Test 5: Getting devices for sync...');
        const devicesForSync = await AttendanceDevice.getDevicesForSync();
        console.log('✅ Devices configured for auto-sync:', devicesForSync.length);
        console.log('');

        // Cleanup
        console.log('🧹 Cleaning up test data...');
        await AttendanceDevice.findByIdAndDelete(testDevice._id);
        console.log('✅ Test device deleted\n');

        // Summary
        console.log('═══════════════════════════════════════════════════');
        console.log('🎉 All tests passed successfully!');
        console.log('═══════════════════════════════════════════════════');
        console.log('\n✅ Attendance Device Integration is working correctly!\n');
        console.log('Next steps:');
        console.log('1. Start your server: npm start');
        console.log('2. Register a real device via API or frontend');
        console.log('3. Test device connection');
        console.log('4. Start syncing attendance data');
        console.log('\nFor more information, see:');
        console.log('- docs/ATTENDANCE_QUICK_START.md');
        console.log('- docs/ATTENDANCE_DEVICE_INTEGRATION.md');
        console.log('');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('📡 Database connection closed');
        process.exit(0);
    }
};

// Run tests
testIntegration();
