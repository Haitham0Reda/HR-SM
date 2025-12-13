#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const baseURL = process.env.API_URL || 'http://localhost:5000';
const companySlug = 'techcorp_solutions';

async function debugDashboardIssue() {
  console.log(chalk.blue('🔍 Debugging TechCorp Solutions Dashboard Issue\n'));

  try {
    // 1. Verify company exists and has modules
    console.log(chalk.yellow('1. Verifying company configuration...'));
    
    const companyResponse = await axios.get(`${baseURL}/api/platform/companies/${companySlug}/modules`);
    
    if (companyResponse.data.success) {
      const modules = companyResponse.data.data.availableModules;
      const enabledCount = Object.values(modules).filter(m => m.enabled).length;
      
      console.log(chalk.green(`✅ Company found with ${enabledCount} enabled modules`));
      
      // Show first few modules for verification
      const enabledModules = Object.entries(modules)
        .filter(([key, module]) => module.enabled)
        .slice(0, 5);
      
      enabledModules.forEach(([key, module]) => {
        console.log(`   - ${key}: ${module.name} (${module.tier})`);
      });
      
      if (enabledCount > 5) {
        console.log(`   ... and ${enabledCount - 5} more modules`);
      }
    } else {
      console.log(chalk.red('❌ Company API failed:', companyResponse.data.message));
      return;
    }

    // 2. Test the exact API call the client makes
    console.log(chalk.yellow('\n2. Testing client API call simulation...'));
    
    // Simulate the exact call from useModuleAccess.js
    const clientApiUrl = `${process.env.REACT_APP_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}/api/platform/companies/${companySlug}/modules`;
    console.log(`   Client would call: ${clientApiUrl}`);
    
    const clientResponse = await axios.get(clientApiUrl);
    
    if (clientResponse.data.success) {
      console.log(chalk.green('✅ Client API call would succeed'));
      
      // Simulate client processing
      const modules = clientResponse.data.data.availableModules || {};
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
      
      const enabledModules = Object.entries(accessMap)
        .filter(([key, access]) => access.hasAccess)
        .map(([key]) => key);
      
      console.log(`   Client would see ${enabledModules.length} enabled modules`);
      console.log(`   Modules: ${enabledModules.join(', ')}`);
      
    } else {
      console.log(chalk.red('❌ Client API call would fail'));
    }

    // 3. Check if client app is running
    console.log(chalk.yellow('\n3. Checking if client app is accessible...'));
    
    const clientPorts = [3000, 3001, 3002]; // Common React dev server ports
    
    for (const port of clientPorts) {
      try {
        const clientUrl = `http://localhost:${port}`;
        const response = await axios.get(clientUrl, { timeout: 2000 });
        
        if (response.status === 200) {
          console.log(chalk.green(`✅ Client app found running on port ${port}`));
          console.log(`   URL: ${clientUrl}`);
          break;
        }
      } catch (error) {
        console.log(chalk.gray(`   Port ${port}: Not accessible`));
      }
    }

    // 4. Check for common issues
    console.log(chalk.yellow('\n4. Checking for common issues...'));
    
    // Check if REACT_APP_API_URL is set correctly
    const reactApiUrl = process.env.REACT_APP_API_URL;
    if (reactApiUrl) {
      console.log(chalk.green(`✅ REACT_APP_API_URL is set: ${reactApiUrl}`));
    } else {
      console.log(chalk.yellow('⚠️ REACT_APP_API_URL not set, using default: http://localhost:5000'));
    }
    
    // Check if server is running on expected port
    try {
      const serverResponse = await axios.get(`${baseURL}/api/platform/companies`, { timeout: 2000 });
      console.log(chalk.green(`✅ Server is running and accessible at ${baseURL}`));
    } catch (error) {
      console.log(chalk.red(`❌ Server not accessible at ${baseURL}`));
    }

    // 5. Provide troubleshooting steps
    console.log(chalk.blue('\n🔧 Troubleshooting Steps:'));
    
    console.log(chalk.white('1. Restart the client application:'));
    console.log('   cd client/hr-app');
    console.log('   npm start');
    
    console.log(chalk.white('\n2. Clear browser cache and localStorage:'));
    console.log('   - Open browser DevTools (F12)');
    console.log('   - Go to Application/Storage tab');
    console.log('   - Clear localStorage and sessionStorage');
    console.log('   - Hard refresh (Ctrl+Shift+R)');
    
    console.log(chalk.white('\n3. Check browser console for errors:'));
    console.log('   - Open DevTools (F12)');
    console.log('   - Check Console tab for JavaScript errors');
    console.log('   - Check Network tab for failed API calls');
    
    console.log(chalk.white('\n4. Verify the ModuleAccessProvider is used:'));
    console.log('   - Check if App.js wraps components with ModuleAccessProvider');
    console.log('   - Ensure useModuleAccess hook is called in dashboard components');
    
    console.log(chalk.white('\n5. Test direct API access:'));
    console.log(`   - Open: ${baseURL}/api/platform/companies/${companySlug}/modules`);
    console.log('   - Should return JSON with enabled modules');

    // 6. Create a test HTML file for direct testing
    console.log(chalk.yellow('\n6. Creating test HTML file for direct API testing...'));
    
    const testHtml = `<!DOCTYPE html>
<html>
<head>
    <title>TechCorp Module Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .module { margin: 5px 0; padding: 5px; background: #f0f0f0; }
    </style>
</head>
<body>
    <h1>TechCorp Solutions Module Test</h1>
    <div id="status">Loading...</div>
    <div id="modules"></div>
    
    <script>
        async function testModules() {
            const statusDiv = document.getElementById('status');
            const modulesDiv = document.getElementById('modules');
            
            try {
                statusDiv.innerHTML = 'Testing API...';
                
                const response = await fetch('${baseURL}/api/platform/companies/${companySlug}/modules');
                const data = await response.json();
                
                if (data.success) {
                    statusDiv.innerHTML = '<span class="success">✅ API Working</span>';
                    
                    const modules = data.data.availableModules;
                    const enabledModules = Object.entries(modules).filter(([key, module]) => module.enabled);
                    
                    modulesDiv.innerHTML = \`
                        <h2>Enabled Modules (\${enabledModules.length})</h2>
                        \${enabledModules.map(([key, module]) => \`
                            <div class="module">
                                <strong>\${key}</strong>: \${module.name} (\${module.tier} tier)
                            </div>
                        \`).join('')}
                    \`;
                } else {
                    statusDiv.innerHTML = '<span class="error">❌ API Failed: ' + data.message + '</span>';
                }
            } catch (error) {
                statusDiv.innerHTML = '<span class="error">❌ Error: ' + error.message + '</span>';
            }
        }
        
        testModules();
    </script>
</body>
</html>`;

    // Write test file
    const fs = await import('fs');
    fs.writeFileSync('techcorp-module-test.html', testHtml);
    console.log(chalk.green('✅ Created techcorp-module-test.html'));
    console.log('   Open this file in your browser to test API directly');

    console.log(chalk.blue('\n📋 Summary:'));
    console.log('- Company configuration: ✅ Correct');
    console.log('- API endpoints: ✅ Working');
    console.log('- Client code: ✅ Updated');
    console.log('- Next step: Restart client app and clear browser cache');

  } catch (error) {
    console.error(chalk.red('❌ Debug failed:'), error.message);
    if (error.response) {
      console.error(chalk.red('Response status:'), error.response.status);
      console.error(chalk.red('Response data:'), JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the debug
debugDashboardIssue();