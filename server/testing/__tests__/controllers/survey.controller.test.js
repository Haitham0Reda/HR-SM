import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Survey from '../../../models/survey.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import {
  getAllSurveys,
  getEmployeeSurveys,
  createSurvey,
  getSurveyById,
  updateSurvey,
  deleteSurvey,
  submitSurveyResponse,
  publishSurvey,
  closeSurvey,
  getSurveyStatistics,
  exportSurveyResponses
} from '../../../controller/survey.controller.js';

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

describe('Survey Controller', () => {
  let testUser;
  let testHR;
  let testSchool;
  let testSurvey;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test school with valid enum values according to School model
    testSchool = new School({
      name: 'School of Business',
      schoolCode: 'BUS',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();

    // Create test users with required school field
    testUser = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id,
      profile: {
        firstName: 'Test',
        lastName: 'User'
      }
    });
    await testUser.save();

    testHR = new User({
      username: 'testhr',
      email: 'testhr@example.com',
      password: 'password123',
      role: 'hr',
      school: testSchool._id
    });
    await testHR.save();

    // Create test survey
    testSurvey = new Survey({
      title: 'Employee Satisfaction Survey',
      description: 'Measure employee satisfaction',
      surveyType: 'satisfaction',
      questions: [
        {
          questionText: 'How satisfied are you with your job?',
          questionType: 'rating',
          ratingScale: { min: 1, max: 5 },
          required: true,
          order: 1
        },
        {
          questionText: 'Do you feel valued at work?',
          questionType: 'yes-no',
          required: true,
          order: 2
        }
      ],
      settings: {
        isMandatory: false,
        allowAnonymous: true,
        allowMultipleSubmissions: false,
        emailNotifications: {
          enabled: true,
          sendOnAssignment: true,
          sendReminders: true,
          reminderFrequency: 3
        }
      },
      assignedTo: {
        allEmployees: true
      },
      createdBy: testHR._id
    });
    await testSurvey.save();
  });

  describe('getAllSurveys', () => {
    it('should get all surveys', async () => {
      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllSurveys(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.surveys).toBeDefined();
      expect(Array.isArray(response.surveys)).toBe(true);
    });
  });

  describe('getEmployeeSurveys', () => {
    it('should get surveys assigned to employee', async () => {
      const req = {
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getEmployeeSurveys(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.surveys).toBeDefined();
      expect(Array.isArray(response.surveys)).toBe(true);
    });
  });

  describe('createSurvey', () => {
    it('should create a new survey', async () => {
      const surveyData = {
        title: 'New Survey',
        description: 'Test survey creation',
        surveyType: 'custom',
        questions: [
          {
            questionText: 'What do you think?',
            questionType: 'text',
            required: false,
            order: 1
          }
        ],
        settings: {
          isMandatory: false,
          allowAnonymous: false
        },
        assignedTo: {
          allEmployees: true
        }
      };

      const req = {
        body: surveyData,
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Survey created successfully');
      expect(response.survey.title).toBe('New Survey');
    });

    it('should handle validation errors when creating survey', async () => {
      const req = {
        body: {
          // Missing required fields
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getSurveyById', () => {
    it('should get a survey by ID', async () => {
      const req = {
        params: {
          id: testSurvey._id.toString()
        },
        user: {
          _id: testHR._id,
          role: 'hr'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSurveyById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.survey).toBeDefined();
      expect(response.survey._id.toString()).toBe(testSurvey._id.toString());
    });

    it('should return 404 for non-existent survey', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSurveyById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Survey not found');
    });
  });

  describe('updateSurvey', () => {
    it('should update a survey', async () => {
      const updatedData = {
        title: 'Updated Survey Title',
        description: 'Updated description'
      };

      const req = {
        params: {
          id: testSurvey._id.toString()
        },
        body: updatedData,
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Survey updated successfully');
      expect(response.survey.title).toBe('Updated Survey Title');
    });

    it('should return 404 when updating non-existent survey', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          title: 'Updated Survey'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Survey not found');
    });
  });

  describe('deleteSurvey', () => {
    it('should delete a survey', async () => {
      // Ensure the survey has no responses before trying to delete it
      testSurvey.responses = [];
      await testSurvey.save();

      const req = {
        params: {
          id: testSurvey._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Survey deleted successfully');

      // Verify survey was deleted
      const deletedSurvey = await Survey.findById(testSurvey._id);
      expect(deletedSurvey).toBeNull();
    });

    it('should return 404 when deleting non-existent survey', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Survey not found');
    });
  });

  describe('submitSurveyResponse', () => {
    it('should submit a survey response', async () => {
      // First publish the survey
      testSurvey.status = 'active';
      await testSurvey.save();

      const answers = [
        {
          questionId: testSurvey.questions[0]._id,
          answer: 4
        },
        {
          questionId: testSurvey.questions[1]._id,
          answer: true
        }
      ];

      const req = {
        params: {
          id: testSurvey._id.toString()
        },
        body: {
          answers,
          isAnonymous: false
        },
        user: {
          _id: testUser._id
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await submitSurveyResponse(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Survey response submitted successfully');
    });

    it('should return 404 for non-existent survey', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          answers: []
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await submitSurveyResponse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Survey not found');
    });
  });

  describe('publishSurvey', () => {
    it('should publish a survey', async () => {
      const req = {
        params: {
          id: testSurvey._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await publishSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Survey published successfully');
      expect(response.survey.status).toBe('active');
    });

    it('should return 404 for non-existent survey', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await publishSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Survey not found');
    });
  });

  describe('closeSurvey', () => {
    it('should close a survey', async () => {
      // First publish the survey
      testSurvey.status = 'active';
      await testSurvey.save();

      const req = {
        params: {
          id: testSurvey._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await closeSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Survey closed successfully');
      expect(response.survey.status).toBe('closed');
    });

    it('should return 404 for non-existent survey', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await closeSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Survey not found');
    });
  });

  describe('getSurveyStatistics', () => {
    it('should get survey statistics', async () => {
      const req = {
        params: {
          id: testSurvey._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSurveyStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.statistics).toBeDefined();
      expect(response.statistics.survey).toBeDefined();
    });

    it('should return 404 for non-existent survey', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSurveyStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Survey not found');
    });
  });

  describe('exportSurveyResponses', () => {
    it('should export survey responses in JSON format by default', async () => {
      // First publish the survey
      testSurvey.status = 'active';
      testSurvey.responses.push({
        respondent: testUser._id,
        answers: [
          {
            questionId: testSurvey.questions[0]._id,
            answer: 4
          },
          {
            questionId: testSurvey.questions[1]._id,
            answer: true
          }
        ],
        isComplete: true,
        submittedAt: new Date()
      });
      await testSurvey.save();

      const req = {
        params: {
          id: testSurvey._id.toString()
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn().mockReturnThis(),
        attachment: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      };

      await exportSurveyResponses(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.responses).toBeDefined();
      expect(Array.isArray(response.responses)).toBe(true);
    });

    it('should export survey responses in CSV format', async () => {
      // First publish the survey
      testSurvey.status = 'active';
      testSurvey.responses.push({
        respondent: testUser._id,
        answers: [
          {
            questionId: testSurvey.questions[0]._id,
            answer: 4
          }
        ],
        isComplete: true,
        submittedAt: new Date()
      });
      await testSurvey.save();

      const req = {
        params: {
          id: testSurvey._id.toString()
        },
        query: {
          format: 'csv'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn().mockReturnThis(),
        attachment: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      };

      await exportSurveyResponses(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.attachment).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 for non-existent survey', async () => {
      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn().mockReturnThis(),
        attachment: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      };

      await exportSurveyResponses(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Survey not found');
    });
  });
});