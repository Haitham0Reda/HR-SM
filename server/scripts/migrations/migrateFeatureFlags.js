#!/usr/bin/env node
/**
 * Migration Script: Migrate Feature Flags to License System
 * 
 * This script migrates existing feature flags or module enable/disable settings
 * to the new license-based system.
 * 
 * It handles:
 * - Converting environment variable feature flags to license module settings
 * - Migrating database-stored feature flags to license records
 * - Preserving existing module enable/disable state
 * 
 * Usage:
 *   node server/scripts/migrations/migrateFeatureFlags.js [options]
 * 
 * Options:
 *   --source <source>    Source of feature flags: env, database, config (default: env)
 *   --dry-run            Preview changes without applying them
 */

import mongoose from 'mongoose';
import { Command } from 'commander';
import License, { MODULES } from '../../models/license.model.js';
import { commercialModuleConfigs } from '../../config/commercialModuleRegistry.js';
import logger from '../../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse command line arguments
const program = new Command();
program
    .option('--source <source>', 'Source of feature flags: env, database, config', 'env')
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
 * Parse feature flags from environment variables
 * Looks for variables like:
 * - ENABLE_ATTENDANCE=true
 * - ENABLE_LEAVE=false
 * - FEATURE_PAYROLL=true
 */
function parseEnvFeatureFlags() {
    const flags = {};
    const envPrefixes = ['ENABLE_', 'FEATURE_', 'MODULE_'];

    for (const [key, value] of Object.entries(process.env)) {
        for (const prefix of envPrefixes) {
            if (key.startsWith(prefix)) {
                const moduleName = key.substring(prefix.length).toLowerCase();
                const enabled = value.toLowerCase() === 'true' || value === '1';
                
                // Try to match to known modules
                const moduleKey = findModuleKey(moduleName);
                if (moduleKey) {
                    flags[moduleKey] = enabled;
                }
                break;
            }
        }
    }

    return flags;
}

/**
 * Find module key from various name formats
 */
function findModuleKey(name) {
    const normalized = name.toLowerCase().replace(/[-_]/g, '');

    // Direct match
    for (const moduleKey of Object.values(MODULES)) {
        if (moduleKey.toLowerCase().replace(/[-_]/g, '') === normalized) {
            return moduleKey;
        }
    }

    // Partial match
    const partialMatches = {
        'attend': MODULES.ATTENDANCE,
        'time': MODULES.ATTENDANCE,
        'leave': MODULES.LEAVE,
        'vacation': MODULES.LEAVE,
        'payroll': MODULES.PAYROLL,
        'salary': MODULES.PAYROLL,
        'doc': MODULES.DOCUMENTS,
        'document': MODULES.DOCUMENTS,
        'comm': MODULES.COMMUNICATION,
        'message': MODULES.COMMUNICATION,
        'notif': MODULES.COMMUNICATION,
        'report': MODULES.REPORTING,
        'analytic': MODULES.REPORTING,
        'task': MODULES.TASKS,
        'work': MODULES.TASKS
    };

    for (const [partial, moduleKey] of Object.entries(partialMatches)) {
        if (normalized.includes(partial)) {
            return moduleKey;
        }
    }

    return null;
}

/**
 * Parse feature flags from database
 * Looks for a FeatureFlags collection or similar
 */
async function parseDatabaseFeatureFlags() {
    const flags = {};

    try {
        // Check if FeatureFlags collection exists
        const collections = await mongoose.connection.db.listCollections().toArray();
        const hasFeatureFlags = collections.some(c => c.name === 'featureflags');

        if (!hasFeatureFlags) {
            console.log('  No FeatureFlags collection found in database');
            return flags;
        }

        // Query feature flags
        const FeatureFlag = mongoose.connection.db.collection('featureflags');
        const flagDocs = await FeatureFlag.find({}).toArray();

        for (const doc of flagDocs) {
            const moduleKey = findModuleKey(doc.name || doc.key || doc.feature);
            if (moduleKey) {
                flags[moduleKey] = doc.enabled || doc.active || false;
            }
        }

        console.log(`  Found ${Object.keys(flags).length} feature flags in database`);
    } catch (error) {
        logger.warn('Failed to parse database feature flags', { error: error.message });
    }

    return flags;
}

