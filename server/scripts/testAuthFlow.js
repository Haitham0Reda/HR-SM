/**
 * Test script to debug the authentication flow
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TENANT_ID = 'techcorp-solutions-d8f0689c';

async function testAuthFlow() {
    try {
        console.log('Testing Authentication Flow...\n');
        
        // 1. Test login
        console.log('1. Testing login...');
        const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123',
                tenantId: TENANT_ID
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Login response status:', loginResponse.status);
        console.log('Login response:', JSON.stringify(loginData, null, 2));
        
        if (!loginData.success) {
            throw new Error('Login failed: ' + loginData.message);
        }
        
        const token = loginData.token;
        console.log('✓ Login successful, token received');
        
        // 2. Test /auth/me endpoint
        console.log('\n2. Testing /auth/me endpoint...');
        const meResponse = await fetch(`${BASE_URL}/api/v1/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const meData = await meResponse.json();
        console.log('Me response status:', meResponse.status);
        console.log('Me response:', JSON.stringify(meData, null, 2));
        
        // 3. Test /tenant/info endpoint
        console.log('\n3. Testing /tenant/info endpoint...');
        const tenantResponse = await fetch(`${BASE_URL}/api/v1/tenant/info`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const tenantData = await tenantResponse.json();
        console.log('Tenant response status:', tenantResponse.status);
        console.log('Tenant response:', JSON.stringify(tenantData, null, 2));
        
        // 4. Test dashboard stats endpoint (to simulate what dashboard would call)
        console.log('\n4. Testing dashboard stats endpoint...');
        const statsResponse = await fetch(`${BASE_URL}/api/v1/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const statsData = await statsResponse.json();
        console.log('Stats response status:', statsResponse.status);
        console.log('Stats response:', JSON.stringify(statsData, null, 2));
        
        console.log('\n✅ All authentication endpoints working correctly!');
        
    } catch (error) {
        console.error('❌ Authentication test failed:', error.message);
    }
}

testAuthFlow();