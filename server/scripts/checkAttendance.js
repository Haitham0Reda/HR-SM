import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';

dotenv.config();

const checkAttendance = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Get all users
        const users = await User.find().select('username email employeeId role profile');
        console.log(`\nTotal Users: ${users.length}`);
        users.forEach(u => {
            console.log(`  ${u.username} (${u.email}) - ${u.role}`);
            console.log(`    Profile: firstName="${u.profile?.firstName || 'N/A'}", lastName="${u.profile?.lastName || 'N/A'}"`);
        });

        // Get all attendance records
        const attendances = await Attendance.find()
            .populate('employee', 'username email employeeId profile')
            .sort({ date: -1 });

        console.log(`\n\nTotal Attendance Records: ${attendances.length}`);

        if (attendances.length === 0) {
            console.log('\n⚠️  No attendance records found in the database.');
        } else {
            console.log('\nAttendance Records:');
            attendances.forEach((att, index) => {
                console.log(`\n${index + 1}. Employee: ${att.employee?.name || 'Unknown'} (${att.employee?.email || 'N/A'})`);
                console.log(`   Date: ${att.date?.toLocaleDateString() || 'N/A'}`);
                console.log(`   Check In: ${att.checkIn?.time || 'N/A'}`);
                console.log(`   Check Out: ${att.checkOut?.time || 'N/A'}`);
                console.log(`   Status: ${att.status || 'N/A'}`);
                console.log(`   Notes: ${att.notes || 'None'}`);
            });
        }

        // Group by employee
        const byEmployee = {};
        attendances.forEach(att => {
            const empId = att.employee?._id?.toString() || 'unknown';
            if (!byEmployee[empId]) {
                byEmployee[empId] = {
                    name: att.employee?.name || 'Unknown',
                    email: att.employee?.email || 'N/A',
                    count: 0
                };
            }
            byEmployee[empId].count++;
        });

        console.log('\n\nAttendance Summary by Employee:');
        Object.values(byEmployee).forEach(emp => {
            console.log(`  ${emp.name} (${emp.email}): ${emp.count} records`);
        });

        await mongoose.connection.close();
        console.log('\n\nDatabase connection closed.');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAttendance();
