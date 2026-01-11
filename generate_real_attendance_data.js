/**
 * Generate Real Attendance Data Script
 * Creates attendance records using actual user IDs from the database
 */

import mongoose from 'mongoose';
import multiTenantDB from './server/config/multiTenant.js';
import Attendance from './server/modules/hr-core/attendance/models/attendance.model.js';
import User from './server/modules/hr-core/users/models/user.model.js';
import chalk from 'chalk';

// User patterns for realistic attendance
const USER_PATTERNS = {
    admin: {
        name: "System Administrator",
        avgArrival: "08:45",
        avgDeparture: "17:30",
        lateChance: 0.05, // 5% chance of being late
        wfhChance: 0.1,   // 10% chance of WFH
        overtimeChance: 0.3 // 30% chance of overtime
    },
    hr: {
        name: "HR Manager",
        avgArrival: "09:00",
        avgDeparture: "17:00", 
        lateChance: 0.1,
        wfhChance: 0.15,
        overtimeChance: 0.2
    },
    manager: {
        name: "Financial Manager",
        avgArrival: "08:50",
        avgDeparture: "18:00",
        lateChance: 0.08,
        wfhChance: 0.12,
        overtimeChance: 0.4 // Finance works more overtime
    },
    employee: {
        name: "Regular Employee", 
        avgArrival: "09:10",
        avgDeparture: "17:05",
        lateChance: 0.2, // 20% chance of being late
        wfhChance: 0.08,
        overtimeChance: 0.15
    }
};

function generateRandomTime(baseTime, varianceMinutes = 15) {
    const [hours, minutes] = baseTime.split(':').map(Number);
    const baseMinutes = hours * 60 + minutes;
    const variance = Math.floor(Math.random() * (varianceMinutes * 2)) - varianceMinutes;
    const newMinutes = baseMinutes + variance;
    
    const newHours = Math.floor(newMinutes / 60);
    const newMins = newMinutes % 60;
    
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
}

function calculateHours(checkInTime, checkOutTime) {
    const checkIn = new Date(`2025-01-01T${checkInTime}:00.000Z`);
    const checkOut = new Date(`2025-01-01T${checkOutTime}:00.000Z`);
    
    // Handle next day checkout
    if (checkOut < checkIn) {
        checkOut.setDate(checkOut.getDate() + 1);
    }
    
    return (checkOut - checkIn) / (1000 * 60 * 60); // Convert to hours
}

function generateAttendanceRecord(user, date) {
    const pattern = USER_PATTERNS[user.role] || USER_PATTERNS.employee;
    const dateObj = new Date(date);
    
    // Skip weekends
    if (isWeekend(dateObj)) {
        return null;
    }
    
    const isLate = Math.random() < pattern.lateChance;
    const isWFH = Math.random() < pattern.wfhChance;
    const hasOvertime = Math.random() < pattern.overtimeChance;
    
    // Generate check-in time
    let checkInTime = generateRandomTime(pattern.avgArrival, isLate ? 30 : 15);
    let checkOutTime = generateRandomTime(pattern.avgDeparture, hasOvertime ? 60 : 15);
    
    // Calculate if actually late (after 9:00)
    const [checkInHour, checkInMin] = checkInTime.split(':').map(Number);
    const actuallyLate = checkInHour > 9 || (checkInHour === 9 && checkInMin > 0);
    const lateMinutes = actuallyLate ? (checkInHour - 9) * 60 + checkInMin : 0;
    
    // Calculate hours
    const actualHours = calculateHours(checkInTime, checkOutTime);
    const expectedHours = 8;
    const overtime = Math.max(0, actualHours - expectedHours);
    
    // Determine status
    let status = 'on-time';
    if (isWFH) {
        status = 'work-from-home';
    } else if (actuallyLate) {
        status = 'late';
    }
    
    const record = {
        tenantId: "techcorp_solutions",
        employee: user._id,
        department: user.department,
        position: user.position,
        date: new Date(date),
        schedule: {
            startTime: "09:00",
            endTime: "17:00", 
            expectedHours: 8
        },
        checkIn: {
            time: new Date(`${date.split('T')[0]}T${checkInTime}:00.000Z`),
            method: isWFH ? "manual" : "biometric",
            location: isWFH ? "home" : "office",
            isLate: actuallyLate,
            lateMinutes: lateMinutes
        },
        checkOut: {
            time: new Date(`${date.split('T')[0]}T${checkOutTime}:00.000Z`),
            method: isWFH ? "manual" : "biometric", 
            location: isWFH ? "home" : "office",
            isEarly: false,
            earlyMinutes: 0
        },
        hours: {
            actual: Math.round(actualHours * 100) / 100,
            expected: expectedHours,
            overtime: Math.round(overtime * 100) / 100,
            workFromHome: isWFH ? Math.round(actualHours * 100) / 100 : 0,
            totalHours: Math.round(actualHours * 100) / 100
        },
        workFromHome: {
            isWFH: isWFH,
            approved: isWFH,
            reason: isWFH ? "Remote work approved" : ""
        },
        status: status,
        flags: {
            isLate: actuallyLate,
            isEarlyDeparture: false,
            isMissing: false,
            needsApproval: false
        },
        notes: `${pattern.name} - ${status === 'work-from-home' ? 'Working from home' : status === 'late' ? `Arrived ${lateMinutes} minutes late` : 'Regular attendance'}`,
        isWorkingDay: true,
        autoGenerated: false,
        source: isWFH ? "manual" : "biometric"
    };
    
    return record;
}

