/**
 * Test Tasks Page Fix
 * Verifies that the tasks page handles module not available gracefully
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testTasksPageFix() {
    console.log('🧪 Testing Tasks Page Fix...\n');

    try {
        // Step 1: Login
        console.log('1. Logging in...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123',
                tenantId: '693db0e2ccc5ea08aeee120c'
            })
        });

        if (!loginResponse.ok) {
            console.log('❌ Login failed');
            return;
        }

        const loginData = await loginResponse.json();
        const token = loginData.token || loginData.data?.token;
        console.log('✅ Login successful');

        // Step 2: Test tasks endpoint (should return 403)
        console.log('\n2. Testing tasks endpoint...');
        const tasksResponse = await fetch(`${API_BASE}/tasks`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Status: ${tasksResponse.status}`);
        
        if (tasksResponse.status === 403) {
            const errorData = await tasksResponse.json();
            console.log('✅ Tasks API correctly returns 403 (module not enabled)');
            console.log(`   Error message: ${errorData.message}`);
            
            // Check if the error message contains the expected text
            if (errorData.message && errorData.message.includes('not enabled')) {
                console.log('✅ Error message is correct for module not enabled');
            } else {
                console.log('❌ Unexpected error message format');
            }
        } else if (tasksResponse.ok) {
            console.log('✅ Tasks API is working (module is enabled)');
            const data = await tasksResponse.json();
            console.log(`   Tasks found: ${data.data?.length || 0}`);
        } else {
            console.log(`❌ Unexpected status: ${tasksResponse.status}`);
        }

        // Step 3: Verify authentication is still valid after tasks call
        console.log('\n3. Verifying authentication is still valid...');
        const userResponse = await fetch(`${API_BASE}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('✅ Authentication still valid after tasks API call');
            console.log(`   User: ${userData.data?.username || userData.username || 'Unknown'}`);
        } else {
            console.log('❌ Authentication lost after tasks API call');
        }

        // Step 4: Test other working endpoints to ensure no side effects
        console.log('\n4. Testing other endpoints for side effects...');
        
        const departmentsResponse = await fetch(`${API_BASE}/departments`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Departments: ${departmentsResponse.status} ${departmentsResponse.ok ? '✅' : '❌'}`);

        console.log('\n🎉 Tasks page fix verification complete!');
        console.log('\nExpected behavior:');
        console.log('- ✅ Tasks API returns 403 with "not enabled" message');
        console.log('- ✅ Authentication remains valid after 403 error');
        console.log('- ✅ Other APIs continue to work normally');
        console.log('- ✅ Frontend should show "Module Not Available" message');
        console.log('- ✅ No logout or authentication issues');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testTasksPageFix().catch(console.error);