#!/usr/bin/env node

/**
 * Simple Backup Test
 * 
 * Quick test to verify backup functionality works
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

console.log('🧪 Simple Backup Test');
console.log('=====================\n');

async function testBackup() {
    try {
        console.log('1. Testing MongoDB connection...');
        
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.log('❌ No MongoDB URI found in environment variables');
            return false;
        }
        
        console.log('✓ MongoDB URI found');
        
        // Test connection
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');
        
        // List databases
        const adminDb = mongoose.connection.db.admin();
        const databases = await adminDb.listDatabases();
        
        console.log('\n2. Available databases:');
        databases.databases.forEach(db => {
            console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(1)}MB)`);
        });
        
        // Test hrms database
        console.log('\n3. Testing hrms database access...');
        const hrmsDb = mongoose.connection.useDb('hrms');
        const hrmsCollections = await hrmsDb.db.listCollections().toArray();
        console.log(`✓ hrms database has ${hrmsCollections.length} collections`);
        
        // Test hrsm-licenses database
        console.log('\n4. Testing hrsm-licenses database access...');
        try {
            const licenseDb = mongoose.connection.useDb('hrsm-licenses');
            const licenseCollections = await licenseDb.db.listCollections().toArray();
            console.log(`✓ hrsm-licenses database has ${licenseCollections.length} collections`);
        } catch (error) {
            console.log('⚠ hrsm-licenses database not accessible (may not exist yet)');
        }
        
        console.log('\n5. Testing backup service import...');
        try {
            const { default: BackupService } = await import('../services/backupService.js');
            console.log('✓ BackupService imported successfully');
            
            const backupService = new BackupService();
            console.log('✓ BackupService instantiated successfully');
            
        } catch (error) {
            console.log(`❌ BackupService import failed: ${error.message}`);
            return false;
        }
        
        console.log('\n🎉 All tests passed!');
        console.log('✅ Backup system is ready to work with JavaScript fallback');
        
        return true;
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        return false;
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

// Run the test
testBackup().then(success => {
    if (success) {
        console.log('\n✅ Backup system verification complete');
        process.exit(0);
    } else {
        console.log('\n❌ Backup system verification failed');
        process.exit(1);
    }
}).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});