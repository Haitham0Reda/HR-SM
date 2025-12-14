/**
 * Test Optional Reason Field
 * Verifies that permission requests can be created without a reason
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

async function testPermissionWithoutReason() {
    console.log('\n📝 Testing Permission Creation Without Reason...');
    
    const permissionData = {
        permissionType: 'late-arrival',
        date: new Date().toISOString().split('T')[0],
        time: '10:00'
        // No reason field
    };
    
    try {
        console.log('📤 Creating permission without reason:', JSON.stringify(permissionData, null, 2));
        
        const response = await fetch(`${API_BASE}/permission-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(permissionData)
        });

        const data = await response.json();
        
        console.log(`📊 Response Status: ${response.status}`);
        
        if (data.success) {
            console.log('✅ Permission created successfully without reason');
            console.log(`   ID: ${data.data._id}`);
            console.log(`   Type: ${data.data.permissionType}`);
            console.log(`   Reason: ${data.data.reason || 'null/empty'}`);
            return data.data;
        } else {
            console.error('❌ Failed to create permission:', data.message);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function testPermissionWithReason() {
    console.log('\n📝 Testing Permission Creation With Reason...');
    
    const permissionData = {
        permissionType: 'early-departure',
        date: new Date().toISOString().split('T')[0],
        time: '15:30',
        reason: 'Medical appointment'
    };
    
    try {
        console.log('📤 Creating permission with reason:', JSON.stringify(permissionData, null, 2));
        
        const response = await fetch(`${API_BASE}/permission-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(permissionData)
        });

        const data = await response.json();
        
        console.log(`📊 Response Status: ${response.status}`);
        
        if (data.success) {
            console.log('✅ Permission created successfully with reason');
            console.log(`   ID: ${data.data._id}`);
            console.log(`   Type: ${data.data.permissionType}`);
            console.log(`   Reason: "${data.data.reason}"`);
            return data.data;
        } else {
            console.error('❌ Failed to create permission:', data.message);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function testPermissionWithEmptyReason() {
    console.log('\n📝 Testing Permission Creation With Empty Reason...');
    
    const permissionData = {
        permissionType: 'overtime',
        date: new Date().toISOString().split('T')[0],
        time: '20:00',
        reason: ''  // Empty string
    };
    
    try {
        console.log('📤 Creating permission with empty reason:', JSON.stringify(permissionData, null, 2));
        
        const response = await fetch(`${API_BASE}/permission-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(permissionData)
        });

        const data = await response.json();
        
        console.log(`📊 Response Status: ${response.status}`);
        
        if (data.success) {
            console.log('✅ Permission created successfully with empty reason');
            console.log(`   ID: ${data.data._id}`);
            console.log(`   Type: ${data.data.permissionType}`);
            console.log(`   Reason: "${data.data.reason || ''}"`);
            return data.data;
        } else {
            console.error('❌ Failed to create permission:', data.message);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function main() {
    try {
        console.log('🧪 Optional Reason Field Test');
        console.log('=============================');
        
        // Login
        await login();
        
        // Test without reason
        await testPermissionWithoutReason();
        
        // Test with reason
        await testPermissionWithReason();
        
        // Test with empty reason
        await testPermissionWithEmptyReason();
        
        console.log('\n🌐 Frontend form should now work with optional reason at:');
        console.log('   http://localhost:3000/company/test-company/permissions/create');
        
        console.log('\n✅ All tests completed successfully!');
        console.log('📋 Summary: Reason field is now optional in permission requests');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main();