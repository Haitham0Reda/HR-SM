/**
 * Enable Tasks Module via API
 * Uses the tenant API to enable tasks module and clear cache
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function enableTasksViaAPI() {
    console.log('🔧 Enabling Tasks Module via API...\n');

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

        // Step 2: Check current tenant config
        console.log('\n2. Checking current tenant configuration...');
        const configResponse = await fetch(`${API_BASE}/tenant/config`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (configResponse.ok) {
            const config = await configResponse.json();
            console.log('✅ Current tenant config retrieved');
            console.log(`   Company: ${config.data?.companyName || 'Unknown'}`);
        } else {
            console.log('⚠️  Could not retrieve tenant config');
        }

        // Step 3: Enable tasks module via API
        console.log('\n3. Enabling tasks module via API...');
        const enableResponse = await fetch(`${API_BASE}/tenant/modules/tasks/enable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Status: ${enableResponse.status}`);
        
        if (enableResponse.ok) {
            const result = await enableResponse.json();
            console.log('✅ Tasks module enabled successfully via API');
            console.log(`   Message: ${result.message}`);
        } else {
            const error = await enableResponse.json();
            console.log('❌ Failed to enable tasks module via API');
            console.log(`   Error: ${error.message}`);
        }

        // Step 4: Verify tasks module is now working
        console.log('\n4. Testing tasks API after enabling...');
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

        // Step 5: Check enabled modules
        console.log('\n5. Checking enabled modules...');
        const modulesResponse = await fetch(`${API_BASE}/tenant/modules`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (modulesResponse.ok) {
            const modules = await modulesResponse.json();
            console.log('✅ Enabled modules:');
            modules.data?.forEach(module => {
                console.log(`   - ${module.name}: enabled`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

enableTasksViaAPI().catch(console.error);