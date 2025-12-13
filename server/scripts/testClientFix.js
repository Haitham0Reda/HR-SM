#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const baseURL = process.env.API_URL || 'http://localhost:5000';
const companySlug = 'techcorp_solutions';

async function testClientFix() {
  console.log(chalk.blue('🧪 Testing Client Fix for TechCorp Solutions Dashboard\n'));

  try {
    // Simulate the new client API call
    console.log(chalk.yellow('1. Testing new client API call (platform API)...'));
    
    const apiUrl = `${baseURL}/api/platform/companies/${companySlug}/modules`;
    console.log(`   Calling: ${apiUrl}`);
    
    const response = await axios.get(apiUrl);
    
    if (response.data.success) {
      console.log(chalk.green('✅ Platform API call successful'));
      
      const modules = response.data.data.availableModules || {};
      
      // Simulate client-side processing
      const accessMap = {};
      Object.entries(modules).forEach(([moduleKey, moduleInfo]) => {
        accessMap[moduleKey] = {
          hasAccess: moduleInfo.enabled,
          tier: moduleInfo.tier,
          limits: moduleInfo.limits,
          info: {
            name: moduleInfo.name,
            description: moduleInfo.description,
            category: moduleInfo.category,
            required: moduleInfo.required,
            canDisable: moduleInfo.canDisable
          }
        };
      });
      
      console.log(`   Processed ${Object.keys(accessMap).length} modules`);
      
      // Check enabled modules
      const enabledModules = Object.entries(accessMap)
        .filter(([key, access]) => access.hasAccess)
        .map(([key]) => key);
      
      console.log(`   Enabled modules: ${enabledModules.length}`);
      console.log(`   Modules: ${enabledModules.join(', ')}`);
      
      // Test specific module access checks
      console.log(chalk.yellow('\n2. Testing module access checks...'));
      
      const testModules = ['hr-core', 'attendance', 'payroll', 'reports', 'nonexistent'];
      
      testModules.forEach(moduleKey => {
        const access = accessMap[moduleKey];
        if (access) {
          if (access.hasAccess) {
            console.log(chalk.green(`   ✅ ${moduleKey}: ENABLED (${access.tier} tier)`));
          } else {
            console.log(chalk.yellow(`   ⚠️ ${moduleKey}: DISABLED`));
          }
        } else {
          console.log(chalk.red(`   ❌ ${moduleKey}: NOT FOUND`));
        }
      });
      
      // Test dashboard compatibility
      console.log(chalk.yellow('\n3. Testing dashboard compatibility...'));
      
      const requiredModules = ['hr-core'];
      const recommendedModules = ['attendance', 'leave', 'documents', 'reports'];
      
      let compatible = true;
      
      // Check required modules
      console.log('   Required modules:');
      for (const module of requiredModules) {
        const access = accessMap[module];
        if (access && access.hasAccess) {
          console.log(chalk.green(`     ✅ ${module}: available`));
        } else {
          console.log(chalk.red(`     ❌ ${module}: missing`));
          compatible = false;
        }
      }
      
      // Check recommended modules
      let recommendedCount = 0;
      console.log('   Recommended modules:');
      for (const module of recommendedModules) {
        const access = accessMap[module];
        if (access && access.hasAccess) {
          console.log(chalk.green(`     ✅ ${module}: available`));
          recommendedCount++;
        } else {
          console.log(chalk.yellow(`     ⚠️ ${module}: not available`));
        }
      }
      
      // Final assessment
      console.log(chalk.blue('\n📊 Dashboard Compatibility Result:'));
      
      if (compatible) {
        if (recommendedCount >= 3) {
          console.log(chalk.green('🎉 EXCELLENT: Dashboard fully compatible with comprehensive features'));
        } else if (recommendedCount >= 2) {
          console.log(chalk.green('✅ GOOD: Dashboard compatible with most features'));
        } else {
          console.log(chalk.yellow('⚠️ BASIC: Dashboard compatible with basic features'));
        }
        
        console.log(chalk.green('\n🎯 SUCCESS: TechCorp Solutions dashboard compatibility FIXED!'));
        console.log(chalk.blue('📱 The HR app should now work properly with all enabled modules'));
        
      } else {
        console.log(chalk.red('❌ FAILED: Required modules are still missing'));
      }
      
    } else {
      console.log(chalk.red('❌ Platform API call failed:', response.data.message));
    }

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
    if (error.response) {
      console.error(chalk.red('Response status:'), error.response.status);
      console.error(chalk.red('Response data:'), JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testClientFix();