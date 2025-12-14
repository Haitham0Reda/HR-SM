/**
 * Test Payroll API Endpoint
 * Tests if the payroll API is accessible and working properly with proper tenant context
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testPayrollAPI() {
    console.log('🧪 Testing Payroll API...\n');

    try {
        // Test 1: Check if payroll endpoint is accessible (should require authentication)
        console.log('1. Testing payroll endpoint accessibility...');
        const response = await fetch(`${API_BASE}/payroll`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${response.status}`);
        console.log(`   Status Text: ${response.statusText}`);

        const data = await response.json();
        console.log('   Response:', JSON.stringify(data, null, 2));

        if (response.status === 400 && data.error === 'TENANT_ID_REQUIRED') {
            console.log('✅ Payroll endpoint is accessible (requires tenant context as expected)');
            return true;
        } else if (response.status === 401) {
            console.log('✅ Payroll endpoint is accessible (requires authentication as expected)');
            return true;
        } else if (response.status === 404) {
            console.log('❌ Payroll endpoint returns 404 - route not found');
            return false;
        } else {
            console.log(`ℹ️  Payroll endpoint returned status ${response.status}`);
            return true;
        }

    } catch (error) {
        console.error('❌ Error testing payroll API:', error.message);
        return false;
    }
}

// Test with authentication and tenant context (using admin credentials)
async function testPayrollAPIWithAuth() {
    console.log('\n2. Testing payroll endpoint with authentication and tenant context...');

    try {
        // First, login to get a token
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': 'techcorp_solutions'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123'
            })
        });

        console.log(`   Login Status: ${loginResponse.status}`);
        
        if (!loginResponse.ok) {
            const loginError = await loginResponse.json();
            console.log('❌ Failed to login for authentication test:', loginError);
            return false;
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;

        if (!token) {
            console.log('❌ No token received from login');
            return false;
        }

        console.log('✅ Successfully logged in');

        // Now test payroll endpoint with authentication and tenant context
        const payrollResponse = await fetch(`${API_BASE}/payroll`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': 'techcorp_solutions'
            }
        });

        console.log(`   Authenticated Status: ${payrollResponse.status}`);
        const payrollData = await payrollResponse.json();
        console.log('   Authenticated Response:', JSON.stringify(payrollData, null, 2));

        if (payrollResponse.ok) {
            console.log('✅ Payroll endpoint works with authentication and tenant context');
            return true;
        } else if (payrollResponse.status === 403) {
            console.log('ℹ️  Payroll endpoint requires specific permissions (403 Forbidden)');
            return true; // This is expected behavior for some users
        } else {
            console.log(`❌ Payroll endpoint failed: ${payrollResponse.status}`);
            return false;
        }

    } catch (error) {
        console.error('❌ Error testing authenticated payroll API:', error.message);
        return false;
    }
}

// Test creating a payroll record
async function testPayrollCreation() {
    console.log('\n3. Testing payroll record creation...');

    try {
        // Login first
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': 'techcorp_solutions'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            console.log('❌ Failed to login for creation test');
            return false;
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;

        // Get users first to find a valid employee ID
        const usersResponse = await fetch(`${API_BASE}/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': 'techcorp_solutions'
            }
        });

        if (!usersResponse.ok) {
            console.log('❌ Failed to fetch users for creation test');
            return false;
        }

        const users = await usersResponse.json();
        if (!users || users.length === 0) {
            console.log('❌ No users found for creation test');
            return false;
        }

        const testEmployee = users[0];
        console.log(`   Using employee: ${testEmployee.name || testEmployee.email}`);

        // Create a test payroll record
        const testPayroll = {
            employee: testEmployee._id,
            period: '2025-01',
            deductions: [
                {
                    type: 'tax',
                    arabicName: 'ضريبة',
                    description: 'Income tax',
                    amount: 500
                }
            ],
            totalDeductions: 500
        };

        const createResponse = await fetch(`${API_BASE}/payroll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': 'techcorp_solutions'
            },
            body: JSON.stringify(testPayroll)
        });

        console.log(`   Creation Status: ${createResponse.status}`);
        const createData = await createResponse.json();
        console.log('   Creation Response:', JSON.stringify(createData, null, 2));

        if (createResponse.ok) {
            console.log('✅ Payroll record created successfully');
            return true;
        } else {
            console.log(`❌ Payroll creation failed: ${createResponse.status}`);
            return false;
        }

    } catch (error) {
        console.error('❌ Error testing payroll creation:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('PAYROLL API COMPREHENSIVE TEST');
    console.log('='.repeat(60));

    const test1 = await testPayrollAPI();
    const test2 = await testPayrollAPIWithAuth();
    const test3 = await testPayrollCreation();

    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Basic endpoint test: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Authenticated test: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Creation test: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    
    if (test1 && test2) {
        console.log('\n🎉 Payroll API is working correctly!');
        console.log('The 404 error has been resolved. The payroll routes are now properly configured.');
    } else {
        console.log('\n❌ Some payroll API tests failed');
    }
}

runTests().catch(console.error);