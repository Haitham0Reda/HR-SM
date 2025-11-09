import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import SurveyRoutes from '../../routes/survey.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  validateSurveyQuestions: (req, res, next) => next(),
  setSurveyCreatedBy: (req, res, next) => next(),
  validateSurveyResponse: (req, res, next) => next(),
  checkDuplicateResponse: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/survey.controller.js', () => ({
  getAllSurveys: (req, res) => res.status(200).json({ message: 'All Surveys' }),
  getEmployeeSurveys: (req, res) => res.status(200).json({ message: 'Employee Surveys' }),
  createSurvey: (req, res) => res.status(201).json({ message: 'Survey Created' }),
  getSurveyById: (req, res) => res.status(200).json({ message: 'Survey By ID' }),
  updateSurvey: (req, res) => res.status(200).json({ message: 'Survey Updated' }),
  deleteSurvey: (req, res) => res.status(200).json({ message: 'Survey Deleted' }),
  submitSurveyResponse: (req, res) => res.status(200).json({ message: 'Survey Response Submitted' }),
  publishSurvey: (req, res) => res.status(200).json({ message: 'Survey Published' }),
  closeSurvey: (req, res) => res.status(200).json({ message: 'Survey Closed' }),
  getSurveyStatistics: (req, res) => res.status(200).json({ message: 'Survey Statistics' }),
  exportSurveyResponses: (req, res) => res.status(200).json({ message: 'Survey Responses Exported' })
}));

// Mock survey notification controller
jest.mock('../../controller/surveyNotification.controller.js', () => ({
  getUserNotifications: (req, res) => res.status(200).json({ message: 'User Notifications' }),
  markNotificationAsRead: (req, res) => res.status(200).json({ message: 'Notification Marked As Read' }),
  sendSurveyReminders: (req, res) => res.status(200).json({ message: 'Survey Reminders Sent' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/surveys', SurveyRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Survey Routes', () => {
  it('should get all surveys', async () => {
    const response = await request(app)
      .get('/api/surveys')
      .expect(200);
    
    expect(response.body.message).toBe('All Surveys');
  });

  it('should get employee assigned surveys', async () => {
    const response = await request(app)
      .get('/api/surveys/my-surveys')
      .expect(200);
    
    expect(response.body.message).toBe('Employee Surveys');
  });

  it('should get survey by ID', async () => {
    const response = await request(app)
      .get('/api/surveys/123')
      .expect(200);
    
    expect(response.body.message).toBe('Survey By ID');
  });

  it('should create a survey', async () => {
    const response = await request(app)
      .post('/api/surveys')
      .send({ title: 'Test Survey', questions: [] })
      .expect(201);
    
    expect(response.body.message).toBe('Survey Created');
  });

  it('should update a survey', async () => {
    const response = await request(app)
      .put('/api/surveys/123')
      .send({ title: 'Updated Survey' })
      .expect(200);
    
    expect(response.body.message).toBe('Survey Updated');
  });

  it('should delete a survey', async () => {
    const response = await request(app)
      .delete('/api/surveys/123')
      .expect(200);
    
    expect(response.body.message).toBe('Survey Deleted');
  });

  it('should publish a survey', async () => {
    const response = await request(app)
      .post('/api/surveys/123/publish')
      .expect(200);
    
    expect(response.body.message).toBe('Survey Published');
  });

  it('should close a survey', async () => {
    const response = await request(app)
      .post('/api/surveys/123/close')
      .expect(200);
    
    expect(response.body.message).toBe('Survey Closed');
  });

  it('should send reminders', async () => {
    const response = await request(app)
      .post('/api/surveys/123/send-reminders')
      .expect(200);
    
    expect(response.body.message).toBe('Survey Reminders Sent');
  });

  it('should submit survey response', async () => {
    const response = await request(app)
      .post('/api/surveys/123/respond')
      .send({ answers: [] })
      .expect(200);
    
    expect(response.body.message).toBe('Survey Response Submitted');
  });

  it('should get survey statistics', async () => {
    const response = await request(app)
      .get('/api/surveys/123/statistics')
      .expect(200);
    
    expect(response.body.message).toBe('Survey Statistics');
  });

  it('should export survey responses', async () => {
    const response = await request(app)
      .get('/api/surveys/123/export')
      .expect(200);
    
    expect(response.body.message).toBe('Survey Responses Exported');
  });

  it('should get user survey notifications', async () => {
    const response = await request(app)
      .get('/api/surveys/notifications/me')
      .expect(200);
    
    expect(response.body.message).toBe('User Notifications');
  });

  it('should mark notification as read', async () => {
    const response = await request(app)
      .put('/api/surveys/notifications/123/read')
      .expect(200);
    
    expect(response.body.message).toBe('Notification Marked As Read');
  });
});