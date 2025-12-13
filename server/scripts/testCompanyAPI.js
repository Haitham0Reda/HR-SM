#!/usr/bin/env node

/**
 * Test Company API Script
 * Tests the company module API endpoints
 */

import axios from 'axios';
import chalk from 'chalk';

async function testCompanyAPI() {
  try {
    console.log(chalk.blue('🧪 Testing Company Module API\n'));

    const baseURL = 'http://localhost:5000';
    
    // Test 1: Health check
    console.log(chalk.yellow('1. Testing health endpoint...'));
    try {
      const healthResponse = await axios.get(`${baseURL}/health`);
      console.log(chalk.green('✅ Health check passed'));
    } catch (error) {
      console.log(chalk.red('❌ Health check failed'), error.message);
      return;
    }

    // Test 2: Company modules endpoint (without auth - should fail)
    console.log(chalk.yellow('\n2. Testing company modules endpoint (no auth)...'));
    try {
      const response = await axios.get(`${baseURL}/api/company/modules`, {
        headers: {
          'x-company-slug': 'techcorp_solutions'
        }
      });
      console.log(chalk.red('❌ Should have failed without auth'));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(chalk.green('✅ Correctly rejected without authentication'));
      } else {
        console.log(chalk.yellow('⚠️ Unexpected error:'), error.response?.status, error.response?.data?.message || error.message);
      }
    }

    // Test 3: Company modules endpoint (with mock auth - might fail due to token validation)
    console.log(chalk.yellow('\n3. Testing company modules endpoint (with mock auth)...'));
    try {
      const response = await axios.get(`${baseURL}/api/company/modules`, {
        headers: {
          'x-company-slug': 'techcorp_solutions',
          'Authorization': 'Bearer mock-token'
        }
      });
      
      if (response.data.success) {
        console.log(chalk.green('✅ API call successful'));
        console.log('Company:', response.data.company?.name);
        console.log('Modules found:', Object.keys(response.data.modules || {}).length);
        
        const enabledModules = Object.entries(response.data.modules || {})
          .filter(([key, module]) => module.enabled)
          .map(([key, module]) => module.name);
        
        console.log('Enabled modules:', enabledModules.join(', '));
        
        if (enabledModules.includes('Advanced Reports')) {
          console.log(chalk.green('✅ Advanced Reports module is enabled!'));
        } else {
          console.log(chalk.yellow('⚠️ Advanced Reports module not found in enabled modules'));
        }
      } else {
        console.log(chalk.red('❌ API returned error:'), response.data.message);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(chalk.yellow('⚠️ Authentication failed (expected with mock token)'));
      } else if (error.response?.status === 404) {
        console.log(chalk.red('❌ Route not found - server may need restart'));
      } else {
        console.log(chalk.red('❌ API call failed:'), error.response?.status, error.response?.data?.message || error.message);
      }
    }

    console.log(chalk.blue('\n📋 Summary:'));
    console.log('- If you see "Route not found", restart the server');
    console.log('- If you see "Authentication failed", the routes are working');
    console.log('- The HR app should work once authenticated properly');

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
  }
}

testCompanyAPI();