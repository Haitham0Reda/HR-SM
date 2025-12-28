import mongoose from 'mongoose';
import OvertimeRepository from '../../repositories/modules/OvertimeRepository.js';
import Overtime from '../../modules/hr-core/overtime/models/overtime.model.js';
import User from '../../modules/hr-core/models/User.js';
import Department from '../../modules/hr-core/models/Department.js';

describe('OvertimeRepository', () => {
    let overtimeRepository;
    let testTenantId;
    let testUser;
    let testDepartment;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        overtimeRepository = new OvertimeRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        await Overtime.deleteMany({ tenantId: testTenantId });
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
        await Overtime.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });
    });

    describe('findByEmployee', () => {
        it('should find overtime records by employee', async () => {
            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                reason: 'Project deadline',
                compensationType: 'paid',
                status: 'approved'
            });

            const overtimeRecords = await overtimeRepository.findByEmployee(testUser._id, {
                tenantId: testTenantId
            });

            expect(overtimeRecords).toHaveLength(1);
            expect(overtimeRecords[0].duration).toBe(2);
        });
    });

    describe('findByStatus', () => {
        it('should find overtime records by status', async () => {
            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'pending'
            });

            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-16'),
                startTime: '18:00',
                endTime: '21:00',
                duration: 3,
                compensationType: 'paid',
                status: 'approved'
            });

            const pendingOvertime = await overtimeRepository.findByStatus('pending', {
                tenantId: testTenantId
            });

            expect(pendingOvertime).toHaveLength(1);
            expect(pendingOvertime[0].status).toBe('pending');
        });
    });

    describe('findPendingOvertime', () => {
        it('should find pending overtime for approval', async () => {
            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'pending'
            });

            const pendingOvertime = await overtimeRepository.findPendingOvertime(
                testDepartment._id,
                { tenantId: testTenantId }
            );

            expect(pendingOvertime).toHaveLength(1);
            expect(pendingOvertime[0].status).toBe('pending');
        });
    });

    describe('findByDepartment', () => {
        it('should find overtime records by department', async () => {
            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'approved'
            });

            const overtimeRecords = await overtimeRepository.findByDepartment(testDepartment._id, {
                tenantId: testTenantId
            });

            expect(overtimeRecords).toHaveLength(1);
            expect(overtimeRecords[0].department.toString()).toBe(testDepartment._id.toString());
        });
    });

    describe('findByCompensationType', () => {
        it('should find overtime records by compensation type', async () => {
            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'approved'
            });

            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-16'),
                startTime: '18:00',
                endTime: '21:00',
                duration: 3,
                compensationType: 'time-off',
                status: 'approved'
            });

            const paidOvertime = await overtimeRepository.findByCompensationType('paid', {
                tenantId: testTenantId
            });

            expect(paidOvertime).toHaveLength(1);
            expect(paidOvertime[0].compensationType).toBe('paid');
        });
    });

    describe('findUncompensatedOvertime', () => {
        it('should find uncompensated overtime', async () => {
            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'approved',
                compensated: false
            });

            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-16'),
                startTime: '18:00',
                endTime: '21:00',
                duration: 3,
                compensationType: 'paid',
                status: 'approved',
                compensated: true
            });

            const uncompensatedOvertime = await overtimeRepository.findUncompensatedOvertime({
                tenantId: testTenantId
            });

            expect(uncompensatedOvertime).toHaveLength(1);
            expect(uncompensatedOvertime[0].compensated).toBe(false);
        });
    });

    describe('findByDateRange', () => {
        it('should find overtime by date range', async () => {
            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'approved'
            });

            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-02-15'),
                startTime: '18:00',
                endTime: '21:00',
                duration: 3,
                compensationType: 'paid',
                status: 'approved'
            });

            const overtimeRecords = await overtimeRepository.findByDateRange(
                testUser._id,
                new Date('2025-01-01'),
                new Date('2025-01-31'),
                { tenantId: testTenantId }
            );

            expect(overtimeRecords).toHaveLength(1);
            expect(overtimeRecords[0].duration).toBe(2);
        });
    });

    describe('approveOvertime', () => {
        it('should approve overtime', async () => {
            const overtime = await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'pending'
            });

            const approvedOvertime = await overtimeRepository.approveOvertime(
                overtime._id,
                testUser._id,
                'Approved by manager'
            );

            expect(approvedOvertime.status).toBe('approved');
            expect(approvedOvertime.approvedBy.toString()).toBe(testUser._id.toString());
            expect(approvedOvertime.approverNotes).toBe('Approved by manager');
        });
    });

    describe('rejectOvertime', () => {
        it('should reject overtime', async () => {
            const overtime = await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'pending'
            });

            const rejectedOvertime = await overtimeRepository.rejectOvertime(
                overtime._id,
                testUser._id,
                'Not authorized'
            );

            expect(rejectedOvertime.status).toBe('rejected');
            expect(rejectedOvertime.rejectedBy.toString()).toBe(testUser._id.toString());
            expect(rejectedOvertime.rejectionReason).toBe('Not authorized');
        });
    });

    describe('markCompensated', () => {
        it('should mark overtime as compensated', async () => {
            const overtime = await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'approved',
                compensated: false
            });

            const compensatedOvertime = await overtimeRepository.markCompensated(overtime._id);

            expect(compensatedOvertime.compensated).toBe(true);
            expect(compensatedOvertime.compensatedAt).toBeTruthy();
        });
    });

    describe('calculateOvertimeDuration', () => {
        it('should calculate overtime duration correctly', () => {
            const duration = overtimeRepository.calculateOvertimeDuration('18:00', '20:30');
            expect(duration).toBe(2.5);
        });

        it('should handle different time formats', () => {
            const duration = overtimeRepository.calculateOvertimeDuration('09:15', '12:45');
            expect(duration).toBe(3.5);
        });
    });

    describe('getEmployeeOvertimeSummary', () => {
        it('should get employee overtime summary', async () => {
            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-15'),
                startTime: '18:00',
                endTime: '20:00',
                duration: 2,
                compensationType: 'paid',
                status: 'approved',
                compensated: false
            });

            await Overtime.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                date: new Date('2025-01-16'),
                startTime: '18:00',
                endTime: '21:00',
                duration: 3,
                compensationType: 'paid',
                status: 'pending',
                compensated: false
            });

            const summary = await overtimeRepository.getEmployeeOvertimeSummary(testUser._id, {
                tenantId: testTenantId
            });

            expect(summary.totalRequests).toBe(2);
            expect(summary.approvedRequests).toBe(1);
            expect(summary.pendingRequests).toBe(1);
            expect(summary.totalHours).toBe(5);
            expect(summary.approvedHours).toBe(2);
            expect(summary.uncompensatedHours).toBe(2);
        });
    });
});