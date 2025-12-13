#!/usr/bin/env node

/**
 * Test script to verify User Activity API endpoints
 * Run this to check if the backend APIs are working
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const TEST_TENANT_ID = 'techcorp-solutions-d8f0689c';

console.log('🧪 Testing User Activity API Endpoints...\n');

/**
 * Test API endpoints
 */
async function testAPIEndpoints() {
    console.log('Testing API endpoints...');
    
    const endpoints = [
        {
            name: 'Real-time Sessions',
            url: `/api/company-logs/${TEST_TENANT_ID}/real-time-sessions`,
            method: 'GET'
        },
        {
            name: 'User Activities',
            url: `/api/company-logs/${TEST_TENANT_ID}/user-activities?days=7`,
            method: 'GET'
        },
        {
            name: 'User Timeline',
            url: `/api/company-logs/${TEST_TENANT_ID}/user-timeline/test-user?days=1`,
            method: 'GET'
        },
        {
            name: 'Routing Analytics',
            url: `/api/company-logs/${TEST_TENANT_ID}/routing-analytics?days=30`,
            method: 'GET'
        },
        {
            name: 'Feature Usage',
            url: `/api/company-logs/${TEST_TENANT_ID}/feature-usage?days=7`,
            method: 'GET'
        }
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n📡 Testing ${endpoint.name}...`);
            console.log(`   URL: ${BASE_URL}${endpoint.url}`);
            
            const response = await axios({
                method: endpoint.method,
                url: `${BASE_URL}${endpoint.url}`,
                headers: {
                    'Authorization': 'Bearer test-token',
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            console.log(`   ✅ Status: ${response.status}`);
            console.log(`   ✅ Response: ${response.data.success ? 'SUCCESS' : 'FAILED'}`);
            
            if (response.data.data) {
                const data = response.data.data;
                if (endpoint.name === 'Real-time Sessions') {
                    console.log(`   📊 Active Users: ${data.totalActiveUsers || 0}`);
                } else if (endpoint.name === 'User Activities') {
                    console.log(`   📊 Total Activities: ${data.totalActivities || 0}`);
                } else if (endpoint.name === 'User Timeline') {
                    console.log(`   📊 Timeline Entries: ${data.timeline?.length || 0}`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.response?.status || 'Network Error'}`);
            console.log(`   ❌ Message: ${error.response?.data?.message || error.message}`);
            
            if (error.response?.status === 404) {
                console.log(`   💡 Endpoint not found - API may not be implemented yet`);
            } else if (error.response?.status === 401 || error.response?.status === 403) {
                console.log(`   💡 Authentication required - this is expected`);
            }
        }
    }
}

/**
 * Test server connectivity
 */
async function testServerConnectivity() {
    console.log('🔗 Testing server connectivity...');
    
    try {
        const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
        console.log(`✅ Server is running (Status: ${response.status})`);
        return true;
    } catch (error) {
        console.log(`❌ Server not reachable: ${error.message}`);
        console.log(`💡 Make sure the backend server is running on ${BASE_URL}`);
        return false;
    }
}

/**
 * Test basic API structure
 */
async function testBasicAPI() {
    console.log('\n🔍 Testing basic API structure...');
    
    try {
        // Test if the company-logs route exists at all
        const response = await axios.get(`${BASE_URL}/api/company-logs`, {
            timeout: 5000,
            validateStatus: () => true // Accept any status code
        });
        
        console.log(`📡 Company logs route status: ${response.status}`);
        
        if (response.status === 404) {
            console.log(`❌ Company logs routes not mounted`);
            console.log(`💡 Check if companyLogsRoutes is properly imported and mounted in tenantApp.js`);
        } else if (response.status === 401 || response.status === 403) {
            console.log(`✅ Company logs routes exist (authentication required)`);
        } else {
            console.log(`✅ Company logs routes responding`);
        }
        
    } catch (error) {
        console.log(`❌ Error testing basic API: ${error.message}`);
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🚀 Starting User Activity API Tests\n');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test Tenant: ${TEST_TENANT_ID}\n`);
    
    const serverRunning = await testServerConnectivity();
    
    if (serverRunning) {
        await testBasicAPI();
        await testAPIEndpoints();
    }
    
    console.log('\n📋 Summary:');
    console.log('1. If server is not running: Start the backend server');
    console.log('2. If endpoints return 404: Check API implementation');
    console.log('3. If endpoints return 401/403: Authentication is working (expected)');
    console.log('4. If endpoints return 200: APIs are working correctly');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Ensure backend server is running');
    console.log('2. Check that user activity middleware is active');
    console.log('3. Navigate through HR system to generate test data');
    console.log('4. Return to User Activity Tracker to see data');
}

// Run tests
runTests().catch(console.error);