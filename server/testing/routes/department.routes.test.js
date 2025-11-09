import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import DepartmentRoutes from '../../routes/department.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  checkDepartmentCodeUnique: (req, res, next) => next(),
  validateManager: (req, res, next) => next(),
  validateSchool: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/department.controller.js', () => ({
  getAllDepartments: (req, res) => res.status(200).json({ message: 'All Departments' }),
  createDepartment: (req, res) => res.status(201).json({ message: 'Department Created' }),
  getDepartmentById: (req, res) => res.status(200).json({ message: 'Department By ID' }),
  updateDepartment: (req, res) => res.status(200).json({ message: 'Department Updated' }),
  deleteDepartment: (req, res) => res.status(200).json({ message: 'Department Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/departments', DepartmentRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Department Routes', () => {
  it('should get all departments', async () => {
    const response = await request(app)
      .get('/api/departments')
      .expect(200);
    
    expect(response.body.message).toBe('All Departments');
  });

  it('should create a department', async () => {
    const response = await request(app)
      .post('/api/departments')
      .send({ name: 'Test Department', code: 'TEST' })
      .expect(201);
    
    expect(response.body.message).toBe('Department Created');
  });

  it('should get department by ID', async () => {
    const response = await request(app)
      .get('/api/departments/123')
      .expect(200);
    
    expect(response.body.message).toBe('Department By ID');
  });

  it('should update a department', async () => {
    const response = await request(app)
      .put('/api/departments/123')
      .send({ name: 'Updated Department' })
      .expect(200);
    
    expect(response.body.message).toBe('Department Updated');
  });

  it('should delete a department', async () => {
    const response = await request(app)
      .delete('/api/departments/123')
      .expect(200);
    
    expect(response.body.message).toBe('Department Deleted');
  });
});