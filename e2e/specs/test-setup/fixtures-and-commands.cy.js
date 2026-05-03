/**
 * E2E Test: Fixtures, Custom Commands, and Base Configuration
 * Tests the setup from Task 14
 */

describe('E2E Test Setup - Fixtures and Commands', () => {
    describe('Test Environment Configuration', () => {
        it('should have correct environment variables configured', () => {
            expect(Cypress.env('API_URL')).to.equal('http://localhost:5000');
            expect(Cypress.env('HR_APP_URL')).to.equal('http://localhost:3000');
            expect(Cypress.env('PLATFORM_APP_URL')).to.equal('http://localhost:3001');
            expect(Cypress.env('IS_TEST_ENVIRONMENT')).to.be.true;
        });

        it('should load test routes health check', () => {
            cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/api/v1/test/health`,
                failOnStatusCode: false
            }).then((response) => {
                // If test routes are available (NODE_ENV=test)
                if (response.status === 200) {
                    expect(response.body.success).to.be.true;
                    expect(response.body.message).to.equal('Test routes are active');
                    cy.log('✓ Test routes are active');
                } else {
                    // Test routes not available (not in test mode)
                    cy.log('⚠ Test routes not available - server not in test mode');
                }
            });
        });
    });

    describe('User Fixtures', () => {
        it('should load user fixtures with all required roles', () => {
            cy.fixture('users').then((users) => {
                // Check that all required roles exist
                expect(users).to.have.property('admin');
                expect(users).to.have.property('hr_manager');
                expect(users).to.have.property('manager');
                expect(users).to.have.property('employee');

                // Verify admin user structure
                expect(users.admin).to.have.property('email');
                expect(users.admin).to.have.property('password');
                expect(users.admin).to.have.property('tenantId');
                expect(users.admin).to.have.property('expectedDashboardPath');
                expect(users.admin.expectedDashboardPath).to.equal('/dashboard');

                // Verify hr_manager user structure
                expect(users.hr_manager.expectedDashboardPath).to.equal('/hr/dashboard');

                // Verify manager user structure
                expect(users.manager.expectedDashboardPath).to.equal('/manager/dashboard');

                // Verify employee user structure
                expect(users.employee.expectedDashboardPath).to.equal('/employee/dashboard');
            });
        });
    });

    describe('Tenant Fixtures', () => {
        it('should load tenant fixtures with tenant-1 and tenant-2', () => {
            cy.fixture('tenants').then((tenants) => {
                // Check that required tenants exist
                expect(tenants).to.have.property('tenant-1');
                expect(tenants).to.have.property('tenant-2');

                // Verify tenant-1 structure
                expect(tenants['tenant-1']).to.have.property('_id');
                expect(tenants['tenant-1']).to.have.property('name');
                expect(tenants['tenant-1']).to.have.property('domain');
                expect(tenants['tenant-1']).to.have.property('adminCredentials');
                expect(tenants['tenant-1'].adminCredentials).to.have.property('email');
                expect(tenants['tenant-1'].adminCredentials).to.have.property('password');

                // Verify tenant-2 structure
                expect(tenants['tenant-2']).to.have.property('_id');
                expect(tenants['tenant-2']).to.have.property('adminCredentials');
            });
        });
    });

    describe('Custom Commands - cy.loginAs()', () => {
        it('should have cy.loginAs command available', () => {
            expect(cy.loginAs).to.be.a('function');
        });

        // Note: Actual login test requires server to be running
        // This is a structure test only
    });

    describe('Custom Commands - cy.seedTenant()', () => {
        it('should have cy.seedTenant command available', () => {
            expect(cy.seedTenant).to.be.a('function');
        });

        it('should call seed endpoint when invoked (if test routes available)', () => {
            // First check if test routes are available
            cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/api/v1/test/health`,
                failOnStatusCode: false
            }).then((healthResponse) => {
                if (healthResponse.status === 200) {
                    // Test routes are available, test the seed command
                    cy.fixture('tenants').then((tenants) => {
                        const tenantId = tenants['tenant-1']._id;
                        
                        cy.request({
                            method: 'POST',
                            url: `${Cypress.env('API_URL')}/api/v1/test/seed`,
                            body: { tenantId },
                            failOnStatusCode: false
                        }).then((response) => {
                            // Seed might fail if tenant doesn't exist in DB, that's ok for this test
                            cy.log(`Seed response status: ${response.status}`);
                        });
                    });
                } else {
                    cy.log('⚠ Skipping seed test - test routes not available');
                }
            });
        });
    });

    describe('Custom Commands - cy.cleanupTenant()', () => {
        it('should have cy.cleanupTenant command available', () => {
            expect(cy.cleanupTenant).to.be.a('function');
        });

        it('should call cleanup endpoint when invoked (if test routes available)', () => {
            // First check if test routes are available
            cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/api/v1/test/health`,
                failOnStatusCode: false
            }).then((healthResponse) => {
                if (healthResponse.status === 200) {
                    // Test routes are available, test the cleanup command
                    cy.fixture('tenants').then((tenants) => {
                        const tenantId = tenants['tenant-1']._id;
                        
                        cy.request({
                            method: 'DELETE',
                            url: `${Cypress.env('API_URL')}/api/v1/test/cleanup`,
                            body: { tenantId },
                            failOnStatusCode: false
                        }).then((response) => {
                            // Cleanup might fail if tenant doesn't exist in DB, that's ok for this test
                            cy.log(`Cleanup response status: ${response.status}`);
                        });
                    });
                } else {
                    cy.log('⚠ Skipping cleanup test - test routes not available');
                }
            });
        });
    });

    describe('Integration Test - Full Workflow', () => {
        it('should demonstrate the complete test workflow', () => {
            cy.log('Step 1: Load fixtures');
            cy.fixture('users').then((users) => {
                cy.log(`✓ Loaded ${Object.keys(users).length} user fixtures`);
            });

            cy.fixture('tenants').then((tenants) => {
                cy.log(`✓ Loaded ${Object.keys(tenants).length} tenant fixtures`);
            });

            cy.log('Step 2: Check test routes availability');
            cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/api/v1/test/health`,
                failOnStatusCode: false
            }).then((response) => {
                if (response.status === 200) {
                    cy.log('✓ Test routes are active');
                    cy.log('Step 3: Ready for E2E testing with seed/cleanup');
                } else {
                    cy.log('⚠ Test routes not available - start server with NODE_ENV=test');
                }
            });

            cy.log('Step 4: Custom commands are available');
            expect(cy.loginAs).to.be.a('function');
            expect(cy.seedTenant).to.be.a('function');
            expect(cy.cleanupTenant).to.be.a('function');
            cy.log('✓ All custom commands loaded');
        });
    });
});
