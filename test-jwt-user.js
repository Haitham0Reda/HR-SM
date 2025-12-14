/**
 * Test JWT User Extraction
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

// Test Company credentials
const TEST_COMPANY_CREDENTIALS = {
    email: 'admin@testcompany.com',
    password: 'admin123',
    tenantId: '693cd43ec91e4189aa2ecd2f'
};

let authToken = null;

async function login() {
    console.log('🔐 Logging in...');
    
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(TEST_COMPANY_CREDENTIALS)
    });

    const data = await response.json();
    
    if (data.success && data.data?.token) {
        authToken = data.data.token;
        console.log('✅ Login successful');
        console.log('Token:', authToken.substring(0, 50) + '...');
        return data.data.user;
    } else {
        console.error('❌ Login failed:', data.message);
        throw new Error('Login failed');
    }
}

async function testJWTUser() {
    console.log('\n📋 Testing JWT User Extraction...');
    
    // Test data WITHOUT employee ID to see if JWT user is used
    const testData = {
        permissionType: 'late-arrival',
        date: new Date().toISOString().split('T')[0],
        time: '10:30',
        reason: 'Testing JWT user extraction'
    };
    
    try {
        console.log('📤 Sending data without employee ID:', JSON.stringify(testData, null, 2));
        
        const response = await fetch(`${API_BASE}/permission-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        const data = await response.json();
        
        console.log(`📊 Response Status: ${response.status}`);
        console.log(`📊 Response:`, JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log('✅ JWT user extraction working');
            console.log(`   Employee ID from JWT: ${data.data.employee}`);
        } else {
            console.error('❌ JWT user extraction failed:', data.message);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function main() {
    try {
        console.log('🧪 JWT User Extraction Test');
        console.log('===========================');
        
        // Login
        const user = await login();
        console.log('User ID from login:', user._id);
        
        // Test JWT user extraction
        await testJWTUser();
        
        console.log('\n✅ Test completed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main();