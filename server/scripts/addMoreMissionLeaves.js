import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Leave from '../models/leave.model.js';
import User from '../models/user.model.js';
import Department from '../models/department.model.js';
import Position from '../models/position.model.js';

dotenv.config();

const addMoreMissionLeaves = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get some employees
        const employees = await User.find({ 
            username: { $in: ['hr.manager', 'finance.manager', 'it.manager'] }
        }).populate('department').populate('position');

        console.log(`\nFound ${employees.length} employees`);

        const missionLeaves = [];

        for (const employee of employees) {
            const missionLeave = new Leave({
                employee: employee._id,
                department: employee.department?._id,
                position: employee.position?._id,
                leaveType: 'mission',
                startDate: new Date('2025-12-20'),
                endDate: new Date('2025-12-22'),
                duration: 3,
                totalDays: 3,
                status: 'pending',
                reason: `Business trip for ${employee.username}`,
                mission: {
                    location: 'Branch Office',
                    purpose: 'Team coordination and planning',
                    transportationMode: 'car',
                    accommodationRequired: true,
                    estimatedCost: 3000
                }
            });

            await missionLeave.save();
            missionLeaves.push(missionLeave);
            console.log(`✅ Created mission leave for: ${employee.username} (${employee.personalInfo?.fullName || 'N/A'})`);
        }

        console.log(`\n✅ Total mission leaves created: ${missionLeaves.length}`);

        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

addMoreMissionLeaves();
