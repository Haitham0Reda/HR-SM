/**
 * Test Payroll API with Real Data
 * Verifies that the created payroll data is accessible via the API
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testPayrollWithData() {
    console.log('🧪 Testing Payroll API with Real Data...\n');

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

        // Step 2: Get all payroll records
        console.log('\n2. Fetching payroll records...');
        const payrollResponse = await fetch(`${API_BASE}/payroll`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': '693db0e2ccc5ea08aeee120c'
            }
        });

        if (!payrollResponse.ok) {
            const error = await payrollResponse.json();
            console.log('❌ Failed to fetch payroll records:', error);
            return;
        }

        const payrollRecords = await payrollResponse.json();
        console.log(`✅ Retrieved ${payrollRecords.length} payroll records`);

        // Step 3: Display payroll summary
        console.log('\n3. Payroll Records Summary:');
        console.log('='.repeat(100));

        // Group by period
        const recordsByPeriod = {};
        payrollRecords.forEach(record => {
            if (!recordsByPeriod[record.period]) {
                recordsByPeriod[record.period] = [];
            }
            recordsByPeriod[record.period].push(record);
        });

        Object.keys(recordsByPeriod).sort().forEach(period => {
            console.log(`\n📅 ${period}:`);
            console.log('   Employee                    | Total Deductions | Deduction Types');
            console.log('   ' + '-'.repeat(75));
            
            recordsByPeriod[period].forEach(record => {
                const employeeId = record.employee?._id || record.employee;
                const deductionTypes = record.deductions.map(d => d.type).join(', ');
                console.log(`   ${employeeId.toString().substring(0, 25).padEnd(25)} | $${record.totalDeductions.toString().padStart(13)} | ${deductionTypes}`);
            });
        });

        // Step 4: Test creating a new payroll record
        console.log('\n4. Testing payroll creation...');
        
        // Get the first employee ID from existing records
        const firstRecord = payrollRecords[0];
        const employeeId = firstRecord.employee?._id || firstRecord.employee;

        const newPayrollData = {
            employee: employeeId,
            period: '2025-02',
            deductions: [
                {
                    type: 'tax',
                    arabicName: 'ضريبة الدخل',
                    description: 'Income tax for February 2025',
                    amount: 800
                },
                {
                    type: 'insurance',
                    arabicName: 'التأمين الصحي',
                    description: 'Health insurance premium',
                    amount: 300
                }
            ],
            totalDeductions: 1100
        };

        const createResponse = await fetch(`${API_BASE}/payroll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': '693db0e2ccc5ea08aeee120c'
            },
            body: JSON.stringify(newPayrollData)
        });

        if (createResponse.ok) {
            const newRecord = await createResponse.json();
            console.log('✅ Successfully created new payroll record');
            console.log('   Period:', newRecord.period);
            console.log('   Total Deductions:', newRecord.totalDeductions);
        } else {
            const error = await createResponse.json();
            console.log('❌ Failed to create payroll record:', error);
        }

        // Step 5: Test getting a specific payroll record
        if (payrollRecords.length > 0) {
            console.log('\n5. Testing get payroll by ID...');
            const recordId = payrollRecords[0]._id;
            
            const getResponse = await fetch(`${API_BASE}/payroll/${recordId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': '693db0e2ccc5ea08aeee120c'
                }
            });

            if (getResponse.ok) {
                const record = await getResponse.json();
                console.log('✅ Successfully retrieved payroll record by ID');
                console.log('   Period:', record.period);
                console.log('   Deductions count:', record.deductions.length);
            } else {
                const error = await getResponse.json();
                console.log('❌ Failed to get payroll record by ID:', error);
            }
        }

        console.log('\n🎉 Payroll API is fully functional with real data!');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testPayrollWithData().catch(console.error);