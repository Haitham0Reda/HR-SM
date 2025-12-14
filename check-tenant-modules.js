/**
 * Check Tenant Modules Configuration
 * Checks how modules are stored and configured for the tenant
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://devhaithammoreda_db_user:cvF50PEZvfPVmKU3@cluster.uwhj601.mongodb.net/hrsm_db?retryWrites=true&w=majority';
const TENANT_ID = '693db0e2ccc5ea08aeee120c'; // TechCorp tenant ID

async function checkTenantModules() {
    console.log('🔍 Checking Tenant Modules Configuration...\n');

    let client;
    try {
        // Connect to MongoDB
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();

        // Check tenant configuration
        console.log('\n1. Checking tenant configuration...');
        const tenant = await db.collection('tenants').findOne({ tenantId: TENANT_ID });
        
        if (!tenant) {
            console.log('❌ Tenant not found');
            return;
        }

        console.log(`   Tenant: ${tenant.name}`);
        console.log(`   Tenant ID: ${tenant.tenantId}`);
        console.log(`   Enabled modules:`, JSON.stringify(tenant.enabledModules, null, 2));

        // Check if there are other collections that might store module info
        console.log('\n2. Checking other possible module collections...');
        
        // Check for company modules
        const companyModules = await db.collection('companymodules').find({ tenantId: TENANT_ID }).toArray();
        if (companyModules.length > 0) {
            console.log('   Company modules found:');
            companyModules.forEach(mod => {
                console.log(`     - ${mod.moduleId}: ${mod.enabled ? 'enabled' : 'disabled'}`);
            });
        } else {
            console.log('   No company modules found');
        }

        // Check for module licenses
        const licenses = await db.collection('licenses').find({ tenantId: TENANT_ID }).toArray();
        if (licenses.length > 0) {
            console.log('   Licenses found:');
            licenses.forEach(license => {
                console.log(`     - ${license.moduleId}: ${license.status} (expires: ${license.expiresAt})`);
            });
        } else {
            console.log('   No licenses found');
        }

        // Check collections list
        console.log('\n3. Available collections:');
        const collections = await db.listCollections().toArray();
        const moduleRelated = collections.filter(col => 
            col.name.toLowerCase().includes('module') || 
            col.name.toLowerCase().includes('license') ||
            col.name.toLowerCase().includes('tenant')
        );
        moduleRelated.forEach(col => {
            console.log(`   - ${col.name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ MongoDB connection closed');
        }
    }
}

checkTenantModules().catch(console.error);