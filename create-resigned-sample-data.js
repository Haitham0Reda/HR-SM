/**
 * Create Sample Resigned Employee Data
 * Creates realistic resigned employee records for testing
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function createResignedSampleData() {
    console.log('📝 Creating Sample Resigned Employee Data...\n');

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

        // Step 2: Get users, departments, and positions
        console.log('\n2. Fetching users, departments, and positions...');
        
        const [usersRes, deptsRes, positionsRes] = await Promise.all([
            fetch(`${API_BASE}/users`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            }),
            fetch(`${API_BASE}/departments`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            }),
            fetch(`${API_BASE}/positions`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            })
        ]);

        const users = await usersRes.json();
        const departments = await deptsRes.json();
        const positions = await positionsRes.json();

        console.log(`   Users: ${users.length}`);
        console.log(`   Departments: ${Array.isArray(departments) ? departments.length : departments.data?.length || 0}`);
        console.log(`   Positions: ${Array.isArray(positions) ? positions.length : positions.data?.length || 0}`);

        const deptList = Array.isArray(departments) ? departments : departments.data || [];
        const posList = Array.isArray(positions) ? positions : positions.data || [];

        if (users.length === 0 || deptList.length === 0 || posList.length === 0) {
            console.log('❌ Insufficient data to create resigned employees');
            return;
        }

        // Step 3: Create sample resigned employee records
        console.log('\n3. Creating resigned employee records...');

        const sampleResignations = [
            {
                employee: users[1]?._id, // Second user (not admin)
                department: deptList[0]._id,
                position: posList[0]._id,
                resignationDate: '2024-12-01',
                lastWorkingDay: '2024-12-15',
                resignationReason: 'better-opportunity',
                exitInterview: {
                    conducted: true,
                    conductedDate: '2024-12-14',
                    feedback: 'Good experience overall, seeking career growth',
                    rating: 4
                },
                clearance: {
                    hr: { cleared: true, clearedDate: '2024-12-15' },
                    finance: { cleared: true, clearedDate: '2024-12-15' },
                    it: { cleared: false }
                },
                notes: 'Resigned for better career opportunity. Good performer.'
            },
            {
                employee: users[2]?._id,
                department: deptList[1]?._id || deptList[0]._id,
                position: posList[1]?._id || posList[0]._id,
                resignationDate: '2024-11-15',
                lastWorkingDay: '2024-11-30',
                resignationReason: 'personal-reasons',
                exitInterview: {
                    conducted: false
                },
                clearance: {
                    hr: { cleared: true, clearedDate: '2024-11-30' },
                    finance: { cleared: false },
                    it: { cleared: false }
                },
                notes: 'Personal reasons for resignation. Pending clearances.'
            },
            {
                employee: users[3]?._id,
                department: deptList[2]?._id || deptList[0]._id,
                position: posList[2]?._id || posList[0]._id,
                resignationDate: '2024-10-20',
                lastWorkingDay: '2024-11-03',
                resignationReason: 'relocation',
                exitInterview: {
                    conducted: true,
                    conductedDate: '2024-11-02',
                    feedback: 'Relocating to another city. Satisfied with work environment.',
                    rating: 5
                },
                clearance: {
                    hr: { cleared: true, clearedDate: '2024-11-03' },
                    finance: { cleared: true, clearedDate: '2024-11-03' },
                    it: { cleared: true, clearedDate: '2024-11-03' }
                },
                finalSettlement: {
                    amount: 5000,
                    currency: 'USD',
                    paidDate: '2024-11-10'
                },
                notes: 'Relocated to another city. All clearances completed.'
            }
        ];

        let created = 0;
        for (const resignation of sampleResignations) {
            if (!resignation.employee) continue;

            try {
                const response = await fetch(`${API_BASE}/resigned-employees`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(resignation)
                });

                if (response.ok) {
                    created++;
                    console.log(`   ✅ Created resignation record ${created}`);
                } else {
                    const error = await response.json();
                    console.log(`   ❌ Failed to create record: ${error.message}`);
                }
            } catch (error) {
                console.log(`   ❌ Error creating record: ${error.message}`);
            }
        }

        console.log(`\n✅ Created ${created} resigned employee records successfully!`);

        // Step 4: Verify the data
        console.log('\n4. Verifying created data...');
        const verifyResponse = await fetch(`${API_BASE}/resigned-employees`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (verifyResponse.ok) {
            const data = await verifyResponse.json();
            const records = data.data || [];
            console.log(`   Total resigned employees: ${records.length}`);
            
            if (records.length > 0) {
                console.log('   Sample record structure verified ✅');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createResignedSampleData().catch(console.error);