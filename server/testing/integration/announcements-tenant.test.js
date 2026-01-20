import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import { registerHRModels } from '../../utils/tenantModelRegistry.js';

describe('Announcements Multi-Tenant Integration', () => {
    let tenantConnection1, tenantConnection2;
    let TenantAnnouncement1, TenantAnnouncement2;
    let authToken;
    let testUser;

    beforeAll(async () => {
        // Create tenant connections
        tenantConnection1 = mongoose.createConnection(process.env.TEST_MONGODB_URI + '_tenant1');
        tenantConnection2 = mongoose.createConnection(process.env.TEST_MONGODB_URI + '_tenant2');

        // Register models for each tenant
        const models1 = await registerHRModels(tenantConnection1);
        const models2 = await registerHRModels(tenantConnection2);

        TenantAnnouncement1 = models1.Announcement;
        TenantAnnouncement2 = models2.Announcement;

        // Create test user and get auth token
        // This would typically be done through your auth system
        testUser = {
            id: new mongoose.Types.ObjectId(),
            tenantId: 'tenant1',
            role: 'hr',
            department: new mongoose.Types.ObjectId()
        };

        // Mock auth token - replace with actual auth logic
        authToken = 'mock-jwt-token';
    });

    afterAll(async () => {
        await tenantConnection1.close();
        await tenantConnection2.close();
    });

    beforeEach(async () => {
        // Clean up test data
        await TenantAnnouncement1.deleteMany({});
        await TenantAnnouncement2.deleteMany({});
    });

    describe('Tenant Isolation', () => {
        it('should create announcements with correct tenantId', async () => {
            const announcementData = {
                title: 'Test Announcement',
                content: 'This is a test announcement for tenant1',
                type: 'general',
                priority: 'medium',
                targetAudience: 'all'
            };

            // Create announcement for tenant1
            const announcement1 = await TenantAnnouncement1.create({
                ...announcementData,
                tenantId: 'tenant1',
                createdBy: testUser.id
            });

            // Create announcement for tenant2
            const announcement2 = await TenantAnnouncement2.create({
                ...announcementData,
                title: 'Test Announcement Tenant 2',
                tenantId: 'tenant2',
                createdBy: testUser.id
            });

            expect(announcement1.tenantId).toBe('tenant1');
            expect(announcement2.tenantId).toBe('tenant2');
        });

        it('should only return announcements for the correct tenant', async () => {
            // Create announcements for both tenants
            await TenantAnnouncement1.create({
                title: 'Tenant 1 Announcement',
                content: 'Content for tenant 1',
                tenantId: 'tenant1',
                createdBy: testUser.id,
                type: 'general'
            });

            await TenantAnnouncement2.create({
                title: 'Tenant 2 Announcement',
                content: 'Content for tenant 2',
                tenantId: 'tenant2',
                createdBy: testUser.id,
                type: 'general'
            });

            // Query tenant1 announcements
            const tenant1Announcements = await TenantAnnouncement1.find({ tenantId: 'tenant1' });
            const tenant2Announcements = await TenantAnnouncement2.find({ tenantId: 'tenant2' });

            expect(tenant1Announcements).toHaveLength(1);
            expect(tenant2Announcements).toHaveLength(1);
            expect(tenant1Announcements[0].title).toBe('Tenant 1 Announcement');
            expect(tenant2Announcements[0].title).toBe('Tenant 2 Announcement');
        });

        it('should validate required tenantId field', async () => {
            const announcementData = {
                title: 'Test Announcement',
                content: 'This is a test announcement',
                type: 'general',
                createdBy: testUser.id
                // Missing tenantId
            };

            await expect(TenantAnnouncement1.create(announcementData))
                .rejects
                .toThrow(/tenantId.*required/);
        });
    });

    describe('Active Announcements by Tenant', () => {
        it('should return only active announcements for the tenant', async () => {
            const now = new Date();
            const future = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

            // Create active announcement for tenant1
            await TenantAnnouncement1.create({
                title: 'Active Announcement',
                content: 'This is active',
                tenantId: 'tenant1',
                createdBy: testUser.id,
                type: 'general',
                isActive: true,
                startDate: now,
                endDate: future
            });

            // Create inactive announcement for tenant1
            await TenantAnnouncement1.create({
                title: 'Inactive Announcement',
                content: 'This is inactive',
                tenantId: 'tenant1',
                createdBy: testUser.id,
                type: 'general',
                isActive: false
            });

            // Create active announcement for tenant2
            await TenantAnnouncement2.create({
                title: 'Tenant 2 Active',
                content: 'This is active for tenant 2',
                tenantId: 'tenant2',
                createdBy: testUser.id,
                type: 'general',
                isActive: true
            });

            // Query active announcements for tenant1
            const activeAnnouncements = await TenantAnnouncement1.find({
                tenantId: 'tenant1',
                isActive: true
            });

            expect(activeAnnouncements).toHaveLength(1);
            expect(activeAnnouncements[0].title).toBe('Active Announcement');
        });
    });

    describe('Target Audience Filtering by Tenant', () => {
        it('should filter announcements by target audience within tenant', async () => {
            const departmentId = new mongoose.Types.ObjectId();

            // Create announcements with different target audiences
            await TenantAnnouncement1.create({
                title: 'All Employees',
                content: 'For everyone',
                tenantId: 'tenant1',
                createdBy: testUser.id,
                type: 'general',
                targetAudience: 'all'
            });

            await TenantAnnouncement1.create({
                title: 'Department Specific',
                content: 'For specific department',
                tenantId: 'tenant1',
                createdBy: testUser.id,
                type: 'general',
                targetAudience: 'department',
                departments: [departmentId]
            });

            // Query all announcements for tenant1
            const allAnnouncements = await TenantAnnouncement1.find({
                tenantId: 'tenant1',
                targetAudience: 'all'
            });

            const departmentAnnouncements = await TenantAnnouncement1.find({
                tenantId: 'tenant1',
                targetAudience: 'department',
                departments: departmentId
            });

            expect(allAnnouncements).toHaveLength(1);
            expect(departmentAnnouncements).toHaveLength(1);
            expect(allAnnouncements[0].title).toBe('All Employees');
            expect(departmentAnnouncements[0].title).toBe('Department Specific');
        });
    });
});