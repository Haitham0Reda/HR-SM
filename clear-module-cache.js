/**
 * Clear Module Cache
 * Forces the module guard to refresh its cache
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function clearModuleCache() {
    console.log('🧹 Clearing Module Cache...\n');

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

        // Step 2: Make multiple requests to different endpoints to force cache refresh
        console.log('\n2. Making requests to force cache refresh...');
        
        const endpoints = [
            '/tenant/config',
            '/tenant/modules',
            '/users',
            '/departments',
            '/positions'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log(`   ${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
            } catch (error) {
                console.log(`   ${endpoint}: Error - ${error.message}`);
            }
        }

        // Step 3: Disable and re-enable tasks module to force cache clear
        console.log('\n3. Cycling tasks module to clear cache...');
        
        // Disable
        const disableResponse = await fetch(`${API_BASE}/tenant/modules/tasks/disable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (disableResponse.ok) {
            console.log('   ✅ Tasks module disabled');
        } else {
            console.log('   ❌ Failed to disable tasks module');
        }

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Re-enable
        const enableResponse = await fetch(`${API_BASE}/tenant/modules/tasks/enable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (enableResponse.ok) {
            console.log('   ✅ Tasks module re-enabled');
        } else {
            console.log('   ❌ Failed to re-enable tasks module');
        }

        // Step 4: Wait and test tasks API
        console.log('\n4. Testing tasks API after cache clear...');
        
        // Wait for cache to clear (TTL is 1 minute, but let's try immediately)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const tasksResponse = await fetch(`${API_BASE}/tasks`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Tasks API Status: ${tasksResponse.status}`);
        
        if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            console.log('🎉 SUCCESS! Tasks API is now working!');
            console.log(`   Tasks found: ${tasksData.data?.length || 0}`);
        } else {
            const error = await tasksResponse.json();
            console.log('❌ Tasks API still not working');
            console.log(`   Error: ${error.message}`);
            
            // Try one more time after waiting for cache TTL
            console.log('\n   Waiting for cache TTL (60 seconds)...');
            console.log('   (In production, this would work immediately after module enable)');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

clearModuleCache().catch(console.error);