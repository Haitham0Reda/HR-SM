import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🧪 Testing TechCorp Attendance Endpoints...');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Simple company schema
const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

const Company = mongoose.model('Company', companySchema, 'platform_companies');

/**
 * Get authentication token
 */
async function getAuthToken() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const company = await Company.findOne({ slug: 'techcorp_solutions' });
        if (!company) {
            throw new Error('TechCorp Solutions company not found');
        }

        const tenantId = company._id.toString();
        await mongoose.disconnect();
        
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
            email: 'admin@techcorp.com',
            password: 'admin123',
            tenantId: tenantId
        });

        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }

        console.log('✅ Login successful');
        return loginResponse.data.data.token;
    } catch (error) {
        console.error('❌ Auth error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Test all attendance endpoints
 */
async function testAllEndpoints() {
    try {
        const token = await getAuthToken();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('\n🧪 Testing All Attendance Endpoints...\n');

        // Test 1: Get all attendance
        console.log('📋 Test 1: GET /api/v1/attendance');
        try {
            const allResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance`, { headers });
            console.log(`✅ Status: ${allResponse.status}`);
            console.log(`📊 Total records: ${allResponse.data.length}`);
            
            if (allResponse.data.length > 0) {
                const sample = allResponse.data[0];
                console.log(`📝 Sample: ${new Date(sample.date).toDateString()} - ${sample.employee?.employeeId} (${sample.status})`);
            }
        } catch (error) {
            console.error('❌ Error:', error.response?.status, error.response?.data?.error || error.message);
        }

        // Test 2: Get today's attendance
        console.log('\n📅 Test 2: GET /api/v1/attendance/today');
        try {
            const todayResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance/today`, { headers });
            console.log(`✅ Status: ${todayResponse.status}`);
            console.log(`📊 Today's records: ${todayResponse.data.data?.length || 0}`);
            console.log(`📈 Summary:`, todayResponse.data.summary);
        } catch (error) {
            console.error('❌ Error:', error.response?.status, error.response?.data?.error || error.message);
        }

        // Test 3: Get monthly attendance
        console.log('\n📊 Test 3: GET /api/v1/attendance/monthly');
        try {
            const monthlyResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance/monthly`, { headers });
            console.log(`✅ Status: ${monthlyResponse.status}`);
            console.log(`📊 Monthly records: ${monthlyResponse.data.data?.length || 0}`);
            console.log(`📈 Summary:`, monthlyResponse.data.summary);
        } catch (error) {
            console.error('❌ Error:', error.response?.status, error.response?.data?.error || error.message);
        }

        // Test 4: Get November 2025 attendance (when data was uploaded)
        console.log('\n📊 Test 4: GET /api/v1/attendance/monthly?year=2025&month=11');
        try {
            const novResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance/monthly?year=2025&month=11`, { headers });
            console.log(`✅ Status: ${novResponse.status}`);
            console.log(`📊 November 2025 records: ${novResponse.data.data?.length || 0}`);
            console.log(`📈 Summary:`, novResponse.data.summary);
        } catch (error) {
            console.error('❌ Error:', error.response?.status, error.response?.data?.error || error.message);
        }

        // Test 5: Test users endpoint (to verify other APIs work)
        console.log('\n👥 Test 5: GET /api/v1/users');
        try {
            const usersResponse = await axios.get(`${API_BASE_URL}/api/v1/users`, { headers });
            console.log(`✅ Status: ${usersResponse.status}`);
            console.log(`👥 Users: ${usersResponse.data.length}`);
        } catch (error) {
            console.error('❌ Error:', error.response?.status, error.response?.data?.error || error.message);
        }

        console.log('\n🎉 All endpoint tests completed!');

    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testAllEndpoints();