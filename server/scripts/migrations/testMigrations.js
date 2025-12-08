#!/usr/bin/env node
/**
 * Test Migration Scripts
 * 
 * This script tests all migration scripts in dry-run mode to ensure they work correctly.
 * 
 * Usage:
 *   node server/scripts/migrations/testMigrations.js
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
    {
        name: 'Generate Initial Licenses (SaaS)',
        script: 'generateInitialLicenses.js',
        args: ['--mode', 'saas', '--dry-run']
    },
    {
        name: 'Generate Initial Licenses (On-Premise)',
        script: 'generateInitialLicenses.js',
        args: ['--mode', 'on-premise', '--dry-run']
    },
    {
        name: 'Migrate Feature Flags',
        script: 'migrateFeatureFlags.js',
        args: ['--source', 'env', '--dry-run']
    },
    {
        name: 'Backfill Usage Data',
        script: 'backfillUsageData.js',
        args: ['--months', '1', '--dry-run']
    }
];

/**
 * Run a migration script
 */
function runMigration(migration) {
    return new Promise((resolve, reject) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${migration.name}`);
        console.log(`${'='.repeat(60)}\n`);

        const scriptPath = path.join(__dirname, migration.script);
        const child = spawn('node', [scriptPath, ...migration.args], {
            stdio: 'inherit',
            env: {
                ...process.env,
                MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/hrms-test'
            }
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${migration.name} - PASSED\n`);
                resolve();
            } else {
                console.error(`\n❌ ${migration.name} - FAILED (exit code: ${code})\n`);
                reject(new Error(`Migration failed with code ${code}`));
            }
        });

        child.on('error', (error) => {
            console.error(`\n❌ ${migration.name} - ERROR: ${error.message}\n`);
            reject(error);
        });
    });
}

/**
 * Main test function
 */
async function testMigrations() {
    console.log('🧪 Testing Migration Scripts\n');
    console.log('All migrations will run in DRY-RUN mode (no changes will be made)\n');

    let passed = 0;
    let failed = 0;

    for (const migration of migrations) {
        try {
            await runMigration(migration);
            passed++;
        } catch (error) {
            failed++;
            console.error(`Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`Total: ${migrations.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed === 0) {
        console.log('\n✅ All migration tests passed!');
        process.exit(0);
    } else {
        console.log('\n❌ Some migration tests failed!');
        process.exit(1);
    }
}

// Run tests
testMigrations().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