async function generateAndImportAttendance() {
    try {
        console.log(chalk.blue('🚀 Generating and importing real attendance data...'));
        
        // Get tenant database connection
        const tenantConnection = await multiTenantDB.getCompanyConnection('techcorp_solutions');
        console.log(chalk.green('✅ Connected to techcorp_solutions database'));
        
        // Get models for this tenant
        const TenantAttendance = tenantConnection.model('Attendance', Attendance.schema);
        const TenantUser = tenantConnection.model('User', User.schema);
        
        // Get all users
        const users = await TenantUser.find({}).select('_id employeeId email role personalInfo department position');
        console.log(chalk.yellow(`👥 Found ${users.length} users`));
        
        // Clear existing attendance data
        console.log(chalk.yellow('🧹 Clearing existing attendance data...'));
        await TenantAttendance.deleteMany({});
        
        const attendanceRecords = [];
        
        // Generate for January 2025 (31 days)
        for (let day = 1; day <= 31; day++) {
            const date = `2025-01-${String(day).padStart(2, '0')}T00:00:00.000Z`;
            
            // Generate for each user
            for (const user of users) {
                const record = generateAttendanceRecord(user, date);
                if (record) {
                    attendanceRecords.push(record);
                }
            }
        }
        
        console.log(chalk.yellow(`📊 Generated ${attendanceRecords.length} attendance records`));
        
        // Insert attendance records in batches
        console.log(chalk.yellow('📥 Inserting attendance records...'));
        const batchSize = 50;
        let imported = 0;
        
        for (let i = 0; i < attendanceRecords.length; i += batchSize) {
            const batch = attendanceRecords.slice(i, i + batchSize);
            await TenantAttendance.insertMany(batch);
            imported += batch.length;
            console.log(chalk.gray(`   Imported ${imported}/${attendanceRecords.length} records...`));
        }
        
        console.log(chalk.green(`✅ Successfully imported ${imported} attendance records!`));
        
        // Show statistics by user
        console.log(chalk.cyan('\n📈 Attendance Statistics by User:'));
        for (const user of users) {
            const userRecords = await TenantAttendance.find({ employee: user._id });
            const totalHours = userRecords.reduce((sum, r) => sum + r.hours.actual, 0);
            const lateCount = userRecords.filter(r => r.status === 'late').length;
            const wfhCount = userRecords.filter(r => r.status === 'work-from-home').length;
            
            const name = user.personalInfo?.firstName && user.personalInfo?.lastName 
                ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}`
                : user.email;
            
            console.log(chalk.white(`${user.employeeId} (${name}):`));
            console.log(chalk.gray(`   Records: ${userRecords.length}, Hours: ${totalHours.toFixed(2)}, Late: ${lateCount}, WFH: ${wfhCount}`));
        }
        
        // Close connection
        await tenantConnection.close();
        console.log(chalk.green('\n🎉 Real attendance data generation completed!'));
        
    } catch (error) {
        console.error(chalk.red('❌ Error generating attendance data:'), error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the generation
generateAndImportAttendance();