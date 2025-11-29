/**
 * Test Script: Simulate Frontend API Call
 * 
 * This script simulates what the frontend receives from the API
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Survey from '../models/survey.model.js';
import User from '../models/user.model.js';

dotenv.config();

const testFrontendAPI = async () => {
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

        console.log(`👤 Simulating API call for: ${adminUser.username}\n`);

        // This is EXACTLY what the controller does
        const surveys = await Survey.findActiveSurveysForUser(adminUser._id);

        console.log(`Found ${surveys.length} active surveys\n`);

        // Map surveys with completion status (EXACT controller logic)
        const surveysWithStatus = surveys.map(survey => {
            const hasResponded = survey.hasUserResponded(adminUser._id);
            const response = hasResponded ? survey.getUserResponse(adminUser._id) : null;

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

        console.log('📊 API Response Data:');
        console.log('='.repeat(60));
        surveysWithStatus.forEach(s => {
            console.log(`Survey: ${s.title}`);
            console.log(`  - ID: ${s._id}`);
            console.log(`  - isMandatory: ${s.isMandatory}`);
            console.log(`  - hasResponded: ${s.hasResponded}`);
            console.log(`  - isComplete: ${s.isComplete}`);
            console.log(`  - submittedAt: ${s.submittedAt}`);
            console.log('');
        });
        console.log('='.repeat(60));

        // Check what the frontend filter would do
        console.log('\n🔍 Frontend Filter Results:');
        console.log('='.repeat(60));
        
        const pending = surveysWithStatus.filter(s => !s.isComplete);
        const completed = surveysWithStatus.filter(s => s.isComplete === true);
        
        console.log(`Pending Surveys (${pending.length}):`);
        pending.forEach(s => console.log(`  - ${s.title}`));
        
        console.log(`\nCompleted Surveys (${completed.length}):`);
        completed.forEach(s => console.log(`  - ${s.title}`));
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
testFrontendAPI()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
