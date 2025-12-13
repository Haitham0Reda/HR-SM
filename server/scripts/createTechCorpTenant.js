#!/usr/bin/env node

/**
 * Create TechCorp Tenant Script
 * Creates a TenantConfig record for TechCorp Solutions to enable login
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import TenantConfig from '../modules/hr-core/models/TenantConfig.js';
import Company from '../platform/models/Company.js';

// Load environment variables
dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-platform');
    console.log(chalk.green('✅ Connected to MongoDB'));
  } catch (error) {
    console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
    process.exit(1);
  }
}

async function createTechCorpTenant() {
  try {
    await connectDB();

    console.log(chalk.blue('🏢 Creating TenantConfig for TechCorp Solutions\n'));

    // Find TechCorp company
    const company = await Company.findOne({ slug: 'techcorp_solutions' });
    if (!company) {
      console.log(chalk.red('❌ TechCorp Solutions company not found'));
      return;
    }

    console.log(chalk.green('✅ Found TechCorp Solutions company:'));
    console.log(`  ID: ${company._id}`);
    console.log(`  Name: ${company.name}`);

    // Check if TenantConfig already exists
    const existingTenant = await TenantConfig.findOne({ tenantId: company._id });
    
    if (existingTenant) {
      console.log(chalk.yellow('⚠️ TenantConfig already exists:'));
      console.log(`  Company: ${existingTenant.companyName}`);
      console.log(`  Deployment: ${existingTenant.deploymentMode}`);
      console.log(`  Status: ${existingTenant.status}`);
    } else {
      // Create TenantConfig
      const tenantConfig = new TenantConfig({
        tenantId: company._id,
        companyName: company.name,
        deploymentMode: 'saas',
        status: 'active',
        subscription: {
          plan: 'professional', // Use valid enum value
          status: 'active',
          maxEmployees: 200,
          maxStorage: 10737418240, // 10GB
          features: ['hr-core', 'attendance', 'leave', 'payroll', 'documents', 'reports', 'tasks', 'surveys', 'announcements', 'events']
        },
        settings: {
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          currency: 'USD',
          language: 'en'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await tenantConfig.save();
      
      console.log(chalk.green('✅ TenantConfig created successfully:'));
      console.log(`  Tenant ID: ${tenantConfig.tenantId}`);
      console.log(`  Company: ${tenantConfig.companyName}`);
      console.log(`  Deployment: ${tenantConfig.deploymentMode}`);
      console.log(`  Status: ${tenantConfig.status}`);
      console.log(`  Plan: ${tenantConfig.subscription.plan}`);
      console.log(`  Max Employees: ${tenantConfig.subscription.maxEmployees}`);
    }

    console.log(chalk.green('\n🎉 TechCorp Solutions is now ready for login!'));
    console.log(chalk.blue('\n🔑 Login credentials:'));
    console.log(`  Email: admin@techcorp.com`);
    console.log(`  Password: admin123`);
    console.log(`  Tenant ID: ${company._id}`);

  } catch (error) {
    console.error(chalk.red('❌ Failed to create tenant:'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.blue('\n🔌 Disconnected from MongoDB'));
  }
}

createTechCorpTenant();