/**
 * E2E Tests for Multi-Tenant Audit Trail and Data Integrity
 * 
 * These tests verify that audit logs correctly track cross-tenant operations,
 * deleted tenants don't leak data, and data integrity is maintained.
 */

describe('Multi-Tenant Audit Trail and Data Integrity', () => {
    let tenantAData, tenantBData, deletedTenantData;

    before(() => {
        // Load test fixtures
        cy.fixture('tenants').then((tenants) => {
            tenantAData = tenants.tenantA;
            tenantBData = tenants.tenantB;
            deletedTenantData = {
                _id: '507f1f77bcf86cd799439099',
                name: 'Deleted Company',
                domain: 'deleted',
                isActive: false,
                deletedAt: '2024-01-15T10:30:00Z'
            };
        });
    });

    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Seed test data for active tenants
        cy.seedTestData('tenant', [tenantAData, tenantBData]);
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Audit Trail Isolation', () => {
        it('should maintain audit logs with proper tenant isolation', () => {
            // Create users for both tenants
            const tenantAUser = {
                email: 'audit.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Audit User A',
                role: 'employee',
                tenantId: tenantAData._id
            };

            const tenantBUser = {
                email: 'audit.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Audit User B',
                role: 'employee',
                tenantId: tenantBData._id
            };

            cy.seedTestData('user', [tenantAUser, tenantBUser]);

            // Perform auditable actions in Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);
            cy.navigateToModule('profile');
            cy.get('[data-cy="edit-profile-button"]').click();
            cy.fillForm({
                name: 'Updated Audit User A',
                phone: '+1111111111'
            });
            cy.submitForm();
            cy.expectSuccessMessage('Profile updated successfully');

            // Perform different auditable actions in Tenant B
            cy.logout();
            cy.loginAsTenantUser('employee', tenantBData.domain);
            cy.navigateToModule('profile');
            cy.get('[data-cy="edit-profile-button"]').click();
            cy.fillForm({
                name: 'Updated Audit User B',
                phone: '+2222222222'
            });
            cy.submitForm();
            cy.expectSuccessMessage('Profile updated successfully');

            // Login as platform admin to verify audit isolation
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('audit-logs');

            // Filter by Tenant A
            cy.get('[data-cy="tenant-filter"]').select(tenantAData.name);
            cy.waitForTableLoad();

            // Should only see Tenant A audit logs
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).should('contain.text', tenantAData.name);
                cy.wrap($row).should('not.contain.text', tenantBData.name);
                cy.wrap($row).should('not.contain.text', 'Audit User B');
            });

            // Filter by Tenant B
            cy.get('[data-cy="tenant-filter"]').select(tenantBData.name);
            cy.waitForTableLoad();

            // Should only see Tenant B audit logs
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).should('contain.text', tenantBData.name);
                cy.wrap($row).should('not.contain.text', tenantAData.name);
                cy.wrap($row).should('not.contain.text', 'Audit User A');
            });
        });

        it('should log security violations for cross-tenant access attempts', () => {
            // Create users for both tenants
            const tenantAUser = {
                email: 'security.a@tenanta.com',
                password: 'TestPassword123!',
                name: 'Security User A',
                role: 'employee',
                tenantId: tenantAData._id
            };

            const tenantBUser = {
                email: 'security.b@tenantb.com',
                password: 'TestPassword123!',
                name: 'Security User B',
                role: 'employee',
                tenantId: tenantBData._id
            };

            cy.seedTestData('user', [tenantAUser, tenantBUser]);

            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Attempt unauthorized access to Tenant B data
            cy.apiRequest('GET', `/api/users/${tenantBUser._id}`, null, {
                'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`,
                'X-Tenant-ID': tenantAData._id
            }).then((response) => {
                expect([403, 404]).to.include(response.status);
            });

            // Try to access Tenant B UI routes
            cy.visit(`http://localhost:3000/${tenantBData.domain}/dashboard`, { failOnStatusCode: false });

            // Login as platform admin to check security audit logs
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('audit-logs');

            // Filter by security violations
            cy.get('[data-cy="event-type-filter"]').select('security_violation');
            cy.waitForTableLoad();

            // Should see security violation logs
            cy.get('[data-cy="table-row"]').should('contain.text', 'unauthorized_access_attempt');
            cy.get('[data-cy="table-row"]').should('contain.text', tenantAData.name);

            // View security violation details
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action-view"]').click();
            });

            cy.get('[data-cy="audit-details"]').should('be.visible');
            cy.get('[data-cy="audit-details"]').should('contain.text', 'Cross-tenant access attempt');
            cy.get('[data-cy="audit-details"]').should('contain.text', tenantBUser._id);
        });

        it('should track data modification attempts across tenants', () => {
            // Create test data for both tenants
            const tenantATask = {
                _id: '507f1f77bcf86cd799439020',
                title: 'Tenant A Task',
                description: 'Task for Tenant A',
                tenantId: tenantAData._id,
                status: 'todo'
            };

            const tenantBTask = {
                _id: '507f1f77bcf86cd799439021',
                title: 'Tenant B Task',
                description: 'Task for Tenant B',
                tenantId: tenantBData._id,
                status: 'todo'
            };

            cy.seedTestData('task', [tenantATask, tenantBTask]);

            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Attempt to modify Tenant B task
            cy.apiRequest('PUT', `/api/tasks/${tenantBTask._id}`, {
                status: 'completed',
                title: 'Hacked Task'
            }, {
                'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`,
                'X-Tenant-ID': tenantAData._id
            }).then((response) => {
                expect([403, 404]).to.include(response.status);
            });

            // Login as platform admin to verify audit trail
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('audit-logs');

            // Filter by data modification attempts
            cy.get('[data-cy="event-type-filter"]').select('data_modification_attempt');
            cy.waitForTableLoad();

            // Should see the unauthorized modification attempt
            cy.get('[data-cy="table-row"]').should('contain.text', 'unauthorized_modification');
            cy.get('[data-cy="table-row"]').should('contain.text', tenantBTask._id);
        });
    });

    describe('Deleted Tenant Data Isolation', () => {
        it('should prevent access to deleted tenant data', () => {
            // Seed deleted tenant data
            cy.seedTestData('tenant', deletedTenantData);

            // Create user data for deleted tenant
            const deletedTenantUser = {
                email: 'user@deleted.com',
                password: 'TestPassword123!',
                name: 'Deleted Tenant User',
                role: 'employee',
                tenantId: deletedTenantData._id
            };

            cy.seedTestData('user', deletedTenantUser);

            // Try to access deleted tenant domain
            cy.visit(`http://localhost:3000/${deletedTenantData.domain}/login`, { failOnStatusCode: false });

            // Should show tenant not found or deactivated message
            cy.get('[data-cy="tenant-not-found"]').should('be.visible');
            cy.get('[data-cy="tenant-not-found"]').should('contain.text', 'Tenant not found or deactivated');

            // Should not be able to login
            cy.get('[data-cy="login-form"]').should('not.exist');
        });

        it('should not return deleted tenant data in API responses', () => {
            // Login as platform admin
            cy.loginAsPlatformAdmin();

            // Request all tenants
            cy.apiRequest('GET', '/api/platform/tenants').then((response) => {
                expect(response.status).to.eq(200);

                // Should not include deleted tenant
                const tenantIds = response.body.data.map(tenant => tenant._id);
                expect(tenantIds).to.not.include(deletedTenantData._id);

                // All returned tenants should be active
                response.body.data.forEach(tenant => {
                    expect(tenant.isActive).to.be.true;
                    expect(tenant.deletedAt).to.be.undefined;
                });
            });
        });

        it('should handle references to deleted tenant data gracefully', () => {
            // Create a cross-reference that might point to deleted tenant
            const crossReference = {
                sourceId: tenantAData._id,
                targetId: deletedTenantData._id,
                type: 'partnership',
                status: 'active'
            };

            cy.seedTestData('crossReference', crossReference);

            // Login as platform admin
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('partnerships');

            // Should handle deleted tenant reference gracefully
            cy.get('[data-cy="partnerships-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Deleted Tenant');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Inactive');

            // Should not allow actions on deleted tenant references
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action-edit"]').should('be.disabled');
                cy.get('[data-cy="action-activate"]').should('not.exist');
            });
        });

        it('should maintain data integrity when tenant is soft-deleted', () => {
            // Create comprehensive data for a tenant that will be deleted
            const toBeDeletedTenant = {
                _id: '507f1f77bcf86cd799439088',
                name: 'To Be Deleted Corp',
                domain: 'tobedeleted',
                isActive: true
            };

            const tenantUser = {
                email: 'user@tobedeleted.com',
                name: 'User To Delete',
                role: 'employee',
                tenantId: toBeDeletedTenant._id
            };

            const tenantData = {
                tasks: [{
                    title: 'Task to be archived',
                    tenantId: toBeDeletedTenant._id,
                    assignedTo: tenantUser._id
                }],
                attendance: [{
                    employeeId: tenantUser._id,
                    tenantId: toBeDeletedTenant._id,
                    date: '2024-01-15',
                    status: 'present'
                }]
            };

            cy.seedTestData('tenant', toBeDeletedTenant);
            cy.seedTestData('user', tenantUser);
            cy.seedTestData('task', tenantData.tasks);
            cy.seedTestData('attendance', tenantData.attendance);

            // Login as platform admin and soft-delete the tenant
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('tenants');

            // Find and delete the tenant
            cy.searchInTable(toBeDeletedTenant.name);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action-delete"]').click();
            });

            // Confirm soft deletion
            cy.get('[data-cy="delete-tenant-modal"]').should('be.visible');
            cy.get('[data-cy="soft-delete-option"]').check();
            cy.get('[data-cy="confirm-delete"]').click();
            cy.expectSuccessMessage('Tenant deactivated successfully');

            // Verify tenant is marked as deleted but data is preserved
            cy.apiRequest('GET', '/api/platform/tenants?includeDeleted=true').then((response) => {
                const deletedTenant = response.body.data.find(t => t._id === toBeDeletedTenant._id);
                expect(deletedTenant).to.exist;
                expect(deletedTenant.isActive).to.be.false;
                expect(deletedTenant.deletedAt).to.exist;
            });

            // Verify associated data is preserved but inaccessible
            cy.apiRequest('GET', `/api/platform/tenants/${toBeDeletedTenant._id}/data`).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body.preserved).to.be.true;
                expect(response.body.accessible).to.be.false;
            });
        });
    });

    describe('Data Integrity During Concurrent Operations', () => {
        it('should maintain data consistency during concurrent tenant operations', () => {
            // Create users for both tenants
            const tenantAUsers = [
                {
                    email: 'concurrent1.a@tenanta.com',
                    name: 'Concurrent User 1A',
                    role: 'employee',
                    tenantId: tenantAData._id
                },
                {
                    email: 'concurrent2.a@tenanta.com',
                    name: 'Concurrent User 2A',
                    role: 'employee',
                    tenantId: tenantAData._id
                }
            ];

            const tenantBUsers = [
                {
                    email: 'concurrent1.b@tenantb.com',
                    name: 'Concurrent User 1B',
                    role: 'employee',
                    tenantId: tenantBData._id
                },
                {
                    email: 'concurrent2.b@tenantb.com',
                    name: 'Concurrent User 2B',
                    role: 'employee',
                    tenantId: tenantBData._id
                }
            ];

            cy.seedTestData('user', [...tenantAUsers, ...tenantBUsers]);

            // Simulate concurrent operations
            cy.loginAsTenantUser('admin', tenantAData.domain);

            // Start bulk operation in Tenant A
            cy.navigateToModule('employees');
            cy.get('[data-cy="bulk-actions"]').click();
            cy.get('[data-cy="select-all"]').check();
            cy.get('[data-cy="bulk-update"]').click();

            cy.fillForm({
                department: 'Updated Department A'
            });
            cy.submitForm();

            // Verify only Tenant A users were updated
            cy.apiRequest('GET', '/api/users').then((response) => {
                expect(response.status).to.eq(200);
                response.body.data.forEach(user => {
                    expect(user.tenantId).to.eq(tenantAData._id);
                    if (user.email.includes('@tenanta.com')) {
                        expect(user.department).to.eq('Updated Department A');
                    }
                });
            });

            // Verify Tenant B users were not affected
            cy.logout();
            cy.loginAsTenantUser('admin', tenantBData.domain);
            cy.apiRequest('GET', '/api/users').then((response) => {
                expect(response.status).to.eq(200);
                response.body.data.forEach(user => {
                    expect(user.tenantId).to.eq(tenantBData._id);
                    expect(user.department).to.not.eq('Updated Department A');
                });
            });
        });

        it('should handle database transaction rollbacks properly per tenant', () => {
            // Create test data that will cause a transaction failure
            const tenantAUser = {
                email: 'transaction.a@tenanta.com',
                name: 'Transaction User A',
                role: 'employee',
                tenantId: tenantAData._id
            };

            cy.seedTestData('user', tenantAUser);

            // Login as admin for Tenant A
            cy.loginAsTenantUser('admin', tenantAData.domain);

            // Attempt an operation that should fail and rollback
            cy.navigateToModule('employees');
            cy.get('[data-cy="bulk-import"]').click();

            // Upload invalid data that will cause transaction failure
            cy.uploadFile('invalid-employee-data.csv', '[data-cy="import-file"]');
            cy.get('[data-cy="import-button"]').click();

            // Should show error and rollback
            cy.expectErrorMessage('Import failed');
            cy.get('[data-cy="rollback-message"]').should('be.visible');

            // Verify no partial data was committed
            cy.apiRequest('GET', '/api/users').then((response) => {
                expect(response.status).to.eq(200);
                // Should only have the original user, no partial imports
                const originalUsers = response.body.data.filter(u => u.email === tenantAUser.email);
                expect(originalUsers).to.have.length(1);
            });

            // Verify other tenants were not affected by the failed transaction
            cy.logout();
            cy.loginAsTenantUser('employee', tenantBData.domain);
            cy.apiRequest('GET', '/api/users').then((response) => {
                expect(response.status).to.eq(200);
                // Tenant B should be completely unaffected
                response.body.data.forEach(user => {
                    expect(user.tenantId).to.eq(tenantBData._id);
                });
            });
        });
    });

    describe('Database-Level Isolation Verification', () => {
        it('should verify all database queries include proper tenant filters', () => {
            // Create comprehensive test data for both tenants
            const testData = {
                tenantA: {
                    users: [{ email: 'db1.a@tenanta.com', tenantId: tenantAData._id }],
                    tasks: [{ title: 'DB Task A', tenantId: tenantAData._id }],
                    attendance: [{ date: '2024-01-15', tenantId: tenantAData._id }]
                },
                tenantB: {
                    users: [{ email: 'db1.b@tenantb.com', tenantId: tenantBData._id }],
                    tasks: [{ title: 'DB Task B', tenantId: tenantBData._id }],
                    attendance: [{ date: '2024-01-15', tenantId: tenantBData._id }]
                }
            };

            cy.seedTestData('user', [...testData.tenantA.users, ...testData.tenantB.users]);
            cy.seedTestData('task', [...testData.tenantA.tasks, ...testData.tenantB.tasks]);
            cy.seedTestData('attendance', [...testData.tenantA.attendance, ...testData.tenantB.attendance]);

            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Test all major endpoints for proper tenant filtering
            const endpoints = [
                '/api/users',
                '/api/tasks',
                '/api/attendance',
                '/api/departments',
                '/api/leave-requests',
                '/api/documents'
            ];

            endpoints.forEach(endpoint => {
                cy.apiRequest('GET', endpoint).then((response) => {
                    if (response.status === 200 && response.body.data) {
                        // All returned data should belong to current tenant
                        response.body.data.forEach(item => {
                            expect(item.tenantId).to.eq(tenantAData._id);
                            expect(item.tenantId).to.not.eq(tenantBData._id);
                        });
                    }
                });
            });
        });

        it('should prevent SQL injection attempts that bypass tenant isolation', () => {
            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData._id);

            // Attempt various SQL injection patterns
            const injectionAttempts = [
                `'; DROP TABLE users; --`,
                `' OR '1'='1`,
                `${tenantBData._id}' OR tenantId='${tenantAData._id}`,
                `' UNION SELECT * FROM users WHERE tenantId='${tenantBData._id}' --`,
                `'; UPDATE users SET tenantId='${tenantBData._id}' WHERE tenantId='${tenantAData._id}'; --`
            ];

            injectionAttempts.forEach(injection => {
                cy.apiRequest('GET', `/api/users?search=${encodeURIComponent(injection)}`).then((response) => {
                    // Should either return safe results or error
                    expect([200, 400, 403]).to.include(response.status);

                    if (response.status === 200 && response.body.data) {
                        // All results should still belong to current tenant
                        response.body.data.forEach(user => {
                            expect(user.tenantId).to.eq(tenantAData._id);
                        });
                    }
                });
            });
        });

        it('should maintain referential integrity across tenant boundaries', () => {
            // Create related data across tenants
            const tenantADept = {
                _id: '507f1f77bcf86cd799439030',
                name: 'Engineering A',
                tenantId: tenantAData._id
            };

            const tenantBDept = {
                _id: '507f1f77bcf86cd799439031',
                name: 'Engineering B',
                tenantId: tenantBData._id
            };

            const tenantAUser = {
                email: 'ref.a@tenanta.com',
                name: 'Ref User A',
                tenantId: tenantAData._id,
                departmentId: tenantADept._id
            };

            cy.seedTestData('department', [tenantADept, tenantBDept]);
            cy.seedTestData('user', tenantAUser);

            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Try to create invalid cross-tenant reference
            cy.apiRequest('POST', '/api/users', {
                email: 'invalid.ref@tenanta.com',
                name: 'Invalid Ref User',
                departmentId: tenantBDept._id // Cross-tenant reference
            }).then((response) => {
                // Should either reject the request or override the department
                if (response.status === 201) {
                    expect(response.body.data.departmentId).to.not.eq(tenantBDept._id);
                } else {
                    expect([400, 403]).to.include(response.status);
                }
            });

            // Verify existing references remain valid
            cy.apiRequest('GET', `/api/users/${tenantAUser._id}`).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body.data.departmentId).to.eq(tenantADept._id);
                expect(response.body.data.tenantId).to.eq(tenantAData._id);
            });
        });
    });

    describe('Performance and Scalability', () => {
        it('should maintain performance with large datasets per tenant', () => {
            // Create large dataset for Tenant A
            const largeDataset = Array.from({ length: 100 }, (_, i) => ({
                email: `perf${i}@tenanta.com`,
                name: `Performance User ${i}`,
                tenantId: tenantAData._id,
                role: 'employee'
            }));

            cy.seedTestData('user', largeDataset);

            // Login as Tenant A user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Measure query performance
            cy.startPerformanceMark('large-dataset-query');
            cy.apiRequest('GET', '/api/users?limit=50&offset=0').then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body.data).to.have.length(50);

                // All results should belong to current tenant
                response.body.data.forEach(user => {
                    expect(user.tenantId).to.eq(tenantAData._id);
                });
            });
            cy.endPerformanceMark('large-dataset-query', 2000); // 2 second threshold

            // Verify pagination works correctly
            cy.apiRequest('GET', '/api/users?limit=50&offset=50').then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body.data.length).to.be.greaterThan(0);

                response.body.data.forEach(user => {
                    expect(user.tenantId).to.eq(tenantAData._id);
                });
            });
        });

        it('should handle concurrent tenant operations efficiently', () => {
            // Simulate multiple concurrent operations
            const operations = [];

            // Login as users from different tenants simultaneously
            operations.push(
                cy.apiLogin('employee', tenantAData.domain).then((tokenA) => {
                    return cy.apiRequest('GET', '/api/users', null, {
                        'Authorization': `Bearer ${tokenA}`,
                        'X-Tenant-ID': tenantAData._id
                    });
                })
            );

            operations.push(
                cy.apiLogin('employee', tenantBData.domain).then((tokenB) => {
                    return cy.apiRequest('GET', '/api/users', null, {
                        'Authorization': `Bearer ${tokenB}`,
                        'X-Tenant-ID': tenantBData._id
                    });
                })
            );

            // All operations should complete successfully
            Promise.all(operations).then((responses) => {
                responses.forEach((response, index) => {
                    expect(response.status).to.eq(200);

                    if (response.body.data) {
                        const expectedTenantId = index === 0 ? tenantAData._id : tenantBData._id;
                        response.body.data.forEach(user => {
                            expect(user.tenantId).to.eq(expectedTenantId);
                        });
                    }
                });
            });
        });
    });
});