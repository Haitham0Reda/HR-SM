import mongoose from 'mongoose';
import UserRepository from '../../repositories/core/UserRepository.js';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';
import Position from '../../modules/hr-core/users/models/position.model.js';

describe('UserRepository', () => {
    let userRepository;
    let testTenantId;
    let testDepartment;
    let testPosition;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        userRepository = new UserRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        // Clean up test data
        await User.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });
        await Position.deleteMany({ tenantId: testTenantId });

        // Create test department and position
        testDepartment = await Department.create({
            tenantId: testTenantId,
            name: 'Test Department',
            code: 'TEST001'
        });

        testPosition = await Position.create({
            tenantId: testTenantId,
            title: 'Test Position',
            code: 'POS001',
            department: testDepartment._id
        });
    });

    afterAll(async () => {
        // Clean up test data
        await User.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });
        await Position.deleteMany({ tenantId: testTenantId });
    });

    describe('findByDepartment', () => {
        it('should find users by department', async () => {
            // Create test users
            const user1 = await User.create({
                tenantId: testTenantId,
                username: 'user1',
                email: 'user1@test.com',
                password: 'password123',
                department: testDepartment._id,
                role: 'employee'
            });

            const user2 = await User.create({
                tenantId: testTenantId,
                username: 'user2',
                email: 'user2@test.com',
                password: 'password123',
                department: testDepartment._id,
                role: 'employee'
            });

            // Create user in different department
            const otherDepartment = await Department.create({
                tenantId: testTenantId,
                name: 'Other Department',
                code: 'OTHER001'
            });

            await User.create({
                tenantId: testTenantId,
                username: 'user3',
                email: 'user3@test.com',
                password: 'password123',
                department: otherDepartment._id,
                role: 'employee'
            });

            const users = await userRepository.findByDepartment(testDepartment._id, {
                tenantId: testTenantId
            });

            expect(users).toHaveLength(2);
            expect(users.map(u => u.username)).toContain('user1');
            expect(users.map(u => u.username)).toContain('user2');
        });
    });

    describe('findByRole', () => {
        it('should find users by role', async () => {
            await User.create({
                tenantId: testTenantId,
                username: 'admin1',
                email: 'admin1@test.com',
                password: 'password123',
                role: 'admin'
            });

            await User.create({
                tenantId: testTenantId,
                username: 'employee1',
                email: 'employee1@test.com',
                password: 'password123',
                role: 'employee'
            });

            const admins = await userRepository.findByRole('admin', {
                tenantId: testTenantId
            });

            expect(admins).toHaveLength(1);
            expect(admins[0].username).toBe('admin1');
        });
    });

    describe('findByStatus', () => {
        it('should find users by status', async () => {
            await User.create({
                tenantId: testTenantId,
                username: 'active1',
                email: 'active1@test.com',
                password: 'password123',
                status: 'active'
            });

            await User.create({
                tenantId: testTenantId,
                username: 'inactive1',
                email: 'inactive1@test.com',
                password: 'password123',
                status: 'inactive'
            });

            const activeUsers = await userRepository.findByStatus('active', {
                tenantId: testTenantId
            });

            expect(activeUsers).toHaveLength(1);
            expect(activeUsers[0].username).toBe('active1');
        });
    });

    describe('findByEmail', () => {
        it('should find user by email', async () => {
            const testUser = await User.create({
                tenantId: testTenantId,
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            const user = await userRepository.findByEmail('test@example.com', {
                tenantId: testTenantId
            });

            expect(user).toBeTruthy();
            expect(user.username).toBe('testuser');
        });

        it('should include password when requested', async () => {
            await User.create({
                tenantId: testTenantId,
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            const user = await userRepository.findByEmail('test@example.com', {
                tenantId: testTenantId,
                includePassword: true
            });

            expect(user.password).toBeTruthy();
        });
    });

    describe('findByUsername', () => {
        it('should find user by username', async () => {
            await User.create({
                tenantId: testTenantId,
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            const user = await userRepository.findByUsername('testuser', {
                tenantId: testTenantId
            });

            expect(user).toBeTruthy();
            expect(user.email).toBe('test@example.com');
        });
    });

    describe('findByEmployeeId', () => {
        it('should find user by employee ID', async () => {
            await User.create({
                tenantId: testTenantId,
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                employeeId: 'EMP001'
            });

            const user = await userRepository.findByEmployeeId('EMP001', {
                tenantId: testTenantId
            });

            expect(user).toBeTruthy();
            expect(user.username).toBe('testuser');
        });
    });

    describe('findActiveUsers', () => {
        it('should find only active users', async () => {
            await User.create({
                tenantId: testTenantId,
                username: 'active1',
                email: 'active1@test.com',
                password: 'password123',
                isActive: true,
                status: 'active'
            });

            await User.create({
                tenantId: testTenantId,
                username: 'inactive1',
                email: 'inactive1@test.com',
                password: 'password123',
                isActive: false,
                status: 'inactive'
            });

            const activeUsers = await userRepository.findActiveUsers({
                tenantId: testTenantId
            });

            expect(activeUsers).toHaveLength(1);
            expect(activeUsers[0].username).toBe('active1');
        });
    });

    describe('searchUsers', () => {
        it('should search users by name and email', async () => {
            await User.create({
                tenantId: testTenantId,
                username: 'john.doe',
                email: 'john.doe@test.com',
                password: 'password123',
                personalInfo: {
                    firstName: 'John',
                    lastName: 'Doe',
                    fullName: 'John Doe'
                }
            });

            await User.create({
                tenantId: testTenantId,
                username: 'jane.smith',
                email: 'jane.smith@test.com',
                password: 'password123',
                personalInfo: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    fullName: 'Jane Smith'
                }
            });

            const results = await userRepository.searchUsers('john', {
                tenantId: testTenantId
            });

            expect(results).toHaveLength(1);
            expect(results[0].username).toBe('john.doe');
        });
    });

    describe('getUserStatsByDepartment', () => {
        it('should return user statistics by department', async () => {
            // Create users in test department
            await User.create({
                tenantId: testTenantId,
                username: 'user1',
                email: 'user1@test.com',
                password: 'password123',
                department: testDepartment._id,
                status: 'active'
            });

            await User.create({
                tenantId: testTenantId,
                username: 'user2',
                email: 'user2@test.com',
                password: 'password123',
                department: testDepartment._id,
                status: 'inactive'
            });

            const stats = await userRepository.getUserStatsByDepartment({
                tenantId: testTenantId
            });

            expect(stats).toHaveLength(1);
            expect(stats[0].totalUsers).toBe(2);
            expect(stats[0].activeUsers).toBe(1);
            expect(stats[0].inactiveUsers).toBe(1);
        });
    });

    describe('updateLastLogin', () => {
        it('should update user last login timestamp', async () => {
            const user = await User.create({
                tenantId: testTenantId,
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            const updatedUser = await userRepository.updateLastLogin(user._id, {
                tenantId: testTenantId
            });

            expect(updatedUser.lastLogin).toBeTruthy();
            expect(updatedUser.lastLogin).toBeInstanceOf(Date);
        });
    });

    describe('findWithDetails', () => {
        it('should find users with populated department and position', async () => {
            const user = await User.create({
                tenantId: testTenantId,
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                department: testDepartment._id,
                position: testPosition._id
            });

            const users = await userRepository.findWithDetails({}, {
                tenantId: testTenantId
            });

            expect(users).toHaveLength(1);
            expect(users[0].department).toBeTruthy();
            expect(users[0].department.name).toBe('Test Department');
            expect(users[0].position).toBeTruthy();
            expect(users[0].position.title).toBe('Test Position');
        });
    });
});