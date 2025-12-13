#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:5000';
const TENANT_ID = 'techcorp-solutions-d8f0689c';

async function testLicenseAPI() {
    try {
        console.log(chalk.blue('🔍 Testing License API...'));
        console.log(chalk.gray(`Testing endpoint: GET ${BASE_URL}/api/v1/licenses/${TENANT_ID}`));
        
        const response = await axios.get(`${BASE_URL}/api/v1/licenses/${TENANT_ID}`, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(chalk.green('✅ License API Response:'));
        console.log(chalk.gray('Status:'), response.status);
        console.log(chalk.gray('Data:'), JSON.stringify(response.data, null, 2));

        if (response.data.success && response.data.license) {
            const license = response.data.license;
            console.log(chalk.green('\n📋 License Summary:'));
            console.log(chalk.gray('  Tenant ID:'), license.tenantId);
            console.log(chalk.gray('  Status:'), license.status);
            console.log(chalk.gray('  Billing Cycle:'), license.billingCycle);
            console.log(chalk.gray('  Is Expired:'), license.isExpired);
            console.log(chalk.gray('  Is In Trial:'), license.isInTrial);
            console.log(chalk.gray('  Modules:'), license.modules.length);
            
            license.modules.forEach(module => {
                const status = module.enabled ? chalk.green('✓') : chalk.red('✗');
                console.log(`    ${status} ${module.key} (${module.tier})`);
            });
        }

    } catch (error) {
        if (error.response) {
            console.log(chalk.red('❌ API Error Response:'));
            console.log(chalk.gray('Status:'), error.response.status);
            console.log(chalk.gray('Data:'), JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.log(chalk.red('❌ Network Error:'));
            console.log(chalk.gray('No response received. Is the server running?'));
            console.log(chalk.gray('Make sure the server is running on'), BASE_URL);
        } else {
            console.log(chalk.red('❌ Error:'), error.message);
        }
    }
}

// Run the test
testLicenseAPI();