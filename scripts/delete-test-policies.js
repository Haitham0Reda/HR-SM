#!/usr/bin/env node

/**
 * Script to delete test insurance policies
 * This script identifies and deletes test policies that have N/A employee data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InsurancePolicy from '../server/modules/life-insurance/models/InsurancePolicy.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm';
const TENANT_ID = process.env.TENANT_ID || 'techcorp_solutions'; // Default to techcorp_solutions

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

async function findTestPolicies() {
    try {
        console.log(`🔍 Looking for test policies in tenant: ${TENANT_ID}`);
        
        // Find policies that might be test data
        // These typically have specific patterns or missing employee data
        const testPolicies = await InsurancePolicy.find({
            tenantId: TENANT_ID,
            $or: [
                { policyNumber: { $regex: /^POL-2024-/ } }, // Policies starting with POL-2024-
                { employeeNumber: { $in: ['N/A', null, ''] } }, // Policies with N/A employee numbers
                { policyNumber: { $in: ['POL-2024-001', 'POL-2024-002', 'POL-2024-003'] } } // Specific test policy numbers
            ]
        }).populate('employeeId', 'firstName lastName email employeeId');

        console.log(`📋 Found ${testPolicies.length} potential test policies:`);
        
        testPolicies.forEach((policy, index) => {
            console.log(`${index + 1}. Policy: ${policy.policyNumber}`);
            console.log(`   Employee: ${policy.employeeId ? `${policy.employeeId.firstName} ${policy.employeeId.lastName}` : 'N/A'}`);
            console.log(`   Employee ID: ${policy.employeeNumber || 'N/A'}`);
            console.log(`   Status: ${policy.status}`);
            console.log(`   Coverage: $${policy.coverageAmount?.toLocaleString() || 'N/A'}`);
            console.log(`   Created: ${policy.createdAt}`);
            console.log('   ---');
        });

        return testPolicies;
    } catch (error) {
        console.error('❌ Error finding test policies:', error);
        throw error;
    }
}

async function deleteTestPolicies(policies) {
    if (policies.length === 0) {
        console.log('ℹ️  No test policies found to delete');
        return;
    }

    console.log(`🗑️  Preparing to delete ${policies.length} test policies...`);
    
    const deletedPolicies = [];
    
    for (const policy of policies) {
        try {
            // Soft delete by setting status to cancelled
            policy.status = 'cancelled';
            policy.history.push({
                action: 'cancelled',
                performedBy: new mongoose.Types.ObjectId(), // System user
                timestamp: new Date(),
                notes: 'Test policy deleted by cleanup script'
            });
            
            await policy.save();
            deletedPolicies.push(policy.policyNumber);
            console.log(`✅ Deleted policy: ${policy.policyNumber}`);
            
        } catch (error) {
            console.error(`❌ Error deleting policy ${policy.policyNumber}:`, error);
        }
    }
    
    console.log(`\n🎉 Successfully deleted ${deletedPolicies.length} test policies:`);
    deletedPolicies.forEach(policyNumber => {
        console.log(`   - ${policyNumber}`);
    });
}

async function main() {
    try {
        console.log('🚀 Starting test policy cleanup...\n');
        
        await connectDB();
        
        const testPolicies = await findTestPolicies();
        
        if (testPolicies.length === 0) {
            console.log('✨ No test policies found. Database is clean!');
            return;
        }
        
        // Ask for confirmation (in a real scenario, you might want to add readline for interactive confirmation)
        console.log('\n⚠️  WARNING: This will delete the above test policies!');
        console.log('💡 Policies will be soft-deleted (status changed to "cancelled")');
        
        // For now, we'll proceed automatically. In production, you'd want confirmation.
        await deleteTestPolicies(testPolicies);
        
        console.log('\n✨ Test policy cleanup completed!');
        
    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { findTestPolicies, deleteTestPolicies };