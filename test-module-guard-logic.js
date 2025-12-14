/**
 * Test Module Guard Logic
 * Simulates the module guard logic to see what's happening
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://devhaithammoreda_db_user:cvF50PEZvfPVmKU3@cluster.uwhj601.mongodb.net/hrsm_db?retryWrites=true&w=majority';
const TENANT_ID = '693db0e2ccc5ea08aeee120c';

async function testModuleGuardLogic() {
    console.log('🧪 Testing Module Guard Logic...\n');

    let client;
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();

        // Simulate the module guard logic
        console.log('\n1. Simulating module guard logic...');
        
        const config = await db.collection('tenantconfigs').findOne({ tenantId: TENANT_ID });
        
        if (!config) {
            console.log('❌ TenantConfig not found');
            return;
        }

        console.log('✅ TenantConfig found');
        console.log(`   Company: ${config.companyName}`);

        // Check the exact logic used by requireModule
        const moduleName = 'tasks';
        console.log(`\n2. Checking module '${moduleName}'...`);
        
        console.log(`   config.modules exists: ${!!config.modules}`);
        console.log(`   config.modules type: ${typeof config.modules}`);
        
        if (config.modules) {
            console.log(`   config.modules[${moduleName}] exists: ${!!config.modules[moduleName]}`);
            
            if (config.modules[moduleName]) {
                const moduleConfig = config.modules[moduleName];
                console.log(`   Module config:`, JSON.stringify(moduleConfig, null, 2));
                console.log(`   moduleConfig.enabled: ${moduleConfig.enabled}`);
                console.log(`   Type of enabled: ${typeof moduleConfig.enabled}`);
                
                // Test the exact condition used in requireModule
                const moduleEnabled = config.modules?.[moduleName]?.enabled;
                console.log(`   Final result (config.modules?.[moduleName]?.enabled): ${moduleEnabled}`);
                
                if (moduleEnabled) {
                    console.log('✅ Module should be ENABLED according to logic');
                } else {
                    console.log('❌ Module should be DISABLED according to logic');
                }
            } else {
                console.log('❌ Module config not found');
            }
        } else {
            console.log('❌ No modules configuration found');
        }

        // Test alternative access patterns
        console.log('\n3. Testing alternative access patterns...');
        
        // Direct property access
        if (config.modules && config.modules.tasks) {
            console.log(`   Direct access (config.modules.tasks.enabled): ${config.modules.tasks.enabled}`);
        }
        
        // Object.keys approach
        if (config.modules) {
            const moduleKeys = Object.keys(config.modules);
            console.log(`   Available modules: ${moduleKeys.join(', ')}`);
            
            moduleKeys.forEach(key => {
                const mod = config.modules[key];
                console.log(`   ${key}: enabled=${mod.enabled}, type=${typeof mod.enabled}`);
            });
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

testModuleGuardLogic().catch(console.error);