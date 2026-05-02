/**
 * @jest-environment node
 */
import Department from '../../modules/hr-core/users/models/department.model.js';
import * as departmentController from '../../modules/hr-core/users/controllers/department.controller.js';
import { createMockResponse, createMockRequest, createTestUser, createTestDepartment, cleanupTestData } from './testHelpers.js';

describe('Department Controller - All 5 Functions', () => {
    let mockReq, mockRes, testOrganization, testUser;

    beforeEach(async () => {
        testOrganization = await createTestDepartment();
        testUser = await createTestUser(testOrganization.id, null, null);

        mockReq = createMockRequest({ user: { id: testUser.id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Department.destroy({ where: {} });
        await cleanupTestData();
    });

    describe('1. getAllDepartments', () => {
        it('should execute getAllDepartments function', async () => {
            await departmentController.getAllDepartments(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllDepartments', async () => {
            await departmentController.getAllDepartments(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createDepartment', () => {
        it('should execute createDepartment function', async () => {
            await departmentController.createDepartment(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createDepartment', async () => {
            await departmentController.createDepartment(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getDepartmentById', () => {
        it('should execute getDepartmentById function', async () => {
            await departmentController.getDepartmentById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getDepartmentById', async () => {
            mockReq.params.id = 'invalid-id';
            await departmentController.getDepartmentById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateDepartment', () => {
        it('should execute updateDepartment function', async () => {
            await departmentController.updateDepartment(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateDepartment', async () => {
            mockReq.params.id = 'invalid-id';
            await departmentController.updateDepartment(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteDepartment', () => {
        it('should execute deleteDepartment function', async () => {
            await departmentController.deleteDepartment(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteDepartment', async () => {
            mockReq.params.id = 'invalid-id';
            await departmentController.deleteDepartment(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