/**
 * Apply feature flags to license
 */
async function applyFeatureFlagsToLicense(license, flags, dryRun = false) {
    const changes = [];

    for (const [moduleKey, enabled] of Object.entries(flags)) {
        const module = license.modules.find(m => m.key === moduleKey);

        if (!module) {
            // Module not in license, skip
            console.log(`  ⚠️  Module ${moduleKey} not found in license, skipping`);
            continue;
        }

        if (module.enabled !== enabled) {
            changes.push({
                module: moduleKey,
                from: module.enabled,
                to: enabled
            });

            if (!dryRun) {
                module.enabled = enabled;
            }
        }
    }

    if (changes.length > 0 && !dryRun) {
        await license.save();
    }

    return changes;
}

/**
 * Migrate feature flags for SaaS mode
 */
async function migrateSaaSFeatureFlags(flags, dryRun = false) {
    console.log('\n📊 Migrating SaaS Feature Flags...\n');

    // Get all licenses
    const licenses = await License.find({});

    if (licenses.length === 0) {
        console.log('⚠️  No licenses found. Run generateInitialLicenses.js first.');
        return { updated: 0, changes: [] };
    }

    console.log(`Found ${licenses.length} license(s)\n`);

    let totalChanges = 0;
    const allChanges = [];

    for (const license of licenses) {
        console.log(`Processing license ${license._id}...`);

        const changes = await applyFeatureFlagsToLicense(license, flags, dryRun);

        if (changes.length > 0) {
            console.log(`  Changes for license ${license._id}:`);
            for (const change of changes) {
                const config = commercialModuleConfigs[change.module];
                const displayName = config ? config.displayName : change.module;
                console.log(`    ${displayName}: ${change.from} → ${change.to}`);
            }
            totalChanges += changes.length;
            allChanges.push({ licenseId: license._id, changes });
        } else {
            console.log(`  No changes needed`);
        }
    }

    return { updated: licenses.length, totalChanges, changes: allChanges };
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('🔄 Feature Flags Migration\n');
    console.log('Configuration:');
    console.log(`  Source: ${options.source}`);
    console.log(`  Dry Run: ${options.dryRun ? 'Yes' : 'No'}\n`);

    try {
        await connectDB();

        // Parse feature flags from source
        let flags = {};

        console.log('Parsing feature flags...');
        switch (options.source) {
            case 'env':
                flags = parseEnvFeatureFlags();
                console.log(`  Found ${Object.keys(flags).length} flags in environment variables`);
                break;

            case 'database':
                flags = await parseDatabaseFeatureFlags();
                break;

            case 'config':
                console.log('  Config file source not yet implemented');
                console.log('  Using environment variables as fallback');
                flags = parseEnvFeatureFlags();
                break;

            default:
                throw new Error(`Unknown source: ${options.source}`);
        }

        if (Object.keys(flags).length === 0) {
            console.log('\n⚠️  No feature flags found to migrate.');
            console.log('   All modules will remain in their current state.');
            return;
        }

        console.log('\nFeature flags to apply:');
        for (const [moduleKey, enabled] of Object.entries(flags)) {
            const config = commercialModuleConfigs[moduleKey];
            const displayName = config ? config.displayName : moduleKey;
            console.log(`  ${displayName}: ${enabled ? 'enabled' : 'disabled'}`);
        }

        // Apply to licenses
        const result = await migrateSaaSFeatureFlags(flags, options.dryRun);

        console.log('\n✅ Migration completed successfully!');
        console.log(`   Licenses processed: ${result.updated}`);
        console.log(`   Total changes: ${result.totalChanges}`);

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
