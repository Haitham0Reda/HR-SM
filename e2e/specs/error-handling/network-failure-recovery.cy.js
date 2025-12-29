/**
 * E2E Tests for Network Failure Recovery and Retry Logic
 * Tests network failure scenarios and automatic retry mechanisms
 */

describe('Network Failure Recovery', () => {
    beforeEach(() => {
        cy.cleanupTestData();
        cy.visit('http://localhost:3000/testcompany/login');
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('API Request Retry Logic', () => {
        it('should retry failed API requests with exponential backoff', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Intercept API calls and simulate network failures
            let attemptCount = 0;
            cy.intercept('GET', '/api/employees/profile', (req) => {
                attemptCount++;
                if (attemptCount < 3) {
                    req.reply({ forceNetworkError: true });
                } else {
                    req.reply({
                        statusCode: 200,
                        body: {
                            id: '1',
                            name: 'Test Employee',
                            email: 'test@testcompany.com'
                        }
                    });
                }
            }).as('profileRequest');

            // Navigate to profile page
            cy.navigateToModule('profile');

            // Should show loading state initially
            cy.get('[data-cy="loading-spinner"]').should('be.visible');

            // Should eventually succeed after retries
            cy.wait('@profileRequest');
            cy.get('[data-cy="profile-content"]').should('be.visible');
            cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');

            // Verify retry attempts were made
            cy.then(() => {
                expect(attemptCount).to.equal(3);
            });
        });

        it('should show error message after max retry attempts exceeded', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Intercept and always fail
            cy.intercept('GET', '/api/employees/profile', {
                forceNetworkError: true
            }).as('failedRequest');

            cy.navigateToModule('profile');

            // Should show error message after retries exhausted
            cy.get('[data-cy="network-error"]', { timeout: 15000 }).should('be.visible');
            cy.get('[data-cy="retry-button"]').should('be.visible');
            cy.expectErrorMessage('Network connection failed');
        });

        it('should allow manual retry after network failure', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            let requestCount = 0;
            cy.intercept('GET', '/api/employees/profile', (req) => {
                requestCount++;
                if (requestCount === 1) {
                    req.reply({ forceNetworkError: true });
                } else {
                    req.reply({
                        statusCode: 200,
                        body: {
                            id: '1',
                            name: 'Test Employee',
                            email: 'test@testcompany.com'
                        }
                    });
                }
            }).as('profileRequest');

            cy.navigateToModule('profile');

            // Wait for error state
            cy.get('[data-cy="network-error"]', { timeout: 15000 }).should('be.visible');

            // Click retry button
            cy.get('[data-cy="retry-button"]').click();

            // Should succeed on manual retry
            cy.wait('@profileRequest');
            cy.get('[data-cy="profile-content"]').should('be.visible');
            cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
        });
    });

    describe('Form Submission Retry Logic', () => {
        it('should retry form submissions on network failure', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            let submitCount = 0;
            cy.intercept('POST', '/api/leave-requests', (req) => {
                submitCount++;
                if (submitCount < 2) {
                    req.reply({ forceNetworkError: true });
                } else {
                    req.reply({
                        statusCode: 201,
                        body: {
                            id: '123',
                            status: 'pending',
                            message: 'Leave request submitted successfully'
                        }
                    });
                }
            }).as('leaveRequest');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            // Fill form
            cy.fillForm({
                'leave-type': 'vacation',
                'start-date': '2024-01-15',
                'end-date': '2024-01-17',
                'reason': 'Family vacation'
            });

            cy.submitForm();

            // Should show submitting state
            cy.get('[data-cy="submitting-spinner"]').should('be.visible');

            // Should eventually succeed
            cy.wait('@leaveRequest');
            cy.expectSuccessMessage('Leave request submitted successfully');

            // Verify retry attempts
            cy.then(() => {
                expect(submitCount).to.equal(2);
            });
        });

        it('should preserve form data during retry attempts', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Always fail network requests
            cy.intercept('POST', '/api/leave-requests', {
                forceNetworkError: true
            }).as('failedSubmit');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            const formData = {
                'leave-type': 'vacation',
                'start-date': '2024-01-15',
                'end-date': '2024-01-17',
                'reason': 'Family vacation'
            };

            cy.fillForm(formData);
            cy.submitForm();

            // Wait for error
            cy.get('[data-cy="form-error"]', { timeout: 15000 }).should('be.visible');

            // Verify form data is preserved
            cy.get('[data-cy="leave-type-input"]').should('have.value', 'vacation');
            cy.get('[data-cy="start-date-input"]').should('have.value', '2024-01-15');
            cy.get('[data-cy="end-date-input"]').should('have.value', '2024-01-17');
            cy.get('[data-cy="reason-input"]').should('have.value', 'Family vacation');
        });
    });

    describe('Real-time Connection Recovery', () => {
        it('should reconnect WebSocket on connection loss', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            // Mock WebSocket connection
            cy.window().then((win) => {
                // Simulate WebSocket connection
                win.mockWebSocket = {
                    readyState: 1, // OPEN
                    close: cy.stub(),
                    send: cy.stub()
                };
            });

            cy.navigateToModule('dashboard');

            // Simulate connection loss
            cy.window().then((win) => {
                win.mockWebSocket.readyState = 3; // CLOSED
                win.dispatchEvent(new Event('offline'));
            });

            // Should show offline indicator
            cy.get('[data-cy="offline-indicator"]').should('be.visible');

            // Simulate connection restored
            cy.window().then((win) => {
                win.mockWebSocket.readyState = 1; // OPEN
                win.dispatchEvent(new Event('online'));
            });

            // Should hide offline indicator
            cy.get('[data-cy="offline-indicator"]').should('not.exist');
            cy.get('[data-cy="online-indicator"]').should('be.visible');
        });

        it('should queue actions during offline state', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Simulate offline state
            cy.window().then((win) => {
                win.dispatchEvent(new Event('offline'));
            });

            cy.navigateToModule('attendance');

            // Try to clock in while offline
            cy.get('[data-cy="clock-in-button"]').click();

            // Should show queued action indicator
            cy.get('[data-cy="queued-actions"]').should('be.visible');
            cy.get('[data-cy="queued-count"]').should('contain.text', '1');

            // Simulate coming back online
            cy.window().then((win) => {
                win.dispatchEvent(new Event('online'));
            });

            // Should process queued actions
            cy.get('[data-cy="processing-queue"]').should('be.visible');
            cy.get('[data-cy="queued-actions"]').should('not.exist');
            cy.expectSuccessMessage('Clock in recorded');
        });
    });

    describe('Timeout Handling', () => {
        it('should handle request timeouts gracefully', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Intercept with long delay to simulate timeout
            cy.intercept('GET', '/api/employees/profile', (req) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            statusCode: 200,
                            body: { id: '1', name: 'Test Employee' }
                        });
                    }, 15000); // 15 second delay
                });
            }).as('slowRequest');

            cy.navigateToModule('profile');

            // Should show timeout error
            cy.get('[data-cy="timeout-error"]', { timeout: 12000 }).should('be.visible');
            cy.expectErrorMessage('Request timed out');
        });

        it('should allow extending timeout for large operations', () => {
            cy.loginAsPlatformAdmin();

            // Simulate bulk operation with extended timeout
            cy.intercept('POST', '/api/platform/bulk-import', (req) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            statusCode: 200,
                            body: { imported: 1000, message: 'Bulk import completed' }
                        });
                    }, 8000); // 8 second delay
                });
            }).as('bulkImport');

            cy.navigateToPlatformSection('users');
            cy.get('[data-cy="bulk-import-button"]').click();

            // Upload file
            cy.uploadFile('bulk-users.csv');
            cy.get('[data-cy="import-button"]').click();

            // Should show extended timeout message
            cy.get('[data-cy="long-operation-notice"]').should('be.visible');

            // Should eventually complete
            cy.wait('@bulkImport', { timeout: 30000 });
            cy.expectSuccessMessage('Bulk import completed');
        });
    });

    describe('Progressive Enhancement', () => {
        it('should work with JavaScript disabled', () => {
            // Disable JavaScript
            cy.visit('http://localhost:3000/testcompany/login', {
                onBeforeLoad: (win) => {
                    win.eval = () => { throw new Error('JavaScript disabled'); };
                }
            });

            // Should show no-script fallback
            cy.get('[data-cy="no-script-message"]').should('be.visible');
            cy.get('[data-cy="basic-login-form"]').should('be.visible');
        });

        it('should degrade gracefully when features are unavailable', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock feature detection failure
            cy.window().then((win) => {
                win.navigator.serviceWorker = undefined;
                win.WebSocket = undefined;
            });

            cy.navigateToModule('dashboard');

            // Should show feature unavailable notices
            cy.get('[data-cy="offline-mode-unavailable"]').should('be.visible');
            cy.get('[data-cy="realtime-updates-unavailable"]').should('be.visible');

            // Core functionality should still work
            cy.get('[data-cy="dashboard-content"]').should('be.visible');
        });
    });
});