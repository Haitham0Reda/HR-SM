import mongoose from 'mongoose';
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
    category: String,
    tags: [String]
}, {
    timestamps: true
});

const TestModel = mongoose.model('QueryBuilderTest', testSchema);

describe('QueryBuilder', () => {
    let queryBuilder;
    const testTenantId = 'test-tenant-123';

    beforeEach(() => {
        queryBuilder = new QueryBuilder(TestModel);
    });

    afterEach(async () => {
        await TestModel.deleteMany({});
    });

    describe('Constructor', () => {
        test('should initialize with model', () => {
            expect(queryBuilder.model).toBe(TestModel);
            expect(queryBuilder._filters).toEqual({});
            expect(queryBuilder._options).toEqual({});
        });
    });

    describe('Basic Filters', () => {
        test('should add where condition with object', () => {
            const filter = { name: 'John', age: 30 };
            queryBuilder.where(filter);

            expect(queryBuilder.getFilters()).toEqual(filter);
        });

        test('should add where condition with field and value', () => {
            queryBuilder.where('name', 'John');

            expect(queryBuilder.getFilters()).toEqual({ name: 'John' });
        });

        test('should add equals condition', () => {
            queryBuilder.equals('status', 'active');

            expect(queryBuilder.getFilters()).toEqual({ status: 'active' });
        });

        test('should add not equals condition', () => {
            queryBuilder.notEquals('status', 'inactive');

            expect(queryBuilder.getFilters()).toEqual({ status: { $ne: 'inactive' } });
        });

        test('should add in condition', () => {
            queryBuilder.in('status', ['active', 'pending']);

            expect(queryBuilder.getFilters()).toEqual({ status: { $in: ['active', 'pending'] } });
        });

        test('should add not in condition', () => {
            queryBuilder.notIn('status', ['inactive', 'deleted']);

            expect(queryBuilder.getFilters()).toEqual({ status: { $nin: ['inactive', 'deleted'] } });
        });
    });

    describe('Comparison Filters', () => {
        test('should add greater than condition', () => {
            queryBuilder.greaterThan('age', 18);

            expect(queryBuilder.getFilters()).toEqual({ age: { $gt: 18 } });
        });

        test('should add greater than or equal condition', () => {
            queryBuilder.greaterThanOrEqual('age', 18);

            expect(queryBuilder.getFilters()).toEqual({ age: { $gte: 18 } });
        });

        test('should add less than condition', () => {
            queryBuilder.lessThan('age', 65);

            expect(queryBuilder.getFilters()).toEqual({ age: { $lt: 65 } });
        });

        test('should add less than or equal condition', () => {
            queryBuilder.lessThanOrEqual('age', 65);

            expect(queryBuilder.getFilters()).toEqual({ age: { $lte: 65 } });
        });

        test('should add date range condition', () => {
            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-12-31');
            queryBuilder.dateRange('createdAt', startDate, endDate);

            expect(queryBuilder.getFilters()).toEqual({
                createdAt: { $gte: startDate, $lte: endDate }
            });
        });
    });

    describe('Text Search Filters', () => {
        test('should add regex condition', () => {
            queryBuilder.regex('name', 'john', 'i');

            const filters = queryBuilder.getFilters();
            expect(filters.name).toBeInstanceOf(RegExp);
            expect(filters.name.source).toBe('john');
            expect(filters.name.flags).toBe('i');
        });

        test('should add contains condition', () => {
            queryBuilder.contains('name', 'john');

            const filters = queryBuilder.getFilters();
            expect(filters.name).toBeInstanceOf(RegExp);
            expect(filters.name.source).toBe('john');
        });

        test('should escape special regex characters in contains', () => {
            queryBuilder.contains('name', 'john.doe+test');

            const filters = queryBuilder.getFilters();
            expect(filters.name.source).toBe('john\\.doe\\+test');
        });
    });

    describe('Existence Filters', () => {
        test('should add exists condition (true)', () => {
            queryBuilder.exists('category');

            expect(queryBuilder.getFilters()).toEqual({ category: { $exists: true } });
        });

        test('should add exists condition (false)', () => {
            queryBuilder.exists('category', false);

            expect(queryBuilder.getFilters()).toEqual({ category: { $exists: false } });
        });
    });

    describe('Logical Operators', () => {
        test('should add OR condition', () => {
            queryBuilder.or([
                { name: 'John' },
                { name: 'Jane' }
            ]);

            expect(queryBuilder.getFilters()).toEqual({
                $or: [{ name: 'John' }, { name: 'Jane' }]
            });
        });

        test('should add AND condition', () => {
            queryBuilder.and([
                { age: { $gte: 18 } },
                { status: 'active' }
            ]);

            expect(queryBuilder.getFilters()).toEqual({
                $and: [{ age: { $gte: 18 } }, { status: 'active' }]
            });
        });

        test('should append to existing OR conditions', () => {
            queryBuilder.or([{ name: 'John' }]);
            queryBuilder.or([{ name: 'Jane' }]);

            expect(queryBuilder.getFilters()).toEqual({
                $or: [{ name: 'John' }, { name: 'Jane' }]
            });
        });
    });

    describe('Query Options', () => {
        test('should set sort option', () => {
            queryBuilder.sort({ name: 1, age: -1 });

            expect(queryBuilder.getOptions()).toEqual({ sort: { name: 1, age: -1 } });
        });

        test('should set limit option', () => {
            queryBuilder.limit(10);

            expect(queryBuilder.getOptions()).toEqual({ limit: 10 });
        });

        test('should set skip option', () => {
            queryBuilder.skip(5);

            expect(queryBuilder.getOptions()).toEqual({ skip: 5 });
        });

        test('should set select option', () => {
            queryBuilder.select('name email');

            expect(queryBuilder.getOptions()).toEqual({ select: 'name email' });
        });

        test('should set populate option', () => {
            queryBuilder.populate('department');

            expect(queryBuilder.getOptions()).toEqual({ populate: 'department' });
        });
    });

    describe('Special Filters', () => {
        test('should set tenant filter', () => {
            queryBuilder.tenant(testTenantId);

            expect(queryBuilder.getFilters()).toEqual({ tenantId: testTenantId });
        });

        test('should exclude deleted documents', () => {
            queryBuilder.excludeDeleted();

            expect(queryBuilder.getFilters()).toEqual({ isDeleted: { $ne: true } });
        });

        test('should include only deleted documents', () => {
            queryBuilder.onlyDeleted();

            expect(queryBuilder.getFilters()).toEqual({ isDeleted: true });
        });

        test('should add pagination', () => {
            queryBuilder.paginate(2, 10);

            expect(queryBuilder.getOptions()).toEqual({ skip: 10, limit: 10 });
        });
    });

    describe('Method Chaining', () => {
        test('should support method chaining', () => {
            const result = queryBuilder
                .where('status', 'active')
                .greaterThan('age', 18)
                .sort({ name: 1 })
                .limit(10);

            expect(result).toBe(queryBuilder);
            expect(queryBuilder.getFilters()).toEqual({
                status: 'active',
                age: { $gt: 18 }
            });
            expect(queryBuilder.getOptions()).toEqual({
                sort: { name: 1 },
                limit: 10
            });
        });
    });

    describe('Query Execution', () => {
        beforeEach(async () => {
            await TestModel.create([
                {
                    name: 'John Doe',
                    email: 'john@example.com',
                    age: 30,
                    status: 'active',
                    tenantId: testTenantId,
                    category: 'premium'
                },
                {
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    age: 25,
                    status: 'active',
                    tenantId: testTenantId,
                    category: 'standard'
                },
                {
                    name: 'Bob Johnson',
                    email: 'bob@example.com',
                    age: 35,
                    status: 'inactive',
                    tenantId: testTenantId,
                    isDeleted: true
                }
            ]);
        });

        test('should execute query and return documents', async () => {
            const results = await queryBuilder
                .where('status', 'active')
                .tenant(testTenantId)
                .exec();

            expect(results).toHaveLength(2);
            expect(results.every(doc => doc.status === 'active')).toBe(true);
        });

        test('should return first document', async () => {
            const result = await queryBuilder
                .where('status', 'active')
                .tenant(testTenantId)
                .sort({ age: 1 })
                .first();

            expect(result).toBeDefined();
            expect(result.name).toBe('Jane Smith'); // Youngest active user
        });

        test('should count documents', async () => {
            const count = await queryBuilder
                .where('status', 'active')
                .tenant(testTenantId)
                .count();

            expect(count).toBe(2);
        });

        test('should check if documents exist', async () => {
            const exists = await queryBuilder
                .where('status', 'active')
                .tenant(testTenantId)
                .exists();

            expect(exists).toBe(true);

            const notExists = await queryBuilder
                .reset()
                .where('status', 'pending')
                .exists();

            expect(notExists).toBe(false);
        });

        test('should apply select option', async () => {
            const results = await queryBuilder
                .where('status', 'active')
                .select('name email')
                .exec();

            expect(results).toHaveLength(2);
            expect(results[0].name).toBeDefined();
            expect(results[0].email).toBeDefined();
            expect(results[0].age).toBeUndefined();
        });

        test('should apply sort option', async () => {
            const results = await queryBuilder
                .where('status', 'active')
                .sort({ age: -1 })
                .exec();

            expect(results).toHaveLength(2);
            expect(results[0].age).toBe(30); // John (older) first
            expect(results[1].age).toBe(25); // Jane (younger) second
        });

        test('should apply limit and skip options', async () => {
            const results = await queryBuilder
                .where('status', 'active')
                .sort({ age: 1 })
                .skip(1)
                .limit(1)
                .exec();

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('John Doe'); // Second youngest
        });
    });

    describe('Aggregation', () => {
        beforeEach(async () => {
            await TestModel.create([
                {
                    name: 'John Doe',
                    email: 'john@example.com',
                    age: 30,
                    status: 'active',
                    tenantId: testTenantId,
                    category: 'premium'
                },
                {
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    age: 25,
                    status: 'active',
                    tenantId: testTenantId,
                    category: 'standard'
                }
            ]);
        });

        test('should execute aggregation pipeline', async () => {
            const pipeline = [
                { $group: { _id: '$status', count: { $sum: 1 }, avgAge: { $avg: '$age' } } }
            ];

            const results = await queryBuilder
                .tenant(testTenantId)
                .aggregate(pipeline);

            expect(results).toHaveLength(1);
            expect(results[0]._id).toBe('active');
            expect(results[0].count).toBe(2);
            expect(results[0].avgAge).toBe(27.5);
        });

        test('should prepend match stage with filters', async () => {
            const pipeline = [
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ];

            const results = await queryBuilder
                .where('status', 'active')
                .aggregate(pipeline);

            expect(results).toHaveLength(2);
            expect(results.find(r => r._id === 'premium').count).toBe(1);
            expect(results.find(r => r._id === 'standard').count).toBe(1);
        });
    });

    describe('Utility Methods', () => {
        test('should reset query builder', () => {
            queryBuilder
                .where('name', 'John')
                .sort({ age: 1 })
                .limit(10);

            queryBuilder.reset();

            expect(queryBuilder.getFilters()).toEqual({});
            expect(queryBuilder.getOptions()).toEqual({});
        });

        test('should clone query builder', () => {
            queryBuilder
                .where('name', 'John')
                .sort({ age: 1 });

            const cloned = queryBuilder.clone();

            expect(cloned).not.toBe(queryBuilder);
            expect(cloned.getFilters()).toEqual(queryBuilder.getFilters());
            expect(cloned.getOptions()).toEqual(queryBuilder.getOptions());
            expect(cloned.model).toBe(queryBuilder.model);

            // Modifying clone should not affect original
            cloned.where('age', 30);
            expect(queryBuilder.getFilters()).not.toHaveProperty('age');
        });
    });
});