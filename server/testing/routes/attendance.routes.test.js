import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import AttendanceRoutes from '../../routes/attendance.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  checkActive: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/attendance.controller.js', () => ({
  getAllAttendance: (req, res) => res.status(200).json({ message: 'All Attendance Records' }),
  createAttendance: (req, res) => res.status(201).json({ message: 'Attendance Record Created' }),
  getAttendanceById: (req, res) => res.status(200).json({ message: 'Attendance Record By ID' }),
  updateAttendance: (req, res) => res.status(200).json({ message: 'Attendance Record Updated' }),
  deleteAttendance: (req, res) => res.status(200).json({ message: 'Attendance Record Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/attendance', AttendanceRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Attendance Routes', () => {
  it('should get all attendance records', async () => {
    const response = await request(app)
      .get('/api/attendance')
      .expect(200);
    
    expect(response.body.message).toBe('All Attendance Records');
  });

  it('should create an attendance record', async () => {
    const response = await request(app)
      .post('/api/attendance')
      .send({ employeeId: '123', date: '2023-01-01', status: 'present' })
      .expect(201);
    
    expect(response.body.message).toBe('Attendance Record Created');
  });

  it('should get attendance record by ID', async () => {
    const response = await request(app)
      .get('/api/attendance/123')
      .expect(200);
    
    expect(response.body.message).toBe('Attendance Record By ID');
  });

  it('should update an attendance record', async () => {
    const response = await request(app)
      .put('/api/attendance/123')
      .send({ status: 'absent' })
      .expect(200);
    
    expect(response.body.message).toBe('Attendance Record Updated');
  });

  it('should delete an attendance record', async () => {
    const response = await request(app)
      .delete('/api/attendance/123')
      .expect(200);
    
    expect(response.body.message).toBe('Attendance Record Deleted');
  });
});