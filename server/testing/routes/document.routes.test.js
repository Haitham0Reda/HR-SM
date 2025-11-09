import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import DocumentRoutes from '../../routes/document.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  validateDocumentEmployee: (req, res, next) => next(),
  setUploadedBy: (req, res, next) => next(),
  validateDocumentExpiry: (req, res, next) => next(),
  checkDocumentAccess: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/document.controller.js', () => ({
  getAllDocuments: (req, res) => res.status(200).json({ message: 'All Documents' }),
  createDocument: (req, res) => res.status(201).json({ message: 'Document Created' }),
  getDocumentById: (req, res) => res.status(200).json({ message: 'Document By ID' }),
  updateDocument: (req, res) => res.status(200).json({ message: 'Document Updated' }),
  deleteDocument: (req, res) => res.status(200).json({ message: 'Document Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/documents', DocumentRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Document Routes', () => {
  it('should get all documents', async () => {
    const response = await request(app)
      .get('/api/documents')
      .expect(200);
    
    expect(response.body.message).toBe('All Documents');
  });

  it('should create a document', async () => {
    const response = await request(app)
      .post('/api/documents')
      .send({ title: 'Test Document', type: 'contract' })
      .expect(201);
    
    expect(response.body.message).toBe('Document Created');
  });

  it('should get document by ID', async () => {
    const response = await request(app)
      .get('/api/documents/123')
      .expect(200);
    
    expect(response.body.message).toBe('Document By ID');
  });

  it('should update a document', async () => {
    const response = await request(app)
      .put('/api/documents/123')
      .send({ title: 'Updated Document' })
      .expect(200);
    
    expect(response.body.message).toBe('Document Updated');
  });

  it('should delete a document', async () => {
    const response = await request(app)
      .delete('/api/documents/123')
      .expect(200);
    
    expect(response.body.message).toBe('Document Deleted');
  });
});