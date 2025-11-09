import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import AnnouncementRoutes from '../../routes/announcement.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  validateAnnouncementDates: (req, res, next) => next(),
  validateTargetAudience: (req, res, next) => next(),
  setCreatedBy: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/announcement.controller.js', () => ({
  getAllAnnouncements: (req, res) => res.status(200).json({ message: 'All Announcements' }),
  createAnnouncement: (req, res) => res.status(201).json({ message: 'Announcement Created' }),
  getAnnouncementById: (req, res) => res.status(200).json({ message: 'Announcement By ID' }),
  updateAnnouncement: (req, res) => res.status(200).json({ message: 'Announcement Updated' }),
  deleteAnnouncement: (req, res) => res.status(200).json({ message: 'Announcement Deleted' }),
  getActiveAnnouncements: (req, res) => res.status(200).json({ message: 'Active Announcements' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/announcements', AnnouncementRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Announcement Routes', () => {
  it('should get active announcements', async () => {
    const response = await request(app)
      .get('/api/announcements/active')
      .expect(200);
    
    expect(response.body.message).toBe('Active Announcements');
  });

  it('should get all announcements', async () => {
    const response = await request(app)
      .get('/api/announcements')
      .expect(200);
    
    expect(response.body.message).toBe('All Announcements');
  });

  it('should create an announcement', async () => {
    const response = await request(app)
      .post('/api/announcements')
      .send({ title: 'Test Announcement', content: 'Test Content' })
      .expect(201);
    
    expect(response.body.message).toBe('Announcement Created');
  });

  it('should get announcement by ID', async () => {
    const response = await request(app)
      .get('/api/announcements/123')
      .expect(200);
    
    expect(response.body.message).toBe('Announcement By ID');
  });

  it('should update an announcement', async () => {
    const response = await request(app)
      .put('/api/announcements/123')
      .send({ title: 'Updated Announcement', content: 'Updated Content' })
      .expect(200);
    
    expect(response.body.message).toBe('Announcement Updated');
  });

  it('should delete an announcement', async () => {
    const response = await request(app)
      .delete('/api/announcements/123')
      .expect(200);
    
    expect(response.body.message).toBe('Announcement Deleted');
  });
});