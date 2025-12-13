/**
 * Script to migrate departments from default-tenant to TechCorp Solutions
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function migrateDepartments() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }));
        
        const techCorpTenantId = 'techcorp-solutions-d8f0689c';
        const defaultTenantId = 'default-tenant';
        
        // Get all departments with default-tenant
        const defaultDepartments = await Department.find({ tenantId: defaultTenantId });
        
        console.log(`Found ${defaultDepartments.length} departments with default-tenant`);
        
        if (defaultDepartments.length === 0) {
            console.log('No departments to migrate');
            return;
        }
        
        console.log('\nMigrating departments to TechCorp Solutions...');
        
        // Update all departments to use TechCorp tenant ID
        const result = await Department.updateMany(
            { tenantId: defaultTenantId },
            { 
                $set: { 
                    tenantId: techCorpTenantId,
                    updatedAt: new Date()
                }
            }
        );
        
        console.log(`✓ Updated ${result.modifiedCount} departments`);
        
        // Verify the migration
        const techCorpDepartments = await Department.find({ tenantId: techCorpTenantId });
        
        console.log(`\n✓ TechCorp Solutions now has ${techCorpDepartments.length} departments:`);
        techCorpDepartments.forEach((dept, index) => {
            console.log(`${index + 1}. ${dept.name}`);
        });
        
        console.log('\n🎉 Department migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from database');
    }
}

migrateDepartments();