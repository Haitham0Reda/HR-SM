import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import PositionRoutes from '../../routes/position.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  checkPositionCodeUnique: (req, res, next) => next(),
  validatePositionDepartment: (req, res, next) => next(),
  validatePositionDeletion: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/position.controller.js', () => ({
  getAllPositions: (req, res) => res.status(200).json({ message: 'All Positions' }),
  createPosition: (req, res) => res.status(201).json({ message: 'Position Created' }),
  getPositionById: (req, res) => res.status(200).json({ message: 'Position By ID' }),
  updatePosition: (req, res) => res.status(200).json({ message: 'Position Updated' }),
  deletePosition: (req, res) => res.status(200).json({ message: 'Position Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/positions', PositionRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Position Routes', () => {
  it('should get all positions', async () => {
    const response = await request(app)
      .get('/api/positions')
      .expect(200);
    
    expect(response.body.message).toBe('All Positions');
  });

  it('should create a position', async () => {
    const response = await request(app)
      .post('/api/positions')
      .send({ name: 'Test Position', code: 'TEST' })
      .expect(201);
    
    expect(response.body.message).toBe('Position Created');
  });

  it('should get position by ID', async () => {
    const response = await request(app)
      .get('/api/positions/123')
      .expect(200);
    
    expect(response.body.message).toBe('Position By ID');
  });

  it('should update a position', async () => {
    const response = await request(app)
      .put('/api/positions/123')
      .send({ name: 'Updated Position' })
      .expect(200);
    
    expect(response.body.message).toBe('Position Updated');
  });

  it('should delete a position', async () => {
    const response = await request(app)
      .delete('/api/positions/123')
      .expect(200);
    
    expect(response.body.message).toBe('Position Deleted');
  });
});