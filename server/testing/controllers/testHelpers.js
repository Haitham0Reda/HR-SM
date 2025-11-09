import School from '../../models/school.model.js';
import Department from '../../models/department.model.js';
import Position from '../../models/position.model.js';
import User from '../../models/user.model.js';

export const createMockResponse = () => ({
    statusCode: 200,
    responseData: null,
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        this.responseData = data;
        return this;
    }
});

export const createMockRequest = (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    user: {},
    ...overrides
});

export const createTestSchool = async () => {
    return await School.create({
        schoolCode: 'BUS',
        name: 'School of Business',
        arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
};

export const createTestDepartment = async (schoolId) => {
    return await Department.create({
        name: 'IT Department',
        arabicName: 'قسم تكنولوجيا المعلومات',
        code: 'IT001',
        school: schoolId
    });
};

export const createTestPosition = async (departmentId) => {
    return await Position.create({
        title: 'Developer',
        arabicTitle: 'مطور',
        code: 'DEV001',
        department: departmentId
    });
};

export const createTestUser = async (schoolId, departmentId, positionId, overrides = {}) => {
    // If no school provided, create one
    if (!schoolId) {
        const school = await createTestSchool();
        schoolId = school._id;
    }

    return await User.create({
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123',
        role: 'employee',
        school: schoolId,
        department: departmentId,
        position: positionId,
        profile: {
            firstName: 'Test',
            lastName: 'User',
            phoneNumber: '1234567890',
            nationalID: '12345678901234',
            dateOfBirth: new Date('1990-01-01'),
            hireDate: new Date()
        },
        ...overrides
    });
};

export const cleanupTestData = async () => {
    await User.deleteMany({});
    await Position.deleteMany({});
    await Department.deleteMany({});
    await School.deleteMany({});
};
