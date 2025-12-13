#!/usr/bin/env node

/**
 * Company Module Management Script
 * 
 * CLI tool for managing company modules and licenses
 * Usage examples:
 *   node server/scripts/manageCompanyModules.js list-companies
 *   node server/scripts/manageCompanyModules.js show-modules --company techcorp_solutions
 *   node server/scripts/manageCompanyModules.js enable-module --company techcorp_solutions --module payroll --tier business
 *   node server/scripts/manageCompanyModules.js disable-module --company techcorp_solutions --module payroll
 *   node server/scripts/manageCompanyModules.js generate-license --company techcorp_solutions
 *   node server/scripts/manageCompanyModules.js bulk-enable --module attendance --tier starter
 */

import { program } from 'commander';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
// Simple table formatting function
function createTable(headers, rows) {
  const colWidths = headers.map((header, i) => 
    Math.max(header.length, ...rows.map(row => String(row[i] || '').length)) + 2
  );
  
  const separator = '+' + colWidths.map(w => '-'.repeat(w)).join('+') + '+';
  const headerRow = '|' + headers.map((h, i) => ` ${h.padEnd(colWidths[i] - 1)}`).join('|') + '|';
  const dataRows = rows.map(row => 
    '|' + row.map((cell, i) => ` ${String(cell || '').padEnd(colWidths[i] - 1)}`).join('|') + '|'
  );
  
  return [separator, headerRow, separator, ...dataRows, separator].join('\n');
}
import Company from '../platform/models/Company.js';
import ModuleManagementService from '../platform/services/ModuleManagementService.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-platform');
    console.log(chalk.green('✅ Connected to MongoDB'));
  } catch (error) {
    console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
    process.exit(1);
  }
}

// List all companies
async function listCompanies() {
  try {
    const companies = await Company.find({})
      .sort({ createdAt: -1 });

    if (companies.length === 0) {
      console.log(chalk.yellow('No companies found'));
      return;
    }

    const headers = ['Name', 'Slug', 'Status', 'Plan', 'Expires', 'Modules', 'Employees'];
    const rows = companies.map(company => {
      // Manually count enabled modules since company is a plain object, not a Mongoose instance
      let enabledModulesCount = 0;
      if (company.modules) {
        if (company.modules instanceof Map) {
          for (const [key, config] of company.modules) {
            if (config && config.enabled) {
              enabledModulesCount++;
            }
          }
        } else if (typeof company.modules === 'object') {
          for (const [key, config] of Object.entries(company.modules)) {
            if (config && config.enabled) {
              enabledModulesCount++;
            }
          }
        }
      }
      
      const expirationDate = new Date(company.subscription.endDate).toLocaleDateString();
      
      return [
        company.name,
        company.slug,
        company.status,
        company.subscription.plan,
        expirationDate,
        enabledModulesCount.toString(),
        company.usage.employees.toString()
      ];
    });

    console.log('\n' + chalk.blue('📋 Companies List'));
    console.log(createTable(headers, rows));
    console.log(chalk.gray(`\nTotal: ${companies.length} companies`));

  } catch (error) {
    console.error(chalk.red('❌ Failed to list companies:'), error.message);
  }
}

// Show modules for a specific company
async function showCompanyModules(companySlug) {
  try {
    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      console.log(chalk.red(`❌ Company not found: ${companySlug}`));
      return;
    }

    console.log(chalk.blue(`\n📊 Modules for ${company.name} (${company.slug})`));
    console.log(chalk.gray('='.repeat(60)));

    // Company info
    console.log(chalk.yellow('\n📋 Company Information:'));
    console.log(`  Status: ${company.status}`);
    console.log(`  Plan: ${company.subscription.plan}`);
    console.log(`  Expires: ${new Date(company.subscription.endDate).toLocaleDateString()}`);
    console.log(`  License Key: ${company.licenseKey || 'Not generated'}`);

    // Usage stats
    console.log(chalk.yellow('\n📈 Usage Statistics:'));
    console.log(`  Employees: ${company.usage.employees}`);
    console.log(`  Storage: ${formatBytes(company.usage.storage)}`);
    console.log(`  API Calls: ${company.usage.apiCalls}`);
    console.log(`  Last Updated: ${company.usage.lastUpdated?.toLocaleDateString() || 'Never'}`);

    // Modules table
    const availableModules = ModuleManagementService.getAvailableModules();
    const headers = ['Module', 'Status', 'Tier', 'Employees Limit', 'Storage Limit', 'API Limit'];
    const rows = [];

    for (const [moduleKey, moduleInfo] of Object.entries(availableModules)) {
      const moduleConfig = company.getModuleConfig(moduleKey);
      const enabled = moduleConfig ? moduleConfig.enabled : false;
      const tier = moduleConfig ? moduleConfig.tier : '-';
      const limits = moduleConfig ? moduleConfig.limits : {};

      rows.push([
        moduleInfo.name,
        enabled ? '✓ Enabled' : '✗ Disabled',
        tier,
        limits.employees ? limits.employees.toString() : 'Unlimited',
        limits.storage ? formatBytes(limits.storage) : 'Unlimited',
        limits.apiCalls ? limits.apiCalls.toString() : 'Unlimited'
      ]);
    }

    console.log(chalk.yellow('\n🔧 Module Configuration:'));
    console.log(createTable(headers, rows));

  } catch (error) {
    console.error(chalk.red('❌ Failed to show company modules:'), error.message);
  }
}

