/**
 * Debug Tenant Config
 * Checks how modules are stored in TenantConfig vs Tenant models
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://devhaithammoreda_db_user:cvF50PEZvfPVmKU3@cluster.uwhj601.mongodb.net/hrsm_db?retryWrites=true&w=majority';
const TENANT_ID = '693db0e2ccc5ea08aeee120c';

async function debugTenantConfig() {
    console.log('🔍 Debugging Tenant Config vs Tenant Models...\n');

    let client;
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();

        // Check Tenant model (platform)
        console.log('\n1. Checking Tenant model (platform)...');
        const tenant = await db.collection('tenants').findOne({ tenantId: TENANT_ID });
        
        if (tenant) {
            console.log(`   Tenant name: ${tenant.name}`);
            console.log(`   Enabled modules:`, JSON.stringify(tenant.enabledModules, null, 2));
        } else {
            console.log('   ❌ Tenant not found');
        }

        // Check TenantConfig model (hr-core)
        console.log('\n2. Checking TenantConfig model (hr-core)...');
        const tenantConfig = await db.collection('tenantconfigs').findOne({ tenantId: TENANT_ID });
        
        if (tenantConfig) {
            console.log(`   Company name: ${tenantConfig.companyName}`);
            console.log(`   Modules structure:`, JSON.stringify(tenantConfig.modules, null, 2));
            
            // Check if tasks module exists in the modules map
            if (tenantConfig.modules && tenantConfig.modules.tasks) {
                console.log(`   Tasks module found: ${JSON.stringify(tenantConfig.modules.tasks)}`);
            } else {
                console.log('   ❌ Tasks module not found in TenantConfig.modules');
            }
        } else {
            console.log('   ❌ TenantConfig not found');
        }

        // Check all collections that might contain module info
        console.log('\n3. Checking all collections for module-related data...');
        const collections = await db.listCollections().toArray();
        
        for (const collection of collections) {
            if (collection.name.toLowerCase().includes('tenant') || 
                collection.name.toLowerCase().includes('module') ||
                collection.name.toLowerCase().includes('config')) {
                
                console.log(`\n   Collection: ${collection.name}`);
                const docs = await db.collection(collection.name).find({ tenantId: TENANT_ID }).toArray();
                
                if (docs.length > 0) {
                    docs.forEach((doc, index) => {
                        console.log(`     Document ${index + 1}:`, JSON.stringify(doc, null, 4));
                    });
                } else {
                    console.log(`     No documents found for tenant ${TENANT_ID}`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('\n✅ MongoDB connection closed');
        }
    }
}

debugTenantConfig().catch(console.error);