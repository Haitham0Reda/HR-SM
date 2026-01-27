/**
 * Migrate Surveys to Tenant Databases
 * 
 * This script moves surveys from the platform database to their respective tenant databases
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import multiTenantDB from '../config/multiTenant.js';
import Survey from '../modules/surveys/models/survey.model.js';

dotenv.config();

async function migrateSurveysToTenantDB() {
    try {
        console.log('🔄 Migrating surveys to tenant databases...\n');

        // Connect to platform database
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_system';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to platform database\n');

        // Get all surveys from platform database
        const surveys = await Survey.find({});
        console.log(`📊 Found ${surveys.length} surveys in platform database\n`);

        if (surveys.length === 0) {
            console.log('✅ No surveys to migrate!');
            await mongoose.connection.close();
            process.exit(0);
        }

        // Group surveys by tenantId
        const surveysByTenant = {};
        surveys.forEach(survey => {
            const tenantId = survey.tenantId;
            if (!surveysByTenant[tenantId]) {
                surveysByTenant[tenantId] = [];
            }
            surveysByTenant[tenantId].push(survey);
        });

        console.log('📋 Surveys by tenant:');
        Object.keys(surveysByTenant).forEach(tenantId => {
            console.log(`   ${tenantId}: ${surveysByTenant[tenantId].length} surveys`);
        });
        console.log('');

        // Migrate each tenant's surveys
        for (const [tenantId, tenantSurveys] of Object.entries(surveysByTenant)) {
            console.log(`\n🔄 Migrating ${tenantSurveys.length} surveys for tenant: ${tenantId}`);

            try {
                // Get tenant connection
                const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
                const TenantSurvey = tenantConnection.model('Survey', Survey.schema);

                // Copy each survey to tenant database
                for (const survey of tenantSurveys) {
                    const surveyData = survey.toObject();
                    delete surveyData._id; // Let MongoDB generate new ID

                    const newSurvey = await TenantSurvey.create(surveyData);
                    console.log(`   ✓ Migrated: ${survey.title} (${survey._id} → ${newSurvey._id})`);
                }

                console.log(`✅ Migrated ${tenantSurveys.length} surveys to ${tenantConnection.name}`);
            } catch (error) {
                console.error(`❌ Error migrating surveys for tenant ${tenantId}:`, error.message);
            }
        }

        console.log('\n✅ Migration complete!');
        console.log('\n💡 Next steps:');
        console.log('   1. Verify surveys in tenant databases using MongoDB Compass');
        console.log('   2. If everything looks good, delete surveys from platform database');
        console.log('   3. Restart your server');
        console.log('   4. Refresh the surveys page');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

migrateSurveysToTenantDB();
