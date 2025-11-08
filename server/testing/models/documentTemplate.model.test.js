import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import DocumentTemplate from '../../models/documentTemplate.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('DocumentTemplate Model', () => {
  it('should create and save a document template successfully', async () => {
    const templateData = {
      name: 'Employment Contract Template',
      description: 'Standard employment contract template',
      fileUrl: 'https://example.com/templates/contract.docx',
      fileType: 'docx',
      isActive: true,
      createdBy: new mongoose.Types.ObjectId()
    };

    const template = new DocumentTemplate(templateData);
    const savedTemplate = await template.save();

    expect(savedTemplate._id).toBeDefined();
    expect(savedTemplate.name).toBe(templateData.name);
    expect(savedTemplate.description).toBe(templateData.description);
    expect(savedTemplate.fileUrl).toBe(templateData.fileUrl);
    expect(savedTemplate.fileType).toBe(templateData.fileType);
    expect(savedTemplate.isActive).toBe(templateData.isActive);
    expect(savedTemplate.createdBy.toString()).toBe(templateData.createdBy.toString());
  });

  it('should fail to create a document template without required fields', async () => {
    const templateData = {
      description: 'Template without required fields'
    };

    const template = new DocumentTemplate(templateData);
    
    let err;
    try {
      await template.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
    expect(err.errors.fileUrl).toBeDefined();
    expect(err.errors.fileType).toBeDefined();
    expect(err.errors.createdBy).toBeDefined();
  });
});