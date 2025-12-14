/**
 * Debug Payroll Frontend Data Display Issue
 * Investigates why the frontend isn't showing payroll data
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function debugPayrollFrontend() {
    console.log('🔍 Debugging Payroll Frontend Data Display Issue...\n');

    try {
        // Step 1: Test the exact API call the frontend makes
        console.log('1. Testing frontend API call simulation...');
        
        // Login first (simulate frontend login)
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
        console.log('   Token format:', token ? `${token.substring(0, 20)}...` : 'No token');

        // Step 2: Test payroll API call exactly as frontend would
        console.log('\n2. Testing payroll API call (frontend style)...');
        
        const payrollResponse = await fetch(`${API_BASE}/payroll`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
                // Note: Not including X-Tenant-ID header as frontend might not send it
            }
        });

        console.log(`   Status: ${payrollResponse.status}`);
        
        if (!payrollResponse.ok) {
            const error = await payrollResponse.json();
            console.log('❌ Payroll API call failed:', error);
            
            // Try with X-Tenant-ID header
            console.log('\n   Retrying with X-Tenant-ID header...');
            const retryResponse = await fetch(`${API_BASE}/payroll`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': '693db0e2ccc5ea08aeee120c'
                }
            });
            
            console.log(`   Retry Status: ${retryResponse.status}`);
            if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                console.log('✅ Success with X-Tenant-ID header');
                console.log(`   Records found: ${retryData.length}`);
                return retryData;
            } else {
                const retryError = await retryResponse.json();
                console.log('❌ Still failed with X-Tenant-ID:', retryError);
            }
            return;
        }

        const payrollData = await payrollResponse.json();
        console.log('✅ Payroll API call successful');
        console.log(`   Records returned: ${payrollData.length}`);

        // Step 3: Check data format
        if (payrollData.length > 0) {
            console.log('\n3. Checking data format...');
            const firstRecord = payrollData[0];
            console.log('   Sample record structure:');
            console.log('   - ID:', firstRecord._id ? '✅' : '❌');
            console.log('   - Employee:', firstRecord.employee ? '✅' : '❌');
            console.log('   - Period:', firstRecord.period ? '✅' : '❌');
            console.log('   - Deductions:', Array.isArray(firstRecord.deductions) ? `✅ (${firstRecord.deductions.length} items)` : '❌');
            console.log('   - Total Deductions:', typeof firstRecord.totalDeductions === 'number' ? '✅' : '❌');
            
            // Check if employee data is populated
            if (firstRecord.employee) {
                if (typeof firstRecord.employee === 'string') {
                    console.log('   - Employee format: ID only (needs population)');
                } else if (firstRecord.employee.name || firstRecord.employee.email) {
                    console.log('   - Employee format: Populated object ✅');
                } else {
                    console.log('   - Employee format: Object but missing name/email');
                }
            }
        } else {
            console.log('\n3. No records found');
            console.log('   This could be why frontend shows no data');
        }

        // Step 4: Check if data exists in database directly
        console.log('\n4. Checking database directly...');
        
        // We'll use a different approach - check via users API to see if tenant context is working
        const usersResponse = await fetch(`${API_BASE}/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (usersResponse.ok) {
            const users = await usersResponse.json();
            console.log(`   Users API returned: ${users.length} users`);
            if (users.length > 0) {
                console.log('   Tenant context is working for users API');
            }
        } else {
            console.log('   Users API also failed - tenant context issue');
        }

        return payrollData;

    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

// Also test the payroll controller directly
async function testPayrollController() {
    console.log('\n5. Testing payroll controller behavior...');
    
    try {
        // Check if the issue is in the controller's tenant filtering
        const response = await fetch(`${API_BASE}/payroll`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getToken()}`,
                'X-Tenant-ID': '693db0e2ccc5ea08aeee120c'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`   Controller returned ${data.length} records`);
            
            if (data.length === 0) {
                console.log('   ⚠️  Controller returns empty array - possible tenant filtering issue');
                console.log('   Recommendations:');
                console.log('   1. Check if payroll controller uses tenant context');
                console.log('   2. Verify payroll model has tenantId field');
                console.log('   3. Check if data was created with correct tenantId');
            }
        }
    } catch (error) {
        console.log('   Error testing controller:', error.message);
    }
}

async function getToken() {
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
    return loginData.token || loginData.data?.token;
}

async function runDebug() {
    const data = await debugPayrollFrontend();
    await testPayrollController();
    
    console.log('\n' + '='.repeat(80));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(80));
    
    if (!data || data.length === 0) {
        console.log('❌ ISSUE FOUND: No payroll data returned by API');
        console.log('\nPossible causes:');
        console.log('1. Tenant context not properly set in payroll controller');
        console.log('2. Payroll data created with wrong tenantId');
        console.log('3. Frontend not sending proper authentication headers');
        console.log('4. Payroll controller not using tenant filtering');
        
        console.log('\nNext steps:');
        console.log('1. Check payroll controller implementation');
        console.log('2. Verify payroll data has correct tenantId');
        console.log('3. Update frontend to send X-Tenant-ID header if needed');
    } else {
        console.log('✅ API returns data correctly');
        console.log('Issue might be in frontend data processing or display logic');
    }
}

runDebug().catch(console.error);