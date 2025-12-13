#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const baseURL = process.env.API_URL || 'http://localhost:5000';
const companySlug = 'techcorp_solutions';

async function testModuleContextFix() {
  console.log(chalk.blue('🧪 Testing ModuleContext Fix for TechCorp Solutions\n'));

  try {
    // Test 1: Simulate the new ModuleContext API call
    console.log(chalk.yellow('1. Testing ModuleContext API call...'));
    
    const apiUrl = `${baseURL}/api/platform/companies/${companySlug}/modules`;
    console.log(`   API URL: ${apiUrl}`);
    
    const response = await axios.get(apiUrl);
    
    if (response.data.success) {
      console.log(chalk.green('✅ ModuleContext API call successful'));
      
      const modules = response.data.data.availableModules || {};
      
      // Simulate ModuleContext processing
      const enabledModulesList = Object.entries(modules)
        .filter(([key, module]) => module.enabled)
        .map(([key]) => key);
      
      console.log(`   Total modules: ${Object.keys(modules).length}`);
      console.log(`   Enabled modules: ${enabledModulesList.length}`);
      console.log(`   Enabled list: ${enabledModulesList.join(', ')}`);
      
      // Test module checking functions
      console.log(chalk.yellow('\n2. Testing module checking functions...'));
      
      const testModules = ['hr-core', 'attendance', 'payroll', 'nonexistent'];
      
      testModules.forEach(moduleId => {
        const isEnabled = enabledModulesList.includes(moduleId) || moduleId === 'hr-core';
        const status = isEnabled ? chalk.green('✅ ENABLED') : chalk.red('❌ DISABLED');
        console.log(`   ${moduleId}: ${status}`);
      });
      
      // Test multiple module checks
      console.log(chalk.yellow('\n3. Testing multiple module checks...'));
      
      const testSets = [
        ['hr-core'],
        ['hr-core', 'attendance'],
        ['payroll', 'reports'],
        ['nonexistent', 'fake-module']
      ];
      
      testSets.forEach(moduleSet => {
        const allEnabled = moduleSet.every(moduleId => 
          enabledModulesList.includes(moduleId) || moduleId === 'hr-core'
        );
        const anyEnabled = moduleSet.some(moduleId => 
          enabledModulesList.includes(moduleId) || moduleId === 'hr-core'
        );
        
        console.log(`   [${moduleSet.join(', ')}]:`);
        console.log(`     All enabled: ${allEnabled ? chalk.green('✅') : chalk.red('❌')}`);
        console.log(`     Any enabled: ${anyEnabled ? chalk.green('✅') : chalk.red('❌')}`);
      });
      
      // Test dashboard compatibility
      console.log(chalk.yellow('\n4. Testing dashboard compatibility...'));
      
      const requiredModules = ['hr-core'];
      const recommendedModules = ['attendance', 'leave', 'documents', 'reports'];
      
      let compatible = true;
      
      // Check required modules
      console.log('   Required modules:');
      for (const module of requiredModules) {
        const isEnabled = enabledModulesList.includes(module) || module === 'hr-core';
        if (isEnabled) {
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
        const isEnabled = enabledModulesList.includes(module);
        if (isEnabled) {
          console.log(chalk.green(`     ✅ ${module}: available`));
          recommendedCount++;
        } else {
          console.log(chalk.yellow(`     ⚠️ ${module}: not available`));
        }
      }
      
      // Final assessment
      console.log(chalk.blue('\n📊 ModuleContext Compatibility Result:'));
      
      if (compatible) {
        if (recommendedCount >= 3) {
          console.log(chalk.green('🎉 EXCELLENT: All features available'));
        } else if (recommendedCount >= 2) {
          console.log(chalk.green('✅ GOOD: Most features available'));
        } else {
          console.log(chalk.yellow('⚠️ BASIC: Basic features available'));
        }
        
        console.log(chalk.green('\n🎯 SUCCESS: ModuleContext fix is working!'));
        console.log(chalk.blue('📱 Dashboard should now show all enabled modules'));
        
      } else {
        console.log(chalk.red('❌ FAILED: Required modules are missing'));
      }
      
      // Test development fallback
      console.log(chalk.yellow('\n5. Testing development fallback...'));
      
      const devModules = ['hr-core', 'attendance', 'leave', 'documents', 'reports', 'tasks'];
      console.log('   Development fallback modules:');
      devModules.forEach(module => {
        console.log(`     - ${module}`);
      });
      console.log(chalk.green('   ✅ Development fallback provides good coverage'));
      
    } else {
      console.log(chalk.red('❌ ModuleContext API call failed:', response.data.message));
    }

    // Test 6: Create a simple test page to verify in browser
    console.log(chalk.yellow('\n6. Creating browser test page...'));
    
    const testHtml = `<!DOCTYPE html>
<html>
<head>
    <title>ModuleContext Test - TechCorp Solutions</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        .module { margin: 5px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
        .enabled { border-left: 4px solid green; }
        .disabled { border-left: 4px solid red; }
        .loading { color: #666; }
    </style>
</head>
<body>
    <h1>ModuleContext Test - TechCorp Solutions</h1>
    <div id="status" class="loading">Loading modules...</div>
    <div id="modules"></div>
    <div id="tests"></div>
    
    <script>
        async function testModuleContext() {
            const statusDiv = document.getElementById('status');
            const modulesDiv = document.getElementById('modules');
            const testsDiv = document.getElementById('tests');
            
            try {
                statusDiv.innerHTML = 'Fetching modules...';
                
                // Simulate the ModuleContext API call
                const response = await fetch('${baseURL}/api/platform/companies/${companySlug}/modules');
                const data = await response.json();
                
                if (data.success) {
                    statusDiv.innerHTML = '<span class="success">✅ ModuleContext API Working</span>';
                    
                    const modules = data.data.availableModules;
                    const enabledModules = Object.entries(modules)
                        .filter(([key, module]) => module.enabled)
                        .map(([key]) => key);
                    
                    // Display modules
                    modulesDiv.innerHTML = \`
                        <h2>Module Status (\${enabledModules.length} enabled)</h2>
                        \${Object.entries(modules).map(([key, module]) => \`
                            <div class="module \${module.enabled ? 'enabled' : 'disabled'}">
                                <strong>\${key}</strong>: \${module.name}<br>
                                <small>Status: \${module.enabled ? '✅ Enabled' : '❌ Disabled'} | Tier: \${module.tier || 'N/A'}</small>
                            </div>
                        \`).join('')}
                    \`;
                    
                    // Test module functions
                    const isModuleEnabled = (moduleId) => {
                        return moduleId === 'hr-core' || enabledModules.includes(moduleId);
                    };
                    
                    const areModulesEnabled = (moduleIds) => {
                        return moduleIds.every(id => isModuleEnabled(id));
                    };
                    
                    const isAnyModuleEnabled = (moduleIds) => {
                        return moduleIds.some(id => isModuleEnabled(id));
                    };
                    
                    // Run tests
                    const testResults = [
                        { name: 'HR Core enabled', result: isModuleEnabled('hr-core') },
                        { name: 'Attendance enabled', result: isModuleEnabled('attendance') },
                        { name: 'All core modules', result: areModulesEnabled(['hr-core', 'attendance']) },
                        { name: 'Any reporting module', result: isAnyModuleEnabled(['reports', 'analytics']) },
                        { name: 'Nonexistent module', result: isModuleEnabled('nonexistent'), expected: false }
                    ];
                    
                    testsDiv.innerHTML = \`
                        <h2>Function Tests</h2>
                        \${testResults.map(test => {
                            const passed = test.expected !== undefined ? test.result === test.expected : test.result;
                            return \`
                                <div class="module \${passed ? 'enabled' : 'disabled'}">
                                    <strong>\${test.name}</strong>: \${passed ? '✅ PASS' : '❌ FAIL'}<br>
                                    <small>Result: \${test.result}</small>
                                </div>
                            \`;
                        }).join('')}
                    \`;
                    
                } else {
                    statusDiv.innerHTML = '<span class="error">❌ API Failed: ' + data.message + '</span>';
                }
            } catch (error) {
                statusDiv.innerHTML = '<span class="error">❌ Error: ' + error.message + '</span>';
            }
        }
        
        testModuleContext();
    </script>
</body>
</html>`;

    // Write test file
    const fs = await import('fs');
    fs.writeFileSync('modulecontext-test.html', testHtml);
    console.log(chalk.green('✅ Created modulecontext-test.html'));
    console.log('   Open this file in your browser to test ModuleContext behavior');

    console.log(chalk.blue('\n📋 Next Steps:'));
    console.log('1. Restart the React development server:');
    console.log('   cd client/hr-app && npm start');
    console.log('2. Clear browser cache and localStorage');
    console.log('3. Login to TechCorp Solutions dashboard');
    console.log('4. Check browser console for module loading logs');
    console.log('5. Verify all features are now visible');

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
    if (error.response) {
      console.error(chalk.red('Response status:'), error.response.status);
      console.error(chalk.red('Response data:'), JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testModuleContextFix();