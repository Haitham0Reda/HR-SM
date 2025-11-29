import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Leave from '../models/leave.model.js';
import User from '../models/user.model.js';
import Department from '../models/department.model.js';
import Position from '../models/position.model.js';

dotenv.config();

const addSampleLeaves = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get admin user
        const adminUser = await User.findOne({ username: 'admin' })
            .populate('department')
            .populate('position');

        if (!adminUser) {
            console.error('Admin user not found!');
            process.exit(1);
        }

        console.log(`\nAdding leaves for: ${adminUser.username}`);
        console.log(`Employee ID: ${adminUser.employeeId}`);
        console.log(`Full Name: ${adminUser.personalInfo?.fullName || 'N/A'}`);

        // Create a mission leave
        const missionLeave = new Leave({
            employee: adminUser._id,
            department: adminUser.department?._id,
            position: adminUser.position?._id,
            leaveType: 'mission',
            startDate: new Date('2025-12-15'),
            endDate: new Date('2025-12-17'),
            duration: 3,
            totalDays: 3,
            status: 'pending',
            reason: 'Business trip to regional office for project coordination',
            mission: {
                location: 'Regional Office - Cairo',
                purpose: 'Project coordination and team meeting',
                transportationMode: 'car',
                accommodationRequired: true,
                estimatedCost: 5000
            }
        });

        await missionLeave.save();
        console.log('\n✅ Created mission leave:', missionLeave._id);

        // Create a sick leave
        const sickLeave = new Leave({
            employee: adminUser._id,
            department: adminUser.department?._id,
            position: adminUser.position?._id,
            leaveType: 'sick',
            startDate: new Date('2025-11-25'),
            endDate: new Date('2025-11-26'),
            duration: 2,
            totalDays: 2,
            status: 'pending',
            reason: 'Medical checkup and recovery',
            medicalDocumentation: {
                required: true,
                provided: false,
                doctorReviewRequired: true
            },
            workflow: {
                currentStep: 'doctor-review',
                steps: [
                    {
                        step: 'doctor-review',
                        status: 'pending',
                        timestamp: new Date()
                    }
                ]
            }
        });

        await sickLeave.save();
        console.log('✅ Created sick leave:', sickLeave._id);

        // Verify
        console.log('\n=== VERIFICATION ===');
        const userLeaves = await Leave.find({ employee: adminUser._id })
            .populate('employee', 'username employeeId personalInfo');

        console.log(`\nTotal leaves for ${adminUser.username}: ${userLeaves.length}`);
        userLeaves.forEach(leave => {
            console.log(`\n- Type: ${leave.leaveType}`);
            console.log(`  Status: ${leave.status}`);
            console.log(`  Start: ${leave.startDate?.toISOString().split('T')[0]}`);
            console.log(`  End: ${leave.endDate?.toISOString().split('T')[0]}`);
            console.log(`  Employee: ${leave.employee?.personalInfo?.fullName || leave.employee?.username}`);
        });

        await mongoose.connection.close();
        console.log('\n\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

addSampleLeaves();
