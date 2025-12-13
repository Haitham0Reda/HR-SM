#!/usr/bin/env node

/**
 * Multi-Tenant Test Script
 * 
 * Tests the multi-tenant system by making API calls to different companies
 * Usage: npm run test-multitenant
 */

import axios from 'axios';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.CLIENT_URL?.replace('3000', '5000') || 'http://localhost:5000';

// Test companies and their credentials
const TEST_COMPANIES = [
    {
        name: 'TechCorp Solutions',
        sanitizedName: 'techcorp_solutions',
        credentials: {
            admin: { email: 'admin@techcorp.com', password: 'admin123' },
            hr: { email: 'hr@techcorp.com', password: 'hr123' },
            employee: { email: 'john.doe@techcorp.com', password: 'employee123' }
        }
    },
    {
        name: 'Global Manufacturing Inc',
        sanitizedName: 'global_manufacturing_inc',
        credentials: {
            admin: { email: 'admin@globalmanuf.com', password: 'admin123' },
            hr: { email: 'hr@globalmanuf.com', password: 'hr123' },
            employee: { email: 'john.doe@globalmanuf.com', password: 'employee123' }
        }
    },
    {
        name: 'Healthcare Plus',
        sanitizedName: 'healthcare_plus',
        credentials: {
            admin: { email: 'admin@healthcareplus.com', password: 'admin123' },
            hr: { email: 'hr@healthcareplus.com', password: 'hr123' },
            employee: { email: 'john.doe@healthcareplus.com', password: 'employee123' }
        }
    }
];

async function testLogin(company, role, credentials) {
    try {
        console.log(chalk.yellow(`    Testing ${role} login...`));

        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: credentials.email,
            password: credentials.password
        }, {
            headers: {
                'x-company-id': company.sanitizedName,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success) {
            console.log(chalk.green(`      ✅ ${role} login successful`));
            console.log(chalk.gray(`      Token: ${response.data.data.token.substring(0, 20)}...`));
            console.log(chalk.gray(`      User: ${response.data.data.user.personalInfo.firstName} ${response.data.data.user.personalInfo.lastName}`));
            console.log(chalk.gray(`      Role: ${response.data.data.user.role}`));
            return response.data.data.token;
        } else {
            console.log(chalk.red(`      ❌ ${role} login failed: ${response.data.message}`));
            return null;
        }
    } catch (error) {
        console.log(chalk.red(`      ❌ ${role} login error: ${error.response?.data?.message || error.message}`));
        return null;
    }
}

async function testTokenVerification(company, token) {
    try {
        console.log(chalk.yellow('    Testing token verification...'));

        const response = await axios.post(`${API_BASE_URL}/api/auth/verify`, {}, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-company-id': company.sanitizedName,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success) {
            console.log(chalk.green('      ✅ Token verification successful'));
            console.log(chalk.gray(`      Company: ${response.data.data.company.name}`));
            return true;
        } else {
            console.log(chalk.red(`      ❌ Token verification failed: ${response.data.message}`));
            return false;
        }
    } catch (error) {
        console.log(chalk.red(`      ❌ Token verification error: ${error.response?.data?.message || error.message}`));
        return false;
    }
}

async function testEmployeesList(company, token) {
    try {
        console.log(chalk.yellow('    Testing employees list...'));

        const response = await axios.get(`${API_BASE_URL}/api/employees`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-company-id': company.sanitizedName
            }
        });

        if (response.data.success) {
            console.log(chalk.green(`      ✅ Employees list retrieved: ${response.data.count} employees`));
            console.log(chalk.gray(`      Company: ${response.data.company}`));
            return true;
        } else {
            console.log(chalk.red(`      ❌ Employees list failed: ${response.data.message}`));
            return false;
        }
    } catch (error) {
        console.log(chalk.red(`      ❌ Employees list error: ${error.response?.data?.message || error.message}`));
        return false;
    }
}

