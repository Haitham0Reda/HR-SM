#!/usr/bin/env node
/**
 * Migration Script: Generate Initial Licenses
 * 
 * This script creates initial license records for existing tenants/deployments
 * during the migration to the productization system.
 * 
 * For SaaS deployments:
 * - Creates License documents in MongoDB for each existing tenant
 * - Enables all modules by default (backward compatibility)
 * - Sets appropriate limits based on current usage
 * 
 * For On-Premise deployments:
 * - Generates a license file with all modules enabled
 * - Uses enterprise tier with unlimited limits
 * 
 * Usage:
 *   node server/scripts/migrations/generateInitialLicenses.js [options]
 * 
 * Options:
 *   --mode <mode>        Deployment mode: saas or on-premise (default: saas)
 *   --tier <tier>        Default tier: starter, business, enterprise (default: business)
 *   --trial-days <days>  Trial period in days (default: 30)
 *   --dry-run            Preview changes without applying them
 */

import mongoose from 'mongoose';
import { Command } from 'commander';
import License, { MODULES } from '../../models/license.model.js';
import User from '../../models/user.model.js';
import { commercialModuleConfigs } from '../../config/commercialModuleRegistry.js';
import { generateEnterpriseLicense, saveLicenseFile } from '../../utils/licenseFileGenerator.js';
import logger from '../../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const program = new Command();
program
    .option('--mode <mode>', 'Deployment mode: saas or on-premise', 'saas')
    .option('--tier <tier>', 'Default tier for modules', 'business')
    .option('--trial-days <days>', 'Trial period in days', '30')
    .option('--dry-run', 'Preview changes without applying them', false)
    .parse(process.argv);

const options = program.opts();

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
        await mongoose.connect(mongoURI);
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ MongoDB connection error:', error.message);
        process.exit(1);
    }
}

/**
 * Get current employee count
 */
async function getEmployeeCount() {
    try {
        return await User.countDocuments({ isActive: true });
    } catch (error) {
        logger.warn('Failed to count employees, using default', { error: error.message });
        return 50; // Default fallback
    }
}

/**
 * Determine appropriate tier based on employee count
 */
function determineTier(employeeCount) {
    if (employeeCount <= 50) {
        return 'starter';
    } else if (employeeCount <= 200) {
        return 'business';
    } else {
        return 'enterprise';
    }
}

/**
 * Get limits for a module based on tier
 */
function getModuleLimits(moduleKey, tier) {
    const config = commercialModuleConfigs[moduleKey];
    if (!config) {
        return {};
    }

    const pricing = config.commercial.pricing[tier];
    if (!pricing || !pricing.limits) {
        return {};
    }

    // Convert 'unlimited' strings to null
    const limits = {};
    for (const [key, value] of Object.entries(pricing.limits)) {
        limits[key] = value === 'unlimited' ? null : value;
    }

    return limits;
}

/**
 * Generate license for SaaS mode
 */
