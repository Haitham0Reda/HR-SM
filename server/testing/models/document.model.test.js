import mongoose from 'mongoose';
import Document from '../../models/document.model.js';

describe('Document Model', () => {
  it('should create and save a document successfully', async () => {
    const documentData = {
      title: 'Employment Contract',
      type: 'contract',
      employee: new mongoose.Types.ObjectId(),
      fileUrl: 'https://example.com/documents/contract.pdf',
      fileName: 'contract.pdf',
      fileSize: 1024000,
      uploadedBy: new mongoose.Types.ObjectId(),
      isConfidential: false
    };

    const document = new Document(documentData);
    const savedDocument = await document.save();

    expect(savedDocument._id).toBeDefined();
    expect(savedDocument.title).toBe(documentData.title);
    expect(savedDocument.type).toBe(documentData.type);
    expect(savedDocument.employee.toString()).toBe(documentData.employee.toString());
    expect(savedDocument.fileUrl).toBe(documentData.fileUrl);
    expect(savedDocument.fileName).toBe(documentData.fileName);
    expect(savedDocument.fileSize).toBe(documentData.fileSize);
    expect(savedDocument.uploadedBy.toString()).toBe(documentData.uploadedBy.toString());
    expect(savedDocument.isConfidential).toBe(documentData.isConfidential);
  });

  it('should fail to create a document without required fields', async () => {
    const documentData = {
      title: 'Document without required fields'
    };

    const document = new Document(documentData);
    
    let err;
    try {
      await document.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.type).toBeDefined();
    expect(err.errors.fileUrl).toBeDefined();
    expect(err.errors.uploadedBy).toBeDefined();
  });

  it('should handle Arabic title', async () => {
    const documentData = {
      title: 'Employment Contract',
      arabicTitle: 'عقد العمل',
      type: 'contract',
      employee: new mongoose.Types.ObjectId(),
      fileUrl: 'https://example.com/documents/contract.pdf',
      fileName: 'contract.pdf',
      fileSize: 1024000,
      uploadedBy: new mongoose.Types.ObjectId(),
      isConfidential: false
    };

    const document = new Document(documentData);
    const savedDocument = await document.save();

    expect(savedDocument.arabicTitle).toBe(documentData.arabicTitle);
  });
});