async function testCompanyInfo(company, token) {
    try {
        console.log(chalk.yellow('    Testing company info...'));

        const response = await axios.get(`${API_BASE_URL}/api/company/info`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-company-id': company.sanitizedName
            }
        });

        if (response.data.success) {
            console.log(chalk.green('      ✅ Company info retrieved'));
            console.log(chalk.gray(`      Name: ${response.data.data.name}`));
            console.log(chalk.gray(`      Database: hrsm_${response.data.data.sanitizedName}`));
            return true;
        } else {
            console.log(chalk.red(`      ❌ Company info failed: ${response.data.message}`));
            return false;
        }
    } catch (error) {
        console.log(chalk.red(`      ❌ Company info error: ${error.response?.data?.message || error.message}`));
        return false;
    }
}

async function testCompany(company) {
    try {
        console.log(chalk.blue(`\n🏢 Testing ${company.name}`));
        console.log(chalk.gray(`   Database: hrsm_${company.sanitizedName}`));
        console.log(chalk.gray('─'.repeat(50)));

        let adminToken = null;
        let testsPassed = 0;
        let totalTests = 0;

        // Test admin login
        totalTests++;
        adminToken = await testLogin(company, 'admin', company.credentials.admin);
        if (adminToken) testsPassed++;

        if (adminToken) {
            // Test token verification
            totalTests++;
            if (await testTokenVerification(company, adminToken)) testsPassed++;

            // Test company info
            totalTests++;
            if (await testCompanyInfo(company, adminToken)) testsPassed++;

            // Test employees list (if route exists)
            totalTests++;
            if (await testEmployeesList(company, adminToken)) testsPassed++;
        }

        // Test HR login
        totalTests++;
        const hrToken = await testLogin(company, 'hr', company.credentials.hr);
        if (hrToken) testsPassed++;

        // Test employee login
        totalTests++;
        const employeeToken = await testLogin(company, 'employee', company.credentials.employee);
        if (employeeToken) testsPassed++;

        console.log(chalk.blue(`\n    📊 Results: ${testsPassed}/${totalTests} tests passed`));
        
        if (testsPassed === totalTests) {
            console.log(chalk.green('    ✅ All tests passed!'));
        } else {
            console.log(chalk.yellow(`    ⚠️  ${totalTests - testsPassed} tests failed`));
        }

        return { passed: testsPassed, total: totalTests };

    } catch (error) {
        console.error(chalk.red(`❌ Error testing ${company.name}:`), error.message);
        return { passed: 0, total: 1 };
    }
}

async function testMultiTenant() {
    try {
        console.log(chalk.blue('🧪 Multi-Tenant System Testing'));
        console.log(chalk.gray('==============================='));
        console.log(chalk.gray(`API Base URL: ${API_BASE_URL}`));
        console.log(chalk.gray(`Testing ${TEST_COMPANIES.length} companies\n`));

        let totalPassed = 0;
        let totalTests = 0;

        for (const company of TEST_COMPANIES) {
            const result = await testCompany(company);
            totalPassed += result.passed;
            totalTests += result.total;
        }

        console.log(chalk.blue('\n📋 Overall Test Results'));
        console.log(chalk.gray('========================'));
        console.log(chalk.white(`Total Tests: ${totalTests}`));
        console.log(chalk.green(`Passed: ${totalPassed}`));
        console.log(chalk.red(`Failed: ${totalTests - totalPassed}`));
        console.log(chalk.white(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`));

        if (totalPassed === totalTests) {
            console.log(chalk.green('\n🎉 All multi-tenant tests passed!'));
            console.log(chalk.gray('The multi-tenant system is working correctly.'));
        } else {
            console.log(chalk.yellow('\n⚠️  Some tests failed.'));
            console.log(chalk.gray('Check the server logs and ensure:'));
            console.log(chalk.gray('1. The server is running on the correct port'));
            console.log(chalk.gray('2. Multi-tenant routes are properly configured'));
            console.log(chalk.gray('3. Company databases have been seeded'));
        }

        console.log(chalk.blue('\n🔧 Next Steps:'));
        console.log(chalk.gray('1. Run: npm run list-companies'));
        console.log(chalk.gray('2. Check server logs for any errors'));
        console.log(chalk.gray('3. Test the frontend with different company logins'));

    } catch (error) {
        console.error(chalk.red('❌ Testing failed:'), error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Testing interrupted'));
    process.exit(0);
});

// Run the tests
testMultiTenant();