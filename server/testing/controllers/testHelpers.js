import Department from '../../modules/hr-core/users/models/department.model.js';
import Position from '../../modules/hr-core/users/models/position.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
// organization model removed - not needed for general HR system

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
    tenantId: 'test_tenant_123',
    get: function (header) {
        return this.headers?.[header.toLowerCase()] || null;
    },
    headers: {},
    ip: '127.0.0.1',
    companyLogger: {
        info: () => { },
        warn: () => { },
        error: () => { },
        debug: () => { },
        security: () => { },
        performance: () => { },
        audit: () => { }
    },
    ...overrides
});

export const createTestDepartment = async (tenantId = 'test_tenant_123', name = 'IT Department') => {
    const uniqueSuffix = Math.random().toString(36).substring(7);
    const uniqueCode = `${tenantId === 'test_tenant_123' ? 'IT' : 'HR'}${uniqueSuffix}`;
    const uniqueName = `${name}_${uniqueSuffix}`;
    const arabicName = tenantId === 'test_tenant_123' ? 'قسم تكنولوجيا المعلومات' : 'قسم الموارد البشرية';

    return await Department.create({
        tenantId: tenantId,
        name: uniqueName,
        arabicName: `${arabicName}_${uniqueSuffix}`,
        code: uniqueCode
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

// createTestorganization function removed - not needed for general HR system

export const cleanupTestData = async () => {
    await User.deleteMany({});
    await Position.deleteMany({});
    await Department.deleteMany({});
    // organization cleanup removed - not needed for general HR system
};
