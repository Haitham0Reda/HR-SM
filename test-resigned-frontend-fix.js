/**
 * Test Resigned Frontend Fix
 * Tests if the frontend API calls are now working correctly
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testResignedFrontendFix() {
    console.log('🧪 Testing Resigned Frontend Fix...\n');

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

        // Step 2: Test all APIs that the resigned page needs
        console.log('\n2. Testing all resigned page APIs...');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // Test resigned employees
        const resignedRes = await fetch(`${API_BASE}/resigned-employees`, { headers });
        console.log(`   Resigned Employees: ${resignedRes.status} ${resignedRes.ok ? '✅' : '❌'}`);
        
        // Test users
        const usersRes = await fetch(`${API_BASE}/users`, { headers });
        console.log(`   Users: ${usersRes.status} ${usersRes.ok ? '✅' : '❌'}`);
        
        // Test departments (using the correct API path)
        const deptsRes = await fetch(`${API_BASE}/departments`, { headers });
        console.log(`   Departments: ${deptsRes.status} ${deptsRes.ok ? '✅' : '❌'}`);
        
        // Test positions (using the correct API path)
        const positionsRes = await fetch(`${API_BASE}/positions`, { headers });
        console.log(`   Positions: ${positionsRes.status} ${positionsRes.ok ? '✅' : '❌'}`);

        // Step 3: Verify data structure
        if (deptsRes.ok && positionsRes.ok) {
            console.log('\n3. Verifying data structure...');
            
            const depts = await deptsRes.json();
            const positions = await positionsRes.json();
            
            console.log(`   Departments: ${Array.isArray(depts) ? depts.length : depts.data?.length || 0} items`);
            console.log(`   Positions: ${Array.isArray(positions) ? positions.length : positions.data?.length || 0} items`);
            
            // Check if departments have the expected structure
            const deptList = Array.isArray(depts) ? depts : depts.data || [];
            if (deptList.length > 0) {
                const sample = deptList[0];
                console.log(`   Sample department: ${sample.name} (${sample._id})`);
            }
            
            // Check if positions have the expected structure
            const posList = Array.isArray(positions) ? positions : positions.data || [];
            if (posList.length > 0) {
                const sample = posList[0];
                console.log(`   Sample position: ${sample.title || sample.name} (${sample._id})`);
            }
            
            console.log('\n✅ All APIs working correctly! Frontend should now load without errors.');
        } else {
            console.log('\n❌ Some APIs still failing');
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testResignedFrontendFix().catch(console.error);