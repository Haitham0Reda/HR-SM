/**
 * Simple Route Validation Script
 * 
 * This script validates that the life insurance module routes are properly
 * configured in the module registry without initializing the full application.
 */

import { moduleRegistry } from '../config/moduleRegistry.js';
import { MODULES } from '../shared/constants/modules.js';

const validateRouteConfiguration = async () => {
    console.log('🔧 Starting Simple Route Configuration Validation...');
    
    try {
        // Check if life insurance module is in registry
        const lifeInsuranceModule = moduleRegistry[MODULES.LIFE_INSURANCE];
        
        if (!lifeInsuranceModule) {
            console.log('❌ Life Insurance module not found in registry');
            return false;
        }
        
        console.log('✅ Life Insurance module found in registry');
        console.log(`   Base path: ${lifeInsuranceModule.basePath}`);
        console.log(`   Routes: ${Object.keys(lifeInsuranceModule.routes).join(', ')}`);
        
        // Check if the route loader function exists
        const routeLoader = lifeInsuranceModule.routes['life-insurance'];
        
        if (!routeLoader) {
            console.log('❌ Life insurance route loader not found');
            return false;
        }
        
        console.log('✅ Life insurance route loader found');
        
        // Try to load the route module
        try {
            const routeModule = await routeLoader();
            
            if (!routeModule || !routeModule.default) {
                console.log('❌ Route module does not export default router');
                return false;
            }
            
            console.log('✅ Route module loaded successfully');
            console.log(`   Router type: ${typeof routeModule.default}`);
            
            // Check if it's an Express router
            if (routeModule.default && typeof routeModule.default === 'function') {
                console.log('✅ Route module exports a valid Express router');
            } else {
                console.log('⚠️  Route module export may not be a valid Express router');
            }
            
            return true;
            
        } catch (importError) {
            console.log(`❌ Failed to import route module: ${importError.message}`);
            console.log(`   Stack: ${importError.stack}`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Validation failed:', error);
        return false;
    }
};

// Test the module loading function
const testModuleLoading = async () => {
    console.log('\n🧪 Testing module loading function...');
    
    try {
        const { loadModuleRoutes } = await import('../config/moduleRegistry.js');
        
        // Create a mock Express app
        const mockApp = {
            use: (path, router) => {
                console.log(`✅ Mock app.use called with path: ${path}`);
                console.log(`   Router type: ${typeof router}`);
            }
        };
        
        // Try to load the life insurance module
        await loadModuleRoutes(mockApp, MODULES.LIFE_INSURANCE);
        
        console.log('✅ Module loading function executed successfully');
        return true;
        
    } catch (error) {
        console.log(`❌ Module loading failed: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
        return false;
    }
};

// Run validations
const runValidation = async () => {
    const configValid = await validateRouteConfiguration();
    const loadingValid = await testModuleLoading();
    
    console.log('\n📊 Validation Summary:');
    console.log(`   Route configuration: ${configValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Module loading: ${loadingValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (configValid && loadingValid) {
        console.log('\n🎉 Life insurance routes are properly configured!');
        console.log('   The routes should be accessible at /api/v1/life-insurance/*');
    } else {
        console.log('\n⚠️  Issues found with route configuration.');
    }
};

runValidation();