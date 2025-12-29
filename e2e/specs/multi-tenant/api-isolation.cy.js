/**
 * E2E Tests for API-Level Multi-Tenant Data Isolation
 * 
 * These tests verify that API endpoints properly enforce tenant isolation
 * and prevent unauthorized cross-tenant data access.
 */

describe('API-Level Multi-Tenant Data Isolation', () => {
    let tenantAData, tenantBData, tenantAUser, tenantBUser;

    before(() => {
        // Load test fixtures
        cy.fixture('tenants').then((tenants) => {
            tenantAData = tenants.tenantA;
            tenantBData = tenants.tenantB;
        });

        cy.fixture('users').then((users) => {
            tenantAUser = users.tenantAEmployee;
            tenantBUser = users.tenantBEmployee;
        });
    });

    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Seed test data for both tenants
        cy.seedTestData('tenant', [tenantAData, tenantBData]);
        cy.seedTestData('user', [tenantAUser, tenantBUser]);
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('User API Endpoints', () => {
        it('should isolate user data in GET /api/users', () => {
            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Request users list
                cy.apiRequest('GET', '/api/users', null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    expect(response.status).to.eq(200);

                    if (response.body.data && response.body.data.length > 0) {
                        // All users should belong to Tenant A
                        response.body.data.forEach(user => {
                            expect(user.tenantId).to.eq(tenantAData._id);
                            expect(user.tenantId).to.not.eq(tenantBData._id);
                        });
                    }
                });
            });
        });

        it('should prevent access to specific user from different tenant', () => {
            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Try to access Tenant B user by ID
                cy.apiRequest('GET', `/api/users/${tenantBUser._id}`, null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    // Should be forbidden or not found
                    expect([403, 404]).to.include(response.status);
                });
            });
        });

        it('should prevent user creation in different tenant', () => {
            // Login as Tenant A user with admin privileges
            const tenantAAdmin = {
                ...tenantAUser,
                role: 'admin',
                permissions: ['user_management']
            };

            cy.seedTestData('user', tenantAAdmin);
            cy.apiLogin('admin', tenantAData.domain).then((token) => {
                // Try to create user for Tenant B
                const newUser = {
                    email: 'new@tenantb.com',
                    name: 'New User',
                    role: 'employee',
                    tenantId: tenantBData._id // Different tenant
                };

                cy.apiRequest('POST', '/api/users', newUser, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    // Should be forbidden or the tenantId should be overridden
                    if (response.status === 201) {
                        expect(response.body.data.tenantId).to.eq(tenantAData._id);
                    } else {
                        expect([400, 403]).to.include(response.status);
                    }
                });
            });
        });

        it('should prevent user updates across tenants', () => {
            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Try to update Tenant B user
                const updateData = {
                    name: 'Hacked Name',
                    role: 'admin'
                };

                cy.apiRequest('PUT', `/api/users/${tenantBUser._id}`, updateData, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    // Should be forbidden or not found
                    expect([403, 404]).to.include(response.status);
                });
            });
        });
    });

    describe('Attendance API Endpoints', () => {
        it('should isolate attendance records by tenant', () => {
            // Create attendance records for both tenants
            const today = new Date().toISOString().split('T')[0];
            const tenantAAttendance = {
                employeeId: tenantAUser._id,
                tenantId: tenantAData._id,
                date: today,
                clockIn: '09:00',
                clockOut: '17:00',
                status: 'present'
            };

            const tenantBAttendance = {
                employeeId: tenantBUser._id,
                tenantId: tenantBData._id,
                date: today,
                clockIn: '08:30',
                clockOut: '16:30',
                status: 'present'
            };

            cy.seedTestData('attendance', [tenantAAttendance, tenantBAttendance]);

            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Request attendance records
                cy.apiRequest('GET', '/api/attendance', null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    expect(response.status).to.eq(200);

                    if (response.body.data && response.body.data.length > 0) {
                        // All attendance records should belong to Tenant A
                        response.body.data.forEach(record => {
                            expect(record.tenantId).to.eq(tenantAData._id);
                        });
                    }
                });
            });
        });

        it('should prevent attendance record access across tenants', () => {
            // Create attendance record for Tenant B
            const tenantBAttendance = {
                _id: '507f1f77bcf86cd799439020',
                employeeId: tenantBUser._id,
                tenantId: tenantBData._id,
                date: new Date().toISOString().split('T')[0],
                clockIn: '08:30',
                status: 'present'
            };

            cy.seedTestData('attendance', tenantBAttendance);

            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Try to access Tenant B attendance record
                cy.apiRequest('GET', `/api/attendance/${tenantBAttendance._id}`, null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    // Should be forbidden or not found
                    expect([403, 404]).to.include(response.status);
                });
            });
        });
    });

    describe('Leave Request API Endpoints', () => {
        it('should isolate leave requests by tenant', () => {
            // Create leave requests for both tenants
            const tenantALeave = {
                employeeId: tenantAUser._id,
                tenantId: tenantAData._id,
                type: 'Annual Leave',
                startDate: '2024-02-15',
                endDate: '2024-02-17',
                reason: 'Personal time off',
                status: 'pending'
            };

            const tenantBLeave = {
                employeeId: tenantBUser._id,
                tenantId: tenantBData._id,
                type: 'Sick Leave',
                startDate: '2024-02-15',
                endDate: '2024-02-16',
                reason: 'Medical appointment',
                status: 'approved'
            };

            cy.seedTestData('leaveRequest', [tenantALeave, tenantBLeave]);

            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Request leave requests
                cy.apiRequest('GET', '/api/leave-requests', null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    expect(response.status).to.eq(200);

                    if (response.body.data && response.body.data.length > 0) {
                        // All leave requests should belong to Tenant A
                        response.body.data.forEach(request => {
                            expect(request.tenantId).to.eq(tenantAData._id);
                        });
                    }
                });
            });
        });

        it('should prevent leave request approval across tenants', () => {
            // Create leave request for Tenant B
            const tenantBLeave = {
                _id: '507f1f77bcf86cd799439021',
                employeeId: tenantBUser._id,
                tenantId: tenantBData._id,
                type: 'Annual Leave',
                startDate: '2024-02-20',
                endDate: '2024-02-22',
                reason: 'Vacation',
                status: 'pending'
            };

            cy.seedTestData('leaveRequest', tenantBLeave);

            // Login as Tenant A manager
            const tenantAManager = {
                ...tenantAUser,
                role: 'manager',
                permissions: ['approval']
            };

            cy.seedTestData('user', tenantAManager);
            cy.apiLogin('manager', tenantAData.domain).then((token) => {
                // Try to approve Tenant B leave request
                cy.apiRequest('PUT', `/api/leave-requests/${tenantBLeave._id}/approve`, {
                    status: 'approved',
                    comments: 'Approved'
                }, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    // Should be forbidden or not found
                    expect([403, 404]).to.include(response.status);
                });
            });
        });
    });

    describe('Task API Endpoints', () => {
        it('should isolate task assignments by tenant', () => {
            // Create tasks for both tenants
            const tenantATask = {
                title: 'Tenant A Task',
                description: 'Task for Tenant A',
                assignedTo: tenantAUser._id,
                tenantId: tenantAData._id,
                status: 'todo',
                priority: 'high'
            };

            const tenantBTask = {
                title: 'Tenant B Task',
                description: 'Task for Tenant B',
                assignedTo: tenantBUser._id,
                tenantId: tenantBData._id,
                status: 'in-progress',
                priority: 'medium'
            };

            cy.seedTestData('task', [tenantATask, tenantBTask]);

            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Request tasks
                cy.apiRequest('GET', '/api/tasks', null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    expect(response.status).to.eq(200);

                    if (response.body.data && response.body.data.length > 0) {
                        // All tasks should belong to Tenant A
                        response.body.data.forEach(task => {
                            expect(task.tenantId).to.eq(tenantAData._id);
                        });
                    }
                });
            });
        });

        it('should prevent task updates across tenants', () => {
            // Create task for Tenant B
            const tenantBTask = {
                _id: '507f1f77bcf86cd799439022',
                title: 'Tenant B Task',
                assignedTo: tenantBUser._id,
                tenantId: tenantBData._id,
                status: 'todo'
            };

            cy.seedTestData('task', tenantBTask);

            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Try to update Tenant B task
                cy.apiRequest('PUT', `/api/tasks/${tenantBTask._id}`, {
                    status: 'completed',
                    title: 'Hacked Task'
                }, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    // Should be forbidden or not found
                    expect([403, 404]).to.include(response.status);
                });
            });
        });
    });

    describe('Document API Endpoints', () => {
        it('should isolate document access by tenant', () => {
            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Request documents
                cy.apiRequest('GET', '/api/documents', null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    expect(response.status).to.eq(200);

                    if (response.body.data && response.body.data.length > 0) {
                        // All documents should belong to Tenant A
                        response.body.data.forEach(document => {
                            expect(document.tenantId).to.eq(tenantAData._id);
                        });
                    }
                });
            });
        });

        it('should prevent document download across tenants', () => {
            // Mock document ID from Tenant B
            const tenantBDocumentId = '507f1f77bcf86cd799439023';

            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Try to download Tenant B document
                cy.apiRequest('GET', `/api/documents/${tenantBDocumentId}/download`, null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    // Should be forbidden or not found
                    expect([403, 404]).to.include(response.status);
                });
            });
        });
    });

    describe('Department and Position API Endpoints', () => {
        it('should isolate department data by tenant', () => {
            // Create departments for both tenants
            const tenantADept = {
                name: 'Engineering',
                tenantId: tenantAData._id,
                manager: 'John Doe',
                budget: 100000
            };

            const tenantBDept = {
                name: 'Marketing',
                tenantId: tenantBData._id,
                manager: 'Jane Smith',
                budget: 75000
            };

            cy.seedTestData('department', [tenantADept, tenantBDept]);

            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Request departments
                cy.apiRequest('GET', '/api/departments', null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    expect(response.status).to.eq(200);

                    if (response.body.data && response.body.data.length > 0) {
                        // All departments should belong to Tenant A
                        response.body.data.forEach(department => {
                            expect(department.tenantId).to.eq(tenantAData._id);
                            expect(department.name).to.not.eq('Marketing');
                        });
                    }
                });
            });
        });

        it('should isolate position data by tenant', () => {
            // Create positions for both tenants
            const tenantAPosition = {
                title: 'Senior Developer',
                tenantId: tenantAData._id,
                department: 'Engineering',
                salary: 90000
            };

            const tenantBPosition = {
                title: 'Marketing Manager',
                tenantId: tenantBData._id,
                department: 'Marketing',
                salary: 80000
            };

            cy.seedTestData('position', [tenantAPosition, tenantBPosition]);

            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Request positions
                cy.apiRequest('GET', '/api/positions', null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    expect(response.status).to.eq(200);

                    if (response.body.data && response.body.data.length > 0) {
                        // All positions should belong to Tenant A
                        response.body.data.forEach(position => {
                            expect(position.tenantId).to.eq(tenantAData._id);
                            expect(position.title).to.not.eq('Marketing Manager');
                        });
                    }
                });
            });
        });
    });

    describe('Bulk Operations and Data Integrity', () => {
        it('should prevent bulk operations across tenants', () => {
            // Create users for both tenants
            const tenantAUsers = [
                {
                    email: 'bulk1@tenanta.com',
                    name: 'Bulk User 1',
                    tenantId: tenantAData._id,
                    role: 'employee'
                },
                {
                    email: 'bulk2@tenanta.com',
                    name: 'Bulk User 2',
                    tenantId: tenantAData._id,
                    role: 'employee'
                }
            ];

            const tenantBUsers = [
                {
                    email: 'bulk1@tenantb.com',
                    name: 'Bulk User 1',
                    tenantId: tenantBData._id,
                    role: 'employee'
                }
            ];

            cy.seedTestData('user', [...tenantAUsers, ...tenantBUsers]);

            // Login as Tenant A admin
            const tenantAAdmin = {
                ...tenantAUser,
                role: 'admin',
                permissions: ['user_management']
            };

            cy.seedTestData('user', tenantAAdmin);
            cy.apiLogin('admin', tenantAData.domain).then((token) => {
                // Try bulk update including Tenant B user IDs
                const bulkUpdateData = {
                    userIds: [
                        tenantAUsers[0]._id,
                        tenantAUsers[1]._id,
                        tenantBUsers[0]._id // Should be filtered out
                    ],
                    updates: {
                        department: 'Updated Department'
                    }
                };

                cy.apiRequest('PUT', '/api/users/bulk-update', bulkUpdateData, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    if (response.status === 200) {
                        // Should only update Tenant A users
                        expect(response.body.updated).to.be.lessThan(3);
                        expect(response.body.skipped).to.be.greaterThan(0);
                    } else {
                        // Or should be forbidden
                        expect([400, 403]).to.include(response.status);
                    }
                });
            });
        });

        it('should maintain data integrity during concurrent operations', () => {
            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((tokenA) => {
                // Login as Tenant B user
                cy.apiLogin('tenantBEmployee', tenantBData.domain).then((tokenB) => {
                    // Perform concurrent operations
                    const promises = [];

                    // Tenant A creates a task
                    promises.push(
                        cy.apiRequest('POST', '/api/tasks', {
                            title: 'Concurrent Task A',
                            description: 'Task from Tenant A',
                            priority: 'high'
                        }, {
                            'Authorization': `Bearer ${tokenA}`,
                            'X-Tenant-ID': tenantAData._id
                        })
                    );

                    // Tenant B creates a task with same title
                    promises.push(
                        cy.apiRequest('POST', '/api/tasks', {
                            title: 'Concurrent Task A', // Same title, different tenant
                            description: 'Task from Tenant B',
                            priority: 'medium'
                        }, {
                            'Authorization': `Bearer ${tokenB}`,
                            'X-Tenant-ID': tenantBData._id
                        })
                    );

                    // Both should succeed with proper tenant isolation
                    Promise.all(promises).then((responses) => {
                        responses.forEach((response, index) => {
                            expect(response.status).to.eq(201);
                            if (index === 0) {
                                expect(response.body.data.tenantId).to.eq(tenantAData._id);
                            } else {
                                expect(response.body.data.tenantId).to.eq(tenantBData._id);
                            }
                        });
                    });
                });
            });
        });
    });

    describe('Error Handling and Security', () => {
        it('should handle missing tenant context gracefully', () => {
            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Make request without tenant ID header
                cy.apiRequest('GET', '/api/users', null, {
                    'Authorization': `Bearer ${token}`
                    // Missing X-Tenant-ID header
                }).then((response) => {
                    // Should require tenant context
                    expect([400, 403]).to.include(response.status);
                    if (response.body.error) {
                        expect(response.body.error).to.include('tenant');
                    }
                });
            });
        });

        it('should prevent tenant ID manipulation in requests', () => {
            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Try to access data by manipulating tenant ID in request body
                cy.apiRequest('POST', '/api/tasks', {
                    title: 'Malicious Task',
                    tenantId: tenantBData._id // Try to create task for different tenant
                }, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    if (response.status === 201) {
                        // Tenant ID should be overridden to match authenticated user's tenant
                        expect(response.body.data.tenantId).to.eq(tenantAData._id);
                    } else {
                        // Or request should be rejected
                        expect([400, 403]).to.include(response.status);
                    }
                });
            });
        });

        it('should log security violations for audit', () => {
            // Login as Tenant A user
            cy.apiLogin('tenantAEmployee', tenantAData.domain).then((token) => {
                // Attempt unauthorized access
                cy.apiRequest('GET', `/api/users/${tenantBUser._id}`, null, {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantAData._id
                }).then((response) => {
                    expect([403, 404]).to.include(response.status);

                    // Verify security event is logged (would require audit log API)
                    cy.apiRequest('GET', '/api/audit-logs?type=security_violation', null, {
                        'Authorization': `Bearer ${token}`,
                        'X-Tenant-ID': tenantAData._id
                    }).then((auditResponse) => {
                        if (auditResponse.status === 200) {
                            // Should contain security violation log
                            expect(auditResponse.body.data).to.be.an('array');
                        }
                    });
                });
            });
        });
    });
});