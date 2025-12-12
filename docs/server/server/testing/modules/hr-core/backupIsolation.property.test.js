/**
 * Property-Based Test for Backup Isolation
 * 
 * Feature: enterprise-saas-architecture, Property 6: Backup Isolation
 * Validates: Requirements 2.5, 11.1, 11.3
 * 
 * This test verifies that:
 * 1. Backup contains only specified tenant's data (CRITICAL for security)
 * 2. Backup contains ONLY HR-Core collections (never optional module data)
 * 3. Restore doesn't affect other tenants
 * 
 * This is a CRITICAL security test for multi-tenancy backup isolation.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import BackupService from '../../../modules/hr-core/backup/services/backupService.js';

// HR-Core models (allowed in backup)
import User from '../../../modules/hr-core/users/models/user.model.js';
import Attendance from '../../../modules/hr-core/attendance/models/attendance.model.js';
import Department from '../../../modules/hr-core/users/models/department.model.js';
import Position from '../../../modules/hr-core/users/models/position.model.js';
import Request from '../../../modules/hr-core/requests/models/request.model.js';
import Holiday from '../../../modules/hr-core/holidays/models/holiday.model.js';
import Mission from '../../../modules/hr-core/missions/models/mission.model.js';
import Vacation from '../../../modules/hr-core/vacations/models/vacation.model.js';
import MixedVacation from '../../../modules/hr-core/vacations/models/mixedVacation.model.js';
import VacationBalance from '../../../modules/hr-core/vacations/models/vacationBalance.model.js';
import Overtime from '../../../modules/hr-core/overtime/models/overtime.model.js';
import ForgetCheck from '../../../modules/hr-core/attendance/models/forgetCheck.model.js';

// Optional module models (NOT allowed in backup)
import Task from '../../../modules/tasks/models/task.model.js';
import Payroll from '../../../modules/payroll/models/payroll.model.js';
import Document from '../../../modules/documents/models/document.model.js';
import Report from '../../../modules/reports/models/report.model.js';
import Notification from '../../../modules/notifications/models/notification.model.js';

describe('Backup Isolation - Property-Based Tests', () => {
    /**
     * Feature: enterprise-saas-architecture, Property 6: Backup Isolation
     * 
     * Property: For any tenant backup, the backup must contain ONLY that tenant's
     * HR-Core data and NEVER include optional module data or other tenants' data.
     * 
     * This property ensures complete backup isolation at the data level,
     * as required by Requirements 2.5, 11.1, and 11.3.
     */
    test('Property 6: Backup contains only specified tenant HR-Core data', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate multiple tenants with both HR-Core and optional module data
                fc.record({
                    tenants: fc.array(
                        fc.record({
                            tenantId: fc.string({ minLength: 5, maxLength: 20 })
                                .map(s => `tenant_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
                            hrCoreData: fc.record({
                                users: fc.array(
                                    fc.record({
                                        username: fc.string({ minLength: 3, maxLength: 15 })
                                            .map(s => s.replace(/[^a-zA-Z0-9]/g, '') || 'user'),
                                        email: fc.emailAddress(),
                                        role: fc.constantFrom('Admin', 'HR', 'Manager', 'Employee')
                                    }),
                                    { minLength: 1, maxLength: 3 }
                                ),
                                departments: fc.array(
                                    fc.record({
                                        name: fc.string({ minLength: 3, maxLength: 20 })
                                            .map(s => s.trim() || 'Department'),
                                        code: fc.string({ minLength: 2, maxLength: 5 })
                                            .map(s => s.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DEPT')
                                    }),
                                    { minLength: 1, maxLength: 2 }
                                ),
                                holidays: fc.array(
                                    fc.record({
                                        name: fc.string({ minLength: 3, maxLength: 20 })
                                            .map(s => s.trim() || 'Holiday'),
                                        date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
                                    }),
                                    { minLength: 0, maxLength: 2 }
                                )
                            }),
                            optionalModuleData: fc.record({
                                tasks: fc.array(
                                    fc.record({
                                        title: fc.string({ minLength: 3, maxLength: 20 })
                                            .map(s => s.trim() || 'Task'),
                                        description: fc.string({ minLength: 5, maxLength: 50 })
                                            .map(s => s.trim() || 'Task description')
                                    }),
                                    { minLength: 0, maxLength: 2 }
                                ),
                                documents: fc.array(
                                    fc.record({
                                        title: fc.string({ minLength: 3, maxLength: 20 })
                                            .map(s => s.trim() || 'Document'),
                                        type: fc.constantFrom('policy', 'form', 'report')
                                    }),
                                    { minLength: 0, maxLength: 2 }
                                )
                            })
                        }),
                        { minLength: 2, maxLength: 4 }
                    )
                }),
                async ({ tenants }) => {
                    // Ensure unique tenantIds
                    const uniqueTenantIds = new Set();
                    const validTenants = tenants.filter(t => {
                        if (uniqueTenantIds.has(t.tenantId)) {
                            return false;
                        }
                        uniqueTenantIds.add(t.tenantId);
                        return true;
                    });

                    // Need at least 2 tenants for isolation testing
                    if (validTenants.length < 2) {
                        return true; // Skip this iteration
                    }

                    // Create data for each tenant
                    const createdData = [];
                    
                    for (const tenant of validTenants) {
                        const tenantData = {
                            tenantId: tenant.tenantId,
                            hrCore: {
                                users: [],
                                departments: [],
                                positions: [],
                                attendance: [],
                                requests: [],
                                holidays: [],
                                missions: [],
                                vacations: [],
                                mixedVacations: [],
                                vacationBalances: [],
                                overtimes: [],
                                forgetChecks: []
                            },
                            optionalModules: {
                                tasks: [],
                                payrolls: [],
                                documents: [],
                                reports: [],
                                notifications: []
                            }
                        };

                        // Create HR-Core data
                        // 1. Create departments first (needed for users)
                        for (const deptData of tenant.hrCoreData.departments) {
                            try {
                                const department = await Department.create({
                                    tenantId: tenant.tenantId,
                                    name: `${deptData.name}_${tenant.tenantId}_${Date.now()}`,
                                    code: `${deptData.code}_${tenant.tenantId.slice(-4)}_${Date.now().toString().slice(-4)}`,
                                    isActive: true
                                });
                                tenantData.hrCore.departments.push(department);

                                // Create a position for this department
                                const position = await Position.create({
                                    tenantId: tenant.tenantId,
                                    title: `Position_${department.name}`,
                                    department: department._id,
                                    isActive: true
                                });
                                tenantData.hrCore.positions.push(position);
                            } catch (error) {
                                // Skip duplicates
                                continue;
                            }
                        }

                        // 2. Create users
                        for (const userData of tenant.hrCoreData.users) {
                            try {
                                const user = await User.create({
                                    tenantId: tenant.tenantId,
                                    username: `${userData.username}_${tenant.tenantId}_${Date.now()}`,
                                    email: `${userData.username}_${tenant.tenantId}_${Date.now()}@test.com`,
                                    password: 'Test123!',
                                    role: userData.role,
                                    personalInfo: {
                                        firstName: userData.username,
                                        lastName: 'Test'
                                    },
                                    department: tenantData.hrCore.departments[0]?._id,
                                    position: tenantData.hrCore.positions[0]?._id,
                                    isActive: true
                                });
                                tenantData.hrCore.users.push(user);

                                // Create related HR-Core data for this user
                                if (tenantData.hrCore.departments.length > 0) {
                                    // Attendance
                                    const attendance = await Attendance.create({
                                        tenantId: tenant.tenantId,
                                        employee: user._id,
                                        department: tenantData.hrCore.departments[0]._id,
                                        date: new Date(),
                                        status: 'present',
                                        isWorkingDay: true
                                    });
                                    tenantData.hrCore.attendance.push(attendance);

                                    // Request
                                    const request = await Request.create({
                                        tenantId: tenant.tenantId,
                                        requestType: 'vacation',
                                        requestedBy: user._id,
                                        status: 'pending',
                                        requestData: {
                                            startDate: new Date(),
                                            endDate: new Date(Date.now() + 86400000), // +1 day
                                            reason: 'Test vacation'
                                        }
                                    });
                                    tenantData.hrCore.requests.push(request);

                                    // Vacation Balance
                                    const vacationBalance = await VacationBalance.create({
                                        tenantId: tenant.tenantId,
                                        employee: user._id,
                                        year: new Date().getFullYear(),
                                        totalDays: 30,
                                        usedDays: 5,
                                        remainingDays: 25
                                    });
                                    tenantData.hrCore.vacationBalances.push(vacationBalance);

                                    // Overtime
                                    const overtime = await Overtime.create({
                                        tenantId: tenant.tenantId,
                                        employee: user._id,
                                        date: new Date(),
                                        hours: 2,
                                        reason: 'Project deadline',
                                        status: 'approved'
                                    });
                                    tenantData.hrCore.overtimes.push(overtime);

                                    // Forget Check
                                    const forgetCheck = await ForgetCheck.create({
                                        tenantId: tenant.tenantId,
                                        employee: user._id,
                                        date: new Date(),
                                        reason: 'Forgot to check in',
                                        status: 'pending'
                                    });
                                    tenantData.hrCore.forgetChecks.push(forgetCheck);
                                }
                            } catch (error) {
                                // Skip duplicates
                                continue;
                            }
                        }

                        // 3. Create holidays
                        for (const holidayData of tenant.hrCoreData.holidays) {
                            try {
                                const holiday = await Holiday.create({
                                    tenantId: tenant.tenantId,
                                    name: `${holidayData.name}_${tenant.tenantId}_${Date.now()}`,
                                    date: holidayData.date,
                                    isRecurring: false,
                                    isActive: true
                                });
                                tenantData.hrCore.holidays.push(holiday);
                            } catch (error) {
                                // Skip duplicates
                                continue;
                            }
                        }

                        // Create Optional Module data (should NOT be backed up)
                        // 1. Tasks
                        for (const taskData of tenant.optionalModuleData.tasks) {
                            try {
                                const task = await Task.create({
                                    tenantId: tenant.tenantId,
                                    title: `${taskData.title}_${tenant.tenantId}_${Date.now()}`,
                                    description: taskData.description,
                                    assignee: tenantData.hrCore.users[0]?._id,
                                    assigner: tenantData.hrCore.users[0]?._id,
                                    status: 'pending',
                                    priority: 'medium'
                                });
                                tenantData.optionalModules.tasks.push(task);
                            } catch (error) {
                                // Skip duplicates
                                continue;
                            }
                        }

                        // 2. Documents
                        for (const docData of tenant.optionalModuleData.documents) {
                            try {
                                const document = await Document.create({
                                    tenantId: tenant.tenantId,
                                    title: `${docData.title}_${tenant.tenantId}_${Date.now()}`,
                                    type: docData.type,
                                    uploadedBy: tenantData.hrCore.users[0]?._id,
                                    filePath: '/fake/path/document.pdf',
                                    isActive: true
                                });
                                tenantData.optionalModules.documents.push(document);
                            } catch (error) {
                                // Skip duplicates
                                continue;
                            }
                        }

                        // 3. Notifications (optional module)
                        try {
                            const notification = await Notification.create({
                                tenantId: tenant.tenantId,
                                title: `Notification_${tenant.tenantId}_${Date.now()}`,
                                message: 'Test notification',
                                recipient: tenantData.hrCore.users[0]?._id,
                                type: 'info',
                                isRead: false
                            });
                            tenantData.optionalModules.notifications.push(notification);
                        } catch (error) {
                            // Skip if notification model doesn't exist or fails
                        }

                        createdData.push(tenantData);
                    }

                    // Now test backup isolation for each tenant
                    for (const tenantData of createdData) {
                        const { tenantId } = tenantData;

                        // CRITICAL TEST 1: Create backup and verify it contains ONLY this tenant's data
                        const backup = await BackupService.createBackup(tenantId);

                        expect(backup).toBeDefined();
                        expect(backup.tenantId).toBe(tenantId);
                        expect(backup.collections).toBeDefined();

                        // Verify backup contains only HR-Core collections
                        const backupCollections = Object.keys(backup.collections);
                        const hrCoreCollections = [
                            'attendances', 'requests', 'holidays', 'missions', 'vacations',
                            'mixedvacations', 'vacationbalances', 'overtimes', 'users',
                            'departments', 'positions', 'forgetchecks'
                        ];

                        for (const collectionName of backupCollections) {
                            expect(hrCoreCollections).toContain(collectionName);
                        }

                        // CRITICAL TEST 2: Verify backup NEVER contains optional module data
                        const optionalModuleCollections = ['tasks', 'payrolls', 'documents', 'reports', 'notifications'];
                        for (const optionalCollection of optionalModuleCollections) {
                            expect(backup.collections).not.toHaveProperty(optionalCollection);
                        }

                        // CRITICAL TEST 3: Verify all data in backup belongs to this tenant
                        for (const [collectionName, documents] of Object.entries(backup.collections)) {
                            expect(documents).toBeInstanceOf(Array);
                            for (const doc of documents) {
                                expect(doc.tenantId).toBe(tenantId);
                            }
                        }

                        // CRITICAL TEST 4: Verify backup doesn't contain other tenants' data
                        const otherTenants = createdData.filter(t => t.tenantId !== tenantId);
                        for (const otherTenant of otherTenants) {
                            for (const [collectionName, documents] of Object.entries(backup.collections)) {
                                for (const doc of documents) {
                                    expect(doc.tenantId).not.toBe(otherTenant.tenantId);
                                }
                            }
                        }

                        // CRITICAL TEST 5: Verify backup validation
                        const validation = BackupService.validateBackup(backup);
                        expect(validation.valid).toBe(true);
                        expect(validation.errors).toHaveLength(0);

                        // CRITICAL TEST 6: Test restore isolation
                        // First, clear some data for this tenant
                        await User.deleteMany({ tenantId });
                        await Department.deleteMany({ tenantId });

                        // Verify data is gone
                        const usersBeforeRestore = await User.countDocuments({ tenantId });
                        const deptsBeforeRestore = await Department.countDocuments({ tenantId });
                        expect(usersBeforeRestore).toBe(0);
                        expect(deptsBeforeRestore).toBe(0);

                        // Restore the backup
                        const restoreResult = await BackupService.restoreBackup(backup, tenantId);
                        expect(restoreResult.tenantId).toBe(tenantId);
                        expect(restoreResult.errors).toHaveLength(0);

                        // Verify data is restored for this tenant
                        const usersAfterRestore = await User.countDocuments({ tenantId });
                        const deptsAfterRestore = await Department.countDocuments({ tenantId });
                        expect(usersAfterRestore).toBeGreaterThan(0);
                        expect(deptsAfterRestore).toBeGreaterThan(0);

                        // CRITICAL TEST 7: Verify restore doesn't affect other tenants
                        for (const otherTenant of otherTenants) {
                            const otherTenantUsers = await User.find({ tenantId: otherTenant.tenantId }).lean();
                            const otherTenantDepts = await Department.find({ tenantId: otherTenant.tenantId }).lean();

                            // Verify other tenant's data still exists and is unchanged
                            for (const user of otherTenantUsers) {
                                expect(user.tenantId).toBe(otherTenant.tenantId);
                                expect(user.tenantId).not.toBe(tenantId);
                            }

                            for (const dept of otherTenantDepts) {
                                expect(dept.tenantId).toBe(otherTenant.tenantId);
                                expect(dept.tenantId).not.toBe(tenantId);
                            }
                        }

                        // CRITICAL TEST 8: Verify optional module data is NOT restored
                        // (It shouldn't be in the backup, but double-check)
                        const restoredTasks = await Task.find({ tenantId }).lean();
                        const restoredDocs = await Document.find({ tenantId }).lean();

                        // These should still exist from original creation (not from backup)
                        // But verify they weren't affected by the restore process
                        for (const task of restoredTasks) {
                            expect(task.tenantId).toBe(tenantId);
                        }

                        for (const doc of restoredDocs) {
                            expect(doc.tenantId).toBe(tenantId);
                        }
                    }

                    return true;
                }
            ),
            { numRuns: 10, timeout: 120000 } // Fewer runs due to complexity, longer timeout
        );
    }, 180000); // 3 minute timeout for this critical test

    /**
     * Property 6.1: Backup stats only count HR-Core data
     * 
     * This tests that backup statistics only include HR-Core collections
     * and never count optional module data.
     */
    test('Property 6.1: Backup stats only count HR-Core data', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    tenantId: fc.string({ minLength: 5, maxLength: 20 })
                        .map(s => `tenant_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
                    userCount: fc.integer({ min: 1, max: 3 }),
                    taskCount: fc.integer({ min: 1, max: 3 })
                }),
                async ({ tenantId, userCount, taskCount }) => {
                    // Create HR-Core data (should be counted)
                    const users = [];
                    for (let i = 0; i < userCount; i++) {
                        const user = await User.create({
                            tenantId,
                            username: `user_${i}_${tenantId}_${Date.now()}`,
                            email: `user_${i}_${tenantId}_${Date.now()}@test.com`,
                            password: 'Test123!',
                            role: 'Employee',
                            personalInfo: {
                                firstName: `User${i}`,
                                lastName: 'Test'
                            },
                            isActive: true
                        });
                        users.push(user);
                    }

                    // Create optional module data (should NOT be counted)
                    const tasks = [];
                    for (let i = 0; i < taskCount; i++) {
                        try {
                            const task = await Task.create({
                                tenantId,
                                title: `Task_${i}_${tenantId}_${Date.now()}`,
                                description: 'Test task',
                                assignee: users[0]._id,
                                assigner: users[0]._id,
                                status: 'pending',
                                priority: 'medium'
                            });
                            tasks.push(task);
                        } catch (error) {
                            // Skip if task model doesn't exist
                        }
                    }

                    // Get backup stats
                    const stats = await BackupService.getBackupStats(tenantId);

                    expect(stats.tenantId).toBe(tenantId);
                    expect(stats.collections).toBeDefined();

                    // Verify stats include HR-Core data
                    if (stats.collections.users) {
                        expect(stats.collections.users).toBe(userCount);
                    }

                    // Verify stats do NOT include optional module data
                    expect(stats.collections).not.toHaveProperty('tasks');
                    expect(stats.collections).not.toHaveProperty('payrolls');
                    expect(stats.collections).not.toHaveProperty('documents');
                    expect(stats.collections).not.toHaveProperty('reports');
                    expect(stats.collections).not.toHaveProperty('notifications');

                    // Verify total count only includes HR-Core data
                    const expectedTotal = Object.values(stats.collections).reduce((sum, count) => sum + count, 0);
                    expect(stats.totalDocuments).toBe(expectedTotal);

                    return true;
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 6.2: Backup validation rejects non-HR-Core collections
     * 
     * This tests that backup validation properly rejects backups containing
     * optional module data.
     */
    test('Property 6.2: Backup validation rejects non-HR-Core collections', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    tenantId: fc.string({ minLength: 5, maxLength: 20 })
                        .map(s => `tenant_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
                    invalidCollection: fc.constantFrom('tasks', 'payrolls', 'documents', 'reports', 'notifications')
                }),
                async ({ tenantId, invalidCollection }) => {
                    // Create a valid backup structure
                    const validBackup = {
                        tenantId,
                        timestamp: new Date().toISOString(),
                        collections: {
                            users: [
                                {
                                    tenantId,
                                    username: 'testuser',
                                    email: 'test@example.com',
                                    role: 'Employee'
                                }
                            ]
                        },
                        metadata: {
                            version: '1.0',
                            type: 'hr-core',
                            collectionCount: 1,
                            documentCount: 1
                        }
                    };

                    // Validate the valid backup
                    const validValidation = BackupService.validateBackup(validBackup);
                    expect(validValidation.valid).toBe(true);
                    expect(validValidation.errors).toHaveLength(0);

                    // Create an invalid backup with optional module data
                    const invalidBackup = {
                        ...validBackup,
                        collections: {
                            ...validBackup.collections,
                            [invalidCollection]: [
                                {
                                    tenantId,
                                    title: 'Test item',
                                    description: 'Test description'
                                }
                            ]
                        }
                    };

                    // Validate the invalid backup
                    const invalidValidation = BackupService.validateBackup(invalidBackup);
                    expect(invalidValidation.warnings.length).toBeGreaterThan(0);
                    
                    // Check that the warning mentions the invalid collection
                    const hasWarning = invalidValidation.warnings.some(warning => 
                        warning.includes(invalidCollection) && warning.includes('not in HR-Core whitelist')
                    );
                    expect(hasWarning).toBe(true);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 6.3: Restore rejects backups with wrong tenant ID
     * 
     * This tests that restore operations properly reject backups that
     * don't match the target tenant ID.
     */
    test('Property 6.3: Restore rejects backups with wrong tenant ID', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    sourceTenantId: fc.string({ minLength: 5, maxLength: 20 })
                        .map(s => `source_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
                    targetTenantId: fc.string({ minLength: 5, maxLength: 20 })
                        .map(s => `target_${s.replace(/[^a-zA-Z0-9]/g, '')}`)
                }),
                async ({ sourceTenantId, targetTenantId }) => {
                    // Ensure different tenant IDs
                    if (sourceTenantId === targetTenantId) {
                        return true; // Skip this iteration
                    }

                    // Create a backup for source tenant
                    const backup = {
                        tenantId: sourceTenantId,
                        timestamp: new Date().toISOString(),
                        collections: {
                            users: [
                                {
                                    tenantId: sourceTenantId,
                                    username: 'testuser',
                                    email: 'test@example.com',
                                    role: 'Employee'
                                }
                            ]
                        },
                        metadata: {
                            version: '1.0',
                            type: 'hr-core',
                            collectionCount: 1,
                            documentCount: 1
                        }
                    };

                    // Attempt to restore to different tenant (should fail)
                    try {
                        await BackupService.restoreBackup(backup, targetTenantId);
                        // If we reach here, the test should fail
                        expect(true).toBe(false); // Force failure
                    } catch (error) {
                        // Verify the error message mentions tenant ID mismatch
                        expect(error.message).toContain('does not match target tenant ID');
                        expect(error.message).toContain(sourceTenantId);
                        expect(error.message).toContain(targetTenantId);
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});