#!/usr/bin/env node

/**
 * Test Platform Company Management
 * 
 * Tests the platform company management API endpoints
 */

import axios from 'axios';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const PLATFORM_BASE_URL = 'http://localhost:5000/api/platform';

// Mock platform authentication for testing
const platformHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer platform-test-token'
};

async function testGetAllCompanies() {
    try {
        console.log(chalk.blue('🧪 Testing: Get All Companies'));
        console.log(chalk.gray('─'.repeat(40)));

        const response = await axios.get(`${PLATFORM_BASE_URL}/companies`, {
            headers: platformHeaders
        });

        if (response.data.success) {
            console.log(chalk.green('✅ Successfully retrieved companies'));
            console.log(chalk.yellow(`📊 Total Companies: ${response.data.data.totalCompanies}`));
            console.log(chalk.yellow(`🔧 Available Models: ${response.data.data.availableModels.length}`));
            
            response.data.data.companies.forEach((company, index) => {
                console.log(chalk.cyan(`\n${index + 1}. ${company.metadata.name || company.sanitizedName}`));
                console.log(chalk.gray(`   Database: ${company.database}`));
                console.log(chalk.gray(`   Industry: ${company.metadata.industry || 'Not specified'}`));
                console.log(chalk.gray(`   Users: ${company.statistics.users || 0}`));
                console.log(chalk.gray(`   Departments: ${company.statistics.departments || 0}`));
                console.log(chalk.gray(`   Collections: ${company.statistics.totalCollections || 0}`));
                console.log(chalk.gray(`   Status: ${company.metadata.isActive ? 'Active' : 'Inactive'}`));
            });
            
            return response.data.data.companies;
        } else {
            console.log(chalk.red('❌ Failed to retrieve companies'));
            return [];
        }
    } catch (error) {
        console.log(chalk.red(`❌ Error: ${error.response?.data?.error?.message || error.message}`));
        return [];
    }
}

async function testGetCompanyDetails(companyName) {
    try {
        console.log(chalk.blue(`\n🧪 Testing: Get Company Details - ${companyName}`));
        console.log(chalk.gray('─'.repeat(50)));

        const response = await axios.get(`${PLATFORM_BASE_URL}/companies/${companyName}`, {
            headers: platformHeaders
        });

        if (response.data.success) {
            const { company, statistics, collections, sampleData } = response.data.data;
            
            console.log(chalk.green('✅ Successfully retrieved company details'));
            console.log(chalk.yellow('\n📋 Company Information:'));
            console.log(chalk.white(`  Name: ${company.name}`));
            console.log(chalk.white(`  Industry: ${company.industry}`));
            console.log(chalk.white(`  Admin Email: ${company.adminEmail}`));
            console.log(chalk.white(`  Phone: ${company.phone || 'Not provided'}`));
            console.log(chalk.white(`  Address: ${company.address || 'Not provided'}`));
            console.log(chalk.white(`  Created: ${company.createdAt}`));
            console.log(chalk.white(`  Status: ${company.isActive ? 'Active' : 'Inactive'}`));

            if (company.modules && company.modules.length > 0) {
                console.log(chalk.yellow('\n🔧 Enabled Modules:'));
                company.modules.forEach(module => {
                    console.log(chalk.cyan(`  - ${module}`));
                });
            }

            if (company.settings) {
                console.log(chalk.yellow('\n⚙️ Settings:'));
                console.log(chalk.white(`  Timezone: ${company.settings.timezone}`));
                console.log(chalk.white(`  Currency: ${company.settings.currency}`));
                console.log(chalk.white(`  Language: ${company.settings.language}`));
                if (company.settings.workingHours) {
                    console.log(chalk.white(`  Working Hours: ${company.settings.workingHours.start} - ${company.settings.workingHours.end}`));
                }
            }

            console.log(chalk.yellow('\n📊 Statistics:'));
            Object.entries(statistics).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    console.log(chalk.white(`  ${key}: ${value}`));
                }
            });

            console.log(chalk.yellow('\n📁 Collections:'));
            collections.forEach(collection => {
                console.log(chalk.white(`  ${collection.name}: ${collection.documentCount} documents`));
            });

            return response.data.data;
        } else {
            console.log(chalk.red('❌ Failed to retrieve company details'));
            return null;
        }
    } catch (error) {
        console.log(chalk.red(`❌ Error: ${error.response?.data?.error?.message || error.message}`));
        return null;
    }
}

async function testCreateCompany() {
    try {
        console.log(chalk.blue('\n🧪 Testing: Create New Company'));
        console.log(chalk.gray('─'.repeat(40)));

        const newCompanyData = {
            name: 'Test Platform Company',
            industry: 'Technology',
            adminEmail: 'admin@testplatform.com',
            phone: '+1-555-TEST',
            address: '123 Platform Street, Test City',
            modules: ['hr-core', 'attendance', 'reports'],
            settings: {
                timezone: 'America/New_York',
                currency: 'USD',
                language: 'en',
                workingHours: { start: '09:00', end: '17:00' },
                weekendDays: [0, 6]
            }
        };

        const response = await axios.post(`${PLATFORM_BASE_URL}/companies`, newCompanyData, {
            headers: platformHeaders
        });

        if (response.data.success) {
            console.log(chalk.green('✅ Successfully created company'));
            console.log(chalk.yellow('📋 Created Company:'));
            console.log(chalk.white(`  Name: ${response.data.data.company.name}`));
            console.log(chalk.white(`  Sanitized Name: ${response.data.data.company.sanitizedName}`));
            console.log(chalk.white(`  Database: ${response.data.data.company.database}`));
            console.log(chalk.white(`  Admin Email: ${response.data.data.company.adminEmail}`));
            console.log(chalk.white(`  Industry: ${response.data.data.company.industry}`));
            
            return response.data.data.company;
        } else {
            console.log(chalk.red('❌ Failed to create company'));
            return null;
        }
    } catch (error) {
        console.log(chalk.red(`❌ Error: ${error.response?.data?.error?.message || error.message}`));
        return null;
    }
}

