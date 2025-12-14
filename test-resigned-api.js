/**
 * Test Resigned Employees API
 * Tests if the resigned employees API is working properly
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testResignedAPI() {
    console.log('🧪 Testing Resigned Employees API...\n');

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

        // Step 2: Test resigned employees endpoint
        console.log('\n2. Testing resigned employees endpoint...');
        const resignedResponse = await fetch(`${API_BASE}/resigned-employees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Status: ${resignedResponse.status}`);
        
        if (!resignedResponse.ok) {
            const error = await resignedResponse.json();
            console.log('❌ Resigned employees API failed:', error);
            return;
        }

        const resignedData = await resignedResponse.json();
        console.log('✅ Resigned employees API successful');
        console.log(`   Response structure:`, Object.keys(resignedData));
        
        if (resignedData.data) {
            console.log(`   Records found: ${resignedData.data.length}`);
            if (resignedData.data.length > 0) {
                console.log('   Sample record structure:', Object.keys(resignedData.data[0]));
            }
        } else if (Array.isArray(resignedData)) {
            console.log(`   Records found: ${resignedData.length}`);
            if (resignedData.length > 0) {
                console.log('   Sample record structure:', Object.keys(resignedData[0]));
            }
        }

        // Step 3: Test creating a resigned employee record
        console.log('\n3. Testing resigned employee creation...');
        
        // Get users first
        const usersResponse = await fetch(`${API_BASE}/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!usersResponse.ok) {
            console.log('❌ Failed to fetch users for creation test');
            return;
        }

        const users = await usersResponse.json();
        if (!users || users.length === 0) {
            console.log('❌ No users found for creation test');
            return;
        }

        const testEmployee = users[0];
        console.log(`   Using employee: ${testEmployee.name || testEmployee.username || testEmployee.email}`);

        // Get departments and positions
        const deptResponse = await fetch(`${API_BASE}/departments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const posResponse = await fetch(`${API_BASE}/positions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        let department = null;
        let position = null;

        if (deptResponse.ok) {
            const depts = await deptResponse.json();
            department = (Array.isArray(depts) ? depts : depts.data || [])[0];
        }

        if (posResponse.ok) {
            const positions = await posResponse.json();
            position = (Array.isArray(positions) ? positions : positions.data || [])[0];
        }

        const testResignation = {
            employee: testEmployee._id,
            department: department?._id || '507f1f77bcf86cd799439011', // fallback ObjectId
            position: position?._id || '507f1f77bcf86cd799439012', // fallback ObjectId
            resignationDate: '2025-01-15',
            lastWorkingDay: '2025-01-31',
            resignationReason: 'better-opportunity', // Use enum value
            exitInterview: {
                conducted: false
            },
            notes: 'Test resignation record'
        };

        const createResponse = await fetch(`${API_BASE}/resigned-employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(testResignation)
        });

        console.log(`   Creation Status: ${createResponse.status}`);
        const createData = await createResponse.json();
        console.log('   Creation Response:', JSON.stringify(createData, null, 2));

        if (createResponse.ok) {
            console.log('✅ Resigned employee record created successfully');
        } else {
            console.log(`❌ Resigned employee creation failed: ${createResponse.status}`);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testResignedAPI().catch(console.error);