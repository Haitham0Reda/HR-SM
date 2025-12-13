/**
 * Script to create multiple test tenants
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const TENANTS = [
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
];

async function createMultipleTenants() {
  try {
    console.log('🚀 Creating multiple test tenants...');
    
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Import services
    const tenantProvisioningService = (await import('../platform/tenants/services/tenantProvisioningService.js')).default;
    const Tenant = (await import('../platform/tenants/models/Tenant.js')).default;
    
    let created = 0;
    
    for (let i = 0; i < TENANTS.length; i++) {
      const tenantData = TENANTS[i];
      try {
        console.log(`📝 Creating tenant ${i + 1}/${TENANTS.length}: ${tenantData.name}`);
        
        const result = await tenantProvisioningService.createTenant(tenantData);
        
        // Update with realistic usage data
        const tenant = await Tenant.findOne({ tenantId: result.tenant.tenantId });
        if (tenant) {
          // Set realistic usage based on company size
          const sizeMap = {
            '1-10': { users: 5, storage: 1 * 1024 * 1024 * 1024, api: 5000 },
            '11-50': { users: 25, storage: 3 * 1024 * 1024 * 1024, api: 15000 },
            '51-200': { users: 120, storage: 8 * 1024 * 1024 * 1024, api: 45000 },
            '201-500': { users: 280, storage: 15 * 1024 * 1024 * 1024, api: 85000 },
            '101-500': { users: 180, storage: 12 * 1024 * 1024 * 1024, api: 65000 }
          };
          
          const usage = sizeMap[tenantData.metadata.companySize] || sizeMap['1-10'];
          tenant.usage.userCount = usage.users;
          tenant.usage.storageUsed = usage.storage;
          tenant.usage.apiCallsThisMonth = usage.api;
          
          // Set some tenants to different statuses
          if (i === 3) {
            tenant.status = 'trial';
            tenant.subscription.status = 'trial';
          }
          
          await tenant.save();
        }
        
        console.log(`✅ Created: ${result.tenant.name} (${result.tenant.tenantId})`);
        created++;
        
      } catch (error) {
        console.error(`❌ Failed to create ${tenantData.name}:`, error.message);
      }
    }
    
    console.log(`🎉 Successfully created ${created}/${TENANTS.length} tenants!`);
    
    // Show final count
    const totalCount = await Tenant.countDocuments();
    console.log(`📊 Total tenants in database: ${totalCount}`);
    
  } catch (error) {
    console.error('❌ Failed to create tenants:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

createMultipleTenants();