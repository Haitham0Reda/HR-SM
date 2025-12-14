/**
 * Wait and Test Tasks
 * Waits for cache TTL to expire and tests tasks API
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function waitAndTestTasks() {
    console.log('⏰ Waiting for Module Cache to Expire and Testing Tasks...\n');

    try {
        // Step 1: Login
        console.log('1. Logging in...');
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

        // Step 2: Test tasks API immediately (should still be cached as disabled)
        console.log('\n2. Testing tasks API (should be cached as disabled)...');
        let tasksResponse = await fetch(`${API_BASE}/tasks`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`   Status: ${tasksResponse.status}`);
        if (!tasksResponse.ok) {
            const error = await tasksResponse.json();
            console.log(`   Error: ${error.message}`);
        }

        // Step 3: Wait for cache TTL (60 seconds) and test periodically
        console.log('\n3. Waiting for cache to expire (60 seconds)...');
        
        const startTime = Date.now();
        const maxWaitTime = 70000; // 70 seconds to be safe
        const testInterval = 10000; // Test every 10 seconds

        while (Date.now() - startTime < maxWaitTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            console.log(`   Elapsed: ${elapsed}s / 60s`);

            if (elapsed >= 60) {
                console.log('\n   Cache should have expired, testing now...');
                
                tasksResponse = await fetch(`${API_BASE}/tasks`, {
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
                    console.log(`   Response structure:`, Object.keys(tasksData));
                    return;
                } else {
                    const error = await tasksResponse.json();
                    console.log(`   Still not working: ${error.message}`);
                }
            }

            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, testInterval));
        }

        console.log('\n❌ Tasks API still not working after cache expiry');
        console.log('   This suggests there might be another caching layer or server restart needed');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

waitAndTestTasks().catch(console.error);