/**
 * Database Cleanup Script
 * 
 * Safely removes duplicate/old data after migration
 * 
 * IMPORTANT: Review carefully before running!
 */

import { MongoClient } from 'mongodb';
import readline from 'readline';

const CLUSTER_1_URI = 'mongodb+srv://devhaithammoreda_db_user:cvF50PEZvfPVmKU3@cluster.uwhj601.mongodb.net/';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🧹 Database Cleanup Script\n');
  console.log('This script will help you clean up databases after migration.\n');
  
  const client = new MongoClient(CLUSTER_1_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to Cluster 1\n');
    
    // Option 1: Delete duplicate hrsm-licenses database
    console.log('━'.repeat(60));
    console.log('1️⃣  DUPLICATE DATABASE: hrsm-licenses (Cluster 1)');
    console.log('━'.repeat(60));
    console.log('This is a duplicate created during the first migration attempt.');
    console.log('The real hrsm-licenses database is on Cluster 2 (license-server).');
    console.log('');
    
    const deleteDuplicate = await question('Delete duplicate hrsm-licenses database? (yes/no): ');
    
    if (deleteDuplicate.toLowerCase() === 'yes') {
      console.log('\n🗑️  Deleting hrsm-licenses database from Cluster 1...');
      await client.db('hrsm-licenses').dropDatabase();
      console.log('✅ Deleted hrsm-licenses database\n');
    } else {
      console.log('⏭️  Skipped\n');
    }
    
    // Option 2: Remove tenants collection from hrsm_platform
    console.log('━'.repeat(60));
    console.log('2️⃣  BACKWARD COMPATIBILITY DATA: hrsm_platform.tenants');
    console.log('━'.repeat(60));
    console.log('The tenants collection in hrsm_platform is for backward compatibility.');
    console.log('Once you verify the License Server works, you can remove it.');
    console.log('⚠️  WARNING: Only do this if License Server is working correctly!');
    console.log('');
    
    const deleteTenants = await question('Delete tenants collection from hrsm_platform? (yes/no): ');
    
    if (deleteTenants.toLowerCase() === 'yes') {
      const confirm = await question('⚠️  Are you SURE? This cannot be undone! (type "DELETE" to confirm): ');
      
      if (confirm === 'DELETE') {
        console.log('\n🗑️  Deleting tenants collection from hrsm_platform...');
        const result = await client.db('hrsm_platform').collection('tenants').deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} tenant records\n`);
      } else {
        console.log('⏭️  Cancelled\n');
      }
    } else {
      console.log('⏭️  Skipped\n');
    }
    
    // Option 3: Delete hrms database (OLD/LEGACY)
    console.log('━'.repeat(60));
    console.log('3️⃣  LEGACY DATABASE: hrms');
    console.log('━'.repeat(60));
    console.log('This appears to be an old/legacy database with 64 collections.');
    console.log('⚠️  WARNING: Make sure you know what this database contains!');
    console.log('⚠️  This might be important data!');
    console.log('');
    
    const deleteHrms = await question('Delete hrms database? (yes/no): ');
    
    if (deleteHrms.toLowerCase() === 'yes') {
      const confirm = await question('⚠️  Are you ABSOLUTELY SURE? This is a large database! (type "DELETE HRMS" to confirm): ');
      
      if (confirm === 'DELETE HRMS') {
        console.log('\n🗑️  Deleting hrms database...');
        await client.db('hrms').dropDatabase();
        console.log('✅ Deleted hrms database\n');
      } else {
        console.log('⏭️  Cancelled\n');
      }
    } else {
      console.log('⏭️  Skipped\n');
    }
    
    console.log('━'.repeat(60));
    console.log('✅ Cleanup complete!');
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    rl.close();
  }
}

main();