// Enable module for company
async function enableModule(companySlug, moduleKey, tier, customLimits) {
  try {
    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      console.log(chalk.red(`❌ Company not found: ${companySlug}`));
      return;
    }

    console.log(chalk.blue(`\n🔧 Enabling module '${moduleKey}' for ${company.name}...`));

    const result = await ModuleManagementService.enableModuleForCompany(
      company._id,
      moduleKey,
      tier,
      customLimits
    );

    if (result.success) {
      console.log(chalk.green('✅ Module enabled successfully!'));
      console.log(`  Module: ${moduleKey}`);
      console.log(`  Tier: ${tier}`);
      if (customLimits && Object.keys(customLimits).length > 0) {
        console.log('  Custom Limits:');
        Object.entries(customLimits).forEach(([key, value]) => {
          console.log(`    ${key}: ${value}`);
        });
      }
    } else {
      console.log(chalk.red(`❌ Failed to enable module: ${result.message}`));
    }

  } catch (error) {
    console.error(chalk.red('❌ Failed to enable module:'), error.message);
  }
}

// Disable module for company
async function disableModule(companySlug, moduleKey) {
  try {
    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      console.log(chalk.red(`❌ Company not found: ${companySlug}`));
      return;
    }

    console.log(chalk.blue(`\n🔧 Disabling module '${moduleKey}' for ${company.name}...`));

    const result = await ModuleManagementService.disableModuleForCompany(company._id, moduleKey);

    if (result.success) {
      console.log(chalk.green('✅ Module disabled successfully!'));
    } else {
      console.log(chalk.red(`❌ Failed to disable module: ${result.message}`));
    }

  } catch (error) {
    console.error(chalk.red('❌ Failed to disable module:'), error.message);
  }
}

// Generate license for company
async function generateLicense(companySlug) {
  try {
    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      console.log(chalk.red(`❌ Company not found: ${companySlug}`));
      return;
    }

    const secretKey = process.env.LICENSE_SECRET_KEY;
    if (!secretKey) {
      console.log(chalk.red('❌ LICENSE_SECRET_KEY not configured in environment'));
      return;
    }

    console.log(chalk.blue(`\n📄 Generating license for ${company.name}...`));

    const result = await ModuleManagementService.generateCompanyLicense(company._id, secretKey);

    if (result.success) {
      console.log(chalk.green('✅ License generated successfully!'));
      console.log(`  License Key: ${result.licenseData.licenseKey}`);
      console.log(`  Expires: ${result.licenseData.expiresAt}`);
      console.log(`  File Path: ${result.licensePath}`);
      
      // Show enabled modules
      const enabledModules = Object.keys(result.licenseData.modules).filter(
        key => result.licenseData.modules[key].enabled
      );
      console.log(`  Enabled Modules: ${enabledModules.join(', ')}`);
    } else {
      console.log(chalk.red(`❌ Failed to generate license: ${result.message}`));
    }

  } catch (error) {
    console.error(chalk.red('❌ Failed to generate license:'), error.message);
  }
}

