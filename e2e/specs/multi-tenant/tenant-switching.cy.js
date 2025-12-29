/**
 * E2E Tests for Tenant Switching and Context Management
 * 
 * These tests verify that users can properly switch between tenants
 * they have access to while maintaining proper data isolation.
 */

describe('Tenant Switching and Context Management', () => {
    let multiTenantUser, tenantAData, tenantBData;

    before(() => {
        // Load test fixtures
        cy.fixture('tenants').then((tenants) => {
            tenantAData = tenants.tenantA;
            tenantBData = tenants.tenantB;
        });

        cy.fixture('users').then((users) => {
            multiTenantUser = users.multiTenantUser;
        });
    });

    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Seed test data for both tenants
        cy.seedTestData('tenant', [tenantAData, tenantBData]);

        // Create a user with access to both tenants
        const userWithMultiTenantAccess = {
            ...multiTenantUser,
            tenantAccess: [tenantAData._id, tenantBData._id],
            primaryTenant: tenantAData._id
        };

        cy.seedTestData('user', userWithMultiTenantAccess);
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Tenant Context Switching', () => {
        it('should allow users to switch between authorized tenants', () => {
            // Login as multi-tenant user
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Verify initial tenant context
            cy.verifyTenantIsolation(tenantAData.domain);
            cy.get('[data-cy="current-tenant"]').should('contain.text', tenantAData.name);

            // Switch to Tenant B
            cy.switchTenant(tenantBData.domain);

            // Verify tenant context changed
            cy.verifyTenantIsolation(tenantBData.domain);
            cy.get('[data-cy="current-tenant"]').should('contain.text', tenantBData.name);

            // Verify URL updated correctly
            cy.url().should('include', `/${tenantBData.domain}`);
        });

        it('should maintain separate data contexts when switching tenants', () => {
            // Create different data for each tenant
            const tenantAEmployee = {
                email: 'emp.a@tenanta.com',
                name: 'Employee A',
                role: 'employee',
                tenantId: tenantAData._id,
                department: 'Engineering'
            };

            const tenantBEmployee = {
                email: 'emp.b@tenantb.com',
                name: 'Employee B',
                role: 'employee',
                tenantId: tenantBData._id,
                department: 'Marketing'
            };

            cy.seedTestData('user', [tenantAEmployee, tenantBEmployee]);

            // Login as multi-tenant user to Tenant A
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);
            cy.navigateToModule('employees');

            // Verify Tenant A data
            cy.get('[data-cy="employees-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Employee A');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Engineering');
            cy.get('[data-cy="table-row"]').should('not.contain.text', 'Employee B');

            // Switch to Tenant B
            cy.switchTenant(tenantBData.domain);
            cy.navigateToModule('employees');

            // Verify Tenant B data
            cy.get('[data-cy="employees-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Employee B');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Marketing');
            cy.get('[data-cy="table-row"]').should('not.contain.text', 'Employee A');

            // Switch back to Tenant A
            cy.switchTenant(tenantAData.domain);
            cy.navigateToModule('employees');

            // Verify Tenant A data is still correct
            cy.get('[data-cy="employees-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Employee A');
            cy.get('[data-cy="table-row"]').should('not.contain.text', 'Employee B');
        });

        it('should preserve user preferences per tenant', () => {
            // Login as multi-tenant user to Tenant A
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Set preferences for Tenant A
            cy.navigateToModule('settings');
            cy.get('[data-cy="language-select"]').select('English');
            cy.get('[data-cy="timezone-select"]').select('America/New_York');
            cy.get('[data-cy="date-format-select"]').select('MM/DD/YYYY');
            cy.get('[data-cy="save-preferences"]').click();
            cy.expectSuccessMessage('Preferences saved');

            // Switch to Tenant B
            cy.switchTenant(tenantBData.domain);
            cy.navigateToModule('settings');

            // Set different preferences for Tenant B
            cy.get('[data-cy="language-select"]').select('Spanish');
            cy.get('[data-cy="timezone-select"]').select('Europe/London');
            cy.get('[data-cy="date-format-select"]').select('DD/MM/YYYY');
            cy.get('[data-cy="save-preferences"]').click();
            cy.expectSuccessMessage('Preferences saved');

            // Switch back to Tenant A
            cy.switchTenant(tenantAData.domain);
            cy.navigateToModule('settings');

            // Verify Tenant A preferences are preserved
            cy.get('[data-cy="language-select"]').should('have.value', 'English');
            cy.get('[data-cy="timezone-select"]').should('have.value', 'America/New_York');
            cy.get('[data-cy="date-format-select"]').should('have.value', 'MM/DD/YYYY');
        });
    });

    describe('Tenant Access Control', () => {
        it('should prevent access to unauthorized tenants', () => {
            // Create a user with access only to Tenant A
            const singleTenantUser = {
                email: 'single@tenanta.com',
                password: 'TestPassword123!',
                name: 'Single Tenant User',
                role: 'employee',
                tenantId: tenantAData._id,
                tenantAccess: [tenantAData._id] // Only Tenant A access
            };

            cy.seedTestData('user', singleTenantUser);

            // Login as single-tenant user
            cy.visit(`http://localhost:3000/${tenantAData.domain}/login`);
            cy.get('[data-cy="email-input"]').type(singleTenantUser.email);
            cy.get('[data-cy="password-input"]').type(singleTenantUser.password);
            cy.get('[data-cy="login-button"]').click();

            // Verify successful login to Tenant A
            cy.url().should('include', `/${tenantAData.domain}`);
            cy.get('[data-cy="dashboard-content"]').should('be.visible');

            // Try to access Tenant B directly
            cy.visit(`http://localhost:3000/${tenantBData.domain}/dashboard`, { failOnStatusCode: false });

            // Should be redirected or denied access
            cy.url().should('satisfy', (url) => {
                return url.includes('/login') ||
                    url.includes('/access-denied') ||
                    url.includes(`/${tenantAData.domain}`);
            });

            // Verify tenant switcher doesn't show unauthorized tenants
            if (cy.get('[data-cy="tenant-switcher"]').should('exist')) {
                cy.get('[data-cy="tenant-switcher"]').click();
                cy.get(`[data-cy="tenant-option-${tenantBData.domain}"]`).should('not.exist');
                cy.get(`[data-cy="tenant-option-${tenantAData.domain}"]`).should('exist');
            }
        });

        it('should handle tenant deactivation gracefully', () => {
            // Login as multi-tenant user to Tenant A
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Simulate tenant deactivation via API
            cy.intercept('GET', '**/tenant/validate', {
                statusCode: 403,
                body: {
                    error: 'Tenant is deactivated',
                    code: 'TENANT_DEACTIVATED'
                }
            }).as('deactivatedTenant');

            // Try to navigate within the application
            cy.navigateToModule('dashboard');

            // Should show tenant deactivated message
            cy.get('[data-cy="tenant-deactivated-message"]').should('be.visible');
            cy.get('[data-cy="tenant-deactivated-message"]').should('contain.text', 'Tenant is deactivated');

            // Should provide option to switch to another tenant
            cy.get('[data-cy="switch-tenant-button"]').should('be.visible');
        });
    });

    describe('Session Management Across Tenants', () => {
        it('should maintain separate session states for different tenants', () => {
            // Login as multi-tenant user to Tenant A
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Perform some actions in Tenant A
            cy.navigateToModule('profile');
            cy.get('[data-cy="edit-profile-button"]').click();
            cy.fillForm({ phone: '+1111111111' });
            cy.submitForm();

            // Store session information
            cy.window().then((win) => {
                const tenantASession = {
                    token: win.localStorage.getItem('authToken'),
                    user: JSON.parse(win.localStorage.getItem('user') || '{}'),
                    tenant: JSON.parse(win.localStorage.getItem('currentTenant') || '{}')
                };

                // Switch to Tenant B
                cy.switchTenant(tenantBData.domain);

                // Verify session updated for Tenant B
                cy.window().then((newWin) => {
                    const tenantBSession = {
                        token: newWin.localStorage.getItem('authToken'),
                        user: JSON.parse(newWin.localStorage.getItem('user') || '{}'),
                        tenant: JSON.parse(newWin.localStorage.getItem('currentTenant') || '{}')
                    };

                    // Sessions should be different
                    expect(tenantBSession.tenant.id).to.not.eq(tenantASession.tenant.id);
                    expect(tenantBSession.tenant.domain).to.eq(tenantBData.domain);
                });
            });
        });

        it('should handle session expiry per tenant', () => {
            // Login as multi-tenant user to Tenant A
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Mock session expiry for Tenant A only
            cy.intercept('GET', '**/auth/validate', (req) => {
                if (req.url.includes(tenantAData.domain)) {
                    req.reply({
                        statusCode: 401,
                        body: { error: 'Session expired' }
                    });
                } else {
                    req.reply({
                        statusCode: 200,
                        body: { valid: true }
                    });
                }
            }).as('sessionExpiry');

            // Try to access a protected resource
            cy.navigateToModule('employees');

            // Should be redirected to login for Tenant A
            cy.url().should('include', '/login');

            // Switch to Tenant B (should still work)
            cy.visit(`http://localhost:3000/${tenantBData.domain}/dashboard`);
            cy.url().should('include', `/${tenantBData.domain}/dashboard`);
        });
    });

    describe('Data Synchronization and Consistency', () => {
        it('should maintain data consistency during tenant switches', () => {
            // Create tasks for both tenants
            const tenantATask = {
                title: 'Tenant A Task',
                description: 'Task for Tenant A',
                tenantId: tenantAData._id,
                status: 'todo',
                assignedTo: multiTenantUser._id
            };

            const tenantBTask = {
                title: 'Tenant B Task',
                description: 'Task for Tenant B',
                tenantId: tenantBData._id,
                status: 'in-progress',
                assignedTo: multiTenantUser._id
            };

            cy.seedTestData('task', [tenantATask, tenantBTask]);

            // Login as multi-tenant user to Tenant A
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);
            cy.navigateToModule('tasks');

            // Update task status in Tenant A
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="status-select"]').select('in-progress');
                cy.get('[data-cy="update-status"]').click();
            });
            cy.expectSuccessMessage('Task updated');

            // Switch to Tenant B
            cy.switchTenant(tenantBData.domain);
            cy.navigateToModule('tasks');

            // Verify Tenant B task is unchanged
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-status"]').should('contain.text', 'in-progress');
                cy.get('[data-cy="task-title"]').should('contain.text', 'Tenant B Task');
            });

            // Switch back to Tenant A
            cy.switchTenant(tenantAData.domain);
            cy.navigateToModule('tasks');

            // Verify Tenant A task was updated
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-status"]').should('contain.text', 'in-progress');
                cy.get('[data-cy="task-title"]').should('contain.text', 'Tenant A Task');
            });
        });

        it('should handle concurrent operations across tenants', () => {
            // This test simulates concurrent operations in different tenants
            // In a real scenario, this would involve multiple browser sessions

            // Login as multi-tenant user to Tenant A
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Start a long-running operation in Tenant A
            cy.navigateToModule('reports');
            cy.get('[data-cy="generate-report-button"]').click();
            cy.get('[data-cy="report-type-select"]').select('attendance');
            cy.get('[data-cy="date-range-picker"]').click();
            cy.selectDate('2024-01-01', '[data-cy="start-date"]');
            cy.selectDate('2024-01-31', '[data-cy="end-date"]');
            cy.get('[data-cy="generate-button"]').click();

            // Should show processing state
            cy.get('[data-cy="report-processing"]').should('be.visible');

            // Switch to Tenant B while report is processing
            cy.switchTenant(tenantBData.domain);

            // Should be able to work normally in Tenant B
            cy.navigateToModule('dashboard');
            cy.get('[data-cy="dashboard-content"]').should('be.visible');

            // Perform operations in Tenant B
            cy.navigateToModule('employees');
            cy.get('[data-cy="add-employee-button"]').click();
            cy.fillForm({
                name: 'New Employee B',
                email: 'new.b@tenantb.com',
                department: 'Marketing'
            });
            cy.submitForm();
            cy.expectSuccessMessage('Employee added');

            // Switch back to Tenant A
            cy.switchTenant(tenantAData.domain);
            cy.navigateToModule('reports');

            // Report should still be processing or completed
            cy.get('[data-cy="report-status"]').should('exist');
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle network errors during tenant switching', () => {
            // Login as multi-tenant user
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Mock network error during tenant switch
            cy.intercept('POST', '**/tenant/switch', { forceNetworkError: true }).as('networkError');

            // Try to switch tenants
            cy.get('[data-cy="tenant-switcher"]').click();
            cy.get(`[data-cy="tenant-option-${tenantBData.domain}"]`).click();

            // Should show error message
            cy.get('[data-cy="tenant-switch-error"]').should('be.visible');
            cy.get('[data-cy="tenant-switch-error"]').should('contain.text', 'Failed to switch tenant');

            // Should provide retry option
            cy.get('[data-cy="retry-tenant-switch"]').should('be.visible');

            // Should remain on current tenant
            cy.verifyTenantIsolation(tenantAData.domain);
        });

        it('should recover from invalid tenant states', () => {
            // Login as multi-tenant user
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Corrupt tenant state in localStorage
            cy.window().then((win) => {
                win.localStorage.setItem('currentTenant', JSON.stringify({
                    id: 'invalid-tenant-id',
                    domain: 'invalid-domain',
                    name: 'Invalid Tenant'
                }));
            });

            // Try to navigate
            cy.navigateToModule('dashboard');

            // Should detect invalid state and recover
            cy.get('[data-cy="tenant-recovery-message"]').should('be.visible');

            // Should redirect to tenant selection or default tenant
            cy.url().should('satisfy', (url) => {
                return url.includes('/select-tenant') ||
                    url.includes(`/${tenantAData.domain}`) ||
                    url.includes('/login');
            });
        });
    });

    describe('Performance and Caching', () => {
        it('should cache tenant-specific data appropriately', () => {
            // Login as multi-tenant user to Tenant A
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Load data that should be cached
            cy.navigateToModule('employees');
            cy.waitForTableLoad();

            // Measure initial load time
            cy.startPerformanceMark('tenant-a-load');
            cy.navigateToModule('departments');
            cy.waitForTableLoad();
            cy.endPerformanceMark('tenant-a-load', 3000);

            // Switch to Tenant B
            cy.switchTenant(tenantBData.domain);

            // Load data for Tenant B (should not use Tenant A cache)
            cy.navigateToModule('employees');
            cy.waitForTableLoad();

            // Switch back to Tenant A
            cy.switchTenant(tenantAData.domain);

            // Should load faster due to caching
            cy.startPerformanceMark('tenant-a-cached-load');
            cy.navigateToModule('employees');
            cy.waitForTableLoad();
            cy.endPerformanceMark('tenant-a-cached-load', 1000); // Should be faster
        });

        it('should clear cache when switching tenants', () => {
            // Login as multi-tenant user to Tenant A
            cy.loginAsTenantUser('multiTenant', tenantAData.domain);

            // Load and cache some data
            cy.navigateToModule('employees');
            cy.waitForTableLoad();

            // Verify cache exists
            cy.window().then((win) => {
                const cache = win.localStorage.getItem('employeesCache');
                expect(cache).to.exist;
            });

            // Switch to Tenant B
            cy.switchTenant(tenantBData.domain);

            // Verify Tenant A cache is cleared
            cy.window().then((win) => {
                const cache = win.localStorage.getItem('employeesCache');
                // Cache should be cleared or contain different tenant data
                if (cache) {
                    const cacheData = JSON.parse(cache);
                    expect(cacheData.tenantId).to.not.eq(tenantAData._id);
                }
            });
        });
    });
});