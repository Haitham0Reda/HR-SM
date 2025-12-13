/**
 * Test API Directly
 * This script tests the user activities API endpoint directly to see what's happening
 */

import fetch from 'node-fetch';

async function testApiDirectly() {
    console.log('🧪 Testing User Activities API Directly...\n');

    try {
        const BASE_URL = 'http://localhost:5000';
        const TENANT_ID = 'techcorp-solutions-d8f0689c';

        // Step 1: Login to get token
        console.log('1. Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123',
                tenantId: TENANT_ID
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful');

        // Step 2: Test user activities API with detailed error handling
        console.log('\n2. Testing user activities API...');
        const activitiesResponse = await fetch(`${BASE_URL}/api/company-logs/${TENANT_ID}/user-activities?days=1&limit=100`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Response status: ${activitiesResponse.status} ${activitiesResponse.statusText}`);
        console.log('Response headers:', Object.fromEntries(activitiesResponse.headers.entries()));

        if (!activitiesResponse.ok) {
            const errorText = await activitiesResponse.text();
            console.log('❌ API Error Response:', errorText);
            return;
        }

        const activitiesData = await activitiesResponse.json();
        console.log('✅ API Response received');
        
        // Step 3: Analyze the response
        console.log('\n3. Analyzing response...');
        console.log('Response structure:', {
            success: activitiesData.success,
            hasData: !!activitiesData.data,
            dataKeys: activitiesData.data ? Object.keys(activitiesData.data) : []
        });

        if (activitiesData.success && activitiesData.data) {
            const data = activitiesData.data;
            console.log('\nData summary:');
            console.log(`  - Tenant ID: ${data.tenantId}`);
            console.log(`  - Company Name: ${data.companyName}`);
            console.log(`  - Period: ${data.period}`);
            console.log(`  - Total Activities: ${data.totalActivities}`);
            console.log(`  - Users Count: ${Object.keys(data.users || {}).length}`);
            console.log(`  - Recent Activities: ${(data.recentActivities || []).length}`);
            console.log(`  - Users List: ${(data.usersList || []).length}`);

            if (data.totalActivities === 0) {
                console.log('\n⚠️  No activities found. Possible issues:');
                console.log('   - Log files not being read correctly');
                console.log('   - Date filtering excluding all entries');
                console.log('   - Database tenant lookup failing');
                console.log('   - Log parsing errors');
            } else {
                console.log('\n✅ Activities found! Showing first few:');
                (data.recentActivities || []).slice(0, 3).forEach((activity, index) => {
                    console.log(`   ${index + 1}. ${activity.activityType} by ${activity.userName} at ${activity.timestamp}`);
                });
            }
        }

        // Step 4: Test with different parameters
        console.log('\n4. Testing with different parameters...');
        const testParams = [
            { days: 7, label: '7 days' },
            { days: 30, label: '30 days' },
            { includeRealTime: false, label: 'no real-time' }
        ];

        for (const params of testParams) {
            const queryString = new URLSearchParams(params).toString();
            const testResponse = await fetch(`${BASE_URL}/api/company-logs/${TENANT_ID}/user-activities?${queryString}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (testResponse.ok) {
                const testData = await testResponse.json();
                console.log(`  ${params.label}: ${testData.data?.totalActivities || 0} activities`);
            } else {
                console.log(`  ${params.label}: Error ${testResponse.status}`);
            }
        }

        console.log('\n🎉 API test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testApiDirectly();