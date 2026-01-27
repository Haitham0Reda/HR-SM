import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function copyTenantConfig() {
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    // Read from hrsm_techcorp_solutions
    const techcorpDb = client.db('hrsm_techcorp_solutions');
    const sourceConfig = await techcorpDb.collection('tenantconfigs').findOne({ tenantId: 'techcorp_solutions' });
    
    if (!sourceConfig) {
      console.log('❌ TenantConfig not found in hrsm_techcorp_solutions');
      return;
    }
    
    console.log('📋 Found TenantConfig in hrsm_techcorp_solutions:');
    console.log(`   Tenant ID: ${sourceConfig.tenantId}`);
    console.log(`   License modules: ${sourceConfig.license?.enabledModules?.length || 0}`);
    console.log(`   Has life-insurance: ${sourceConfig.license?.enabledModules?.includes('life-insurance')}\n`);
    
    // Copy to hrsm_admin
    const adminDb = client.db('hrsm_admin');
    
    // Remove _id to let MongoDB generate a new one
    const configToCopy = { ...sourceConfig };
    delete configToCopy._id;
    
    // Check if already exists
    const existing = await adminDb.collection('tenantconfigs').findOne({ tenantId: 'techcorp_solutions' });
    
    if (existing) {
      console.log('⚠️  TenantConfig already exists in hrsm_admin, updating...');
      await adminDb.collection('tenantconfigs').replaceOne(
        { tenantId: 'techcorp_solutions' },
        configToCopy
      );
      console.log('✅ Updated TenantConfig in hrsm_admin');
    } else {
      console.log('📝 Copying TenantConfig to hrsm_admin...');
      await adminDb.collection('tenantconfigs').insertOne(configToCopy);
      console.log('✅ Copied TenantConfig to hrsm_admin');
    }
    
    // Verify
    const copied = await adminDb.collection('tenantconfigs').findOne({ tenantId: 'techcorp_solutions' });
    console.log('\n✅ Verification:');
    console.log(`   Tenant ID: ${copied.tenantId}`);
    console.log(`   License modules: ${copied.license?.enabledModules?.length || 0}`);
    console.log(`   Has life-insurance: ${copied.license?.enabledModules?.includes('life-insurance')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected');
  }
}

copyTenantConfig();
