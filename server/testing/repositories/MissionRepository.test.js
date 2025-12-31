import mongoose from 'mongoose';
import MissionRepository from '../../repositories/modules/MissionRepository.js';
import Mission from '../../modules/hr-core/missions/models/Mission.js';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/models/Department.js';

describe('MissionRepository', () => {
    let missionRepository;
    let testTenantId;
    let testUser;
    let testDepartment;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        missionRepository = new MissionRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        await Mission.deleteMany({ tenantId: testTenantId });
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
        await Mission.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
        await Department.deleteMany({ tenantId: testTenantId });
    });

    describe('findByEmployee', () => {
        it('should find missions by employee', async () => {
            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'approved'
            });

            const missions = await missionRepository.findByEmployee(testUser._id, {
                tenantId: testTenantId
            });

            expect(missions).toHaveLength(1);
            expect(missions[0].destination).toBe('Cairo');
        });
    });

    describe('findByStatus', () => {
        it('should find missions by status', async () => {
            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'pending'
            });

            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-20'),
                endDate: new Date('2025-01-22'),
                destination: 'Alexandria',
                purpose: 'Training',
                status: 'approved'
            });

            const pendingMissions = await missionRepository.findByStatus('pending', {
                tenantId: testTenantId
            });

            expect(pendingMissions).toHaveLength(1);
            expect(pendingMissions[0].status).toBe('pending');
        });
    });

    describe('findPendingMissions', () => {
        it('should find pending missions for approval', async () => {
            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'pending'
            });

            const pendingMissions = await missionRepository.findPendingMissions(
                testDepartment._id,
                { tenantId: testTenantId }
            );

            expect(pendingMissions).toHaveLength(1);
            expect(pendingMissions[0].status).toBe('pending');
        });
    });

    describe('findActiveMissions', () => {
        it('should find currently active missions', async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: yesterday,
                endDate: tomorrow,
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'approved'
            });

            const activeMissions = await missionRepository.findActiveMissions(
                null,
                { tenantId: testTenantId }
            );

            expect(activeMissions).toHaveLength(1);
            expect(activeMissions[0].status).toBe('approved');
        });
    });

    describe('findUpcomingMissions', () => {
        it('should find upcoming missions', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);

            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: futureDate,
                endDate: new Date(futureDate.getTime() + 2 * 24 * 60 * 60 * 1000),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'approved'
            });

            const upcomingMissions = await missionRepository.findUpcomingMissions(
                30,
                { tenantId: testTenantId }
            );

            expect(upcomingMissions).toHaveLength(1);
            expect(upcomingMissions[0].status).toBe('approved');
        });
    });

    describe('findByDepartment', () => {
        it('should find missions by department', async () => {
            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'approved'
            });

            const missions = await missionRepository.findByDepartment(testDepartment._id, {
                tenantId: testTenantId
            });

            expect(missions).toHaveLength(1);
            expect(missions[0].department._id.toString()).toBe(testDepartment._id.toString());
        });
    });

    describe('findByDestination', () => {
        it('should find missions by destination', async () => {
            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'approved'
            });

            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-20'),
                endDate: new Date('2025-01-22'),
                destination: 'Alexandria',
                purpose: 'Training',
                status: 'approved'
            });

            const cairoMissions = await missionRepository.findByDestination('Cairo', {
                tenantId: testTenantId
            });

            expect(cairoMissions).toHaveLength(1);
            expect(cairoMissions[0].destination).toBe('Cairo');
        });
    });

    describe('findByDateRange', () => {
        it('should find missions by date range', async () => {
            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'approved'
            });

            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-02-15'),
                endDate: new Date('2025-02-17'),
                destination: 'Alexandria',
                purpose: 'Training',
                status: 'approved'
            });

            const missions = await missionRepository.findByDateRange(
                new Date('2025-01-01'),
                new Date('2025-01-31'),
                { tenantId: testTenantId }
            );

            expect(missions).toHaveLength(1);
            expect(missions[0].destination).toBe('Cairo');
        });
    });

    describe('approveMission', () => {
        it('should approve mission', async () => {
            const mission = await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'pending'
            });

            const approvedMission = await missionRepository.approveMission(
                mission._id,
                testUser._id,
                'Approved by manager'
            );

            expect(approvedMission.status).toBe('approved');
            expect(approvedMission.approvedBy.toString()).toBe(testUser._id.toString());
            expect(approvedMission.notes).toBe('Approved by manager');
        });
    });

    describe('rejectMission', () => {
        it('should reject mission', async () => {
            const mission = await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'pending'
            });

            const rejectedMission = await missionRepository.rejectMission(
                mission._id,
                testUser._id,
                'Budget constraints'
            );

            expect(rejectedMission.status).toBe('rejected');
            expect(rejectedMission.approvedBy.toString()).toBe(testUser._id.toString());
            expect(rejectedMission.notes).toBe('Budget constraints');
        });
    });

    describe('completeMission', () => {
        it('should complete mission', async () => {
            const mission = await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'approved'
            });

            const completedMission = await missionRepository.completeMission(mission._id);

            expect(completedMission.status).toBe('completed');
        });
    });

    describe('calculateMissionDuration', () => {
        it('should calculate mission duration in days', () => {
            const startDate = new Date('2025-01-15');
            const endDate = new Date('2025-01-17');

            const duration = missionRepository.calculateMissionDuration(startDate, endDate);

            expect(duration).toBe(3); // 15th, 16th, 17th = 3 days
        });
    });

    describe('getPopularDestinations', () => {
        it('should get popular destinations', async () => {
            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-15'),
                endDate: new Date('2025-01-17'),
                destination: 'Cairo',
                purpose: 'Business meeting',
                status: 'approved'
            });

            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-20'),
                endDate: new Date('2025-01-22'),
                destination: 'Cairo',
                purpose: 'Training',
                status: 'approved'
            });

            await Mission.create({
                tenantId: testTenantId,
                employee: testUser._id,
                department: testDepartment._id,
                startDate: new Date('2025-01-25'),
                endDate: new Date('2025-01-27'),
                destination: 'Alexandria',
                purpose: 'Conference',
                status: 'approved'
            });

            const popularDestinations = await missionRepository.getPopularDestinations({
                tenantId: testTenantId
            });

            expect(popularDestinations).toHaveLength(2);
            expect(popularDestinations[0]._id).toBe('Cairo');
            expect(popularDestinations[0].count).toBe(2);
        });
    });
});