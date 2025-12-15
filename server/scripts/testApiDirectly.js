#!/usr/bin/env node

/**
 * Script to test API endpoints directly without authentication
 * This will help us see what the actual API responses look like
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function testAPIDirectly() {
    console.log('🧪 Testing API endpoints directly...\n');

    const endpoints = [
        { path: '/announcements', description: 'Get announcements' },
        { path: '/notifications', description: 'Get notifications' },
        { path: '/document-templates', description: 'Get document templates' }
    ];

    for (const endpoint of endpoints) {
        console.log(`🔍 Testing ${endpoint.path}`);
        console.log(`   ${endpoint.description}`);
        console.log('─'.repeat(50));

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint.path}`);
            const data = await response.text();
            
            console.log(`   Status: ${response.status} ${response.statusText}`);
            
            if (response.status === 401) {
                console.log('   ✅ Route found, requires authentication (expected)');
            } else if (response.status === 403) {
                console.log('   ⚠️  Route found, but license validation failed');
                try {
                    const errorData = JSON.parse(data);
                    console.log(`   Error: ${errorData.message || errorData.error}`);
                } catch {
                    console.log(`   Raw response: ${data.substring(0, 200)}`);
                }
            } else if (response.status === 404) {
                console.log('   ❌ Route not found');
            } else if (response.status === 400) {
                console.log('   ⚠️  Bad request (likely license validation issue)');
                try {
                    const errorData = JSON.parse(data);
                    console.log(`   Error: ${errorData.message || errorData.error}`);
                } catch {
                    console.log(`   Raw response: ${data.substring(0, 200)}`);
                }
            } else {
                console.log(`   ⚠️  Unexpected status: ${response.status}`);
                console.log(`   Response: ${data.substring(0, 200)}`);
            }

        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
        }
        
        console.log('');
    }

    console.log('📋 SUMMARY');
    console.log('═'.repeat(50));
    console.log('Expected results after our fixes:');
    console.log('  ✅ 401 Unauthorized = Route working, needs auth');
    console.log('  ❌ 404 Not Found = Route registration failed');
    console.log('  ⚠️  403 Forbidden = License validation failed');
    console.log('  ⚠️  400 Bad Request = Middleware ordering issue');
    console.log('');
    console.log('Next steps:');
    console.log('  1. If getting 401s: APIs are working, test frontend auth');
    console.log('  2. If getting 403s: Check license validation');
    console.log('  3. If getting 404s: Restart server to load routes');
}

// Run the test
testAPIDirectly().catch(console.error);