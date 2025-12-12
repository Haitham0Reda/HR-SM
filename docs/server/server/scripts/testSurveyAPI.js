/**
 * Test Script: Check Survey API Response
 * 
 * This script simulates what the API returns for getMySurveys
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Survey from '../modules/surveys/models/survey.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

dotenv.config();

const testSurveyAPI = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database\n');

        // Get admin user
        const adminUser = await User.findOne({ username: 'admin' });
        if (!adminUser) {
            console.log('❌ Admin user not found');
            return;
        }

        console.log(`👤 Testing for user: ${adminUser.username} (${adminUser._id})\n`);

        // Simulate the getEmployeeSurveys controller logic
        const surveys = await Survey.findActiveSurveysForUser(adminUser._id);

        console.log(`📊 Found ${surveys.length} active surveys\n`);

        // Map surveys with completion status (same as controller)
        const surveysWithStatus = surveys.map(survey => {
            const hasResponded = survey.hasUserResponded(adminUser._id);
            const response = hasResponded ? survey.getUserResponse(adminUser._id) : null;

            console.log(`Survey: ${survey.title}`);
            console.log(`  - hasResponded: ${hasResponded}`);
            console.log(`  - response found: ${!!response}`);
            console.log(`  - isComplete: ${response?.isComplete || false}`);
            console.log(`  - completionPercentage: ${response?.completionPercentage || 0}`);
            console.log(`  - submittedAt: ${response?.submittedAt}`);
            console.log('');

            return {
                _id: survey._id,
                title: survey.title,
                description: survey.description,
                surveyType: survey.surveyType,
                questions: survey.questions,
                questionCount: survey.questions.length,
                settings: survey.settings,
                isMandatory: survey.settings.isMandatory,
                allowAnonymous: survey.settings.allowAnonymous,
                startDate: survey.settings.startDate,
                endDate: survey.settings.endDate,
                status: survey.status,
                hasResponded,
                isComplete: response?.isComplete || false,
                completionPercentage: response?.completionPercentage || 0,
                submittedAt: response?.submittedAt
            };
        });

        console.log('='.repeat(60));
        console.log('API Response (what frontend receives):');
        console.log(JSON.stringify({
            success: true,
            surveys: surveysWithStatus.map(s => ({
                _id: s._id,
                title: s.title,
                isMandatory: s.isMandatory,
                hasResponded: s.hasResponded,
                isComplete: s.isComplete,
                submittedAt: s.submittedAt
            }))
        }, null, 2));
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
};

// Run the test
testSurveyAPI()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
