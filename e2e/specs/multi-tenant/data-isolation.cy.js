/**
 * E2E Tests for Multi-Tenant Data Isolation
 * 
 * These tests verify that tenant data remains properly isolated and users
 * cannot access unauthorized data across tenants.
 */

describe('Multi-Tenant Data Isolation', () => {
    let tenantAData, tenantBData;

    before(() => {
        // Load test fixtures
        cy.fixture('tenants').then((tenants) => {
            tenantAData = tenants.tenantA;
            tenantBData = tenants.tenantB;
        });
    });

    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Seed test data for both tenants
        cy.seedTestData('tenant', [tenantAData, tenantBData]);
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    describe('User Data Isolation', () => {
        it('should prevent Tenant A users from accessing Tenant B user data via API', () => {
            // Create users for both tenants
            const tenantAUser = {
                email: 'user.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Tenant A User',
                role: 'employee',
                tenantId: tenantAData._id,
                department: 'Engineering'
            };

            const tenantBUser = {
                email: 'user.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Tenant B User',
                role: 'employee',
                tenantId: tenantBData._id,
                department: 'Marketing'
            };

            cy.seedTestData('user', [tenantAUser, tenantBUser]);

            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Try to access Tenant B user data via API
            cy.apiRequest('GET', `/api/users?tenantId=${tenantBData._id}`)
                .then((response) => {
                    // Should either return empty results or be forbidden
                    expect([200, 403, 404]).to.include(response.status);

                    if (response.status === 200) {
                        // If successful, should return empty array (no access to other tenant's data)
                        expect(response.body.data || response.body).to.be.empty;
                    }
                });

            // Try to access specific Tenant B user by ID
            cy.apiRequest('GET', `/api/users/${tenantBUser._id}`)
                .then((response) => {
                    // Should be forbidden or not found
                    expect([403, 404]).to.include(response.status);
                });

            // Verify Tenant A user can access their own tenant's data
            cy.apiRequest('GET', '/api/users')
                .then((response) => {
                    expect(response.status).to.eq(200);
                    expect(response.body.data).to.have.length.greaterThan(0);

                    // All returned users should belong to Tenant A
                    response.body.data.forEach(user => {
                        expect(user.tenantId).to.eq(tenantAData._id);
                    });
                });
        });

        it('should prevent Tenant A users from accessing Tenant B UI routes', () => {
            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Verify user is on Tenant A domain
            cy.url().should('include', `/${tenantAData.domain}`);

            // Try to access Tenant B routes directly
            cy.visit(`http://localhost:3000/${tenantBData.domain}/dashboard`, { failOnStatusCode: false });

            // Should be redirected to login or access denied
            cy.url().should('satisfy', (url) => {
                return url.includes('/login') ||
                    url.includes('/access-denied') ||
                    url.includes(`/${tenantAData.domain}`);
            });

            // Should not be able to see Tenant B dashboard
            cy.get('[data-cy="dashboard-content"]').should('not.exist');
        });

        it('should maintain proper tenant context during navigation', () => {
            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Navigate through different modules
            const modules = ['attendance', 'leave', 'tasks', 'documents'];

            modules.forEach(module => {
                cy.navigateToModule(module);

                // Verify URL maintains tenant context
                cy.url().should('include', `/${tenantAData.domain}/${module}`);

                // Verify tenant indicator shows correct tenant
                cy.get('[data-cy="tenant-indicator"]').should('contain.text', tenantAData.name);
            });
        });
    });

    describe('Employee Data Isolation', () => {
        it('should isolate employee records between tenants', () => {
            // Create employees for both tenants
            const tenantAEmployee = {
                email: 'emp.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Employee A',
                role: 'employee',
                tenantId: tenantAData._id,
                employeeId: 'EMP001',
                department: 'Engineering',
                position: 'Developer'
            };

            const tenantBEmployee = {
                email: 'emp.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Employee B',
                role: 'employee',
                tenantId: tenantBData._id,
                employeeId: 'EMP001', // Same employee ID but different tenant
                department: 'Marketing',
                position: 'Manager'
            };

            cy.seedTestData('user', [tenantAEmployee, tenantBEmployee]);

            // Login as HR user for Tenant A
            cy.loginAsTenantUser('hr', tenantAData.domain);
            cy.navigateToModule('employees');

            // Search for employee by ID
            cy.searchInTable('EMP001');

            // Should only find Tenant A employee
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Employee A');
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Engineering');
            cy.get('[data-cy="table-row"]').first().should('not.contain.text', 'Employee B');
            cy.get('[data-cy="table-row"]').first().should('not.contain.text', 'Marketing');
        });

        it('should isolate department and position data between tenants', () => {
            // Create departments for both tenants
            const tenantADept = {
                name: 'Engineering',
                tenantId: tenantAData._id,
                manager: 'John Doe',
                budget: 100000
            };

            const tenantBDept = {
                name: 'Engineering', // Same name but different tenant
                tenantId: tenantBData._id,
                manager: 'Jane Smith',
                budget: 150000
            };

            cy.seedTestData('department', [tenantADept, tenantBDept]);

            // Login as admin for Tenant A
            cy.loginAsTenantUser('admin', tenantAData.domain);
            cy.navigateToModule('departments');

            // Should only see Tenant A departments
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'John Doe');
            cy.get('[data-cy="table-row"]').first().should('not.contain.text', 'Jane Smith');
        });
    });

    describe('Attendance Data Isolation', () => {
        it('should isolate attendance records between tenants', () => {
            // Create users and attendance records for both tenants
            const tenantAUser = {
                email: 'att.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Attendance User A',
                role: 'employee',
                tenantId: tenantAData._id,
                employeeId: 'ATT001'
            };

            const tenantBUser = {
                email: 'att.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Attendance User B',
                role: 'employee',
                tenantId: tenantBData._id,
                employeeId: 'ATT002'
            };

            cy.seedTestData('user', [tenantAUser, tenantBUser]);

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

            // Login as HR user for Tenant A
            cy.loginAsTenantUser('hr', tenantAData.domain);
            cy.navigateToModule('attendance');

            // Should only see Tenant A attendance records
            cy.get('[data-cy="attendance-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Attendance User A');
            cy.get('[data-cy="table-row"]').first().should('not.contain.text', 'Attendance User B');
        });

        it('should prevent cross-tenant attendance API access', () => {
            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Try to access attendance data with Tenant B filter
            cy.apiRequest('GET', `/api/attendance?tenantId=${tenantBData._id}`)
                .then((response) => {
                    // Should either return empty results or be forbidden
                    expect([200, 403, 404]).to.include(response.status);

                    if (response.status === 200) {
                        expect(response.body.data || response.body).to.be.empty;
                    }
                });
        });
    });

    describe('Leave Request Data Isolation', () => {
        it('should isolate leave requests between tenants', () => {
            // Create users for both tenants
            const tenantAUser = {
                email: 'leave.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Leave User A',
                role: 'employee',
                tenantId: tenantAData._id
            };

            const tenantBUser = {
                email: 'leave.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Leave User B',
                role: 'employee',
                tenantId: tenantBData._id
            };

            cy.seedTestData('user', [tenantAUser, tenantBUser]);

            // Create leave requests for both tenants
            const tenantALeave = {
                employeeId: tenantAUser._id,
                tenantId: tenantAData._id,
                type: 'Annual Leave',
                startDate: '2024-01-15',
                endDate: '2024-01-17',
                reason: 'Personal time off',
                status: 'pending'
            };

            const tenantBLeave = {
                employeeId: tenantBUser._id,
                tenantId: tenantBData._id,
                type: 'Sick Leave',
                startDate: '2024-01-15',
                endDate: '2024-01-16',
                reason: 'Medical appointment',
                status: 'approved'
            };

            cy.seedTestData('leaveRequest', [tenantALeave, tenantBLeave]);

            // Login as manager for Tenant A
            cy.loginAsTenantUser('manager', tenantAData.domain);
            cy.navigateToModule('leave');

            // Should only see Tenant A leave requests
            cy.get('[data-cy="leave-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Leave User A');
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Annual Leave');
            cy.get('[data-cy="table-row"]').first().should('not.contain.text', 'Leave User B');
            cy.get('[data-cy="table-row"]').first().should('not.contain.text', 'Sick Leave');
        });
    });

    describe('Task Data Isolation', () => {
        it('should isolate task assignments between tenants', () => {
            // Create users for both tenants
            const tenantAUser = {
                email: 'task.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Task User A',
                role: 'employee',
                tenantId: tenantAData._id
            };

            const tenantBUser = {
                email: 'task.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Task User B',
                role: 'employee',
                tenantId: tenantBData._id
            };

            cy.seedTestData('user', [tenantAUser, tenantBUser]);

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

            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);
            cy.navigateToModule('tasks');

            // Should only see Tenant A tasks
            cy.get('[data-cy="tasks-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().should('contain.text', 'Tenant A Task');
            cy.get('[data-cy="table-row"]').first().should('not.contain.text', 'Tenant B Task');
        });
    });

    describe('Document Data Isolation', () => {
        it('should isolate document access between tenants', () => {
            // Create users for both tenants
            const tenantAUser = {
                email: 'doc.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Doc User A',
                role: 'employee',
                tenantId: tenantAData._id
            };

            const tenantBUser = {
                email: 'doc.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Doc User B',
                role: 'employee',
                tenantId: tenantBData._id
            };

            cy.seedTestData('user', [tenantAUser, tenantBUser]);

            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);
            cy.navigateToModule('documents');

            // Try to access a document that might belong to Tenant B
            const tenantBDocumentId = '507f1f77bcf86cd799439011'; // Mock document ID

            cy.apiRequest('GET', `/api/documents/${tenantBDocumentId}`)
                .then((response) => {
                    // Should be forbidden or not found
                    expect([403, 404]).to.include(response.status);
                });

            // Verify user can only see their tenant's documents
            cy.apiRequest('GET', '/api/documents')
                .then((response) => {
                    expect(response.status).to.eq(200);

                    if (response.body.data && response.body.data.length > 0) {
                        // All returned documents should belong to Tenant A
                        response.body.data.forEach(document => {
                            expect(document.tenantId).to.eq(tenantAData._id);
                        });
                    }
                });
        });
    });

    describe('Platform Admin Access Control', () => {
        it('should allow platform admins to view all tenant data', () => {
            // Create users for both tenants
            const tenantAUser = {
                email: 'user.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Tenant A User',
                role: 'employee',
                tenantId: tenantAData._id
            };

            const tenantBUser = {
                email: 'user.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Tenant B User',
                role: 'employee',
                tenantId: tenantBData._id
            };

            cy.seedTestData('user', [tenantAUser, tenantBUser]);

            // Login as platform admin
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('tenants');

            // Should see both tenants
            cy.get('[data-cy="tenants-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length.at.least', 2);

            // Should be able to view details for both tenants
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).within(() => {
                    cy.get('[data-cy="action-view"]').click();
                });
                cy.get('[data-cy="tenant-details-modal"]').should('be.visible');
                cy.closeModal();
            });
        });

        it('should allow platform admins to manage tenant-specific data', () => {
            // Login as platform admin
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('companies');

            // Should be able to view and manage all companies
            cy.get('[data-cy="companies-table"]').should('be.visible');

            // Should be able to filter by tenant
            cy.get('[data-cy="tenant-filter"]').select(tenantAData.name);
            cy.waitForTableLoad();

            // Should see filtered results
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).should('contain.text', tenantAData.name);
            });
        });
    });

    describe('License-Based Module Access', () => {
        it('should restrict module access based on tenant license', () => {
            // Mock license with limited modules for Tenant A
            cy.intercept('GET', '**/license/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    tenantId: tenantAData._id,
                    enabledModules: ['attendance', 'leave'], // Limited modules
                    expiresAt: '2025-12-31T23:59:59Z'
                }
            }).as('limitedLicense');

            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Should have access to enabled modules
            cy.verifyModuleAccess('attendance', true);
            cy.verifyModuleAccess('leave', true);

            // Should not have access to disabled modules
            cy.verifyModuleAccess('payroll', false);
            cy.verifyModuleAccess('tasks', false);
            cy.verifyModuleAccess('documents', false);
        });

        it('should handle license expiry gracefully', () => {
            // Mock expired license
            cy.intercept('GET', '**/license/validate', {
                statusCode: 403,
                body: {
                    valid: false,
                    error: 'License expired',
                    expiresAt: '2023-12-31T23:59:59Z'
                }
            }).as('expiredLicense');

            // Try to login as user for Tenant A
            cy.visit(`http://localhost:3000/${tenantAData.domain}/login`);

            // Should show license expired message
            cy.get('[data-cy="license-expired-message"]').should('be.visible');
            cy.get('[data-cy="license-expired-message"]').should('contain.text', 'License expired');

            // Should not be able to access the application
            cy.get('[data-cy="login-form"]').should('not.exist');
        });
    });

    describe('Audit Trail and Data Integrity', () => {
        it('should maintain audit logs with proper tenant isolation', () => {
            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Perform some actions that should be audited
            cy.navigateToModule('profile');
            cy.get('[data-cy="edit-profile-button"]').click();
            cy.fillForm({
                name: 'Updated Name',
                phone: '+1234567890'
            });
            cy.submitForm();
            cy.expectSuccessMessage('Profile updated successfully');

            // Login as platform admin to check audit logs
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('audit-logs');

            // Filter by tenant
            cy.get('[data-cy="tenant-filter"]').select(tenantAData.name);
            cy.waitForTableLoad();

            // Should see audit log for the profile update
            cy.get('[data-cy="table-row"]').should('contain.text', 'Profile updated');
            cy.get('[data-cy="table-row"]').should('contain.text', tenantAData.name);

            // Verify audit log contains correct tenant information
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action-view"]').click();
            });

            cy.get('[data-cy="audit-details-modal"]').should('be.visible');
            cy.get('[data-cy="audit-tenant-id"]').should('contain.text', tenantAData._id);
            cy.closeModal();
        });

        it('should prevent data corruption during tenant operations', () => {
            // Create test data for both tenants
            const tenantAUser = {
                email: 'integrity.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Integrity User A',
                role: 'employee',
                tenantId: tenantAData._id
            };

            const tenantBUser = {
                email: 'integrity.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Integrity User B',
                role: 'employee',
                tenantId: tenantBData._id
            };

            cy.seedTestData('user', [tenantAUser, tenantBUser]);

            // Login as admin for Tenant A
            cy.loginAsTenantUser('admin', tenantAData.domain);

            // Perform bulk operations
            cy.navigateToModule('employees');
            cy.get('[data-cy="bulk-actions-button"]').click();
            cy.get('[data-cy="select-all-checkbox"]').check();
            cy.get('[data-cy="bulk-update-button"]').click();

            // Update department for all selected users
            cy.get('[data-cy="bulk-update-modal"]').should('be.visible');
            cy.fillForm({
                department: 'Updated Department'
            });
            cy.submitForm();
            cy.expectSuccessMessage('Bulk update completed');

            // Verify only Tenant A users were updated
            cy.apiRequest('GET', '/api/users')
                .then((response) => {
                    expect(response.status).to.eq(200);

                    response.body.data.forEach(user => {
                        expect(user.tenantId).to.eq(tenantAData._id);
                        if (user.email === tenantAUser.email) {
                            expect(user.department).to.eq('Updated Department');
                        }
                    });
                });

            // Verify Tenant B users were not affected
            // This would require platform admin access to verify
            cy.loginAsPlatformAdmin();
            cy.apiRequest('GET', `/api/platform/users?tenantId=${tenantBData._id}`)
                .then((response) => {
                    if (response.status === 200 && response.body.data) {
                        response.body.data.forEach(user => {
                            expect(user.tenantId).to.eq(tenantBData._id);
                            expect(user.department).to.not.eq('Updated Department');
                        });
                    }
                });
        });
    });

    describe('Session and Authentication Isolation', () => {
        it('should maintain separate sessions for different tenants', () => {
            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);
            cy.url().should('include', `/${tenantAData.domain}`);

            // Open new tab/window and try to access Tenant B
            cy.window().then((win) => {
                // Store Tenant A session info
                const tenantAToken = win.localStorage.getItem('authToken');
                expect(tenantAToken).to.exist;

                // Try to access Tenant B with Tenant A token
                cy.visit(`http://localhost:3000/${tenantBData.domain}/dashboard`, { failOnStatusCode: false });

                // Should be redirected to login or access denied
                cy.url().should('satisfy', (url) => {
                    return url.includes('/login') ||
                        url.includes('/access-denied') ||
                        url.includes(`/${tenantAData.domain}`);
                });
            });
        });

        it('should invalidate sessions properly during logout', () => {
            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Store session token
            cy.window().then((win) => {
                const token = win.localStorage.getItem('authToken');
                expect(token).to.exist;

                // Logout
                cy.logout();

                // Verify token is cleared
                expect(win.localStorage.getItem('authToken')).to.be.null;
            });

            // Try to access protected route with old session
            cy.visit(`http://localhost:3000/${tenantAData.domain}/dashboard`, { failOnStatusCode: false });
            cy.url().should('include', '/login');
        });
    });

    describe('Database-Level Isolation Verification', () => {
        it('should verify database queries include tenant filters', () => {
            // This test would typically require database query monitoring
            // For E2E testing, we'll verify through API responses

            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Make API calls and verify all responses include proper tenant filtering
            const endpoints = [
                '/api/users',
                '/api/departments',
                '/api/positions',
                '/api/attendance',
                '/api/leave-requests',
                '/api/tasks',
                '/api/documents'
            ];

            endpoints.forEach(endpoint => {
                cy.apiRequest('GET', endpoint)
                    .then((response) => {
                        if (response.status === 200 && response.body.data) {
                            // All returned data should belong to the current tenant
                            response.body.data.forEach(item => {
                                expect(item.tenantId).to.eq(tenantAData._id);
                            });
                        }
                    });
            });
        });

        it('should prevent SQL injection attempts across tenants', () => {
            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Attempt various injection patterns
            const injectionAttempts = [
                `'; DROP TABLE users; --`,
                `' OR '1'='1`,
                `${tenantBData._id}' OR tenantId='${tenantAData._id}`,
                `' UNION SELECT * FROM users WHERE tenantId='${tenantBData._id}' --`
            ];

            injectionAttempts.forEach(injection => {
                cy.apiRequest('GET', `/api/users?search=${encodeURIComponent(injection)}`)
                    .then((response) => {
                        // Should either return safe results or error
                        expect([200, 400, 403]).to.include(response.status);

                        if (response.status === 200 && response.body.data) {
                            // All results should still belong to Tenant A
                            response.body.data.forEach(user => {
                                expect(user.tenantId).to.eq(tenantAData._id);
                            });
                        }
                    });
            });
        });
    });
});