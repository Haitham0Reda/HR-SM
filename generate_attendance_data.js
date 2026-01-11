/**
 * Generate Attendance Data for TechCorp Solutions Users
 * Creates one month of attendance records for January 2025
 */

import fs from 'fs';
import { ObjectId } from 'mongodb';

// User IDs for techcorp_solutions
const USERS = {
    admin: "695f7c072d5a3c68e594d0f1",
    hrManager: "695f7c072d5a3c68e594d0f2", 
    financeManager: "695f7c072d5a3c68e594d0f3",
    employee: "695f7c072d5a3c68e594d0f4"
};

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
    hrManager: {
        name: "HR Manager",
        avgArrival: "09:00",
        avgDeparture: "17:00", 
        lateChance: 0.1,
        wfhChance: 0.15,
        overtimeChance: 0.2
    },
    financeManager: {
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

function generateAttendanceRecord(userId, userKey, date, recordId) {
    const pattern = USER_PATTERNS[userKey];
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
        _id: { $oid: recordId },
        tenantId: "techcorp_solutions",
        employee: { $oid: userId },
        department: null,
        position: null,
        date: date,
        schedule: {
            startTime: "09:00",
            endTime: "17:00", 
            expectedHours: 8
        },
        checkIn: {
            time: `${date.split('T')[0]}T${checkInTime}:00.000Z`,
            method: isWFH ? "manual" : "biometric",
            location: isWFH ? "home" : "office",
            isLate: actuallyLate,
            lateMinutes: lateMinutes
        },
        checkOut: {
            time: `${date.split('T')[0]}T${checkOutTime}:00.000Z`,
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
        source: isWFH ? "manual" : "biometric",
        createdAt: `${date.split('T')[0]}T${checkInTime}:00.000Z`,
        updatedAt: `${date.split('T')[0]}T${checkOutTime}:00.000Z`
    };
    
    return record;
}

function generateMonthlyAttendance() {
    const attendanceRecords = [];
    let recordCounter = 0x675f7c072d5a3c68e594d100; // Starting ObjectId counter
    
    // Generate for January 2025 (31 days)
    for (let day = 1; day <= 31; day++) {
        const date = `2025-01-${String(day).padStart(2, '0')}T00:00:00.000Z`;
        
        // Generate for each user
        Object.entries(USERS).forEach(([userKey, userId]) => {
            const recordId = recordCounter.toString(16).padStart(24, '0');
            const record = generateAttendanceRecord(userId, userKey, date, recordId);
            
            if (record) {
                attendanceRecords.push(record);
            }
            recordCounter++;
        });
    }
    
    return attendanceRecords;
}

// Generate the data
const attendanceData = generateMonthlyAttendance();

// Write to JSON file
fs.writeFileSync('techcorp_attendance_january_2025.json', JSON.stringify(attendanceData, null, 2));

console.log(`Generated ${attendanceData.length} attendance records for January 2025`);
console.log('File saved as: techcorp_attendance_january_2025.json');

// Generate summary
const summary = {};
Object.keys(USERS).forEach(userKey => {
    const userRecords = attendanceData.filter(r => r.employee.$oid === USERS[userKey]);
    const totalHours = userRecords.reduce((sum, r) => sum + r.hours.actual, 0);
    const lateCount = userRecords.filter(r => r.status === 'late').length;
    const wfhCount = userRecords.filter(r => r.status === 'work-from-home').length;
    
    summary[userKey] = {
        totalRecords: userRecords.length,
        totalHours: Math.round(totalHours * 100) / 100,
        lateDays: lateCount,
        wfhDays: wfhCount,
        avgHoursPerDay: Math.round((totalHours / userRecords.length) * 100) / 100
    };
});

console.log('\nAttendance Summary:');
console.log(JSON.stringify(summary, null, 2));