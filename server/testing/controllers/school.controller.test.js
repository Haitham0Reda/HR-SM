/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import School from '../../models/school.model.js';
import User from '../../models/user.model.js';
import * as schoolController from '../../controller/school.controller.js';
import { createMockResponse, createMockRequest } from './testHelpers.js';

describe('School Controller - All 7 Functions', () => {
    let mockReq, mockRes, testSchool, testUser;

    beforeEach(async () => {
        testSchool = await School.create({
            schoolCode: 'BUS',
            name: 'School of Business',
            arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
        });

        testUser = await User.create({
            username: 'testadmin',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin',
            school: testSchool._id,
            profile: { firstName: 'Test', lastName: 'Admin' }
        });

        await School.findByIdAndUpdate(testSchool._id, { dean: testUser._id });

        mockReq = createMockRequest();
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await School.deleteMany({});
        await User.deleteMany({});
    });

    describe('1. getAllSchools', () => {
        it('should get all schools successfully', async () => {
            await schoolController.getAllSchools(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(200);
            expect(Array.isArray(mockRes.responseData)).toBe(true);
            expect(mockRes.responseData.length).toBeGreaterThan(0);
        });

        it('should handle database errors', async () => {
            const originalFind = School.find;
            School.find = () => {
                throw new Error('Database error');
            };

            await schoolController.getAllSchools(mockReq, mockRes);
            expect(mockRes.statusCode).toBe(500);

            School.find = originalFind;
        });
    });

    describe('2. createSchool', () => {
        it('should create school successfully', async () => {
            mockReq.body = {
                schoolCode: 'ENG',
                name: 'School of Engineering',
                arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
            };

            await schoolController.createSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(201);
            expect(mockRes.responseData.schoolCode).toBe('ENG');
        });

        it('should reject invalid school code', async () => {
            mockReq.body = {
                schoolCode: 'INVALID',
                name: 'Invalid School',
                arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
            };

            await schoolController.createSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(400);
        });

        it('should reject duplicate school code', async () => {
            mockReq.body = {
                schoolCode: 'BUS',
                name: 'Another Business School',
                arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
            };

            await schoolController.createSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(400);
        });

        it('should reject missing required fields', async () => {
            mockReq.body = {
                schoolCode: 'ENG'
            };

            await schoolController.createSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(400);
        });
    });

    describe('3. getSchoolById', () => {
        it('should get school by ID successfully', async () => {
            mockReq.params.id = testSchool._id.toString();

            await schoolController.getSchoolById(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(200);
            expect(mockRes.responseData.schoolCode).toBe('BUS');
        });

        it('should return 404 for non-existent school', async () => {
            mockReq.params.id = new mongoose.Types.ObjectId().toString();

            await schoolController.getSchoolById(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(404);
        });

        it('should handle invalid ID format', async () => {
            mockReq.params.id = 'invalid-id';

            await schoolController.getSchoolById(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(500);
        });
    });

    describe('4. getSchoolByCode', () => {
        it('should get school by code successfully', async () => {
            mockReq.params.code = 'BUS';

            await schoolController.getSchoolByCode(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(200);
            expect(mockRes.responseData.schoolCode).toBe('BUS');
        });

        it('should return 404 for non-existent code', async () => {
            mockReq.params.code = 'INVALID';

            await schoolController.getSchoolByCode(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(404);
        });

        it('should be case insensitive', async () => {
            mockReq.params.code = 'bus';

            await schoolController.getSchoolByCode(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(200);
            expect(mockRes.responseData.schoolCode).toBe('BUS');
        });
    });

    describe('5. updateSchool', () => {
        it('should update school successfully', async () => {
            mockReq.params.id = testSchool._id.toString();
            mockReq.body = { isActive: false };

            await schoolController.updateSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(200);
            expect(mockRes.responseData.isActive).toBe(false);
        });

        it('should return 404 for non-existent school', async () => {
            mockReq.params.id = new mongoose.Types.ObjectId().toString();
            mockReq.body = { isActive: false };

            await schoolController.updateSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(404);
        });

        it('should reject invalid updates', async () => {
            mockReq.params.id = testSchool._id.toString();
            mockReq.body = { schoolCode: 'INVALID' };

            await schoolController.updateSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(400);
        });
    });

    describe('6. deleteSchool', () => {
        it('should delete school successfully', async () => {
            mockReq.params.id = testSchool._id.toString();

            await schoolController.deleteSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(200);
            expect(mockRes.responseData.message).toBe('School deleted');

            const deleted = await School.findById(testSchool._id);
            expect(deleted).toBeNull();
        });

        it('should return 404 for non-existent school', async () => {
            mockReq.params.id = new mongoose.Types.ObjectId().toString();

            await schoolController.deleteSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(404);
        });

        it('should handle database errors', async () => {
            mockReq.params.id = 'invalid-id';

            await schoolController.deleteSchool(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(500);
        });
    });

    describe('7. getActiveSchools', () => {
        it('should get active schools successfully', async () => {
            await schoolController.getActiveSchools(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(200);
            expect(Array.isArray(mockRes.responseData)).toBe(true);
            expect(mockRes.responseData.length).toBeGreaterThan(0);
        });

        it('should not return inactive schools', async () => {
            await School.findByIdAndUpdate(testSchool._id, { isActive: false });

            await schoolController.getActiveSchools(mockReq, mockRes);

            expect(mockRes.statusCode).toBe(200);
            expect(mockRes.responseData.length).toBe(0);
        });

        it('should handle database errors', async () => {
            const originalMethod = School.getActiveSchools;
            School.getActiveSchools = () => {
                throw new Error('Database error');
            };

            await schoolController.getActiveSchools(mockReq, mockRes);
            expect(mockRes.statusCode).toBe(500);

            School.getActiveSchools = originalMethod;
        });
    });
});
