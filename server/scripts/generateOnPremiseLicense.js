#!/usr/bin/env node
/**
 * Generate On-Premise License File
 * 
 * This script generates license files for On-Premise deployments.
 * It's a convenience wrapper around the license file generator utility.
 * 
 * Usage:
 *   node server/scripts/generateOnPremiseLicense.js [options]
 * 
 * Options:
 *   -t, --type <type>        License type: trial, enterprise, custom (default: trial)
 *   -c, --company <name>     Company name (required)
 *   -i, --id <id>            Company ID (auto-generated if not provided)
 *   -d, --days <days>        Validity in days (default: 365)
 *   -o, --output <path>      Output file path (default: ./config/license.json)
 *   -k, --key <key>          Secret key for signing (use env var LICENSE_SECRET_KEY)
 *   --config <path>          Path to custom module configuration JSON file
 *   --modules <modules>      Comma-separated list of modules to enable (for custom type)
 *   --tier <tier>            Default tier for modules: starter, business, enterprise (default: business)
 * 
 * Examples:
 *   # Generate trial license (30 days, all modules, starter limits)
 *   node server/scripts/generateOnPremiseLicense.js --type trial --company "Acme Corp"
 * 
 *   # Generate enterprise license (1 year, all modules, unlimited)
 *   node server/scripts/generateOnPremiseLicense.js --type enterprise --company "Big Corp" --days 365
 * 
 *   # Generate custom license with specific modules
 *   node server/scripts/generateOnPremiseLicense.js --type custom --company "Custom Corp" \
 *     --modules "attendance,leave,payroll" --tier business --days 180
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    generateTrialLicense,
    generateEnterpriseLicense,
    generateLicenseFile,
    saveLicenseFile
} from '../utils/licenseFileGenerator.js';
import { commercialModuleConfigs } from '../config/commercialModuleRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
    .name('generate-on-premise-license')
    .description('Generate On-Premise license files for HRMS')
    .version('1.0.0');

program
    .option('-t, --type <type>', 'License type: trial, enterprise, custom', 'trial')
    .option('-c, --company <name>', 'Company name (required)')
    .option('-i, --id <id>', 'Company ID', `company-${Date.now()}`)
    .option('-d, --days <days>', 'Validity in days', '365')
    .option('-o, --output <path>', 'Output file path', './config/license.json')
    .option('-k, --key <key>', 'Secret key for signing (use env var LICENSE_SECRET_KEY)', process.env.LICENSE_SECRET_KEY || 'default-secret-key')
    .option('--config <path>', 'Path to custom module configuration JSON file')
    .option('--modules <modules>', 'Comma-separated list of modules to enable (for custom type)')
    .option('--tier <tier>', 'Default tier for modules: starter, business, enterprise', 'business')
    .parse(process.argv);

const options = program.opts();

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

    // Get tier limits from commercial module configs
    for (const moduleKey of moduleList) {
        if (moduleKey === 'hr-core') continue; // Already added

        const config = commercialModuleConfigs[moduleKey];
        if (!config) {
            console.warn(`⚠️  Unknown module: ${moduleKey}, skipping`);
            continue;
        }

        const pricing = config.commercial.pricing[defaultTier];
        if (!pricing) {
            console.warn(`⚠️  No pricing for ${moduleKey} at tier ${defaultTier}, skipping`);
            continue;
        }

        // Convert 'unlimited' to null
        const limits = {};
        for (const [key, value] of Object.entries(pricing.limits)) {
            limits[key] = value === 'unlimited' ? null : value;
        }

        modules[moduleKey] = {
            enabled: true,
            tier: defaultTier,
            limits
        };
    }

    return modules;
}

/**
 * Main function
 */
async function main() {
    console.log('🔐 HRMS On-Premise License Generator\n');

    // Validate required options
    if (!options.company) {
        console.error('❌ Error: Company name is required');
        console.log('   Use --company "Your Company Name"');
        process.exit(1);
    }

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
                licenseData = generateEnterpriseLicense(
                    options.id,
                    options.company,
                    options.key,
                    parseInt(options.days)
                );
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

        // Resolve output path
        const outputPath = path.resolve(options.output);

        // Save license file
        const saved = saveLicenseFile(licenseData, outputPath);

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
                const config = commercialModuleConfigs[moduleKey];
                const displayName = config ? config.displayName : moduleKey;
                console.log(`  ✓ ${displayName} (${moduleConfig.tier})`);
                if (moduleConfig.limits && Object.keys(moduleConfig.limits).length > 0) {
                    const limitsStr = Object.entries(moduleConfig.limits)
                        .map(([k, v]) => `${k}: ${v === null ? 'unlimited' : v}`)
                        .join(', ');
                    console.log(`    Limits: ${limitsStr}`);
                }
            }
        }

        const disabledModules = Object.entries(licenseData.modules)
            .filter(([, config]) => !config.enabled);

        if (disabledModules.length > 0) {
            console.log('\nDisabled Modules:');
            for (const [moduleKey] of disabledModules) {
                const config = commercialModuleConfigs[moduleKey];
                const displayName = config ? config.displayName : moduleKey;
                console.log(`  ✗ ${displayName}`);
            }
        }

        console.log(`\n📄 License file saved to: ${outputPath}`);
        console.log('\n⚠️  Important Security Notes:');
        console.log('   1. Keep the secret key secure and do not share it');
        console.log('   2. The secret key is required to verify and modify license files');
        console.log('   3. Store the license file in a secure location');
        console.log('   4. Back up the license file and secret key separately');

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

// Run the script
main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
