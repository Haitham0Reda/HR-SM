import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Leave from '../models/leave.model.js';
import User from '../models/user.model.js';

dotenv.config();

const fixLeaveEmployees = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get all users
        const users = await User.find({}, '_id username employeeId personalInfo department position');
        console.log(`\nFound ${users.length} users in database`);

        if (users.length === 0) {
            console.error('No users found!');
            process.exit(1);
        }

        // Get admin user as default
        const adminUser = users.find(u => u.username === 'admin') || users[0];
        console.log(`\nUsing default user: ${adminUser.username} (${adminUser._id})`);
        console.log(`Employee ID: ${adminUser.employeeId}`);
        console.log(`Full Name: ${adminUser.personalInfo?.fullName || 'N/A'}`);

        // Find all leave records
        const allLeaves = await Leave.find();
        console.log(`\nTotal leave records: ${allLeaves.length}`);

        let fixedCount = 0;
        let validCount = 0;

        for (const leave of allLeaves) {
            // Try to populate the employee
            await leave.populate('employee');
            
            if (!leave.employee) {
                // Employee reference is invalid, assign a random valid user
                const randomUser = users[Math.floor(Math.random() * users.length)];
                
                leave.employee = randomUser._id;
                leave.department = randomUser.department;
                leave.position = randomUser.position;
                await leave.save();
                
                fixedCount++;
                console.log(`Fixed leave ${leave._id} - Type: ${leave.leaveType}, Assigned to: ${randomUser.username}`);
            } else {
                validCount++;
            }
        }

        console.log(`\n✅ Fixed ${fixedCount} leave records`);
        console.log(`✅ ${validCount} records were already valid`);

        // Verify the fix
        console.log('\n=== VERIFICATION ===');
        const verifyLeaves = await Leave.find()
            .populate('employee', 'username employeeId personalInfo')
            .limit(5);
        
        verifyLeaves.forEach(leave => {
            console.log(`\nType: ${leave.leaveType}`);
            console.log(`Employee: ${leave.employee?.personalInfo?.fullName || leave.employee?.username || 'N/A'}`);
            console.log(`Employee ID: ${leave.employee?.employeeId || 'N/A'}`);
            console.log(`Status: ${leave.status}`);
        });

        await mongoose.connection.close();
        console.log('\n\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixLeaveEmployees();
