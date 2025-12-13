/**
 * Simple test script to check tenant database connection
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('📡 MongoDB URI:', mongoUri ? 'Found' : 'Not found');
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Try to import Tenant model
    console.log('📦 Importing Tenant model...');
    const Tenant = (await import('../platform/tenants/models/Tenant.js')).default;
    console.log('✅ Tenant model imported successfully');
    
    // Count existing tenants
    const count = await Tenant.countDocuments();
    console.log(`📊 Found ${count} existing tenants`);
    
    // Try to import tenant provisioning service
    console.log('📦 Importing tenant provisioning service...');
    const tenantProvisioningService = (await import('../platform/tenants/services/tenantProvisioningService.js')).default;
    console.log('✅ Tenant provisioning service imported successfully');
    
    console.log('🎉 All imports and connections successful!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

testConnection();