import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import HolidayRoutes from '../../routes/holiday.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  validateCampus: (req, res, next) => next(),
  validateDateFormat: (req, res, next) => next(),
  validateHolidayData: (req, res, next) => next(),
  validateWeekendWorkDay: (req, res, next) => next(),
  validateSuggestions: (req, res, next) => next(),
  validateYear: (req, res, next) => next(),
  validateCountryCode: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/holiday.controller.js', () => ({
  getHolidaySettings: (req, res) => res.status(200).json({ message: 'Holiday Settings' }),
  updateHolidaySettings: (req, res) => res.status(200).json({ message: 'Holiday Settings Updated' }),
  addOfficialHolidays: (req, res) => res.status(201).json({ message: 'Official Holidays Added' }),
  removeOfficialHoliday: (req, res) => res.status(200).json({ message: 'Official Holiday Removed' }),
  addWeekendWorkDays: (req, res) => res.status(201).json({ message: 'Weekend Work Days Added' }),
  removeWeekendWorkDay: (req, res) => res.status(200).json({ message: 'Weekend Work Day Removed' }),
  getHolidaySuggestions: (req, res) => res.status(200).json({ message: 'Holiday Suggestions' }),
  addFromSuggestions: (req, res) => res.status(201).json({ message: 'Holidays Added From Suggestions' }),
  checkWorkingDay: (req, res) => res.status(200).json({ message: 'Working Day Check' }),
  parseDateString: (req, res) => res.status(200).json({ message: 'Date String Parsed' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/holidays', HolidayRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Holiday Routes', () => {
  it('should get holiday settings for campus', async () => {
    const response = await request(app)
      .get('/api/holidays/campus/123')
      .expect(200);
    
    expect(response.body.message).toBe('Holiday Settings');
  });

  it('should update holiday settings', async () => {
    const response = await request(app)
      .put('/api/holidays/campus/123')
      .send({ settings: 'updated' })
      .expect(200);
    
    expect(response.body.message).toBe('Holiday Settings Updated');
  });

  it('should add official holidays', async () => {
    const response = await request(app)
      .post('/api/holidays/campus/123/official')
      .send({ holidays: ['2023-01-01'] })
      .expect(201);
    
    expect(response.body.message).toBe('Official Holidays Added');
  });

  it('should remove official holiday', async () => {
    const response = await request(app)
      .delete('/api/holidays/campus/123/official/456')
      .expect(200);
    
    expect(response.body.message).toBe('Official Holiday Removed');
  });

  it('should add weekend work days', async () => {
    const response = await request(app)
      .post('/api/holidays/campus/123/weekend-work')
      .send({ workDays: ['2023-01-01'] })
      .expect(201);
    
    expect(response.body.message).toBe('Weekend Work Days Added');
  });

  it('should remove weekend work day', async () => {
    const response = await request(app)
      .delete('/api/holidays/campus/123/weekend-work/456')
      .expect(200);
    
    expect(response.body.message).toBe('Weekend Work Day Removed');
  });

  it('should get holiday suggestions', async () => {
    const response = await request(app)
      .get('/api/holidays/campus/123/suggestions')
      .expect(200);
    
    expect(response.body.message).toBe('Holiday Suggestions');
  });

  it('should add holidays from suggestions', async () => {
    const response = await request(app)
      .post('/api/holidays/campus/123/suggestions')
      .send({ suggestions: [1, 2, 3] })
      .expect(201);
    
    expect(response.body.message).toBe('Holidays Added From Suggestions');
  });

  it('should check if date is working day', async () => {
    const response = await request(app)
      .get('/api/holidays/campus/123/check-working-day')
      .expect(200);
    
    expect(response.body.message).toBe('Working Day Check');
  });

  it('should parse date string', async () => {
    const response = await request(app)
      .get('/api/holidays/parse-date')
      .expect(200);
    
    expect(response.body.message).toBe('Date String Parsed');
  });
});