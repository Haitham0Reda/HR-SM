/**
 * Test Departments and Positions APIs
 * Tests if the departments and positions APIs are working properly
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testDepartmentsPositions() {
    console.log('🧪 Testing Departments and Positions APIs...\n');

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

        // Step 2: Test departments endpoint
        console.log('\n2. Testing departments endpoint...');
        const deptResponse = await fetch(`${API_BASE}/departments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Status: ${deptResponse.status}`);
        console.log(`   Content-Type: ${deptResponse.headers.get('content-type')}`);
        
        if (deptResponse.ok) {
            const depts = await deptResponse.json();
            console.log('✅ Departments API successful');
            console.log(`   Response type: ${Array.isArray(depts) ? 'Array' : 'Object'}`);
            console.log(`   Count: ${Array.isArray(depts) ? depts.length : (depts.data?.length || 0)}`);
            if (Array.isArray(depts) && depts.length > 0) {
                console.log(`   Sample: ${depts[0].name} (${depts[0]._id})`);
            } else if (depts.data && depts.data.length > 0) {
                console.log(`   Sample: ${depts.data[0].name} (${depts.data[0]._id})`);
            }
        } else {
            const errorText = await deptResponse.text();
            console.log('❌ Departments API failed');
            console.log(`   Response: ${errorText.substring(0, 200)}...`);
        }

        // Step 3: Test positions endpoint
        console.log('\n3. Testing positions endpoint...');
        const posResponse = await fetch(`${API_BASE}/positions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Status: ${posResponse.status}`);
        console.log(`   Content-Type: ${posResponse.headers.get('content-type')}`);
        
        if (posResponse.ok) {
            const positions = await posResponse.json();
            console.log('✅ Positions API successful');
            console.log(`   Response type: ${Array.isArray(positions) ? 'Array' : 'Object'}`);
            console.log(`   Count: ${Array.isArray(positions) ? positions.length : (positions.data?.length || 0)}`);
            if (Array.isArray(positions) && positions.length > 0) {
                console.log(`   Sample: ${positions[0].title || positions[0].name} (${positions[0]._id})`);
            } else if (positions.data && positions.data.length > 0) {
                console.log(`   Sample: ${positions.data[0].title || positions.data[0].name} (${positions.data[0]._id})`);
            }
        } else {
            const errorText = await posResponse.text();
            console.log('❌ Positions API failed');
            console.log(`   Response: ${errorText.substring(0, 200)}...`);
        }

        // Step 4: Test alternative paths
        console.log('\n4. Testing alternative API paths...');
        
        const altDeptResponse = await fetch(`http://localhost:5000/api/departments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`   /api/departments Status: ${altDeptResponse.status}`);
        
        const altPosResponse = await fetch(`http://localhost:5000/api/positions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`   /api/positions Status: ${altPosResponse.status}`);

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testDepartmentsPositions().catch(console.error);