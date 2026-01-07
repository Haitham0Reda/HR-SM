#!/usr/bin/env node

/**
 * Permanently delete test policies from database
 * This completely removes the policies so they don't appear in UI
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm';
const TENANT_ID = process.env.TENANT_ID || 'techcorp_solutions';

async function permanentlyDeleteTestPolicies() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Import the model after connection
        const InsurancePolicy = (await import('../server/modules/life-insurance/models/InsurancePolicy.js')).default;
        
        console.log(`🔍 Permanently deleting test policies in tenant: ${TENANT_ID}\n`);
        
        // Target the specific policies from the screenshot
        const targetPolicies = [
            'INS-2026-700233',
            'POL-2024-003',
            'POL-2024-001', 
            'POL-2024-002'
        ];

        console.log(`🎯 Looking for policies to permanently delete: ${targetPolicies.join(', ')}`);

        // Find the policies
        const policiesToDelete = await InsurancePolicy.find({
            tenantId: TENANT_ID,
            policyNumber: { $in: targetPolicies }
        });

        console.log(`📋 Found ${policiesToDelete.length} policies to permanently delete:`);
        policiesToDelete.forEach(policy => {
            console.log(`   - ${policy.policyNumber} (Status: ${policy.status})`);
        });

        if (policiesToDelete.length === 0) {
            console.log('ℹ️  No policies found to delete.');
            return;
        }

        console.log('\n🗑️  Permanently deleting policies from database...');
        
        // Permanently delete each policy
        for (const policy of policiesToDelete) {
            try {
                await InsurancePolicy.deleteOne({ _id: policy._id });
                console.log(`✅ Permanently deleted: ${policy.policyNumber}`);
            } catch (error) {
                console.error(`❌ Error deleting ${policy.policyNumber}:`, error.message);
            }
        }

        console.log('\n🎉 Permanent deletion completed!');
        
        // Verify deletion
        console.log('\n🔍 Verifying deletion...');
        const remainingPolicies = await InsurancePolicy.find({
            tenantId: TENANT_ID,
            policyNumber: { $in: targetPolicies }
        });
        
        if (remainingPolicies.length === 0) {
            console.log('✅ All policies have been permanently removed from database!');
            console.log('💡 They will no longer appear in the UI.');
        } else {
            console.log(`⚠️  ${remainingPolicies.length} policies still remain:`);
            remainingPolicies.forEach(policy => {
                console.log(`   - ${policy.policyNumber} (${policy.status})`);
            });
        }

        // Show final count
        const totalPolicies = await InsurancePolicy.countDocuments({ tenantId: TENANT_ID });
        console.log(`\n📊 Total policies remaining in ${TENANT_ID}: ${totalPolicies}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

permanentlyDeleteTestPolicies();