/**
 * Import Attendance Data Script
 * Imports the generated attendance records into MongoDB for techcorp_solutions tenant
 */

import fs from 'fs';
import mongoose from 'mongoose';
import multiTenantDB from './server/config/multiTenant.js';
import Attendance from './server/modules/hr-core/attendance/models/attendance.model.js';
import chalk from 'chalk';

async function importAttendanceData() {
    try {
        console.log(chalk.blue('🚀 Starting attendance data import...'));
        
        // Read the generated attendance data
        const attendanceData = JSON.parse(fs.readFileSync('techcorp_attendance_january_2025.json', 'utf8'));
        console.log(chalk.yellow(`📊 Found ${attendanceData.length} attendance records to import`));
        
        // Get tenant database connection
        const tenantConnection = await multiTenantDB.getCompanyConnection('techcorp_solutions');
        console.log(chalk.green('✅ Connected to techcorp_solutions database'));
        
        // Get Attendance model for this tenant
        const TenantAttendance = tenantConnection.model('Attendance', Attendance.schema);
        
        // Clear existing attendance data (optional)
        console.log(chalk.yellow('🧹 Clearing existing attendance data...'));
        await TenantAttendance.deleteMany({});
        
        // Convert ObjectId strings to proper ObjectIds and generate new unique IDs
        const processedData = attendanceData.map(record => {
            return {
                ...record,
                _id: new mongoose.Types.ObjectId(), // Generate new unique ObjectId
                employee: new mongoose.Types.ObjectId(record.employee.$oid),
                department: record.department ? new mongoose.Types.ObjectId(record.department) : null,
                position: record.position ? new mongoose.Types.ObjectId(record.position) : null,
                date: new Date(record.date),
                checkIn: {
                    ...record.checkIn,
                    time: record.checkIn.time ? new Date(record.checkIn.time) : null
                },
                checkOut: {
                    ...record.checkOut,
                    time: record.checkOut.time ? new Date(record.checkOut.time) : null
                },
                createdAt: new Date(record.createdAt),
                updatedAt: new Date(record.updatedAt)
            };
        });
        
        // Insert attendance records in batches
        console.log(chalk.yellow('📥 Inserting attendance records...'));
        const batchSize = 50;
        let imported = 0;
        
        for (let i = 0; i < processedData.length; i += batchSize) {
            const batch = processedData.slice(i, i + batchSize);
            await TenantAttendance.insertMany(batch, { ordered: false });
            imported += batch.length;
            console.log(chalk.gray(`   Imported ${imported}/${processedData.length} records...`));
        }
        
        console.log(chalk.green(`✅ Successfully imported ${imported} attendance records!`));
        
        // Verify the import
        const count = await TenantAttendance.countDocuments({});
        console.log(chalk.blue(`📊 Total attendance records in database: ${count}`));
        
        // Show some statistics
        const stats = await TenantAttendance.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        console.log(chalk.cyan('\n📈 Attendance Statistics:'));
        stats.forEach(stat => {
            console.log(chalk.white(`   ${stat._id}: ${stat.count} records`));
        });
        
        // Close connection
        await tenantConnection.close();
        console.log(chalk.green('\n🎉 Attendance data import completed successfully!'));
        
    } catch (error) {
        console.error(chalk.red('❌ Error importing attendance data:'), error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the import
importAttendanceData();