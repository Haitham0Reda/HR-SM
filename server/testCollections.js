#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function testCollections() {
    try {
        console.log('🔍 Testing database collections...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        
        // List all collections
        const collections = await db.listCollections().toArray();
        console.log(`\n📊 Found ${collections.length} collections:`);
        
        const targetCollections = ['performancemetrics', 'securityevents', 'systemalerts'];
        
        for (const targetCollection of targetCollections) {
            const exists = collections.some(c => c.name === targetCollection);
            if (exists) {
                console.log(`✅ ${targetCollection} - EXISTS`);
                
                // Check document count
                const collection = db.collection(targetCollection);
                const count = await collection.countDocuments();
                console.log(`   📄 Documents: ${count}`);
                
                // Check indexes
                const indexes = await collection.indexes();
                console.log(`   🔍 Indexes: ${indexes.length}`);
                indexes.forEach(index => {
                    const keys = Object.keys(index.key).join(', ');
                    console.log(`      • ${index.name}: {${keys}}`);
                });
            } else {
                console.log(`❌ ${targetCollection} - MISSING`);
            }
        }

        console.log('\n🎉 Collection test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

testCollections();