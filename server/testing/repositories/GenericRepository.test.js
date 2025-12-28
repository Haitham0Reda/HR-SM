import mongoose from 'mongoose';
import GenericRepository from '../../repositories/GenericRepository.js';

// Test model schema
const testSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    tenantId: {
        type: String,
        required: true
    },
    category: String,
    tags: [String]
}, {
    timestamps: true
});

const TestModel = mongoose.model('GenericRepositoryTest', testSchema);

describe('GenericRepository', () => {
    let repository;
    const testTenantId = 'test-tenant-123';

    beforeEach(() => {
        repository = new GenericRepository(TestModel);
    });

    afterEach(async () => {
        await TestModel.deleteMany({});
    });

    describe('Constructor and Factory', () => {
        test('should create instance with model', () => {
            expect(repository.model).toBe(TestModel);
            expect(repository.modelName).toBe('GenericRepositoryTest');
        });

        test('should create instance using factory method', () => {
            const repo = GenericRepository.for(TestModel);
            expect(repo).toBeInstanceOf(GenericRepository);
            expect(repo.model).toBe(TestModel);
        });
    });

    describe('bulkCreate', () => {
        test('should create multiple documents', async () => {
            const documents = [
                { name: 'User 1', email: 'user1@example.com', tenantId: testTenantId },
                { name: 'User 2', email: 'user2@example.com', tenantId: testTenantId },
                { name: 'User 3', email: 'user3@example.com', tenantId: testTenantId }
            ];

            const results = await repository.bulkCreate(documents);

            expect(results).toHaveLength(3);
            expect(results.every(doc => doc._id)).toBe(true);
            expect(results.every(doc => doc.tenantId === testTenantId)).toBe(true);
        });

        test('should add tenantId from options', async () => {
            const documents = [
                { name: 'User 1', email: 'user1@example.com' },
                { name: 'User 2', email: 'user2@example.com' }
            ];

            const results = await repository.bulkCreate(documents, { tenantId: testTenantId });

            expect(results).toHaveLength(2);
            expect(results.every(doc => doc.tenantId === testTenantId)).toBe(true);
        });

        test('should handle validation errors with ordered=true', async () => {
            const documents = [
                { name: 'User 1', email: 'user1@example.com', tenantId: testTenantId },
                { email: 'user2@example.com', tenantId: testTenantId }, // Missing required name
                { name: 'User 3', email: 'user3@example.com', tenantId: testTenantId }
            ];

            await expect(repository.bulkCreate(documents, { ordered: true })).rejects.toThrow();

            // With ordered=true, should stop at first error
            const count = await TestModel.countDocuments();
            expect(count).toBe(1); // Only first document created
        });

        test('should continue on errors with ordered=false', async () => {
            const documents = [
                { name: 'User 1', email: 'user1@example.com', tenantId: testTenantId },
                { email: 'user2@example.com', tenantId: testTenantId }, // Missing required name
                { name: 'User 3', email: 'user3@example.com', tenantId: testTenantId }
            ];

            await expect(repository.bulkCreate(documents, { ordered: false })).rejects.toThrow();

            // With ordered=false, valid documents should still be created
            const count = await TestModel.countDocuments();
            expect(count).toBe(2); // First and third documents created
        });
    });

    describe('bulkUpdate', () => {
        beforeEach(async () => {
            await TestModel.create([
                { name: 'User 1', email: 'user1@example.com', age: 25, tenantId: testTenantId },
                { name: 'User 2', email: 'user2@example.com', age: 30, tenantId: testTenantId },
                { name: 'User 3', email: 'user3@example.com', age: 35, tenantId: 'other-tenant' }
            ]);
        });

        test('should update multiple documents', async () => {
            const result = await repository.bulkUpdate(
                { tenantId: testTenantId },
                { status: 'inactive' }
            );

            expect(result.matchedCount).toBe(2);
            expect(result.modifiedCount).toBe(2);
            expect(result.acknowledged).toBe(true);

            const updatedDocs = await TestModel.find({ tenantId: testTenantId });
            expect(updatedDocs.every(doc => doc.status === 'inactive')).toBe(true);
        });

        test('should apply tenantId filter from options', async () => {
            const result = await repository.bulkUpdate(
                { age: { $gte: 30 } },
                { status: 'inactive' },
                { tenantId: testTenantId }
            );

            expect(result.matchedCount).toBe(1); // Only User 2 matches
            expect(result.modifiedCount).toBe(1);

            const user2 = await TestModel.findOne({ name: 'User 2' });
            expect(user2.status).toBe('inactive');

            const user3 = await TestModel.findOne({ name: 'User 3' });
            expect(user3.status).toBe('active'); // Different tenant, not updated
        });
    });

    describe('bulkDelete', () => {
        beforeEach(async () => {
            await TestModel.create([
                { name: 'User 1', email: 'user1@example.com', tenantId: testTenantId },
                { name: 'User 2', email: 'user2@example.com', tenantId: testTenantId },
                { name: 'User 3', email: 'user3@example.com', tenantId: 'other-tenant' }
            ]);
        });

        test('should delete multiple documents', async () => {
            const result = await repository.bulkDelete({ tenantId: testTenantId });

            expect(result.deletedCount).toBe(2);
            expect(result.acknowledged).toBe(true);

            const remainingCount = await TestModel.countDocuments();
            expect(remainingCount).toBe(1); // Only other-tenant document remains
        });

        test('should apply tenantId filter from options', async () => {
            const result = await repository.bulkDelete(
                { name: { $regex: /User/ } },
                { tenantId: testTenantId }
            );

            expect(result.deletedCount).toBe(2);

            const remainingDocs = await TestModel.find();
            expect(remainingDocs).toHaveLength(1);
            expect(remainingDocs[0].tenantId).toBe('other-tenant');
        });
    });

    describe('bulkSoftDelete', () => {
        beforeEach(async () => {
            await TestModel.create([
                { name: 'User 1', email: 'user1@example.com', tenantId: testTenantId },
                { name: 'User 2', email: 'user2@example.com', tenantId: testTenantId }
            ]);
        });

        test('should soft delete multiple documents', async () => {
            const deletedBy = new mongoose.Types.ObjectId();
            const result = await repository.bulkSoftDelete(
                { tenantId: testTenantId },
                { deletedBy: deletedBy.toString() }
            );

            expect(result.matchedCount).toBe(2);
            expect(result.modifiedCount).toBe(2);

            const docs = await TestModel.find({ tenantId: testTenantId });
            expect(docs.every(doc => doc.isDeleted === true)).toBe(true);
            expect(docs.every(doc => doc.deletedAt)).toBe(true);
            expect(docs.every(doc => doc.deletedBy.toString() === deletedBy.toString())).toBe(true);
        });
    });

    describe('aggregate', () => {
        beforeEach(async () => {
            await TestModel.create([
                { name: 'User 1', email: 'user1@example.com', age: 25, category: 'A', tenantId: testTenantId },
                { name: 'User 2', email: 'user2@example.com', age: 30, category: 'B', tenantId: testTenantId },
                { name: 'User 3', email: 'user3@example.com', age: 35, category: 'A', tenantId: 'other-tenant' }
            ]);
        });

        test('should execute aggregation pipeline', async () => {
            const pipeline = [
                { $group: { _id: '$category', count: { $sum: 1 }, avgAge: { $avg: '$age' } } },
                { $sort: { _id: 1 } }
            ];

            const results = await repository.aggregate(pipeline);

            expect(results).toHaveLength(2);
            expect(results[0]._id).toBe('A');
            expect(results[0].count).toBe(2); // Both tenants
            expect(results[1]._id).toBe('B');
            expect(results[1].count).toBe(1);
        });

        test('should filter by tenantId when provided', async () => {
            const pipeline = [
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ];

            const results = await repository.aggregate(pipeline, { tenantId: testTenantId });

            expect(results).toHaveLength(2);
            expect(results.find(r => r._id === 'A').count).toBe(1); // Only testTenantId
            expect(results.find(r => r._id === 'B').count).toBe(1);
        });
    });

    describe('distinct', () => {
        beforeEach(async () => {
            await TestModel.create([
                { name: 'User 1', email: 'user1@example.com', category: 'A', tenantId: testTenantId },
                { name: 'User 2', email: 'user2@example.com', category: 'B', tenantId: testTenantId },
                { name: 'User 3', email: 'user3@example.com', category: 'A', tenantId: testTenantId },
                { name: 'User 4', email: 'user4@example.com', category: 'C', tenantId: 'other-tenant' }
            ]);
        });

        test('should return distinct values', async () => {
            const categories = await repository.distinct('category');

            expect(categories).toHaveLength(3);
            expect(categories.sort()).toEqual(['A', 'B', 'C']);
        });

        test('should filter by tenantId when provided', async () => {
            const categories = await repository.distinct(
                'category',
                {},
                { tenantId: testTenantId }
            );

            expect(categories).toHaveLength(2);
            expect(categories.sort()).toEqual(['A', 'B']);
        });

        test('should apply additional filters', async () => {
            const categories = await repository.distinct(
                'category',
                { name: { $regex: /User [12]/ } }
            );

            expect(categories).toHaveLength(2);
            expect(categories.sort()).toEqual(['A', 'B']);
        });
    });

    describe('findOneAndUpdate', () => {
        let testDocument;

        beforeEach(async () => {
            testDocument = await TestModel.create({
                name: 'Original Name',
                email: 'original@example.com',
                age: 25,
                tenantId: testTenantId
            });
        });

        test('should find and update document', async () => {
            const result = await repository.findOneAndUpdate(
                { email: 'original@example.com' },
                { name: 'Updated Name', age: 30 }
            );

            expect(result).toBeDefined();
            expect(result.name).toBe('Updated Name');
            expect(result.age).toBe(30);
            expect(result.updatedAt).toBeDefined();
        });

        test('should create document with upsert=true', async () => {
            const result = await repository.findOneAndUpdate(
                { email: 'new@example.com' },
                { name: 'New User', email: 'new@example.com', tenantId: testTenantId },
                { upsert: true }
            );

            expect(result).toBeDefined();
            expect(result.name).toBe('New User');
            expect(result.email).toBe('new@example.com');
        });

        test('should return null when document not found and upsert=false', async () => {
            const result = await repository.findOneAndUpdate(
                { email: 'nonexistent@example.com' },
                { name: 'Updated' },
                { upsert: false }
            );

            expect(result).toBeNull();
        });

        test('should filter by tenantId when provided', async () => {
            const result = await repository.findOneAndUpdate(
                { email: 'original@example.com' },
                { name: 'Updated' },
                { tenantId: 'different-tenant' }
            );

            expect(result).toBeNull();
        });
    });

    describe('findOneAndDelete', () => {
        let testDocument;

        beforeEach(async () => {
            testDocument = await TestModel.create({
                name: 'To Delete',
                email: 'delete@example.com',
                tenantId: testTenantId
            });
        });

        test('should find and delete document', async () => {
            const result = await repository.findOneAndDelete({
                email: 'delete@example.com'
            });

            expect(result).toBeDefined();
            expect(result.name).toBe('To Delete');

            const found = await TestModel.findById(testDocument._id);
            expect(found).toBeNull();
        });

        test('should return null when document not found', async () => {
            const result = await repository.findOneAndDelete({
                email: 'nonexistent@example.com'
            });

            expect(result).toBeNull();
        });

        test('should filter by tenantId when provided', async () => {
            const result = await repository.findOneAndDelete(
                { email: 'delete@example.com' },
                { tenantId: 'different-tenant' }
            );

            expect(result).toBeNull();

            // Document should still exist
            const found = await TestModel.findById(testDocument._id);
            expect(found).toBeDefined();
        });
    });

    describe('getStats', () => {
        beforeEach(async () => {
            const baseDate = new Date('2023-01-01');
            await TestModel.create([
                {
                    name: 'User 1',
                    email: 'user1@example.com',
                    tenantId: testTenantId,
                    createdAt: new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 1) // 1 day later
                },
                {
                    name: 'User 2',
                    email: 'user2@example.com',
                    tenantId: testTenantId,
                    createdAt: new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 2) // 2 days later
                },
                {
                    name: 'User 3',
                    email: 'user3@example.com',
                    tenantId: 'other-tenant',
                    createdAt: new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 3) // 3 days later
                }
            ]);
        });

        test('should return collection statistics', async () => {
            const stats = await repository.getStats();

            expect(stats.totalDocuments).toBe(3);
            expect(stats.minCreatedAt).toBeDefined();
            expect(stats.maxCreatedAt).toBeDefined();
            expect(stats.avgCreatedAt).toBeDefined();
        });

        test('should filter by tenantId when provided', async () => {
            const stats = await repository.getStats({ tenantId: testTenantId });

            expect(stats.totalDocuments).toBe(2);
        });

        test('should return default stats for empty collection', async () => {
            await TestModel.deleteMany({});
            const stats = await repository.getStats();

            expect(stats.totalDocuments).toBe(0);
            expect(stats.minCreatedAt).toBeNull();
            expect(stats.maxCreatedAt).toBeNull();
            expect(stats.avgCreatedAt).toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('should enhance errors with context', async () => {
            try {
                await repository.bulkCreate([
                    { email: 'test@example.com' } // Missing required name field
                ]);
            } catch (error) {
                expect(error.message).toContain('Repository error in GenericRepositoryTest.bulkCreate');
                expect(error.operation).toBe('bulkCreate');
                expect(error.model).toBe('GenericRepositoryTest');
                expect(error.originalError).toBeDefined();
            }
        });
    });
});