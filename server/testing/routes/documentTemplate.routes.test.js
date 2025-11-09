import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import DocumentTemplateRoutes from '../../routes/documentTemplate.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  hrOrAdmin: (req, res, next) => next(),
  validateTemplateFileType: (req, res, next) => next(),
  checkTemplateNameUnique: (req, res, next) => next(),
  setTemplateCreatedBy: (req, res, next) => next(),
  validateTemplateFile: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/documentTemplate.controller.js', () => ({
  getAllDocumentTemplates: (req, res) => res.status(200).json({ message: 'All Document Templates' }),
  createDocumentTemplate: (req, res) => res.status(201).json({ message: 'Document Template Created' }),
  getDocumentTemplateById: (req, res) => res.status(200).json({ message: 'Document Template By ID' }),
  updateDocumentTemplate: (req, res) => res.status(200).json({ message: 'Document Template Updated' }),
  deleteDocumentTemplate: (req, res) => res.status(200).json({ message: 'Document Template Deleted' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/document-templates', DocumentTemplateRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Document Template Routes', () => {
  it('should get all document templates', async () => {
    const response = await request(app)
      .get('/api/document-templates')
      .expect(200);
    
    expect(response.body.message).toBe('All Document Templates');
  });

  it('should create a document template', async () => {
    const response = await request(app)
      .post('/api/document-templates')
      .send({ name: 'Test Template', type: 'contract' })
      .expect(201);
    
    expect(response.body.message).toBe('Document Template Created');
  });

  it('should get document template by ID', async () => {
    const response = await request(app)
      .get('/api/document-templates/123')
      .expect(200);
    
    expect(response.body.message).toBe('Document Template By ID');
  });

  it('should update a document template', async () => {
    const response = await request(app)
      .put('/api/document-templates/123')
      .send({ name: 'Updated Template' })
      .expect(200);
    
    expect(response.body.message).toBe('Document Template Updated');
  });

  it('should delete a document template', async () => {
    const response = await request(app)
      .delete('/api/document-templates/123')
      .expect(200);
    
    expect(response.body.message).toBe('Document Template Deleted');
  });
});