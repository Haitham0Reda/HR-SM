#!/usr/bin/env node

/**
 * Script to test all module routes that were added to the registry
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const MODULE_ROUTES = {
    'COMMUNICATION': [
        { path: '/announcements', method: 'GET', description: 'Get announcements' },
        { path: '/announcements/active', method: 'GET', description: 'Get active announcements' },
        { path: '/notifications', method: 'GET', description: 'Get notifications' }
    ],
    'DOCUMENTS': [
        { path: '/document-templates', method: 'GET', description: 'Get document templates' },
        { path: '/documents', method: 'GET', description: 'Get documents' },
        { path: '/hardcopies', method: 'GET', description: 'Get hardcopies' }
    ],
    'REPORTING': [
        { path: '/reports', method: 'GET', description: 'Get reports' },
        { path: '/analytics/dashboard', method: 'GET', description: 'Get analytics dashboard' }
    ],
    'PAYROLL': [
        { path: '/payroll', method: 'GET', description: 'Get payroll records' }
    ],
    'TASKS': [
        { path: '/tasks', method: 'GET', description: 'Get tasks' }
    ]
};

async function testModuleRoute(route) {
    try {
        const options = {
            method: route.method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const response = await fetch(`${API_BASE_URL}${route.path}`, options);
        
        let status = '✅ Found';
        let details = '';
        
        if (response.status === 404) {
            status = '❌ Not Found';
            details = 'Route not registered or module not loaded';
        } else if (response.status === 401) {
            status = '✅ Found (Auth Required)';
            details = 'Route exists, authentication required';
        } else if (response.status === 400) {
            status = '⚠️  Bad Request';
            details = 'Route exists, check license validation or request format';
        } else if (response.status === 403) {
            status = '⚠️  Forbidden';
            details = 'Route exists, authorization required';
        } else {
            status = `✅ Accessible (${response.status})`;
            details = 'Route working';
        }

        return { status, details, statusCode: response.status };

    } catch (error) {
        return { 
            status: '❌ Error', 
            details: error.message, 
            statusCode: null 
        };
    }
}

async function testAllModuleRoutes() {
    console.log('🧪 Testing all module routes...\n');

    const results = {};
    
    for (const [moduleName, routes] of Object.entries(MODULE_ROUTES)) {
        console.log(`\n📦 Testing ${moduleName} Module`);
        console.log('═'.repeat(60));
        
        results[moduleName] = [];
        
        for (const route of routes) {
            console.log(`\n   ${route.method} ${route.path}`);
            console.log(`   ${route.description}`);
            
            const result = await testModuleRoute(route);
            results[moduleName].push({ ...route, ...result });
            
            console.log(`   ${result.status}`);
            if (result.details) {
                console.log(`   ${result.details}`);
            }
        }
    }

    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('═'.repeat(60));
    
    let totalRoutes = 0;
    let foundRoutes = 0;
    let notFoundRoutes = 0;
    
    for (const [moduleName, routes] of Object.entries(results)) {
        console.log(`\n${moduleName}:`);
        
        for (const route of routes) {
            totalRoutes++;
            const symbol = route.statusCode === 404 ? '❌' : '✅';
            console.log(`  ${symbol} ${route.method} ${route.path} (${route.statusCode || 'Error'})`);
            
            if (route.statusCode === 404) {
                notFoundRoutes++;
            } else {
                foundRoutes++;
            }
        }
    }
    
    console.log(`\n📈 Results: ${foundRoutes}/${totalRoutes} routes found`);
    
    if (notFoundRoutes > 0) {
        console.log(`\n⚠️  ${notFoundRoutes} routes not found. Possible issues:`);
        console.log('   1. Server needs to be restarted to load new module routes');
        console.log('   2. Module registry configuration is incorrect');
        console.log('   3. Route files have syntax errors or missing exports');
        console.log('   4. License validation is blocking access');
    } else {
        console.log('\n🎉 All routes are accessible!');
    }
    
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the server if routes are missing');
    console.log('   2. Check server logs for module loading errors');
    console.log('   3. Test with proper authentication for full functionality');
}

// Run the test
testAllModuleRoutes().catch(console.error);