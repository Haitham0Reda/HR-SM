#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Simple Index Test');
console.log('===================\n');

async function createSimpleIndexes() {
  try {
    console.log('Connecting to main database...');
    const mainUri = process.env.MONGODB_URI;
    const mainConnection = await mongoose.connect(mainUri);
    
    console.log('✅ Connected to main database:', mainConnection.connection.db.databaseName);
    
    // Create a simple collection and index
    const db = mainConnection.connection.db;
    const collection = db.collection('test_indexes');
    
    // Insert a test document to create the collection
    await collection.insertOne({ test: true });
    
    // Create a simple index
    await collection.createIndex({ test: 1 }, { name: 'test_index' });
    console.log('✅ Created test index');
    
    // List indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('Indexes:', indexes.map(i => i.name));
    
    // Clean up
    await collection.drop();
    console.log('✅ Cleaned up test collection');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected');
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

createSimpleIndexes()
  .then(success => {
    console.log(success ? '✅ Test passed' : '❌ Test failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });