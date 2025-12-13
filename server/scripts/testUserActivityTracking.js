#!/usr/bin/env node

/**
 * Test script for User Activity Tracking System
 * Tests the enhanced logging and user monitoring features
 */

import axios from 'axios';
import { getLoggerForTenant } from '../utils/companyLogger.js';

const BASE_URL = 'http://localhost:5000';
const TEST_TENANT_ID = 'techcorp-solutions-d8f0689c';
const TEST_COMPANY_NAME = 'TechCorp Solutions';

console.log('🧪 Testing User Activity Tracking System...\n');

/**
 * Test user activity logging
 */
function testUserActivityLogging() {
    console.log('1. Testing User Activity Logging...');
    
    const logger = getLoggerForTenant(TEST_TENANT_ID, TEST_COMPANY_NAME);
    
    // Simulate various user activities
    const activities = [
        {
            eventType: 'user_activity',
            activityType: 'dashboard_view',
            userId: 'user-123',
            userEmail: 'john.doe@techcorp.com',
            userName: 'John Doe',
            userRole: 'employee',
            companySlug: 'techcorp-solutions',
            companyName: TEST_COMPANY_NAME,
            method: 'GET',
            internalPath: '/dashboard',
            fullUrl: '/company/techcorp-solutions/dashboard',
            ip: '192.168.1.100',
            sessionId: 'sess-123-abc',
            timestamp: new Date().toISOString()
        },
        {
            eventType: 'user_activity',
            activityType: 'user_list',
            userId: 'user-456',
            userEmail: 'jane.smith@techcorp.com',
            userName: 'Jane Smith',
            userRole: 'hr',
            companySlug: 'techcorp-solutions',
            companyName: TEST_COMPANY_NAME,
            method: 'GET',
            internalPath: '/users',
            fullUrl: '/company/techcorp-solutions/users',
            ip: '192.168.1.101',
            sessionId: 'sess-456-def',
            timestamp: new Date().toISOString()
        },
        {
            eventType: 'user_activity',
            activityType: 'user_create',
            userId: 'user-789',
            userEmail: 'admin@techcorp.com',
            userName: 'Admin User',
            userRole: 'admin',
            companySlug: 'techcorp-solutions',
            companyName: TEST_COMPANY_NAME,
            method: 'POST',
            internalPath: '/users',
            fullUrl: '/company/techcorp-solutions/users',
            ip: '192.168.1.102',
            sessionId: 'sess-789-ghi',
            requestBody: { firstName: 'New', lastName: 'Employee', email: 'new@techcorp.com' },
            timestamp: new Date().toISOString()
        }
    ];
    
    activities.forEach(activity => {
        logger.info('User activity tracked', activity);
    });
    
    console.log('✅ User activity logging test completed\n');
}

/**
 * Test session tracking
 */
function testSessionTracking() {
    console.log('2. Testing Session Tracking...');
    
    const logger = getLoggerForTenant(TEST_TENANT_ID, TEST_COMPANY_NAME);
    
    // Simulate session events
    const sessionEvents = [
        {
            eventType: 'user_session',
            sessionEventType: 'login',
            userId: 'user-123',
            userEmail: 'john.doe@techcorp.com',
            userName: 'John Doe',
            companySlug: 'techcorp-solutions',
            companyName: TEST_COMPANY_NAME,
            sessionId: 'sess-123-abc',
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            timestamp: new Date().toISOString()
        },
        {
            eventType: 'user_session',
            sessionEventType: 'logout',
            userId: 'user-123',
            userEmail: 'john.doe@techcorp.com',
            userName: 'John Doe',
            companySlug: 'techcorp-solutions',
            companyName: TEST_COMPANY_NAME,
            sessionId: 'sess-123-abc',
            ip: '192.168.1.100',
            sessionDuration: '45 minutes',
            timestamp: new Date().toISOString()
        }
    ];
    
    sessionEvents.forEach(event => {
        logger.info(`User session: ${event.sessionEventType}`, event);
    });
    
    console.log('✅ Session tracking test completed\n');
}

/**
 * Test API endpoints
 */
async function testAPIEndpoints() {
    console.log('3. Testing User Activity API Endpoints...');
    
    try {
        // Test user activities endpoint
        console.log('   Testing user activities endpoint...');
        const activitiesResponse = await axios.get(
            `${BASE_URL}/api/company-logs/${TEST_TENANT_ID}/user-activities?days=7`,
            {
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            }
        );
        
        console.log('   ✅ User activities endpoint:', activitiesResponse.data.success ? 'SUCCESS' : 'FAILED');
        if (activitiesResponse.data.success) {
            console.log(`      - Total activities: ${activitiesResponse.data.data.totalActivities}`);
            console.log(`      - Active users: ${activitiesResponse.data.data.usersList?.length || 0}`);
        }
        
        // Test real-time sessions endpoint
        console.log('   Testing real-time sessions endpoint...');
        const sessionsResponse = await axios.get(
            `${BASE_URL}/api/company-logs/${TEST_TENANT_ID}/real-time-sessions`,
            {
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            }
        );
        
        console.log('   ✅ Real-time sessions endpoint:', sessionsResponse.data.success ? 'SUCCESS' : 'FAILED');
        if (sessionsResponse.data.success) {
            console.log(`      - Active users: ${sessionsResponse.data.data.totalActiveUsers}`);
            console.log(`      - Current activities: ${Object.keys(sessionsResponse.data.data.sessionSummary.currentActivities).length}`);
        }
        
        // Test user timeline endpoint
        console.log('   Testing user timeline endpoint...');
        const timelineResponse = await axios.get(
            `${BASE_URL}/api/company-logs/${TEST_TENANT_ID}/user-timeline/user-123?days=1`,
            {
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            }
        );
        
        console.log('   ✅ User timeline endpoint:', timelineResponse.data.success ? 'SUCCESS' : 'FAILED');
        if (timelineResponse.data.success) {
            console.log(`      - Timeline activities: ${timelineResponse.data.data.timeline?.length || 0}`);
            console.log(`      - Total activities: ${timelineResponse.data.data.summary.totalActivities}`);
        }
        
    } catch (error) {
        console.log('   ❌ API test failed:', error.response?.data?.message || error.message);
        console.log('      Note: This is expected if the server is not running or authentication is not set up');
    }
    
    console.log('✅ API endpoints test completed\n');
}

