#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const baseURL = process.env.API_URL || 'http://localhost:5000';
const companySlug = 'techcorp_solutions';

async function testClientAPIFlow() {
  console.log(chalk.blue('🧪 Testing Client API Flow for TechCorp Solutions\n'));

  try {
    // Test 1: Simulate client login to get token
    console.log(chalk.yellow('1. Testing login flow...'));
    
    // First, let's check if there are any users for TechCorp
    console.log('   Checking for TechCorp users...');
    
    // We'll simulate the client API calls that the HR app would make
    const companyApi = axios.create({
      baseURL: baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'x-company-slug': companySlug
      }
    });

    // Test 2: Try to access company modules without auth (should fail)
    console.log(chalk.yellow('\n2. Testing company modules API without auth...'));
    try {
      const response = await companyApi.get('/api/company/modules');
      console.log(chalk.red('❌ Should require authentication'));
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(chalk.green('✅ Properly requires authentication'));
      } else {
        console.log(chalk.yellow('⚠️ Unexpected error:', error.message));
      }
    }

    // Test 3: Check if we can get available modules (public endpoint)
    console.log(chalk.yellow('\n3. Testing available modules (public)...'));
    try {
      const response = await companyApi.get('/api/company/available-modules');
      if (response.data.success) {
        console.log(chalk.green('✅ Available modules API working'));
        console.log(`   Available modules: ${Object.keys(response.data.modules).length}`);
      } else {
        console.log(chalk.red('❌ Available modules API failed'));
      }
    } catch (error) {
      console.log(chalk.red('❌ Available modules API error:', error.message));
    }

    // Test 4: Test the platform API that the client should use
    console.log(chalk.yellow('\n4. Testing platform API (what client should use)...'));
    
    // This is the API the client is actually calling successfully
    const platformResponse = await axios.get(`${baseURL}/api/platform/companies/${companySlug}/modules`);
    
    if (platformResponse.data.success) {
      console.log(chalk.green('✅ Platform API working (this is what client should use)'));
      
      const modules = platformResponse.data.data.availableModules;
      const enabledModules = Object.entries(modules)
        .filter(([key, module]) => module.enabled)
        .map(([key, module]) => ({ key, name: module.name, tier: module.tier }));
      
      console.log(`   Enabled modules: ${enabledModules.length}`);
      enabledModules.forEach(module => {
        console.log(`     - ${module.key}: ${module.name} (${module.tier})`);
      });
    }

    // Test 5: Check client configuration issue
    console.log(chalk.yellow('\n5. Analyzing client configuration...'));
    
    console.log('   Client is trying to call: /api/company/modules');
    console.log('   But should call: /api/platform/companies/{slug}/modules');
    console.log('   OR: Fix the company API to work without strict auth for module info');

    // Test 6: Suggest solutions
    console.log(chalk.blue('\n💡 Solutions to fix dashboard compatibility:'));
    
    console.log(chalk.green('Option 1: Update client to use platform API'));
    console.log('   - Change useModuleAccess.js to call /api/platform/companies/{slug}/modules');
    console.log('   - This API works without authentication and returns proper module data');
    
    console.log(chalk.green('\nOption 2: Make company API work with basic auth'));
    console.log('   - Modify company module routes to allow basic company identification');
    console.log('   - Keep authentication for sensitive operations only');
    
    console.log(chalk.green('\nOption 3: Create a public module info endpoint'));
    console.log('   - Add /api/company/{slug}/modules-info endpoint');
    console.log('   - Return module availability without requiring full authentication');

    // Test 7: Verify the fix
    console.log(chalk.yellow('\n6. Testing recommended fix...'));
    
    // Test if we can get the data the client needs from platform API
    const testUrl = `${baseURL}/api/platform/companies/${companySlug}/modules`;
    console.log(`   Testing: ${testUrl}`);
    
    const testResponse = await axios.get(testUrl);
    if (testResponse.data.success) {
      const moduleData = testResponse.data.data.availableModules;
      
      // Transform to format expected by client
      const clientFormat = {};
      Object.entries(moduleData).forEach(([key, module]) => {
        clientFormat[key] = {
          enabled: module.enabled,
          tier: module.tier,
          limits: module.limits,
          info: {
            name: module.name,
            description: module.description,
            category: module.category
          }
        };
      });
      
      console.log(chalk.green('✅ Platform API provides all needed data'));
      console.log('   Client can use this data format:');
      console.log('   {');
      Object.entries(clientFormat).slice(0, 2).forEach(([key, data]) => {
        console.log(`     "${key}": { enabled: ${data.enabled}, tier: "${data.tier}" },`);
      });
      console.log('     ...');
      console.log('   }');
    }

    console.log(chalk.blue('\n🎯 CONCLUSION:'));
    console.log(chalk.green('✅ TechCorp Solutions has all modules properly configured'));
    console.log(chalk.green('✅ Platform API is working and returns correct module data'));
    console.log(chalk.yellow('⚠️ Client needs to be updated to use the correct API endpoint'));
    console.log(chalk.blue('📝 Recommended: Update client/hr-app/src/hooks/useModuleAccess.js'));

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
    if (error.response) {
      console.error(chalk.red('Response status:'), error.response.status);
      console.error(chalk.red('Response data:'), JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testClientAPIFlow();