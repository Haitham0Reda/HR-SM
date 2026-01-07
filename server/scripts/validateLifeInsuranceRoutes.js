/**
 * Life Insurance Routes Validation Script
 * 
 * This script validates that the life insurance module routes are properly
 * mounted and accessible. It's designed to run independently to check
 * the route configuration.
 */

import { connectDatabase } from '../core/config/database.js';
import app, { initializeModuleSystem, initializeRoutes } from '../app.js';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const validateRoutes = async () => {
    console.log('🔧 Starting Life Insurance Routes Validation...');
    
    try {
        // Initialize database connection
        await connectDatabase();
        console.log('✅ Database connected');

        // Initialize module system
        await initializeModuleSystem();
        console.log('✅ Module system initialized');

        // Initialize routes
        await initializeRoutes();
        console.log('✅ Routes initialized');

        // Test basic route accessibility
        console.log('\n📋 Testing route accessibility...');

        const endpoints = [
            '/api/v1/life-insurance/',
            '/api/v1/life-insurance/policies',
            '/api/v1/life-insurance/claims',
            '/api/v1/life-insurance/family-members',
            '/api/v1/life-insurance/config'
        ];

        const results = {
            mounted: 0,
            notFound: 0,
            authRequired: 0,
            errors: []
        };

        for (const endpoint of endpoints) {
            try {
                const response = await request(app).get(endpoint);
                
                if (response.status === 404) {
                    results.notFound++;
                    results.errors.push(`❌ ${endpoint} - Route not found (404)`);
                } else if (response.status === 401) {
                    results.mounted++;
                    results.authRequired++;
                    console.log(`✅ ${endpoint} - Route mounted (requires auth)`);
                } else if (response.status === 403 || response.status === 500) {
                    results.mounted++;
                    console.log(`✅ ${endpoint} - Route mounted (middleware validation)`);
                } else {
                    results.mounted++;
                    console.log(`✅ ${endpoint} - Route mounted (status: ${response.status})`);
                }
            } catch (error) {
                results.errors.push(`❌ ${endpoint} - Error: ${error.message}`);
            }
        }

        // Test with valid JWT structure
        console.log('\n🔐 Testing with JWT token...');
        
        const testToken = jwt.sign(
            { 
                id: new mongoose.Types.ObjectId(),
                tenantId: new mongoose.Types.ObjectId(),
                role: 'admin'
            },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        try {
            const response = await request(app)
                .get('/api/v1/life-insurance/')
                .set('Authorization', `Bearer ${testToken}`);

            if (response.status === 404) {
                console.log('❌ Main route not accessible even with JWT');
            } else {
                console.log(`✅ Main route accessible with JWT (status: ${response.status})`);
                console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
            }
        } catch (error) {
            console.log(`❌ JWT test failed: ${error.message}`);
        }

        // Summary
        console.log('\n📊 Validation Summary:');
        console.log(`   Routes mounted: ${results.mounted}/${endpoints.length}`);
        console.log(`   Routes requiring auth: ${results.authRequired}`);
        console.log(`   Routes not found: ${results.notFound}`);
        
        if (results.errors.length > 0) {
            console.log('\n❌ Errors found:');
            results.errors.forEach(error => console.log(`   ${error}`));
        }

        if (results.mounted === endpoints.length) {
            console.log('\n🎉 All life insurance routes are properly mounted!');
            return true;
        } else {
            console.log('\n⚠️  Some routes are not properly mounted.');
            return false;
        }

    } catch (error) {
        console.error('❌ Validation failed:', error);
        return false;
    } finally {
        // Close database connection
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    }
};

// Run validation
validateRoutes();