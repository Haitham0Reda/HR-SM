/**
 * Test Frontend Connection Issue
 * Check if there's an authentication or API connection problem
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

// Test Company credentials
const TEST_COMPANY_CREDENTIALS = {
    email: 'admin@testcompany.com',
    password: 'admin123',
    tenantId: '693cd43ec91e4189aa2ecd2f'
};

async function testLogin() {
    console.log('🔐 Testing login...');
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(TEST_COMPANY_CREDENTIALS)
        });

        const data = await response.json();
        
        console.log(`📊 Login Status: ${response.status}`);
        console.log(`📊 Login Success: ${data.success}`);
        
        if (data.success && data.data?.token) {
            console.log('✅ Login working correctly');
            console.log(`👤 User: ${data.data.user.email}`);
            console.log(`🔑 Token: ${data.data.token.slice(0, 20)}...`);
            return data.data.token;
        } else {
            console.log('❌ Login failed:', data.message);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Login error:', error.message);
        return null;
    }
}

async function testPermissionsAPI(token) {
    console.log('\n📡 Testing permissions API...');
    
    try {
        const response = await fetch(`${API_BASE}/permission-requests`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        console.log(`📊 API Status: ${response.status}`);
        console.log(`📊 API Success: ${data.success}`);
        console.log(`📊 Data Count: ${data.data?.length || 0}`);
        
        if (response.status === 200 && data.success) {
            console.log('✅ Permissions API working correctly');
            return true;
        } else {
            console.log('❌ Permissions API failed');
            console.log('Response:', JSON.stringify(data, null, 2));
            return false;
        }
        
    } catch (error) {
        console.error('❌ API error:', error.message);
        return false;
    }
}

async function testCORS() {
    console.log('\n🌐 Testing CORS and server connectivity...');
    
    try {
        // Test basic server connectivity
        const response = await fetch(`${API_BASE.replace('/api/v1', '')}/health`, {
            method: 'GET'
        });
        
        console.log(`📊 Server Status: ${response.status}`);
        
        if (response.status === 200 || response.status === 404) {
            console.log('✅ Server is reachable');
            return true;
        } else {
            console.log('❌ Server connectivity issue');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Server connectivity error:', error.message);
        return false;
    }
}

async function main() {
    try {
        console.log('🧪 Test Frontend Connection Issue');
        console.log('=================================');
        
        // Test server connectivity
        const serverReachable = await testCORS();
        
        if (!serverReachable) {
            console.log('\n❌ Server is not reachable. Check if the backend is running on port 5000.');
            return;
        }
        
        // Test login
        const token = await testLogin();
        
        if (!token) {
            console.log('\n❌ Login failed. Check credentials or authentication system.');
            return;
        }
        
        // Test permissions API
        const apiWorking = await testPermissionsAPI(token);
        
        if (!apiWorking) {
            console.log('\n❌ Permissions API failed. Check API endpoints or permissions.');
            return;
        }
        
        console.log('\n🎉 ALL BACKEND TESTS PASSED!');
        console.log('');
        console.log('The backend is working correctly. The issue is in the frontend.');
        console.log('');
        console.log('🔧 Frontend Debugging Steps:');
        console.log('============================');
        console.log('');
        console.log('1. Open browser and go to: http://localhost:3000/company/test-company/permissions');
        console.log('');
        console.log('2. Open Developer Tools (F12) and check:');
        console.log('   - Console tab: Look for JavaScript errors (red text)');
        console.log('   - Network tab: Look for failed API calls');
        console.log('');
        console.log('3. Check if you are logged in:');
        console.log('   - Email: admin@testcompany.com');
        console.log('   - Password: admin123');
        console.log('');
        console.log('4. Try these troubleshooting steps:');
        console.log('   - Hard refresh: Ctrl+F5');
        console.log('   - Incognito mode');
        console.log('   - Clear browser cache');
        console.log('');
        console.log('5. Check the browser console for these messages:');
        console.log('   - "Fetching permissions with params:"');
        console.log('   - "Permissions API response:"');
        console.log('   - "Processed permissions array:"');
        console.log('');
        console.log('6. If no console messages appear, the React component is not loading.');
        console.log('   Check for routing issues or component errors.');
        
        console.log('\n✅ Test completed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main();