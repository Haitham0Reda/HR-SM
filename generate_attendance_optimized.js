/**
 * Optimized Attendance Data Generation Script
 * Generates attendance records in small batches to prevent app freezing
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
        lateChance: 0.05,
        wfhChance: 0.1,
        overtimeChance: 0.3
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
        overtimeChance: 0.4
    },
    employee: {
        name: "Regular Employee", 
        avgArrival: "09:10",
        avgDeparture: "17:05",
        lateChance: 0.2,
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
    return day === 0 || day === 6;
}

function calculateHours(checkInTime, checkOutTime) {
    const checkIn = new Date(`2025-01-01T${checkInTime}:00.000Z`);
    const checkOut = new Date(`2025-01-01T${checkOutTime}:00.000Z`);
    
    if (checkOut < checkIn) {
        checkOut.setDate(checkOut.getDate() + 1);
    }
    
    return (checkOut - checkIn) / (1000 * 60 * 60);
}

function generateAttendanceRecord(user, date) {
    const pattern = USER_PATTERNS[user.role] || USER_PATTERNS.employee;
    const dateObj = new Date(date);
    
    if (isWeekend(dateObj)) {
        return null;
    }
    
    const isLate = Math.random() < pattern.lateChance;
    const isWFH = Math.random() < pattern.wfhChance;
    const hasOvertime = Math.random() < pattern.overtimeChance;
    
    let checkInTime = generateRandomTime(pattern.avgArrival, isLate ? 30 : 15);
    let checkOutTime = generateRandomTime(pattern.avgDeparture, hasOvertime ? 60 : 15);
    
    const [checkInHour, checkInMin] = checkInTime.split(':').map(Number);
    const actuallyLate = checkInHour > 9 || (checkInHour === 9 && checkInMin > 0);
    const lateMinutes = actuallyLate ? (checkInHour - 9) * 60 + checkInMin : 0;
    
    const actualHours = calculateHours(checkInTime, checkOutTime);
    const expectedHours = 8;
    const overtime = Math.max(0, actualHours - expectedHours);
    
    let status = 'on-time';
    if (isWFH) {
        status = 'work-from-home';
    } else if (actuallyLate) {
        status = 'late';
    }
    
    return {
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
}

// Sleep function to prevent blocking
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateOptimizedAttendance() {
    let tenantConnection;
    
    try {
        console.log(chalk.blue('🚀 Starting optimized attendance generation...'));
        
        // Get tenant database connection
        tenantConnection = await multiTenantDB.getCompanyConnection('techcorp_solutions');
        console.log(chalk.green('✅ Connected to techcorp_solutions database'));
        
        // Get models
        const TenantAttendance = tenantConnection.model('Attendance', Attendance.schema);
        const TenantUser = tenantConnection.model('User', User.schema);
        
        // Get all users
        const users = await TenantUser.find({}).select('_id employeeId email role personalInfo department position');
        console.log(chalk.yellow(`👥 Found ${users.length} users`));
        
        // Clear existing attendance data
        console.log(chalk.yellow('🧹 Clearing existing attendance data...'));
        await TenantAttendance.deleteMany({});
        
        // Create indexes for better performance
        console.log(chalk.yellow('📊 Creating database indexes...'));
        await TenantAttendance.collection.createIndex({ tenantId: 1, employee: 1, date: 1 }, { unique: true });
        await TenantAttendance.collection.createIndex({ tenantId: 1, date: 1 });
        await TenantAttendance.collection.createIndex({ tenantId: 1, status: 1 });
        
        let totalGenerated = 0;
        const batchSize = 10; // Small batch size to prevent blocking
        
        // Generate for January 2025 (31 days) - process day by day
        for (let day = 1; day <= 31; day++) {
            const date = `2025-01-${String(day).padStart(2, '0')}T00:00:00.000Z`;
            const dayRecords = [];
            
            // Generate records for all users for this day
            for (const user of users) {
                const record = generateAttendanceRecord(user, date);
                if (record) {
                    dayRecords.push(record);
                }
            }
            
            // Insert day's records in small batches
            if (dayRecords.length > 0) {
                for (let i = 0; i < dayRecords.length; i += batchSize) {
                    const batch = dayRecords.slice(i, i + batchSize);
                    await TenantAttendance.insertMany(batch);
                    totalGenerated += batch.length;
                    
                    // Small delay to prevent blocking
                    await sleep(10);
                }
                
                console.log(chalk.gray(`   Day ${day}: Generated ${dayRecords.length} records (Total: ${totalGenerated})`));
            }
            
            // Longer pause every 7 days
            if (day % 7 === 0) {
                console.log(chalk.blue(`   Week ${Math.ceil(day/7)} completed. Taking a short break...`));
                await sleep(100);
            }
        }
        
        console.log(chalk.green(`✅ Successfully generated ${totalGenerated} attendance records!`));
        
        // Generate summary statistics
        console.log(chalk.cyan('\n📈 Generating summary statistics...'));
        
        const stats = await TenantAttendance.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgHours: { $avg: '$hours.actual' }
                }
            }
        ]);
        
        console.log(chalk.white('Overall Statistics:'));
        stats.forEach(stat => {
            console.log(chalk.gray(`   ${stat._id}: ${stat.count} records (avg: ${stat.avgHours.toFixed(2)}h)`));
        });
        
        // User-specific statistics
        console.log(chalk.cyan('\n👥 User Statistics:'));
        for (const user of users) {
            const userStats = await TenantAttendance.aggregate([
                { $match: { employee: user._id } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalHours: { $sum: '$hours.actual' }
                    }
                }
            ]);
            
            const name = user.personalInfo?.firstName && user.personalInfo?.lastName 
                ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}`
                : user.email;
            
            const totalRecords = userStats.reduce((sum, s) => sum + s.count, 0);
            const totalHours = userStats.reduce((sum, s) => sum + s.totalHours, 0);
            
            console.log(chalk.white(`${user.employeeId} (${name}):`));
            console.log(chalk.gray(`   Total: ${totalRecords} records, ${totalHours.toFixed(2)} hours`));
            userStats.forEach(stat => {
                console.log(chalk.gray(`   ${stat._id}: ${stat.count} records`));
            });
        }
        
        console.log(chalk.green('\n🎉 Optimized attendance generation completed successfully!'));
        
    } catch (error) {
        console.error(chalk.red('❌ Error generating attendance data:'), error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (tenantConnection) {
            await tenantConnection.close();
        }
    }
}

// Run the optimized generation
generateOptimizedAttendance();