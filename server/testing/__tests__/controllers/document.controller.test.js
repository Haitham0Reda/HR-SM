import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Document from '../../../models/document.model.js';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import {
  getAllDocuments,
  createDocument,
  getDocumentById,
  updateDocument,
  deleteDocument
} from '../../../controller/document.controller.js';

// Import Jest globals explicitly for ES modules
import { jest } from '@jest/globals';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Document Controller', () => {
  let testUser;
  let testDocument;
  let testSchool;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test school with valid enum values according to School model
    testSchool = new School({
      name: 'School of Business',
      schoolCode: 'BUS',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id
    });
    await testUser.save();

    // Create test document with valid type enum value
    testDocument = new Document({
      title: 'Employee Handbook',
      description: 'Complete employee handbook with policies and procedures',
      type: 'contract',
      category: 'hr',
      fileUrl: 'https://storage.example.com/documents/employee-handbook.pdf',
      fileName: 'employee-handbook.pdf',
      fileSize: 2048576, // 2MB
      mimeType: 'application/pdf',
      version: 1,
      status: 'active',
      visibility: 'public',
      uploadedBy: testUser._id,
      metadata: {
        pages: 45,
        language: 'en',
        confidential: false
      },
      accessPermissions: ['all_employees'],
      downloadCount: 15
    });
    await testDocument.save();
  });

  describe('getAllDocuments', () => {
    it('should get all documents', async () => {
      const req = {
        user: testUser
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.find to return our test data
      const originalFind = Document.find;
      Document.find = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockImplementation(() => {
                return {
                  populate: jest.fn().mockResolvedValue([testDocument])
                };
              }),
              sort: jest.fn().mockResolvedValue([testDocument])
            };
          })
        };
      });

      await getAllDocuments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Document.find = originalFind;
    });

    it('should handle errors when getting all documents', async () => {
      const req = {
        user: testUser
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.find to throw an error
      const originalFind = Document.find;
      Document.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getAllDocuments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Document.find = originalFind;
    });
  });

  describe('getDocumentById', () => {
    it('should get a document by ID', async () => {
      const req = {
        user: testUser,
        params: {
          id: testDocument._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.findById to return our test data
      const originalFindById = Document.findById;
      Document.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockImplementation(() => {
                return {
                  populate: jest.fn().mockResolvedValue(testDocument)
                };
              })
            };
          })
        };
      });

      await getDocumentById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe('Employee Handbook');

      // Restore original implementation
      Document.findById = originalFindById;
    });

    it('should return 404 when document not found', async () => {
      const req = {
        user: testUser,
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.findById to return null
      const originalFindById = Document.findById;
      Document.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockImplementation(() => {
            return {
              populate: jest.fn().mockImplementation(() => {
                return {
                  populate: jest.fn().mockResolvedValue(null)
                };
              })
            };
          })
        };
      });

      await getDocumentById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Document not found');

      // Restore original implementation
      Document.findById = originalFindById;
    });

    it('should handle errors when getting document by ID', async () => {
      const req = {
        user: testUser,
        params: {
          id: testDocument._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.findById to throw an error
      const originalFindById = Document.findById;
      Document.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getDocumentById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Document.findById = originalFindById;
    });
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const documentData = {
        title: 'New Document',
        description: 'A new test document',
        type: 'certificate',
        category: 'hr',
        fileUrl: 'https://storage.example.com/documents/new-document.pdf',
        fileName: 'new-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        version: 1,
        status: 'active',
        visibility: 'public',
        uploadedBy: testUser._id,
        metadata: {
          pages: 10,
          language: 'en',
          confidential: false
        },
        accessPermissions: ['all_employees']
      };

      const req = {
        user: testUser,
        body: documentData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock new document save
      const newDocument = new Document(documentData);
      newDocument._id = new mongoose.Types.ObjectId();
      
      const originalSave = newDocument.save;
      newDocument.save = jest.fn().mockResolvedValue(newDocument);

      // Mock Document constructor
      const originalDocumentConstructor = Document;
      jest.spyOn(global, 'Document').mockImplementation((data) => {
        const document = new originalDocumentConstructor(data);
        document._id = newDocument._id;
        document.save = newDocument.save;
        return document;
      });

      await createDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe('New Document');

      // Restore original implementations
      global.Document = originalDocumentConstructor;
    });

    it('should handle validation errors when creating document', async () => {
      const req = {
        user: testUser,
        body: {
          // Missing required fields
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('updateDocument', () => {
    it('should update a document', async () => {
      const updateData = {
        title: 'Updated Document',
        description: 'An updated test document'
      };

      const req = {
        user: testUser,
        params: {
          id: testDocument._id.toString()
        },
        body: updateData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.findByIdAndUpdate to return updated data
      const originalFindByIdAndUpdate = Document.findByIdAndUpdate;
      Document.findByIdAndUpdate = jest.fn().mockResolvedValue({
        ...testDocument.toObject(),
        ...updateData
      });

      await updateDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe('Updated Document');

      // Restore original implementation
      Document.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should return 404 when updating non-existent document', async () => {
      const req = {
        user: testUser,
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          title: 'Updated Document'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.findByIdAndUpdate to return null
      const originalFindByIdAndUpdate = Document.findByIdAndUpdate;
      Document.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await updateDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Document not found');

      // Restore original implementation
      Document.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should handle validation errors when updating document', async () => {
      const req = {
        user: testUser,
        params: {
          id: testDocument._id.toString()
        },
        body: {
          // Invalid data that would cause validation error
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.findByIdAndUpdate to throw an error
      const originalFindByIdAndUpdate = Document.findByIdAndUpdate;
      Document.findByIdAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Validation error');
      });

      await updateDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Document.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      const req = {
        user: testUser,
        params: {
          id: testDocument._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.findByIdAndDelete to return our test data
      const originalFindByIdAndDelete = Document.findByIdAndDelete;
      Document.findByIdAndDelete = jest.fn().mockResolvedValue(testDocument);

      await deleteDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('Document deleted');

      // Restore original implementation
      Document.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should return 404 when deleting non-existent document', async () => {
      const req = {
        user: testUser,
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.findByIdAndDelete to return null
      const originalFindByIdAndDelete = Document.findByIdAndDelete;
      Document.findByIdAndDelete = jest.fn().mockResolvedValue(null);

      await deleteDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Document not found');

      // Restore original implementation
      Document.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should handle errors when deleting document', async () => {
      const req = {
        user: testUser,
        params: {
          id: testDocument._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Document.findByIdAndDelete to throw an error
      const originalFindByIdAndDelete = Document.findByIdAndDelete;
      Document.findByIdAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await deleteDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Database error');

      // Restore original implementation
      Document.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });
});