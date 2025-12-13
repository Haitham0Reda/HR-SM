/**
 * Test script to check if the user activities API is working correctly
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TENANT_ID = 'techcorp-solutions-d8f0689c';

async function testUserActivitiesAPI() {
    try {
        console.log('Testing User Activities API...\n');
        
        // First, login to get a token
        console.log('1. Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123',
                tenantId: 'techcorp-solutions-d8f0689c'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            throw new Error('Login failed: ' + loginData.message);
        }
        
        const token = loginData.token;
        console.log('✓ Login successful');
        
        // Test user activities API
        console.log('\n2. Testing user activities API...');
        const activitiesResponse = await fetch(`${BASE_URL}/api/company-logs/${TENANT_ID}/user-activities?days=1&includeRealTime=true&limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const activitiesData = await activitiesResponse.json();
        console.log('Response status:', activitiesResponse.status);
        console.log('Response data:', JSON.stringify(activitiesData, null, 2));
        
        if (activitiesData.success) {
            const data = activitiesData.data;
            console.log('\n✓ API Response Analysis:');
            console.log(`- Total activities: ${data.totalActivities}`);
            console.log(`- Number of users: ${Object.keys(data.users || {}).length}`);
            console.log(`- Recent activities count: ${data.recentActivities?.length || 0}`);
            
            if (data.recentActivities && data.recentActivities.length > 0) {
                console.log('\n✓ Sample recent activity:');
                console.log(JSON.stringify(data.recentActivities[0], null, 2));
            }
            
            if (data.users && Object.keys(data.users).length > 0) {
                console.log('\n✓ Sample user data:');
                const firstUser = Object.values(data.users)[0];
                console.log(JSON.stringify(firstUser, null, 2));
            }
        } else {
            console.log('❌ API returned error:', activitiesData.message);
        }
        
        // Test real-time sessions API
        console.log('\n3. Testing real-time sessions API...');
        const sessionsResponse = await fetch(`${BASE_URL}/api/company-logs/${TENANT_ID}/real-time-sessions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const sessionsData = await sessionsResponse.json();
        console.log('Sessions response status:', sessionsResponse.status);
        
        if (sessionsData.success) {
            console.log('✓ Real-time sessions data:');
            console.log(`- Active users: ${sessionsData.data.totalActiveUsers}`);
            console.log(`- Current activities: ${Object.keys(sessionsData.data.sessionSummary.currentActivities || {}).length}`);
        } else {
            console.log('❌ Sessions API error:', sessionsData.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testUserActivitiesAPI();