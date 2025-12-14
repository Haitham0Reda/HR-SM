/**
 * Sync Tenant Modules
 * Forces synchronization between Tenant and TenantConfig models
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function syncTenantModules() {
    console.log('🔄 Syncing Tenant Modules...\n');

    try {
        // Step 1: Login as admin
        console.log('1. Logging in as admin...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123',
                tenantId: '693db0e2ccc5ea08aeee120c'
            })
        });

        if (!loginResponse.ok) {
            console.log('❌ Login failed');
            return;
        }

        const loginData = await loginResponse.json();
        const token = loginData.token || loginData.data?.token;
        console.log('✅ Login successful');

        // Step 2: Call tenant config endpoint multiple times to force sync
        console.log('\n2. Forcing tenant config sync...');
        
        for (let i = 0; i < 3; i++) {
            console.log(`   Sync attempt ${i + 1}...`);
            
            const configResponse = await fetch(`${API_BASE}/tenant/config`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (configResponse.ok) {
                const config = await configResponse.json();
                console.log(`   ✅ Config sync ${i + 1} successful`);
                
                // Check if tasks module is in the config
                const modules = config.data?.modules || new Map();
                const tasksModule = modules.get ? modules.get('tasks') : modules['tasks'];
                console.log(`   Tasks module in config: ${tasksModule ? 'enabled' : 'not found'}`);
            } else {
                console.log(`   ❌ Config sync ${i + 1} failed`);
            }

            // Wait a bit between attempts
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Step 3: Test tasks API after sync
        console.log('\n3. Testing tasks API after sync...');
        const tasksResponse = await fetch(`${API_BASE}/tasks`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Tasks API Status: ${tasksResponse.status}`);
        
        if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            console.log('🎉 Tasks API is now working!');
            console.log(`   Tasks found: ${tasksData.data?.length || 0}`);
        } else {
            const error = await tasksResponse.json();
            console.log('❌ Tasks API still not working');
            console.log(`   Error: ${error.message}`);
        }

        // Step 4: Try enabling tasks module again via API
        console.log('\n4. Re-enabling tasks module via API...');
        const enableResponse = await fetch(`${API_BASE}/tenant/modules/tasks/enable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (enableResponse.ok) {
            const result = await enableResponse.json();
            console.log('✅ Tasks module re-enabled successfully');
            console.log(`   Message: ${result.message}`);
        } else {
            const error = await enableResponse.json();
            console.log('❌ Failed to re-enable tasks module');
            console.log(`   Error: ${error.message}`);
        }

        // Step 5: Final test
        console.log('\n5. Final tasks API test...');
        const finalTasksResponse = await fetch(`${API_BASE}/tasks`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Final Tasks API Status: ${finalTasksResponse.status}`);
        
        if (finalTasksResponse.ok) {
            console.log('🎉 SUCCESS! Tasks API is now working!');
        } else {
            const error = await finalTasksResponse.json();
            console.log('❌ Tasks API still not working after all attempts');
            console.log(`   Final Error: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

syncTenantModules().catch(console.error);