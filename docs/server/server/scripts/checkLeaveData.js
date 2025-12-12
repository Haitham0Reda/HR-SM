import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Leave from '../modules/hr-core/vacations/models/leave.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

dotenv.config();

const checkLeaveData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Check leave records
        console.log('\n=== CHECKING LEAVE RECORDS (RAW) ===');
        const leavesRaw = await Leave.find().limit(5);
        leavesRaw.forEach(leave => {
            console.log('\nLeave ID:', leave._id);
            console.log('Leave Type:', leave.leaveType);
            console.log('Employee ID (raw):', leave.employee);
            console.log('Status:', leave.status);
        });

        console.log('\n\n=== CHECKING LEAVE RECORDS (POPULATED) ===');
        const leaves = await Leave.find()
            .populate('employee', 'username email employeeId personalInfo')
            .limit(5);
        
        leaves.forEach(leave => {
            console.log('\nLeave ID:', leave._id);
            console.log('Leave Type:', leave.leaveType);
            console.log('Employee Object:', JSON.stringify(leave.employee, null, 2));
        });

        // Count statistics
        const totalCount = await Leave.countDocuments();
        const withEmployee = await Leave.countDocuments({ employee: { $ne: null } });
        const withoutEmployee = await Leave.countDocuments({ employee: null });
        
        console.log('\n\n=== LEAVE STATISTICS ===');
        console.log('Total leave records:', totalCount);
        console.log('With employee:', withEmployee);
        console.log('Without employee (null):', withoutEmployee);

        // Check if employee IDs exist
        if (leavesRaw.length > 0 && leavesRaw[0].employee) {
            const firstEmployeeId = leavesRaw[0].employee;
            const foundUser = await User.findById(firstEmployeeId);
            console.log('\n\n=== CHECKING EMPLOYEE REFERENCE ===');
            console.log('First leave employee ID:', firstEmployeeId);
            console.log('User found:', foundUser ? 'YES' : 'NO');
            
            if (!foundUser) {
                console.log('\n⚠️ The employee ID in leave records does not exist!');
                console.log('Available user IDs (first 5):');
                const allUsers = await User.find({}, '_id username employeeId').limit(5);
                allUsers.forEach(u => {
                    console.log(`  - ${u._id} (${u.username} - ${u.employeeId})`);
                });
            }
        }

        await mongoose.connection.close();
        console.log('\n\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkLeaveData();
