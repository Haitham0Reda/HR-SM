/**
 * Test Permission Requests Frontend Integration
 * Tests the permission request system from frontend perspective
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
    console.log('🔐 Logging in as Test Company admin...');
    
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

async function testPermissionService() {
    console.log('\n📋 Testing Permission Service (Frontend Perspective)...');
    
    try {
        // Test the exact same call that frontend makes
        const response = await fetch(`${API_BASE}/permission-requests`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        console.log(`📊 API Response Status: ${response.status}`);
        console.log(`📊 Response Structure:`, JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log(`✅ Permission service working correctly`);
            console.log(`   Data type: ${Array.isArray(data.data) ? 'Array' : typeof data.data}`);
            console.log(`   Permission count: ${data.data?.length || 0}`);
            
            // Test frontend data extraction logic
            const permissions = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
            console.log(`   Frontend extraction result: ${permissions.length} permissions`);
            
            if (permissions.length > 0) {
                console.log('\n📋 Sample permission (frontend format):');
                const sample = permissions[0];
                const transformed = {
                    ...sample,
                    requestType: 'permission',
                    displayType: (sample.permissionType || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    date: sample.date,
                    details: `${sample.time?.scheduled || 'N/A'} - ${sample.time?.requested || 'N/A'}`,
                    employeeName: sample.employee?.personalInfo?.fullName || sample.employee?.username || 'N/A'
                };
                
                console.log(`   ID: ${transformed._id}`);
                console.log(`   Display Type: ${transformed.displayType}`);
                console.log(`   Date: ${transformed.date}`);
                console.log(`   Details: ${transformed.details}`);
                console.log(`   Employee: ${transformed.employeeName}`);
                console.log(`   Status: ${transformed.status}`);
            }
        } else {
            console.error('❌ Permission service failed:', data.message);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Permission service error:', error.message);
        throw error;
    }
}

async function createMoreTestData(user) {
    console.log('\n➕ Creating additional test permission requests...');
    
    const testPermissions = [
        {
            employee: user._id,
            permissionType: 'early-departure',
            date: new Date().toISOString().split('T')[0],
            time: { scheduled: '17:00', requested: '15:30' },
            reason: 'Family emergency'
        },
        {
            employee: user._id,
            permissionType: 'overtime',
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            time: { scheduled: '17:00', requested: '20:00' },
            reason: 'Project deadline'
        },
        {
            employee: user._id,
            permissionType: 'late-arrival',
            date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
            time: { scheduled: '09:00', requested: '10:00' },
            reason: 'Medical appointment'
        }
    ];
    
    let created = 0;
    
    for (const permission of testPermissions) {
        try {
            const response = await fetch(`${API_BASE}/permission-requests`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(permission)
            });

            const data = await response.json();
            
            if (data.success) {
                created++;
                console.log(`   ✅ Created ${permission.permissionType} request`);
            } else {
                console.log(`   ❌ Failed to create ${permission.permissionType}: ${data.message}`);
            }
        } catch (error) {
            console.log(`   ❌ Error creating ${permission.permissionType}: ${error.message}`);
        }
    }
    
    console.log(`📊 Created ${created} additional permission requests`);
    return created;
}

async function main() {
    try {
        console.log('🧪 Permission Requests Frontend Integration Test');
        console.log('===============================================');
        
        // Login
        const user = await login();
        
        // Test current state
        await testPermissionService();
        
        // Create more test data
        await createMoreTestData(user);
        
        // Test again with more data
        await testPermissionService();
        
        console.log('\n🌐 Frontend Access:');
        console.log('==================');
        console.log('URL: http://localhost:3000/company/test-company/requests');
        console.log('Login: admin@testcompany.com / admin123');
        console.log('Tenant ID: 693cd43ec91e4189aa2ecd2f');
        
        console.log('\n✅ Frontend integration test completed successfully!');
        console.log('The permission requests should now appear in the Requests page.');
        
    } catch (error) {
        console.error('\n❌ Frontend integration test failed:', error.message);
        process.exit(1);
    }
}

main();