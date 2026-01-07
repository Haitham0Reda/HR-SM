#!/usr/bin/env node

/**
 * Quick script to delete test policies via API call
 * This script makes an HTTP request to the bulk delete endpoint
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const TENANT_ID = process.env.TENANT_ID || 'techcorp_solutions';

async function deleteTestPolicies() {
    try {
        console.log('🚀 Starting test policy deletion via API...\n');
        console.log(`📡 API URL: ${API_BASE_URL}/life-insurance/policies/bulk-delete-test`);
        console.log(`🏢 Tenant: ${TENANT_ID}\n`);

        // You'll need to get an auth token first
        // For now, this is a template - you'd need to implement authentication
        
        const response = await fetch(`${API_BASE_URL}/life-insurance/policies/bulk-delete-test`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': TENANT_ID,
                // 'Authorization': `Bearer ${authToken}`, // You'd need to add auth
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        
        console.log('✅ API Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log(`\n🎉 Successfully deleted ${result.data.deletedCount} test policies!`);
            if (result.data.deletedPolicies && result.data.deletedPolicies.length > 0) {
                console.log('\n📋 Deleted policies:');
                result.data.deletedPolicies.forEach(policyNumber => {
                    console.log(`   - ${policyNumber}`);
                });
            }
            
            if (result.data.errors && result.data.errors.length > 0) {
                console.log('\n⚠️  Errors encountered:');
                result.data.errors.forEach(error => {
                    console.log(`   - ${error.policyNumber}: ${error.error}`);
                });
            }
        } else {
            console.log('❌ API call failed:', result.message);
        }

    } catch (error) {
        console.error('❌ Error deleting test policies:', error.message);
        console.log('\n💡 Note: This script requires authentication. You may need to:');
        console.log('   1. Log in to the application first');
        console.log('   2. Get an auth token');
        console.log('   3. Add the Authorization header to this script');
        console.log('   4. Or use the web interface to call the bulk delete endpoint');
    }
}

// Run the script
deleteTestPolicies();