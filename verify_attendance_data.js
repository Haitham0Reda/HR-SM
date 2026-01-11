/**
 * Verify Attendance Data Script
 * Verifies that attendance records are properly linked to users
 */

import mongoose from 'mongoose';
import multiTenantDB from './server/config/multiTenant.js';
import Attendance from './server/modules/hr-core/attendance/models/attendance.model.js';
import User from './server/modules/hr-core/users/models/user.model.js';
import chalk from 'chalk';

async function verifyAttendanceData() {
    try {
        console.log(chalk.blue('🔍 Verifying attendance data...'));
        
        // Get tenant database connection
        const tenantConnection = await multiTenantDB.getCompanyConnection('techcorp_solutions');
        console.log(chalk.green('✅ Connected to techcorp_solutions database'));
        
        // Get models for this tenant
        const TenantAttendance = tenantConnection.model('Attendance', Attendance.schema);
        const TenantUser = tenantConnection.model('User', User.schema);
        
        // Get all users
        const users = await TenantUser.find({}).select('employeeId email personalInfo.firstName personalInfo.lastName');
        console.log(chalk.yellow(`👥 Found ${users.length} users in database`));
        
        // Check attendance for each user
        for (const user of users) {
            const attendanceCount = await TenantAttendance.countDocuments({ employee: user._id });
            const name = user.personalInfo?.firstName && user.personalInfo?.lastName 
                ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}`
                : user.email;
            
            console.log(chalk.white(`   ${user.employeeId} (${name}): ${attendanceCount} attendance records`));
            
            if (attendanceCount > 0) {
                // Show some sample records
                const sampleRecords = await TenantAttendance.find({ employee: user._id })
                    .limit(3)
                    .select('date status hours.actual checkIn.time checkOut.time')
                    .sort({ date: 1 });
                
                sampleRecords.forEach(record => {
                    const date = record.date.toISOString().split('T')[0];
                    const checkIn = record.checkIn.time ? record.checkIn.time.toTimeString().split(' ')[0] : 'N/A';
                    const checkOut = record.checkOut.time ? record.checkOut.time.toTimeString().split(' ')[0] : 'N/A';
                    console.log(chalk.gray(`     ${date}: ${record.status} (${checkIn} - ${checkOut}) ${record.hours.actual}h`));
                });
            }
        }
        
        // Overall statistics
        console.log(chalk.cyan('\n📊 Overall Statistics:'));
        const totalRecords = await TenantAttendance.countDocuments({});
        const statusStats = await TenantAttendance.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgHours: { $avg: '$hours.actual' }
                }
            }
        ]);
        
        console.log(chalk.white(`Total Records: ${totalRecords}`));
        statusStats.forEach(stat => {
            console.log(chalk.white(`${stat._id}: ${stat.count} records (avg: ${stat.avgHours.toFixed(2)}h)`));
        });
        
        // Date range
        const dateRange = await TenantAttendance.aggregate([
            {
                $group: {
                    _id: null,
                    minDate: { $min: '$date' },
                    maxDate: { $max: '$date' }
                }
            }
        ]);
        
        if (dateRange.length > 0) {
            const minDate = dateRange[0].minDate.toISOString().split('T')[0];
            const maxDate = dateRange[0].maxDate.toISOString().split('T')[0];
            console.log(chalk.white(`Date Range: ${minDate} to ${maxDate}`));
        }
        
        // Close connection
        await tenantConnection.close();
        console.log(chalk.green('\n✅ Verification completed!'));
        
    } catch (error) {
        console.error(chalk.red('❌ Error verifying attendance data:'), error.message);
        process.exit(1);
    }
}

// Run the verification
verifyAttendanceData();