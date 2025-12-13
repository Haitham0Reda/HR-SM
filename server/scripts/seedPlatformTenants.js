/**
 * Platform Tenant Seeding Script
 * Creates sample tenants for testing the platform admin interface
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Import platform models
import Tenant from '../platform/tenants/models/Tenant.js';
import tenantProvisioningService from '../platform/tenants/services/tenantProvisioningService.js';

// Sample tenant data
const SAMPLE_TENANTS = [
  {
    name: 'TechCorp Solutions',
    domain: 'techcorp.example.com',
    deploymentMode: 'saas',
    contactInfo: {
      adminEmail: 'admin@techcorp.com',
      adminName: 'John Smith',
      phone: '+1-555-0101',
    },
    adminUser: {
      email: 'admin@techcorp.com',
      password: 'TechCorp123!',
      firstName: 'John',
      lastName: 'Smith',
    },
    metadata: {
      industry: 'Technology',
      companySize: '51-200',
    },
  },
  {
    name: 'Global Manufacturing Inc',
    domain: 'globalmanuf.example.com',
    deploymentMode: 'saas',
    contactInfo: {
      adminEmail: 'admin@globalmanuf.com',
      adminName: 'Sarah Johnson',
      phone: '+1-555-0202',
    },
    adminUser: {
      email: 'admin@globalmanuf.com',
      password: 'GlobalManuf123!',
      firstName: 'Sarah',
      lastName: 'Johnson',
    },
    metadata: {
      industry: 'Manufacturing',
      companySize: '201-500',
    },
  },
  {
    name: 'Healthcare Plus',
    domain: 'healthcareplus.example.com',
    deploymentMode: 'saas',
    contactInfo: {
      adminEmail: 'admin@healthcareplus.com',
      adminName: 'Dr. Michael Brown',
      phone: '+1-555-0303',
    },
    adminUser: {
      email: 'admin@healthcareplus.com',
      password: 'HealthCare123!',
      firstName: 'Michael',
      lastName: 'Brown',
    },
    metadata: {
      industry: 'Healthcare',
      companySize: '101-500',
    },
  },
  {
    name: 'StartupCo',
    deploymentMode: 'saas',
    contactInfo: {
      adminEmail: 'founder@startupco.com',
      adminName: 'Alex Chen',
      phone: '+1-555-0404',
    },
    adminUser: {
      email: 'founder@startupco.com',
      password: 'StartupCo123!',
      firstName: 'Alex',
      lastName: 'Chen',
    },
    metadata: {
      industry: 'Technology',
      companySize: '1-10',
    },
  },
  {
    name: 'Enterprise Corp',
    domain: 'enterprise.example.com',
    deploymentMode: 'on-premise',
    contactInfo: {
      adminEmail: 'it-admin@enterprise.com',
      adminName: 'Robert Wilson',
      phone: '+1-555-0505',
    },
    adminUser: {
      email: 'it-admin@enterprise.com',
      password: 'Enterprise123!',
      firstName: 'Robert',
      lastName: 'Wilson',
    },
    metadata: {
      industry: 'Finance',
      companySize: '1000+',
    },
  },
];

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log(chalk.green('✅ Connected to MongoDB'));
  } catch (error) {
    console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
    process.exit(1);
  }
}

/**
 * Clear existing tenants
 */
