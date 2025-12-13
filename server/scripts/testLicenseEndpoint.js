#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:5000';
const TENANT_ID = 'techcorp-solutions-d8f0689c';

async function testLicenseEndpoint() {
    try {
        console.log(chalk.blue('🔍 Testing License Endpoint Availability...'));
        
        const endpoint = `${BASE_URL}/api/v1/licenses/${TENANT_ID}`;
        console.log(chalk.gray(`Testing: ${endpoint}`));
        
        // Test without auth to see if endpoint exists
        const response = await axios.get(endpoint, {
            timeout: 5000,
            validateStatus: function (status) {
                // Accept any status code to see what we get
                return true;
            }
        });

        console.log(chalk.green('✅ Endpoint Response:'));
        console.log(chalk.gray('Status:'), response.status);
        console.log(chalk.gray('Status Text:'), response.statusText);
        
        if (response.status === 401) {
            console.log(chalk.green('✅ Endpoint exists and requires authentication (expected)'));
            console.log(chalk.yellow('💡 The 404 error should now be resolved!'));
            console.log(chalk.gray('The frontend should now get a 401 (Unauthorized) instead of 404 (Not Found)'));
        } else if (response.status === 404) {
            console.log(chalk.red('❌ Endpoint still returns 404 - route may not be registered'));
        } else {
            console.log(chalk.blue('ℹ️  Unexpected status:'), response.status);
            console.log(chalk.gray('Response:'), JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log(chalk.red('❌ Connection refused - server is not running'));
            console.log(chalk.yellow('💡 Start the server with: npm run dev'));
        } else {
            console.log(chalk.red('❌ Error:'), error.message);
        }
    }
}

console.log(chalk.blue.bold('🧪 License Endpoint Test\n'));
testLicenseEndpoint();