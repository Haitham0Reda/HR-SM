import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Leave from '../models/leave.model.js';
import User from '../models/user.model.js';

dotenv.config();

const checkUserLeaves = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get all users
        const users = await User.find({}, 'username employeeId personalInfo').limit(10);
        console.log('\n=== AVAILABLE USERS ===');
        users.forEach(u => {
            console.log(`${u.username} (${u.employeeId}) - ${u.personalInfo?.fullName || 'N/A'}`);
        });

        // Get all leaves with populated employee
        const leaves = await Leave.find()
            .populate('employee', 'username employeeId personalInfo')
            .sort({ createdAt: -1 });

        console.log('\n\n=== LEAVE RECORDS BY USER ===');
        console.log(`Total leaves: ${leaves.length}\n`);

        // Group by user
        const leavesByUser = {};
        leaves.forEach(leave => {
            const userId = leave.employee?._id?.toString() || 'unknown';
            const username = leave.employee?.username || 'Unknown User';
            const fullName = leave.employee?.personalInfo?.fullName || 'N/A';
            
            if (!leavesByUser[userId]) {
                leavesByUser[userId] = {
                    username,
                    fullName,
                    leaves: []
                };
            }
            leavesByUser[userId].leaves.push({
                type: leave.leaveType,
                status: leave.status,
                startDate: leave.startDate?.toISOString().split('T')[0]
            });
        });

        Object.entries(leavesByUser).forEach(([userId, data]) => {
            console.log(`\n${data.username} (${data.fullName}):`);
            data.leaves.forEach(l => {
                console.log(`  - ${l.type} (${l.status}) - ${l.startDate}`);
            });
        });

        await mongoose.connection.close();
        console.log('\n\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUserLeaves();
