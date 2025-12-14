import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('📊 Testing Attendance Dashboard API...');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Simple company schema
const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

const Company = mongoose.model('Company', companySchema, 'platform_companies');

/**
 * Test the attendance dashboard API call
 */
async function testAttendanceDashboardAPI() {
    try {
        console.log('🚀 Testing Attendance Dashboard API Call...');
        
        // Step 1: Get TechCorp tenant ID and login
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const company = await Company.findOne({ slug: 'techcorp_solutions' });
        if (!company) {
            throw new Error('TechCorp Solutions company not found');
        }
        
        const tenantId = company._id.toString();
        console.log(`🏢 TechCorp tenant ID: ${tenantId}`);
        
        await mongoose.disconnect();
        
        // Step 2: Login
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
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // Step 3: Test the exact API call that AttendanceDashboard makes
        console.log('\n📅 Testing /api/v1/attendance/today (AttendanceDashboard call)...');
        const todayResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance/today`, { headers });
        
        console.log(`✅ Status: ${todayResponse.status}`);
        console.log('📊 Full Response Structure:');
        console.log(JSON.stringify(todayResponse.data, null, 2));
        
        // Check what the AttendanceDashboard expects
        console.log('\n🔍 Analyzing Response for AttendanceDashboard:');
        
        const responseData = todayResponse.data;
        
        // AttendanceDashboard expects: { summary, data }
        console.log('Expected structure: { summary: {...}, data: [...] }');
        console.log('Actual structure:');
        console.log(`- success: ${responseData.success}`);
        console.log(`- summary: ${responseData.summary ? 'Present' : 'Missing'}`);
        console.log(`- data: ${responseData.data ? `Array with ${responseData.data.length} items` : 'Missing'}`);
        
        if (responseData.summary) {
            console.log('\n📈 Summary Data:');
            console.log(JSON.stringify(responseData.summary, null, 2));
        }
        
        if (responseData.data && responseData.data.length > 0) {
            console.log('\n📋 Sample Attendance Record:');
            const sample = responseData.data[0];
            console.log(`- Employee ID: ${sample.employee?.employeeId || 'N/A'}`);
            console.log(`- Name: ${sample.employee?.personalInfo?.firstName || 'N/A'} ${sample.employee?.personalInfo?.lastName || ''}`);
            console.log(`- Department: ${sample.department?.name || 'N/A'}`);
            console.log(`- Check In: ${sample.checkIn?.time ? new Date(sample.checkIn.time).toLocaleTimeString() : 'N/A'}`);
            console.log(`- Check Out: ${sample.checkOut?.time ? new Date(sample.checkOut.time).toLocaleTimeString() : 'N/A'}`);
            console.log(`- Status: ${sample.status || 'N/A'}`);
            console.log(`- Source: ${sample.source || 'N/A'}`);
        } else {
            console.log('\n⚠️ No attendance data found in response');
        }
        
        // Step 4: Test what happens when AttendanceDashboard processes this
        console.log('\n🎯 AttendanceDashboard Processing Simulation:');
        
        // This is what AttendanceDashboard does:
        // const { summary, data } = todayData || {};
        const { summary, data } = responseData || {};
        
        console.log('After destructuring:');
        console.log(`- summary: ${summary ? 'Available' : 'Undefined'}`);
        console.log(`- data: ${data ? `Array with ${data.length} items` : 'Undefined'}`);
        
        if (!summary || !data || data.length === 0) {
            console.log('\n❌ This explains why AttendanceDashboard shows "No attendance records found"');
            console.log('💡 The component expects { summary, data } but gets { success, summary, data }');
        } else {
            console.log('\n✅ AttendanceDashboard should display data correctly');
        }
        
        return { success: true, responseData, summary, data };
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return { success: false, error: error.message };
    }
}

/**
 * Main test function
 */
async function runTest() {
    try {
        const result = await testAttendanceDashboardAPI();
        
        console.log('\n💡 Diagnosis:');
        console.log('=============');
        
        if (result.success) {
            if (result.summary && result.data && result.data.length > 0) {
                console.log('✅ API is working correctly');
                console.log('✅ Data is available');
                console.log('✅ AttendanceDashboard should display data');
                console.log('⚠️ If still showing "no data", check browser console for errors');
            } else {
                console.log('❌ API response structure issue');
                console.log('💡 AttendanceDashboard expects { summary, data } format');
                console.log('🔧 Need to fix API response or component data handling');
            }
        } else {
            console.log('❌ API call failed');
            console.log('🔧 Need to fix API endpoint or authentication');
        }
        
        console.log('\n🎉 Attendance Dashboard API test completed!');
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
runTest();