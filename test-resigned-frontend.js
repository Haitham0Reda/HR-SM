/**
 * Test Resigned Frontend Data Loading
 * Tests if the resigned page can load all required data
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testResignedFrontend() {
    console.log('🧪 Testing Resigned Frontend Data Loading...\n');

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

        // Step 2: Test all required APIs for resigned page
        console.log('\n2. Testing all required APIs...');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // Test resigned employees
        const resignedResponse = await fetch(`${API_BASE}/resigned-employees`, { headers });
        console.log(`   Resigned Employees: ${resignedResponse.status} ${resignedResponse.ok ? '✅' : '❌'}`);
        
        // Test users
        const usersResponse = await fetch(`${API_BASE}/users`, { headers });
        console.log(`   Users: ${usersResponse.status} ${usersResponse.ok ? '✅' : '❌'}`);
        
        // Test departments
        const deptsResponse = await fetch(`${API_BASE}/departments`, { headers });
        console.log(`   Departments: ${deptsResponse.status} ${deptsResponse.ok ? '✅' : '❌'}`);
        
        // Test positions
        const positionsResponse = await fetch(`${API_BASE}/positions`, { headers });
        console.log(`   Positions: ${positionsResponse.status} ${positionsResponse.ok ? '✅' : '❌'}`);

        // Step 3: Parse and display data counts
        if (resignedResponse.ok && usersResponse.ok && deptsResponse.ok && positionsResponse.ok) {
            console.log('\n3. Data counts:');
            
            const resigned = await resignedResponse.json();
            const users = await usersResponse.json();
            const depts = await deptsResponse.json();
            const positions = await positionsResponse.json();
            
            console.log(`   Resigned Employees: ${resigned.data?.length || 0}`);
            console.log(`   Users: ${users.length || 0}`);
            console.log(`   Departments: ${Array.isArray(depts) ? depts.length : depts.data?.length || 0}`);
            console.log(`   Positions: ${Array.isArray(positions) ? positions.length : positions.data?.length || 0}`);
            
            console.log('\n✅ All APIs working - Frontend should load successfully!');
        } else {
            console.log('\n❌ Some APIs failed - Frontend may have issues');
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testResignedFrontend().catch(console.error);