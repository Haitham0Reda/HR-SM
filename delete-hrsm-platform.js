import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const client = new MongoClient(uri);

async function deleteHrsmPlatform() {
  try {
    await client.connect();
    console.log('🗑️  Deleting hrsm_platform database...');
    
    await client.db('hrsm_platform').dropDatabase();
    console.log('✅ hrsm_platform database deleted successfully\n');
    
    // Verify it's gone
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    
    const platformDb = databases.find(db => db.name === 'hrsm_platform');
    if (platformDb) {
      console.log('❌ hrsm_platform still exists!');
    } else {
      console.log('✅ Verified: hrsm_platform is gone');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

deleteHrsmPlatform();
