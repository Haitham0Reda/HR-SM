import Department from '../../modules/hr-core/users/models/department.model.js';
import Position from '../../modules/hr-core/users/models/position.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
import organization from '../../platform/models/organization.model.js';

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
    get: function (header) {
        return this.headers?.[header.toLowerCase()] || null;
    },
    headers: {},
    ip: '127.0.0.1',
    ...overrides
});

export const createTestDepartment = async () => {
    return await Department.create({
        tenantId: 'test_tenant_123',
        name: 'IT Department',
        arabicName: 'قسم تكنولوجيا المعلومات',
        code: 'IT001'
    });
};

export const createTestPosition = async (departmentId) => {
    return await Position.create({
        tenantId: 'test_tenant_123',
        title: 'Developer',
        arabicTitle: 'مطور',
        code: 'DEV001',
        department: departmentId
    });
};

export const createTestUser = async (departmentId, positionId, overrides = {}) => {
    const uniqueId = Math.random().toString(36).substring(7);
    return await User.create({
        tenantId: 'test_tenant_123',
        username: `testuser_${uniqueId}`,
        email: `test_${uniqueId}@test.com`,
        password: 'password123',
        role: 'employee',
        department: departmentId,
        position: positionId,
        personalInfo: {
            firstName: 'Test',
            lastName: 'User',
            phoneNumber: '1234567890',
            nationalID: `12345678901${uniqueId}`,
            dateOfBirth: new Date('1990-01-01'),
            hireDate: new Date()
        },
        ...overrides
    });
};

export const createTestorganization = async (overrides = {}) => {
    const uniqueId = Math.random().toString(36).substring(7);
    return await organization.create({
        tenantId: 'test_tenant_123',
        name: `Test organization ${uniqueId}`,
        code: `TESTSCH${uniqueId}`,
        address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country'
        },
        contact: {
            phone: '555-0123',
            email: `test_${uniqueId}@company.com`,
            website: 'https://testorganization.edu'
        },
        establishedDate: new Date('2000-01-01'),
        type: 'elementary',
        capacity: {
            students: 500,
            staff: 50
        },
        status: 'active',
        ...overrides
    });
};

export const cleanupTestData = async () => {
    await User.deleteMany({});
    await Position.deleteMany({});
    await Department.deleteMany({});
    await organization.deleteMany({});
};
