#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const baseURL = process.env.API_URL || 'http://localhost:5000';
const companySlug = 'techcorp_solutions';

async function testTechCorpDashboard() {
  console.log(chalk.blue('🧪 Testing TechCorp Solutions Dashboard Compatibility\n'));

  try {
    // Test 1: Check if company exists in platform API
    console.log(chalk.yellow('1. Testing platform API - Get all companies...'));
    const companiesResponse = await axios.get(`${baseURL}/api/platform/companies`);
    
    if (companiesResponse.data.success) {
      const techcorp = companiesResponse.data.data.companies.find(c => c.slug === companySlug);
      if (techcorp) {
        console.log(chalk.green('✅ TechCorp found in platform'));
        console.log(`   Status: ${techcorp.status}`);
        console.log(`   Subscription: ${techcorp.subscription?.plan}`);
        
        // Count enabled modules
        const enabledModules = Object.entries(techcorp.modules || {})
          .filter(([key, config]) => config.enabled)
          .map(([key]) => key);
        
        console.log(`   Enabled modules: ${enabledModules.length}`);
        console.log(`   Modules: ${enabledModules.join(', ')}`);
      } else {
        console.log(chalk.red('❌ TechCorp not found in platform'));
        return;
      }
    } else {
      console.log(chalk.red('❌ Platform API failed'));
      return;
    }

    // Test 2: Check company-specific modules API
    console.log(chalk.yellow('\n2. Testing platform API - Get company modules...'));
    const modulesResponse = await axios.get(`${baseURL}/api/platform/companies/${companySlug}/modules`);
    
    if (modulesResponse.data.success) {
      console.log(chalk.green('✅ Company modules API working'));
      
      const availableModules = modulesResponse.data.data.availableModules;
      const enabledCount = Object.values(availableModules).filter(m => m.enabled).length;
      const totalCount = Object.keys(availableModules).length;
      
      console.log(`   Available modules: ${totalCount}`);
      console.log(`   Enabled modules: ${enabledCount}`);
      
      if (enabledCount > 0) {
        console.log(chalk.green('   ✅ Modules are properly enabled'));
        
        // List enabled modules with their tiers
        console.log('   Enabled module details:');
        Object.entries(availableModules)
          .filter(([key, module]) => module.enabled)
          .forEach(([key, module]) => {
            console.log(`     - ${key}: ${module.name} (${module.tier} tier)`);
          });
      } else {
        console.log(chalk.red('   ❌ No modules enabled - dashboard will have compatibility issues'));
      }
    } else {
      console.log(chalk.red('❌ Company modules API failed:', modulesResponse.data.message));
    }

    // Test 3: Check available modules and models
    console.log(chalk.yellow('\n3. Testing available modules API...'));
    const availableResponse = await axios.get(`${baseURL}/api/platform/companies/modules-and-models`);
    
    if (availableResponse.data.success) {
      console.log(chalk.green('✅ Available modules API working'));
      console.log(`   Total available modules: ${availableResponse.data.data.totalModules}`);
      console.log(`   Module categories: ${Object.keys(availableResponse.data.data.moduleCategories).join(', ')}`);
    } else {
      console.log(chalk.red('❌ Available modules API failed'));
    }

    // Test 4: Test company API without auth (should fail gracefully)
    console.log(chalk.yellow('\n4. Testing company API (no auth - should fail gracefully)...'));
    try {
      const companyApiResponse = await axios.get(`${baseURL}/api/company/modules`, {
        headers: {
          'x-company-slug': companySlug
        }
      });
      
      console.log(chalk.red('❌ Company API should require authentication'));
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(chalk.green('✅ Company API properly requires authentication'));
      } else {
        console.log(chalk.yellow('⚠️ Company API error:', error.message));
      }
    }

    // Test 5: Check if all required modules for dashboard are available
    console.log(chalk.yellow('\n5. Checking dashboard compatibility...'));
    
    const requiredModules = ['hr-core']; // Core module is required
    const recommendedModules = ['attendance', 'leave', 'documents', 'reports'];
    
    const moduleData = modulesResponse.data.data.availableModules;
    
    // Check required modules
    let allRequiredEnabled = true;
    console.log('   Required modules:');
    for (const module of requiredModules) {
      if (moduleData[module] && moduleData[module].enabled) {
        console.log(chalk.green(`     ✅ ${module}: enabled`));
      } else {
        console.log(chalk.red(`     ❌ ${module}: disabled or missing`));
        allRequiredEnabled = false;
      }
    }
    
    // Check recommended modules
    let recommendedCount = 0;
    console.log('   Recommended modules:');
    for (const module of recommendedModules) {
      if (moduleData[module] && moduleData[module].enabled) {
        console.log(chalk.green(`     ✅ ${module}: enabled`));
        recommendedCount++;
      } else {
        console.log(chalk.yellow(`     ⚠️ ${module}: disabled or missing`));
      }
    }

    // Final assessment
    console.log(chalk.blue('\n📊 Dashboard Compatibility Assessment:'));
    
    if (allRequiredEnabled) {
      console.log(chalk.green('✅ All required modules are enabled'));
      
      if (recommendedCount >= 3) {
        console.log(chalk.green('🎉 EXCELLENT: Dashboard fully compatible with comprehensive module access'));
      } else if (recommendedCount >= 2) {
        console.log(chalk.green('✅ GOOD: Dashboard compatible with good module coverage'));
      } else if (recommendedCount >= 1) {
        console.log(chalk.yellow('⚠️ BASIC: Dashboard compatible but with limited features'));
      } else {
        console.log(chalk.yellow('⚠️ MINIMAL: Dashboard compatible but only basic features available'));
      }
      
      console.log(chalk.green('\n🎯 RESULT: TechCorp Solutions dashboard is COMPATIBLE with enabled modules!'));
      
    } else {
      console.log(chalk.red('❌ Required modules are missing - dashboard will have compatibility issues'));
      console.log(chalk.red('\n🚨 RESULT: Dashboard compatibility issues detected!'));
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
testTechCorpDashboard();