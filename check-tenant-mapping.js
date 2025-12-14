/**
 * Check Tenant ID Mapping
 * Find the correct tenant ID for TechCorp Solutions
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Check different collections for tenant information
async function checkTenantMapping() {
    console.log('🔍 Checking tenant ID mapping...\n');

    try {
        await connectDB();

        // Check tenants collection
        console.log('1. Checking tenants collection...');
        try {
            const tenantsCollection = mongoose.connection.db.collection('tenants');
            const tenants = await tenantsCollection.find({}).toArray();
            
            console.log(`   Found ${tenants.length} tenants:`);
            tenants.forEach((tenant, index) => {
                console.log(`   ${index + 1}. ID: ${tenant._id}`);
                console.log(`      Name: ${tenant.name}`);
                console.log(`      Slug: ${tenant.slug}`);
                console.log(`      Domain: ${tenant.domain}`);
                console.log('      ---');
            });
        } catch (error) {
            console.log('   ❌ Tenants collection not found or error:', error.message);
        }

        // Check companies collection
        console.log('\n2. Checking companies collection...');
        try {
            const companiesCollection = mongoose.connection.db.collection('companies');
            const companies = await companiesCollection.find({}).toArray();
            
            console.log(`   Found ${companies.length} companies:`);
            companies.forEach((company, index) => {
                console.log(`   ${index + 1}. ID: ${company._id}`);
                console.log(`      Name: ${company.name}`);
                console.log(`      Slug: ${company.slug}`);
                console.log(`      Tenant ID: ${company.tenantId}`);
                console.log('      ---');
            });
        } catch (error) {
            console.log('   ❌ Companies collection not found or error:', error.message);
        }

        // Check users with TechCorp in email
        console.log('\n3. Checking TechCorp users and their tenant IDs...');
        const usersCollection = mongoose.connection.db.collection('users');
        const techCorpUsers = await usersCollection.find({ 
            email: { $regex: /techcorp/i } 
        }).toArray();
        
        console.log(`   Found ${techCorpUsers.length} TechCorp users:`);
        techCorpUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. Email: ${user.email}`);
            console.log(`      Role: ${user.role}`);
            console.log(`      Tenant ID: ${user.tenantId}`);
            console.log('      ---');
        });

        // Try to find what tenant ID 693db0e2ccc5ea08aeee120c corresponds to
        console.log('\n4. Looking up tenant ID 693db0e2ccc5ea08aeee120c...');
        const tenantId = '693db0e2ccc5ea08aeee120c';
        
        // Check in tenants collection
        try {
            const tenantsCollection = mongoose.connection.db.collection('tenants');
            const tenant = await tenantsCollection.findOne({ _id: new mongoose.Types.ObjectId(tenantId) });
            if (tenant) {
                console.log('   ✅ Found in tenants collection:');
                console.log(`      Name: ${tenant.name}`);
                console.log(`      Slug: ${tenant.slug}`);
                console.log(`      Domain: ${tenant.domain}`);
            } else {
                console.log('   ❌ Not found in tenants collection');
            }
        } catch (error) {
            console.log('   ❌ Error checking tenants collection:', error.message);
        }

        // Check in companies collection
        try {
            const companiesCollection = mongoose.connection.db.collection('companies');
            const company = await companiesCollection.findOne({ _id: new mongoose.Types.ObjectId(tenantId) });
            if (company) {
                console.log('   ✅ Found in companies collection:');
                console.log(`      Name: ${company.name}`);
                console.log(`      Slug: ${company.slug}`);
            } else {
                console.log('   ❌ Not found in companies collection');
            }
        } catch (error) {
            console.log('   ❌ Error checking companies collection:', error.message);
        }

        console.log('\n💡 Recommendations:');
        console.log('   Use tenant ID: 693db0e2ccc5ea08aeee120c for TechCorp users');
        console.log('   Admin credentials: admin@techcorp.com');
        console.log('   HR credentials: hr@techcorp.com');

    } catch (error) {
        console.error('❌ Error checking tenant mapping:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

checkTenantMapping().catch(console.error);