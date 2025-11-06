/**
 * Survey Notification Model
 * 
 * Tracks survey-related notifications and reminders
 */
import mongoose from 'mongoose';

const surveyNotificationSchema = new mongoose.Schema({
    // Survey reference
    survey: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Survey',
        required: true,
        index: true
    },

    // Notification type
    notificationType: {
        type: String,
        enum: [
            'survey-assigned',    // Initial assignment
            'survey-reminder',    // Reminder to complete
            'survey-due-soon',    // Due date approaching
            'survey-closed',      // Survey closed notification
            'survey-published'    // Survey published notification
        ],
        required: true,
        index: true
    },

    // Recipients
    recipients: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        sent: {
            type: Boolean,
            default: false
        },
        sentAt: Date,
        read: {
            type: Boolean,
            default: false
        },
        readAt: Date,
        emailSent: {
            type: Boolean,
            default: false
        },
        emailSentAt: Date,
        error: String
    }],

    // Message content
    message: {
        subject: {
            type: String,
            required: true
        },
        body: {
            type: String,
            required: true
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal'
        }
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    scheduledFor: Date,
    sentAt: Date,

    // Statistics
    stats: {
        totalRecipients: {
            type: Number,
            default: 0
        },
        sentCount: {
            type: Number,
            default: 0
        },
        readCount: {
            type: Number,
            default: 0
        },
        failedCount: {
            type: Number,
            default: 0
        }
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'sending', 'sent', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    }
}, {
    timestamps: true
});

// Indexes
surveyNotificationSchema.index({ survey: 1, notificationType: 1 });
surveyNotificationSchema.index({ 'recipients.user': 1 });
surveyNotificationSchema.index({ status: 1, scheduledFor: 1 });

// Method to mark as sent
surveyNotificationSchema.methods.markAsSent = function () {
    this.status = 'sent';
    this.sentAt = new Date();
    this.stats.sentCount = this.recipients.filter(r => r.sent).length;
    this.stats.failedCount = this.recipients.filter(r => r.error).length;
};

// Method to mark recipient as read
surveyNotificationSchema.methods.markAsRead = function (userId) {
    const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
    if (recipient && !recipient.read) {
        recipient.read = true;
        recipient.readAt = new Date();
        this.stats.readCount = this.recipients.filter(r => r.read).length;
    }
};

// Static method to create survey assignment notification
surveyNotificationSchema.statics.createAssignmentNotification = async function (survey, recipientIds) {
    const notification = new this({
        survey: survey._id,
        notificationType: 'survey-assigned',
        message: {
            subject: `New Survey: ${survey.title}`,
            body: `You have been assigned a new survey${survey.settings.isMandatory ? ' (Mandatory)' : ''}. Please complete it by ${survey.settings.endDate ? new Date(survey.settings.endDate).toLocaleDateString() : 'as soon as possible'}.`,
            priority: survey.settings.isMandatory ? 'high' : 'normal'
        },
        recipients: recipientIds.map(userId => ({ user: userId })),
        stats: {
            totalRecipients: recipientIds.length
        }
    });

    return await notification.save();
};

// Static method to create reminder notification
surveyNotificationSchema.statics.createReminderNotification = async function (survey, recipientIds) {
    const notification = new this({
        survey: survey._id,
        notificationType: 'survey-reminder',
        message: {
            subject: `Reminder: ${survey.title}`,
            body: `This is a reminder to complete the survey "${survey.title}". ${survey.settings.endDate ? `Due date: ${new Date(survey.settings.endDate).toLocaleDateString()}` : ''}`,
            priority: survey.settings.isMandatory ? 'high' : 'normal'
        },
        recipients: recipientIds.map(userId => ({ user: userId })),
        stats: {
            totalRecipients: recipientIds.length
        }
    });

    return await notification.save();
};

export default mongoose.model('SurveyNotification', surveyNotificationSchema);
