/**
 * Test User Activity Logging
 * This script tests if the user activity tracking middleware is working properly
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TENANT_ID = 'techcorp-solutions-d8f0689c';

// Test credentials
const testCredentials = {
    email: 'admin@techcorp.com',
    password: 'admin123',
    tenantId: TENANT_ID
};

async function testUserActivityLogging() {
    console.log('🧪 Testing User Activity Logging System...\n');

    try {
        // Step 1: Login to get token
        console.log('1. Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCredentials)
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful');

        // Step 2: Make some test requests to generate activity logs
        console.log('\n2. Making test requests to generate activity logs...');
        
        const testRequests = [
            { path: '/api/v1/users/profile', method: 'GET', description: 'Get user profile' },
            { path: '/api/v1/users', method: 'GET', description: 'List users' },
            { path: '/api/v1/dashboard/stats', method: 'GET', description: 'Get dashboard stats' }
        ];

        for (const request of testRequests) {
            try {
                console.log(`   Making ${request.method} request to ${request.path}...`);
                const response = await fetch(`${BASE_URL}${request.path}`, {
                    method: request.method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`   Response: ${response.status} ${response.statusText}`);
            } catch (err) {
                console.log(`   Request failed: ${err.message}`);
            }
        }

        // Step 3: Wait a moment for logs to be written
        console.log('\n3. Waiting for logs to be written...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 4: Check if user activities API is working
        console.log('\n4. Testing user activities API...');
        const activitiesResponse = await fetch(`${BASE_URL}/api/company-logs/${TENANT_ID}/user-activities?days=1`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Activities API Response: ${activitiesResponse.status} ${activitiesResponse.statusText}`);
        
        if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            console.log('✅ User activities API is working');
            console.log('📊 Activities data:', JSON.stringify(activitiesData, null, 2));
        } else {
            const errorText = await activitiesResponse.text();
            console.log('❌ User activities API failed');
            console.log('Error response:', errorText);
        }

        // Step 5: Test real-time sessions API
        console.log('\n5. Testing real-time sessions API...');
        const sessionsResponse = await fetch(`${BASE_URL}/api/company-logs/${TENANT_ID}/real-time-sessions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Sessions API Response: ${sessionsResponse.status} ${sessionsResponse.statusText}`);
        
        if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            console.log('✅ Real-time sessions API is working');
            console.log('📊 Sessions data:', JSON.stringify(sessionsData, null, 2));
        } else {
            const errorText = await sessionsResponse.text();
            console.log('❌ Real-time sessions API failed');
            console.log('Error response:', errorText);
        }

        // Step 6: Test log creation directly
        console.log('\n6. Testing direct log creation...');
        const testLogResponse = await fetch(`${BASE_URL}/api/company-logs/${TENANT_ID}/test`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                level: 'info',
                message: 'Test user activity log entry',
                metadata: {
                    testType: 'user_activity_test',
                    timestamp: new Date().toISOString()
                }
            })
        });

        console.log(`Test log API Response: ${testLogResponse.status} ${testLogResponse.statusText}`);
        
        if (testLogResponse.ok) {
            const testLogData = await testLogResponse.json();
            console.log('✅ Direct log creation is working');
            console.log('📝 Test log data:', JSON.stringify(testLogData, null, 2));
        } else {
            const errorText = await testLogResponse.text();
            console.log('❌ Direct log creation failed');
            console.log('Error response:', errorText);
        }

        console.log('\n🎉 User activity logging test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testUserActivityLogging();