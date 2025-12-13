#!/usr/bin/env node

/**
 * Show Company Information Script
 * 
 * Displays the contents of the companies collection in each company database
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import multiTenantDB from '../config/multiTenant.js';

// Load environment variables
dotenv.config();

async function showCompanyInfo(companyName) {
    try {
        console.log(chalk.blue(`\n🏢 ${companyName.toUpperCase()}`));
        console.log(chalk.gray('─'.repeat(50)));

        // Get company connection
        const connection = await multiTenantDB.getCompanyConnection(companyName);

        // Try to get company info from companies collection
        try {
            // Define Company schema
            const mongoose = await import('mongoose');
            const companySchema = new mongoose.default.Schema({
                name: { type: String, required: true },
                sanitizedName: { type: String, required: true, unique: true },
                createdAt: { type: Date, default: Date.now },
                isActive: { type: Boolean, default: true },
                adminEmail: { type: String },
                phone: { type: String },
                address: { type: String },
                industry: { type: String },
                modules: [{ type: String }],
                settings: {
                    timezone: { type: String },
                    currency: { type: String },
                    language: { type: String },
                    workingHours: {
                        start: { type: String },
                        end: { type: String }
                    },
                    weekendDays: [{ type: Number }]
                }
            });

            const CompanyModel = connection.model('Company', companySchema);
            const companyInfo = await CompanyModel.findOne();

            if (companyInfo) {
                console.log(chalk.yellow('📋 Company Metadata:'));
                console.log(chalk.white(`  Name: ${companyInfo.name}`));
                console.log(chalk.white(`  Sanitized Name: ${companyInfo.sanitizedName}`));
                console.log(chalk.white(`  Industry: ${companyInfo.industry || 'Not specified'}`));
                console.log(chalk.white(`  Admin Email: ${companyInfo.adminEmail || 'Not specified'}`));
                console.log(chalk.white(`  Phone: ${companyInfo.phone || 'Not specified'}`));
                console.log(chalk.white(`  Address: ${companyInfo.address || 'Not specified'}`));
                console.log(chalk.white(`  Created: ${companyInfo.createdAt?.toISOString() || 'Unknown'}`));
                console.log(chalk.white(`  Status: ${companyInfo.isActive ? 'Active' : 'Inactive'}`));

                if (companyInfo.modules && companyInfo.modules.length > 0) {
                    console.log(chalk.yellow('🔧 Enabled Modules:'));
                    companyInfo.modules.forEach(module => {
                        console.log(chalk.cyan(`  - ${module}`));
                    });
                }

                if (companyInfo.settings) {
                    console.log(chalk.yellow('⚙️  Settings:'));
                    console.log(chalk.white(`  Timezone: ${companyInfo.settings.timezone || 'Not set'}`));
                    console.log(chalk.white(`  Currency: ${companyInfo.settings.currency || 'Not set'}`));
                    console.log(chalk.white(`  Language: ${companyInfo.settings.language || 'Not set'}`));
                    
                    if (companyInfo.settings.workingHours) {
                        console.log(chalk.white(`  Working Hours: ${companyInfo.settings.workingHours.start || 'Not set'} - ${companyInfo.settings.workingHours.end || 'Not set'}`));
                    }
                    
                    if (companyInfo.settings.weekendDays && companyInfo.settings.weekendDays.length > 0) {
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const weekendNames = companyInfo.settings.weekendDays.map(day => dayNames[day]).join(', ');
                        console.log(chalk.white(`  Weekend Days: ${weekendNames}`));
                    }
                }

                console.log(chalk.green('✅ Company info found'));
            } else {
                console.log(chalk.red('❌ No company info found in companies collection'));
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error accessing companies collection: ${error.message}`));
        }

        // Show other collections in this database
        try {
            const collections = await connection.db.listCollections().toArray();
            console.log(chalk.yellow('\n📊 Collections in this database:'));
            collections.forEach(collection => {
                console.log(chalk.cyan(`  - ${collection.name}`));
            });
        } catch (error) {
            console.log(chalk.gray('⚠️  Could not list collections'));
        }

    } catch (error) {
        console.log(chalk.red(`❌ Error accessing ${companyName}: ${error.message}`));
    }
}

async function showAllCompanyInfo() {
    try {
        console.log(chalk.blue('🏢 Company Database Information'));
        console.log(chalk.gray('==============================='));

        // Get list of companies
        const companies = await multiTenantDB.listCompanyDatabases();
        
        if (companies.length === 0) {
            console.log(chalk.yellow('📭 No companies found. Run: npm run seed-multitenant'));
            return;
        }

        console.log(chalk.green(`Found ${companies.length} companies\n`));

        // Show info for each company
        for (const company of companies) {
            await showCompanyInfo(company);
        }

        console.log(chalk.blue('\n💡 Why Each Company Has a "companies" Collection:'));
        console.log(chalk.gray('================================================'));
        console.log(chalk.white('1. 🔒 Self-contained: Each database stores its own metadata'));
        console.log(chalk.white('2. 🚀 Performance: No cross-database queries needed'));
        console.log(chalk.white('3. 🛡️  Security: Company settings are isolated'));
        console.log(chalk.white('4. 📦 Portability: Easy backup/restore with all data'));
        console.log(chalk.white('5. ⚙️  Flexibility: Independent configurations'));

        console.log(chalk.blue('\n🎯 This Design Allows:'));
        console.log(chalk.gray('====================='));
        console.log(chalk.white('- Different timezones per company'));
        console.log(chalk.white('- Different currencies per company'));
        console.log(chalk.white('- Different enabled modules per company'));
        console.log(chalk.white('- Different working hours per company'));
        console.log(chalk.white('- Independent company settings'));

    } catch (error) {
        console.error(chalk.red('❌ Error:'), error.message);
    } finally {
        // Close all connections
        await multiTenantDB.closeAllConnections();
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Interrupted'));
    await multiTenantDB.closeAllConnections();
    process.exit(0);
});

// Run the info display
showAllCompanyInfo();