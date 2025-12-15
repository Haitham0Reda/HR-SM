#!/usr/bin/env node

/**
 * Script to test the announcements API endpoint
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function testAnnouncementsAPI() {
    console.log('🧪 Testing announcements API...\n');

    const endpoints = [
        { method: 'GET', path: '/announcements', description: 'Get all announcements' },
        { method: 'GET', path: '/announcements/active', description: 'Get active announcements' },
        { method: 'POST', path: '/announcements', description: 'Create announcement' }
    ];

    for (const endpoint of endpoints) {
        console.log(`\n📋 Testing ${endpoint.method} ${endpoint.path}`);
        console.log(`   Description: ${endpoint.description}`);
        console.log('─'.repeat(50));

        try {
            const options = {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            // Add test data for POST requests
            if (endpoint.method === 'POST') {
                options.body = JSON.stringify({
                    title: 'Test Announcement',
                    content: 'This is a test announcement',
                    type: 'general'
                });
            }

            const response = await fetch(`${API_BASE_URL}${endpoint.path}`, options);
            
            console.log(`   Status: ${response.status} ${response.statusText}`);
            
            if (response.status === 404) {
                console.log('   ❌ Route not found - check module registry');
            } else if (response.status === 401) {
                console.log('   ✅ Route found, requires authentication (expected)');
            } else if (response.status === 400) {
                const errorBody = await response.text();
                console.log('   ⚠️  Bad request - check request format');
                console.log(`   Error: ${errorBody}`);
            } else {
                console.log(`   ✅ Route accessible (status: ${response.status})`);
            }

        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
        }
    }

    console.log('\n📋 Summary:');
    console.log('   - 404 errors indicate route registration issues');
    console.log('   - 401 errors are expected (authentication required)');
    console.log('   - 400 errors may indicate license validation or request format issues');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the server to load new module routes');
    console.log('   2. Check server logs for module loading messages');
    console.log('   3. Verify license validation is working correctly');
}

// Run the test
testAnnouncementsAPI().catch(console.error);