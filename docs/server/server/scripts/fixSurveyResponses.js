/**
 * Migration Script: Fix Survey Responses
 * 
 * This script updates existing survey responses to ensure:
 * 1. Anonymous responses still have respondent userId stored (for tracking)
 * 2. All responses have proper isComplete flag
 * 3. All complete responses have submittedAt timestamp
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Survey from '../modules/surveys/models/survey.model.js';

dotenv.config();

const fixSurveyResponses = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database\n');

        // Get all surveys with responses
        const surveys = await Survey.find({ 'responses.0': { $exists: true } });
        console.log(`📊 Found ${surveys.length} surveys with responses\n`);

        let totalFixed = 0;
        let totalResponses = 0;

        for (const survey of surveys) {
            console.log(`\n📋 Processing survey: ${survey.title}`);
            console.log(`   Responses: ${survey.responses.length}`);

            let surveyModified = false;

            for (let i = 0; i < survey.responses.length; i++) {
                const response = survey.responses[i];
                totalResponses++;

                let responseModified = false;

                // Fix 1: If response is anonymous but has no respondent, we can't fix it
                // (we don't know who submitted it)
                if (response.isAnonymous && !response.respondent) {
                    console.log(`   ⚠️  Response ${i + 1}: Anonymous with no respondent - cannot fix`);
                }

                // Fix 2: Recalculate isComplete flag
                const requiredQuestions = survey.questions.filter(q => q.required);
                const answeredRequired = response.answers.filter(a => {
                    const question = survey.questions.id(a.questionId);
                    if (!question || !question.required) return false;
                    
                    const answer = a.answer;
                    if (Array.isArray(answer)) {
                        return answer.length > 0;
                    }
                    return answer !== undefined && answer !== null && answer !== '';
                }).length;

                const totalAnswered = response.answers.filter(a => {
                    const answer = a.answer;
                    if (Array.isArray(answer)) {
                        return answer.length > 0;
                    }
                    return answer !== undefined && answer !== null && answer !== '';
                }).length;

                const completionPercentage = requiredQuestions.length > 0
                    ? (answeredRequired / requiredQuestions.length) * 100
                    : 100;

                const shouldBeComplete = requiredQuestions.length > 0 
                    ? completionPercentage === 100 
                    : totalAnswered > 0;

                // Update isComplete if different
                if (response.isComplete !== shouldBeComplete) {
                    console.log(`   🔧 Response ${i + 1}: Updating isComplete from ${response.isComplete} to ${shouldBeComplete}`);
                    survey.responses[i].isComplete = shouldBeComplete;
                    responseModified = true;
                }

                // Update completionPercentage if different
                if (response.completionPercentage !== completionPercentage) {
                    console.log(`   🔧 Response ${i + 1}: Updating completionPercentage from ${response.completionPercentage} to ${completionPercentage}`);
                    survey.responses[i].completionPercentage = completionPercentage;
                    responseModified = true;
                }

                // Fix 3: Add submittedAt if complete but missing timestamp
                if (shouldBeComplete && !response.submittedAt) {
                    const timestamp = response.answers[0]?.answeredAt || new Date();
                    console.log(`   🔧 Response ${i + 1}: Adding submittedAt timestamp`);
                    survey.responses[i].submittedAt = timestamp;
                    responseModified = true;
                }

                if (responseModified) {
                    surveyModified = true;
                    totalFixed++;
                }
            }

            // Recalculate survey stats
            if (surveyModified) {
                const completeResponses = survey.responses.filter(r => r.isComplete).length;
                survey.stats.totalResponses = completeResponses;
                
                if (completeResponses > 0) {
                    const lastResponse = survey.responses
                        .filter(r => r.isComplete && r.submittedAt)
                        .sort((a, b) => b.submittedAt - a.submittedAt)[0];
                    
                    if (lastResponse) {
                        survey.stats.lastResponseAt = lastResponse.submittedAt;
                    }
                }

                survey.calculateCompletionRate();

                await survey.save();
                console.log(`   ✅ Survey updated - ${completeResponses} complete responses`);
            } else {
                console.log(`   ✓ No changes needed`);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Migration complete!`);
        console.log(`   Total responses processed: ${totalResponses}`);
        console.log(`   Total responses fixed: ${totalFixed}`);
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
};

// Run the migration
fixSurveyResponses()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
