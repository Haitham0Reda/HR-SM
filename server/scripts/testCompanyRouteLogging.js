#!/usr/bin/env node

/**
 * Test script for enhanced company route logging
 * Tests the new logging features for company-based routing
 */

import axios from 'axios';
import { getLoggerForTenant } from '../utils/companyLogger.js';

const BASE_URL = 'http://localhost:5000';
const TEST_TENANT_ID = 'techcorp-solutions-d8f0689c';
const TEST_COMPANY_NAME = 'TechCorp Solutions';

console.log('🧪 Testing Enhanced Company Route Logging...\n');

/**
 * Test company logger with routing context
 */
function testCompanyLogger() {
    console.log('1. Testing Company Logger with Routing Context...');
    
    const logger = getLoggerForTenant(TEST_TENANT_ID, TEST_COMPANY_NAME);
    
    // Simulate company route logging
    logger.info('Company navigation', {
        eventType: 'navigation',
        companySlug: 'techcorp-solutions',
        internalPath: '/dashboard',
        companyName: TEST_COMPANY_NAME,
        method: 'GET',
        url: '/company/techcorp-solutions/dashboard',
        userId: 'test-user-123',
        userEmail: 'admin@techcorp.com',
        routing: {
            isCompanyRoute: true,
            companySlug: 'techcorp-solutions',
            internalPath: '/dashboard',
            companyName: TEST_COMPANY_NAME
        }
    });
    
    logger.info('Route access', {
        eventType: 'route_access',
        companySlug: 'techcorp-solutions',
        companyName: TEST_COMPANY_NAME,
        feature: 'dashboard',
        subFeature: null,
        fullPath: '/dashboard',
        method: 'GET',
        userId: 'test-user-123',
        userEmail: 'admin@techcorp.com'
    });
    
    logger.info('Request completed', {
        method: 'GET',
        url: '/company/techcorp-solutions/dashboard',
        statusCode: 200,
        responseTime: '45ms',
        userId: 'test-user-123',
        userEmail: 'admin@techcorp.com',
        routing: {
            isCompanyRoute: true,
            companySlug: 'techcorp-solutions',
            internalPath: '/dashboard',
            companyName: TEST_COMPANY_NAME
        }
    });
    
    console.log('✅ Company logger test completed\n');
}

/**
 * Test different company routes
 */
function testMultipleRoutes() {
    console.log('2. Testing Multiple Company Routes...');
    
    const logger = getLoggerForTenant(TEST_TENANT_ID, TEST_COMPANY_NAME);
    
    const routes = [
        { path: '/dashboard', feature: 'dashboard' },
        { path: '/users', feature: 'users' },
        { path: '/users/create', feature: 'users', subFeature: 'create' },
        { path: '/attendance', feature: 'attendance' },
        { path: '/reports', feature: 'reports' },
        { path: '/settings', feature: 'settings' }
    ];
    
    routes.forEach((route, index) => {
        logger.info('Route access', {
            eventType: 'route_access',
            companySlug: 'techcorp-solutions',
            companyName: TEST_COMPANY_NAME,
            feature: route.feature,
            subFeature: route.subFeature || null,
            fullPath: route.path,
            method: 'GET',
            userId: `test-user-${index + 1}`,
            userEmail: `user${index + 1}@techcorp.com`,
            timestamp: new Date().toISOString()
        });
    });
    
    console.log('✅ Multiple routes test completed\n');
}

/**
 * Test API endpoints for routing analytics
 */
async function testAnalyticsAPI() {
    console.log('3. Testing Analytics API Endpoints...');
    
    try {
        // First, let's create a test log entry via API
        const testResponse = await axios.post(`${BASE_URL}/api/company-logs/${TEST_TENANT_ID}/test`, {
            level: 'info',
            message: 'Test company route access',
            metadata: {
                routing: {
                    isCompanyRoute: true,
                    companySlug: 'techcorp-solutions',
                    internalPath: '/dashboard',
                    companyName: TEST_COMPANY_NAME
                },
                feature: 'dashboard'
            }
        }, {
            headers: {
                'Authorization': 'Bearer test-token',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📝 Test log created:', testResponse.data.success ? '✅' : '❌');
        
        // Test routing analytics endpoint
        const analyticsResponse = await axios.get(
            `${BASE_URL}/api/company-logs/${TEST_TENANT_ID}/routing-analytics?days=7`,
            {
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            }
        );
        
        console.log('📊 Routing analytics:', analyticsResponse.data.success ? '✅' : '❌');
        if (analyticsResponse.data.success) {
            console.log('   - Total company route access:', analyticsResponse.data.data.totalCompanyRouteAccess);
            console.log('   - Features tracked:', Object.keys(analyticsResponse.data.data.featureUsage).length);
        }
        
        // Test feature usage endpoint
        const featureResponse = await axios.get(
            `${BASE_URL}/api/company-logs/${TEST_TENANT_ID}/feature-usage?days=7`,
            {
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            }
        );
        
        console.log('📈 Feature usage:', featureResponse.data.success ? '✅' : '❌');
        if (featureResponse.data.success) {
            console.log('   - Total access:', featureResponse.data.data.totalAccess);
            console.log('   - Top features:', featureResponse.data.data.features.slice(0, 3).map(f => f.feature).join(', '));
        }
        
    } catch (error) {
        console.log('❌ API test failed:', error.response?.data?.message || error.message);
        console.log('   Note: This is expected if the server is not running or authentication is not set up');
    }
    
    console.log('✅ Analytics API test completed\n');
}

/**
 * Test error logging with routing context
 */
function testErrorLogging() {
    console.log('4. Testing Error Logging with Routing Context...');
    
    const logger = getLoggerForTenant(TEST_TENANT_ID, TEST_COMPANY_NAME);
    
    logger.error('Request error', {
        error: 'Test error for company route',
        stack: 'Error: Test error\n    at testFunction (test.js:1:1)',
        method: 'POST',
        url: '/company/techcorp-solutions/users/create',
        userId: 'test-user-123',
        userEmail: 'admin@techcorp.com',
        statusCode: 500,
        routing: {
            isCompanyRoute: true,
            companySlug: 'techcorp-solutions',
            internalPath: '/users/create',
            companyName: TEST_COMPANY_NAME
        }
    });
    
    logger.security('Security event: unauthorized_access', {
        eventType: 'unauthorized_access',
        method: 'GET',
        url: '/company/techcorp-solutions/admin',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        userId: 'test-user-456',
        userEmail: 'user@example.com',
        timestamp: new Date().toISOString(),
        routing: {
            isCompanyRoute: true,
            companySlug: 'techcorp-solutions',
            internalPath: '/admin',
            companyName: TEST_COMPANY_NAME
        }
    });
    
    console.log('✅ Error logging test completed\n');
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🚀 Starting Enhanced Company Route Logging Tests\n');
    console.log(`Testing with:`);
    console.log(`- Tenant ID: ${TEST_TENANT_ID}`);
    console.log(`- Company Name: ${TEST_COMPANY_NAME}`);
    console.log(`- Base URL: ${BASE_URL}\n`);
    
    testCompanyLogger();
    testMultipleRoutes();
    await testAnalyticsAPI();
    testErrorLogging();
    
    console.log('🎉 All tests completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check log files in logs/companies/techcorp_solutions/');
    console.log('2. Verify routing context is included in log entries');
    console.log('3. Test analytics endpoints with real authentication');
    console.log('4. Monitor company route usage in production');
}

// Run tests
runTests().catch(console.error);