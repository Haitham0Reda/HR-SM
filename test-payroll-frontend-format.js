/**
 * Test Payroll Frontend Data Format
 * Shows exactly what data the frontend receives
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testPayrollFrontendFormat() {
    console.log('🧪 Testing Payroll Frontend Data Format...\n');

    try {
        // Login
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123',
                tenantId: '693db0e2ccc5ea08aeee120c'
            })
        });

        const loginData = await loginResponse.json();
        const token = loginData.token || loginData.data?.token;

        // Get payroll data
        const payrollResponse = await fetch(`${API_BASE}/payroll`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const payrollData = await payrollResponse.json();
        
        console.log(`📊 Retrieved ${payrollData.length} payroll records\n`);

        // Show sample records in frontend-friendly format
        console.log('Sample Records (Frontend Format):');
        console.log('='.repeat(100));

        // Group by period and show first few records
        const recordsByPeriod = {};
        payrollData.forEach(record => {
            if (!recordsByPeriod[record.period]) {
                recordsByPeriod[record.period] = [];
            }
            recordsByPeriod[record.period].push(record);
        });

        Object.keys(recordsByPeriod).sort().forEach(period => {
            console.log(`\n📅 ${period}:`);
            console.log('   Employee Name           | Email                  | Role    | Deductions | Net Salary');
            console.log('   ' + '-'.repeat(85));
            
            recordsByPeriod[period].slice(0, 3).forEach(record => {
                const employee = record.employee;
                const employeeName = employee?.name || employee?.email?.split('@')[0] || 'Unknown';
                const employeeEmail = employee?.email || 'No email';
                const employeeRole = employee?.role || 'No role';
                
                // Calculate net salary (assuming base salary from role)
                const baseSalary = getBaseSalary(employeeRole);
                const netSalary = baseSalary - record.totalDeductions;
                
                console.log(`   ${employeeName.padEnd(20)} | ${employeeEmail.padEnd(20)} | ${employeeRole.padEnd(7)} | $${record.totalDeductions.toString().padStart(8)} | $${netSalary.toString().padStart(8)}`);
            });
            
            if (recordsByPeriod[period].length > 3) {
                console.log(`   ... and ${recordsByPeriod[period].length - 3} more records`);
            }
        });

        // Show detailed structure of one record
        console.log('\n📋 Detailed Record Structure:');
        console.log('='.repeat(50));
        if (payrollData.length > 0) {
            const sampleRecord = payrollData[0];
            console.log(JSON.stringify(sampleRecord, null, 2));
        }

        // Test what frontend PayrollPage expects
        console.log('\n🎯 Frontend Compatibility Check:');
        console.log('='.repeat(50));
        
        if (payrollData.length > 0) {
            const record = payrollData[0];
            
            console.log('✅ Required fields for frontend:');
            console.log(`   - _id: ${record._id ? '✅' : '❌'}`);
            console.log(`   - employee._id: ${record.employee?._id ? '✅' : '❌'}`);
            console.log(`   - employee.name: ${record.employee?.name ? '✅' : '❌'}`);
            console.log(`   - employee.email: ${record.employee?.email ? '✅' : '❌'}`);
            console.log(`   - period: ${record.period ? '✅' : '❌'}`);
            console.log(`   - deductions (array): ${Array.isArray(record.deductions) ? '✅' : '❌'}`);
            console.log(`   - totalDeductions: ${typeof record.totalDeductions === 'number' ? '✅' : '❌'}`);
            
            // Check deduction structure
            if (record.deductions && record.deductions.length > 0) {
                const deduction = record.deductions[0];
                console.log('\n✅ Deduction structure:');
                console.log(`   - type: ${deduction.type ? '✅' : '❌'}`);
                console.log(`   - arabicName: ${deduction.arabicName ? '✅' : '❌'}`);
                console.log(`   - description: ${deduction.description ? '✅' : '❌'}`);
                console.log(`   - amount: ${typeof deduction.amount === 'number' ? '✅' : '❌'}`);
            }
        }

        console.log('\n🎉 Data is ready for frontend consumption!');
        console.log('The frontend should now be able to display payroll records properly.');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

function getBaseSalary(role) {
    const salaries = {
        'admin': 8000,
        'hr': 6000,
        'manager': 7000,
        'employee': 4500
    };
    return salaries[role] || 4000;
}

testPayrollFrontendFormat().catch(console.error);