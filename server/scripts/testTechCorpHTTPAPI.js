import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🌐 Testing TechCorp HTTP API Endpoints...');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

/**
 * Login to get authentication token
 */
async function loginToTechCorp() {
    try {
        console.log('🔐 Logging in to TechCorp Solutions...');
        
        // First get TechCorp's tenantId
        const companyResponse = await axios.get(`${API_BASE_URL}/api/platform/companies/slug/techcorp_solutions`);
        const tenantId = companyResponse.data.data._id;
        
        const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
            email: 'admin@techcorp.com',
            password: 'admin123',
            tenantId: tenantId
        });

        if (loginResponse.data.success) {
            console.log('✅ Login successful');
            console.log(`👤 User: ${loginResponse.data.user.username} (${loginResponse.data.user.role})`);
            console.log(`🏢 Tenant: ${loginResponse.data.user.tenantId}`);
            return loginResponse.data.token;
        } else {
            throw new Error('Login failed: ' + loginResponse.data.message);
        }
    } catch (error) {
        console.error('❌ Login error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Test attendance API endpoints
 */
async function testAttendanceEndpoints(token) {
    try {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('\n🧪 Testing Attendance API Endpoints...');

        // Test 1: Get all attendance
        console.log('\n📋 Test 1: GET /api/v1/attendance');
        try {
            const allAttendanceResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance`, { headers });
            console.log(`✅ Status: ${allAttendanceResponse.status}`);
            console.log(`📊 Records returned: ${allAttendanceResponse.data.length}`);
            
            if (allAttendanceResponse.data.length > 0) {
                const sample = allAttendanceResponse.data[0];
                console.log(`📝 Sample record: ${sample.date} - ${sample.employee?.employeeId} (${sample.status})`);
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

        // Test 4: Test with specific month/year
        console.log('\n📊 Test 4: GET /api/v1/attendance/monthly?year=2025&month=11');
        try {
            const specificMonthResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance/monthly?year=2025&month=11`, { headers });
            console.log(`✅ Status: ${specificMonthResponse.status}`);
            console.log(`📊 November 2025 records: ${specificMonthResponse.data.data?.length || 0}`);
        } catch (error) {
            console.error('❌ Error:', error.response?.status, error.response?.data?.error || error.message);
        }

        console.log('\n✅ HTTP API tests completed!');

    } catch (error) {
        console.error('❌ Error testing HTTP API:', error);
        throw error;
    }
}

/**
 * Test user authentication and data access
 */
async function testUserDataAccess(token) {
    try {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('\n👥 Testing User Data Access...');

        // Test users endpoint
        console.log('\n📋 Test: GET /api/v1/users');
        try {
            const usersResponse = await axios.get(`${API_BASE_URL}/api/v1/users`, { headers });
            console.log(`✅ Status: ${usersResponse.status}`);
            console.log(`👥 Users returned: ${usersResponse.data.length}`);
            
            if (usersResponse.data.length > 0) {
                console.log('📝 Sample users:');
                usersResponse.data.slice(0, 3).forEach(user => {
                    console.log(`  - ${user.employeeId}: ${user.email} (${user.role})`);
                });
            }
        } catch (error) {
            console.error('❌ Error:', error.response?.status, error.response?.data?.error || error.message);
        }

        // Test departments endpoint
        console.log('\n🏢 Test: GET /api/v1/departments');
        try {
            const deptResponse = await axios.get(`${API_BASE_URL}/api/v1/departments`, { headers });
            console.log(`✅ Status: ${deptResponse.status}`);
            console.log(`🏢 Departments returned: ${deptResponse.data.length}`);
        } catch (error) {
            console.error('❌ Error:', error.response?.status, error.response?.data?.error || error.message);
        }

    } catch (error) {
        console.error('❌ Error testing user data access:', error);
        throw error;
    }
}

/**
 * Main test function
 */
async function runHTTPAPITests() {
    try {
        console.log(`🚀 Starting HTTP API tests for: ${API_BASE_URL}`);
        
        // Step 1: Login
        const token = await loginToTechCorp();
        
        // Step 2: Test attendance endpoints
        await testAttendanceEndpoints(token);
        
        // Step 3: Test user data access
        await testUserDataAccess(token);
        
        console.log('\n🎉 All HTTP API tests completed successfully!');
        
    } catch (error) {
        console.error('\n💥 HTTP API tests failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
runHTTPAPITests();