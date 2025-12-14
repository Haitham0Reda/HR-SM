import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🔍 Verifying TechCorp Attendance Data...');

// Simple attendance schema
const attendanceSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    status: { type: String },
    checkIn: {
        time: Date,
        method: String,
        location: String,
        isLate: Boolean,
        lateMinutes: Number
    },
    checkOut: {
        time: Date,
        method: String,
        location: String,
        isEarly: Boolean,
        earlyMinutes: Number
    },
    hours: {
        actual: Number,
        expected: Number,
        overtime: Number,
        workFromHome: Number,
        totalHours: Number
    },
    workFromHome: {
        isWFH: Boolean,
        approved: Boolean,
        reason: String
    }
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// User schema
const userSchema = new mongoose.Schema({
    tenantId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    employeeId: { type: String, required: true },
    personalInfo: {
        firstName: String,
        lastName: String
    }
});

const User = mongoose.model('User', userSchema);

// Company schema
const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

const Company = mongoose.model('Company', companySchema, 'platform_companies');

/**
 * Verify TechCorp attendance data
 */
async function verifyTechCorpAttendance() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find TechCorp Solutions company
        const company = await Company.findOne({ slug: 'techcorp_solutions' });
        if (!company) {
            throw new Error('TechCorp Solutions company not found');
        }

        console.log(`\n🏢 TechCorp Solutions Company:`);
        console.log(`  ID: ${company._id}`);
        console.log(`  Name: ${company.name}`);

        // Find all users for TechCorp Solutions
        const users = await User.find({
            tenantId: company._id.toString()
        });

        console.log(`\n👥 Found ${users.length} users for TechCorp Solutions`);

        // Get attendance statistics
        const totalAttendance = await Attendance.countDocuments({
            tenantId: company._id.toString()
        });

        console.log(`\n📊 Total Attendance Records: ${totalAttendance}`);

        // Get attendance by status
        const statusStats = await Attendance.aggregate([
            {
                $match: {
                    tenantId: company._id.toString()
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalHours: { $sum: '$hours.totalHours' },
                    avgHours: { $avg: '$hours.totalHours' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        console.log(`\n📈 Attendance by Status:`);
        statusStats.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} records (${stat.totalHours.toFixed(1)} total hours, ${stat.avgHours.toFixed(1)} avg hours)`);
        });

        // Get attendance by employee
        const employeeStats = await Attendance.aggregate([
            {
                $match: {
                    tenantId: company._id.toString()
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'employee',
                    foreignField: '_id',
                    as: 'employeeInfo'
                }
            },
            {
                $unwind: '$employeeInfo'
            },
            {
                $group: {
                    _id: '$employee',
                    employeeId: { $first: '$employeeInfo.employeeId' },
                    firstName: { $first: '$employeeInfo.personalInfo.firstName' },
                    lastName: { $first: '$employeeInfo.personalInfo.lastName' },
                    totalRecords: { $sum: 1 },
                    totalHours: { $sum: '$hours.totalHours' },
                    avgHours: { $avg: '$hours.totalHours' },
                    presentDays: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['on-time', 'late', 'early-departure', 'present', 'work-from-home']] },
                                1,
                                0
                            ]
                        }
                    },
                    absentDays: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
                        }
                    },
                    lateDays: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
                        }
                    },
                    wfhDays: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'work-from-home'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { employeeId: 1 }
            }
        ]);

        console.log(`\n👤 Attendance by Employee:`);
        employeeStats.forEach(stat => {
            const name = `${stat.firstName || 'Unknown'} ${stat.lastName || ''}`.trim();
            console.log(`  ${stat.employeeId} (${name}):`);
            console.log(`    Total Records: ${stat.totalRecords}`);
            console.log(`    Present Days: ${stat.presentDays}`);
            console.log(`    Absent Days: ${stat.absentDays}`);
            console.log(`    Late Days: ${stat.lateDays}`);
            console.log(`    WFH Days: ${stat.wfhDays}`);
            console.log(`    Total Hours: ${stat.totalHours.toFixed(1)}`);
            console.log(`    Avg Hours/Day: ${stat.avgHours.toFixed(1)}`);
            console.log('');
        });

        // Get recent attendance records (last 7 days)
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);

        const recentAttendance = await Attendance.find({
            tenantId: company._id.toString(),
            date: { $gte: recentDate }
        })
        .populate('employee', 'employeeId personalInfo')
        .sort({ date: -1, 'checkIn.time': 1 })
        .limit(20);

        console.log(`\n📅 Recent Attendance Records (Last 7 Days):`);
        recentAttendance.forEach(record => {
            const employee = record.employee;
            const name = employee ? `${employee.personalInfo?.firstName || 'Unknown'} ${employee.personalInfo?.lastName || ''}`.trim() : 'Unknown';
            const checkIn = record.checkIn?.time ? record.checkIn.time.toLocaleTimeString() : 'N/A';
            const checkOut = record.checkOut?.time ? record.checkOut.time.toLocaleTimeString() : 'N/A';
            
            console.log(`  ${record.date.toDateString()} - ${employee?.employeeId || 'N/A'} (${name})`);
            console.log(`    Status: ${record.status}`);
            console.log(`    Check-in: ${checkIn} | Check-out: ${checkOut}`);
            console.log(`    Hours: ${record.hours?.totalHours?.toFixed(1) || 0}h`);
            if (record.workFromHome?.isWFH) {
                console.log(`    Work From Home: Yes`);
            }
            console.log('');
        });

        console.log('\n✅ Attendance verification completed successfully!');

    } catch (error) {
        console.error('❌ Error verifying attendance:', error);
        throw error;
    } finally {
        console.log('\n🔌 Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the verification
verifyTechCorpAttendance()
    .then(() => {
        console.log('\n🎉 Attendance verification process completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Attendance verification failed:', error);
        process.exit(1);
    });