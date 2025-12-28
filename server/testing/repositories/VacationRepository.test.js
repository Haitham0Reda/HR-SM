import mongoose from 'mongoose';
import VacationRepository from '../../repositories/modules/VacationRepository.js';
import Vacation from '../../modules/hr-core/vacations/models/vacation.model.js';
import User from '../../modules/hr-core/models/User.js';
import Department from '../../modules/hr-core/models/Department.js';

describe('VacationRepository', () => {
    let vacationRepository;
    let testTenantId;
    let testUser;
    let testDepartment;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        vacationRepository = new VacationRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        await Vacation.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });

        testDepartment = await Department.create({
            tenantId: testTenantId,
            name: 'Test Department',
            code: 'TEST001'
        });

        testUser = await User.create({
            tenantId: testTenantId,
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            department: testDepartment._id
        });
    });

    afterAll(async () => {
        await Vacation.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });
    });

    describe('findByEmployee', () => {
        it('should find vacations by employee', async () => {
            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                duration: 3,
                status: 'approved'
            });

            const vacations = await vacationRepository.findByEmployee(testUser._id, {
                tenantId: testTenantId
            });

            expect(vacations).toHaveLength(1);
            expect(vacations[0].vacationType).toBe('annual');
        });
    });

    describe('findByStatus', () => {
        it('should find vacations by status', async () => {
            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                duration: 3,
                status: 'pending'
            });

            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'sick',
                startDate: new Date('2025-01-20'),
                endDate: new Date('2025-01-22'),
                duration: 3,
                status: 'approved'
            });

            const pendingVacations = await vacationRepository.findByStatus('pending', {
                tenantId: testTenantId
            });

            expect(pendingVacations).toHaveLength(1);
            expect(pendingVacations[0].status).toBe('pending');
        });
    });

    describe('findPendingVacations', () => {
        it('should find pending vacations for approval', async () => {
            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                duration: 3,
                status: 'pending'
            });

            const pendingVacations = await vacationRepository.findPendingVacations(
                testDepartment._id,
                { tenantId: testTenantId }
            );

            expect(pendingVacations).toHaveLength(1);
            expect(pendingVacations[0].status).toBe('pending');
        });
    });

    describe('findActiveVacations', () => {
        it('should find currently active vacations', async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: yesterday,
                endDate: tomorrow,
                duration: 3,
                status: 'approved'
            });

            const activeVacations = await vacationRepository.findActiveVacations(
                null,
                { tenantId: testTenantId }
            );

            expect(activeVacations).toHaveLength(1);
            expect(activeVacations[0].status).toBe('approved');
        });
    });

    describe('findUpcomingVacations', () => {
        it('should find upcoming vacations', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);

            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: futureDate,
                endDate: new Date(futureDate.getTime() + 2 * 24 * 60 * 60 * 1000),
                duration: 3,
                status: 'approved'
            });

            const upcomingVacations = await vacationRepository.findUpcomingVacations(
                30,
                { tenantId: testTenantId }
            );

            expect(upcomingVacations).toHaveLength(1);
            expect(upcomingVacations[0].status).toBe('approved');
        });
    });

    describe('hasOverlappingVacation', () => {
        it('should detect overlapping vacations', async () => {
            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                duration: 3,
                status: 'approved'
            });

            const hasOverlap = await vacationRepository.hasOverlappingVacation(
                testUser._id,
                new Date('2025-01-16'),
                new Date('2025-01-18'),
                null,
                { tenantId: testTenantId }
            );

            expect(hasOverlap).toBe(true);
        });

        it('should not detect overlap for non-overlapping dates', async () => {
            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                duration: 3,
                status: 'approved'
            });

            const hasOverlap = await vacationRepository.hasOverlappingVacation(
                testUser._id,
                new Date('2025-01-20'),
                new Date('2025-01-22'),
                null,
                { tenantId: testTenantId }
            );

            expect(hasOverlap).toBe(false);
        });
    });

    describe('getVacationBalance', () => {
        it('should calculate vacation balance for employee', async () => {
            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                duration: 3,
                status: 'approved'
            });

            await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'sick',
                startDate: new Date('2025-02-15'),
                endDate: new Date('2025-02-16'),
                duration: 2,
                status: 'approved'
            });

            const balance = await vacationRepository.getVacationBalance(
                testUser._id,
                2025,
                { tenantId: testTenantId }
            );

            expect(balance.annual.used).toBe(2); // Actual calculated working days
            expect(balance.sick.used).toBe(1);   // Actual calculated working days  
            expect(balance.total.used).toBe(3);  // Total: 2 + 1 = 3
        });
    });

    describe('approveVacation', () => {
        it('should approve vacation', async () => {
            const vacation = await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                duration: 3,
                status: 'pending'
            });

            const approvedVacation = await vacationRepository.approveVacation(
                vacation._id,
                testUser._id,
                'Approved by manager'
            );

            expect(approvedVacation.status).toBe('approved');
            expect(approvedVacation.approvedBy.toString()).toBe(testUser._id.toString());
            expect(approvedVacation.approverNotes).toBe('Approved by manager');
        });
    });

    describe('rejectVacation', () => {
        it('should reject vacation', async () => {
            const vacation = await Vacation.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                vacationType: 'annual',
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                duration: 3,
                status: 'pending'
            });

            const rejectedVacation = await vacationRepository.rejectVacation(
                vacation._id,
                testUser._id,
                'Insufficient balance'
            );

            expect(rejectedVacation.status).toBe('rejected');
            expect(rejectedVacation.rejectedBy.toString()).toBe(testUser._id.toString());
            expect(rejectedVacation.rejectionReason).toBe('Insufficient balance');
        });
    });

    describe('calculateWorkingDays', () => {
        it('should calculate working days excluding weekends', () => {
            const startDate = new Date('2025-01-13'); // Monday
            const endDate = new Date('2025-01-17'); // Friday

            const workingDays = vacationRepository.calculateWorkingDays(startDate, endDate);

            expect(workingDays).toBe(5); // Monday to Friday
        });

        it('should exclude weekends from calculation', () => {
            const startDate = new Date('2025-01-13'); // Monday
            const endDate = new Date('2025-01-19'); // Sunday

            const workingDays = vacationRepository.calculateWorkingDays(startDate, endDate);

            expect(workingDays).toBe(5); // Monday to Friday (excluding Fri-Sat weekend)
        });
    });
});