/**
 * Debug Tenant Context
 * 
 * This script helps debug tenant context issues by checking
 * what tenant information is available in requests
 */

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

async function debugTenantContext() {
    console.log('🔍 Debugging Tenant Context...\n');
    
    try {
        // Step 1: Get authentication token
        console.log('1️⃣ Getting authentication token...');
        const response = await fetch(`${API_URL}/dev/auto-login`);
        const data = await response.json();
        const authToken = data.data.token;
        console.log('✅ Got authentication token');
        
        // Step 2: Get user profile and check tenant info
        console.log('\n2️⃣ Getting user profile with tenant info...');
        const profileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const userProfile = await profileResponse.json();
        console.log('👤 User Profile:');
        console.log(`   ID: ${userProfile._id}`);
        console.log(`   Email: ${userProfile.email}`);
        console.log(`   Tenant ID: ${userProfile.tenantId || 'NOT SET'}`);
        console.log(`   Role: ${userProfile.role}`);
        
        // Step 3: Check what's in localStorage (client-side tenant context)
        console.log('\n3️⃣ Simulating client-side tenant context...');
        console.log('   (In browser, check localStorage for tenant_id)');
        
        // Step 4: Test a simple user lookup by ID to see if tenant filtering works
        console.log('\n4️⃣ Testing user lookup by ID...');
        const userLookupResponse = await fetch(`${API_URL}/users/${userProfile._id}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (userLookupResponse.ok) {
            const lookupUser = await userLookupResponse.json();
            console.log('✅ User lookup successful');
            console.log(`   Found user: ${lookupUser.email}`);
            console.log(`   Tenant ID: ${lookupUser.tenantId || 'NOT SET'}`);
        } else {
            const errorText = await userLookupResponse.text();
            console.log(`❌ User lookup failed: ${userLookupResponse.status} - ${errorText}`);
        }
        
        // Step 5: Test all users endpoint to see tenant filtering
        console.log('\n5️⃣ Testing all users endpoint (tenant filtering)...');
        const allUsersResponse = await fetch(`${API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (allUsersResponse.ok) {
            const allUsers = await allUsersResponse.json();
            console.log(`✅ All users query successful - Found ${allUsers.data?.length || allUsers.length || 0} users`);
            
            if (allUsers.data && allUsers.data.length > 0) {
                const firstUser = allUsers.data[0];
                console.log(`   First user: ${firstUser.email} (Tenant: ${firstUser.tenantId || 'NOT SET'})`);
            }
        } else {
            const errorText = await allUsersResponse.text();
            console.log(`❌ All users query failed: ${allUsersResponse.status} - ${errorText}`);
        }
        
        // Step 6: Check tenant endpoint
        console.log('\n6️⃣ Testing tenant endpoint...');
        const tenantResponse = await fetch(`${API_URL}/tenant/info`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (tenantResponse.ok) {
            const tenantInfo = await tenantResponse.json();
            console.log('✅ Tenant info retrieved:');
            console.log(`   Tenant ID: ${tenantInfo._id || tenantInfo.id || 'NOT SET'}`);
            console.log(`   Company Name: ${tenantInfo.name || 'NOT SET'}`);
        } else {
            const errorText = await tenantResponse.text();
            console.log(`❌ Tenant info failed: ${tenantResponse.status} - ${errorText}`);
        }
        
        console.log('\n📋 ANALYSIS:');
        console.log('If user lookup by ID fails but profile works, the issue is likely:');
        console.log('1. Tenant context not being set properly in middleware');
        console.log('2. Different database connections for different endpoints');
        console.log('3. Tenant filtering logic inconsistency');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Debug execution failed:', error);
        return false;
    }
}

// Run the debug
debugTenantContext().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Debug execution error:', error);
    process.exit(1);
});