async function clearTenants() {
  try {
    const count = await Tenant.countDocuments();
    if (count > 0) {
      await Tenant.deleteMany({});
      console.log(chalk.yellow(`🗑️  Cleared ${count} existing tenants`));
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to clear tenants:'), error.message);
    throw error;
  }
}

/**
 * Create sample tenants
 */
async function createTenants() {
  console.log(chalk.blue('🏢 Creating sample tenants...'));
  
  const results = [];
  
  for (let i = 0; i < SAMPLE_TENANTS.length; i++) {
    const tenantData = SAMPLE_TENANTS[i];
    try {
      console.log(chalk.gray(`   Creating tenant ${i + 1}/${SAMPLE_TENANTS.length}: ${tenantData.name}`));
      
      const result = await tenantProvisioningService.createTenant(tenantData);
      results.push(result);
      
      console.log(chalk.green(`   ✅ Created tenant: ${result.tenant.name} (${result.tenant.tenantId})`));
    } catch (error) {
      console.error(chalk.red(`   ❌ Failed to create tenant ${tenantData.name}:`), error.message);
      if (error.stack) {
        console.error(chalk.red(`   Stack: ${error.stack}`));
      }
    }
  }
  
  console.log(chalk.blue(`🏢 Tenant creation completed. Created ${results.length}/${SAMPLE_TENANTS.length} tenants.`));
  return results;
}

/**
 * Update tenant usage with sample data
 */
async function updateTenantUsage() {
  console.log(chalk.blue('📊 Updating tenant usage data...'));
  
  const tenants = await Tenant.find({});
  
  for (const tenant of tenants) {
    try {
      // Generate realistic usage data based on company size
      const maxUsers = tenant.limits.maxUsers || 100;
      const userCount = Math.floor(Math.random() * (maxUsers * 0.8)) + Math.floor(maxUsers * 0.1);
      const storageUsed = Math.floor(Math.random() * (tenant.limits.maxStorage * 0.6));
      const apiCallsThisMonth = Math.floor(Math.random() * (tenant.limits.apiCallsPerMonth * 0.7));
      
      // Update limits based on company size if not set
      if (tenant.metadata?.companySize) {
        const sizeMap = {
          '1-10': { users: 25, storage: 5 * 1024 * 1024 * 1024, api: 50000 },
          '11-50': { users: 100, storage: 10 * 1024 * 1024 * 1024, api: 200000 },
          '51-200': { users: 300, storage: 25 * 1024 * 1024 * 1024, api: 500000 },
          '201-500': { users: 750, storage: 50 * 1024 * 1024 * 1024, api: 1000000 },
          '501-1000': { users: 1500, storage: 75 * 1024 * 1024 * 1024, api: 2000000 },
          '1000+': { users: 3000, storage: 100 * 1024 * 1024 * 1024, api: 5000000 }
        };
        
        const limits = sizeMap[tenant.metadata.companySize];
        if (limits) {
          tenant.limits.maxUsers = limits.users;
          tenant.limits.maxStorage = limits.storage;
          tenant.limits.apiCallsPerMonth = limits.api;
        }
      }
      
      tenant.usage.userCount = Math.min(userCount, tenant.limits.maxUsers);
      tenant.usage.storageUsed = storageUsed;
      tenant.usage.apiCallsThisMonth = apiCallsThisMonth;
      
      await tenant.save();
      
      console.log(chalk.green(`   ✅ Updated usage for ${tenant.name}: ${tenant.usage.userCount} users, ${(tenant.usage.storageUsed / 1024 / 1024 / 1024).toFixed(1)}GB storage`));
    } catch (error) {
      console.error(chalk.red(`   ❌ Failed to update usage for ${tenant.name}:`), error.message);
    }
  }
}

/**
 * Set some tenants to different statuses for testing
 */
async function updateTenantStatuses() {
  console.log(chalk.blue('🔄 Setting varied tenant statuses...'));
  
  const tenants = await Tenant.find({});
  
  if (tenants.length >= 4) {
    // Set one tenant to trial
    tenants[3].status = 'trial';
    tenants[3].subscription.status = 'trial';
    await tenants[3].save();
    console.log(chalk.yellow(`   📋 Set ${tenants[3].name} to trial status`));
    
    // Set one tenant to suspended (if we have enough)
    if (tenants.length >= 5) {
      tenants[4].status = 'suspended';
      tenants[4].metadata.suspensionReason = 'Payment overdue';
      tenants[4].metadata.suspendedAt = new Date();
      await tenants[4].save();
      console.log(chalk.red(`   ⏸️  Set ${tenants[4].name} to suspended status`));
    }
  }
}

/**
 * Main seeding function
 */
async function seedPlatformTenants() {
  try {
    console.log(chalk.blue.bold('🚀 Starting Platform Tenant Seeding...'));
    
    console.log(chalk.gray('📡 Connecting to database...'));
    await connectDB();
    
    console.log(chalk.gray('🗑️  Clearing existing tenants...'));
    await clearTenants();
    
    console.log(chalk.gray('🏢 Creating new tenants...'));
    const results = await createTenants();
    
    console.log(chalk.gray('📊 Updating tenant usage...'));
    await updateTenantUsage();
    
    console.log(chalk.gray('🔄 Setting tenant statuses...'));
    await updateTenantStatuses();
    
    console.log(chalk.green.bold(`\n✅ Platform tenant seeding completed successfully!`));
    console.log(chalk.green(`   Created ${results.length} tenants`));
    console.log(chalk.gray(`   You can now test the Platform Admin interface`));
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Platform tenant seeding failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    console.log(chalk.gray('📡 Disconnecting from MongoDB...'));
    await mongoose.disconnect();
    console.log(chalk.gray('📡 Disconnected from MongoDB'));
    process.exit(0);
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPlatformTenants();
}

export default seedPlatformTenants;