#!/usr/bin/env node

/**
 * Quick test to see what's in the database and try different approaches
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm';
const TENANT_ID = process.env.TENANT_ID || 'techcorp_solutions';

async function quickTest() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Import the model after connection
        const InsurancePolicy = (await import('../server/modules/life-insurance/models/InsurancePolicy.js')).default;
        
        console.log(`🔍 Checking tenant: ${TENANT_ID}\n`);
        
        // Get all policies
        const allPolicies = await InsurancePolicy.find({ tenantId: TENANT_ID });
        console.log(`📋 Total policies in database: ${allPolicies.length}`);
        
        // Show all policy numbers and statuses
        console.log('\n📋 All policies:');
        allPolicies.forEach((policy, index) => {
            console.log(`${index + 1}. ${policy.policyNumber} - Status: ${policy.status} - Employee: ${policy.employeeNumber || 'N/A'}`);
        });

        // Test the exact query from the bulk delete function
        console.log('\n🔍 Testing bulk delete query...');
        const testQuery = {
            tenantId: TENANT_ID,
            $or: [
                { policyNumber: { $regex: /^POL-2024-/ } },
                { policyNumber: { $in: ['POL-2024-001', 'POL-2024-002', 'POL-2024-003'] } },
                { policyNumber: { $in: ['INS-2026-700233'] } },
                { employeeId: null },
                { employeeNumber: 'N/A' },
                { employeeNumber: null },
                { employeeNumber: '' }
            ],
            status: { $ne: 'cancelled' }
        };

        const matchingPolicies = await InsurancePolicy.find(testQuery);
        console.log(`🎯 Policies matching bulk delete query: ${matchingPolicies.length}`);
        
        matchingPolicies.forEach((policy, index) => {
            console.log(`${index + 1}. ${policy.policyNumber} - Status: ${policy.status} - Employee: ${policy.employeeNumber || 'N/A'}`);
        });

        // Try to manually delete one policy as a test
        if (matchingPolicies.length > 0) {
            console.log('\n🧪 Testing manual deletion of first matching policy...');
            const testPolicy = matchingPolicies[0];
            console.log(`Testing with policy: ${testPolicy.policyNumber}`);
            
            // Don't actually delete, just simulate
            console.log('✅ Would delete this policy (simulation only)');
        }

        // Check for policies with specific patterns
        console.log('\n🔍 Checking specific patterns:');
        
        const pol2024Policies = await InsurancePolicy.find({
            tenantId: TENANT_ID,
            policyNumber: { $regex: /^POL-2024-/ }
        });
        console.log(`POL-2024-* policies: ${pol2024Policies.length}`);
        
        const specificPolicies = await InsurancePolicy.find({
            tenantId: TENANT_ID,
            policyNumber: { $in: ['POL-2024-001', 'POL-2024-002', 'POL-2024-003'] }
        });
        console.log(`Specific POL policies: ${specificPolicies.length}`);
        
        const insPolicies = await InsurancePolicy.find({
            tenantId: TENANT_ID,
            policyNumber: 'INS-2026-700233'
        });
        console.log(`INS-2026-700233 policy: ${insPolicies.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

quickTest();