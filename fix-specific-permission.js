/**
 * Fix Specific Permission with Duplicate Times
 * Fix the permission ID 693f188b6ce95d32840dcafa that has duplicate times
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

async function fixSpecificPermission() {
    const problemPermissionId = '693f188b6ce95d32840dcafa';
    
    console.log(`\n🔧 Fixing permission ${problemPermissionId}...`);
    
    try {
        // First, get the current permission data
        console.log('📋 Getting current permission data...');
        const getResponse = await fetch(`${API_BASE}/permission-requests/${problemPermissionId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!getResponse.ok) {
            console.error('❌ Failed to get permission:', getResponse.status);
            return false;
        }

        const currentPermission = await getResponse.json();
        console.log('📊 Current permission data:');
        console.log(`   ID: ${currentPermission._id}`);
        console.log(`   Type: ${currentPermission.permissionType}`);
        console.log(`   Current time: ${currentPermission.time.scheduled} → ${currentPermission.time.requested}`);
        console.log(`   Date: ${currentPermission.date}`);
        console.log(`   Reason: ${currentPermission.reason || 'No reason'}`);
        console.log(`   Status: ${currentPermission.status}`);
        
        // Fix the time based on permission type
        let scheduledTime = '09:00';
        let requestedTime = '10:00'; // Default for late-arrival
        
        if (currentPermission.permissionType === 'late-arrival') {
            scheduledTime = '09:00'; // Normal start time
            requestedTime = '10:00'; // Late arrival time
        } else if (currentPermission.permissionType === 'early-departure') {
            scheduledTime = '17:00'; // Normal end time
            requestedTime = '15:30'; // Early departure time
        } else if (currentPermission.permissionType === 'overtime') {
            scheduledTime = '17:00'; // Normal end time
            requestedTime = '20:00'; // Overtime end time
        }
        
        const updateData = {
            permissionType: currentPermission.permissionType,
            date: currentPermission.date,
            reason: currentPermission.reason || '',
            time: {
                scheduled: scheduledTime,
                requested: requestedTime,
                duration: currentPermission.time.duration || 1
            }
        };
        
        console.log(`\n🔧 Updating permission...`);
        console.log(`   From: ${currentPermission.time.scheduled} → ${currentPermission.time.requested}`);
        console.log(`   To:   ${scheduledTime} → ${requestedTime}`);
        
        const updateResponse = await fetch(`${API_BASE}/permission-requests/${problemPermissionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const result = await updateResponse.json();
        
        if (updateResponse.ok && (result.success || result.data)) {
            console.log('✅ Permission fixed successfully!');
            
            // Verify the fix
            const verifyResponse = await fetch(`${API_BASE}/permission-requests/${problemPermissionId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (verifyResponse.ok) {
                const verifiedPermission = await verifyResponse.json();
                console.log(`\n✅ Verification - Updated time: ${verifiedPermission.time.scheduled} → ${verifiedPermission.time.requested}`);
                
                if (verifiedPermission.time.scheduled !== verifiedPermission.time.requested) {
                    console.log('🎉 SUCCESS! Permission now has different scheduled and requested times');
                    return true;
                } else {
                    console.log('❌ STILL DUPLICATE: Times are still the same');
                    return false;
                }
            }
            
            return true;
        } else {
            console.error('❌ Failed to update permission:', result.message || 'Unknown error');
            console.error('Response:', JSON.stringify(result, null, 2));
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error fixing permission:', error.message);
        return false;
    }
}

async function verifyAllPermissions() {
    console.log('\n🔍 Verifying all permissions for duplicate times...');
    
    try {
        const response = await fetch(`${API_BASE}/permission-requests`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success && data.data && Array.isArray(data.data)) {
            const duplicateTimePermissions = data.data.filter(perm => 
                perm.time && perm.time.scheduled === perm.time.requested
            );
            
            if (duplicateTimePermissions.length === 0) {
                console.log('🎉 SUCCESS! No more permissions with duplicate times found');
                return true;
            } else {
                console.log(`❌ Still found ${duplicateTimePermissions.length} permissions with duplicate times:`);
                duplicateTimePermissions.forEach(perm => {
                    console.log(`   ${perm._id.slice(-8)}: ${perm.time.scheduled} → ${perm.time.requested}`);
                });
                return false;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Error verifying permissions:', error.message);
        return false;
    }
}

async function main() {
    try {
        console.log('🧪 Fix Specific Permission with Duplicate Times');
        console.log('===============================================');
        
        // Login
        await login();
        
        // Fix the specific permission
        const success = await fixSpecificPermission();
        
        if (success) {
            // Verify all permissions
            const allFixed = await verifyAllPermissions();
            
            if (allFixed) {
                console.log('\n🎉 ALL DONE! The time display issue should now be fixed');
                console.log('💡 Next steps:');
                console.log('   1. Refresh the frontend page (Ctrl+F5)');
                console.log('   2. Check that times now display as "09:00 → 10:00" instead of "09:00 → 09:00"');
                console.log('   3. The permission system should now work correctly');
            }
        }
        
        console.log('\n✅ Script completed!');
        
    } catch (error) {
        console.error('\n❌ Script failed:', error.message);
        process.exit(1);
    }
}

main();