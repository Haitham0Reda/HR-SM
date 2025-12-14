/**
 * Debug Resigned Employee Authentication
 * Tests if the authentication is working properly for resigned employees API
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function debugResignedAuth() {
    console.log('🔍 Debugging Resigned Employee Authentication...\n');

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
        console.log('   Token exists:', !!token);

        // Step 2: Test departments endpoint
        console.log('\n2. Testing departments endpoint...');
        const deptResponse = await fetch(`${API_BASE}/departments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Departments Status: ${deptResponse.status}`);
        if (deptResponse.ok) {
            const depts = await deptResponse.json();
            console.log('   Departments found:', Array.isArray(depts) ? depts.length : (depts.data?.length || 0));
        } else {
            const error = await deptResponse.json();
            console.log('   Departments error:', error);
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

        console.log(`   Positions Status: ${posResponse.status}`);
        if (posResponse.ok) {
            const positions = await posResponse.json();
            console.log('   Positions found:', Array.isArray(positions) ? positions.length : (positions.data?.length || 0));
        } else {
            const error = await posResponse.json();
            console.log('   Positions error:', error);
        }

        // Step 4: Test minimal resigned employee creation
        console.log('\n4. Testing minimal resigned employee creation...');
        
        const minimalResignation = {
            employee: '507f1f77bcf86cd799439011', // dummy ObjectId
            department: '507f1f77bcf86cd799439012', // dummy ObjectId
            position: '507f1f77bcf86cd799439013', // dummy ObjectId
            resignationDate: '2025-01-15',
            lastWorkingDay: '2025-01-31',
            resignationReason: 'better-opportunity'
        };

        const createResponse = await fetch(`${API_BASE}/resigned-employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(minimalResignation)
        });

        console.log(`   Creation Status: ${createResponse.status}`);
        const createData = await createResponse.json();
        console.log('   Creation Response:', JSON.stringify(createData, null, 2));

    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugResignedAuth().catch(console.error);