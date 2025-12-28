import mongoose from 'mongoose';
import PositionRepository from '../../repositories/core/PositionRepository.js';
import Position from '../../modules/hr-core/users/models/position.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';

describe('PositionRepository', () => {
    let positionRepository;
    let testTenantId;
    let testDepartment;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        positionRepository = new PositionRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        // Clean up test data
        await Position.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });

        // Create test department
        testDepartment = await Department.create({
            tenantId: testTenantId,
            name: 'Test Department',
            code: 'TEST001'
        });
    });

    afterAll(async () => {
        // Clean up test data
        await Position.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
    });

    describe('findByDepartment', () => {
        it('should find positions by department', async () => {
            const position1 = await Position.create({
                tenantId: testTenantId,
                title: 'Software Engineer',
                code: 'POS001',
                department: testDepartment._id
            });

            const position2 = await Position.create({
                tenantId: testTenantId,
                title: 'Senior Developer',
                code: 'POS002',
                department: testDepartment._id
            });

            // Create position in different department
            const otherDepartment = await Department.create({
                tenantId: testTenantId,
                name: 'Other Department',
                code: 'OTHER001'
            });

            await Position.create({
                tenantId: testTenantId,
                title: 'Manager',
                code: 'POS003',
                department: otherDepartment._id
            });

            const positions = await positionRepository.findByDepartment(testDepartment._id, {
                tenantId: testTenantId
            });

            expect(positions).toHaveLength(2);
            expect(positions.map(p => p.title)).toContain('Software Engineer');
            expect(positions.map(p => p.title)).toContain('Senior Developer');
        });
    });

    describe('findActivePositions', () => {
        it('should find only active positions', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Active Position',
                code: 'POS001',
                department: testDepartment._id,
                isActive: true
            });

            await Position.create({
                tenantId: testTenantId,
                title: 'Inactive Position',
                code: 'POS002',
                department: testDepartment._id,
                isActive: false
            });

            const activePositions = await positionRepository.findActivePositions({
                tenantId: testTenantId
            });

            expect(activePositions).toHaveLength(1);
            expect(activePositions[0].title).toBe('Active Position');
        });
    });

    describe('findByCode', () => {
        it('should find position by code', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Test Position',
                code: 'POS001',
                department: testDepartment._id
            });

            const position = await positionRepository.findByCode('POS001', {
                tenantId: testTenantId
            });

            expect(position).toBeTruthy();
            expect(position.title).toBe('Test Position');
        });
    });

    describe('searchByTitle', () => {
        it('should search positions by title', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Software Engineer',
                code: 'POS001',
                department: testDepartment._id
            });

            await Position.create({
                tenantId: testTenantId,
                title: 'Hardware Engineer',
                code: 'POS002',
                department: testDepartment._id
            });

            await Position.create({
                tenantId: testTenantId,
                title: 'Project Manager',
                code: 'POS003',
                department: testDepartment._id
            });

            const results = await positionRepository.searchByTitle('engineer', {
                tenantId: testTenantId
            });

            expect(results).toHaveLength(2);
            expect(results.map(p => p.title)).toContain('Software Engineer');
            expect(results.map(p => p.title)).toContain('Hardware Engineer');
        });
    });

    describe('findWithDepartment', () => {
        it('should find positions with populated department', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Test Position',
                code: 'POS001',
                department: testDepartment._id
            });

            const positions = await positionRepository.findWithDepartment({}, {
                tenantId: testTenantId
            });

            expect(positions).toHaveLength(1);
            expect(positions[0].department).toBeTruthy();
            expect(positions[0].department.name).toBe('Test Department');
        });
    });

    describe('findWithEmployeeCounts', () => {
        it('should find positions with employee counts', async () => {
            const position = await Position.create({
                tenantId: testTenantId,
                title: 'Software Engineer',
                code: 'POS001',
                department: testDepartment._id
            });

            // Create users with this position
            await User.create({
                tenantId: testTenantId,
                username: 'user1',
                email: 'user1@test.com',
                password: 'password123',
                position: position._id,
                isActive: true
            });

            await User.create({
                tenantId: testTenantId,
                username: 'user2',
                email: 'user2@test.com',
                password: 'password123',
                position: position._id,
                isActive: false
            });

            const positions = await positionRepository.findWithEmployeeCounts({
                tenantId: testTenantId
            });

            expect(positions).toHaveLength(1);
            expect(positions[0].employeeCount).toBe(2);
            expect(positions[0].activeEmployeeCount).toBe(1);
            expect(positions[0].department).toBeTruthy();
            expect(positions[0].department.name).toBe('Test Department');
        });
    });

    describe('getPositionStatsByDepartment', () => {
        it('should return position statistics by department', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Position 1',
                code: 'POS001',
                department: testDepartment._id,
                isActive: true
            });

            await Position.create({
                tenantId: testTenantId,
                title: 'Position 2',
                code: 'POS002',
                department: testDepartment._id,
                isActive: false
            });

            const stats = await positionRepository.getPositionStatsByDepartment({
                tenantId: testTenantId
            });

            expect(stats).toHaveLength(1);
            expect(stats[0].totalPositions).toBe(2);
            expect(stats[0].activePositions).toBe(1);
            expect(stats[0].departmentName).toBe('Test Department');
        });
    });

    describe('getPositionStats', () => {
        it('should return overall position statistics', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Active Position',
                code: 'POS001',
                department: testDepartment._id,
                isActive: true
            });

            await Position.create({
                tenantId: testTenantId,
                title: 'Inactive Position',
                code: 'POS002',
                department: testDepartment._id,
                isActive: false
            });

            const stats = await positionRepository.getPositionStats({
                tenantId: testTenantId
            });

            expect(stats.totalPositions).toBe(2);
            expect(stats.activePositions).toBe(1);
            expect(stats.inactivePositions).toBe(1);
        });
    });

    describe('findAvailablePositions', () => {
        it('should find positions available for assignment', async () => {
            const position1 = await Position.create({
                tenantId: testTenantId,
                title: 'Available Position',
                code: 'POS001',
                department: testDepartment._id,
                isActive: true
            });

            const position2 = await Position.create({
                tenantId: testTenantId,
                title: 'Full Position',
                code: 'POS002',
                department: testDepartment._id,
                isActive: true
            });

            // Add few employees to position1 (under limit)
            await User.create({
                tenantId: testTenantId,
                username: 'user1',
                email: 'user1@test.com',
                password: 'password123',
                position: position1._id,
                isActive: true
            });

            // Add many employees to position2 (over limit)
            for (let i = 0; i < 6; i++) {
                await User.create({
                    tenantId: testTenantId,
                    username: `user${i + 10}`,
                    email: `user${i + 10}@test.com`,
                    password: 'password123',
                    position: position2._id,
                    isActive: true
                });
            }

            const availablePositions = await positionRepository.findAvailablePositions({
                tenantId: testTenantId,
                maxEmployees: 5
            });

            expect(availablePositions).toHaveLength(1);
            expect(availablePositions[0].title).toBe('Available Position');
            expect(availablePositions[0].employeeCount).toBe(1);
        });
    });

    describe('bulkUpdateByDepartment', () => {
        it('should bulk update positions by department', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Position 1',
                code: 'POS001',
                department: testDepartment._id,
                isActive: true
            });

            await Position.create({
                tenantId: testTenantId,
                title: 'Position 2',
                code: 'POS002',
                department: testDepartment._id,
                isActive: true
            });

            const result = await positionRepository.bulkUpdateByDepartment(
                testDepartment._id,
                { isActive: false },
                { tenantId: testTenantId }
            );

            expect(result.matchedCount).toBe(2);
            expect(result.modifiedCount).toBe(2);

            // Verify positions are updated
            const positions = await Position.find({ 
                tenantId: testTenantId,
                department: testDepartment._id 
            });

            expect(positions.every(p => p.isActive === false)).toBe(true);
        });
    });

    describe('deactivateByDepartment', () => {
        it('should deactivate all positions in a department', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Position 1',
                code: 'POS001',
                department: testDepartment._id,
                isActive: true
            });

            await Position.create({
                tenantId: testTenantId,
                title: 'Position 2',
                code: 'POS002',
                department: testDepartment._id,
                isActive: true
            });

            const result = await positionRepository.deactivateByDepartment(
                testDepartment._id,
                { tenantId: testTenantId }
            );

            expect(result.modifiedCount).toBe(2);

            // Verify positions are deactivated
            const positions = await Position.find({ 
                tenantId: testTenantId,
                department: testDepartment._id 
            });

            expect(positions.every(p => p.isActive === false)).toBe(true);
        });
    });

    describe('getNextPositionCode', () => {
        it('should generate next available position code', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Position 1',
                code: 'POS001',
                department: testDepartment._id
            });

            await Position.create({
                tenantId: testTenantId,
                title: 'Position 2',
                code: 'POS003',
                department: testDepartment._id
            });

            const nextCode = await positionRepository.getNextPositionCode({
                tenantId: testTenantId
            });

            expect(nextCode).toBe('POS002'); // Should fill the gap
        });
    });

    describe('isCodeUnique', () => {
        it('should check if position code is unique', async () => {
            await Position.create({
                tenantId: testTenantId,
                title: 'Existing Position',
                code: 'POS001',
                department: testDepartment._id
            });

            const isUnique1 = await positionRepository.isCodeUnique('POS001', null, {
                tenantId: testTenantId
            });

            const isUnique2 = await positionRepository.isCodeUnique('POS002', null, {
                tenantId: testTenantId
            });

            expect(isUnique1).toBe(false);
            expect(isUnique2).toBe(true);
        });

        it('should exclude specific position ID when checking uniqueness', async () => {
            const position = await Position.create({
                tenantId: testTenantId,
                title: 'Test Position',
                code: 'POS001',
                department: testDepartment._id
            });

            const isUnique = await positionRepository.isCodeUnique('POS001', position._id, {
                tenantId: testTenantId
            });

            expect(isUnique).toBe(true); // Should be unique when excluding itself
        });
    });
});