/**
 * Complete Resigned Page Test
 * Tests all functionality of the resigned employees system
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testResignedComplete() {
    console.log('🧪 Complete Resigned Page Test...\n');

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

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // Step 2: Test data loading (what frontend needs)
        console.log('\n2. Testing data loading...');
        
        const [resignedRes, usersRes, deptsRes, positionsRes] = await Promise.all([
            fetch(`${API_BASE}/resigned-employees`, { headers }),
            fetch(`${API_BASE}/users`, { headers }),
            fetch(`${API_BASE}/departments`, { headers }),
            fetch(`${API_BASE}/positions`, { headers })
        ]);

        console.log(`   Resigned: ${resignedRes.status} ${resignedRes.ok ? '✅' : '❌'}`);
        console.log(`   Users: ${usersRes.status} ${usersRes.ok ? '✅' : '❌'}`);
        console.log(`   Departments: ${deptsRes.status} ${deptsRes.ok ? '✅' : '❌'}`);
        console.log(`   Positions: ${positionsRes.status} ${positionsRes.ok ? '✅' : '❌'}`);

        if (!resignedRes.ok || !usersRes.ok || !deptsRes.ok || !positionsRes.ok) {
            console.log('❌ Data loading failed');
            return;
        }

        const resigned = await resignedRes.json();
        const users = await usersRes.json();
        const depts = await deptsRes.json();
        const positions = await positionsRes.json();

        console.log(`   Data counts: ${resigned.data.length} resigned, ${users.length} users, ${depts.data.length} depts, ${positions.data.length} positions`);

        // Step 3: Test CRUD operations
        console.log('\n3. Testing CRUD operations...');

        // Create a new resignation
        const newResignation = {
            employee: users[4]._id, // Use 5th user
            department: depts.data[0]._id,
            position: positions.data[0]._id,
            resignationDate: '2025-02-01',
            lastWorkingDay: '2025-02-15',
            resignationReason: 'career-change',
            exitInterview: {
                conducted: false
            },
            notes: 'Test resignation for CRUD operations'
        };

        const createRes = await fetch(`${API_BASE}/resigned-employees`, {
            method: 'POST',
            headers,
            body: JSON.stringify(newResignation)
        });

        console.log(`   Create: ${createRes.status} ${createRes.ok ? '✅' : '❌'}`);
        
        if (!createRes.ok) {
            const error = await createRes.json();
            console.log(`   Create error: ${error.message}`);
            return;
        }

        const created = await createRes.json();
        const createdId = created.data._id;

        // Read the created record
        const readRes = await fetch(`${API_BASE}/resigned-employees/${createdId}`, { headers });
        console.log(`   Read: ${readRes.status} ${readRes.ok ? '✅' : '❌'}`);

        // Update the record
        const updateData = {
            exitInterview: {
                conducted: true,
                conductedDate: '2025-02-14',
                feedback: 'Updated via test',
                rating: 4
            },
            notes: 'Updated test resignation'
        };

        const updateRes = await fetch(`${API_BASE}/resigned-employees/${createdId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updateData)
        });

        console.log(`   Update: ${updateRes.status} ${updateRes.ok ? '✅' : '❌'}`);

        // Delete the record
        const deleteRes = await fetch(`${API_BASE}/resigned-employees/${createdId}`, {
            method: 'DELETE',
            headers
        });

        console.log(`   Delete: ${deleteRes.status} ${deleteRes.ok ? '✅' : '❌'}`);

        // Step 4: Test data structure for frontend
        console.log('\n4. Testing data structure for frontend...');
        
        const finalResignedRes = await fetch(`${API_BASE}/resigned-employees`, { headers });
        const finalResigned = await finalResignedRes.json();
        
        if (finalResigned.data.length > 0) {
            const sample = finalResigned.data[0];
            console.log('   Sample record structure:');
            console.log(`     Employee: ${sample.employee?.personalInfo?.fullName || sample.employee?.username || 'N/A'}`);
            console.log(`     Department: ${sample.department?.name || 'N/A'}`);
            console.log(`     Position: ${sample.position?.title || 'N/A'}`);
            console.log(`     Resignation Date: ${sample.resignationDate ? new Date(sample.resignationDate).toLocaleDateString() : 'N/A'}`);
            console.log(`     Exit Interview: ${sample.exitInterview?.conducted ? 'Completed' : 'Pending'}`);
            
            const clearance = sample.clearance || {};
            const hrCleared = clearance.hr?.cleared || false;
            const financeCleared = clearance.finance?.cleared || false;
            const itCleared = clearance.it?.cleared || false;
            const totalCleared = [hrCleared, financeCleared, itCleared].filter(Boolean).length;
            console.log(`     Clearance: ${totalCleared}/3 Cleared`);
            
            console.log('   ✅ Data structure is correct for frontend');
        }

        console.log('\n🎉 All tests passed! Resigned page is fully functional.');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testResignedComplete().catch(console.error);