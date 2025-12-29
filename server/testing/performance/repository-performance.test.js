/**
 * Repository Pattern Performance Verification
 * Tests to ensure no performance regression after implementing repository pattern
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import UserRepository from '../../repositories/core/UserRepository.js';
import User from '../../modules/hr-core/users/models/user.model.js';

describe('Repository Performance Tests', () => {
    let mongoServer;
    let userRepository;
    const testTenantId = 'test_tenant_performance';

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        userRepository = new UserRepository();
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await User.deleteMany({});
    });

    test('Repository pattern should not significantly impact query performance', async () => {
        // Create test data
        const testUsers = [];
        for (let i = 0; i < 100; i++) {
            testUsers.push({
                firstName: `User${i}`,
                lastName: `Test${i}`,
                email: `user${i}@test.com`,
                employeeId: `EMP${i.toString().padStart(3, '0')}`,
                tenantId: testTenantId,
                role: 'employee',
                status: 'active'
            });
        }

        await User.insertMany(testUsers);

        // Test repository query performance
        const startTime = Date.now();
        const users = await userRepository.find({ tenantId: testTenantId });
        const endTime = Date.now();

        const queryTime = endTime - startTime;

        expect(users).toHaveLength(100);
        expect(queryTime).toBeLessThan(1000); // Should complete within 1 second

        console.log(`Repository query time: ${queryTime}ms for 100 records`);
    });

    test('Repository pattern should handle complex queries efficiently', async () => {
        // Create test data with different roles and departments
        const testUsers = [];
        const roles = ['employee', 'manager', 'hr', 'admin'];
        const departments = ['IT', 'HR', 'Finance', 'Marketing'];

        for (let i = 0; i < 200; i++) {
            testUsers.push({
                firstName: `User${i}`,
                lastName: `Test${i}`,
                email: `user${i}@test.com`,
                employeeId: `EMP${i.toString().padStart(3, '0')}`,
                tenantId: testTenantId,
                role: roles[i % roles.length],
                department: departments[i % departments.length],
                status: i % 10 === 0 ? 'inactive' : 'active'
            });
        }

        await User.insertMany(testUsers);

        // Test complex query performance
        const startTime = Date.now();
        const activeManagers = await userRepository.find({
            tenantId: testTenantId,
            role: 'manager',
            status: 'active'
        });
        const endTime = Date.now();

        const queryTime = endTime - startTime;

        expect(activeManagers.length).toBeGreaterThan(0);
        expect(queryTime).toBeLessThan(500); // Should complete within 500ms

        console.log(`Complex repository query time: ${queryTime}ms for filtered results`);
    });

    test('Repository pattern should handle pagination efficiently', async () => {
        // Create test data
        const testUsers = [];
        for (let i = 0; i < 500; i++) {
            testUsers.push({
                firstName: `User${i}`,
                lastName: `Test${i}`,
                email: `user${i}@test.com`,
                employeeId: `EMP${i.toString().padStart(3, '0')}`,
                tenantId: testTenantId,
                role: 'employee',
                status: 'active'
            });
        }

        await User.insertMany(testUsers);

        // Test paginated query performance
        const startTime = Date.now();
        const paginatedUsers = await userRepository.find(
            { tenantId: testTenantId },
            {
                limit: 20,
                skip: 100,
                sort: { createdAt: -1 }
            }
        );
        const endTime = Date.now();

        const queryTime = endTime - startTime;

        expect(paginatedUsers).toHaveLength(20);
        expect(queryTime).toBeLessThan(300); // Should complete within 300ms

        console.log(`Paginated repository query time: ${queryTime}ms for page 6 of 25`);
    });
});