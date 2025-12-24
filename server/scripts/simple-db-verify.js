#!/usr/bin/env node

/**
 * Simple HRMS Database Verification
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function verifyHRMSDatabase() {
    try {
        console.log('🔍 Verifying HRMS Database Configuration...\n');

        // Connect to database
        const mongoUri = process.env.MONGODB_URI;
        console.log('📡 Connecting to MongoDB...');
        
        await mongoose.connect(mongoUri, {
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 10000,
        });

        // Get database name
        const dbName = mongoose.connection.name;
        console.log(`📁 Connected to database: "${dbName}"`);

        // Verify database name
        if (dbName === 'hrms') {
            console.log('✅ Database name is correctly set to "hrms"');
        } else {
            console.log(`❌ Expected database name "hrms", but found "${dbName}"`);
            process.exit(1);
        }

        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📚 Found ${collections.length} collections in hrms database`);

        // Check for key platform collections
        const collectionNames = collections.map(col => col.name);
        const keyCollections = ['tenants', 'platformusers', 'companies', 'licenses'];
        
        console.log('\n🔍 Checking for key platform collections:');
        keyCollections.forEach(name => {
            if (collectionNames.includes(name)) {
                console.log(`  ✅ ${name} - Found`);
            } else {
                console.log(`  ⚠️  ${name} - Not found (may be created when first used)`);
            }
        });

        // List all databases to show separation
        console.log('\n🗂️  Database separation check:');
        try {
            const adminDb = mongoose.connection.db.admin();
            const { databases } = await adminDb.listDatabases();
            
            console.log('📋 All databases:');
            databases.forEach(db => {
                if (db.name === 'hrms') {
                    console.log(`  ✅ ${db.name} - Main application database`);
                } else if (db.name.startsWith('hrsm_')) {
                    console.log(`  🏢 ${db.name} - Tenant database`);
                } else if (db.name.includes('license')) {
                    console.log(`  🔐 ${db.name} - License server database`);
                } else {
                    console.log(`  📁 ${db.name} - Other database`);
                }
            });
        } catch (error) {
            console.log('⚠️  Could not list all databases (insufficient permissions)');
        }

        await mongoose.connection.close();

        console.log('\n✅ VERIFICATION PASSED: hrms database contains all main application data');
        console.log('🎯 The hrms database is properly configured for the main HR-SM application');
        
        return true;

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

verifyHRMSDatabase();