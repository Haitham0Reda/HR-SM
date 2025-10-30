// models/Survey.js
import mongoose from 'mongoose';

const surveySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    questions: [
        {
            questionText: { type: String, required: true },
            type: {
                type: String,
                enum: ['text', 'single-choice', 'multiple-choice', 'rating', 'date'],
                required: true
            },
            options: [String], // For choice questions
            required: { type: Boolean, default: false }
        }
    ],
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    responses: [
        {
            respondent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            answers: [mongoose.Schema.Types.Mixed], // Flexible for different question types
            submittedAt: { type: Date, default: Date.now }
        }
    ]
}, {
    timestamps: true
});

// Add isActive for soft delete
surveySchema.add({ isActive: { type: Boolean, default: true } });

export default mongoose.model('Survey', surveySchema);
