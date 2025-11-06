/**
 * Test Request Notifications
 * 
 * Simple test script to demonstrate the email notification functionality
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' }); // Adjust path to find .env file

import connectDB from '../config/db.js';
import Request from '../models/request.model.js';
import User from '../models/user.model.js';
import { sendPendingRequestReminders } from '../utils/pendingRequestReminder.js';

// Connect to database
connectDB();

async function testRequestNotifications() {
    try {
        console.log('🧪 Testing Request Notification System');
        
        // Wait a bit for database connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Find a test employee
        const employee = await User.findOne({ role: 'employee', isActive: true });
        if (!employee) {
            console.log('❌ No test employee found');
            return;
        }
        
        console.log(`✅ Found test employee: ${employee.username}`);
        
        // Create a test permission request
        console.log('📝 Creating test permission request...');
        const permissionRequest = new Request({
            employee: employee._id,
            type: 'permission',
            details: {
                date: new Date(),
                startTime: '09:00',
                endTime: '11:00',
                reason: 'Personal appointment'
            },
            status: 'pending'
        });
        
        await permissionRequest.save();
        await permissionRequest.populate('employee', 'username email profile department');
        
        console.log(`✅ Created permission request: ${permissionRequest._id}`);
        
        // Create a test sick leave request
        console.log('📝 Creating test sick leave request...');
        const sickLeaveRequest = new Request({
            employee: employee._id,
            type: 'sick-leave',
            details: {
                startDate: new Date(),
                endDate: new Date(new Date().setDate(new Date().getDate() + 2)),
                duration: 2,
                reason: 'Medical treatment'
            },
            status: 'pending'
        });
        
        await sickLeaveRequest.save();
        await sickLeaveRequest.populate('employee', 'username email profile department');
        
        console.log(`✅ Created sick leave request: ${sickLeaveRequest._id}`);
        
        // Create a test day swap request
        console.log('📝 Creating test day swap request...');
        const daySwapRequest = new Request({
            employee: employee._id,
            type: 'day-swap',
            details: {
                originalDate: new Date(),
                newDate: new Date(new Date().setDate(new Date().getDate() + 7)),
                reason: 'Personal commitment'
            },
            status: 'pending'
        });
        
        await daySwapRequest.save();
        await daySwapRequest.populate('employee', 'username email profile department');
        
        console.log(`✅ Created day swap request: ${daySwapRequest._id}`);
        
        // Test pending request reminders
        console.log('⏰ Testing pending request reminders...');
        await sendPendingRequestReminders();
        
        console.log('✅ Test completed successfully!');
        
        // Clean up test requests
        await Request.deleteMany({
            _id: {
                $in: [permissionRequest._id, sickLeaveRequest._id, daySwapRequest._id]
            }
        });
        
        console.log('🧹 Cleaned up test requests');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        mongoose.connection.close();
        console.log('🔒 Database connection closed');
    }
}

// Run the test
testRequestNotifications();