async function testUpdateCompany(companyName) {
    try {
        console.log(chalk.blue(`\n🧪 Testing: Update Company - ${companyName}`));
        console.log(chalk.gray('─'.repeat(50)));

        const updateData = {
            phone: '+1-555-UPDATED',
            modules: ['hr-core', 'attendance', 'reports', 'payroll'],
            settings: {
                timezone: 'America/Los_Angeles',
                currency: 'USD',
                language: 'en'
            }
        };

        const response = await axios.patch(`${PLATFORM_BASE_URL}/companies/${companyName}`, updateData, {
            headers: platformHeaders
        });

        if (response.data.success) {
            console.log(chalk.green('✅ Successfully updated company'));
            console.log(chalk.yellow('📋 Updated Company:'));
            console.log(chalk.white(`  Name: ${response.data.data.company.name}`));
            console.log(chalk.white(`  Phone: ${response.data.data.company.phone}`));
            console.log(chalk.white(`  Modules: ${response.data.data.company.modules?.join(', ')}`));
            console.log(chalk.white(`  Timezone: ${response.data.data.company.settings?.timezone}`));
            
            return response.data.data.company;
        } else {
            console.log(chalk.red('❌ Failed to update company'));
            return null;
        }
    } catch (error) {
        console.log(chalk.red(`❌ Error: ${error.response?.data?.error?.message || error.message}`));
        return null;
    }
}

async function testGetModulesAndModels() {
    try {
        console.log(chalk.blue('\n🧪 Testing: Get Available Modules and Models'));
        console.log(chalk.gray('─'.repeat(50)));

        const response = await axios.get(`${PLATFORM_BASE_URL}/companies/modules-and-models`, {
            headers: platformHeaders
        });

        if (response.data.success) {
            const { availableModels, moduleCategories, totalModels, totalModules } = response.data.data;
            
            console.log(chalk.green('✅ Successfully retrieved modules and models'));
            console.log(chalk.yellow(`📊 Total Models: ${totalModels}`));
            console.log(chalk.yellow(`🔧 Total Modules: ${totalModules}`));
            
            console.log(chalk.yellow('\n🔧 Module Categories:'));
            Object.entries(moduleCategories).forEach(([module, models]) => {
                console.log(chalk.cyan(`  ${module}:`));
                models.forEach(model => {
                    console.log(chalk.white(`    - ${model}`));
                });
            });
            
            return response.data.data;
        } else {
            console.log(chalk.red('❌ Failed to retrieve modules and models'));
            return null;
        }
    } catch (error) {
        console.log(chalk.red(`❌ Error: ${error.response?.data?.error?.message || error.message}`));
        return null;
    }
}

async function runPlatformTests() {
    try {
        console.log(chalk.blue('🌍 Platform Company Management Testing'));
        console.log(chalk.gray('======================================\n'));

        let testsPassed = 0;
        let totalTests = 0;

        // Test 1: Get all companies
        totalTests++;
        const companies = await testGetAllCompanies();
        if (companies.length >= 0) testsPassed++;

        // Test 2: Get modules and models
        totalTests++;
        const modulesData = await testGetModulesAndModels();
        if (modulesData) testsPassed++;

        // Test 3: Get company details (if companies exist)
        if (companies.length > 0) {
            totalTests++;
            const companyDetails = await testGetCompanyDetails(companies[0].sanitizedName);
            if (companyDetails) testsPassed++;
        }

        // Test 4: Create new company
        totalTests++;
        const newCompany = await testCreateCompany();
        if (newCompany) testsPassed++;

        // Test 5: Update company (if we created one)
        if (newCompany) {
            totalTests++;
            const updatedCompany = await testUpdateCompany(newCompany.sanitizedName);
            if (updatedCompany) testsPassed++;
        }

        // Summary
        console.log(chalk.blue('\n📊 Test Results Summary'));
        console.log(chalk.gray('========================'));
        console.log(chalk.white(`Total Tests: ${totalTests}`));
        console.log(chalk.green(`Passed: ${testsPassed}`));
        console.log(chalk.red(`Failed: ${totalTests - testsPassed}`));
        console.log(chalk.white(`Success Rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`));

        if (testsPassed === totalTests) {
            console.log(chalk.green('\n🎉 All platform tests passed!'));
            console.log(chalk.gray('Platform company management is working correctly.'));
        } else {
            console.log(chalk.yellow('\n⚠️ Some platform tests failed.'));
            console.log(chalk.gray('Check the error messages above for details.'));
        }

        console.log(chalk.blue('\n🔧 Platform API Endpoints:'));
        console.log(chalk.gray('GET    /api/platform/companies                     - List all companies'));
        console.log(chalk.gray('GET    /api/platform/companies/modules-and-models - Get available modules'));
        console.log(chalk.gray('GET    /api/platform/companies/:companyName       - Get company details'));
        console.log(chalk.gray('POST   /api/platform/companies                     - Create new company'));
        console.log(chalk.gray('PATCH  /api/platform/companies/:companyName       - Update company'));
        console.log(chalk.gray('DELETE /api/platform/companies/:companyName       - Delete/Archive company'));

    } catch (error) {
        console.error(chalk.red('❌ Platform testing failed:'), error.message);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Testing interrupted'));
    process.exit(0);
});

// Run the tests
runPlatformTests();