#!/usr/bin/env node

/**
 * Script to enable communication module for the tenant causing 403 error
 */

import mongoose from 'mongoose';
import License, { MODULES } from '../platform/system/models/license.model.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const TENANT_ID = '693db0e2ccc5ea08aeee120c'; // The tenant that doesn't have communication enabled

async function enableCommunicationModule() {
    try {
        console.log('🔧 Enabling communication module for tenant...\n');

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

        // Check if communication module already exists
        const existingModule = license.getModuleLicense(MODULES.COMMUNICATION);

        if (existingModule) {
            if (existingModule.enabled) {
                console.log('✅ Communication module is already enabled');
                return;
            } else {
                // Enable existing module
                existingModule.enabled = true;
                existingModule.activatedAt = new Date();
                console.log('🔄 Enabling existing communication module...');
            }
        } else {
            // Add new communication module
            console.log('➕ Adding new communication module...');
            license.modules.push({
                key: MODULES.COMMUNICATION,
                enabled: true,
                tier: 'business',
                limits: {
                    employees: null,
                    apiCalls: 25000,
                    customLimits: {}
                },
                activatedAt: new Date(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
            });
        }

        // Save the license
        await license.save();
        console.log('✅ Communication module enabled successfully');

        // Verify the change
        const updatedLicense = await License.findByTenantId(TENANT_ID);
        const communicationModule = updatedLicense.getModuleLicense(MODULES.COMMUNICATION);
        
        console.log('\n📢 Communication Module Status:');
        console.log(`   Enabled: ${communicationModule.enabled}`);
        console.log(`   Tier: ${communicationModule.tier}`);
        console.log(`   Activated: ${communicationModule.activatedAt}`);
        console.log(`   Expires: ${communicationModule.expiresAt}`);

        console.log('\n🎉 Communication module is now enabled for the tenant!');
        console.log('   The notifications and announcements APIs should now work without 403 errors.');

    } catch (error) {
        console.error('❌ Error enabling communication module:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

// Run the script
enableCommunicationModule().catch(console.error);