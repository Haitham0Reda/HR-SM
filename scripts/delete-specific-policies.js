#!/usr/bin/env node

/**
 * Script to delete specific test policies by policy number
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InsurancePolicy from '../server/modules/life-insurance/models/InsurancePolicy.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm';
const TENANT_ID = process.env.TENANT_ID || 'techcorp_solutions';

// Policy numbers to delete (from the screenshot)
const POLICIES_TO_DELETE = [
    'POL-2024-003',
    'POL-2024-001', 
    'POL-2024-002'
];

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

async function deleteSpecificPolicies() {
    try {
        console.log(`🔍 Looking for specific policies in tenant: ${TENANT_ID}`);
        console.log(`📋 Policies to delete: ${POLICIES_TO_DELETE.join(', ')}\n`);
        
        // Find the specific policies
        const policiesToDelete = await InsurancePolicy.find({
            tenantId: TENANT_ID,
            policyNumber: { $in: POLICIES_TO_DELETE },
            status: { $ne: 'cancelled' }
        }).populate('employeeId', 'firstName lastName email employeeId personalInfo');

        console.log(`📋 Found ${policiesToDelete.length} policies to delete:`);
        
        policiesToDelete.forEach((policy, index) => {
            const employee = policy.employeeId;
            const employeeName = employee ? 
                (employee.personalInfo?.firstName && employee.personalInfo?.lastName ? 
                    `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}` :
                    `${employee.firstName || 'Unknown'} ${employee.lastName || 'User'}`) : 
                'N/A';
            
            console.log(`${index + 1}. Policy: ${policy.policyNumber}`);
            console.log(`   Employee: ${employeeName}`);
            console.log(`   Employee ID: ${policy.employeeNumber || 'N/A'}`);
            console.log(`   Status: ${policy.status}`);
            console.log(`   Coverage: $${policy.coverageAmount?.toLocaleString() || 'N/A'}`);
            console.log(`   Created: ${policy.createdAt}`);
            console.log('   ---');
        });

        if (policiesToDelete.length === 0) {
            console.log('ℹ️  No matching policies found to delete');
            return;
        }

        console.log(`\n🗑️  Preparing to delete ${policiesToDelete.length} policies...`);
        
        const deletedPolicies = [];
        
        for (const policy of policiesToDelete) {
            try {
                // Check for active claims
                await policy.populate('claims');
                const hasActiveClaims = policy.claims && policy.claims.some(
                    claim => ['pending', 'under_review', 'approved'].includes(claim.status)
                );

                if (hasActiveClaims) {
                    console.log(`⚠️  Skipping ${policy.policyNumber} - has active claims`);
                    continue;
                }

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
                console.error(`❌ Error deleting policy ${policy.policyNumber}:`, error.message);
            }
        }
        
        console.log(`\n🎉 Successfully deleted ${deletedPolicies.length} policies:`);
        deletedPolicies.forEach(policyNumber => {
            console.log(`   - ${policyNumber}`);
        });

        // Also check for the INS-2026-700233 policy that shows "undefined undefined"
        console.log('\n🔍 Checking for INS-2026-700233 policy...');
        const insPolicy = await InsurancePolicy.findOne({
            tenantId: TENANT_ID,
            policyNumber: 'INS-2026-700233'
        }).populate('employeeId', 'firstName lastName email employeeId personalInfo');

        if (insPolicy) {
            const employee = insPolicy.employeeId;
            const employeeName = employee ? 
                (employee.personalInfo?.firstName && employee.personalInfo?.lastName ? 
                    `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}` :
                    `${employee.firstName || 'Unknown'} ${employee.lastName || 'User'}`) : 
                'undefined undefined';
            
            console.log(`Found INS-2026-700233:`);
            console.log(`   Employee: ${employeeName}`);
            console.log(`   Employee ID: ${insPolicy.employeeNumber || 'N/A'}`);
            console.log(`   Status: ${insPolicy.status}`);
            
            if (employeeName === 'undefined undefined' || !employee) {
                console.log('   This appears to be a test policy too. Deleting...');
                try {
                    insPolicy.status = 'cancelled';
                    insPolicy.history.push({
                        action: 'cancelled',
                        performedBy: new mongoose.Types.ObjectId(),
                        timestamp: new Date(),
                        notes: 'Test policy with undefined employee deleted by cleanup script'
                    });
                    await insPolicy.save();
                    console.log(`✅ Deleted INS-2026-700233`);
                } catch (error) {
                    console.error(`❌ Error deleting INS-2026-700233:`, error.message);
                }
            }
        } else {
            console.log('INS-2026-700233 not found');
        }
        
    } catch (error) {
        console.error('❌ Error deleting policies:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('🚀 Starting specific policy deletion...\n');
        
        await connectDB();
        await deleteSpecificPolicies();
        
        console.log('\n✨ Policy deletion completed!');
        
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

export default main;