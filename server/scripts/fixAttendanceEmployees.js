import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';

dotenv.config();

const fixAttendanceEmployees = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get the admin user (or first available user)
        const adminUser = await User.findOne({ username: 'admin' });
        
        if (!adminUser) {
            console.error('No admin user found!');
            process.exit(1);
        }

        console.log(`\nUsing user: ${adminUser.username} (${adminUser._id})`);
        console.log(`Employee ID: ${adminUser.employeeId}`);
        console.log(`Full Name: ${adminUser.personalInfo?.fullName || 'N/A'}`);

        // Find all attendance records with invalid employee references
        const allAttendances = await Attendance.find();
        console.log(`\nTotal attendance records: ${allAttendances.length}`);

        let fixedCount = 0;
        let validCount = 0;

        for (const attendance of allAttendances) {
            // Try to populate the employee
            await attendance.populate('employee');
            
            if (!attendance.employee) {
                // Employee reference is invalid, update it
                attendance.employee = adminUser._id;
                attendance.department = adminUser.department;
                attendance.position = adminUser.position;
                await attendance.save();
                fixedCount++;
                console.log(`Fixed attendance ${attendance._id} - Date: ${attendance.date.toISOString().split('T')[0]}`);
            } else {
                validCount++;
            }
        }

        console.log(`\n✅ Fixed ${fixedCount} attendance records`);
        console.log(`✅ ${validCount} records were already valid`);

        // Verify the fix
        console.log('\n=== VERIFICATION ===');
        const verifyAttendances = await Attendance.find()
            .populate('employee', 'username employeeId personalInfo')
            .limit(3);
        
        verifyAttendances.forEach(att => {
            console.log(`\nDate: ${att.date.toISOString().split('T')[0]}`);
            console.log(`Employee: ${att.employee?.personalInfo?.fullName || att.employee?.username || 'N/A'}`);
            console.log(`Employee ID: ${att.employee?.employeeId || 'N/A'}`);
        });

        await mongoose.connection.close();
        console.log('\n\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixAttendanceEmployees();
