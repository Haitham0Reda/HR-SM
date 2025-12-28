import mongoose from 'mongoose';
import DocumentRepository from '../../repositories/modules/DocumentRepository.js';
import Document from '../../modules/documents/models/document.model.js';
import User from '../../modules/hr-core/models/User.js';
import Department from '../../modules/hr-core/models/Department.js';

describe('DocumentRepository', () => {
    let documentRepository;
    let testTenantId;
    let testUser;
    let testDepartment;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        documentRepository = new DocumentRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        await Document.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });

        testDepartment = await Department.create({
            tenantId: testTenantId,
            name: 'Test Department',
            code: 'TEST001'
        });

        testUser = await User.create({
            tenantId: testTenantId,
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            department: testDepartment._id
        });
    });

    afterAll(async () => {
        await Document.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });
    });

    describe('findByEmployee', () => {
        it('should find documents by employee', async () => {
            await Document.create({
                tenantId: testTenantId,
                title: 'Employee Contract',
                type: 'contract',
                employee: testUser._id,
                department: testDepartment._id,
                fileUrl: '/uploads/contract.pdf',
                fileName: 'contract.pdf',
                fileSize: 1024,
                uploadedBy: testUser._id
            });

            const documents = await documentRepository.findByEmployee(testUser._id, {
                tenantId: testTenantId
            });

            expect(documents).toHaveLength(1);
            expect(documents[0].title).toBe('Employee Contract');
        });
    });

    describe('findByType', () => {
        it('should find documents by type', async () => {
            await Document.create({
                tenantId: testTenantId,
                title: 'Contract 1',
                type: 'contract',
                employee: testUser._id,
                fileUrl: '/uploads/contract1.pdf',
                uploadedBy: testUser._id
            });

            await Document.create({
                tenantId: testTenantId,
                title: 'Certificate 1',
                type: 'certificate',
                employee: testUser._id,
                fileUrl: '/uploads/cert1.pdf',
                uploadedBy: testUser._id
            });

            const contracts = await documentRepository.findByType('contract', {
                tenantId: testTenantId
            });

            expect(contracts).toHaveLength(1);
            expect(contracts[0].type).toBe('contract');
        });
    });

    describe('findByDepartment', () => {
        it('should find documents by department', async () => {
            await Document.create({
                tenantId: testTenantId,
                title: 'Department Policy',
                type: 'other',
                department: testDepartment._id,
                fileUrl: '/uploads/policy.pdf',
                uploadedBy: testUser._id
            });

            const documents = await documentRepository.findByDepartment(testDepartment._id, {
                tenantId: testTenantId
            });

            expect(documents).toHaveLength(1);
            expect(documents[0].title).toBe('Department Policy');
        });
    });

    describe('findByUploadedBy', () => {
        it('should find documents uploaded by user', async () => {
            await Document.create({
                tenantId: testTenantId,
                title: 'Uploaded Document',
                type: 'other',
                fileUrl: '/uploads/doc.pdf',
                uploadedBy: testUser._id
            });

            const documents = await documentRepository.findByUploadedBy(testUser._id, {
                tenantId: testTenantId
            });

            expect(documents).toHaveLength(1);
            expect(documents[0].title).toBe('Uploaded Document');
        });
    });

    describe('findConfidentialDocuments', () => {
        it('should find confidential documents', async () => {
            await Document.create({
                tenantId: testTenantId,
                title: 'Confidential Document',
                type: 'contract',
                fileUrl: '/uploads/confidential.pdf',
                uploadedBy: testUser._id,
                isConfidential: true
            });

            await Document.create({
                tenantId: testTenantId,
                title: 'Public Document',
                type: 'certificate',
                fileUrl: '/uploads/public.pdf',
                uploadedBy: testUser._id,
                isConfidential: false
            });

            const confidentialDocs = await documentRepository.findConfidentialDocuments({
                tenantId: testTenantId
            });

            expect(confidentialDocs).toHaveLength(1);
            expect(confidentialDocs[0].isConfidential).toBe(true);
        });
    });

    describe('findExpiringDocuments', () => {
        it('should find documents expiring soon', async () => {
            const soonDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
            const farDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

            await Document.create({
                tenantId: testTenantId,
                title: 'Expiring Soon',
                type: 'contract',
                fileUrl: '/uploads/expiring.pdf',
                uploadedBy: testUser._id,
                expiryDate: soonDate
            });

            await Document.create({
                tenantId: testTenantId,
                title: 'Expiring Later',
                type: 'contract',
                fileUrl: '/uploads/later.pdf',
                uploadedBy: testUser._id,
                expiryDate: farDate
            });

            const expiringDocs = await documentRepository.findExpiringDocuments(30, {
                tenantId: testTenantId
            });

            expect(expiringDocs).toHaveLength(1);
            expect(expiringDocs[0].title).toBe('Expiring Soon');
        });
    });

    describe('findExpiredDocuments', () => {
        it('should find expired documents', async () => {
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
            const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

            await Document.create({
                tenantId: testTenantId,
                title: 'Expired Document',
                type: 'contract',
                fileUrl: '/uploads/expired.pdf',
                uploadedBy: testUser._id,
                expiryDate: pastDate
            });

            await Document.create({
                tenantId: testTenantId,
                title: 'Valid Document',
                type: 'contract',
                fileUrl: '/uploads/valid.pdf',
                uploadedBy: testUser._id,
                expiryDate: futureDate
            });

            const expiredDocs = await documentRepository.findExpiredDocuments({
                tenantId: testTenantId
            });

            expect(expiredDocs).toHaveLength(1);
            expect(expiredDocs[0].title).toBe('Expired Document');
        });
    });

    describe('searchDocuments', () => {
        it('should search documents by title', async () => {
            await Document.create({
                tenantId: testTenantId,
                title: 'Employee Contract Agreement',
                type: 'contract',
                fileUrl: '/uploads/contract.pdf',
                uploadedBy: testUser._id
            });

            await Document.create({
                tenantId: testTenantId,
                title: 'Training Certificate',
                type: 'certificate',
                fileUrl: '/uploads/cert.pdf',
                uploadedBy: testUser._id
            });

            const searchResults = await documentRepository.searchDocuments('contract', {
                tenantId: testTenantId
            });

            expect(searchResults).toHaveLength(1);
            expect(searchResults[0].title).toContain('Contract');
        });
    });

    describe('updateDocumentMetadata', () => {
        it('should update document metadata', async () => {
            const document = await Document.create({
                tenantId: testTenantId,
                title: 'Original Title',
                type: 'contract',
                fileUrl: '/uploads/doc.pdf',
                uploadedBy: testUser._id
            });

            const updatedDoc = await documentRepository.updateDocumentMetadata(
                document._id,
                { title: 'Updated Title', arabicTitle: 'العنوان المحدث' },
                testUser._id
            );

            expect(updatedDoc.title).toBe('Updated Title');
            expect(updatedDoc.arabicTitle).toBe('العنوان المحدث');
            expect(updatedDoc.updatedBy.toString()).toBe(testUser._id.toString());
        });
    });

    describe('findByFileSizeRange', () => {
        it('should find documents by file size range', async () => {
            await Document.create({
                tenantId: testTenantId,
                title: 'Small Document',
                type: 'contract',
                fileUrl: '/uploads/small.pdf',
                fileSize: 500,
                uploadedBy: testUser._id
            });

            await Document.create({
                tenantId: testTenantId,
                title: 'Large Document',
                type: 'contract',
                fileUrl: '/uploads/large.pdf',
                fileSize: 5000,
                uploadedBy: testUser._id
            });

            const smallDocs = await documentRepository.findByFileSizeRange(0, 1000, {
                tenantId: testTenantId
            });

            expect(smallDocs).toHaveLength(1);
            expect(smallDocs[0].title).toBe('Small Document');
        });
    });

    describe('getStorageUsageStats', () => {
        it('should calculate storage usage statistics', async () => {
            await Document.create({
                tenantId: testTenantId,
                title: 'Document 1',
                type: 'contract',
                fileUrl: '/uploads/doc1.pdf',
                fileSize: 1000,
                uploadedBy: testUser._id,
                isConfidential: true
            });

            await Document.create({
                tenantId: testTenantId,
                title: 'Document 2',
                type: 'certificate',
                fileUrl: '/uploads/doc2.pdf',
                fileSize: 2000,
                uploadedBy: testUser._id,
                isConfidential: false
            });

            const stats = await documentRepository.getStorageUsageStats({
                tenantId: testTenantId
            });

            expect(stats.totalDocuments).toBe(2);
            expect(stats.totalSize).toBe(3000);
            expect(stats.avgSize).toBe(1500);
            expect(stats.confidentialDocuments).toBe(1);
        });
    });
});