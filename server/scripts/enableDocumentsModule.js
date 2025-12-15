#!/usr/bin/env node

/**
 * Script to enable documents module for the tenant causing 400 error
 */

import mongoose from 'mongoose';
import License, { MODULES } from '../platform/system/models/license.model.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const TENANT_ID = '693db0e2ccc5ea08aeee120c'; // The tenant that doesn't have documents enabled

async function enableDocumentsModule() {
    try {
        console.log('🔧 Enabling documents module for tenant...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Find the license
        const license = await License.findByTenantId(TENANT_ID);

        if (!license) {
            console.log(`❌ No license found for tenant: ${TENANT_ID}`);
            return;
        }

        console.log(`📋 Found license for tenant: ${TENANT_ID}`);
        console.log(`   Status: ${license.status}`);
        console.log(`   Current modules: ${license.modules.length}`);

        // Check if documents module already exists
        const existingModule = license.getModuleLicense(MODULES.DOCUMENTS);

        if (existingModule) {
            if (existingModule.enabled) {
                console.log('✅ Documents module is already enabled');
                return;
            } else {
                // Enable existing module
                existingModule.enabled = true;
                existingModule.activatedAt = new Date();
                console.log('🔄 Enabling existing documents module...');
            }
        } else {
            // Add new documents module
            console.log('➕ Adding new documents module...');
            license.modules.push({
                key: MODULES.DOCUMENTS,
                enabled: true,
                tier: 'business',
                limits: {
                    storage: 5000,
                    apiCalls: 25000,
                    employees: null,
                    customLimits: {}
                },
                activatedAt: new Date(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
            });
        }

        // Save the license
        await license.save();
        console.log('✅ Documents module enabled successfully');

        // Verify the change
        const updatedLicense = await License.findByTenantId(TENANT_ID);
        const documentsModule = updatedLicense.getModuleLicense(MODULES.DOCUMENTS);
        
        console.log('\n📄 Documents Module Status:');
        console.log(`   Enabled: ${documentsModule.enabled}`);
        console.log(`   Tier: ${documentsModule.tier}`);
        console.log(`   Activated: ${documentsModule.activatedAt}`);
        console.log(`   Expires: ${documentsModule.expiresAt}`);

        console.log('\n🎉 Documents module is now enabled for the tenant!');
        console.log('   The document-templates API should now work without 400 errors.');

    } catch (error) {
        console.error('❌ Error enabling documents module:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

// Run the script
enableDocumentsModule().catch(console.error);