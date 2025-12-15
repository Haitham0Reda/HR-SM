#!/usr/bin/env node

/**
 * Script to test the document-templates API endpoint
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api/v1';
const TENANT_IDS = [
    'techcorp-solutions-d8f0689c',
    '693db0e2ccc5ea08aeee120c'
];

async function testDocumentTemplatesAPI() {
    console.log('🧪 Testing document-templates API...\n');

    for (const tenantId of TENANT_IDS) {
        console.log(`\n🏢 Testing tenant: ${tenantId}`);
        console.log('─'.repeat(50));

        try {
            // Test without authentication first (should get 401)
            console.log('1. Testing without authentication...');
            const response1 = await fetch(`${API_BASE_URL}/document-templates`);
            console.log(`   Status: ${response1.status} ${response1.statusText}`);
            
            if (response1.status === 401) {
                console.log('   ✅ Correctly requires authentication');
            } else if (response1.status === 400) {
                console.log('   ❌ Still getting 400 error - license validation issue');
                const errorBody = await response1.text();
                console.log(`   Error: ${errorBody}`);
            } else {
                console.log(`   ⚠️  Unexpected status: ${response1.status}`);
            }

            // Test with tenant ID header (should still get 401 for missing auth)
            console.log('\n2. Testing with tenant ID header...');
            const response2 = await fetch(`${API_BASE_URL}/document-templates`, {
                headers: {
                    'x-tenant-id': tenantId
                }
            });
            console.log(`   Status: ${response2.status} ${response2.statusText}`);
            
            if (response2.status === 401) {
                console.log('   ✅ Correctly requires authentication');
            } else if (response2.status === 400) {
                console.log('   ❌ Still getting 400 error - license validation issue');
                const errorBody = await response2.text();
                console.log(`   Error: ${errorBody}`);
            } else {
                console.log(`   ⚠️  Unexpected status: ${response2.status}`);
            }

        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
        }
    }

    console.log('\n📋 Summary:');
    console.log('   - If you see 401 errors, that\'s expected (authentication required)');
    console.log('   - If you see 400 errors, the license validation is still failing');
    console.log('   - The server needs to be restarted for license changes to take effect');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the server to clear license validation cache');
    console.log('   2. Test with proper authentication token');
    console.log('   3. Check server logs for detailed error messages');
}

// Run the test
testDocumentTemplatesAPI().catch(console.error);