#!/usr/bin/env node

/**
 * Script to enable reporting module for the tenant
 */

import mongoose from 'mongoose';
import License, { MODULES } from '../platform/system/models/license.model.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const TENANT_ID = '693db0e2ccc5ea08aeee120c'; // The tenant that might need reporting enabled

async function enableReportingModule() {
    try {
        console.log('🔧 Enabling reporting module for tenant...\n');

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

        // Check if reporting module already exists
        const existingModule = license.getModuleLicense(MODULES.REPORTING);

        if (existingModule) {
            if (existingModule.enabled) {
                console.log('✅ Reporting module is already enabled');
                return;
            } else {
                // Enable existing module
                existingModule.enabled = true;
                existingModule.activatedAt = new Date();
                console.log('🔄 Enabling existing reporting module...');
            }
        } else {
            // Add new reporting module
            console.log('➕ Adding new reporting module...');
            license.modules.push({
                key: MODULES.REPORTING,
                enabled: true,
                tier: 'business',
                limits: {
                    employees: null,
                    apiCalls: 25000,
                    storage: 5000,
                    customLimits: {}
                },
                activatedAt: new Date(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
            });
        }

        // Save the license
        await license.save();
        console.log('✅ Reporting module enabled successfully');

        // Verify the change
        const updatedLicense = await License.findByTenantId(TENANT_ID);
        const reportingModule = updatedLicense.getModuleLicense(MODULES.REPORTING);
        
        console.log('\n📊 Reporting Module Status:');
        console.log(`   Enabled: ${reportingModule.enabled}`);
        console.log(`   Tier: ${reportingModule.tier}`);
        console.log(`   Activated: ${reportingModule.activatedAt}`);
        console.log(`   Expires: ${reportingModule.expiresAt}`);

        console.log('\n🎉 Reporting module is now enabled for the tenant!');
        console.log('   The reports and analytics APIs should now work without 403 errors.');

    } catch (error) {
        console.error('❌ Error enabling reporting module:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

// Run the script
enableReportingModule().catch(console.error);