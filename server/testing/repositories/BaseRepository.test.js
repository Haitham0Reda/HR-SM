import mongoose from 'mongoose';
import BaseRepository from '../../repositories/BaseRepository.js';
import QueryBuilder from '../../repositories/QueryBuilder.js';

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
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const TestModel = mongoose.model('TestModel', testSchema);

// Concrete repository implementation for testing
class TestRepository extends BaseRepository {
    constructor() {
        super(TestModel);
    }
}

describe('BaseRepository', () => {
    let repository;
    let testTenantId;

    beforeEach(() => {
        repository = new TestRepository();
        testTenantId = 'test-tenant-123';
    });

    afterEach(async () => {
        await TestModel.deleteMany({});
    });

    describe('Constructor', () => {
        test('should throw error when instantiated directly', () => {
            expect(() => new BaseRepository(TestModel)).toThrow(
                'BaseRepository is abstract and cannot be instantiated directly'
            );
        });

        test('should throw error when model is not provided', () => {
            expect(() => new TestRepository(null)).toThrow(
                'Valid Mongoose model is required'
            );
        });

        test('should initialize with valid model', () => {
            expect(repository.model).toBe(TestModel);
            expect(repository.modelName).toBe('TestModel');
        });
    });

    describe('create', () => {
        test('should create a new document', async () => {
            const data = {
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                tenantId: testTenantId
            };

            const result = await repository.create(data);

            expect(result).toBeDefined();
            expect(result.name).toBe(data.name);
            expect(result.email).toBe(data.email);
            expect(result.age).toBe(data.age);
            expect(result.tenantId).toBe(testTenantId);
            expect(result._id).toBeDefined();
            expect(result.createdAt).toBeDefined();
        });

        test('should add tenantId from options', async () => {
            const data = {
                name: 'Jane Doe',
                email: 'jane@example.com'
            };

            const result = await repository.create(data, { tenantId: testTenantId });

            expect(result.tenantId).toBe(testTenantId);
        });

        test('should handle validation errors', async () => {
            const data = {
                email: 'invalid@example.com'
                // Missing required name field
            };

            await expect(repository.create(data)).rejects.toThrow();
        });
    });

    describe('findById', () => {
        let testDocument;

        beforeEach(async () => {
            testDocument = await TestModel.create({
                name: 'Test User',
                email: 'test@example.com',
                tenantId: testTenantId
            });
        });

        test('should find document by valid ID', async () => {
            const result = await repository.findById(testDocument._id.toString());

            expect(result).toBeDefined();
            expect(result._id.toString()).toBe(testDocument._id.toString());
            expect(result.name).toBe(testDocument.name);
        });

        test('should return null for invalid ID', async () => {
            const result = await repository.findById('invalid-id');
            expect(result).toBeNull();
        });

        test('should return null for non-existent ID', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const result = await repository.findById(nonExistentId.toString());
            expect(result).toBeNull();
        });

        test('should apply select option', async () => {
            const result = await repository.findById(testDocument._id.toString(), {
                select: 'name email'
            });

            expect(result.name).toBeDefined();
            expect(result.email).toBeDefined();
            expect(result.age).toBeUndefined();
        });

        test('should filter by tenantId when provided', async () => {
            const result = await repository.findById(testDocument._id.toString(), {
                tenantId: 'different-tenant'
            });

            expect(result).toBeNull();
        });
    });

    describe('findOne', () => {
        let testDocument;

        beforeEach(async () => {
            testDocument = await TestModel.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 25,
                tenantId: testTenantId
            });
        });

        test('should find document by filter', async () => {
            const result = await repository.findOne({ email: 'test@example.com' });

            expect(result).toBeDefined();
            expect(result.email).toBe('test@example.com');
        });

        test('should return null when no match found', async () => {
            const result = await repository.findOne({ email: 'nonexistent@example.com' });
            expect(result).toBeNull();
        });

        test('should apply tenantId filter', async () => {
            const result = await repository.findOne(
                { email: 'test@example.com' },
                { tenantId: 'different-tenant' }
            );

            expect(result).toBeNull();
        });
    });

    describe('find', () => {
        beforeEach(async () => {
            await TestModel.create([
                { name: 'User 1', email: 'user1@example.com', age: 25, tenantId: testTenantId },
                { name: 'User 2', email: 'user2@example.com', age: 30, tenantId: testTenantId },
                { name: 'User 3', email: 'user3@example.com', age: 35, tenantId: 'other-tenant' }
            ]);
        });

        test('should find all documents matching filter', async () => {
            const results = await repository.find({ tenantId: testTenantId });

            expect(results).toHaveLength(2);
            expect(results.every(doc => doc.tenantId === testTenantId)).toBe(true);
        });

        test('should apply sort option', async () => {
            const results = await repository.find(
                { tenantId: testTenantId },
                { sort: { age: -1 } }
            );

            expect(results).toHaveLength(2);
            expect(results[0].age).toBe(30);
            expect(results[1].age).toBe(25);
        });

        test('should apply limit option', async () => {
            const results = await repository.find(
                { tenantId: testTenantId },
                { limit: 1 }
            );

            expect(results).toHaveLength(1);
        });

        test('should apply skip option', async () => {
            const results = await repository.find(
                { tenantId: testTenantId },
                { skip: 1, sort: { age: 1 } }
            );

            expect(results).toHaveLength(1);
            expect(results[0].age).toBe(30);
        });
    });

    describe('update', () => {
        let testDocument;

        beforeEach(async () => {
            testDocument = await TestModel.create({
                name: 'Original Name',
                email: 'original@example.com',
                age: 25,
                tenantId: testTenantId
            });
        });

        test('should update document by ID', async () => {
            const updateData = { name: 'Updated Name', age: 30 };
            const result = await repository.update(testDocument._id.toString(), updateData);

            expect(result).toBeDefined();
            expect(result.name).toBe('Updated Name');
            expect(result.age).toBe(30);
            expect(result.email).toBe('original@example.com'); // Unchanged
            expect(result.updatedAt).toBeDefined();
        });

        test('should return null for invalid ID', async () => {
            const result = await repository.update('invalid-id', { name: 'Updated' });
            expect(result).toBeNull();
        });

        test('should return null for non-existent ID', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const result = await repository.update(nonExistentId.toString(), { name: 'Updated' });
            expect(result).toBeNull();
        });

        test('should filter by tenantId when provided', async () => {
            const result = await repository.update(
                testDocument._id.toString(),
                { name: 'Updated' },
                { tenantId: 'different-tenant' }
            );

            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        let testDocument;

        beforeEach(async () => {
            testDocument = await TestModel.create({
                name: 'To Delete',
                email: 'delete@example.com',
                tenantId: testTenantId
            });
        });

        test('should delete document by ID', async () => {
            const result = await repository.delete(testDocument._id.toString());

            expect(result).toBe(true);

            const found = await TestModel.findById(testDocument._id);
            expect(found).toBeNull();
        });

        test('should return false for invalid ID', async () => {
            const result = await repository.delete('invalid-id');
            expect(result).toBe(false);
        });

        test('should return false for non-existent ID', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const result = await repository.delete(nonExistentId.toString());
            expect(result).toBe(false);
        });

        test('should filter by tenantId when provided', async () => {
            const result = await repository.delete(
                testDocument._id.toString(),
                { tenantId: 'different-tenant' }
            );

            expect(result).toBe(false);

            // Document should still exist
            const found = await TestModel.findById(testDocument._id);
            expect(found).toBeDefined();
        });
    });

    describe('softDelete', () => {
        let testDocument;

        beforeEach(async () => {
            testDocument = await TestModel.create({
                name: 'To Soft Delete',
                email: 'softdelete@example.com',
                tenantId: testTenantId
            });
        });

        test('should soft delete document by ID', async () => {
            const deletedBy = new mongoose.Types.ObjectId();
            const result = await repository.softDelete(testDocument._id.toString(), {
                deletedBy: deletedBy.toString()
            });

            expect(result).toBeDefined();
            expect(result.isDeleted).toBe(true);
            expect(result.deletedAt).toBeDefined();
            expect(result.deletedBy.toString()).toBe(deletedBy.toString());

            // Document should still exist in database
            const found = await TestModel.findById(testDocument._id);
            expect(found).toBeDefined();
            expect(found.isDeleted).toBe(true);
        });

        test('should return null for invalid ID', async () => {
            const result = await repository.softDelete('invalid-id');
            expect(result).toBeNull();
        });
    });

    describe('count', () => {
        beforeEach(async () => {
            await TestModel.create([
                { name: 'User 1', email: 'user1@example.com', tenantId: testTenantId },
                { name: 'User 2', email: 'user2@example.com', tenantId: testTenantId },
                { name: 'User 3', email: 'user3@example.com', tenantId: 'other-tenant' }
            ]);
        });

        test('should count all documents', async () => {
            const count = await repository.count();
            expect(count).toBe(3);
        });

        test('should count documents matching filter', async () => {
            const count = await repository.count({ tenantId: testTenantId });
            expect(count).toBe(2);
        });

        test('should apply tenantId filter from options', async () => {
            const count = await repository.count({}, { tenantId: testTenantId });
            expect(count).toBe(2);
        });
    });

    describe('exists', () => {
        beforeEach(async () => {
            await TestModel.create({
                name: 'Existing User',
                email: 'existing@example.com',
                tenantId: testTenantId
            });
        });

        test('should return true when document exists', async () => {
            const exists = await repository.exists({ email: 'existing@example.com' });
            expect(exists).toBe(true);
        });

        test('should return false when document does not exist', async () => {
            const exists = await repository.exists({ email: 'nonexistent@example.com' });
            expect(exists).toBe(false);
        });
    });

    describe('paginate', () => {
        beforeEach(async () => {
            const users = Array.from({ length: 25 }, (_, i) => ({
                name: `User ${i + 1}`,
                email: `user${i + 1}@example.com`,
                age: 20 + i,
                tenantId: testTenantId
            }));
            await TestModel.create(users);
        });

        test('should paginate documents with default options', async () => {
            const result = await repository.paginate({ tenantId: testTenantId });

            expect(result.data).toHaveLength(10); // Default limit
            expect(result.total).toBe(25);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
            expect(result.totalPages).toBe(3);
        });

        test('should paginate with custom page and limit', async () => {
            const result = await repository.paginate(
                { tenantId: testTenantId },
                { page: 2, limit: 5 }
            );

            expect(result.data).toHaveLength(5);
            expect(result.total).toBe(25);
            expect(result.page).toBe(2);
            expect(result.limit).toBe(5);
            expect(result.totalPages).toBe(5);
        });

        test('should apply sort in pagination', async () => {
            const result = await repository.paginate(
                { tenantId: testTenantId },
                { page: 1, limit: 5, sort: { age: -1 } }
            );

            expect(result.data[0].age).toBe(44); // Highest age first
            expect(result.data[4].age).toBe(40);
        });
    });

    describe('withTransaction', () => {
        test('should execute operations within transaction', async () => {
            const result = await repository.withTransaction(async (session) => {
                const doc1 = await repository.create({
                    name: 'Transaction User 1',
                    email: 'tx1@example.com',
                    tenantId: testTenantId
                }, { session });

                const doc2 = await repository.create({
                    name: 'Transaction User 2',
                    email: 'tx2@example.com',
                    tenantId: testTenantId
                }, { session });

                return { doc1, doc2 };
            });

            expect(result.doc1).toBeDefined();
            expect(result.doc2).toBeDefined();

            // Verify documents were created
            const count = await repository.count({ tenantId: testTenantId });
            expect(count).toBe(2);
        });

        test('should rollback transaction on error', async () => {
            await expect(repository.withTransaction(async (session) => {
                await repository.create({
                    name: 'Transaction User 1',
                    email: 'tx1@example.com',
                    tenantId: testTenantId
                }, { session });

                // This should cause an error (missing required field)
                await repository.create({
                    email: 'tx2@example.com',
                    tenantId: testTenantId
                }, { session });
            })).rejects.toThrow();

            // Verify no documents were created due to rollback
            const count = await repository.count({ tenantId: testTenantId });
            expect(count).toBe(0);
        });
    });

    describe('query', () => {
        test('should return QueryBuilder instance', () => {
            const queryBuilder = repository.query();
            expect(queryBuilder).toBeInstanceOf(QueryBuilder);
            expect(queryBuilder.model).toBe(TestModel);
        });
    });

    describe('Error Handling', () => {
        test('should enhance errors with context', async () => {
            try {
                await repository.create({
                    // Missing required fields to trigger validation error
                    tenantId: testTenantId
                });
            } catch (error) {
                expect(error.message).toContain('Repository error in TestModel.create');
                expect(error.operation).toBe('create');
                expect(error.model).toBe('TestModel');
                expect(error.originalError).toBeDefined();
            }
        });
    });
});