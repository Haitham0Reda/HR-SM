import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const client = new MongoClient(uri);

async function cleanup() {
  try {
    await client.connect();
    console.log('🗑️  Cleaning up test database...');
    
    await client.db('test').dropDatabase();
    console.log('✅ test database deleted\n');
    
    // List all databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('Current databases on Cluster 1:');
    databases
      .filter(db => !db.name.includes('admin') && !db.name.includes('local'))
      .forEach(db => {
        console.log(`  - ${db.name}: ${(db.sizeOnDisk / 1024).toFixed(2)} KB`);
      });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

cleanup();
