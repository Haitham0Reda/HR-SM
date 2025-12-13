#!/usr/bin/env node

/**
 * Test Routes Script
 * Tests if routes are properly initialized
 */

import express from 'express';
import { initializeRoutes } from '../app.js';

async function testRoutes() {
  try {
    console.log('🧪 Testing route initialization...');
    
    const app = express();
    
    // Initialize routes
    await initializeRoutes();
    
    // Get all registered routes
    const routes = [];
    
    function extractRoutes(stack, basePath = '') {
      stack.forEach(layer => {
        if (layer.route) {
          // Regular route
          const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
          routes.push(`${methods} ${basePath}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.regexp) {
          // Router middleware
          const routerPath = layer.regexp.source
            .replace('\\', '')
            .replace('(?=\\/|$)', '')
            .replace('^', '')
            .replace('$', '');
          
          if (layer.handle && layer.handle.stack) {
            extractRoutes(layer.handle.stack, basePath + routerPath);
          }
        }
      });
    }
    
    extractRoutes(app._router.stack);
    
    console.log('\n📋 Registered routes:');
    routes.forEach(route => {
      if (route.includes('/api/company')) {
        console.log(`✅ ${route}`);
      } else {
        console.log(`   ${route}`);
      }
    });
    
    // Check for company routes specifically
    const companyRoutes = routes.filter(route => route.includes('/api/company'));
    
    if (companyRoutes.length > 0) {
      console.log(`\n✅ Found ${companyRoutes.length} company routes`);
      console.log('Company routes:', companyRoutes.join(', '));
    } else {
      console.log('\n❌ No company routes found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRoutes();