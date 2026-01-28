import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function listCollections() {
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected!');
    
    // List collections in hrsm_techcorp_solutions
    const db = client.db('hrsm_techcorp_solutions');
    const collections = await db.listCollections().toArray();
    
    console.log(`📋 Collections in hrsm_techcorp_solutions (${collections.length} total):`);
    
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`   ${coll.name}: ${count} documents`);
    }
    
    // Check for tenantconfigs specifically
    console.log('🔍 Checking for tenant config collections...');
    const tenantConfigColls = collections.filter(c => c.name.toLowerCase().includes('tenant'));
    if (tenantConfigColls.length > 0) {
      console.log('   Found:');
      tenantConfigColls.forEach(c => console.log(`   - ${c.name}`));
    } else {
      console.log('   ❌ No tenant-related collections found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    console.log('Closing connection...');
    await client.close();
    console.log('Done!');
  }
}

listCollections().catch(console.error);
