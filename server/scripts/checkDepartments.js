/**
 * Script to check department data for TechCorp Solutions
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
async function checkDepartments() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        // Check if Department model exists
        const collections = await mongoose.connection.db.listCollections().toArray();
        const departmentCollection = collections.find(col => 
            col.name === 'departments' || col.name === 'Department'
        );
        
        console.log('Available collections:');
        collections.forEach(col => {
            console.log(`- ${col.name}`);
        });
        
        if (!departmentCollection) {
            console.log('\n❌ No departments collection found');
            return;
        }
        
        console.log(`\n✓ Found departments collection: ${departmentCollection.name}`);
        
        // Get all departments
        const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }));
        const departments = await Department.find({});
        
        console.log(`\nTotal departments in database: ${departments.length}`);
        
        if (departments.length === 0) {
            console.log('❌ No departments found in database');
        } else {
            console.log('\nDepartments:');
            departments.forEach((dept, index) => {
                console.log(`${index + 1}. ${dept.name || 'Unnamed'}`);
                console.log(`   - ID: ${dept._id}`);
                console.log(`   - Tenant ID: ${dept.tenantId || 'Not set'}`);
                console.log(`   - Status: ${dept.status || 'Not set'}`);
                console.log(`   - Created: ${dept.createdAt || 'Not set'}`);
                console.log('');
            });
        }
        
        // Check specifically for TechCorp departments
        const techCorpTenantId = 'techcorp-solutions-d8f0689c';
        const techCorpDepartments = await Department.find({ tenantId: techCorpTenantId });
        
        console.log(`\nTechCorp Solutions departments (${techCorpTenantId}): ${techCorpDepartments.length}`);
        
        if (techCorpDepartments.length === 0) {
            console.log('❌ No departments found for TechCorp Solutions');
            console.log('This explains why department data is not showing');
        } else {
            console.log('✓ TechCorp departments:');
            techCorpDepartments.forEach((dept, index) => {
                console.log(`${index + 1}. ${dept.name}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from database');
    }
}

checkDepartments();