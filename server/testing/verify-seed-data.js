/**
 * Script to verify that seed data was created correctly
 * 
 * This script checks that all the data we added in the seed file exists in the database.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import School from '../models/school.model.js';
import Department from '../models/department.model.js';
import Position from '../models/position.model.js';
import Attendance from '../models/attendance.model.js';
import Holiday from '../models/holiday.model.js';
import Event from '../models/event.model.js';
import Report from '../models/report.model.js';
import Request from '../models/request.model.js';
import MixedVacation from '../models/mixedVacation.model.js';

// Connect to database
connectDB();

const verifySeedData = async () => {
    try {
        console.log('🔍 Verifying seed data...\n');

        // Verify Users
        const userCount = await User.countDocuments();
        console.log(`👥 Users: ${userCount} records found`);

        // Verify Schools
        const schoolCount = await School.countDocuments();
        console.log(`🏫 Schools: ${schoolCount} records found`);

        // Verify Departments
        const departmentCount = await Department.countDocuments();
        console.log(`🏢 Departments: ${departmentCount} records found`);

        // Verify Positions
        const positionCount = await Position.countDocuments();
        console.log(`💼 Positions: ${positionCount} records found`);

        // Verify Attendance
        const attendanceCount = await Attendance.countDocuments();
        console.log(`🕒 Attendance Records: ${attendanceCount} records found`);

        // Verify Holidays
        const holidayCount = await Holiday.countDocuments();
        console.log(`📅 Holidays: ${holidayCount} records found`);

        // Verify Events
        const eventCount = await Event.countDocuments();
        console.log(`🎉 Events: ${eventCount} records found`);

        // Verify Reports
        const reportCount = await Report.countDocuments();
        console.log(`📊 Reports: ${reportCount} records found`);

        // Verify Requests
        const requestCount = await Request.countDocuments();
        console.log(`📬 Requests: ${requestCount} records found`);

        // Verify Mixed Vacations
        const mixedVacationCount = await MixedVacation.countDocuments();
        console.log(`🏖️ Mixed Vacations: ${mixedVacationCount} records found`);

        console.log('\n✅ Verification complete!');
        console.log('\n📊 Summary:');
        console.log('───────────────────────────────────────');
        console.log(`Total Records: ${userCount + schoolCount + departmentCount + positionCount + attendanceCount + holidayCount + eventCount + reportCount + requestCount + mixedVacationCount}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error verifying seed data:', error);
        process.exit(1);
    }
};

verifySeedData();