#!/usr/bin/env node
// scripts/generateLicenseFile.js
/**
 * CLI utility for generating On-Premise license files
 * 
 * Usage:
 *   node scripts/generateLicenseFile.js --type trial --company "Acme Corp" --id "acme-123"
 *   node scripts/generateLicenseFile.js --type enterprise --company "Big Corp" --id "big-456" --days 365
 *   node scripts/generateLicenseFile.js --type custom --company "Custom Corp" --id "custom-789" --config ./license-config.json
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import {
    generateTrialLicense,
    generateEnterpriseLicense,
    generateLicenseFile,
    saveLicenseFile
} from '../utils/licenseFileGenerator.js';

const program = new Command();

program
    .name('generate-license-file')
    .description('Generate On-Premise license files for HRMS')
    .version('1.0.0');

program
    .option('-t, --type <type>', 'License type: trial, enterprise, custom', 'trial')
    .option('-c, --company <name>', 'Company name', 'Sample Company')
    .option('-i, --id <id>', 'Company ID', `company-${Date.now()}`)
    .option('-d, --days <days>', 'Validity in days', '365')
    .option('-o, --output <path>', 'Output file path', './config/license.json')
    .option('-k, --key <key>', 'Secret key for signing (use env var LICENSE_SECRET_KEY)', process.env.LICENSE_SECRET_KEY || 'default-secret-key')
    .option('--config <path>', 'Path to custom module configuration JSON file')
    .option('--modules <modules>', 'Comma-separated list of modules to enable (for custom type)')
    .option('--tier <tier>', 'Default tier for modules: starter, business, enterprise', 'business')
    .parse(process.argv);

const options = program.opts();

async function main() {
    console.log('🔐 HRMS License File Generator\n');
    console.log('Configuration:');
    console.log(`  Type: ${options.type}`);
    console.log(`  Company: ${options.company}`);
    console.log(`  Company ID: ${options.id}`);
    console.log(`  Validity: ${options.days} days`);
    console.log(`  Output: ${options.output}\n`);

    let licenseData;

    try {
        switch (options.type.toLowerCase()) {
            case 'trial':
                console.log('Generating trial license (30 days, all modules enabled with starter limits)...');
                licenseData = generateTrialLicense(options.id, options.company, options.key);
                break;

            case 'enterprise':
                console.log('Generating enterprise license (unlimited, all modules enabled)...');
                licenseData = generateEnterpriseLicense(options.id, options.company, options.key);
                break;

            case 'custom':
                console.log('Generating custom license...');
                let modules;

                if (options.config) {
                    // Load modules from config file
                    console.log(`Loading module configuration from: ${options.config}`);
                    const configContent = fs.readFileSync(options.config, 'utf8');
                    const config = JSON.parse(configContent);
                    modules = config.modules;
                } else if (options.modules) {
                    // Generate modules from comma-separated list
                    const moduleList = options.modules.split(',').map(m => m.trim());
                    modules = generateModulesFromList(moduleList, options.tier);
                } else {
                    console.error('❌ Error: For custom type, provide either --config or --modules');
                    process.exit(1);
                }

                licenseData = generateLicenseFile({
                    companyId: options.id,
                    companyName: options.company,
                    validityDays: parseInt(options.days),
                    modules
                }, options.key);
                break;

            default:
                console.error(`❌ Error: Unknown license type: ${options.type}`);
                console.log('Valid types: trial, enterprise, custom');
                process.exit(1);
        }

        // Save license file
        const saved = saveLicenseFile(licenseData, options.output);

        if (!saved) {
            console.error('❌ Failed to save license file');
            process.exit(1);
        }

        console.log('\n✅ License file generated successfully!');
        console.log('\nLicense Details:');
        console.log(`  License Key: ${licenseData.licenseKey}`);
        console.log(`  Company: ${licenseData.companyName} (${licenseData.companyId})`);
        console.log(`  Issued: ${licenseData.issuedAt}`);
        console.log(`  Expires: ${licenseData.expiresAt}`);
        console.log(`  Modules: ${Object.keys(licenseData.modules).length}`);
        console.log('\nEnabled Modules:');

        for (const [moduleKey, moduleConfig] of Object.entries(licenseData.modules)) {
            if (moduleConfig.enabled) {
                console.log(`  ✓ ${moduleKey} (${moduleConfig.tier})`);
                if (moduleConfig.limits && Object.keys(moduleConfig.limits).length > 0) {
                    console.log(`    Limits: ${JSON.stringify(moduleConfig.limits)}`);
                }
            }
        }

        console.log('\nDisabled Modules:');
        for (const [moduleKey, moduleConfig] of Object.entries(licenseData.modules)) {
            if (!moduleConfig.enabled) {
                console.log(`  ✗ ${moduleKey}`);
            }
        }

        console.log(`\n📄 License file saved to: ${options.output}`);
        console.log('\n⚠️  Important: Keep the secret key secure and do not share it!');
        console.log('    Secret key is required to verify and modify license files.');

    } catch (error) {
        console.error('\n❌ Error generating license file:');
        console.error(`   ${error.message}`);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

/**
 * Generate module configuration from list
 */
function generateModulesFromList(moduleList, defaultTier) {
    const modules = {
        'hr-core': {
            enabled: true,
            tier: 'enterprise',
            limits: {}
        }
    };

    const tierLimits = {
        starter: {
            employees: 50,
            devices: 2,
            storage: 1073741824, // 1GB
            apiCalls: 10000
        },
        business: {
            employees: 200,
            devices: 10,
            storage: 10737418240, // 10GB
            apiCalls: 50000
        },
        enterprise: {
            employees: null, // unlimited
            devices: null,
            storage: null,
            apiCalls: null
        }
    };

    for (const moduleKey of moduleList) {
        if (moduleKey === 'hr-core') continue; // Already added

        modules[moduleKey] = {
            enabled: true,
            tier: defaultTier,
            limits: { ...tierLimits[defaultTier] }
        };
    }

    return modules;
}

// Run the script
main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
