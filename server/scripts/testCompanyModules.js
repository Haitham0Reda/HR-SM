#!/usr/bin/env node

/**
 * Test Company Module Management
 * 
 * Demonstrates how to view and manage modules for companies
 */

import axios from 'axios';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const PLATFORM_BASE_URL = 'http://localhost:5000/api/platform';

// First, let's get a platform token
async function getPlatformToken() {
    try {
        const response = await axios.post(`${PLATFORM_BASE_URL}/auth/login`, {
            email: 'platform@admin.com',
            password: 'PlatformAdmin123!'
        });

        if (response.data.success) {
            return response.data.data.token;
        }
        throw new Error('Login failed');
    } catch (error) {
        console.error(chalk.red('❌ Failed to get platform token:'), error.message);
        return null;
    }
}

async function getAllCompanies(token) {
    try {
        console.log(chalk.blue('📊 Getting All Companies'));
        console.log(chalk.gray('========================\n'));

        const response = await axios.get(`${PLATFORM_BASE_URL}/companies`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.success) {
            const companies = response.data.data.companies;
            console.log(chalk.green(`✅ Found ${companies.length} companies:\n`));

            companies.forEach((company, index) => {
                console.log(chalk.cyan(`${index + 1}. ${company.metadata.name || company.sanitizedName}`));
                console.log(chalk.gray(`   Database: ${company.database}`));
                console.log(chalk.gray(`   Industry: ${company.metadata.industry || 'Not specified'}`));
                console.log(chalk.gray(`   Modules: ${company.metadata.modules?.join(', ') || 'None specified'}`));
                console.log(chalk.gray(`   Users: ${company.statistics.users || 0}`));
                console.log(chalk.gray(`   Status: ${company.metadata.isActive ? 'Active' : 'Inactive'}\n`));
            });

            return companies;
        }
        return [];
    } catch (error) {
        console.error(chalk.red('❌ Error getting companies:'), error.message);
        return [];
    }
}

