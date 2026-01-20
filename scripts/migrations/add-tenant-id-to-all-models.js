#!/usr/bin/env node

/**
 * Migration Script: Add tenantId to All Models
 * 
 * This script adds tenantId field to all models that were missing it
 * and ensures proper tenant isolation across the entire system.
 * 
 * Models to migrate:
 * - Event
 * - Survey
 * - SurveyNotification
 * - Report
 * - ReportConfig
 * - ReportExecution
 * - ReportExport
 * - DashboardConfig
 * - DocumentTemplate
 * - RequestControl
 * 
 * Usage: node scripts/migrations/add-tenant-id-to-all-models.js
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

// Import models
import Event from '../../server/modules/events/models/event.model.js';
import Survey from '../../server/modules/surveys/models/survey.model.js';
import SurveyNotification from '../../server/modules/surveys/models/surveyNotification.model.js';
import Report from '../../server/modules/reports/models/report.model.js';
import ReportConfig from '../../server/modules/reports/models/reportConfig.model.js';
import ReportExecution from '../../server/modules/reports/models/reportExecution.model.js';
import ReportExport from '../../server/modules/reports/models/reportExport.model.js';
import DashboardConfig from '../../server/modules/dashboard/models/dashboardConfig.model.js';
import DocumentTemplate from '../../server/modules/documents/models/documentTemplate.model.js';
import RequestControl from '../../server/modules/hr-core/requests/models/requestControl.model.js';

// Default tenant ID (you may need to adjust this based on your setup)
const DEFAULT_TENANT_ID = 'default_tenant';

// Available tenant IDs (add your actual tenant IDs here)
const AVAILABLE_TENANTS = [
    'default_tenant',
    'techcorp_solutions'
];

async function connectToDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

async function migrateCollection(Model, collectionName, defaultTenantId = DEFAULT_TENANT_ID) {
    console.log(`\n🔄 Migrating ${collectionName}...`);

    try {
        // Count documents without tenantId
        const countWithoutTenant = await Model.countDocuments({
            $or: [
                { tenantId: { $exists: false } },
                { tenantId: null },
                { tenantId: '' }
            ]
        });

        if (countWithoutTenant === 0) {
            console.log(`✅ ${collectionName}: All documents already have tenantId`);
            return { updated: 0, errors: 0 };
        }

        console.log(`📊 ${collectionName}: Found ${countWithoutTenant} documents without tenantId`);

        // Update documents without tenantId
        const result = await Model.updateMany(
            {
                $or: [
                    { tenantId: { $exists: false } },
                    { tenantId: null },
                    { tenantId: '' }
                ]
            },
            {
                $set: { tenantId: defaultTenantId }
            }
        );

        console.log(`✅ ${collectionName}: Updated ${result.modifiedCount} documents`);
        return { updated: result.modifiedCount, errors: 0 };

    } catch (error) {
        console.error(`❌ ${collectionName}: Migration failed:`, error.message);
        return { updated: 0, errors: 1 };
    }
}

async function migrateDashboardConfig() {
    console.log(`\n🔄 Migrating DashboardConfig (special case)...`);

    try {
        // DashboardConfig should have one document per tenant
        const existingConfigs = await DashboardConfig.find({});

        if (existingConfigs.length === 0) {
            console.log(`📊 DashboardConfig: No existing configurations found`);
            return { updated: 0, errors: 0 };
        }

        let updated = 0;
        let errors = 0;

        for (const config of existingConfigs) {
            if (!config.tenantId) {
                config.tenantId = DEFAULT_TENANT_ID;
                try {
                    await config.save();
                    updated++;
                    console.log(`✅ DashboardConfig: Updated config ${config._id}`);
                } catch (error) {
                    console.error(`❌ DashboardConfig: Failed to update ${config._id}:`, error.message);
                    errors++;
                }
            }
        }

        // Create default configs for other tenants if needed
        for (const tenantId of AVAILABLE_TENANTS) {
            const existingConfig = await DashboardConfig.findOne({ tenantId });
            if (!existingConfig) {
                try {
                    await DashboardConfig.create({ tenantId });
                    console.log(`✅ DashboardConfig: Created default config for tenant ${tenantId}`);
                    updated++;
                } catch (error) {
                    console.error(`❌ DashboardConfig: Failed to create config for ${tenantId}:`, error.message);
                    errors++;
                }
            }
        }

        return { updated, errors };

    } catch (error) {
        console.error(`❌ DashboardConfig: Migration failed:`, error.message);
        return { updated: 0, errors: 1 };
    }
}

async function migrateReportConfig() {
    console.log(`\n🔄 Migrating ReportConfig (special case)...`);

    try {
        // ReportConfig should have one document per tenant per organization
        const existingConfigs = await ReportConfig.find({});

        if (existingConfigs.length === 0) {
            console.log(`📊 ReportConfig: No existing configurations found`);
            return { updated: 0, errors: 0 };
        }

        let updated = 0;
        let errors = 0;

        for (const config of existingConfigs) {
            if (!config.tenantId) {
                config.tenantId = DEFAULT_TENANT_ID;
                try {
                    await config.save();
                    updated++;
                    console.log(`✅ ReportConfig: Updated config ${config._id}`);
                } catch (error) {
                    console.error(`❌ ReportConfig: Failed to update ${config._id}:`, error.message);
                    errors++;
                }
            }
        }

        return { updated, errors };

    } catch (error) {
        console.error(`❌ ReportConfig: Migration failed:`, error.message);
        return { updated: 0, errors: 1 };
    }
}

async function runMigration() {
    console.log('🚀 Starting tenant ID migration for all models...\n');

    const results = {
        totalUpdated: 0,
        totalErrors: 0,
        collections: {}
    };

    // Define migrations
    const migrations = [
        { model: Event, name: 'Event' },
        { model: Survey, name: 'Survey' },
        { model: SurveyNotification, name: 'SurveyNotification' },
        { model: Report, name: 'Report' },
        { model: ReportExecution, name: 'ReportExecution' },
        { model: ReportExport, name: 'ReportExport' },
        { model: DocumentTemplate, name: 'DocumentTemplate' },
        { model: RequestControl, name: 'RequestControl' }
    ];

    // Run standard migrations
    for (const { model, name } of migrations) {
        const result = await migrateCollection(model, name);
        results.collections[name] = result;
        results.totalUpdated += result.updated;
        results.totalErrors += result.errors;
    }

    // Run special case migrations
    const dashboardResult = await migrateDashboardConfig();
    results.collections['DashboardConfig'] = dashboardResult;
    results.totalUpdated += dashboardResult.updated;
    results.totalErrors += dashboardResult.errors;

    const reportConfigResult = await migrateReportConfig();
    results.collections['ReportConfig'] = reportConfigResult;
    results.totalUpdated += reportConfigResult.updated;
    results.totalErrors += reportConfigResult.errors;

    // Print summary
    console.log('\n📋 Migration Summary:');
    console.log('='.repeat(50));

    for (const [collection, result] of Object.entries(results.collections)) {
        const status = result.errors > 0 ? '⚠️' : '✅';
        console.log(`${status} ${collection}: ${result.updated} updated, ${result.errors} errors`);
    }

    console.log('='.repeat(50));
    console.log(`📊 Total: ${results.totalUpdated} documents updated, ${results.totalErrors} errors`);

    if (results.totalErrors > 0) {
        console.log('\n⚠️  Some migrations had errors. Please review the logs above.');
        return false;
    } else {
        console.log('\n🎉 All migrations completed successfully!');
        return true;
    }
}

async function createIndexes() {
    console.log('\n🔧 Creating tenant-aware indexes...');

    try {
        // Note: Indexes are already defined in the models, but we can ensure they exist
        const collections = [
            { model: Event, name: 'Event' },
            { model: Survey, name: 'Survey' },
            { model: SurveyNotification, name: 'SurveyNotification' },
            { model: Report, name: 'Report' },
            { model: ReportConfig, name: 'ReportConfig' },
            { model: ReportExecution, name: 'ReportExecution' },
            { model: ReportExport, name: 'ReportExport' },
            { model: DashboardConfig, name: 'DashboardConfig' },
            { model: DocumentTemplate, name: 'DocumentTemplate' },
            { model: RequestControl, name: 'RequestControl' }
        ];

        for (const { model, name } of collections) {
            try {
                await model.createIndexes();
                console.log(`✅ ${name}: Indexes created/verified`);
            } catch (error) {
                // Handle index conflicts gracefully
                if (error.message.includes('existing index') || error.message.includes('same name')) {
                    console.log(`⚠️  ${name}: Index already exists (this is normal)`);
                } else {
                    console.error(`❌ ${name}: Index creation failed:`, error.message);
                }
            }
        }

        console.log('✅ Index creation completed');

    } catch (error) {
        console.error('❌ Index creation failed:', error);
    }
}

async function main() {
    try {
        await connectToDatabase();

        const success = await runMigration();

        if (success) {
            await createIndexes();
        }

        console.log('\n🏁 Migration script completed');

    } catch (error) {
        console.error('❌ Migration script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
    }
}

// Run the migration
main().catch(console.error);