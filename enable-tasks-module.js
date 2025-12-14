/**
 * Enable Tasks Module for TechCorp
 * Enables the tasks module for the TechCorp tenant
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://devhaithammoreda_db_user:cvF50PEZvfPVmKU3@cluster.uwhj601.mongodb.net/hrsm_db?retryWrites=true&w=majority';
const TENANT_ID = '693db0e2ccc5ea08aeee120c'; // TechCorp tenant ID

async function enableTasksModule() {
    console.log('🔧 Enabling Tasks Module for TechCorp...\n');

    let client;
    try {
        // Connect to MongoDB
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();

        // Check current tenant configuration
        console.log('\n1. Checking current tenant configuration...');
        const tenant = await db.collection('tenants').findOne({ tenantId: TENANT_ID });
        
        if (!tenant) {
            console.log('❌ Tenant not found');
            return;
        }

        console.log(`   Tenant: ${tenant.name}`);
        console.log(`   Current modules: ${JSON.stringify(tenant.enabledModules || [])}`);

        // Enable tasks module
        console.log('\n2. Enabling tasks module...');
        const enabledModules = tenant.enabledModules || [];
        
        // Check if tasks module already exists (either as string or object)
        const hasTasksModule = enabledModules.some(mod => 
            (typeof mod === 'string' && mod === 'tasks') ||
            (typeof mod === 'object' && mod.moduleId === 'tasks')
        );
        
        if (!hasTasksModule) {
            // Add tasks module in the correct format (as object like hr-core)
            const tasksModule = {
                moduleId: 'tasks',
                enabledAt: new Date(),
                enabledBy: 'admin'
            };
            
            enabledModules.push(tasksModule);
            
            const result = await db.collection('tenants').updateOne(
                { tenantId: TENANT_ID },
                { 
                    $set: { 
                        enabledModules: enabledModules,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.modifiedCount > 0) {
                console.log('✅ Tasks module enabled successfully');
            } else {
                console.log('❌ Failed to enable tasks module');
            }
        } else {
            console.log('✅ Tasks module already enabled - updating format...');
            
            // Remove the string version and add the object version
            const filteredModules = enabledModules.filter(mod => 
                !(typeof mod === 'string' && mod === 'tasks')
            );
            
            // Add tasks module in the correct format if not already there as object
            const hasTasksObject = filteredModules.some(mod => 
                typeof mod === 'object' && mod.moduleId === 'tasks'
            );
            
            if (!hasTasksObject) {
                const tasksModule = {
                    moduleId: 'tasks',
                    enabledAt: new Date(),
                    enabledBy: 'admin'
                };
                filteredModules.push(tasksModule);
            }
            
            const result = await db.collection('tenants').updateOne(
                { tenantId: TENANT_ID },
                { 
                    $set: { 
                        enabledModules: filteredModules,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.modifiedCount > 0) {
                console.log('✅ Tasks module format updated successfully');
            } else {
                console.log('❌ Failed to update tasks module format');
            }
        }

        // Verify the update
        console.log('\n3. Verifying configuration...');
        const updatedTenant = await db.collection('tenants').findOne({ tenantId: TENANT_ID });
        console.log(`   Updated modules: ${JSON.stringify(updatedTenant.enabledModules || [])}`);

        console.log('\n🎉 Tasks module configuration complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('✅ MongoDB connection closed');
        }
    }
}

enableTasksModule().catch(console.error);