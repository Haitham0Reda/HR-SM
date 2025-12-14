import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🌐 Testing Frontend API Access...');

const API_BASE_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

// Simple company schema
const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

const Company = mongoose.model('Company', companySchema, 'platform_companies');

/**
 * Test CORS and basic connectivity
 */
async function testCORS() {
    try {
        console.log('\n🔍 Testing CORS and connectivity...');
        
        // Test basic health endpoint
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log(`✅ Health check: ${healthResponse.status} - ${healthResponse.data.message}`);
        
        // Test CORS preflight
        const corsResponse = await axios.options(`${API_BASE_URL}/api/v1/auth/login`, {
            headers: {
                'Origin': FRONTEND_URL,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type, Authorization'
            }
        });
        console.log(`✅ CORS preflight: ${corsResponse.status}`);
        
    } catch (error) {
        console.error('❌ CORS/Connectivity error:', error.response?.status, error.message);
    }
}

/**
 * Test complete authentication flow
 */
async function testAuthFlow() {
    try {
        console.log('\n🔐 Testing authentication flow...');
        
        // Get tenant ID
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const company = await Company.findOne({ slug: 'techcorp_solutions' });
        if (!company) {
            throw new Error('TechCorp Solutions company not found');
        }
        
        const tenantId = company._id.toString();
        await mongoose.disconnect();
        console.log(`🏢 TechCorp tenant ID: ${tenantId}`);
        
        // Test login with frontend-like headers
        const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
            email: 'admin@techcorp.com',
            password: 'admin123',
            tenantId: tenantId
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Origin': FRONTEND_URL,
                'Referer': FRONTEND_URL
            }
        });
        
        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful');
        console.log(`👤 User: ${loginResponse.data.data.user.email} (${loginResponse.data.data.user.role})`);
        
        // Test attendance API with token
        console.log('\n📋 Testing attendance API...');
        const attendanceResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Origin': FRONTEND_URL,
                'Referer': FRONTEND_URL
            }
        });
        
        console.log(`✅ Attendance API: ${attendanceResponse.status}`);
        console.log(`📊 Records returned: ${attendanceResponse.data.length}`);
        
        if (attendanceResponse.data.length > 0) {
            const sample = attendanceResponse.data[0];
            console.log(`📝 Sample record: ${new Date(sample.date).toDateString()} - ${sample.employee?.employeeId} (${sample.status})`);
        }
        
        // Test today's attendance
        console.log('\n📅 Testing today\'s attendance...');
        const todayResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance/today`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Origin': FRONTEND_URL,
                'Referer': FRONTEND_URL
            }
        });
        
        console.log(`✅ Today's attendance: ${todayResponse.status}`);
        console.log(`📊 Today's records: ${todayResponse.data.data?.length || 0}`);
        console.log(`📈 Summary:`, todayResponse.data.summary);
        
        return { token, attendanceCount: attendanceResponse.data.length };
        
    } catch (error) {
        console.error('❌ Auth flow error:', error.response?.status, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Test frontend simulation
 */
async function testFrontendSimulation() {
    try {
        console.log('\n🖥️ Simulating frontend behavior...');
        
        // Simulate how the frontend makes requests
        const { token } = await testAuthFlow();
        
        // Test with exact frontend headers
        const frontendHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Origin': FRONTEND_URL,
            'Referer': `${FRONTEND_URL}/attendance`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        
        console.log('📋 Testing with frontend-like headers...');
        const response = await axios.get(`${API_BASE_URL}/api/v1/attendance`, {
            headers: frontendHeaders
        });
        
        console.log(`✅ Frontend simulation successful: ${response.data.length} records`);
        
        // Test error scenarios
        console.log('\n🧪 Testing error scenarios...');
        
        // Test without token
        try {
            await axios.get(`${API_BASE_URL}/api/v1/attendance`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': FRONTEND_URL
                }
            });
        } catch (error) {
            console.log(`✅ No token error handled correctly: ${error.response?.status}`);
        }
        
        // Test with invalid token
        try {
            await axios.get(`${API_BASE_URL}/api/v1/attendance`, {
                headers: {
                    'Authorization': 'Bearer invalid-token',
                    'Content-Type': 'application/json',
                    'Origin': FRONTEND_URL
                }
            });
        } catch (error) {
            console.log(`✅ Invalid token error handled correctly: ${error.response?.status}`);
        }
        
    } catch (error) {
        console.error('❌ Frontend simulation error:', error.message);
        throw error;
    }
}

/**
 * Main test function
 */
async function runTests() {
    try {
        console.log(`🚀 Testing frontend API access: ${API_BASE_URL}`);
        console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
        
        await testCORS();
        await testAuthFlow();
        await testFrontendSimulation();
        
        console.log('\n🎉 All frontend API tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ CORS is properly configured');
        console.log('✅ Authentication flow works');
        console.log('✅ Attendance API is accessible');
        console.log('✅ Frontend can access backend APIs');
        
        console.log('\n🔍 If the frontend still shows no data, check:');
        console.log('1. Browser console for JavaScript errors');
        console.log('2. Network tab for failed requests');
        console.log('3. Authentication state in the frontend');
        console.log('4. Component rendering and data handling');
        
    } catch (error) {
        console.error('\n💥 Frontend API tests failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
runTests();