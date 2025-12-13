#!/usr/bin/env node

/**
 * Migration Script: Convert Old Tenants to New Company Model
 * 
 * This script migrates existing companies from the old tenant system
 * to the new platform Company model with module management.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import Company from '../platform/models/Company.js';

dotenv.config();

// Mapping of database names to company info
const DATABASE_COMPANY_MAP = {
  'hrsm_techcorp_solutions': {
    name: 'TechCorp Solutions',
    slug: 'techcorp_solutions',
    adminEmail: 'admin@techcorp.com'
  },
  'hrsm_global_manufacturing_inc': {
    name: 'Global Manufacturing Inc',
    slug: 'global_manufacturing_inc',
    adminEmail: 'admin@globalmanufacturing.com'
  },
  'hrsm_european_consulting_group': {
    name: 'European Consulting Group',
    slug: 'european_consulting_group',
    adminEmail: 'admin@europeanconsulting.com'
  },
  'hrsm_healthcare_plus': {
    name: 'Healthcare Plus',
    slug: 'healthcare_plus',
    adminEmail: 'admin@healthcareplus.com'
  },
  'hrsm_middle_east_trading_co': {
    name: 'Middle East Trading Co',
    slug: 'middle_east_trading_co',
    adminEmail: 'admin@metradingco.com'
  },
  'hrsm_hbo': {
    name: 'HBO',
    slug: 'hbo',
    adminEmail: 'admin@hbo.com'
  }
};

async function migrateCompanies() {
  try {
    console.log(chalk.blue('🔄 Starting Company Migration'));
    console.log(chalk.gray('================================\n'));

    await mongoose.connect(process.env.MONGODB_URI);
    console.log(chalk.green('✅ Connected to MongoDB'));

    // Get list of all databases
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    const companyDatabases = dbs.databases.filter(db => 
      db.name.startsWith('hrsm_') && db.name !== 'hrsm_db' && db.name !== 'hrsm_test_company'
    );

    console.log(chalk.yellow(`\n📋 Found ${companyDatabases.length} company databases to migrate:`));
    companyDatabases.forEach(db => {
      console.log(`  - ${db.name}`);
    });

    // Get existing tenant configs for module information
    const tenantConfigs = await mongoose.connection.db.collection('tenantconfigs').find({}).toArray();
    console.log(chalk.yellow(`\n📋 Found ${tenantConfigs.length} tenant configs`));

    // Create a map of company names to their modules
    const companyModules = {};
    tenantConfigs.forEach(config => {
      const companyName = config.name || config.companyName;
      if (companyName && config.modules) {
        const enabledModules = Object.keys(config.modules).filter(key => config.modules[key]);
        companyModules[companyName] = enabledModules;
      }
    });

    // Migrate each company database
    let migratedCount = 0;
    let skippedCount = 0;

    for (const db of companyDatabases) {
      const dbName = db.name;
      const companyInfo = DATABASE_COMPANY_MAP[dbName];

      if (!companyInfo) {
        console.log(chalk.yellow(`⚠️  Skipping ${dbName} - no mapping found`));
        skippedCount++;
        continue;
      }

      // Check if company already exists
      const existingCompany = await Company.findOne({ 
        $or: [
          { slug: companyInfo.slug },
          { databaseName: dbName }
        ]
      });

      if (existingCompany) {
        console.log(chalk.yellow(`⚠️  Company ${companyInfo.name} already exists, skipping`));
        skippedCount++;
        continue;
      }

      console.log(chalk.blue(`\n🔧 Migrating ${companyInfo.name}...`));

      // Get modules for this company
      const modules = companyModules[companyInfo.name] || ['hr-core'];
      console.log(`  Modules: ${modules.join(', ')}`);

      // Create new company record
      const company = new Company({
        name: companyInfo.name,
        slug: companyInfo.slug,
        databaseName: dbName,
        adminEmail: companyInfo.adminEmail,
        status: 'active',
        subscription: {
          plan: 'business',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          autoRenew: false
        },
        usage: {
          employees: 0,
          storage: 0,
          apiCalls: 0,
          lastUpdated: new Date()
        }
      });

      // Enable modules
      modules.forEach(moduleKey => {
        let tier = 'business';
        let limits = {
          employees: 200,
          storage: 10737418240, // 10GB
          apiCalls: 50000
        };

        // Special handling for hr-core
        if (moduleKey === 'hr-core') {
          tier = 'enterprise';
          limits = {}; // No limits for hr-core
        }

        company.enableModule(moduleKey, tier, limits);
      });

      await company.save();
      console.log(chalk.green(`✅ Created company: ${companyInfo.name}`));
      migratedCount++;
    }

    console.log(chalk.blue('\n📊 Migration Summary:'));
    console.log(chalk.green(`  ✅ Migrated: ${migratedCount} companies`));
    console.log(chalk.yellow(`  ⚠️  Skipped: ${skippedCount} companies`));

    // Show final company list
    console.log(chalk.blue('\n📋 All Companies in Platform:'));
    const allCompanies = await Company.find({}).select('name slug status');
    allCompanies.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name} (${company.slug}) - ${company.status}`);
    });

    await mongoose.disconnect();
    console.log(chalk.green('\n🎉 Migration completed successfully!'));

  } catch (error) {
    console.error(chalk.red('❌ Migration failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Shutting down...'));
  await mongoose.disconnect();
  process.exit(0);
});

// Run the migration
migrateCompanies();