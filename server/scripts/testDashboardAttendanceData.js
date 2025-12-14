import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('📊 Testing Dashboard Attendance Data Display...');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Simple company schema
const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

const Company = mongoose.model('Company', companySchema, 'platform_companies');

/**
 * Test dashboard attendance data flow
 */
async function testDashboardAttendanceFlow() {
    try {
        console.log('🚀 Testing Dashboard Attendance Data Flow...');
        
        // Step 1: Get TechCorp tenant ID
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const company = await Company.findOne({ slug: 'techcorp_solutions' });
        if (!company) {
            throw new Error('TechCorp Solutions company not found');
        }
        
        const tenantId = company._id.toString();
        console.log(`🏢 TechCorp tenant ID: ${tenantId}`);
        
        await mongoose.disconnect();
        
        // Step 2: Login as TechCorp admin
        console.log('\n🔐 Logging in as TechCorp admin...');
        const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
            email: 'admin@techcorp.com',
            password: 'admin123',
            tenantId: tenantId
        });
        
        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }
        
        const token = loginResponse.data.data.token;
        const user = loginResponse.data.data.user;
        console.log(`✅ Logged in as: ${user.email} (${user.role})`);
        console.log(`👤 User ID: ${user._id}`);
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // Step 3: Get all attendance data (what the dashboard fetches)
        console.log('\n📋 Fetching all attendance data (dashboard call)...');
        const allAttendanceResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance`, { headers });
        
        console.log(`📊 Total attendance records: ${allAttendanceResponse.data.length}`);
        
        // Step 4: Filter for today's attendance for current user
        console.log('\n📅 Filtering for today\'s attendance...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];
        
        console.log(`🗓️ Today's date: ${todayString}`);
        console.log(`👤 Looking for user ID: ${user._id}`);
        
        const userTodayAttendance = allAttendanceResponse.data.find(record => {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            const employeeId = record.employee?._id || record.employee;
            
            console.log(`🔍 Checking record: Date=${recordDate}, Employee=${employeeId}, Match=${recordDate === todayString && (employeeId === user._id || String(employeeId) === String(user._id))}`);
            
            return recordDate === todayString && (employeeId === user._id || String(employeeId) === String(user._id));
        });
        
        console.log('\n📊 Today\'s Attendance Result:');
        if (userTodayAttendance) {
            console.log('✅ Found today\'s attendance record:');
            console.log(`  📅 Date: ${new Date(userTodayAttendance.date).toDateString()}`);
            console.log(`  👤 Employee: ${userTodayAttendance.employee?.employeeId || 'N/A'}`);
            console.log(`  📍 Status: ${userTodayAttendance.status}`);
            console.log(`  🕐 Check In: ${userTodayAttendance.checkIn?.time ? new Date(userTodayAttendance.checkIn.time).toLocaleTimeString() : 'N/A'}`);
            console.log(`  🕐 Check Out: ${userTodayAttendance.checkOut?.time ? new Date(userTodayAttendance.checkOut.time).toLocaleTimeString() : 'N/A'}`);
            
            // Calculate working hours
            if (userTodayAttendance.checkIn?.time && userTodayAttendance.checkOut?.time) {
                const start = new Date(userTodayAttendance.checkIn.time);
                const end = new Date(userTodayAttendance.checkOut.time);
                const diff = end - start;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                console.log(`  ⏱️ Working Hours: ${hours}h ${minutes}m`);
            }
        } else {
            console.log('❌ No attendance record found for today');
            console.log('\n🔍 Available records for this user:');
            
            const userRecords = allAttendanceResponse.data.filter(record => {
                const employeeId = record.employee?._id || record.employee;
                return employeeId === user._id || String(employeeId) === String(user._id);
            });
            
            console.log(`📊 Total user records: ${userRecords.length}`);
            userRecords.slice(0, 5).forEach((record, index) => {
                const recordDate = new Date(record.date).toDateString();
                console.log(`  ${index + 1}. ${recordDate} - ${record.status}`);
            });
        }
        
        // Step 5: Test today's attendance API endpoint
        console.log('\n📅 Testing today\'s attendance API endpoint...');
        try {
            const todayResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance/today`, { headers });
            console.log(`✅ Today's API endpoint works: ${todayResponse.data.data?.length || 0} records`);
            console.log(`📊 Summary:`, todayResponse.data.summary);
            
            // Find current user in today's data
            const userInToday = todayResponse.data.data?.find(record => {
                const employeeId = record.employee?._id || record.employee;
                return employeeId === user._id || String(employeeId) === String(user._id);
            });
            
            if (userInToday) {
                console.log('✅ Current user found in today\'s attendance API');
            } else {
                console.log('❌ Current user NOT found in today\'s attendance API');
            }
        } catch (error) {
            console.error('❌ Today\'s attendance API error:', error.response?.status, error.response?.data);
        }
        
        // Step 6: Recommendations
        console.log('\n💡 Dashboard Display Recommendations:');
        console.log('=====================================');
        
        if (userTodayAttendance) {
            console.log('✅ Dashboard should show real attendance data');
            console.log('✅ User has attendance record for today');
            console.log('✅ Data is available for dashboard display');
        } else {
            console.log('⚠️ Dashboard should show "No Record" or default values');
            console.log('⚠️ User has no attendance record for today');
            console.log('💡 Consider using the /api/v1/attendance/today endpoint instead');
        }
        
        console.log('\n🎉 Dashboard attendance data test completed!');
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the test
testDashboardAttendanceFlow();