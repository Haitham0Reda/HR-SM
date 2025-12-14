/**
 * Test HR Core Module
 * Tests if the hr-core module is working to compare with tasks
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testHRCoreModule() {
    console.log('🧪 Testing HR Core Module...\n');

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

        // Step 2: Test hr-core endpoints (should work)
        console.log('\n2. Testing hr-core endpoints...');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // Test users (hr-core)
        const usersResponse = await fetch(`${API_BASE}/users`, { headers });
        console.log(`   Users (hr-core): ${usersResponse.status} ${usersResponse.ok ? '✅' : '❌'}`);
        
        // Test departments (hr-core)
        const deptsResponse = await fetch(`${API_BASE}/departments`, { headers });
        console.log(`   Departments (hr-core): ${deptsResponse.status} ${deptsResponse.ok ? '✅' : '❌'}`);
        
        // Test positions (hr-core)
        const positionsResponse = await fetch(`${API_BASE}/positions`, { headers });
        console.log(`   Positions (hr-core): ${positionsResponse.status} ${positionsResponse.ok ? '✅' : '❌'}`);

        // Test resigned employees (hr-core)
        const resignedResponse = await fetch(`${API_BASE}/resigned-employees`, { headers });
        console.log(`   Resigned Employees (hr-core): ${resignedResponse.status} ${resignedResponse.ok ? '✅' : '❌'}`);

        // Step 3: Test tasks endpoint (should fail or work now)
        console.log('\n3. Testing tasks endpoint...');
        const tasksResponse = await fetch(`${API_BASE}/tasks`, { headers });
        console.log(`   Tasks: ${tasksResponse.status} ${tasksResponse.ok ? '✅' : '❌'}`);
        
        if (!tasksResponse.ok) {
            const errorText = await tasksResponse.text();
            try {
                const errorJson = JSON.parse(errorText);
                console.log(`   Tasks error: ${errorJson.message}`);
            } catch (e) {
                console.log(`   Tasks error: ${errorText.substring(0, 100)}`);
            }
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testHRCoreModule().catch(console.error);