/**
 * Backup Leave Collection Script
 * 
 * Creates a backup of the Leave collection before migration
 * Saves backup to MongoDB with timestamp
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Import Leave model
import Leave from '../../modules/hr-core/vacations/models/leave.model.js';

const BACKUP_COLLECTION_NAME = 'leaves_backup';

async function backupLeaveCollection() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Check if Leave collection exists
    const collections = await db.listCollections({ name: 'leaves' }).toArray();
    if (collections.length === 0) {
      console.log('⚠️  Leave collection does not exist. Nothing to backup.');
      return;
    }

    // Count documents in Leave collection
    const leaveCount = await Leave.countDocuments();
    console.log(`📊 Found ${leaveCount} documents in Leave collection`);

    if (leaveCount === 0) {
      console.log('⚠️  Leave collection is empty. Nothing to backup.');
      return;
    }

    // Create backup collection name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupCollectionName = `${BACKUP_COLLECTION_NAME}_${timestamp}`;

    console.log(`🔄 Creating backup collection: ${backupCollectionName}`);

    // Get all documents from Leave collection
    const leaves = await Leave.find({}).lean();

    // Insert into backup collection
    const backupCollection = db.collection(backupCollectionName);
    await backupCollection.insertMany(leaves);

    console.log(`✅ Successfully backed up ${leaves.length} documents to ${backupCollectionName}`);

    // Create metadata document
    const metadataCollection = db.collection('migration_metadata');
    await metadataCollection.insertOne({
      type: 'backup',
      sourceCollection: 'leaves',
      backupCollection: backupCollectionName,
      documentCount: leaves.length,
      createdAt: new Date(),
      status: 'completed'
    });

    console.log('✅ Backup metadata saved');
    console.log('\n📋 Backup Summary:');
    console.log(`   - Source: leaves`);
    console.log(`   - Backup: ${backupCollectionName}`);
    console.log(`   - Documents: ${leaves.length}`);
    console.log(`   - Timestamp: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('❌ Error during backup:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run backup if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backupLeaveCollection()
    .then(() => {
      console.log('\n✅ Backup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Backup failed:', error);
      process.exit(1);
    });
}

export default backupLeaveCollection;
