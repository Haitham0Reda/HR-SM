/**
 * Test data factories for generating dynamic test data
 */

// Test validation structure
describe('Test Data Factories', () => {
    it('should have UserFactory available', () => {
        expect(typeof UserFactory.create).to.equal('function');
    });

    it('should have TenantFactory available', () => {
        expect(typeof TenantFactory.create).to.equal('function');
    });
});

import { faker } from '@faker-js/faker';

export class UserFactory {
    static create(overrides = {}) {
        return {
            email: faker.internet.email(),
            password: 'TestPassword123!',
            name: faker.person.fullName(),
            role: 'employee',
            department: faker.commerce.department(),
            position: faker.person.jobTitle(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
            hireDate: faker.date.past({ years: 5 }),
            salary: faker.number.int({ min: 30000, max: 150000 }),
            ...overrides
        };
    }

    static createAdmin(overrides = {}) {
        return this.create({
            role: 'admin',
            permissions: ['all'],
            ...overrides
        });
    }

    static createManager(overrides = {}) {
        return this.create({
            role: 'manager',
            permissions: ['team_management', 'approval', 'reports'],
            ...overrides
        });
    }

    static createHR(overrides = {}) {
        return this.create({
            role: 'hr',
            permissions: ['hr_management', 'employee_management', 'reports'],
            ...overrides
        });
    }

    static createBatch(count = 5, overrides = {}) {
        return Array.from({ length: count }, () => this.create(overrides));
    }
}

export class TenantFactory {
    static create(overrides = {}) {
        const companyName = faker.company.name();
        return {
            name: companyName,
            domain: faker.internet.domainWord(),
            email: faker.internet.email(),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            industry: faker.commerce.department(),
            size: faker.helpers.arrayElement(['1-10', '11-50', '51-100', '101-500', '500+']),
            subscription: {
                plan: faker.helpers.arrayElement(['basic', 'professional', 'enterprise']),
                status: 'active',
                enabledModules: ['hr-core', 'attendance', 'vacation'],
                maxUsers: faker.number.int({ min: 10, max: 500 }),
                expiryDate: faker.date.future({ years: 1 })
            },
            settings: {
                timezone: faker.location.timeZone(),
                dateFormat: 'YYYY-MM-DD',
                currency: faker.finance.currencyCode(),
                workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                workingHours: {
                    start: '09:00',
                    end: '17:00'
                }
            },
            ...overrides
        };
    }

    static createWithExpiredSubscription(overrides = {}) {
        return this.create({
            subscription: {
                plan: 'basic',
                status: 'expired',
                enabledModules: ['hr-core'],
                maxUsers: 10,
                expiryDate: faker.date.past({ years: 1 })
            },
            ...overrides
        });
    }
}

export class LeaveRequestFactory {
    static create(overrides = {}) {
        const startDate = faker.date.future({ days: 30 });
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + faker.number.int({ min: 1, max: 10 }));

        return {
            type: faker.helpers.arrayElement(['Annual Leave', 'Sick Leave', 'Personal Leave']),
            startDate: startDate,
            endDate: endDate,
            reason: faker.lorem.sentence(),
            status: 'pending',
            requestedBy: faker.internet.email(),
            requestedAt: new Date(),
            ...overrides
        };
    }

    static createApproved(overrides = {}) {
        return this.create({
            status: 'approved',
            approvedBy: faker.internet.email(),
            approvedAt: new Date(),
            ...overrides
        });
    }

    static createRejected(overrides = {}) {
        return this.create({
            status: 'rejected',
            rejectedBy: faker.internet.email(),
            rejectedAt: new Date(),
            rejectionReason: faker.lorem.sentence(),
            ...overrides
        });
    }
}

