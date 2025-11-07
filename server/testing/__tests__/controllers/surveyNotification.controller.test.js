import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SurveyNotification from '../../../models/surveyNotification.model.js';
import Survey from '../../../models/survey.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import { 
  getUserNotifications, 
  markNotificationAsRead,
  sendSurveyAssignmentNotifications,
  sendSurveyReminders
} from '../../../controller/surveyNotification.controller.js';

// Import Jest globals explicitly for ES modules
import { jest } from '@jest/globals';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Survey Notification Controller', () => {
  let testUser;
  let testSurvey;
  let testNotification;
  let testSchool;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test school first (required for User)
    testSchool = new School({
      schoolCode: 'BUS',
      name: 'School of Business',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id
    });
    await testUser.save();

    // Create test survey
    testSurvey = new Survey({
      title: 'Test Survey',
      description: 'A test survey for testing purposes',
      surveyType: 'custom',
      questions: [
        {
          questionText: 'How are you today?',
          questionType: 'text',
          required: true,
          order: 1
        }
      ],
      settings: {
        isMandatory: true,
        allowAnonymous: false,
        allowMultipleSubmissions: false
      },
      assignedTo: {
        allEmployees: true
      },
      status: 'active',
      createdBy: testUser._id
    });
    await testSurvey.save();

    // Create test notification
    testNotification = new SurveyNotification({
      survey: testSurvey._id,
      notificationType: 'survey-assigned',
      recipients: [
        {
          user: testUser._id,
          sent: true,
          read: false
        }
      ],
      message: {
        subject: 'New Survey: Test Survey',
        body: 'You have been assigned a new survey. Please complete it by as soon as possible.',
        priority: 'high'
      },
      stats: {
        totalRecipients: 1,
        sentCount: 1,
        readCount: 0,
        failedCount: 0
      },
      status: 'sent'
    });
    await testNotification.save();
  });

  describe('getUserNotifications', () => {
    it('should get user notifications', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        query: {}
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUserNotifications(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.notifications).toHaveLength(1);
      expect(response.notifications[0].notificationType).toBe('survey-assigned');
      expect(response.notifications[0].read).toBe(false);
    });

    it('should handle errors when getting user notifications', async () => {
      // Mock SurveyNotification.find to throw an error
      const originalFind = SurveyNotification.find;
      SurveyNotification.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const req = {
        user: {
          _id: testUser._id
        },
        query: {}
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUserNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      SurveyNotification.find = originalFind;
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: testNotification._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await markNotificationAsRead(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Notification marked as read');

      // Verify the notification was actually marked as read
      const updatedNotification = await SurveyNotification.findById(testNotification._id);
      const userRecipient = updatedNotification.recipients.find(
        r => r.user.toString() === testUser._id.toString()
      );
      expect(userRecipient.read).toBe(true);
      expect(userRecipient.readAt).toBeDefined();
    });

    it('should return 404 when notification not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: fakeId.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await markNotificationAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Notification not found');
    });

    it('should handle errors when marking notification as read', async () => {
      // Mock SurveyNotification.findById to throw an error
      const originalFindById = SurveyNotification.findById;
      SurveyNotification.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const req = {
        user: {
          _id: testUser._id
        },
        params: {
          id: testNotification._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await markNotificationAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      SurveyNotification.findById = originalFindById;
    });
  });

  describe('sendSurveyAssignmentNotifications', () => {
    it('should send survey assignment notifications', async () => {
      // Create a new survey for this test
      const newSurvey = new Survey({
        title: 'New Test Survey',
        description: 'A new test survey',
        surveyType: 'custom',
        questions: [
          {
            questionText: 'How are you today?',
            questionType: 'text',
            required: true,
            order: 1
          }
        ],
        settings: {
          isMandatory: true
        },
        assignedTo: {
          allEmployees: true
        },
        status: 'draft',
        createdBy: testUser._id
      });
      await newSurvey.save();

      const result = await sendSurveyAssignmentNotifications(newSurvey._id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Survey assignment notifications sent');

      // Verify notification was created
      const notifications = await SurveyNotification.find({ survey: newSurvey._id });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].notificationType).toBe('survey-assigned');
    });

    it('should handle error when survey not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(sendSurveyAssignmentNotifications(fakeId))
        .rejects
        .toThrow('Survey not found');
    });

    it('should handle case when no users are assigned to survey', async () => {
      // Create a survey with no assigned users
      const emptySurvey = new Survey({
        title: 'Empty Survey',
        description: 'A survey with no assigned users',
        surveyType: 'custom',
        questions: [
          {
            questionText: 'How are you today?',
            questionType: 'text',
            required: true,
            order: 1
          }
        ],
        settings: {
          isMandatory: true
        },
        assignedTo: {
          allEmployees: false
          // No other assignment criteria, so no users should be assigned
        },
        status: 'active',
        createdBy: testUser._id
      });
      await emptySurvey.save();

      const result = await sendSurveyAssignmentNotifications(emptySurvey._id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No users assigned to this survey');
    });

  });

  describe('sendSurveyReminders', () => {
    it('should send survey reminders to users who have not responded', async () => {
      // Create a survey with responses
      const surveyWithResponses = new Survey({
        title: 'Survey with Responses',
        description: 'A survey with some responses',
        surveyType: 'custom',
        questions: [
          {
            questionText: 'How are you today?',
            questionType: 'text',
            required: true,
            order: 1
          }
        ],
        settings: {
          isMandatory: true
        },
        assignedTo: {
          allEmployees: true
        },
        responses: [
          {
            respondent: testUser._id,
            isComplete: false,
            answers: []
          }
        ],
        status: 'active',
        createdBy: testUser._id
      });
      await surveyWithResponses.save();

      const result = await sendSurveyReminders(surveyWithResponses._id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Reminders sent');

      // Verify reminder notification was created
      const notifications = await SurveyNotification.find({ survey: surveyWithResponses._id });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].notificationType).toBe('survey-reminder');
    });

    it('should handle case when all users have responded', async () => {
      // Create a survey where user has completed response
      const completedSurvey = new Survey({
        title: 'Completed Survey',
        description: 'A survey where all users have responded',
        surveyType: 'custom',
        questions: [
          {
            questionText: 'How are you today?',
            questionType: 'text',
            required: true,
            order: 1
          }
        ],
        settings: {
          isMandatory: true
        },
        assignedTo: {
          allEmployees: true
        },
        responses: [
          {
            respondent: testUser._id,
            isComplete: true,
            answers: [
              {
                questionId: new mongoose.Types.ObjectId(),
                answer: 'I am fine'
              }
            ],
            completionPercentage: 100,
            submittedAt: new Date()
          }
        ],
        status: 'active',
        createdBy: testUser._id
      });
      await completedSurvey.save();

      const result = await sendSurveyReminders(completedSurvey._id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('All users have responded');
    });

    it('should handle error when survey not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(sendSurveyReminders(fakeId))
        .rejects
        .toThrow('Survey not found');
    });
  });
});