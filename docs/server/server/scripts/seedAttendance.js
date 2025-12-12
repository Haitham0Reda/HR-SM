// Seed Attendance Data for All Users (2 Months)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Position from '../modules/hr-core/users/models/position.model.js';
import { getHolidayInfo } from '../utils/holidayChecker.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-system';

// Configuration
const MONTHS_TO_SEED = 2; // Number of months to seed
const CHECK_IN_TIME = '09:00'; // Default check-in time
const CHECK_OUT_TIME = '17:00'; // Default check-out time

/**
 * Generate a random time variation (±30 minutes)
 */
const getRandomTimeVariation = (baseTime, maxVariationMinutes = 30) => {
    const [hours, minutes] = baseTime.split(':').map(Number);
    const variation = Math.floor(Math.random() * (maxVariationMinutes * 2 + 1)) - maxVariationMinutes;
    const totalMinutes = hours * 60 + minutes + variation;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
};

/**
 * Generate attendance status based on probability
 */
const generateAttendanceStatus = () => {
    const random = Math.random();
    if (random < 0.85) return 'present'; // 85% present
    if (random < 0.90) return 'late'; // 5% late
    if (random < 0.95) return 'work-from-home'; // 5% work from home
    return 'absent'; // 5% absent
};

/**
 * Seed attendance data
 */
const seedAttendance = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all active users
        console.log('👥 Fetching active users...');
        const users = await User.find({ status: 'active' })
            .select('_id username employeeId department position')
            .populate('department', '_id name')
            .populate('position', '_id title');

        if (users.length === 0) {
            console.log('⚠️  No active users found. Please create users first.');
            process.exit(0);
        }

        console.log(`✅ Found ${users.length} active users`);

        // Calculate date range (last 2 months)
        const endDate = new Date();
        endDate.setHours(0, 0, 0, 0);
        
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - MONTHS_TO_SEED);
        startDate.setHours(0, 0, 0, 0);

        console.log(`📅 Generating attendance from ${startDate.toDateString()} to ${endDate.toDateString()}`);

        // Generate dates array
        const dates = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate).toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log(`📊 Total days: ${dates.length}`);

        // Clear existing attendance for this period
        console.log('🗑️  Clearing existing attendance records for this period...');
        await Attendance.deleteMany({
            date: { $gte: startDate, $lte: endDate }
        });

        // Generate attendance records
        let totalRecords = 0;
        let workingDays = 0;
        let holidays = 0;

        console.log('📝 Generating attendance records...');
        
        for (const date of dates) {
            // Check if it's a holiday or weekend
            const holidayInfo = getHolidayInfo(date);
            const isHoliday = holidayInfo.isWeekend || holidayInfo.isHoliday;

            if (isHoliday) {
                holidays++;
            } else {
                workingDays++;
            }

            for (const user of users) {
                const attendanceData = {
                    employee: user._id,
                    department: user.department?._id,
                    position: user.position?._id,
                    date: date,
                };

                if (isHoliday) {
                    // Holiday - mark as absent with note
                    attendanceData.status = 'absent';
                    attendanceData.notes = holidayInfo.note || 'Official Holiday';
                    attendanceData.isWorkingDay = false;
                } else {
                    // Working day - generate realistic attendance
                    const status = generateAttendanceStatus();
                    attendanceData.status = status;
                    attendanceData.isWorkingDay = true;

                    if (status !== 'absent') {
                        // Add check-in time with variation
                        const checkInTime = status === 'late' 
                            ? getRandomTimeVariation(CHECK_IN_TIME, 60) // Late: up to 1 hour late
                            : getRandomTimeVariation(CHECK_IN_TIME, 15); // On time: ±15 minutes
                        
                        const checkInDateTime = new Date(`${date}T${checkInTime}`);
                        attendanceData.checkIn = {
                            time: checkInDateTime,
                            method: status === 'work-from-home' ? 'wfh' : 'manual',
                            location: status === 'work-from-home' ? 'home' : 'office',
                            isLate: status === 'late',
                            lateMinutes: status === 'late' ? Math.floor(Math.random() * 60) + 1 : 0
                        };

                        // Add check-out time with variation
                        const checkOutTime = getRandomTimeVariation(CHECK_OUT_TIME, 30);
                        const checkOutDateTime = new Date(`${date}T${checkOutTime}`);
                        attendanceData.checkOut = {
                            time: checkOutDateTime,
                            method: status === 'work-from-home' ? 'wfh' : 'manual',
                            location: status === 'work-from-home' ? 'home' : 'office',
                            isEarly: false,
                            earlyMinutes: 0
                        };

                        // Calculate working hours
                        const hoursWorked = (checkOutDateTime - checkInDateTime) / (1000 * 60 * 60);
                        attendanceData.hours = {
                            actual: Math.round(hoursWorked * 100) / 100,
                            expected: 8,
                            overtime: Math.max(0, hoursWorked - 8),
                            workFromHome: status === 'work-from-home' ? hoursWorked : 0,
                            totalHours: hoursWorked
                        };

                        // Work from home flag
                        if (status === 'work-from-home') {
                            attendanceData.workFromHome = {
                                isWFH: true,
                                approved: true,
                                reason: 'Remote work'
                            };
                        }
                    } else {
                        // Absent - add random reason
                        const reasons = ['Sick', 'Personal emergency', 'Family matter', 'Unexcused'];
                        attendanceData.notes = reasons[Math.floor(Math.random() * reasons.length)];
                    }
                }

                // Create attendance record
                const attendance = new Attendance(attendanceData);
                await attendance.save();
                totalRecords++;
            }

            // Progress indicator
            if (totalRecords % 100 === 0) {
                process.stdout.write(`\r📝 Created ${totalRecords} records...`);
            }
        }

        console.log(`\n\n✅ Attendance seeding completed!`);
        console.log(`📊 Statistics:`);
        console.log(`   - Total records created: ${totalRecords}`);
        console.log(`   - Total users: ${users.length}`);
        console.log(`   - Total days: ${dates.length}`);
        console.log(`   - Working days: ${workingDays}`);
        console.log(`   - Holidays/Weekends: ${holidays}`);
        console.log(`   - Records per user: ${totalRecords / users.length}`);

    } catch (error) {
        console.error('❌ Error seeding attendance:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
};

// Run the seeder
seedAttendance();
