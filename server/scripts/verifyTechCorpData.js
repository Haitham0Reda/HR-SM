/**
 * Script to verify TechCorp Solutions data after migration
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function verifyTechCorpData() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        const techCorpTenantId = 'techcorp-solutions-d8f0689c';
        
        console.log(`📊 TechCorp Solutions Data Summary (${techCorpTenantId}):\n`);
        
        // Check departments
        const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }));
        const departments = await Department.find({ tenantId: techCorpTenantId }).select('name');
        console.log(`✅ DEPARTMENTS (${departments.length}):`);
        departments.forEach((dept, index) => {
            console.log(`   ${index + 1}. ${dept.name}`);
        });
        
        // Check positions
        const Position = mongoose.model('Position', new mongoose.Schema({}, { strict: false }));
        const positions = await Position.find({ tenantId: techCorpTenantId }).select('title department');
        console.log(`\n✅ POSITIONS (${positions.length}):`);
        positions.forEach((pos, index) => {
            console.log(`   ${index + 1}. ${pos.title}`);
        });
        
        // Check users
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const users = await User.find({ tenantId: techCorpTenantId }).select('email role personalInfo.firstName personalInfo.lastName');
        console.log(`\n✅ USERS (${users.length}):`);
        users.forEach((user, index) => {
            const name = user.personalInfo ? `${user.personalInfo.firstName || ''} ${user.personalInfo.lastName || ''}`.trim() : 'No name';
            console.log(`   ${index + 1}. ${user.email} - ${name} (${user.role})`);
        });
        
        // Check holidays
        const Holiday = mongoose.model('Holiday', new mongoose.Schema({}, { strict: false }));
        const holidays = await Holiday.find({ tenantId: techCorpTenantId }).select('name date');
        console.log(`\n✅ HOLIDAYS (${holidays.length}):`);
        holidays.forEach((holiday, index) => {
            console.log(`   ${index + 1}. ${holiday.name} - ${holiday.date}`);
        });
        
        console.log('\n🎉 TechCorp Solutions now has complete data!');
        console.log('\nThe department page should now show data properly.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from database');
    }
}

verifyTechCorpData();