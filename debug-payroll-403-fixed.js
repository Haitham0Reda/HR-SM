/**
 * Debug Payroll 403 Forbidden Error - Fixed Version
 * Investigates why the payroll API is returning 403 after authentication
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function debugPayroll403() {
    console.log('🔍 Debugging Payroll 403 Forbidden Error...\n');

    try {
        // Step 1: Login and get user info
        console.log('1. Attempting login with correct tenant ID...');
        
        // Try different login approaches
        const loginAttempts = [
            {
                name: 'With X-Tenant-ID header',
                headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': '693db0e2ccc5ea08aeee120c' },
                body: { email: 'admin@techcorp.com', password: 'admin123' }
            },
            {
                name: 'With tenantId in body',
                headers: { 'Content-Type': 'application/json' },
                body: { email: 'admin@techcorp.com', password: 'admin123', tenantId: '693db0e2ccc5ea08aeee120c' }
            },
            {
                name: 'Default password attempt',
                headers: { 'Content-Type': 'application/json' },
                body: { email: 'admin@techcorp.com', password: 'password123', tenantId: '693db0e2ccc5ea08aeee120c' }
            },
            {
                name: 'Simple password attempt',
                headers: { 'Content-Type': 'application/json' },
                body: { email: 'admin@techcorp.com', password: 'password', tenantId: '693db0e2ccc5ea08aeee120c' }
            }
        ];

        let authData = null;
        let token = null;
        let user = null;

        for (const attempt of loginAttempts) {
            console.log(`   Trying: ${attempt.name}...`);
            
            const loginResponse = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: attempt.headers,
                body: JSON.stringify(attempt.body)
            });

            if (loginResponse.ok) {
                const responseData = await loginResponse.json();
                authData = responseData;
                token = responseData.token || responseData.data?.token;
                user = responseData.user || responseData.data?.user;
                console.log(`   ✅ ${attempt.name} successful!`);
                break;
            } else {
                const error = await loginResponse.json();
                console.log(`   ❌ ${attempt.name} failed:`, error.message);
            }
        }

        if (!token) {
            console.log('❌ All login attempts failed');
            return;
        }

        console.log('✅ Login successful');
        console.log('   User role:', user?.role);
        console.log('   User tenant:', user?.tenantId);
        console.log('   Token exists:', !!token);

        // Step 2: Check user info via /auth/me
        console.log('\n2. Checking user info via /auth/me...');
        const meResponse = await fetch(`${API_BASE}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': '693db0e2ccc5ea08aeee120c'
            }
        });

        if (meResponse.ok) {
            const meData = await meResponse.json();
            console.log('✅ User info retrieved:');
            console.log('   Role:', meData.data?.role || meData.role);
            console.log('   Tenant ID:', meData.data?.tenantId || meData.tenantId);
            console.log('   Email:', meData.data?.email || meData.email);
        } else {
            console.log('❌ Failed to get user info:', await meResponse.json());
        }

        // Step 3: Check license info
        console.log('\n3. Checking license info...');
        const licenseResponse = await fetch(`${API_BASE}/licenses/693db0e2ccc5ea08aeee120c`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': '693db0e2ccc5ea08aeee120c'
            }
        });

        if (licenseResponse.ok) {
            const licenseData = await licenseResponse.json();
            console.log('✅ License info retrieved:');
            console.log('   License data:', JSON.stringify(licenseData, null, 2));
            
            // Check if payroll module is enabled
            const modules = licenseData.modules || licenseData.data?.modules || [];
            const payrollModule = modules.find(m => m.key === 'payroll');
            console.log('   Payroll module:', payrollModule ? 'Found' : 'Not found');
            if (payrollModule) {
                console.log('   Payroll enabled:', payrollModule.enabled);
            }
        } else {
            console.log('❌ Failed to get license info:', await licenseResponse.json());
        }

        // Step 4: Try payroll endpoint with detailed error
        console.log('\n4. Testing payroll endpoint...');
        const payrollResponse = await fetch(`${API_BASE}/payroll`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': '693db0e2ccc5ea08aeee120c'
            }
        });

        console.log(`   Payroll Status: ${payrollResponse.status}`);
        const payrollData = await payrollResponse.json();
        console.log('   Payroll Response:', JSON.stringify(payrollData, null, 2));

        if (payrollResponse.status === 403) {
            console.log('\n🔍 403 Forbidden Analysis:');
            if (payrollData.error === 'MODULE_NOT_LICENSED') {
                console.log('   Issue: Payroll module is not licensed for this tenant');
                console.log('   Solution: Enable payroll module license');
            } else if (payrollData.error === 'INSUFFICIENT_PERMISSIONS') {
                console.log('   Issue: User does not have required permissions');
                console.log('   Solution: Ensure user has HR or Admin role');
            } else {
                console.log('   Issue: Unknown 403 error');
                console.log('   Error details:', payrollData);
            }
        }

    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugPayroll403().catch(console.error);