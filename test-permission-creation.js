/**
 * Test Permission Creation with Frontend Format
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
        return data.data.user;
    } else {
        console.error('❌ Login failed:', data.message);
        throw new Error('Login failed');
    }
}

async function testFrontendFormat(user) {
    console.log('\n📋 Testing Frontend Format Permission Creation...');
    
    // Test data in the format that the frontend form sends
    const frontendFormatData = {
        employee: user._id, // Add employee ID explicitly for testing
        permissionType: 'late-arrival',
        date: new Date().toISOString().split('T')[0],
        time: '10:30', // Single time string (when they want to arrive)
        reason: 'Medical appointment - frontend format test',
        duration: 1.5
    };
    
    try {
        console.log('📤 Sending data:', JSON.stringify(frontendFormatData, null, 2));
        
        const response = await fetch(`${API_BASE}/permission-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(frontendFormatData)
        });

        const data = await response.json();
        
        console.log(`📊 Response Status: ${response.status}`);
        console.log(`📊 Response:`, JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log('✅ Frontend format permission created successfully');
            console.log(`   ID: ${data.data._id}`);
            console.log(`   Type: ${data.data.permissionType}`);
            console.log(`   Scheduled Time: ${data.data.time.scheduled}`);
            console.log(`   Requested Time: ${data.data.time.requested}`);
            console.log(`   Status: ${data.data.status}`);
            return data.data;
        } else {
            console.error('❌ Failed to create permission:', data.message);
            if (data.details) {
                console.error('   Details:', data.details);
            }
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function testDifferentTypes(user) {
    console.log('\n📋 Testing Different Permission Types...');
    
    const testCases = [
        {
            permissionType: 'early-departure',
            time: '15:30',
            reason: 'Family emergency'
        },
        {
            permissionType: 'overtime',
            time: '20:00',
            reason: 'Project deadline'
        }
    ];
    
    for (const testCase of testCases) {
        try {
            console.log(`\n🧪 Testing ${testCase.permissionType}...`);
            
            const requestData = {
                employee: user._id, // Add employee ID
                ...testCase,
                date: new Date().toISOString().split('T')[0],
                duration: 2
            };
            
            const response = await fetch(`${API_BASE}/permission-requests`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();
            
            if (data.success) {
                console.log(`   ✅ ${testCase.permissionType} created`);
                console.log(`   Scheduled: ${data.data.time.scheduled} → Requested: ${data.data.time.requested}`);
            } else {
                console.log(`   ❌ ${testCase.permissionType} failed: ${data.message}`);
            }
        } catch (error) {
            console.log(`   ❌ ${testCase.permissionType} error: ${error.message}`);
        }
    }
}

async function main() {
    try {
        console.log('🧪 Permission Creation Test (Frontend Format)');
        console.log('==============================================');
        
        // Login
        const user = await login();
        
        // Test frontend format
        await testFrontendFormat(user);
        
        // Test different permission types
        await testDifferentTypes(user);
        
        console.log('\n✅ All tests completed!');
        console.log('\n🌐 You can now test the frontend form at:');
        console.log('   http://localhost:3000/company/test-company/permissions/create');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main();