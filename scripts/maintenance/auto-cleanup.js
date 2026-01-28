/**
 * Automated Database Cleanup Script
 * 
 * Removes the databases you marked in MongoDB Compass
 */

import { MongoClient } from 'mongodb';

const CLUSTER_1_URI = 'mongodb+srv://devhaithammoreda_db_user:cvF50PEZvfPVmKU3@cluster.uwhj601.mongodb.net/';

async function main() {
  console.log('🧹 Starting automated cleanup...\n');
  
  const client = new MongoClient(CLUSTER_1_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to Cluster 1\n');
    
    // 1. Delete duplicate hrsm-licenses (Cluster 1)
    console.log('1️⃣  Deleting duplicate hrsm-licenses database...');
    await client.db('hrsm-licenses').dropDatabase();
    console.log('   ✅ Deleted\n');
    
    // 2. Delete tenants collection from hrsm_platform
    console.log('2️⃣  Deleting tenants collection from hrsm_platform...');
    const result = await client.db('hrsm_platform').collection('tenants').deleteMany({});
    console.log(`   ✅ Deleted ${result.deletedCount} tenant records\n`);
    
    // 3. Delete hrms database
    console.log('3️⃣  Deleting hrms database...');
    await client.db('hrms').dropDatabase();
    console.log('   ✅ Deleted\n');
    
    console.log('━'.repeat(60));
    console.log('✅ Cleanup complete!');
    console.log('━'.repeat(60));
    console.log('\nCleaned up:');
    console.log('  ✓ Removed duplicate hrsm-licenses database');
    console.log('  ✓ Removed tenants from hrsm_platform');
    console.log('  ✓ Removed hrms database');
    console.log('\nThe correct data is still safe on Cluster 2 (license-server)!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

main();
