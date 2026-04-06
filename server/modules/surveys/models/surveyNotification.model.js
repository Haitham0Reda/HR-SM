/**
 * Survey Notification Model (Sequelize)
 * 
 * Tracks survey-related notifications and reminders
 */
import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const SurveyNotification = mainAppDb.define('SurveyNotification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id'
    },
    // Survey reference
    survey: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'surveys',
            key: 'id'
        }
    },
    // Notification type
    notificationType: {
        type: DataTypes.ENUM(
            'survey-assigned',
            'survey-reminder',
            'survey-due-soon',
            'survey-closed',
            'survey-published'
        ),
        allowNull: false,
        field: 'notification_type'
    },
    // Recipients - stored as JSONB array
    recipients: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // Message content - stored as JSONB
    message: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            subject: '',
            body: '',
            priority: 'normal'
        }
    },
    // Metadata
    createdBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'created_by'
    },
    scheduledFor: {
        type: DataTypes.DATE,
        field: 'scheduled_for'
    },
    sentAt: {
        type: DataTypes.DATE,
        field: 'sent_at'
    },
    // Statistics - stored as JSONB
    stats: {
        type: DataTypes.JSONB,
        defaultValue: {
            totalRecipients: 0,
            sentCount: 0,
            readCount: 0,
            failedCount: 0
        }
    },
    // Status
    status: {
        type: DataTypes.ENUM('pending', 'sending', 'sent', 'failed', 'cancelled'),
        defaultValue: 'pending'
    }
}, {
    tableName: 'survey_notifications',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['survey'] },
        { fields: ['notification_type'] },
        { fields: ['status'] },
        { fields: ['tenant_id', 'survey', 'notification_type'] },
        { fields: ['tenant_id', 'status', 'scheduled_for'] }
    ]
});

/**
 * Define associations
 */
SurveyNotification.associate = (models) => {
    SurveyNotification.belongsTo(models.Survey, {
        foreignKey: 'survey',
        as: 'surveyDetails'
    });
    SurveyNotification.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
    });
};

/**
 * Instance method: Mark as sent
 */
SurveyNotification.prototype.markAsSent = async function () {
    this.status = 'sent';
    this.sentAt = new Date();
    
    const recipients = this.recipients || [];
    const stats = { ...this.stats };
    stats.sentCount = recipients.filter(r => r.sent).length;
    stats.failedCount = recipients.filter(r => r.error).length;
    this.stats = stats;
    
    return await this.save();
};

/**
 * Instance method: Mark recipient as read
 */
SurveyNotification.prototype.markAsRead = async function (userId) {
    const recipients = [...(this.recipients || [])];
    const recipient = recipients.find(r => r.user === userId);
    
    if (recipient && !recipient.read) {
        recipient.read = true;
        recipient.readAt = new Date();
        this.recipients = recipients;
        
        const stats = { ...this.stats };
        stats.readCount = recipients.filter(r => r.read).length;
        this.stats = stats;
        
        return await this.save();
    }
    
    return this;
};

/**
 * Static method: Create survey assignment notification
 */
SurveyNotification.createAssignmentNotification = async function (survey, recipientIds, tenantId) {
    const notification = await this.create({
        tenantId,
        survey: survey.id,
        notificationType: 'survey-assigned',
        message: {
            subject: `New Survey: ${survey.title}`,
            body: `You have been assigned a new survey${survey.settings?.isMandatory ? ' (Mandatory)' : ''}. Please complete it by ${survey.settings?.endDate ? new Date(survey.settings.endDate).toLocaleDateString() : 'as soon as possible'}.`,
            priority: survey.settings?.isMandatory ? 'high' : 'normal'
        },
        recipients: recipientIds.map(userId => ({ user: userId, sent: false, read: false, emailSent: false })),
        stats: {
            totalRecipients: recipientIds.length,
            sentCount: 0,
            readCount: 0,
            failedCount: 0
        }
    });

    return notification;
};

/**
 * Static method: Create reminder notification
 */
SurveyNotification.createReminderNotification = async function (survey, recipientIds, tenantId) {
    const notification = await this.create({
        tenantId,
        survey: survey.id,
        notificationType: 'survey-reminder',
        message: {
            subject: `Reminder: ${survey.title}`,
            body: `This is a reminder to complete the survey "${survey.title}". ${survey.settings?.endDate ? `Due date: ${new Date(survey.settings.endDate).toLocaleDateString()}` : ''}`,
            priority: survey.settings?.isMandatory ? 'high' : 'normal'
        },
        recipients: recipientIds.map(userId => ({ user: userId, sent: false, read: false, emailSent: false })),
        stats: {
            totalRecipients: recipientIds.length,
            sentCount: 0,
            readCount: 0,
            failedCount: 0
        }
    });

    return notification;
};

/**
 * Static method: Tenant-aware queries
 */
SurveyNotification.withTenant = function (tenantId) {
    return this.findAll({ where: { tenantId } });
};

export default SurveyNotification;
