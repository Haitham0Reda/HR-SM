import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function moveProviders() {
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const adminDb = client.db('hrsm_admin');
    const companyDb = client.db('hrsm_techcorp_solutions');
    
    // Get providers from admin database
    const providers = await adminDb.collection('insuranceproviders').find({}).toArray();
    
    console.log(`📋 Found ${providers.length} providers in hrsm_admin`);
    
    if (providers.length === 0) {
      console.log('❌ No providers to move');
      return;
    }
    
    // Update tenantId to techcorp_solutions
    const providersToInsert = providers.map(provider => ({
      ...provider,
      tenantId: 'techcorp_solutions',
      _id: undefined // Remove _id to let MongoDB generate new ones
    }));
    
    // Insert into company database
    const result = await companyDb.collection('insuranceproviders').insertMany(providersToInsert);
    
    console.log(`✅ Inserted ${result.insertedCount} providers into hrsm_techcorp_solutions`);
    
    // Verify
    const verifyProviders = await companyDb.collection('insuranceproviders').find({}).toArray();
    console.log('\n📋 Providers in hrsm_techcorp_solutions:');
    verifyProviders.forEach((provider, index) => {
      console.log(`   ${index + 1}. ${provider.name} (${provider.code}) - Rating: ${provider.rating} - TenantId: ${provider.tenantId}`);
    });
    
    // Delete from admin database
    console.log('\n🗑️  Deleting providers from hrsm_admin...');
    const deleteResult = await adminDb.collection('insuranceproviders').deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} providers from hrsm_admin`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

moveProviders();
