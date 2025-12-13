#!/usr/bin/env node

/**
 * Debug Browser Login Script
 * Simulates exactly what the browser is doing for login
 */

import axios from 'axios';
import chalk from 'chalk';

async function debugBrowserLogin() {
  console.log(chalk.blue('🔍 Debugging Browser Login Behavior\n'));

  const baseURL = 'http://localhost:5000';
  
  // Test different scenarios
  const testCases = [
    {
      name: 'Current Browser Request',
      email: 'admin@techcorp.com',
      password: 'admin123',
      tenantId: '693db0e2ccc5ea08aeee120c',
      description: 'What browser should be sending now'
    },
    {
      name: 'Old Tenant ID (should fail)',
      email: 'admin@techcorp.com', 
      password: 'admin123',
      tenantId: '693cd49496e80950a403b2c8',
      description: 'Old tenant ID that was causing issues'
    },
    {
      name: 'No Tenant ID',
      email: 'admin@techcorp.com',
      password: 'admin123',
      tenantId: undefined,
      description: 'Missing tenant ID'
    },
    {
      name: 'Wrong Password',
      email: 'admin@techcorp.com',
      password: 'wrongpassword',
      tenantId: '693db0e2ccc5ea08aeee120c',
      description: 'Wrong password test'
    }
  ];

  for (const testCase of testCases) {
    console.log(chalk.yellow(`\n🧪 Testing: ${testCase.name}`));
    console.log(`   ${testCase.description}`);
    
    try {
      const requestData = {
        email: testCase.email,
        password: testCase.password
      };
      
      if (testCase.tenantId) {
        requestData.tenantId = testCase.tenantId;
      }
      
      console.log('   Request data:', JSON.stringify(requestData, null, 2));
      
      const response = await axios.post(`${baseURL}/api/v1/auth/login`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(chalk.green('   ✅ SUCCESS'));
        console.log(`   User: ${response.data.data?.user?.firstName} ${response.data.data?.user?.lastName}`);
        console.log(`   Token: ${response.data.data?.token ? 'Present' : 'Missing'}`);
      } else {
        console.log(chalk.red('   ❌ FAILED'));
        console.log(`   Message: ${response.data.message}`);
      }
      
    } catch (error) {
      console.log(chalk.red('   ❌ ERROR'));
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.response?.data?.message || error.message}`);
      
      if (error.response?.data) {
        console.log('   Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  // Test the exact browser scenario
  console.log(chalk.blue('\n🌐 Browser Simulation Test'));
  console.log('Simulating exact browser request...');
  
  try {
    // Create axios instance like the browser's api service
    const browserApi = axios.create({
      baseURL: 'http://localhost:5000/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await browserApi.post('/auth/login', {
      email: 'admin@techcorp.com',
      password: 'admin123',
      tenantId: '693db0e2ccc5ea08aeee120c'
    });
    
    console.log(chalk.green('✅ Browser simulation SUCCESS'));
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log(chalk.red('❌ Browser simulation FAILED'));
    console.log(`Status: ${error.response?.status}`);
    console.log(`Message: ${error.response?.data?.message || error.message}`);
    console.log('Full error response:', JSON.stringify(error.response?.data, null, 2));
  }

  console.log(chalk.blue('\n📋 Debugging Summary:'));
  console.log('If browser login is failing but server tests pass:');
  console.log('1. Check browser network tab for actual request data');
  console.log('2. Clear browser cache and localStorage');
  console.log('3. Check if browser is sending correct tenant ID');
  console.log('4. Verify no browser extensions are interfering');
}

debugBrowserLogin();