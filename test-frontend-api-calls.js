/**
 * Test Frontend API Calls
 * Simulates exactly what the frontend is doing
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

async function testFrontendAPICalls() {
    console.log('🧪 Testing Frontend API Calls...\n');

    try {
        // Step 1: Login (same as frontend)
        console.log('1. Logging in...');
        const loginResponse = await fetch(`${API_BASE}/api/v1/auth/login`, {
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

        // Step 2: Test departments (exactly as frontend does)
        console.log('\n2. Testing departments (frontend style)...');
        const deptResponse = await fetch(`${API_BASE}/api/v1/departments`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${deptResponse.status}`);
        console.log(`   Content-Type: ${deptResponse.headers.get('content-type')}`);
        
        if (deptResponse.ok) {
            const data = await deptResponse.json();
            console.log('✅ Departments successful');
            console.log(`   Data type: ${Array.isArray(data) ? 'Array' : 'Object'}`);
            console.log(`   Count: ${Array.isArray(data) ? data.length : data.data?.length || 0}`);
        } else {
            const errorText = await deptResponse.text();
            console.log('❌ Departments failed');
            console.log(`   Response (first 200 chars): ${errorText.substring(0, 200)}`);
            
            // Check if it's HTML (404 page)
            if (errorText.includes('<!DOCTYPE')) {
                console.log('   ⚠️  Received HTML response (likely 404 page)');
            }
        }

        // Step 3: Test positions (exactly as frontend does)
        console.log('\n3. Testing positions (frontend style)...');
        const posResponse = await fetch(`${API_BASE}/api/v1/positions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${posResponse.status}`);
        console.log(`   Content-Type: ${posResponse.headers.get('content-type')}`);
        
        if (posResponse.ok) {
            const data = await posResponse.json();
            console.log('✅ Positions successful');
            console.log(`   Data type: ${Array.isArray(data) ? 'Array' : 'Object'}`);
            console.log(`   Count: ${Array.isArray(data) ? data.length : data.data?.length || 0}`);
        } else {
            const errorText = await posResponse.text();
            console.log('❌ Positions failed');
            console.log(`   Response (first 200 chars): ${errorText.substring(0, 200)}`);
            
            // Check if it's HTML (404 page)
            if (errorText.includes('<!DOCTYPE')) {
                console.log('   ⚠️  Received HTML response (likely 404 page)');
            }
        }

        // Step 4: Test resigned employees
        console.log('\n4. Testing resigned employees...');
        const resignedResponse = await fetch(`${API_BASE}/api/v1/resigned-employees`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${resignedResponse.status}`);
        if (resignedResponse.ok) {
            const data = await resignedResponse.json();
            console.log('✅ Resigned employees successful');
            console.log(`   Count: ${data.data?.length || 0}`);
        } else {
            console.log('❌ Resigned employees failed');
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testFrontendAPICalls().catch(console.error);