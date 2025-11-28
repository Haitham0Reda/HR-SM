/**
 * Survey Model
 * 
 * Comprehensive survey management for employee feedback and assessments
 */
import mongoose from 'mongoose';

const surveySchema = new mongoose.Schema({
    // Survey Information
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        maxlength: 1000
    },

    // Survey Type
    surveyType: {
        type: String,
        enum: [
            'satisfaction',
            'training',
            'performance',
            'policy',
            '360-feedback',
            'exit-interview',
            'custom'
        ],
        default: 'custom'
    },

    // Questions
    questions: [{
        questionText: {
            type: String,
            required: true,
            trim: true
        },
        questionType: {
            type: String,
            enum: [
                'text',           // Short text input
                'textarea',       // Long text input
                'single-choice',  // Radio buttons
                'multiple-choice',// Checkboxes
                'rating',         // 1-5 or 1-10 scale
                'yes-no',         // Boolean
                'number',         // Numeric input
                'date'            // Date picker
            ],
            required: true
        },
        options: [String],    // For choice-based questions
        ratingScale: {
            min: { type: Number, default: 1 },
            max: { type: Number, default: 5 }
        },
        required: {
            type: Boolean,
            default: false
        },
        order: Number
    }],

    // Survey Settings
    settings: {
        // Mandatory Survey
        isMandatory: {
            type: Boolean,
            default: false
        },

        // Anonymous Responses
        allowAnonymous: {
            type: Boolean,
            default: false
        },

        // Multiple Submissions
        allowMultipleSubmissions: {
            type: Boolean,
            default: false
        },

        // Date Range
        startDate: Date,
        endDate: Date,

        // Email Notifications
        emailNotifications: {
            enabled: {
                type: Boolean,
                default: true
            },
            sendOnAssignment: {
                type: Boolean,
                default: true
            },
            sendReminders: {
                type: Boolean,
                default: true
            },
            reminderFrequency: {
                type: Number,
                default: 3 // days
            }
        }
    },

    // Assignment
    assignedTo: {
        // Target Scope
        allEmployees: {
            type: Boolean,
            default: false
        },



        // Specific Departments
        departments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        }],

        // Specific Roles
        roles: [{
            type: String,
            enum: ['admin', 'hr', 'manager', 'employee', 'id-card-admin', 'supervisor', 'head-of-department', 'dean']
        }],

        // Specific Employees
        specificEmployees: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },

    // Responses
    responses: [{
        respondent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        isAnonymous: {
            type: Boolean,
            default: false
        },
        answers: [{
            questionId: mongoose.Schema.Types.ObjectId,
            answer: mongoose.Schema.Types.Mixed,
            answeredAt: {
                type: Date,
                default: Date.now
            }
        }],
        completionPercentage: {
            type: Number,
            default: 0
        },
        isComplete: {
            type: Boolean,
            default: false
        },
        submittedAt: Date,
        ipAddress: String,
        userAgent: String
    }],

    // Statistics
    stats: {
        totalAssigned: {
            type: Number,
            default: 0
        },
        totalResponses: {
            type: Number,
            default: 0
        },
        completionRate: {
            type: Number,
            default: 0
        },
        lastResponseAt: Date
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'active', 'closed', 'archived'],
        default: 'draft',
        index: true
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    publishedAt: Date,
    closedAt: Date
}, {
    timestamps: true
});

// Indexes
surveySchema.index({ status: 1, 'settings.endDate': 1 });
surveySchema.index({ 'assignedTo.departments': 1 });
surveySchema.index({ 'responses.respondent': 1 });

// Virtual for active status
surveySchema.virtual('isCurrentlyActive').get(function () {
    if (this.status !== 'active') return false;

    const now = new Date();

    if (this.settings.startDate && now < this.settings.startDate) return false;
    if (this.settings.endDate && now > this.settings.endDate) return false;

    return true;
});

// Method to check if user has responded
surveySchema.methods.hasUserResponded = function (userId) {
    return this.responses.some(r =>
        r.respondent && r.respondent.toString() === userId.toString()
    );
};

// Method to get user's response
surveySchema.methods.getUserResponse = function (userId) {
    return this.responses.find(r =>
        r.respondent && r.respondent.toString() === userId.toString()
    );
};

// Method to calculate completion rate
surveySchema.methods.calculateCompletionRate = function () {
    if (this.stats.totalAssigned === 0) {
        this.stats.completionRate = 0;
        return 0;
    }

    this.stats.completionRate = (this.stats.totalResponses / this.stats.totalAssigned) * 100;
    return this.stats.completionRate;
};

// Method to add response
surveySchema.methods.addResponse = async function (userId, answers = [], isAnonymous = false, metadata = {}) {
    // Check if already responded and multiple submissions not allowed
    if (!this.settings.allowMultipleSubmissions && this.hasUserResponded(userId)) {
        throw new Error('You have already submitted a response to this survey');
    }

    // Ensure answers is an array
    const responses = Array.isArray(answers) ? answers : [];

    console.log('addResponse called with:', {
        userId,
        answersCount: responses.length,
        isAnonymous,
        totalQuestions: this.questions.length
    });

    // Calculate completion percentage
    const requiredQuestions = this.questions.filter(q => q.required).length;
    const answeredRequired = responses.filter(a => {
        const question = this.questions.id(a.questionId);
        return question && question.required;
    }).length;

    const completionPercentage = requiredQuestions > 0
        ? (answeredRequired / requiredQuestions) * 100
        : 100;

    // Consider complete if all questions are answered (not just required ones)
    const totalAnswered = responses.filter(a => {
        const answer = a.answer;
        return answer !== undefined && answer !== null && answer !== '';
    }).length;

    const isComplete = totalAnswered >= this.questions.length || completionPercentage === 100;

    console.log('Completion calculation:', {
        requiredQuestions,
        answeredRequired,
        totalAnswered,
        totalQuestions: this.questions.length,
        completionPercentage,
        isComplete
    });

    // Add response
    this.responses.push({
        respondent: isAnonymous ? null : userId,
        isAnonymous,
        answers: responses,
        completionPercentage,
        isComplete,
        submittedAt: isComplete ? new Date() : null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
    });

    // Update statistics
    if (isComplete) {
        this.stats.totalResponses += 1;
        this.stats.lastResponseAt = new Date();
        this.calculateCompletionRate();
    }

    console.log('Response added. Stats:', {
        totalResponses: this.stats.totalResponses,
        isComplete
    });

    return await this.save();
};

// Static method to find active surveys for user
surveySchema.statics.findActiveSurveysForUser = async function (userId) {
    const User = mongoose.model('User');
    const user = await User.findById(userId);

    if (!user) return [];

    const now = new Date();

    const query = {
        status: 'active',
        $and: [
            {
                $or: [
                    { 'settings.startDate': { $exists: false } },
                    { 'settings.startDate': { $lte: now } }
                ]
            },
            {
                $or: [
                    { 'settings.endDate': { $exists: false } },
                    { 'settings.endDate': { $gte: now } }
                ]
            }
        ]
    };

    const surveys = await this.find(query)
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 });

    // Filter surveys assigned to this user
    return surveys.filter(survey => {
        if (survey.assignedTo.allEmployees) return true;

        if (survey.assignedTo.specificEmployees.some(id => id.toString() === userId.toString())) {
            return true;
        }



        if (user.department && survey.assignedTo.departments.some(id => id.toString() === user.department.toString())) {
            return true;
        }

        if (survey.assignedTo.roles.includes(user.role)) {
            return true;
        }

        return false;
    });
};

export default mongoose.model('Survey', surveySchema);

