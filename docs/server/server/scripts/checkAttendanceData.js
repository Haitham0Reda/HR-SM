import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

dotenv.config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Check users
        console.log('\n=== CHECKING USERS ===');
        const users = await User.find().limit(3);
        users.forEach(user => {
            console.log('\nUser:', user.username);
            console.log('Employee ID:', user.employeeId);
            console.log('PersonalInfo:', JSON.stringify(user.personalInfo, null, 2));
        });

        // Check attendance with populated employee
        console.log('\n\n=== CHECKING ATTENDANCE (RAW) ===');
        const attendancesRaw = await Attendance.find().limit(5);
        attendancesRaw.forEach(att => {
            console.log('\nAttendance ID:', att._id);
            console.log('Date:', att.date);
            console.log('Employee ID (raw):', att.employee);
            console.log('Status:', att.status);
        });

        console.log('\n\n=== CHECKING ATTENDANCE (POPULATED) ===');
        const attendances = await Attendance.find()
            .populate('employee', 'username email employeeId personalInfo')
            .limit(5);
        
        attendances.forEach(att => {
            console.log('\nAttendance ID:', att._id);
            console.log('Date:', att.date);
            console.log('Employee Object:', JSON.stringify(att.employee, null, 2));
        });

        // Count total attendance records
        const totalCount = await Attendance.countDocuments();
        const withEmployee = await Attendance.countDocuments({ employee: { $ne: null } });
        const withoutEmployee = await Attendance.countDocuments({ employee: null });
        
        console.log('\n\n=== ATTENDANCE STATISTICS ===');
        console.log('Total attendance records:', totalCount);
        console.log('With employee:', withEmployee);
        console.log('Without employee (null):', withoutEmployee);

        // Check if the employee ID exists
        console.log('\n\n=== CHECKING MISSING EMPLOYEE ===');
        const missingEmployeeId = '6929bca91ebf28372a03743b';
        const foundUser = await User.findById(missingEmployeeId);
        console.log('Looking for user ID:', missingEmployeeId);
        console.log('User found:', foundUser ? 'YES' : 'NO');
        
        if (!foundUser) {
            console.log('\n⚠️ The employee ID in attendance records does not exist!');
            console.log('Available user IDs:');
            const allUsers = await User.find({}, '_id username employeeId');
            allUsers.forEach(u => {
                console.log(`  - ${u._id} (${u.username} - ${u.employeeId})`);
            });
        }

        await mongoose.connection.close();
        console.log('\n\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkData();
