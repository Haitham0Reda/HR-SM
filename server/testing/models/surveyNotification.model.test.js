import mongoose from 'mongoose';
import SurveyNotification from '../../models/surveyNotification.model.js';
import Survey from '../../models/survey.model.js';
import User from '../../models/user.model.js';

let user;
let manager;
let survey;

beforeAll(async () => {
  // Create users for testing
  user = await User.create({
    tenantId: 'test_tenant_123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'employee',
    employeeId: 'EMP001'
  });

  manager = await User.create({
    tenantId: 'test_tenant_123',
    username: 'testmanager',
    email: 'manager@example.com',
    password: 'password123',
    role: 'manager',
    employeeId: 'MGR001'
  });

  // Create survey for testing
  survey = await Survey.create({
    title: 'Test Survey',
    description: 'Test survey for notifications',
    surveyType: 'satisfaction',
    createdBy: manager._id
  });
});

beforeEach(async () => {
  await SurveyNotification.deleteMany({});
});

describe('SurveyNotification Model', () => {
  it('should create a new survey notification with required fields', async () => {
    const notification = await SurveyNotification.create({
      survey: survey._id,
      notificationType: 'survey-assigned',
      message: {
        subject: 'New Survey Assigned',
        body: 'You have been assigned a new survey.'
      },
      recipients: [
        {
          user: user._id
        }
      ]
    });

    expect(notification.survey.toString()).toBe(survey._id.toString());
    expect(notification.notificationType).toBe('survey-assigned');
    expect(notification.message.subject).toBe('New Survey Assigned');
    expect(notification.message.body).toBe('You have been assigned a new survey.');
    expect(notification.recipients).toHaveLength(1);
    expect(notification.recipients[0].user.toString()).toBe(user._id.toString());
    expect(notification.status).toBe('pending');
  });

  it('should validate notificationType enum values', async () => {
    const validTypes = [
      'survey-assigned',
      'survey-reminder',
      'survey-due-soon',
      'survey-closed',
      'survey-published'
    ];

    for (const type of validTypes) {
      const notification = new SurveyNotification({
        survey: survey._id,
        notificationType: type,
        message: {
          subject: 'Test Notification',
          body: 'Test message'
        }
      });

      await expect(notification.validate()).resolves.toBeUndefined();
    }

    // Test invalid type
    const invalidNotification = new SurveyNotification({
      survey: survey._id,
      notificationType: 'invalid-type',
      message: {
        subject: 'Invalid Notification',
        body: 'Invalid message'
      }
    });

    await expect(invalidNotification.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate message priority enum values', async () => {
    const validPriorities = ['low', 'normal', 'high', 'urgent'];

    for (const priority of validPriorities) {
      const notification = new SurveyNotification({
        survey: survey._id,
        notificationType: 'survey-assigned',
        message: {
          subject: 'Test Notification',
          body: 'Test message',
          priority: priority
        }
      });

      await expect(notification.validate()).resolves.toBeUndefined();
    }

    // Test invalid priority
    const invalidNotification = new SurveyNotification({
      survey: survey._id,
      notificationType: 'survey-assigned',
      message: {
        subject: 'Invalid Notification',
        body: 'Invalid message',
        priority: 'invalid-priority'
      }
    });

    await expect(invalidNotification.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate status enum values', async () => {
    const validStatuses = ['pending', 'sending', 'sent', 'failed', 'cancelled'];

    for (const status of validStatuses) {
      const notification = new SurveyNotification({
        survey: survey._id,
        notificationType: 'survey-assigned',
        message: {
          subject: 'Test Notification',
          body: 'Test message'
        },
        status: status
      });

      await expect(notification.validate()).resolves.toBeUndefined();
    }

    // Test invalid status
    const invalidNotification = new SurveyNotification({
      survey: survey._id,
      notificationType: 'survey-assigned',
      message: {
        subject: 'Invalid Notification',
        body: 'Invalid message'
      },
      status: 'invalid-status'
    });

    await expect(invalidNotification.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should mark notification as sent', async () => {
    const notification = await SurveyNotification.create({
      survey: survey._id,
      notificationType: 'survey-assigned',
      message: {
        subject: 'Test Notification',
        body: 'Test message'
      },
      recipients: [
        {
          user: user._id,
          sent: true,
          sentAt: new Date()
        },
        {
          user: manager._id,
          error: 'Failed to send'
        }
      ]
    });

    notification.markAsSent();

    expect(notification.status).toBe('sent');
    expect(notification.sentAt).toBeDefined();
    expect(notification.stats.sentCount).toBe(1);
    expect(notification.stats.failedCount).toBe(1);
  });

  it('should mark recipient as read', async () => {
    const notification = await SurveyNotification.create({
      survey: survey._id,
      notificationType: 'survey-assigned',
      message: {
        subject: 'Test Notification',
        body: 'Test message'
      },
      recipients: [
        {
          user: user._id
        },
        {
          user: manager._id,
          read: true,
          readAt: new Date()
        }
      ]
    });

    // Mark user as read
    notification.markAsRead(user._id);

    expect(notification.stats.readCount).toBe(2); // Both recipients now marked as read

    const userRecipient = notification.recipients.find(r => r.user.toString() === user._id.toString());
    expect(userRecipient.read).toBe(true);
    expect(userRecipient.readAt).toBeDefined();

    const managerRecipient = notification.recipients.find(r => r.user.toString() === manager._id.toString());
    expect(managerRecipient.read).toBe(true); // Already marked as read
  });

  it('should create survey assignment notification', async () => {
    const recipientIds = [user._id, manager._id];

    const notification = await SurveyNotification.createAssignmentNotification(survey, recipientIds);

    expect(notification.survey.toString()).toBe(survey._id.toString());
    expect(notification.notificationType).toBe('survey-assigned');
    expect(notification.message.subject).toBe('New Survey: Test Survey');
    expect(notification.message.body).toContain('You have been assigned a new survey');
    expect(notification.recipients).toHaveLength(2);
    expect(notification.stats.totalRecipients).toBe(2);
  });

  it('should create reminder notification', async () => {
    const recipientIds = [user._id];

    const notification = await SurveyNotification.createReminderNotification(survey, recipientIds);

    expect(notification.survey.toString()).toBe(survey._id.toString());
    expect(notification.notificationType).toBe('survey-reminder');
    expect(notification.message.subject).toBe('Reminder: Test Survey');
    expect(notification.message.body).toContain('This is a reminder to complete the survey');
    expect(notification.recipients).toHaveLength(1);
    expect(notification.stats.totalRecipients).toBe(1);
  });

  it('should handle mandatory survey notifications', async () => {
    const mandatorySurvey = await Survey.create({
      title: 'Mandatory Survey',
      surveyType: 'satisfaction',
      settings: {
        isMandatory: true
      },
      createdBy: manager._id
    });

    const notification = await SurveyNotification.createAssignmentNotification(mandatorySurvey, [user._id]);

    expect(notification.message.priority).toBe('high');
    expect(notification.message.body).toContain('(Mandatory)');
  });

  it('should handle survey with due date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

    const datedSurvey = await Survey.create({
      title: 'Dated Survey',
      surveyType: 'satisfaction',
      settings: {
        endDate: futureDate
      },
      createdBy: manager._id
    });

    const notification = await SurveyNotification.createAssignmentNotification(datedSurvey, [user._id]);

    expect(notification.message.body).toContain(new Date(futureDate).toLocaleDateString());
  });

  it('should track recipient statuses correctly', async () => {
    const notification = await SurveyNotification.create({
      survey: survey._id,
      notificationType: 'survey-assigned',
      message: {
        subject: 'Test Notification',
        body: 'Test message'
      },
      recipients: [
        {
          user: user._id,
          sent: true,
          sentAt: new Date(),
          read: true,
          readAt: new Date(),
          emailSent: true,
          emailSentAt: new Date()
        },
        {
          user: manager._id,
          sent: true,
          sentAt: new Date(),
          emailSent: true,
          emailSentAt: new Date()
        }
      ]
    });

    const userRecipient = notification.recipients.find(r => r.user.toString() === user._id.toString());
    expect(userRecipient.sent).toBe(true);
    expect(userRecipient.read).toBe(true);
    expect(userRecipient.emailSent).toBe(true);

    const managerRecipient = notification.recipients.find(r => r.user.toString() === manager._id.toString());
    expect(managerRecipient.sent).toBe(true);
    expect(managerRecipient.read).toBe(false); // Not read yet
    expect(managerRecipient.emailSent).toBe(true);
  });

  it('should handle notification errors', async () => {
    const notification = await SurveyNotification.create({
      survey: survey._id,
      notificationType: 'survey-assigned',
      message: {
        subject: 'Test Notification',
        body: 'Test message'
      },
      recipients: [
        {
          user: user._id,
          error: 'Email delivery failed'
        }
      ]
    });

    expect(notification.recipients[0].error).toBe('Email delivery failed');
  });

  it('should initialize statistics correctly', async () => {
    const notification = await SurveyNotification.create({
      survey: survey._id,
      notificationType: 'survey-assigned',
      message: {
        subject: 'Test Notification',
        body: 'Test message'
      },
      recipients: [
        { user: user._id },
        { user: manager._id }
      ],
      stats: {
        totalRecipients: 2
      }
    });

    expect(notification.stats.totalRecipients).toBe(2);
    expect(notification.stats.sentCount).toBe(0);
    expect(notification.stats.readCount).toBe(0);
    expect(notification.stats.failedCount).toBe(0);
  });
});