import mongoose from 'mongoose';
import DepartmentRepository from '../../repositories/core/DepartmentRepository.js';
import Department from '../../modules/hr-core/users/models/department.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';

describe('DepartmentRepository', () => {
    let departmentRepository;
    let testTenantId;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        departmentRepository = new DepartmentRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        // Clean up test data
        await Department.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
    });

    afterAll(async () => {
        // Clean up test data
        await Department.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
    });

    describe('findByParent', () => {
        it('should find departments by parent department', async () => {
            const parentDept = await Department.create({
                tenantId: testTenantId,
                name: 'Parent Department',
                code: 'PARENT001'
            });

            const childDept1 = await Department.create({
                tenantId: testTenantId,
                name: 'Child Department 1',
                code: 'CHILD001',
                parentDepartment: parentDept._id
            });

            const childDept2 = await Department.create({
                tenantId: testTenantId,
                name: 'Child Department 2',
                code: 'CHILD002',
                parentDepartment: parentDept._id
            });

            const children = await departmentRepository.findByParent(parentDept._id, {
                tenantId: testTenantId
            });

            expect(children).toHaveLength(2);
            expect(children.map(d => d.name)).toContain('Child Department 1');
            expect(children.map(d => d.name)).toContain('Child Department 2');
        });
    });

    describe('findRootDepartments', () => {
        it('should find root departments (no parent)', async () => {
            const rootDept1 = await Department.create({
                tenantId: testTenantId,
                name: 'Root Department 1',
                code: 'ROOT001'
            });

            const rootDept2 = await Department.create({
                tenantId: testTenantId,
                name: 'Root Department 2',
                code: 'ROOT002'
            });

            const childDept = await Department.create({
                tenantId: testTenantId,
                name: 'Child Department',
                code: 'CHILD001',
                parentDepartment: rootDept1._id
            });

            const rootDepartments = await departmentRepository.findRootDepartments({
                tenantId: testTenantId
            });

            expect(rootDepartments).toHaveLength(2);
            expect(rootDepartments.map(d => d.name)).toContain('Root Department 1');
            expect(rootDepartments.map(d => d.name)).toContain('Root Department 2');
            expect(rootDepartments.map(d => d.name)).not.toContain('Child Department');
        });
    });

    describe('findActiveDepartments', () => {
        it('should find only active departments', async () => {
            await Department.create({
                tenantId: testTenantId,
                name: 'Active Department',
                code: 'ACTIVE001',
                isActive: true
            });

            await Department.create({
                tenantId: testTenantId,
                name: 'Inactive Department',
                code: 'INACTIVE001',
                isActive: false
            });

            const activeDepartments = await departmentRepository.findActiveDepartments({
                tenantId: testTenantId
            });

            expect(activeDepartments).toHaveLength(1);
            expect(activeDepartments[0].name).toBe('Active Department');
        });
    });

    describe('findByCode', () => {
        it('should find department by code', async () => {
            await Department.create({
                tenantId: testTenantId,
                name: 'Test Department',
                code: 'TEST001'
            });

            const department = await departmentRepository.findByCode('TEST001', {
                tenantId: testTenantId
            });

            expect(department).toBeTruthy();
            expect(department.name).toBe('Test Department');
        });

        it('should handle case insensitive code search', async () => {
            await Department.create({
                tenantId: testTenantId,
                name: 'Test Department',
                code: 'TEST001'
            });

            const department = await departmentRepository.findByCode('test001', {
                tenantId: testTenantId
            });

            expect(department).toBeTruthy();
            expect(department.name).toBe('Test Department');
        });
    });

    describe('findByManager', () => {
        it('should find departments by manager', async () => {
            const manager = await User.create({
                tenantId: testTenantId,
                username: 'manager1',
                email: 'manager1@test.com',
                password: 'password123',
                role: 'manager'
            });

            await Department.create({
                tenantId: testTenantId,
                name: 'Managed Department 1',
                code: 'MANAGED001',
                manager: manager._id
            });

            await Department.create({
                tenantId: testTenantId,
                name: 'Managed Department 2',
                code: 'MANAGED002',
                manager: manager._id
            });

            const departments = await departmentRepository.findByManager(manager._id, {
                tenantId: testTenantId
            });

            expect(departments).toHaveLength(2);
            expect(departments.map(d => d.name)).toContain('Managed Department 1');
            expect(departments.map(d => d.name)).toContain('Managed Department 2');
        });
    });

    describe('searchByName', () => {
        it('should search departments by name', async () => {
            await Department.create({
                tenantId: testTenantId,
                name: 'Human Resources',
                code: 'HR001'
            });

            await Department.create({
                tenantId: testTenantId,
                name: 'Information Technology',
                code: 'IT001'
            });

            const results = await departmentRepository.searchByName('human', {
                tenantId: testTenantId
            });

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Human Resources');
        });
    });

    describe('getParentChain', () => {
        it('should get parent chain for a department', async () => {
            const rootDept = await Department.create({
                tenantId: testTenantId,
                name: 'Root Department',
                code: 'ROOT001'
            });

            const middleDept = await Department.create({
                tenantId: testTenantId,
                name: 'Middle Department',
                code: 'MIDDLE001',
                parentDepartment: rootDept._id
            });

            const leafDept = await Department.create({
                tenantId: testTenantId,
                name: 'Leaf Department',
                code: 'LEAF001',
                parentDepartment: middleDept._id
            });

            const chain = await departmentRepository.getParentChain(leafDept._id, {
                tenantId: testTenantId
            });

            expect(chain).toHaveLength(3);
            expect(chain[0].name).toBe('Root Department');
            expect(chain[1].name).toBe('Middle Department');
            expect(chain[2].name).toBe('Leaf Department');
        });
    });

    describe('getAllDescendants', () => {
        it('should get all descendant departments', async () => {
            const rootDept = await Department.create({
                tenantId: testTenantId,
                name: 'Root Department',
                code: 'ROOT001'
            });

            const child1 = await Department.create({
                tenantId: testTenantId,
                name: 'Child 1',
                code: 'CHILD001',
                parentDepartment: rootDept._id
            });

            const child2 = await Department.create({
                tenantId: testTenantId,
                name: 'Child 2',
                code: 'CHILD002',
                parentDepartment: rootDept._id
            });

            const grandchild = await Department.create({
                tenantId: testTenantId,
                name: 'Grandchild',
                code: 'GRAND001',
                parentDepartment: child1._id
            });

            const descendants = await departmentRepository.getAllDescendants(rootDept._id, {
                tenantId: testTenantId
            });

            expect(descendants).toHaveLength(3);
            expect(descendants.map(d => d.name)).toContain('Child 1');
            expect(descendants.map(d => d.name)).toContain('Child 2');
            expect(descendants.map(d => d.name)).toContain('Grandchild');
        });
    });

    describe('hasSubDepartments', () => {
        it('should check if department has sub-departments', async () => {
            const parentDept = await Department.create({
                tenantId: testTenantId,
                name: 'Parent Department',
                code: 'PARENT001'
            });

            const childDept = await Department.create({
                tenantId: testTenantId,
                name: 'Child Department',
                code: 'CHILD001',
                parentDepartment: parentDept._id
            });

            const hasChildren = await departmentRepository.hasSubDepartments(parentDept._id, {
                tenantId: testTenantId
            });

            const hasNoChildren = await departmentRepository.hasSubDepartments(childDept._id, {
                tenantId: testTenantId
            });

            expect(hasChildren).toBe(true);
            expect(hasNoChildren).toBe(false);
        });
    });

    describe('getDepartmentStats', () => {
        it('should return department statistics', async () => {
            const manager = await User.create({
                tenantId: testTenantId,
                username: 'manager1',
                email: 'manager1@test.com',
                password: 'password123',
                role: 'manager'
            });

            await Department.create({
                tenantId: testTenantId,
                name: 'Active Department 1',
                code: 'ACTIVE001',
                isActive: true,
                manager: manager._id
            });

            await Department.create({
                tenantId: testTenantId,
                name: 'Active Department 2',
                code: 'ACTIVE002',
                isActive: true
            });

            await Department.create({
                tenantId: testTenantId,
                name: 'Inactive Department',
                code: 'INACTIVE001',
                isActive: false
            });

            const stats = await departmentRepository.getDepartmentStats({
                tenantId: testTenantId
            });

            expect(stats.totalDepartments).toBe(3);
            expect(stats.activeDepartments).toBe(2);
            expect(stats.rootDepartments).toBe(3); // All are root departments
            expect(stats.departmentsWithManager).toBe(1);
        });
    });

    describe('updateManager', () => {
        it('should update department manager', async () => {
            const department = await Department.create({
                tenantId: testTenantId,
                name: 'Test Department',
                code: 'TEST001'
            });

            const manager = await User.create({
                tenantId: testTenantId,
                username: 'manager1',
                email: 'manager1@test.com',
                password: 'password123',
                role: 'manager'
            });

            const updatedDept = await departmentRepository.updateManager(
                department._id,
                manager._id,
                { tenantId: testTenantId }
            );

            expect(updatedDept.manager.toString()).toBe(manager._id.toString());
        });
    });

    describe('deactivateWithSubDepartments', () => {
        it('should deactivate department and all sub-departments', async () => {
            const parentDept = await Department.create({
                tenantId: testTenantId,
                name: 'Parent Department',
                code: 'PARENT001',
                isActive: true
            });

            const childDept = await Department.create({
                tenantId: testTenantId,
                name: 'Child Department',
                code: 'CHILD001',
                parentDepartment: parentDept._id,
                isActive: true
            });

            const result = await departmentRepository.deactivateWithSubDepartments(
                parentDept._id,
                { tenantId: testTenantId }
            );

            expect(result.modifiedCount).toBe(2);
            expect(result.deactivatedDepartments).toHaveLength(2);

            // Verify departments are deactivated
            const updatedParent = await Department.findById(parentDept._id);
            const updatedChild = await Department.findById(childDept._id);

            expect(updatedParent.isActive).toBe(false);
            expect(updatedChild.isActive).toBe(false);
        });
    });
});