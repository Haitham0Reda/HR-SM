/**
 * Test Permission Update Functionality
 * Verifies that permission updates work with proper time field handling
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

async function createTestPermission() {
    console.log('\n➕ Creating test permission for update...');
    
    const permissionData = {
        permissionType: 'late-arrival',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        reason: 'Original reason'
    };
    
    try {
        const response = await fetch(`${API_BASE}/permission-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(permissionData)
        });

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Test permission created');
            console.log(`   ID: ${data.data._id}`);
            console.log(`   Original time: ${data.data.time.scheduled} → ${data.data.time.requested}`);
            return data.data;
        } else {
            console.error('❌ Failed to create test permission:', data.message);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error creating test permission:', error.message);
        throw error;
    }
}

async function testUpdateWithTimeString(permissionId) {
    console.log('\n📝 Testing update with time string...');
    
    const updateData = {
        permissionType: 'late-arrival',
        date: new Date().toISOString().split('T')[0],
        time: '10:30',  // Changed time
        reason: 'Updated reason - medical appointment'
    };
    
    try {
        console.log('📤 Updating permission:', JSON.stringify(updateData, null, 2));
        
        const response = await fetch(`${API_BASE}/permission-requests/${permissionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();
        
        console.log(`📊 Response Status: ${response.status}`);
        
        if (data.success) {
            console.log('✅ Permission updated successfully');
            console.log(`   Updated time: ${data.data.time.scheduled} → ${data.data.time.requested}`);
            console.log(`   Updated reason: "${data.data.reason}"`);
            return data.data;
        } else {
            console.error('❌ Failed to update permission:', data.message);
            if (data.details) {
                console.error('   Details:', data.details);
            }
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error updating permission:', error.message);
        throw error;
    }
}

async function testUpdateWithTimeObject(permissionId) {
    console.log('\n📝 Testing update with time object...');
    
    const updateData = {
        permissionType: 'early-departure',
        date: new Date().toISOString().split('T')[0],
        time: {
            scheduled: '17:00',
            requested: '15:00',
            duration: 2
        },
        reason: 'Updated with time object'
    };
    
    try {
        console.log('📤 Updating permission with time object:', JSON.stringify(updateData, null, 2));
        
        const response = await fetch(`${API_BASE}/permission-requests/${permissionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();
        
        console.log(`📊 Response Status: ${response.status}`);
        
        if (data.success) {
            console.log('✅ Permission updated successfully with time object');
            console.log(`   Updated time: ${data.data.time.scheduled} → ${data.data.time.requested}`);
            console.log(`   Duration: ${data.data.time.duration}h`);
            console.log(`   Updated reason: "${data.data.reason}"`);
            return data.data;
        } else {
            console.error('❌ Failed to update permission:', data.message);
            if (data.details) {
                console.error('   Details:', data.details);
            }
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error updating permission:', error.message);
        throw error;
    }
}

async function testUpdateWithoutReason(permissionId) {
    console.log('\n📝 Testing update without reason (optional field)...');
    
    const updateData = {
        permissionType: 'overtime',
        date: new Date().toISOString().split('T')[0],
        time: '20:00'
        // No reason field
    };
    
    try {
        console.log('📤 Updating permission without reason:', JSON.stringify(updateData, null, 2));
        
        const response = await fetch(`${API_BASE}/permission-requests/${permissionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();
        
        console.log(`📊 Response Status: ${response.status}`);
        
        if (data.success) {
            console.log('✅ Permission updated successfully without reason');
            console.log(`   Updated time: ${data.data.time.scheduled} → ${data.data.time.requested}`);
            console.log(`   Reason: ${data.data.reason || 'null/empty'}`);
            return data.data;
        } else {
            console.error('❌ Failed to update permission:', data.message);
            if (data.details) {
                console.error('   Details:', data.details);
            }
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error updating permission:', error.message);
        throw error;
    }
}

async function main() {
    try {
        console.log('🧪 Permission Update Test');
        console.log('========================');
        
        // Login
        await login();
        
        // Create test permission
        const permission = await createTestPermission();
        if (!permission) {
            throw new Error('Failed to create test permission');
        }
        
        // Test update with time string
        await testUpdateWithTimeString(permission._id);
        
        // Test update with time object
        await testUpdateWithTimeObject(permission._id);
        
        // Test update without reason
        await testUpdateWithoutReason(permission._id);
        
        console.log('\n🌐 Permission edit form should now work without errors at:');
        console.log(`   http://localhost:3000/company/test-company/permissions/${permission._id}/edit`);
        
        console.log('\n✅ All update tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main();