export class AttendanceFactory {
    static create(overrides = {}) {
        const clockIn = faker.date.recent({ days: 1 });
        const clockOut = new Date(clockIn);
        clockOut.setHours(clockOut.getHours() + faker.number.int({ min: 6, max: 10 }));

        return {
            employeeId: faker.string.uuid(),
            date: faker.date.recent({ days: 30 }),
            clockIn: clockIn,
            clockOut: clockOut,
            breakDuration: faker.number.int({ min: 30, max: 90 }), // minutes
            totalHours: (clockOut - clockIn) / (1000 * 60 * 60), // hours
            status: 'present',
            location: faker.location.city(),
            ...overrides
        };
    }

    static createAbsent(overrides = {}) {
        return this.create({
            clockIn: null,
            clockOut: null,
            totalHours: 0,
            status: 'absent',
            ...overrides
        });
    }
}

export class TaskFactory {
    static create(overrides = {}) {
        return {
            title: faker.lorem.words(3),
            description: faker.lorem.paragraph(),
            priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
            status: faker.helpers.arrayElement(['todo', 'in_progress', 'review', 'completed']),
            assignedTo: faker.internet.email(),
            assignedBy: faker.internet.email(),
            dueDate: faker.date.future({ days: 30 }),
            estimatedHours: faker.number.int({ min: 1, max: 40 }),
            actualHours: faker.number.int({ min: 0, max: 50 }),
            tags: faker.helpers.arrayElements(['frontend', 'backend', 'testing', 'documentation'], { min: 1, max: 3 }),
            createdAt: faker.date.past({ days: 30 }),
            ...overrides
        };
    }

    static createCompleted(overrides = {}) {
        return this.create({
            status: 'completed',
            completedAt: faker.date.recent({ days: 7 }),
            ...overrides
        });
    }
}

export class DocumentFactory {
    static create(overrides = {}) {
        return {
            name: faker.system.fileName(),
            type: faker.helpers.arrayElement(['contract', 'policy', 'form', 'certificate', 'report']),
            category: faker.helpers.arrayElement(['hr', 'legal', 'finance', 'operations']),
            size: faker.number.int({ min: 1024, max: 10485760 }), // 1KB to 10MB
            uploadedBy: faker.internet.email(),
            uploadedAt: faker.date.past({ days: 90 }),
            description: faker.lorem.sentence(),
            tags: faker.helpers.arrayElements(['important', 'confidential', 'public', 'archived'], { min: 0, max: 2 }),
            version: faker.system.semver(),
            ...overrides
        };
    }
}

export class LicenseFactory {
    static create(overrides = {}) {
        return {
            licenseNumber: faker.string.alphanumeric(16).toUpperCase(),
            tenantId: faker.string.uuid(),
            features: faker.helpers.arrayElements(['hr-core', 'attendance', 'payroll', 'vacation'], { min: 1, max: 4 }),
            limits: {
                maxUsers: faker.number.int({ min: 10, max: 1000 }),
                maxStorage: faker.number.int({ min: 1, max: 100 }), // GB
                apiCallsPerMonth: faker.number.int({ min: 1000, max: 100000 })
            },
            status: 'active',
            issuedAt: faker.date.past({ days: 30 }),
            expiresAt: faker.date.future({ years: 1 }),
            machineBinding: {
                machineId: faker.string.uuid(),
                activatedAt: faker.date.recent({ days: 7 })
            },
            ...overrides
        };
    }

    static createExpired(overrides = {}) {
        return this.create({
            status: 'expired',
            expiresAt: faker.date.past({ days: 30 }),
            ...overrides
        });
    }
}

// Utility functions for test data management
export class TestDataManager {
    static generateTestEmail(prefix = 'test') {
        return `${prefix}+${faker.string.alphanumeric(8)}@example.com`;
    }

    static generateUniqueId() {
        return faker.string.uuid();
    }

    static generateRandomString(length = 10) {
        return faker.string.alphanumeric(length);
    }

    static generateFutureDate(days = 30) {
        return faker.date.future({ days });
    }

    static generatePastDate(days = 30) {
        return faker.date.past({ days });
    }
}