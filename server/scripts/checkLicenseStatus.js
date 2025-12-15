#!/usr/bin/env node

/**
 * Script to check license status for document-templates API issue
 * This will help diagnose the 400 error from /api/v1/document-templates
 */

import mongoose from 'mongoose';
import License, { MODULES } from '../platform/system/models/license.model.js';
import licenseValidator from '../platform/system/services/licenseValidator.service.js';
import logger from '../utils/logger.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const TENANT_IDS = [
    'techcorp-solutions-d8f0689c',
    '693db0e2ccc5ea08aeee120c',
    'techcorp_solutions'
];

async function checkLicenseStatus() {
    try {
        console.log('🔍 Checking license status for document-templates API...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        console.log(`📋 Deployment Mode: ${process.env.DEPLOYMENT_MODE || 'saas (default)'}`);
        console.log(`📋 Documents Module Key: ${MODULES.DOCUMENTS}\n`);

        // Check for each potential tenant ID
        for (const tenantId of TENANT_IDS) {
            console.log(`\n🏢 Checking tenant: ${tenantId}`);
            console.log('─'.repeat(50));

            // Check if license exists in database
            const license = await License.findByTenantId(tenantId);

            if (!license) {
                console.log('❌ No license found in database');
                continue;
            }

            console.log('✅ License found in database');
            console.log(`   Status: ${license.status}`);
            console.log(`   Subscription ID: ${license.subscriptionId}`);
            console.log(`   Created: ${license.createdAt}`);
            console.log(`   Updated: ${license.updatedAt}`);

            // Check modules
            console.log('\n📦 Modules:');
            if (license.modules && license.modules.length > 0) {
                license.modules.forEach(module => {
                    const status = module.enabled ? '✅ Enabled' : '❌ Disabled';
                    const expiry = module.expiresAt ? ` (expires: ${module.expiresAt})` : '';
                    console.log(`   ${module.key}: ${status} - ${module.tier}${expiry}`);
                });
            } else {
                console.log('   No modules configured');
            }

            // Check documents module specifically
            const documentsModule = license.getModuleLicense(MODULES.DOCUMENTS);
            console.log('\n📄 Documents Module:');
            if (documentsModule) {
                console.log(`   Enabled: ${documentsModule.enabled}`);
                console.log(`   Tier: ${documentsModule.tier}`);
                console.log(`   Limits: ${JSON.stringify(documentsModule.limits, null, 2)}`);
                console.log(`   Activated: ${documentsModule.activatedAt}`);
                console.log(`   Expires: ${documentsModule.expiresAt}`);
            } else {
                console.log('   ❌ Documents module not found in license');
            }

            // Test license validation
            console.log('\n🧪 Testing license validation:');
            try {
                const validation = await licenseValidator.validateModuleAccess(
                    tenantId,
                    MODULES.DOCUMENTS,
                    { skipCache: true }
                );

                console.log(`   Valid: ${validation.valid}`);
                if (!validation.valid) {
                    console.log(`   Error: ${validation.error}`);
                    console.log(`   Reason: ${validation.reason}`);
                }
            } catch (error) {
                console.log(`   ❌ Validation error: ${error.message}`);
            }
        }

        // Check if any licenses exist at all
        console.log('\n\n🔍 All licenses in database:');
        console.log('─'.repeat(50));
        const allLicenses = await License.find({});
        
        if (allLicenses.length === 0) {
            console.log('❌ No licenses found in database at all');
            console.log('\n💡 Possible solutions:');
            console.log('   1. Create a license for the tenant');
            console.log('   2. Enable documents module in existing license');
            console.log('   3. Switch to on-premise mode with license file');
            console.log('   4. Temporarily remove license validation from document routes');
        } else {
            console.log(`✅ Found ${allLicenses.length} license(s) in database:`);
            allLicenses.forEach((license, index) => {
                console.log(`   ${index + 1}. Tenant: ${license.tenantId}`);
                console.log(`      Status: ${license.status}`);
                console.log(`      Modules: ${license.modules.length}`);
                const documentsEnabled = license.isModuleEnabled(MODULES.DOCUMENTS);
                console.log(`      Documents enabled: ${documentsEnabled}`);
            });
        }

    } catch (error) {
        console.error('❌ Error checking license status:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

// Run the script
checkLicenseStatus().catch(console.error);