async function generateSaaSLicenses(dryRun = false) {
    console.log('\n📊 Generating SaaS Licenses...\n');

    // Check if licenses already exist
    const existingLicenses = await License.countDocuments();
    if (existingLicenses > 0) {
        console.log(`⚠️  Found ${existingLicenses} existing license(s)`);
        console.log('   This script is designed for initial migration only.');
        console.log('   Skipping license generation to avoid duplicates.\n');
        return { created: 0, skipped: existingLicenses };
    }

    // Get employee count to determine appropriate tier
    const employeeCount = await getEmployeeCount();
    const suggestedTier = determineTier(employeeCount);
    const tier = options.tier || suggestedTier;

    console.log(`Current employee count: ${employeeCount}`);
    console.log(`Suggested tier: ${suggestedTier}`);
    console.log(`Using tier: ${tier}\n`);

    // For initial migration, we create a single "default" tenant license
    // In a true multi-tenant system, you would iterate over tenants
    const tenantId = new mongoose.Types.ObjectId();
    const subscriptionId = `SUB-MIGRATION-${Date.now()}`;

    // Calculate trial end date
    const trialDays = parseInt(options.trialDays) || 30;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Calculate module expiration (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Build modules array with all modules enabled
    const modules = [];
    for (const [moduleKey, config] of Object.entries(commercialModuleConfigs)) {
        const moduleLimits = getModuleLimits(moduleKey, tier);

        modules.push({
            key: moduleKey,
            enabled: true,
            tier: tier,
            limits: moduleLimits,
            activatedAt: new Date(),
            expiresAt: expiresAt
        });

        console.log(`  ✓ ${config.displayName} (${tier})`);
        if (Object.keys(moduleLimits).length > 0) {
            console.log(`    Limits: ${JSON.stringify(moduleLimits)}`);
        }
    }

    const licenseData = {
        tenantId,
        subscriptionId,
        modules,
        billingCycle: 'annual',
        status: 'trial',
        trialEndsAt,
        billingEmail: process.env.ADMIN_EMAIL || 'admin@example.com'
    };

    if (dryRun) {
        console.log('\n🔍 DRY RUN - License data (not saved):');
        console.log(JSON.stringify(licenseData, null, 2));
        return { created: 0, dryRun: 1 };
    }

    // Create license
    const license = await License.create(licenseData);

    console.log('\n✅ License created successfully!');
    console.log(`   License ID: ${license._id}`);
    console.log(`   Tenant ID: ${license.tenantId}`);
    console.log(`   Subscription ID: ${license.subscriptionId}`);
    console.log(`   Status: ${license.status}`);
    console.log(`   Trial ends: ${license.trialEndsAt.toISOString()}`);
    console.log(`   Modules enabled: ${license.modules.length}`);

    return { created: 1, license };
}

/**
 * Generate license for On-Premise mode
 */
async function generateOnPremiseLicense(dryRun = false) {
    console.log('\n📊 Generating On-Premise License...\n');

    const companyId = process.env.COMPANY_ID || `company-${Date.now()}`;
    const companyName = process.env.COMPANY_NAME || 'Default Company';
    const secretKey = process.env.LICENSE_SECRET_KEY || 'default-secret-key';

    console.log(`Company: ${companyName}`);
    console.log(`Company ID: ${companyId}`);
    console.log(`Tier: enterprise (all modules unlimited)\n`);

    // Generate enterprise license (all modules enabled, unlimited)
    const licenseData = generateEnterpriseLicense(companyId, companyName, secretKey);

    console.log('Enabled Modules:');
    for (const [moduleKey, moduleConfig] of Object.entries(licenseData.modules)) {
        if (moduleConfig.enabled) {
            const config = commercialModuleConfigs[moduleKey];
            const displayName = config ? config.displayName : moduleKey;
            console.log(`  ✓ ${displayName} (${moduleConfig.tier})`);
        }
    }

    if (dryRun) {
        console.log('\n🔍 DRY RUN - License data (not saved):');
        console.log(JSON.stringify(licenseData, null, 2));
        return { created: 0, dryRun: 1 };
    }

    // Save license file
    const outputPath = path.join(__dirname, '../../config/license.json');
    const saved = saveLicenseFile(licenseData, outputPath);

    if (!saved) {
        throw new Error('Failed to save license file');
    }

    console.log('\n✅ License file generated successfully!');
    console.log(`   License Key: ${licenseData.licenseKey}`);
    console.log(`   Issued: ${licenseData.issuedAt}`);
    console.log(`   Expires: ${licenseData.expiresAt}`);
    console.log(`   File: ${outputPath}`);

    return { created: 1, filePath: outputPath };
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('🔄 Initial License Generation Migration\n');
    console.log('Configuration:');
    console.log(`  Mode: ${options.mode}`);
    console.log(`  Tier: ${options.tier}`);
    console.log(`  Trial Days: ${options.trialDays}`);
    console.log(`  Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);

    try {
        let result;

        if (options.mode === 'on-premise') {
            result = await generateOnPremiseLicense(options.dryRun);
        } else {
            await connectDB();
            result = await generateSaaSLicenses(options.dryRun);
        }

        console.log('\n✅ Migration completed successfully!');
        console.log(`   Licenses created: ${result.created}`);

        if (options.dryRun) {
            console.log('\n⚠️  This was a dry run. No changes were made.');
            console.log('   Run without --dry-run to apply changes.');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('\n✓ Disconnected from MongoDB');
        }
    }
}

// Run migration
migrate().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
