/**
 * E2E Tests for License-Based Access Control in Multi-Tenant Environment
 * 
 * These tests verify that module access is properly restricted based on
 * tenant licenses and that license validation maintains data isolation.
 */

describe('License-Based Access Control', () => {
    let tenantAData, tenantBData, tenantCData;

    before(() => {
        // Load test fixtures
        cy.fixture('tenants').then((tenants) => {
            tenantAData = tenants.tenantA;
            tenantBData = tenants.tenantB;
            tenantCData = tenants.tenantC || {
                _id: '507f1f77bcf86cd799439013',
                name: 'StartupCorp',
                domain: 'startup',
                subscription: {
                    plan: 'basic',
                    enabledModules: ['attendance', 'leave'],
                    maxUsers: 50,
                    expiryDate: '2025-06-30T23:59:59Z'
                }
            };
        });
    });

    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Seed test data for all tenants
        cy.seedTestData('tenant', [tenantAData, tenantBData, tenantCData]);
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Module Access Based on License', () => {
        it('should restrict module access based on tenant license configuration', () => {
            // Mock license validation for Tenant C (basic plan with limited modules)
            cy.intercept('GET', '**/license/validate', (req) => {
                if (req.headers['x-tenant-id'] === tenantCData._id) {
                    req.reply({
                        statusCode: 200,
                        body: {
                            valid: true,
                            tenantId: tenantCData._id,
                            plan: 'basic',
                            enabledModules: ['attendance', 'leave'], // Limited modules
                            maxUsers: 50,
                            expiresAt: '2025-06-30T23:59:59Z',
                            features: {
                                reports: false,
                                payroll: false,
                                tasks: false,
                                documents: false,
                                analytics: false
                            }
                        }
                    });
                } else {
                    req.reply({
                        statusCode: 200,
                        body: {
                            valid: true,
                            tenantId: req.headers['x-tenant-id'],
                            plan: 'enterprise',
                            enabledModules: ['attendance', 'leave', 'payroll', 'tasks', 'documents', 'reports'],
                            maxUsers: 500,
                            expiresAt: '2025-12-31T23:59:59Z',
                            features: {
                                reports: true,
                                payroll: true,
                                tasks: true,
                                documents: true,
                                analytics: true
                            }
                        }
                    });
                }
            }).as('licenseValidation');

            // Login as user for Tenant C (basic plan)
            cy.loginAsTenantUser('employee', tenantCData.domain);

            // Should have access to enabled modules
            cy.verifyModuleAccess('attendance', true);
            cy.verifyModuleAccess('leave', true);

            // Should not have access to disabled modules
            cy.verifyModuleAccess('payroll', false);
            cy.verifyModuleAccess('tasks', false);
            cy.verifyModuleAccess('documents', false);
            cy.verifyModuleAccess('reports', false);

            // Verify navigation restrictions
            cy.visit(`http://localhost:3000/${tenantCData.domain}/payroll`, { failOnStatusCode: false });
            cy.url().should('satisfy', (url) => {
                return url.includes('/access-denied') ||
                    url.includes('/dashboard') ||
                    url.includes('/upgrade-required');
            });
        });

        it('should allow full module access for enterprise license', () => {
            // Login as user for Tenant A (enterprise plan)
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Should have access to all modules
            const allModules = ['attendance', 'leave', 'payroll', 'tasks', 'documents', 'reports'];
            allModules.forEach(module => {
                cy.verifyModuleAccess(module, true);
            });

            // Verify advanced features are available
            cy.navigateToModule('reports');
            cy.get('[data-cy="advanced-analytics"]').should('be.visible');
            cy.get('[data-cy="custom-reports"]').should('be.visible');
            cy.get('[data-cy="export-options"]').should('be.visible');
        });

        it('should handle license validation failures gracefully', () => {
            // Mock license validation failure
            cy.intercept('GET', '**/license/validate', {
                statusCode: 403,
                body: {
                    valid: false,
                    error: 'License validation failed',
                    code: 'LICENSE_INVALID'
                }
            }).as('licenseFailure');

            // Try to login as user
            cy.visit(`http://localhost:3000/${tenantAData.domain}/login`);
            cy.fixture('users').then((users) => {
                const user = users.employee;
                cy.get('[data-cy="email-input"]').type(user.email);
                cy.get('[data-cy="password-input"]').type(user.password);
                cy.get('[data-cy="login-button"]').click();
            });

            // Should show license error message
            cy.get('[data-cy="license-error"]').should('be.visible');
            cy.get('[data-cy="license-error"]').should('contain.text', 'License validation failed');

            // Should not be able to access the application
            cy.get('[data-cy="dashboard-content"]').should('not.exist');
        });
    });

    describe('User Limit Enforcement', () => {
        it('should enforce user limits based on license', () => {
            // Mock license with user limit
            cy.intercept('GET', '**/license/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    tenantId: tenantCData._id,
                    plan: 'basic',
                    enabledModules: ['attendance', 'leave'],
                    maxUsers: 2, // Very low limit for testing
                    currentUsers: 1,
                    expiresAt: '2025-06-30T23:59:59Z'
                }
            }).as('limitedLicense');

            // Login as admin for Tenant C
            cy.loginAsTenantUser('admin', tenantCData.domain);
            cy.navigateToModule('employees');

            // Try to add a new employee that would exceed the limit
            cy.get('[data-cy="add-employee-button"]').click();
            cy.fillForm({
                name: 'New Employee',
                email: 'new@startup.com',
                role: 'employee',
                department: 'Engineering'
            });
            cy.submitForm();

            // Should show user limit exceeded error
            cy.expectErrorMessage('User limit exceeded');
            cy.get('[data-cy="upgrade-prompt"]').should('be.visible');
            cy.get('[data-cy="upgrade-prompt"]').should('contain.text', 'upgrade your plan');
        });

        it('should allow user creation within license limits', () => {
            // Mock license with available user slots
            cy.intercept('GET', '**/license/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    tenantId: tenantCData._id,
                    plan: 'basic',
                    enabledModules: ['attendance', 'leave'],
                    maxUsers: 50,
                    currentUsers: 10,
                    expiresAt: '2025-06-30T23:59:59Z'
                }
            }).as('availableLicense');

            // Login as admin for Tenant C
            cy.loginAsTenantUser('admin', tenantCData.domain);
            cy.navigateToModule('employees');

            // Add a new employee within limits
            cy.get('[data-cy="add-employee-button"]').click();
            cy.fillForm({
                name: 'New Employee',
                email: 'new@startup.com',
                role: 'employee',
                department: 'Engineering'
            });
            cy.submitForm();

            // Should succeed
            cy.expectSuccessMessage('Employee added successfully');
        });
    });

    describe('License Expiry Handling', () => {
        it('should handle expired licenses', () => {
            // Mock expired license
            cy.intercept('GET', '**/license/validate', {
                statusCode: 403,
                body: {
                    valid: false,
                    error: 'License expired',
                    code: 'LICENSE_EXPIRED',
                    expiresAt: '2023-12-31T23:59:59Z'
                }
            }).as('expiredLicense');

            // Try to access the application
            cy.visit(`http://localhost:3000/${tenantAData.domain}/dashboard`, { failOnStatusCode: false });

            // Should show license expired message
            cy.get('[data-cy="license-expired"]').should('be.visible');
            cy.get('[data-cy="license-expired"]').should('contain.text', 'License has expired');
            cy.get('[data-cy="contact-admin"]').should('be.visible');

            // Should not be able to access any functionality
            cy.get('[data-cy="sidebar-menu"]').should('not.exist');
            cy.get('[data-cy="dashboard-content"]').should('not.exist');
        });

        it('should show license expiry warnings', () => {
            // Mock license expiring soon
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7); // Expires in 7 days

            cy.intercept('GET', '**/license/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    tenantId: tenantAData._id,
                    plan: 'enterprise',
                    enabledModules: ['attendance', 'leave', 'payroll', 'tasks', 'documents', 'reports'],
                    maxUsers: 500,
                    expiresAt: expiryDate.toISOString(),
                    warning: 'License expires soon'
                }
            }).as('expiringLicense');

            // Login as admin
            cy.loginAsTenantUser('admin', tenantAData.domain);

            // Should show expiry warning
            cy.get('[data-cy="license-warning"]').should('be.visible');
            cy.get('[data-cy="license-warning"]').should('contain.text', 'expires in 7 days');
            cy.get('[data-cy="renew-license"]').should('be.visible');

            // Should still allow normal functionality
            cy.navigateToModule('dashboard');
            cy.get('[data-cy="dashboard-content"]').should('be.visible');
        });
    });

    describe('Feature Flag Enforcement', () => {
        it('should enforce feature flags based on license', () => {
            // Mock license with specific feature restrictions
            cy.intercept('GET', '**/license/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    tenantId: tenantCData._id,
                    plan: 'basic',
                    enabledModules: ['attendance', 'leave', 'reports'],
                    maxUsers: 50,
                    expiresAt: '2025-06-30T23:59:59Z',
                    features: {
                        advancedReports: false,
                        customFields: false,
                        apiAccess: false,
                        bulkOperations: false,
                        dataExport: false
                    }
                }
            }).as('restrictedFeatures');

            // Login as user for Tenant C
            cy.loginAsTenantUser('employee', tenantCData.domain);

            // Navigate to reports module (allowed)
            cy.navigateToModule('reports');

            // Should not have access to advanced features
            cy.get('[data-cy="advanced-reports"]').should('not.exist');
            cy.get('[data-cy="custom-report-builder"]').should('not.exist');
            cy.get('[data-cy="export-to-excel"]').should('not.exist');

            // Should only have basic reporting features
            cy.get('[data-cy="basic-reports"]').should('be.visible');
            cy.get('[data-cy="standard-templates"]').should('be.visible');
        });

        it('should enable premium features for enterprise license', () => {
            // Login as user for Tenant A (enterprise)
            cy.loginAsTenantUser('admin', tenantAData.domain);

            // Navigate to reports module
            cy.navigateToModule('reports');

            // Should have access to all features
            cy.get('[data-cy="advanced-reports"]').should('be.visible');
            cy.get('[data-cy="custom-report-builder"]').should('be.visible');
            cy.get('[data-cy="export-options"]').should('be.visible');
            cy.get('[data-cy="api-access"]').should('be.visible');

            // Navigate to employees module
            cy.navigateToModule('employees');

            // Should have bulk operations
            cy.get('[data-cy="bulk-actions"]').should('be.visible');
            cy.get('[data-cy="import-employees"]').should('be.visible');
            cy.get('[data-cy="export-employees"]').should('be.visible');
        });
    });

    describe('License Server Integration', () => {
        it('should handle license server unavailability', () => {
            // Mock license server unavailable
            cy.intercept('GET', '**/license/validate', { forceNetworkError: true }).as('serverUnavailable');

            // Try to access the application
            cy.visit(`http://localhost:3000/${tenantAData.domain}/dashboard`, { failOnStatusCode: false });

            // Should show license server error
            cy.get('[data-cy="license-server-error"]').should('be.visible');
            cy.get('[data-cy="license-server-error"]').should('contain.text', 'Unable to validate license');

            // Should provide retry option
            cy.get('[data-cy="retry-license-validation"]').should('be.visible');

            // Mock successful retry
            cy.intercept('GET', '**/license/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    tenantId: tenantAData._id,
                    plan: 'enterprise',
                    enabledModules: ['attendance', 'leave', 'payroll', 'tasks', 'documents', 'reports'],
                    maxUsers: 500,
                    expiresAt: '2025-12-31T23:59:59Z'
                }
            }).as('retrySuccess');

            // Click retry
            cy.get('[data-cy="retry-license-validation"]').click();

            // Should now work normally
            cy.get('[data-cy="dashboard-content"]').should('be.visible');
        });

        it('should cache license validation to reduce server calls', () => {
            let validationCallCount = 0;

            // Mock license validation with call counting
            cy.intercept('GET', '**/license/validate', (req) => {
                validationCallCount++;
                req.reply({
                    statusCode: 200,
                    body: {
                        valid: true,
                        tenantId: tenantAData._id,
                        plan: 'enterprise',
                        enabledModules: ['attendance', 'leave', 'payroll', 'tasks', 'documents', 'reports'],
                        maxUsers: 500,
                        expiresAt: '2025-12-31T23:59:59Z',
                        cacheFor: 300 // 5 minutes
                    }
                });
            }).as('cachedValidation');

            // Login and navigate through multiple modules
            cy.loginAsTenantUser('employee', tenantAData.domain);
            cy.navigateToModule('attendance');
            cy.navigateToModule('leave');
            cy.navigateToModule('tasks');

            // Should have made minimal license validation calls due to caching
            cy.then(() => {
                expect(validationCallCount).to.be.lessThan(3);
            });
        });
    });

    describe('Cross-Tenant License Isolation', () => {
        it('should prevent license information leakage between tenants', () => {
            // Mock different licenses for different tenants
            cy.intercept('GET', '**/license/validate', (req) => {
                const tenantId = req.headers['x-tenant-id'];

                if (tenantId === tenantAData._id) {
                    req.reply({
                        statusCode: 200,
                        body: {
                            valid: true,
                            tenantId: tenantAData._id,
                            plan: 'enterprise',
                            enabledModules: ['attendance', 'leave', 'payroll', 'tasks', 'documents', 'reports'],
                            maxUsers: 500,
                            expiresAt: '2025-12-31T23:59:59Z'
                        }
                    });
                } else if (tenantId === tenantBData._id) {
                    req.reply({
                        statusCode: 200,
                        body: {
                            valid: true,
                            tenantId: tenantBData._id,
                            plan: 'professional',
                            enabledModules: ['attendance', 'leave', 'tasks'],
                            maxUsers: 100,
                            expiresAt: '2025-08-31T23:59:59Z'
                        }
                    });
                }
            }).as('isolatedLicenses');

            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Should have enterprise features
            cy.navigateToModule('reports');
            cy.get('[data-cy="advanced-reports"]').should('be.visible');

            // Switch to Tenant B (if multi-tenant user)
            // For this test, we'll simulate by logging out and logging into Tenant B
            cy.logout();
            cy.loginAsTenantUser('employee', tenantBData.domain);

            // Should have different license restrictions
            cy.get('[data-cy="menu-payroll"]').should('not.exist');
            cy.get('[data-cy="menu-documents"]').should('not.exist');
            cy.get('[data-cy="menu-reports"]').should('not.exist');

            // Should only have access to professional plan modules
            cy.verifyModuleAccess('attendance', true);
            cy.verifyModuleAccess('leave', true);
            cy.verifyModuleAccess('tasks', true);
        });

        it('should validate license context matches tenant context', () => {
            // Mock license validation that checks tenant context
            cy.intercept('GET', '**/license/validate', (req) => {
                const tenantId = req.headers['x-tenant-id'];
                const authToken = req.headers['authorization'];

                // Simulate license-tenant mismatch detection
                if (tenantId === tenantBData._id && authToken.includes('tenant-a-token')) {
                    req.reply({
                        statusCode: 403,
                        body: {
                            valid: false,
                            error: 'License-tenant context mismatch',
                            code: 'CONTEXT_MISMATCH'
                        }
                    });
                } else {
                    req.reply({
                        statusCode: 200,
                        body: {
                            valid: true,
                            tenantId: tenantId,
                            plan: 'enterprise',
                            enabledModules: ['attendance', 'leave', 'payroll', 'tasks', 'documents', 'reports'],
                            maxUsers: 500,
                            expiresAt: '2025-12-31T23:59:59Z'
                        }
                    });
                }
            }).as('contextValidation');

            // Login as user for Tenant A
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Try to access Tenant B with Tenant A credentials
            cy.visit(`http://localhost:3000/${tenantBData.domain}/dashboard`, { failOnStatusCode: false });

            // Should detect context mismatch and deny access
            cy.get('[data-cy="context-mismatch-error"]').should('be.visible');
            cy.get('[data-cy="context-mismatch-error"]').should('contain.text', 'License-tenant context mismatch');
        });
    });

    describe('Platform Admin License Management', () => {
        it('should allow platform admins to view all tenant licenses', () => {
            // Login as platform admin
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('licenses');

            // Should see licenses for all tenants
            cy.get('[data-cy="licenses-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length.at.least', 2);

            // Should be able to filter by tenant
            cy.get('[data-cy="tenant-filter"]').select(tenantAData.name);
            cy.waitForTableLoad();

            // Should see only Tenant A licenses
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).should('contain.text', tenantAData.name);
            });
        });

        it('should allow platform admins to manage tenant licenses', () => {
            // Login as platform admin
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('licenses');

            // Create new license for tenant
            cy.get('[data-cy="create-license-button"]').click();
            cy.fillForm({
                tenantId: tenantCData._id,
                plan: 'professional',
                maxUsers: 100,
                enabledModules: ['attendance', 'leave', 'tasks', 'reports'],
                expiryDate: '2025-12-31'
            });
            cy.submitForm();
            cy.expectSuccessMessage('License created successfully');

            // Verify license appears in table
            cy.get('[data-cy="table-row"]').should('contain.text', tenantCData.name);
            cy.get('[data-cy="table-row"]').should('contain.text', 'professional');

            // Update license
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action-edit"]').click();
            });

            cy.fillForm({
                maxUsers: 150,
                enabledModules: ['attendance', 'leave', 'tasks', 'reports', 'payroll']
            });
            cy.submitForm();
            cy.expectSuccessMessage('License updated successfully');

            // Revoke license
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action-revoke"]').click();
            });
            cy.confirmDialog();
            cy.expectSuccessMessage('License revoked successfully');
        });
    });

    describe('Audit and Compliance', () => {
        it('should log license validation events for audit', () => {
            // Login as user
            cy.loginAsTenantUser('employee', tenantAData.domain);

            // Perform actions that require license validation
            cy.navigateToModule('reports');
            cy.get('[data-cy="generate-report"]').click();

            // Login as platform admin to check audit logs
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('audit-logs');

            // Filter by license events
            cy.get('[data-cy="event-type-filter"]').select('license_validation');
            cy.get('[data-cy="tenant-filter"]').select(tenantAData.name);
            cy.waitForTableLoad();

            // Should see license validation events
            cy.get('[data-cy="table-row"]').should('contain.text', 'license_validation');
            cy.get('[data-cy="table-row"]').should('contain.text', tenantAData.name);

            // View audit details
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action-view"]').click();
            });

            cy.get('[data-cy="audit-details"]').should('be.visible');
            cy.get('[data-cy="audit-details"]').should('contain.text', 'License validated successfully');
        });

        it('should track license usage metrics', () => {
            // Login as platform admin
            cy.loginAsPlatformAdmin();
            cy.navigateToPlatformSection('analytics');

            // View license usage dashboard
            cy.get('[data-cy="license-usage-tab"]').click();

            // Should show usage metrics for all tenants
            cy.get('[data-cy="usage-chart"]').should('be.visible');
            cy.get('[data-cy="tenant-usage-table"]').should('be.visible');

            // Should show user count vs license limits
            cy.get('[data-cy="user-utilization"]').should('be.visible');
            cy.get('[data-cy="module-usage"]').should('be.visible');

            // Should highlight tenants approaching limits
            cy.get('[data-cy="limit-warnings"]').should('be.visible');
        });
    });
});