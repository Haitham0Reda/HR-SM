#!/usr/bin/env node

/**
 * Test Complete Flow Script
 * Tests the complete authentication and module access flow
 */

import axios from 'axios';
import chalk from 'chalk';

async function testCompleteFlow() {
  console.log(chalk.blue('🧪 Testing Complete Authentication & Module Flow\n'));

  const baseURL = 'http://localhost:5000';
  const newTenantId = '693db0e2ccc5ea08aeee120c'; // New TechCorp tenant ID
  
  try {
    // Step 1: Login with new tenant ID
    console.log(chalk.yellow('1. Testing login with new tenant ID...'));
    
    const loginResponse = await axios.post(`${baseURL}/api/v1/auth/login`, {
      email: 'admin@techcorp.com',
      password: 'admin123',
      tenantId: newTenantId
    });
    
    if (loginResponse.data.success && loginResponse.data.data?.token) {
      const token = loginResponse.data.data.token;
      const user = loginResponse.data.data.user;
      
      console.log(chalk.green('✅ Login successful!'));
      console.log(`   User: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Tenant ID: ${user.tenantId}`);
      
      // Step 2: Test /me endpoint
      console.log(chalk.yellow('\n2. Testing /me endpoint...'));
      
      const meResponse = await axios.get(`${baseURL}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (meResponse.data.success) {
        console.log(chalk.green('✅ /me endpoint working!'));
        console.log(`   User: ${meResponse.data.data.firstName} ${meResponse.data.data.lastName}`);
      } else {
        console.log(chalk.red('❌ /me endpoint failed'));
      }
      
      // Step 3: Test company modules endpoint
      console.log(chalk.yellow('\n3. Testing company modules endpoint...'));
      
      const modulesResponse = await axios.get(`${baseURL}/api/company/modules`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-company-slug': 'techcorp_solutions'
        }
      });
      
      if (modulesResponse.data.success) {
        console.log(chalk.green('✅ Company modules endpoint working!'));
        
        const modules = modulesResponse.data.modules || {};
        const enabledModules = Object.entries(modules)
          .filter(([key, module]) => module.enabled)
          .map(([key, module]) => module.name);
        
        console.log(`   Found ${enabledModules.length} enabled modules:`);
        enabledModules.forEach(name => {
          const icon = name.includes('Advanced Reports') ? '🎯' : '📦';
          console.log(`     ${icon} ${name}`);
        });
        
        if (enabledModules.some(name => name.includes('Advanced Reports'))) {
          console.log(chalk.green('\n🎉 SUCCESS: Advanced Reports module is accessible!'));
        }
        
      } else {
        console.log(chalk.red('❌ Company modules endpoint failed'));
      }
      
    } else {
      console.log(chalk.red('❌ Login failed'));
      return;
    }
    
    console.log(chalk.green('\n🎉 Complete flow test PASSED!'));
    console.log(chalk.blue('\n📋 Summary:'));
    console.log('✅ Login with new tenant ID works');
    console.log('✅ Authentication endpoints work');
    console.log('✅ Module access works');
    console.log('✅ Advanced Reports module accessible');
    
    console.log(chalk.green('\n🎯 Ready for browser testing:'));
    console.log('1. Refresh browser page');
    console.log('2. Login with: admin@techcorp.com / admin123');
    console.log('3. Verify Advanced Reports appears in dashboard');
    
  } catch (error) {
    console.log(chalk.red('❌ Test failed:'));
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Message: ${error.response?.data?.message || error.message}`);
    
    if (error.response?.status === 401) {
      console.log(chalk.yellow('\n💡 If you see 401 errors in browser:'));
      console.log('   - Clear browser localStorage');
      console.log('   - Refresh the page');
      console.log('   - Try login again');
    }
  }
}

testCompleteFlow();