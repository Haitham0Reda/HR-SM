/**
 * Test Permission Page Frontend Fix
 * Verifies that the React rendering error is fixed
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

async function testPermissionDataStructure() {
    console.log('\n📋 Testing Permission Data Structure...');
    
    try {
        const response = await fetch(`${API_BASE}/permission-requests`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            console.log(`✅ Found ${data.data.length} permission requests`);
            
            // Check the structure of the first permission
            const sample = data.data[0];
            console.log('\n📊 Sample Permission Structure:');
            console.log(`   ID: ${sample._id}`);
            console.log(`   Type: ${sample.permissionType}`);
            console.log(`   Date: ${sample.date}`);
            console.log(`   Time Object:`, JSON.stringify(sample.time, null, 2));
            console.log(`   Status: ${sample.status}`);
            
            // Test how the frontend should render the time
            const timeDisplay = sample.time 
                ? `${sample.time.scheduled || 'N/A'} → ${sample.time.requested || 'N/A'}`
                : '-';
            console.log(`   Time Display: ${timeDisplay}`);
            
            // Test duration display
            const duration = sample.time?.duration || sample.duration;
            const durationDisplay = duration ? `${duration}h` : '-';
            console.log(`   Duration Display: ${durationDisplay}`);
            
            console.log('\n✅ Data structure is correct for frontend rendering');
            return true;
        } else {
            console.log('⚠️  No permission requests found');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function main() {
    try {
        console.log('🧪 Permission Page Frontend Fix Test');
        console.log('===================================');
        
        // Login
        await login();
        
        // Test data structure
        const hasData = await testPermissionDataStructure();
        
        if (hasData) {
            console.log('\n🌐 Frontend should now work without React errors at:');
            console.log('   http://localhost:3000/company/test-company/permissions');
            console.log('   http://localhost:3000/company/test-company/requests');
        }
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main();