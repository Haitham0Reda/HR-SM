/**
 * Debug Script: Check Survey Status
 * 
 * This script checks the current state of surveys and responses
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Survey from '../modules/surveys/models/survey.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

dotenv.config();

const debugSurveyStatus = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database\n');

        // Get all users
        const users = await User.find({}).select('username email role');
        console.log(`👥 Found ${users.length} users\n`);

        // Get all surveys
        const surveys = await Survey.find({})
            .populate('createdBy', 'username email')
            .populate('responses.respondent', 'username email');

        console.log(`📊 Found ${surveys.length} surveys\n`);

        for (const survey of surveys) {
            console.log('='.repeat(60));
            console.log(`📋 Survey: ${survey.title}`);
            console.log(`   ID: ${survey._id}`);
            console.log(`   Status: ${survey.status}`);
            console.log(`   Type: ${survey.surveyType}`);
            console.log(`   Questions: ${survey.questions.length}`);
            console.log(`   Required Questions: ${survey.questions.filter(q => q.required).length}`);
            console.log(`   Responses: ${survey.responses.length}`);
            console.log(`   Stats:`);
            console.log(`      - Total Assigned: ${survey.stats.totalAssigned}`);
            console.log(`      - Total Responses: ${survey.stats.totalResponses}`);
            console.log(`      - Completion Rate: ${survey.stats.completionRate}%`);

            if (survey.settings) {
                console.log(`   Settings:`);
                console.log(`      - Mandatory: ${survey.settings.isMandatory}`);
                console.log(`      - Allow Anonymous: ${survey.settings.allowAnonymous}`);
                console.log(`      - Start Date: ${survey.settings.startDate}`);
                console.log(`      - End Date: ${survey.settings.endDate}`);
            }

            if (survey.assignedTo) {
                console.log(`   Assignment:`);
                console.log(`      - All Employees: ${survey.assignedTo.allEmployees}`);
                console.log(`      - Departments: ${survey.assignedTo.departments.length}`);
                console.log(`      - Roles: ${survey.assignedTo.roles.join(', ') || 'none'}`);
                console.log(`      - Specific Employees: ${survey.assignedTo.specificEmployees.length}`);
            }

            if (survey.responses.length > 0) {
                console.log(`\n   📝 Responses:`);
                survey.responses.forEach((response, index) => {
                    console.log(`\n      Response ${index + 1}:`);
                    console.log(`         - Respondent: ${response.respondent ? response.respondent.username : 'null'}`);
                    console.log(`         - Respondent ID: ${response.respondent ? response.respondent._id : 'null'}`);
                    console.log(`         - Is Anonymous: ${response.isAnonymous}`);
                    console.log(`         - Is Complete: ${response.isComplete}`);
                    console.log(`         - Completion %: ${response.completionPercentage}%`);
                    console.log(`         - Submitted At: ${response.submittedAt}`);
                    console.log(`         - Answers: ${response.answers.length}`);
                    
                    response.answers.forEach((answer, aIndex) => {
                        const question = survey.questions.id(answer.questionId);
                        console.log(`            ${aIndex + 1}. ${question ? question.questionText : 'Unknown'}: ${JSON.stringify(answer.answer)}`);
                    });
                });
            }

            // Check for each user
            console.log(`\n   👤 User Status:`);
            for (const user of users) {
                // Debug the comparison
                console.log(`\n      Checking user: ${user.username} (${user._id})`);
                survey.responses.forEach((r, idx) => {
                    const respondentId = r.respondent?._id || r.respondent;
                    console.log(`         Response ${idx + 1} respondent: ${respondentId}`);
                    console.log(`         Match: ${respondentId && respondentId.toString() === user._id.toString()}`);
                });
                
                const hasResponded = survey.hasUserResponded(user._id);
                const response = survey.getUserResponse(user._id);
                const isComplete = response?.isComplete || false;
                
                console.log(`      - ${user.username} (${user.role}):`);
                console.log(`         Has Responded: ${hasResponded}`);
                console.log(`         Is Complete: ${isComplete}`);
                
                if (response) {
                    console.log(`         Completion %: ${response.completionPercentage}%`);
                    console.log(`         Submitted At: ${response.submittedAt}`);
                }
            }

            console.log('');
        }

        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
};

// Run the debug script
debugSurveyStatus()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Debug failed:', error);
        process.exit(1);
    });