// Bulk enable module for all companies
async function bulkEnableModule(moduleKey, tier) {
  try {
    console.log(chalk.blue(`\n🔧 Bulk enabling module '${moduleKey}' (${tier}) for all companies...`));

    const companies = await Company.find({ status: 'active' });
    const companyIds = companies.map(c => c._id);

    if (companyIds.length === 0) {
      console.log(chalk.yellow('No active companies found'));
      return;
    }

    const result = await ModuleManagementService.bulkEnableModule(companyIds, moduleKey, tier);

    console.log(chalk.green(`✅ Bulk operation completed!`));
    console.log(`  Successful: ${result.success.length} companies`);
    console.log(`  Failed: ${result.failed.length} companies`);

    if (result.failed.length > 0) {
      console.log(chalk.yellow('\n⚠️  Failed companies:'));
      result.failed.forEach(failure => {
        console.log(`  - ${failure.companyId}: ${failure.error}`);
      });
    }

  } catch (error) {
    console.error(chalk.red('❌ Failed to bulk enable module:'), error.message);
  }
}

// Show module statistics
async function showModuleStats() {
  try {
    console.log(chalk.blue('\n📊 Module Statistics'));
    console.log(chalk.gray('='.repeat(50)));

    const availableModules = ModuleManagementService.getAvailableModules();
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: 'active' });

    console.log(chalk.yellow('\n📋 Overall Statistics:'));
    console.log(`  Total Companies: ${totalCompanies}`);
    console.log(`  Active Companies: ${activeCompanies}`);

    const headers = ['Module', 'Enabled Companies', 'Total Companies', 'Adoption %'];
    const rows = [];

    for (const [moduleKey, moduleInfo] of Object.entries(availableModules)) {
      const enabledCompanies = await Company.findByModule(moduleKey, true);
      const totalWithModule = await Company.findByModule(moduleKey, false);
      const adoptionRate = totalCompanies > 0 
        ? Math.round((enabledCompanies.length / totalCompanies) * 100)
        : 0;

      rows.push([
        moduleInfo.name,
        enabledCompanies.length.toString(),
        totalWithModule.length.toString(),
        `${adoptionRate}%`
      ]);
    }

    console.log(chalk.yellow('\n🔧 Module Adoption:'));
    console.log(createTable(headers, rows));

  } catch (error) {
    console.error(chalk.red('❌ Failed to show module stats:'), error.message);
  }
}

// Utility function to format bytes
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// CLI Commands
program
  .name('manage-company-modules')
  .description('Manage company modules and licenses')
  .version('1.0.0');

program
  .command('list-companies')
  .description('List all companies with their module status')
  .action(async () => {
    await connectDB();
    await listCompanies();
    process.exit(0);
  });

program
  .command('show-modules')
  .description('Show modules for a specific company')
  .requiredOption('-c, --company <slug>', 'Company slug')
  .action(async (options) => {
    await connectDB();
    await showCompanyModules(options.company);
    process.exit(0);
  });

program
  .command('enable-module')
  .description('Enable a module for a company')
  .requiredOption('-c, --company <slug>', 'Company slug')
  .requiredOption('-m, --module <key>', 'Module key')
  .option('-t, --tier <tier>', 'Pricing tier', 'starter')
  .option('--employees <number>', 'Employee limit')
  .option('--storage <bytes>', 'Storage limit in bytes')
  .option('--api-calls <number>', 'API calls limit')
  .action(async (options) => {
    await connectDB();
    
    const customLimits = {};
    if (options.employees) customLimits.employees = parseInt(options.employees);
    if (options.storage) customLimits.storage = parseInt(options.storage);
    if (options.apiCalls) customLimits.apiCalls = parseInt(options.apiCalls);
    
    await enableModule(options.company, options.module, options.tier, customLimits);
    process.exit(0);
  });

program
  .command('disable-module')
  .description('Disable a module for a company')
  .requiredOption('-c, --company <slug>', 'Company slug')
  .requiredOption('-m, --module <key>', 'Module key')
  .action(async (options) => {
    await connectDB();
    await disableModule(options.company, options.module);
    process.exit(0);
  });

program
  .command('generate-license')
  .description('Generate license file for a company')
  .requiredOption('-c, --company <slug>', 'Company slug')
  .action(async (options) => {
    await connectDB();
    await generateLicense(options.company);
    process.exit(0);
  });

program
  .command('bulk-enable')
  .description('Enable a module for all active companies')
  .requiredOption('-m, --module <key>', 'Module key')
  .option('-t, --tier <tier>', 'Pricing tier', 'starter')
  .action(async (options) => {
    await connectDB();
    await bulkEnableModule(options.module, options.tier);
    process.exit(0);
  });

program
  .command('stats')
  .description('Show module adoption statistics')
  .action(async () => {
    await connectDB();
    await showModuleStats();
    process.exit(0);
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Shutting down...'));
  await mongoose.disconnect();
  process.exit(0);
});

// Parse command line arguments
program.parse();