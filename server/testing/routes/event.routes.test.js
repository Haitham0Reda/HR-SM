import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import EventRoutes from '../../routes/event.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  validateEventDates: (req, res, next) => next(),
  setEventCreatedBy: (req, res, next) => next(),
  validateAttendees: (req, res, next) => next(),
  validateEventNotPast: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/event.controller.js', () => ({
  getAllEvents: (req, res) => res.status(200).json({ message: 'All Events' }),
  createEvent: (req, res) => res.status(201).json({ message: 'Event Created' }),
  getEventById: (req, res) => res.status(200).json({ message: 'Event By ID' }),
  updateEvent: (req, res) => res.status(200).json({ message: 'Event Updated' }),
  deleteEvent: (req, res) => res.status(200).json({ message: 'Event Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/events', EventRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Event Routes', () => {
  it('should get all events', async () => {
    const response = await request(app)
      .get('/api/events')
      .expect(200);
    
    expect(response.body.message).toBe('All Events');
  });

  it('should create an event', async () => {
    const response = await request(app)
      .post('/api/events')
      .send({ title: 'Test Event', startDate: '2023-01-01', endDate: '2023-01-02' })
      .expect(201);
    
    expect(response.body.message).toBe('Event Created');
  });

  it('should get event by ID', async () => {
    const response = await request(app)
      .get('/api/events/123')
      .expect(200);
    
    expect(response.body.message).toBe('Event By ID');
  });

  it('should update an event', async () => {
    const response = await request(app)
      .put('/api/events/123')
      .send({ title: 'Updated Event' })
      .expect(200);
    
    expect(response.body.message).toBe('Event Updated');
  });

  it('should delete an event', async () => {
    const response = await request(app)
      .delete('/api/events/123')
      .expect(200);
    
    expect(response.body.message).toBe('Event Deleted');
  });
});