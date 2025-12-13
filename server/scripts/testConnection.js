#!/usr/bin/env node

/**
 * Test Multi-Tenant Database Connections
 * 
 * Tests database connections and data access for all companies
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import multiTenantDB from '../config/multiTenant.js';
import { getModelForConnection, initializeAllModels } from '../config/sharedModels.js';

// Load environment variables
dotenv.config();

async function testCompanyConnection(companyName) {
    try {
        console.log(chalk.blue(`\n🧪 Testing ${companyName}...`));
        console.log(chalk.gray('─'.repeat(40)));

        // Get company connection
        const connection = await multiTenantDB.getCompanyConnection(companyName);
        console.log(chalk.green('✅ Database connection established'));

        // Try to get User model
        let UserModel;
        try {
            // First try to get from shared models
            UserModel = getModelForConnection(connection, 'User');
        } catch (error) {
            // If that fails, create a basic user schema
            const mongoose = await import('mongoose');
            const userSchema = new mongoose.default.Schema({
                email: String,
                role: String,
                personalInfo: {
                    firstName: String,
                    lastName: String
                }
            });
            UserModel = connection.model('User', userSchema);
        }

        // Test data access
        const userCount = await UserModel.countDocuments();
        console.log(chalk.yellow(`📊 Users in database: ${userCount}`));

        if (userCount > 0) {
            const sampleUser = await UserModel.findOne().select('email role personalInfo.firstName personalInfo.lastName');
            if (sampleUser) {
                console.log(chalk.cyan(`👤 Sample user: ${sampleUser.personalInfo?.firstName} ${sampleUser.personalInfo?.lastName}`));
                console.log(chalk.cyan(`📧 Email: ${sampleUser.email}`));
                console.log(chalk.cyan(`🔑 Role: ${sampleUser.role}`));
            }
        }

        // Test Department model
        let DepartmentModel;
        try {
            DepartmentModel = getModelForConnection(connection, 'Department');
            const deptCount = await DepartmentModel.countDocuments();
            console.log(chalk.yellow(`🏢 Departments: ${deptCount}`));

            if (deptCount > 0) {
                const sampleDept = await DepartmentModel.findOne().select('name code');
                console.log(chalk.cyan(`🏢 Sample department: ${sampleDept.name} (${sampleDept.code})`));
            }
        } catch (error) {
            console.log(chalk.gray('⚠️  Department model not available'));
        }

        // Test Company model
        try {
            const CompanyModel = connection.model('Company');
            const companyInfo = await CompanyModel.findOne();
            if (companyInfo) {
                console.log(chalk.cyan(`🏭 Company: ${companyInfo.name}`));
                console.log(chalk.cyan(`🌍 Industry: ${companyInfo.industry || 'Not specified'}`));
                console.log(chalk.cyan(`💰 Currency: ${companyInfo.settings?.currency || 'Not specified'}`));
            }
        } catch (error) {
            console.log(chalk.gray('⚠️  Company info not available'));
        }

        console.log(chalk.green('✅ Connection test passed'));
        return true;

    } catch (error) {
        console.log(chalk.red(`❌ Connection test failed: ${error.message}`));
        return false;
    }
}

async function testAllConnections() {
    try {
        console.log(chalk.blue('🌍 Multi-Tenant Connection Testing'));
        console.log(chalk.gray('==================================='));

        // Get list of companies
        const companies = await multiTenantDB.listCompanyDatabases();
        
        if (companies.length === 0) {
            console.log(chalk.yellow('📭 No companies found. Run: npm run seed-multitenant'));
            return;
        }

        console.log(chalk.green(`Found ${companies.length} companies to test\n`));

        let passedTests = 0;
        const totalTests = companies.length;

        // Test each company
        for (const company of companies) {
            const passed = await testCompanyConnection(company);
            if (passed) passedTests++;
        }

        // Summary
        console.log(chalk.blue('\n📊 Test Results Summary'));
        console.log(chalk.gray('========================'));
        console.log(chalk.white(`Total Companies: ${totalTests}`));
        console.log(chalk.green(`Passed: ${passedTests}`));
        console.log(chalk.red(`Failed: ${totalTests - passedTests}`));
        console.log(chalk.white(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`));

        if (passedTests === totalTests) {
            console.log(chalk.green('\n🎉 All connection tests passed!'));
            console.log(chalk.gray('Multi-tenant system is working correctly.'));
        } else {
            console.log(chalk.yellow('\n⚠️  Some connection tests failed.'));
            console.log(chalk.gray('Check the error messages above for details.'));
        }

        console.log(chalk.blue('\n🔧 Next Steps:'));
        console.log(chalk.gray('1. Start your server: npm run server'));
        console.log(chalk.gray('2. Test API endpoints: npm run test-multitenant'));
        console.log(chalk.gray('3. Try logging in with company credentials'));

    } catch (error) {
        console.error(chalk.red('❌ Testing failed:'), error.message);
    } finally {
        // Close all connections
        await multiTenantDB.closeAllConnections();
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Testing interrupted'));
    await multiTenantDB.closeAllConnections();
    process.exit(0);
});

// Run the tests
testAllConnections();