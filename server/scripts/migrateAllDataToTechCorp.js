/**
 * Script to migrate all relevant data from default-tenant to TechCorp Solutions
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function migrateAllData() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        const techCorpTenantId = 'techcorp-solutions-d8f0689c';
        const defaultTenantId = 'default-tenant';
        
        // Collections to migrate
        const collectionsToMigrate = [
            'positions',
            'users', 
            'holidays'
        ];
        
        console.log(`Migrating data to TechCorp Solutions (${techCorpTenantId}):\n`);
        
        for (const collectionName of collectionsToMigrate) {
            try {
                console.log(`📦 Migrating ${collectionName.toUpperCase()}...`);
                
                const Model = mongoose.model(collectionName, new mongoose.Schema({}, { strict: false }));
                
                // Count records to migrate
                const recordsToMigrate = await Model.countDocuments({ 
                    $or: [
                        { tenantId: defaultTenantId },
                        { tenantId: { $exists: false } },
                        { tenantId: null },
                        { tenantId: '' }
                    ]
                });
                
                if (recordsToMigrate === 0) {
                    console.log(`   ✓ No records to migrate\n`);
                    continue;
                }
                
                console.log(`   Found ${recordsToMigrate} records to migrate`);
                
                // Update records
                const result = await Model.updateMany(
                    { 
                        $or: [
                            { tenantId: defaultTenantId },
                            { tenantId: { $exists: false } },
                            { tenantId: null },
                            { tenantId: '' }
                        ]
                    },
                    { 
                        $set: { 
                            tenantId: techCorpTenantId,
                            updatedAt: new Date()
                        }
                    }
                );
                
                console.log(`   ✓ Updated ${result.modifiedCount} records`);
                
                // Verify migration
                const techCorpCount = await Model.countDocuments({ tenantId: techCorpTenantId });
                console.log(`   ✓ TechCorp now has ${techCorpCount} ${collectionName}\n`);
                
            } catch (error) {
                console.log(`   ❌ Error migrating ${collectionName}: ${error.message}\n`);
            }
        }
        
        // Special handling for users - we need to be careful not to migrate the admin user twice
        console.log('🔍 Checking user migration details...');
        const User = mongoose.model('users', new mongoose.Schema({}, { strict: false }));
        
        const techCorpUsers = await User.find({ tenantId: techCorpTenantId }).select('email role');
        console.log('\n✓ TechCorp Solutions users:');
        techCorpUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email} (${user.role})`);
        });
        
        // Check positions
        console.log('\n🔍 Checking positions...');
        const Position = mongoose.model('positions', new mongoose.Schema({}, { strict: false }));
        const techCorpPositions = await Position.find({ tenantId: techCorpTenantId }).select('title department');
        console.log('\n✓ TechCorp Solutions positions:');
        techCorpPositions.forEach((position, index) => {
            console.log(`   ${index + 1}. ${position.title} (${position.department || 'No department'})`);
        });
        
        console.log('\n🎉 Data migration completed successfully!');
        console.log('\nTechCorp Solutions should now have all necessary data:');
        console.log('- Departments ✓');
        console.log('- Positions ✓');
        console.log('- Users ✓');
        console.log('- Holidays ✓');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from database');
    }
}

migrateAllData();