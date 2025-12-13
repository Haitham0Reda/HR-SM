/**
 * Script to check all tenant-specific data for TechCorp Solutions
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkAllTenantData() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        const techCorpTenantId = 'techcorp-solutions-d8f0689c';
        const defaultTenantId = 'default-tenant';
        
        // Collections to check
        const collectionsToCheck = [
            'departments',
            'positions', 
            'users',
            'roles',
            'holidays',
            'announcements',
            'events',
            'surveys'
        ];
        
        console.log(`Checking data for TechCorp Solutions (${techCorpTenantId}):\n`);
        
        for (const collectionName of collectionsToCheck) {
            try {
                const Model = mongoose.model(collectionName, new mongoose.Schema({}, { strict: false }));
                
                const techCorpCount = await Model.countDocuments({ tenantId: techCorpTenantId });
                const defaultCount = await Model.countDocuments({ tenantId: defaultTenantId });
                const noTenantCount = await Model.countDocuments({ 
                    $or: [
                        { tenantId: { $exists: false } },
                        { tenantId: null },
                        { tenantId: '' }
                    ]
                });
                
                console.log(`📊 ${collectionName.toUpperCase()}:`);
                console.log(`   - TechCorp: ${techCorpCount}`);
                console.log(`   - Default tenant: ${defaultCount}`);
                console.log(`   - No tenant: ${noTenantCount}`);
                
                if (defaultCount > 0 || noTenantCount > 0) {
                    console.log(`   ⚠️  Needs migration: ${defaultCount + noTenantCount} records`);
                }
                console.log('');
                
            } catch (error) {
                console.log(`❌ Error checking ${collectionName}: ${error.message}\n`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('✓ Disconnected from database');
    }
}

checkAllTenantData();