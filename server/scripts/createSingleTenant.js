/**
 * Simple script to create a single tenant for testing
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function createSingleTenant() {
  try {
    console.log('🚀 Creating single test tenant...');
    
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Import services
    const tenantProvisioningService = (await import('../platform/tenants/services/tenantProvisioningService.js')).default;
    
    const tenantData = {
      name: 'Test Company',
      domain: 'test.example.com',
      deploymentMode: 'saas',
      contactInfo: {
        adminEmail: 'admin@test.com',
        adminName: 'Test Admin',
        phone: '+1-555-0001',
      },
      adminUser: {
        email: 'admin@test.com',
        password: 'TestAdmin123!',
        firstName: 'Test',
        lastName: 'Admin',
      },
      metadata: {
        industry: 'Technology',
        companySize: '1-10',
      },
    };
    
    console.log('📝 Creating tenant with data:', JSON.stringify(tenantData, null, 2));
    
    const result = await tenantProvisioningService.createTenant(tenantData);
    
    console.log('✅ Tenant created successfully!');
    console.log('📊 Tenant ID:', result.tenant.tenantId);
    console.log('👤 Admin User:', result.adminUser.email);
    
  } catch (error) {
    console.error('❌ Failed to create tenant:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

createSingleTenant();