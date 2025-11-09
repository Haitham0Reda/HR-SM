import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import NotificationRoutes from '../../routes/notification.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/notification.controller.js', () => ({
  getAllNotifications: (req, res) => res.status(200).json({ message: 'All Notifications' }),
  createNotification: (req, res) => res.status(201).json({ message: 'Notification Created' }),
  getNotificationById: (req, res) => res.status(200).json({ message: 'Notification By ID' }),
  updateNotification: (req, res) => res.status(200).json({ message: 'Notification Updated' }),
  deleteNotification: (req, res) => res.status(200).json({ message: 'Notification Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/notifications', NotificationRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Notification Routes', () => {
  it('should get all notifications', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .expect(200);
    
    expect(response.body.message).toBe('All Notifications');
  });

  it('should create a notification', async () => {
    const response = await request(app)
      .post('/api/notifications')
      .send({ title: 'Test Notification', type: 'info' })
      .expect(201);
    
    expect(response.body.message).toBe('Notification Created');
  });

  it('should get notification by ID', async () => {
    const response = await request(app)
      .get('/api/notifications/123')
      .expect(200);
    
    expect(response.body.message).toBe('Notification By ID');
  });

  it('should update a notification', async () => {
    const response = await request(app)
      .put('/api/notifications/123')
      .send({ title: 'Updated Notification' })
      .expect(200);
    
    expect(response.body.message).toBe('Notification Updated');
  });

  it('should delete a notification', async () => {
    const response = await request(app)
      .delete('/api/notifications/123')
      .expect(200);
    
    expect(response.body.message).toBe('Notification Deleted');
  });
});