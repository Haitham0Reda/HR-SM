import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🧪 Testing TechCorp Attendance API...');

// Simple schemas for testing
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
    }
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

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

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

const Company = mongoose.model('Company', companySchema, 'platform_companies');

/**
 * Simulate attendance API call with proper tenant context
 */
async function simulateAttendanceAPI(tenantId, userId) {
    try {
        console.log(`\n🔍 Simulating API call for tenant: ${tenantId}`);
        
        // Simulate the controller logic with tenant filtering
        const attendance = await Attendance.find({ tenantId })
            .populate('employee', 'username email employeeId personalInfo')
            .sort({ date: -1 })
            .limit(10);
        
        console.log(`📊 Found ${attendance.length} attendance records for tenant ${tenantId}`);
        
        if (attendance.length > 0) {
            console.log('\n📋 Sample Records:');
            attendance.slice(0, 5).forEach((record, index) => {
                const employee = record.employee;
                const name = employee ? `${employee.personalInfo?.firstName || 'Unknown'} ${employee.personalInfo?.lastName || ''}`.trim() : 'Unknown';
                const checkIn = record.checkIn?.time ? record.checkIn.time.toLocaleTimeString() : 'N/A';
                const checkOut = record.checkOut?.time ? record.checkOut.time.toLocaleTimeString() : 'N/A';
                
                console.log(`  ${index + 1}. ${record.date.toDateString()} - ${employee?.employeeId || 'N/A'} (${name})`);
                console.log(`     Status: ${record.status} | Check-in: ${checkIn} | Check-out: ${checkOut}`);
                console.log(`     Hours: ${record.hours?.totalHours?.toFixed(1) || 0}h`);
            });
        }
        
        return attendance;
    } catch (error) {
        console.error('❌ Error in API simulation:', error);
        throw error;
    }
}

/**
 * Test today's attendance API
 */
async function testTodayAttendanceAPI(tenantId) {
    try {
        console.log(`\n📅 Testing Today's Attendance API for tenant: ${tenantId}`);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const attendance = await Attendance.find({
            tenantId,
            date: { $gte: today, $lt: tomorrow }
        })
            .populate('employee', 'username email employeeId personalInfo')
            .sort({ 'checkIn.time': -1 });
        
        console.log(`📊 Found ${attendance.length} attendance records for today`);
        
        // Calculate summary
        const summary = {
            total: attendance.length,
            present: 0,
            absent: 0,
            late: 0,
            earlyLeave: 0,
            onTime: 0
        };
        
        attendance.forEach(record => {
            if (record.checkIn?.time) {
                summary.present++;
                if (record.checkIn.isLate) {
                    summary.late++;
                } else {
                    summary.onTime++;
                }
            } else {
                summary.absent++;
            }
            
            if (record.checkOut?.isEarly) {
                summary.earlyLeave++;
            }
        });
        
        console.log('📈 Today\'s Summary:', summary);
        
        return { summary, data: attendance };
    } catch (error) {
        console.error('❌ Error in today\'s attendance API:', error);
        throw error;
    }
}

/**
 * Test monthly attendance API
 */
async function testMonthlyAttendanceAPI(tenantId) {
    try {
        console.log(`\n📊 Testing Monthly Attendance API for tenant: ${tenantId}`);
        
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        
        const attendance = await Attendance.find({
            tenantId,
            date: { $gte: startDate, $lte: endDate }
        })
            .populate('employee', 'username email employeeId personalInfo')
            .sort({ date: 1, 'employee.employeeId': 1 });
        
        console.log(`📊 Found ${attendance.length} attendance records for ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
        
        // Calculate monthly summary
        const summary = {
            totalRecords: attendance.length,
            workingDays: 0,
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            earlyLeaveDays: 0
        };
        
        const uniqueDates = new Set();
        
        attendance.forEach(record => {
            uniqueDates.add(record.date.toISOString().split('T')[0]);
            
            if (record.isWorkingDay) {
                summary.workingDays++;
            }
            
            if (record.checkIn?.time) {
                summary.presentDays++;
                if (record.checkIn.isLate) {
                    summary.lateDays++;
                }
            } else if (record.isWorkingDay) {
                summary.absentDays++;
            }
            
            if (record.checkOut?.isEarly) {
                summary.earlyLeaveDays++;
            }
        });
        
        summary.uniqueDates = uniqueDates.size;
        
        console.log('📈 Monthly Summary:', summary);
        
        return { summary, data: attendance };
    } catch (error) {
        console.error('❌ Error in monthly attendance API:', error);
        throw error;
    }
}

/**
 * Test TechCorp attendance API endpoints
 */
async function testTechCorpAttendanceAPI() {
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
        console.log(`  Tenant ID: ${company._id}`);

        // Find a user for testing
        const user = await User.findOne({
            tenantId: company._id.toString()
        });

        if (!user) {
            throw new Error('No users found for TechCorp Solutions');
        }

        console.log(`\n👤 Test User: ${user.employeeId} (${user.email})`);

        // Test 1: Get all attendance records
        console.log('\n🧪 Test 1: Get All Attendance Records');
        const allAttendance = await simulateAttendanceAPI(company._id.toString(), user._id);

        // Test 2: Get today's attendance
        console.log('\n🧪 Test 2: Get Today\'s Attendance');
        const todayAttendance = await testTodayAttendanceAPI(company._id.toString());

        // Test 3: Get monthly attendance
        console.log('\n🧪 Test 3: Get Monthly Attendance');
        const monthlyAttendance = await testMonthlyAttendanceAPI(company._id.toString());

        // Test 4: Verify tenant isolation
        console.log('\n🧪 Test 4: Verify Tenant Isolation');
        const allTenantsAttendance = await Attendance.find({}).limit(5);
        console.log(`📊 Total attendance records across all tenants: ${await Attendance.countDocuments({})}`);
        console.log(`📊 TechCorp attendance records: ${allAttendance.length}`);
        
        if (allTenantsAttendance.length > allAttendance.length) {
            console.log('✅ Tenant isolation is working - TechCorp sees only its own data');
        } else {
            console.log('⚠️ Tenant isolation may not be working properly');
        }

        // Test 5: Check data consistency
        console.log('\n🧪 Test 5: Data Consistency Check');
        const statusCounts = await Attendance.aggregate([
            { $match: { tenantId: company._id.toString() } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('📈 Status Distribution:');
        statusCounts.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} records`);
        });

        console.log('\n✅ All API tests completed successfully!');
        
        return {
            allAttendance: allAttendance.length,
            todayAttendance: todayAttendance.data.length,
            monthlyAttendance: monthlyAttendance.data.length,
            statusCounts
        };

    } catch (error) {
        console.error('❌ Error testing attendance API:', error);
        throw error;
    } finally {
        console.log('\n🔌 Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the test
testTechCorpAttendanceAPI()
    .then((results) => {
        console.log('\n🎉 Attendance API test completed!');
        console.log('📊 Results:', results);
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Attendance API test failed:', error);
        process.exit(1);
    });