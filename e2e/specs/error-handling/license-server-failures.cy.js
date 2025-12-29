/**
 * E2E Tests for License Server Connection Failures
 * Tests license server unavailability and graceful degradation
 */

describe('License Server Failures', () => {
    beforeEach(() => {
        cy.cleanupTestData();
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('License Server Unavailability', () => {
        it('should handle license server being completely down', () => {
            // Mock license server as unavailable
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                forceNetworkError: true
            }).as('licenseServerDown');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should still allow access with cached license
            cy.navigateToModule('dashboard');
            cy.get('[data-cy="dashboard-content"]').should('be.visible');

            // Should show license server warning
            cy.get('[data-cy="license-server-warning"]').should('be.visible');
            cy.get('[data-cy="license-server-warning"]')
                .should('contain.text', 'License validation temporarily unavailable');
        });

        it('should retry license validation with exponential backoff', () => {
            let attemptCount = 0;
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', (req) => {
                attemptCount++;
                if (attemptCount < 3) {
                    req.reply({ forceNetworkError: true });
                } else {
                    req.reply({
                        statusCode: 200,
                        body: {
                            valid: true,
                            features: ['attendance', 'payroll', 'leave'],
                            expiresAt: '2024-12-31T23:59:59Z'
                        }
                    });
                }
            }).as('licenseValidation');

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('dashboard');

            // Should eventually succeed after retries
            cy.wait('@licenseValidation');
            cy.get('[data-cy="license-status-valid"]').should('be.visible');

            // Verify retry attempts were made
            cy.then(() => {
                expect(attemptCount).to.equal(3);
            });
        });

        it('should use cached license validation when server is down', () => {
            // First, establish a valid license
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    features: ['attendance', 'payroll', 'leave'],
                    expiresAt: '2024-12-31T23:59:59Z',
                    cached: false
                }
            }).as('initialLicenseCheck');

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.wait('@initialLicenseCheck');

            // Now simulate server down
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                forceNetworkError: true
            }).as('licenseServerDown');

            // Refresh page to trigger new license check
            cy.reload();

            // Should use cached validation
            cy.get('[data-cy="license-cached-warning"]').should('be.visible');
            cy.get('[data-cy="dashboard-content"]').should('be.visible');

            // Should still have access to licensed modules
            cy.verifyModuleAccess('attendance', true);
            cy.verifyModuleAccess('payroll', true);
            cy.verifyModuleAccess('leave', true);
        });

        it('should restrict access when cache expires and server is down', () => {
            // Mock expired cached license
            cy.window().then((win) => {
                win.localStorage.setItem('licenseCache', JSON.stringify({
                    valid: true,
                    features: ['attendance', 'payroll'],
                    expiresAt: '2023-01-01T00:00:00Z', // Expired
                    cachedAt: '2023-01-01T00:00:00Z'
                }));
            });

            // License server is down
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                forceNetworkError: true
            }).as('licenseServerDown');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show license expired error
            cy.get('[data-cy="license-expired-error"]').should('be.visible');
            cy.get('[data-cy="license-expired-error"]')
                .should('contain.text', 'License validation failed');

            // Should restrict access to modules
            cy.get('[data-cy="limited-access-notice"]').should('be.visible');
            cy.verifyModuleAccess('attendance', false);
            cy.verifyModuleAccess('payroll', false);
        });
    });

    describe('License Server Timeout Handling', () => {
        it('should handle license server timeout gracefully', () => {
            // Simulate slow license server response
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', (req) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            statusCode: 200,
                            body: {
                                valid: true,
                                features: ['attendance', 'payroll'],
                                expiresAt: '2024-12-31T23:59:59Z'
                            }
                        });
                    }, 15000); // 15 second delay
                });
            }).as('slowLicenseServer');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show license validation timeout
            cy.get('[data-cy="license-timeout-warning"]', { timeout: 12000 }).should('be.visible');

            // Should fall back to cached validation or limited access
            cy.get('[data-cy="limited-access-mode"]').should('be.visible');
        });

        it('should queue license checks during server unavailability', () => {
            // Start with server down
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                forceNetworkError: true
            }).as('licenseServerDown');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Try to access multiple modules (should queue license checks)
            cy.navigateToModule('attendance');
            cy.navigateToModule('payroll');
            cy.navigateToModule('leave');

            // Should show queued license checks
            cy.get('[data-cy="license-checks-queued"]').should('be.visible');

            // Simulate server coming back online
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    features: ['attendance', 'payroll', 'leave'],
                    expiresAt: '2024-12-31T23:59:59Z'
                }
            }).as('licenseServerOnline');

            // Should process queued checks
            cy.get('[data-cy="processing-license-queue"]').should('be.visible');
            cy.wait('@licenseServerOnline');
            cy.get('[data-cy="license-checks-queued"]').should('not.exist');
        });
    });

    describe('License Server Error Responses', () => {
        it('should handle 500 internal server errors', () => {
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                statusCode: 500,
                body: { error: 'Internal server error' }
            }).as('licenseServerError');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show server error message
            cy.get('[data-cy="license-server-error"]').should('be.visible');
            cy.expectErrorMessage('License server error');

            // Should fall back to cached validation
            cy.get('[data-cy="license-fallback-mode"]').should('be.visible');
        });

        it('should handle invalid license responses', () => {
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                statusCode: 200,
                body: {
                    valid: false,
                    error: 'License expired',
                    expiresAt: '2023-01-01T00:00:00Z'
                }
            }).as('invalidLicense');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show license invalid error
            cy.get('[data-cy="license-invalid-error"]').should('be.visible');
            cy.expectErrorMessage('License expired');

            // Should restrict access
            cy.get('[data-cy="access-restricted"]').should('be.visible');
            cy.verifyModuleAccess('attendance', false);
        });

        it('should handle malformed license responses', () => {
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                statusCode: 200,
                body: 'invalid json response'
            }).as('malformedResponse');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show parsing error
            cy.get('[data-cy="license-parse-error"]').should('be.visible');
            cy.expectErrorMessage('License validation error');

            // Should fall back to safe mode
            cy.get('[data-cy="safe-mode-notice"]').should('be.visible');
        });
    });

    describe('License Feature Validation', () => {
        it('should handle partial feature availability during server issues', () => {
            // Mock license with limited features due to server issues
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    features: ['attendance'], // Limited features
                    expiresAt: '2024-12-31T23:59:59Z',
                    serverIssue: true
                }
            }).as('limitedLicense');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show limited feature warning
            cy.get('[data-cy="limited-features-warning"]').should('be.visible');

            // Should allow access to available features
            cy.verifyModuleAccess('attendance', true);

            // Should restrict access to unavailable features
            cy.verifyModuleAccess('payroll', false);
            cy.verifyModuleAccess('leave', false);
        });

        it('should handle license server circuit breaker activation', () => {
            // Simulate multiple failures to trigger circuit breaker
            let failureCount = 0;
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', (req) => {
                failureCount++;
                if (failureCount <= 5) {
                    req.reply({ statusCode: 500, body: { error: 'Server error' } });
                } else {
                    // Circuit breaker should prevent further requests
                    req.reply({ statusCode: 503, body: { error: 'Circuit breaker open' } });
                }
            }).as('circuitBreakerTest');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show circuit breaker activation
            cy.get('[data-cy="circuit-breaker-active"]').should('be.visible');
            cy.get('[data-cy="circuit-breaker-active"]')
                .should('contain.text', 'License service temporarily unavailable');

            // Should use emergency access mode
            cy.get('[data-cy="emergency-access-mode"]').should('be.visible');
        });
    });

    describe('Platform Admin License Management During Failures', () => {
        it('should handle license creation failures', () => {
            cy.loginAsPlatformAdmin();

            // Mock license creation failure
            cy.intercept('POST', 'http://localhost:4000/licenses/create', {
                forceNetworkError: true
            }).as('licenseCreationFailed');

            cy.navigateToPlatformSection('licenses');
            cy.get('[data-cy="create-license-button"]').click();

            cy.fillForm({
                'tenant-id': 'testcompany',
                'features': ['attendance', 'payroll'],
                'max-users': '100',
                'expires-at': '2024-12-31'
            });

            cy.submitForm();

            // Should show creation failure
            cy.get('[data-cy="license-creation-failed"]').should('be.visible');
            cy.expectErrorMessage('Failed to create license');

            // Should allow retry
            cy.get('[data-cy="retry-creation-button"]').should('be.visible');
        });

        it('should handle license validation failures in admin interface', () => {
            cy.loginAsPlatformAdmin();

            // Mock validation failure
            cy.intercept('GET', 'http://localhost:4000/licenses/stats', {
                statusCode: 500,
                body: { error: 'Database connection failed' }
            }).as('statsFailure');

            cy.navigateToPlatformSection('licenses');

            // Should show stats loading error
            cy.get('[data-cy="license-stats-error"]').should('be.visible');
            cy.get('[data-cy="refresh-stats-button"]').should('be.visible');

            // Should still show license list if available
            cy.get('[data-cy="license-table"]').should('be.visible');
        });
    });

    describe('License Server Recovery', () => {
        it('should detect when license server comes back online', () => {
            // Start with server down
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                forceNetworkError: true
            }).as('serverDown');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show offline status
            cy.get('[data-cy="license-server-offline"]').should('be.visible');

            // Simulate server coming back online
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    features: ['attendance', 'payroll', 'leave'],
                    expiresAt: '2024-12-31T23:59:59Z'
                }
            }).as('serverOnline');

            // Should detect server recovery
            cy.get('[data-cy="license-server-recovered"]').should('be.visible');
            cy.expectSuccessMessage('License server connection restored');

            // Should restore full functionality
            cy.verifyModuleAccess('attendance', true);
            cy.verifyModuleAccess('payroll', true);
            cy.verifyModuleAccess('leave', true);
        });

        it('should refresh license data after server recovery', () => {
            // Start with cached license
            cy.window().then((win) => {
                win.localStorage.setItem('licenseCache', JSON.stringify({
                    valid: true,
                    features: ['attendance'],
                    expiresAt: '2024-12-31T23:59:59Z',
                    cachedAt: new Date().toISOString()
                }));
            });

            // Server initially down
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                forceNetworkError: true
            }).as('serverDown');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should use cached license
            cy.verifyModuleAccess('attendance', true);
            cy.verifyModuleAccess('payroll', false);

            // Server comes back with updated license
            cy.intercept('POST', 'http://localhost:4000/licenses/validate', {
                statusCode: 200,
                body: {
                    valid: true,
                    features: ['attendance', 'payroll', 'leave'], // More features
                    expiresAt: '2024-12-31T23:59:59Z'
                }
            }).as('serverOnline');

            // Should refresh and get updated features
            cy.get('[data-cy="refresh-license-button"]').click();
            cy.wait('@serverOnline');

            // Should now have access to all features
            cy.verifyModuleAccess('attendance', true);
            cy.verifyModuleAccess('payroll', true);
            cy.verifyModuleAccess('leave', true);
        });
    });
});