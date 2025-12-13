#!/usr/bin/env node

/**
 * Test Platform Login
 * 
 * Tests platform authentication and token generation
 */

import axios from 'axios';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const PLATFORM_BASE_URL = process.env.PLATFORM_URL || 'http://localhost:5000/api/platform';

async function testPlatformLogin() {
    try {
        console.log(chalk.blue('🔐 Testing Platform Login'));
        console.log(chalk.gray('=========================\n'));

        // Test credentials
        const credentials = {
            email: 'platform@admin.com',
            password: 'PlatformAdmin123!'
        };

        console.log(chalk.yellow('🧪 Testing login with default credentials...'));
        console.log(chalk.gray(`Email: ${credentials.email}`));
        console.log(chalk.gray(`Password: ${credentials.password}\n`));

        // Attempt login
        const response = await axios.post(`${PLATFORM_BASE_URL}/auth/login`, credentials, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success) {
            console.log(chalk.green('✅ Platform login successful!\n'));
            
            const { user, token } = response.data.data;
            
            console.log(chalk.cyan('👤 User Information:'));
            console.log(chalk.white(`   Name: ${user.firstName} ${user.lastName}`));
            console.log(chalk.white(`   Email: ${user.email}`));
            console.log(chalk.white(`   Role: ${user.role}`));
            console.log(chalk.white(`   Status: ${user.status}`));
            console.log(chalk.white(`   Last Login: ${user.lastLogin || 'First time'}\n`));

            console.log(chalk.cyan('🔑 Authentication Token:'));
            console.log(chalk.gray(`   Token: ${token.substring(0, 50)}...`));
            console.log(chalk.gray(`   Length: ${token.length} characters\n`));

            // Test token validation
            console.log(chalk.yellow('🧪 Testing token validation...'));
            
            const meResponse = await axios.get(`${PLATFORM_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (meResponse.data.success) {
                console.log(chalk.green('✅ Token validation successful!'));
                console.log(chalk.gray(`   Validated user: ${meResponse.data.data.user.email}\n`));
            }

            // Test company management access
            console.log(chalk.yellow('🧪 Testing company management access...'));
            
            const companiesResponse = await axios.get(`${PLATFORM_BASE_URL}/companies`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (companiesResponse.data.success) {
                console.log(chalk.green('✅ Company management access successful!'));
                console.log(chalk.gray(`   Found ${companiesResponse.data.data.totalCompanies} companies\n`));
            }

            console.log(chalk.green('🎉 All platform tests passed!'));
            console.log(chalk.blue('\n🔧 You can now use this token for platform API calls:'));
            console.log(chalk.gray(`Authorization: Bearer ${token}\n`));

            return { user, token };

        } else {
            console.log(chalk.red('❌ Platform login failed'));
            console.log(chalk.gray(`Response: ${JSON.stringify(response.data, null, 2)}`));
            return null;
        }

    } catch (error) {
        console.log(chalk.red('❌ Platform login error:'));
        
        if (error.response) {
            console.log(chalk.red(`   Status: ${error.response.status}`));
            console.log(chalk.red(`   Message: ${error.response.data?.error?.message || error.response.statusText}`));
            
            if (error.response.status === 401) {
                console.log(chalk.yellow('\n💡 This usually means:'));
                console.log(chalk.gray('1. Platform admin user doesn\'t exist'));
                console.log(chalk.gray('2. Wrong email or password'));
                console.log(chalk.gray('3. Platform server is not running'));
                console.log(chalk.yellow('\n🔧 Solutions:'));
                console.log(chalk.gray('1. Create platform admin: npm run create-platform-admin'));
                console.log(chalk.gray('2. Check credentials in the script'));
                console.log(chalk.gray('3. Start platform server'));
            }
        } else {
            console.log(chalk.red(`   Error: ${error.message}`));
            
            if (error.code === 'ECONNREFUSED') {
                console.log(chalk.yellow('\n💡 Platform server is not running!'));
                console.log(chalk.gray('Start the platform server first:'));
                console.log(chalk.gray('node server/examples/platformIntegrationExample.js'));
            }
        }
        
        return null;
    }
}

async function testWithCustomCredentials(email, password) {
    try {
        console.log(chalk.blue(`🔐 Testing Platform Login with Custom Credentials`));
        console.log(chalk.gray('===============================================\n'));

        const credentials = { email, password };

        const response = await axios.post(`${PLATFORM_BASE_URL}/auth/login`, credentials, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success) {
            console.log(chalk.green('✅ Custom credentials login successful!'));
            return response.data.data;
        }

    } catch (error) {
        console.log(chalk.red('❌ Custom credentials login failed:'));
        console.log(chalk.red(`   ${error.response?.data?.error?.message || error.message}`));
        return null;
    }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.length >= 2) {
    // Custom credentials provided
    const [email, password] = args;
    testWithCustomCredentials(email, password);
} else {
    // Use default credentials
    testPlatformLogin();
}

/*
Usage:

1. Test with default credentials:
   npm run test-platform-login

2. Test with custom credentials:
   node server/scripts/testPlatformLogin.js your@email.com yourpassword

Default test credentials:
- Email: platform@admin.com
- Password: PlatformAdmin123!

Make sure to:
1. Create platform admin first: npm run create-platform-admin
2. Start platform server: node server/examples/platformIntegrationExample.js
*/