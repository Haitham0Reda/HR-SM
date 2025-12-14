/**
 * Test Tasks API
 * Tests if the tasks API endpoints exist and are working
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testTasksAPI() {
    console.log('🧪 Testing Tasks API...\n');

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

        // Step 2: Test tasks endpoint
        console.log('\n2. Testing tasks endpoint...');
        const tasksResponse = await fetch(`${API_BASE}/tasks`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Status: ${tasksResponse.status}`);
        console.log(`   Content-Type: ${tasksResponse.headers.get('content-type')}`);
        
        if (tasksResponse.ok) {
            const data = await tasksResponse.json();
            console.log('✅ Tasks API successful');
            console.log(`   Response structure:`, Object.keys(data));
            
            if (data.data) {
                console.log(`   Tasks found: ${data.data.length}`);
            } else if (Array.isArray(data)) {
                console.log(`   Tasks found: ${data.length}`);
            }
        } else {
            const errorText = await tasksResponse.text();
            console.log('❌ Tasks API failed');
            console.log(`   Response (first 200 chars): ${errorText.substring(0, 200)}`);
            
            // Check if it's HTML (404 page)
            if (errorText.includes('<!DOCTYPE')) {
                console.log('   ⚠️  Received HTML response (likely 404 - endpoint not implemented)');
            } else {
                try {
                    const errorJson = JSON.parse(errorText);
                    console.log('   Error details:', errorJson);
                } catch (e) {
                    console.log('   Raw error:', errorText);
                }
            }
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testTasksAPI().catch(console.error);