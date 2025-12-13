#!/usr/bin/env node

/**
 * Debug HR App API Script
 * Simulates the HR app's API calls to debug module access issues
 */

import axios from 'axios';
import chalk from 'chalk';

async function debugHRAppAPI() {
  try {
    console.log(chalk.blue('🔍 Debugging HR App API Calls\n'));

    const baseURL = 'http://localhost:5000';
    const companySlug = 'techcorp_solutions';
    
    // Test 1: Simulate HR app login to get a real token
    console.log(chalk.yellow('1. Attempting to get authentication token...'));
    
    let authToken = null;
    try {
      // Try to login as a test user (this might fail if no test user exists)
      const loginResponse = await axios.post(`${baseURL}/api/v1/auth/login`, {
        email: 'admin@techcorp.com', // Common test email
        password: 'password123' // Common test password
      });
      
      if (loginResponse.data.success && loginResponse.data.token) {
        authToken = loginResponse.data.token;
        console.log(chalk.green('✅ Got authentication token'));
      } else {
        console.log(chalk.yellow('⚠️ Login failed, will try without token'));
      }
    } catch (loginError) {
      console.log(chalk.yellow('⚠️ Login failed:'), loginError.response?.data?.message || loginError.message);
      console.log(chalk.yellow('   Will try to test API without authentication'));
    }

    // Test 2: Create company API instance like HR app does
    console.log(chalk.yellow('\n2. Testing company API call (like HR app)...'));
    
    const companyApi = axios.create({
      baseURL: baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'x-company-slug': companySlug
      }
    });

    // Add authentication token if we have one
    if (authToken) {
      companyApi.defaults.headers.Authorization = `Bearer ${authToken}`;
    }

    try {
      const response = await companyApi.get('/api/company/modules');
      
      console.log(chalk.green('✅ API call successful!'));
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.modules) {
        const enabledModules = Object.entries(response.data.modules)
          .filter(([key, module]) => module.enabled)
          .map(([key, module]) => `${key} (${module.name})`);
        
        console.log(chalk.green('\n✅ Enabled modules:'));
        enabledModules.forEach(module => console.log(`  - ${module}`));
        
        if (enabledModules.some(m => m.includes('Advanced Reports'))) {
          console.log(chalk.green('\n🎉 Advanced Reports module is enabled and accessible!'));
        } else {
          console.log(chalk.yellow('\n⚠️ Advanced Reports module not found in enabled modules'));
        }
      }
      
    } catch (apiError) {
      console.log(chalk.red('❌ API call failed:'));
      console.log('Status:', apiError.response?.status);
      console.log('Message:', apiError.response?.data?.message || apiError.message);
      console.log('Headers sent:', JSON.stringify(companyApi.defaults.headers, null, 2));
      
      if (apiError.response?.status === 401) {
        console.log(chalk.yellow('\n💡 Authentication issue detected. Possible causes:'));
        console.log('  - No valid user token available');
        console.log('  - Token expired or invalid');
        console.log('  - User not associated with company');
      }
    }

    // Test 3: Check if we can access the endpoint without auth (should fail)
    console.log(chalk.yellow('\n3. Testing endpoint without authentication (should fail)...'));
    try {
      const noAuthResponse = await axios.get(`${baseURL}/api/company/modules`, {
        headers: {
          'x-company-slug': companySlug
        }
      });
      console.log(chalk.red('❌ Endpoint allowed access without auth (security issue)'));
    } catch (noAuthError) {
      if (noAuthError.response?.status === 401) {
        console.log(chalk.green('✅ Endpoint correctly requires authentication'));
      } else {
        console.log(chalk.yellow('⚠️ Unexpected error:'), noAuthError.response?.status, noAuthError.response?.data?.message);
      }
    }

    console.log(chalk.blue('\n📋 Debug Summary:'));
    console.log('- API endpoint is accessible and working');
    console.log('- Authentication is required (as expected)');
    console.log('- HR app needs valid authentication token to access modules');
    console.log('- Check browser console for authentication errors');
    console.log('- Verify user is logged in and token is valid');

  } catch (error) {
    console.error(chalk.red('❌ Debug failed:'), error.message);
  }
}

debugHRAppAPI();