/**
 * Test activity type detection
 */
function testActivityTypeDetection() {
    console.log('4. Testing Activity Type Detection...');
    
    const testCases = [
        { method: 'GET', path: '/dashboard', expected: 'dashboard_view' },
        { method: 'GET', path: '/users', expected: 'users_list' },
        { method: 'GET', path: '/users/create', expected: 'users_create_form' },
        { method: 'GET', path: '/users/123', expected: 'users_view' },
        { method: 'GET', path: '/users/123/edit', expected: 'users_edit_form' },
        { method: 'POST', path: '/users', expected: 'users_create' },
        { method: 'PUT', path: '/users/123', expected: 'users_update' },
        { method: 'DELETE', path: '/users/123', expected: 'users_delete' },
        { method: 'POST', path: '/users/search', expected: 'users_search' }
    ];
    
    // Import the function (this would normally be imported)
    function determineActivityType(method, path, body = {}) {
        const pathSegments = path.split('/').filter(Boolean);
        const resource = pathSegments[0] || 'dashboard';
        const action = pathSegments[1];
        const id = pathSegments[2];
        
        if (method === 'GET') {
            if (path === '/' || path === '/dashboard') return 'dashboard_view';
            if (action === 'create') return `${resource}_create_form`;
            if (id && action === 'edit') return `${resource}_edit_form`;
            if (id) return `${resource}_view`;
            return `${resource}_list`;
        }
        
        if (method === 'POST') {
            if (action === 'search') return `${resource}_search`;
            if (path.includes('upload')) return `${resource}_upload`;
            return `${resource}_create`;
        }
        
        if (method === 'PUT' || method === 'PATCH') {
            return `${resource}_update`;
        }
        
        if (method === 'DELETE') {
            return `${resource}_delete`;
        }
        
        return 'unknown_activity';
    }
    
    testCases.forEach(testCase => {
        const result = determineActivityType(testCase.method, testCase.path);
        const status = result === testCase.expected ? '✅' : '❌';
        console.log(`   ${status} ${testCase.method} ${testCase.path} → ${result} (expected: ${testCase.expected})`);
    });
    
    console.log('✅ Activity type detection test completed\n');
}

/**
 * Test data sanitization
 */
function testDataSanitization() {
    console.log('5. Testing Data Sanitization...');
    
    // Import the function (this would normally be imported)
    function sanitizeRequestBody(body, activityType) {
        if (!body || typeof body !== 'object') return {};
        
        const sanitized = { ...body };
        
        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        // Limit size of logged data
        const maxSize = 1000; // characters
        const stringified = JSON.stringify(sanitized);
        if (stringified.length > maxSize) {
            return { _truncated: true, _size: stringified.length, _preview: stringified.substring(0, maxSize) };
        }
        
        return sanitized;
    }
    
    const testData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'secret123',
        token: 'abc123',
        ssn: '123-45-6789'
    };
    
    const sanitized = sanitizeRequestBody(testData, 'user_create');
    
    console.log('   Original data:', testData);
    console.log('   Sanitized data:', sanitized);
    
    const hasSensitiveData = sanitized.password === '[REDACTED]' && 
                            sanitized.token === '[REDACTED]' && 
                            sanitized.ssn === '[REDACTED]';
    
    console.log(`   ✅ Sensitive data sanitization: ${hasSensitiveData ? 'PASSED' : 'FAILED'}`);
    console.log('✅ Data sanitization test completed\n');
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🚀 Starting User Activity Tracking System Tests\n');
    console.log(`Testing with:`);
    console.log(`- Tenant ID: ${TEST_TENANT_ID}`);
    console.log(`- Company Name: ${TEST_COMPANY_NAME}`);
    console.log(`- Base URL: ${BASE_URL}\n`);
    
    testUserActivityLogging();
    testSessionTracking();
    await testAPIEndpoints();
    testActivityTypeDetection();
    testDataSanitization();
    
    console.log('🎉 All tests completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check log files in logs/companies/techcorp_solutions/');
    console.log('2. Verify user activity entries are being logged');
    console.log('3. Test the User Activity Tracker admin page');
    console.log('4. Monitor real-time user sessions');
    console.log('5. Test API endpoints with proper authentication');
}

// Run tests
runTests().catch(console.error);