/**
 * Test Forget Check API Endpoints
 * 
 * Tests the forget check CRUD operations and approval/rejection workflow
 * Run with: node scripts/testForgetCheckAPI.js
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const TEST_TENANT = 'techcorp_solutions';

// Test credentials
const TEST_USERS = {
    admin: {
        email: 'admin@techcorpsolutions.com',
        password: 'Admin@123'
    },
    hr: {
        email: 'hr@techcorpsolutions.com',
        password: 'HR@123'
    },
    employee: {
        email: 'john.doe@techcorpsolutions.com',
        password: 'User@123'
    }
};

let authTokens = {};

// Helper function to login and get auth token
const login = async (userType) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: TEST_USERS[userType].email,
            password: TEST_USERS[userType].password,
            tenantId: TEST_TENANT
        });
        
        authTokens[userType] = response.data.token;
        console.log(`✅ ${userType} logged in successfully`);
        return response.data.token;
    } catch (error) {
        console.error(`❌ ${userType} login failed:`, error.response?.data || error.message);
        throw error;
    }
};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, userType = 'employee') => {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${authTokens[userType]}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data || error.message);
        throw error;
    }
};

// Test forget check creation
const testCreateForgetCheck = async () => {
    console.log('\n🧪 Testing Forget Check Creation...');
    
    const forgetCheckData = {
        date: new Date().toISOString().split('T')[0],
        requestType: 'check-in',
        requestedTime: '08:30',
        reason: 'System was down when I arrived at the office this morning. The card reader was not responding and the mobile app showed connection errors.'
    };
    
    try {
        const result = await makeRequest('POST', '/forget-checks', forgetCheckData, 'employee');
        console.log('✅ Forget check created:', result._id);
        return result._id;
    } catch (error) {
        console.error('❌ Failed to create forget check');
        return null;
    }
};

// Test forget check retrieval
const testGetForgetChecks = async () => {
    console.log('\n🧪 Testing Forget Check Retrieval...');
    
    try {
        // Test as employee (should see only own records)
        const employeeResult = await makeRequest('GET', '/forget-checks', null, 'employee');
        console.log(`✅ Employee can see ${employeeResult.length} forget check(s)`);
        
        // Test as HR (should see all records)
        const hrResult = await makeRequest('GET', '/forget-checks', null, 'hr');
        console.log(`✅ HR can see ${hrResult.length} forget check(s)`);
        
        return hrResult.length > 0 ? hrResult[0]._id : null;
    } catch (error) {
        console.error('❌ Failed to retrieve forget checks');
        return null;
    }
};

// Test forget check approval
const testApproveForgetCheck = async (forgetCheckId) => {
    if (!forgetCheckId) return;
    
    console.log('\n🧪 Testing Forget Check Approval...');
    
    try {
        const result = await makeRequest('POST', `/forget-checks/${forgetCheckId}/approve`, null, 'hr');
        console.log('✅ Forget check approved successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to approve forget check');
        return false;
    }
};

// Test forget check rejection
const testRejectForgetCheck = async (forgetCheckId) => {
    if (!forgetCheckId) return;
    
    console.log('\n🧪 Testing Forget Check Rejection...');
    
    const rejectionData = {
        reason: 'Insufficient documentation provided. Please submit supporting evidence for the system downtime claim.'
    };
    
    try {
        const result = await makeRequest('POST', `/forget-checks/${forgetCheckId}/reject`, rejectionData, 'hr');
        console.log('✅ Forget check rejected successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to reject forget check');
        return false;
    }
};

// Test forget check update
const testUpdateForgetCheck = async (forgetCheckId) => {
    if (!forgetCheckId) return;
    
    console.log('\n🧪 Testing Forget Check Update...');
    
    const updateData = {
        requestedTime: '08:45',
        reason: 'Updated: System was down when I arrived at the office this morning. The card reader was not responding and the mobile app showed connection errors. I have attached screenshots of the error messages.'
    };
    
    try {
        const result = await makeRequest('PUT', `/forget-checks/${forgetCheckId}`, updateData, 'employee');
        console.log('✅ Forget check updated successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to update forget check');
        return false;
    }
};

// Test forget check deletion
const testDeleteForgetCheck = async (forgetCheckId) => {
    if (!forgetCheckId) return;
    
    console.log('\n🧪 Testing Forget Check Deletion...');
    
    try {
        await makeRequest('DELETE', `/forget-checks/${forgetCheckId}`, null, 'employee');
        console.log('✅ Forget check deleted successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to delete forget check');
        return false;
    }
};

// Main test execution
const runTests = async () => {
    console.log('🚀 Starting Forget Check API Tests...\n');
    
    try {
        // Login all users
        await login('employee');
        await login('hr');
        await login('admin');
        
        // Test CRUD operations
        const forgetCheckId = await testCreateForgetCheck();
        await testGetForgetChecks();
        
        if (forgetCheckId) {
            await testUpdateForgetCheck(forgetCheckId);
            await testApproveForgetCheck(forgetCheckId);
        }
        
        // Create another record for rejection test
        const forgetCheckId2 = await testCreateForgetCheck();
        if (forgetCheckId2) {
            await testRejectForgetCheck(forgetCheckId2);
        }
        
        // Test deletion (create a new record first)
        const forgetCheckId3 = await testCreateForgetCheck();
        if (forgetCheckId3) {
            await testDeleteForgetCheck(forgetCheckId3);
        }
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('\n❌ Test execution failed:', error.message);
        process.exit(1);
    }
};

// Sample data for manual testing
const sampleForgetCheckRequests = [
    {
        requestType: 'check-in',
        requestedTime: '08:30',
        reason: 'System was down when I arrived at the office. The card reader and mobile app were both experiencing technical difficulties.',
        date: new Date().toISOString().split('T')[0]
    },
    {
        requestType: 'check-out',
        requestedTime: '17:45',
        reason: 'Left for urgent doctor appointment, forgot to check out. Had to leave immediately for a medical emergency.',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Yesterday
    },
    {
        requestType: 'check-in',
        requestedTime: '09:15',
        reason: 'Had to rush to emergency meeting with client, forgot to check in. Manager called for urgent issue resolution.',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days ago
    }
];

console.log('\n📋 Sample Forget Check Requests for Manual Testing:');
console.log(JSON.stringify(sampleForgetCheckRequests, null, 2));

// Run the tests
runTests();