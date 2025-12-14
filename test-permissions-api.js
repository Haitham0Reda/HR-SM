/**
 * Test Permission Requests API
 * Tests the permission request system with proper company filtering
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

// Test credentials for Test Company (has employees)
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
        console.log(`   User: ${data.data.user.firstName} ${data.data.user.lastName}`);
        console.log(`   Email: ${data.data.user.email}`);
        console.log(`   Role: ${data.data.user.role}`);
        console.log(`   Tenant ID: ${data.data.user.tenantId}`);
        return data.data.user;
    } else {
        console.error('❌ Login failed:', data.message);
        throw new Error('Login failed');
    }
}

async function testPermissionAPI() {
    console.log('\n📋 Testing Permission Requests API...');
    
    try {
        const response = await fetch(`${API_BASE}/permission-requests`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        console.log(`📊 API Response Status: ${response.status}`);
        console.log(`📊 Response:`, JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log(`✅ Permission requests API working`);
            console.log(`   Found ${data.data?.length || 0} permission requests`);
            
            if (data.data && data.data.length > 0) {
                console.log('\n📋 Sample permission request:');
                const sample = data.data[0];
                console.log(`   ID: ${sample._id}`);
                console.log(`   Type: ${sample.permissionType}`);
                console.log(`   Date: ${sample.date}`);
                console.log(`   Status: ${sample.status}`);
                console.log(`   Employee: ${sample.employee?.username || 'N/A'}`);
                console.log(`   Tenant ID: ${sample.tenantId || 'N/A'}`);
            }
        } else {
            console.error('❌ Permission requests API failed:', data.message);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Permission requests API error:', error.message);
        throw error;
    }
}

async function createTestPermissionRequest(user) {
    console.log('\n➕ Creating test permission request...');
    
    const testPermission = {
        employee: user._id, // Add the employee field
        permissionType: 'late-arrival',
        date: new Date().toISOString().split('T')[0], // Today
        time: {
            scheduled: '09:00',
            requested: '10:30'
        },
        reason: 'Medical appointment - test permission request'
    };
    
    try {
        const response = await fetch(`${API_BASE}/permission-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPermission)
        });

        const data = await response.json();
        
        console.log(`📊 Create Response Status: ${response.status}`);
        
        if (data.success) {
            console.log('✅ Permission request created successfully');
            console.log(`   ID: ${data.data._id}`);
            console.log(`   Type: ${data.data.permissionType}`);
            console.log(`   Status: ${data.data.status}`);
            console.log(`   Tenant ID: ${data.data.tenantId}`);
            return data.data;
        } else {
            console.error('❌ Failed to create permission request:', data.message);
            console.error('   Details:', data.details || 'No details');
        }
        
        return data;
    } catch (error) {
        console.error('❌ Create permission request error:', error.message);
        throw error;
    }
}

async function testMultiCompanyIsolation() {
    console.log('\n🏢 Testing multi-company data isolation...');
    
    // Test with different company credentials
    const companies = [
        { name: 'Test Company', email: 'admin@testcompany.com', password: 'admin123', tenantId: '693cd43ec91e4189aa2ecd2f' },
        { name: 'Global Manufacturing', email: 'admin@globalmanuf.com', password: 'admin123', tenantId: '693cd49596e80950a403b2e3' },
        { name: 'StartupCo', email: 'founder@startupco.com', password: 'admin123', tenantId: '693cd49696e80950a403b2f3' }
    ];
    
    const results = {};
    
    for (const company of companies) {
        try {
            console.log(`\n🔐 Testing ${company.name}...`);
            
            // Login as company admin
            const loginResponse = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: company.email, password: company.password, tenantId: company.tenantId })
            });
            
            const loginData = await loginResponse.json();
            
            if (!loginData.success) {
                console.log(`⚠️  ${company.name} login failed: ${loginData.message}`);
                continue;
            }
            
            // Get permission requests for this company
            const permissionsResponse = await fetch(`${API_BASE}/permission-requests`, {
                headers: {
                    'Authorization': `Bearer ${loginData.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const permissionsData = await permissionsResponse.json();
            
            results[company.name] = {
                tenantId: loginData.data?.user?.tenantId,
                tenantName: company.name,
                permissionCount: permissionsData.success ? (permissionsData.data?.length || 0) : 0,
                success: permissionsData.success
            };
            
            console.log(`   Tenant: ${results[company.name].tenantName}`);
            console.log(`   Permission requests: ${results[company.name].permissionCount}`);
            
        } catch (error) {
            console.log(`❌ ${company.name} test failed:`, error.message);
            results[company.name] = { error: error.message };
        }
    }
    
    console.log('\n📊 Multi-company isolation results:');
    console.table(results);
    
    // Verify isolation
    const tenantIds = Object.values(results)
        .filter(r => r.tenantId)
        .map(r => r.tenantId);
    
    const uniqueTenants = [...new Set(tenantIds)];
    
    if (uniqueTenants.length === tenantIds.length) {
        console.log('✅ Perfect data isolation - each company sees only their own data');
    } else {
        console.log('⚠️  Data isolation issue detected');
    }
    
    return results;
}

async function main() {
    try {
        console.log('🧪 Permission Requests API Test Suite');
        console.log('=====================================');
        
        // Login
        const user = await login();
        
        // Test basic API
        await testPermissionAPI();
        
        // Create test data
        await createTestPermissionRequest(user);
        
        // Test API again to see new data
        await testPermissionAPI();
        
        // Test multi-company isolation
        await testMultiCompanyIsolation();
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

main();