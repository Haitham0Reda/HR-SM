import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import SchoolRoutes from '../../routes/school.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  validateSchoolCode: (req, res, next) => next(),
  validateSchoolNameMatch: (req, res, next) => next(),
  checkSchoolCodeUnique: (req, res, next) => next(),
  validateDean: (req, res, next) => next(),
  validateSchoolDeletion: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/school.controller.js', () => ({
  getAllSchools: (req, res) => res.status(200).json({ message: 'All Schools' }),
  createSchool: (req, res) => res.status(201).json({ message: 'School Created' }),
  getSchoolById: (req, res) => res.status(200).json({ message: 'School By ID' }),
  getSchoolByCode: (req, res) => res.status(200).json({ message: 'School By Code' }),
  updateSchool: (req, res) => res.status(200).json({ message: 'School Updated' }),
  deleteSchool: (req, res) => res.status(200).json({ message: 'School Deleted' }),
  getActiveSchools: (req, res) => res.status(200).json({ message: 'Active Schools' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/schools', SchoolRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('School Routes', () => {
  it('should get all schools', async () => {
    const response = await request(app)
      .get('/api/schools')
      .expect(200);
    
    expect(response.body.message).toBe('All Schools');
  });

  it('should get active schools only', async () => {
    const response = await request(app)
      .get('/api/schools/active')
      .expect(200);
    
    expect(response.body.message).toBe('Active Schools');
  });

  it('should get school by code', async () => {
    const response = await request(app)
      .get('/api/schools/code/ENG')
      .expect(200);
    
    expect(response.body.message).toBe('School By Code');
  });

  it('should create a school', async () => {
    const response = await request(app)
      .post('/api/schools')
      .send({ name: 'Test School', schoolCode: 'TEST' })
      .expect(201);
    
    expect(response.body.message).toBe('School Created');
  });

  it('should get school by ID', async () => {
    const response = await request(app)
      .get('/api/schools/123')
      .expect(200);
    
    expect(response.body.message).toBe('School By ID');
  });

  it('should update a school', async () => {
    const response = await request(app)
      .put('/api/schools/123')
      .send({ name: 'Updated School' })
      .expect(200);
    
    expect(response.body.message).toBe('School Updated');
  });

  it('should delete a school', async () => {
    const response = await request(app)
      .delete('/api/schools/123')
      .expect(200);
    
    expect(response.body.message).toBe('School Deleted');
  });
});