async function getCompanyModules(token, companyName) {
    try {
        console.log(chalk.blue(`🔧 Getting Modules for ${companyName}`));
        console.log(chalk.gray('='.repeat(50)));

        const response = await axios.get(`${PLATFORM_BASE_URL}/companies/${companyName}/modules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.success) {
            const { enabledModules, availableModules, totalAvailable, totalEnabled } = response.data.data;
            
            console.log(chalk.green(`✅ Module information retrieved`));
            console.log(chalk.yellow(`📊 Summary: ${totalEnabled}/${totalAvailable} modules enabled\n`));

            console.log(chalk.cyan('🟢 Enabled Modules:'));
            enabledModules.forEach(module => {
                const moduleInfo = availableModules[module];
                console.log(chalk.white(`  ✓ ${moduleInfo?.name || module} - ${moduleInfo?.description || 'No description'}`));
            });

            console.log(chalk.gray('\n🔘 Available Modules:'));
            Object.entries(availableModules).forEach(([key, module]) => {
                if (!module.enabled) {
                    console.log(chalk.gray(`  ○ ${module.name} - ${module.description}`));
                }
            });

            return { enabledModules, availableModules };
        }
        return null;
    } catch (error) {
        console.error(chalk.red('❌ Error getting company modules:'), error.message);
        return null;
    }
}

async function enableModuleForCompany(token, companyName, moduleName) {
    try {
        console.log(chalk.blue(`\n🔧 Enabling '${moduleName}' for ${companyName}`));
        console.log(chalk.gray('='.repeat(50)));

        const response = await axios.post(`${PLATFORM_BASE_URL}/companies/${companyName}/modules/${moduleName}/enable`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.success) {
            console.log(chalk.green(`✅ Module '${moduleName}' enabled successfully!`));
            console.log(chalk.white(`📋 Updated modules: ${response.data.data.modules.join(', ')}`));
            return true;
        }
        return false;
    } catch (error) {
        if (error.response?.data?.error?.code === 'MODULE_ALREADY_ENABLED') {
            console.log(chalk.yellow(`⚠️  Module '${moduleName}' is already enabled`));
        } else {
            console.error(chalk.red(`❌ Error enabling module: ${error.response?.data?.error?.message || error.message}`));
        }
        return false;
    }
}

async function disableModuleForCompany(token, companyName, moduleName) {
    try {
        console.log(chalk.blue(`\n🔧 Disabling '${moduleName}' for ${companyName}`));
        console.log(chalk.gray('='.repeat(50)));

        const response = await axios.delete(`${PLATFORM_BASE_URL}/companies/${companyName}/modules/${moduleName}/disable`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.success) {
            console.log(chalk.green(`✅ Module '${moduleName}' disabled successfully!`));
            console.log(chalk.white(`📋 Updated modules: ${response.data.data.modules.join(', ')}`));
            return true;
        }
        return false;
    } catch (error) {
        if (error.response?.data?.error?.code === 'MODULE_REQUIRED') {
            console.log(chalk.yellow(`⚠️  Module '${moduleName}' cannot be disabled (required)`));
        } else if (error.response?.data?.error?.code === 'MODULE_NOT_ENABLED') {
            console.log(chalk.yellow(`⚠️  Module '${moduleName}' is not currently enabled`));
        } else {
            console.error(chalk.red(`❌ Error disabling module: ${error.response?.data?.error?.message || error.message}`));
        }
        return false;
    }
}

async function updateCompanyModules(token, companyName, modules) {
    try {
        console.log(chalk.blue(`\n🔧 Bulk Update Modules for ${companyName}`));
        console.log(chalk.gray('='.repeat(50)));

        const response = await axios.patch(`${PLATFORM_BASE_URL}/companies/${companyName}/modules`, {
            modules
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.success) {
            console.log(chalk.green(`✅ Modules updated successfully!`));
            console.log(chalk.white(`📋 New modules: ${response.data.data.modules.join(', ')}`));
            return true;
        }
        return false;
    } catch (error) {
        console.error(chalk.red(`❌ Error updating modules: ${error.response?.data?.error?.message || error.message}`));
        return false;
    }
}

async function demonstrateModuleManagement() {
    try {
        console.log(chalk.blue('🏢 Company Module Management Demo'));
        console.log(chalk.gray('==================================\n'));

        // Get platform token
        console.log(chalk.yellow('🔐 Getting platform authentication token...'));
        const token = await getPlatformToken();
        if (!token) {
            console.log(chalk.red('❌ Failed to authenticate. Exiting.'));
            return;
        }
        console.log(chalk.green('✅ Platform authentication successful\n'));

        // Get all companies
        const companies = await getAllCompanies(token);
        if (companies.length === 0) {
            console.log(chalk.red('❌ No companies found. Run: npm run seed-multitenant'));
            return;
        }

        // Pick the first company for demonstration
        const testCompany = companies[0];
        const companyName = testCompany.sanitizedName;
        
        console.log(chalk.yellow(`🎯 Using '${testCompany.metadata.name || companyName}' for demonstration\n`));

        // Get current modules
        const moduleInfo = await getCompanyModules(token, companyName);
        if (!moduleInfo) return;

        // Demonstrate enabling a module
        console.log(chalk.blue('\n📝 Module Management Examples:'));
        console.log(chalk.gray('=============================='));

        // Try to enable 'reports' module
        await enableModuleForCompany(token, companyName, 'reports');

        // Try to enable 'surveys' module
        await enableModuleForCompany(token, companyName, 'surveys');

        // Show updated modules
        console.log(chalk.blue('\n📊 Updated Module Status:'));
        await getCompanyModules(token, companyName);

        // Demonstrate bulk update
        console.log(chalk.blue('\n🔄 Bulk Module Update Example:'));
        const newModules = ['hr-core', 'attendance', 'payroll', 'reports', 'documents', 'notifications'];
        await updateCompanyModules(token, companyName, newModules);

        // Show final status
        console.log(chalk.blue('\n📊 Final Module Status:'));
        await getCompanyModules(token, companyName);

        console.log(chalk.green('\n🎉 Module management demonstration completed!'));
        
        console.log(chalk.blue('\n🔧 Available API Endpoints:'));
        console.log(chalk.gray('GET    /api/platform/companies/:companyName/modules           - Get company modules'));
        console.log(chalk.gray('PATCH  /api/platform/companies/:companyName/modules           - Bulk update modules'));
        console.log(chalk.gray('POST   /api/platform/companies/:companyName/modules/:module/enable  - Enable module'));
        console.log(chalk.gray('DELETE /api/platform/companies/:companyName/modules/:module/disable - Disable module'));

        console.log(chalk.blue('\n💡 Usage Tips:'));
        console.log(chalk.gray('1. hr-core module is always required and cannot be disabled'));
        console.log(chalk.gray('2. Use bulk update for multiple module changes'));
        console.log(chalk.gray('3. Individual enable/disable for single module changes'));
        console.log(chalk.gray('4. Check module status before making changes'));

    } catch (error) {
        console.error(chalk.red('❌ Demo failed:'), error.message);
    }
}

// Run the demonstration
demonstrateModuleManagement();