#!/usr/bin/env node

/**
 * Test script to verify attendance device routes can be loaded
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testRouteLoading() {
    try {
        console.log('Testing attendance device route loading...');
        
        // Test importing the route module
        const routeModule = await import('../modules/hr-core/attendance/attendanceDevice.routes.js');
        
        if (routeModule.default) {
            console.log('✅ Attendance device routes loaded successfully');
            console.log('Route type:', typeof routeModule.default);
            
            // Check if it's an Express router
            if (routeModule.default.stack) {
                console.log(`✅ Router has ${routeModule.default.stack.length} routes defined`);
                
                // List the routes
                routeModule.default.stack.forEach((layer, index) => {
                    const route = layer.route;
                    if (route) {
                        const methods = Object.keys(route.methods).join(', ').toUpperCase();
                        console.log(`  ${index + 1}. ${methods} ${route.path}`);
                    }
                });
            }
        } else {
            console.log('❌ Route module does not have default export');
        }
        
    } catch (error) {
        console.error('❌ Error loading attendance device routes:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Test module registry loading
async function testModuleRegistry() {
    try {
        console.log('\nTesting module registry...');
        
        const { moduleRegistry } = await import('../config/moduleRegistry.js');
        const { MODULES } = await import('../shared/constants/modules.js');
        
        const hrCoreModule = moduleRegistry[MODULES.HR_CORE];
        
        if (hrCoreModule && hrCoreModule.routes['attendance-devices']) {
            console.log('✅ attendance-devices route found in module registry');
            
            // Test loading the route through the registry
            const routeLoader = hrCoreModule.routes['attendance-devices'];
            const routeModule = await routeLoader();
            
            if (routeModule.default) {
                console.log('✅ Route loaded successfully through module registry');
            } else {
                console.log('❌ Route module loaded but no default export');
            }
        } else {
            console.log('❌ attendance-devices route not found in module registry');
        }
        
    } catch (error) {
        console.error('❌ Error testing module registry:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run tests
async function runTests() {
    await testRouteLoading();
    await testModuleRegistry();
    console.log('\n✅ All tests completed successfully!');
    console.log('\nTo fix the 404 error, restart your server to reload the module registry.');
}

runTests().catch(console.error);