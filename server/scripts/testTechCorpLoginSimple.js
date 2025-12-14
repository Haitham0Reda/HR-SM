import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🧪 Testing TechCorp Login (Simple)...');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Simple company schema
const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

const Company = mongoose.model('Company', companySchema, 'platform_companies');

/**
 * Get TechCorp tenantId from database
 */
async function getTechCorpTenantId() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const company = await Company.findOne({ slug: 'techcorp_solutions' });
        if (!company) {
            throw new Error('TechCorp Solutions company not found');
        }

        console.log(`🏢 Found TechCorp Solutions: ${company.name} (ID: ${company._id})`);
        return company._id.toString();
    } catch (error) {
        console.error('❌ Error getting tenant ID:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

/**
 * Test login with correct tenantId
 */
async function testLogin() {
    try {
        // Get tenantId from database
        const tenantId = await getTechCorpTenantId();
        
        console.log('\n🔐 Testing login...');
        const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
            email: 'admin@techcorp.com',
            password: 'admin123',
            tenantId: tenantId
        });

        if (loginResponse.data.success) {
            console.log('✅ Login successful!');
            console.log(`👤 User: ${loginResponse.data.data.user.username || loginResponse.data.data.user.email}`);
            console.log(`🏢 Role: ${loginResponse.data.data.user.role}`);
            console.log(`🔑 Token received: ${loginResponse.data.data.token ? 'Yes' : 'No'}`);
            return loginResponse.data.data.token;
        } else {
            throw new Error('Login failed: ' + loginResponse.data.message);
        }
    } catch (error) {
        console.error('❌ Login error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Test attendance API with token
 */
async function testAttendanceAPI(token) {
    try {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('\n📋 Testing attendance API...');
        
        // Test get all attendance
        const response = await axios.get(`${API_BASE_URL}/api/v1/attendance`, { headers });
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Records returned: ${response.data.length}`);
        
        if (response.data.length > 0) {
            console.log('\n📝 Sample records:');
            response.data.slice(0, 3).forEach((record, index) => {
                const employee = record.employee;
                const name = employee ? `${employee.personalInfo?.firstName || 'Unknown'} ${employee.personalInfo?.lastName || ''}`.trim() : 'Unknown';
                const checkIn = record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString() : 'N/A';
                const checkOut = record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString() : 'N/A';
                
                console.log(`  ${index + 1}. ${new Date(record.date).toDateString()} - ${employee?.employeeId || 'N/A'} (${name})`);
                console.log(`     Status: ${record.status} | Check-in: ${checkIn} | Check-out: ${checkOut}`);
            });
        } else {
            console.log('⚠️ No attendance records found');
        }
        
        return response.data;
    } catch (error) {
        console.error('❌ Attendance API error:', error.response?.status, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Main test function
 */
async function runTest() {
    try {
        console.log(`🚀 Testing TechCorp login and attendance API: ${API_BASE_URL}`);
        
        // Step 1: Login
        const token = await testLogin();
        
        // Step 2: Test attendance API
        const attendanceData = await testAttendanceAPI(token);
        
        console.log('\n🎉 Test completed successfully!');
        console.log(`📊 Total attendance records: ${attendanceData.length}`);
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
runTest();