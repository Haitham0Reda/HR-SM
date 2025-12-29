/**
 * E2E Tests for Database Connection Failures
 * Tests database unavailability and data consistency scenarios
 */

describe('Database Connection Failures', () => {
    beforeEach(() => {
        cy.cleanupTestData();
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Database Unavailability', () => {
        it('should handle complete database connection loss', () => {
            // Mock all database operations as failing
            cy.intercept('GET', '/api/**', {
                statusCode: 503,
                body: { error: 'Database connection failed' }
            }).as('databaseDown');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show database error message
            cy.get('[data-cy="database-error"]').should('be.visible');
            cy.expectErrorMessage('Database temporarily unavailable');

            // Should show offline mode option
            cy.get('[data-cy="offline-mode-button"]').should('be.visible');
        });

        it('should retry database operations with exponential backoff', () => {
            let attemptCount = 0;
            cy.intercept('GET', '/api/employees/profile', (req) => {
                attemptCount++;
                if (attemptCount < 3) {
                    req.reply({
                        statusCode: 503,
                        body: { error: 'Database connection timeout' }
                    });
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

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            // Should eventually succeed after retries
            cy.wait('@profileRequest');
            cy.get('[data-cy="profile-content"]').should('be.visible');

            // Verify retry attempts
            cy.then(() => {
                expect(attemptCount).to.equal(3);
            });
        });

        it('should enable offline mode when database is unavailable', () => {
            // Mock database as unavailable
            cy.intercept('GET', '/api/**', {
                statusCode: 503,
                body: { error: 'Database unavailable' }
            }).as('databaseUnavailable');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Enable offline mode
            cy.get('[data-cy="offline-mode-button"]').click();
            cy.get('[data-cy="offline-mode-active"]').should('be.visible');

            // Should show cached data
            cy.navigateToModule('profile');
            cy.get('[data-cy="cached-data-notice"]').should('be.visible');
            cy.get('[data-cy="profile-content"]').should('be.visible');

            // Should allow limited operations
            cy.get('[data-cy="offline-operations"]').should('be.visible');
        });
    });

    describe('Transaction Failures', () => {
        it('should handle transaction rollback on partial failures', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            // Mock transaction failure scenario
            cy.intercept('POST', '/api/leave-requests/bulk-approve', {
                statusCode: 500,
                body: {
                    error: 'Transaction failed',
                    message: 'Database transaction was rolled back',
                    rollback: true
                }
            }).as('transactionFailure');

            cy.navigateToModule('leave');
            cy.get('[data-cy="pending-requests-tab"]').click();

            // Select multiple requests for bulk approval
            cy.selectTableRow(0);
            cy.selectTableRow(1);
            cy.selectTableRow(2);

            cy.get('[data-cy="bulk-approve-button"]').click();
            cy.confirmDialog();

            // Should show transaction failure message
            cy.wait('@transactionFailure');
            cy.expectErrorMessage('Transaction failed');
            cy.get('[data-cy="rollback-notice"]').should('be.visible');

            // Should maintain original state (no partial updates)
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).within(() => {
                    cy.get('[data-cy="status-badge"]').should('contain.text', 'Pending');
                });
            });
        });

        it('should handle deadlock scenarios gracefully', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock deadlock error
            cy.intercept('POST', '/api/attendance/clock-in', {
                statusCode: 409,
                body: {
                    error: 'Deadlock detected',
                    message: 'Operation will be retried automatically',
                    retryAfter: 1000
                }
            }).as('deadlockError');

            cy.navigateToModule('attendance');
            cy.get('[data-cy="clock-in-button"]').click();

            // Should show deadlock handling message
            cy.wait('@deadlockError');
            cy.get('[data-cy="deadlock-retry-notice"]').should('be.visible');
            cy.get('[data-cy="deadlock-retry-notice"]')
                .should('contain.text', 'Retrying operation');

            // Mock successful retry
            cy.intercept('POST', '/api/attendance/clock-in', {
                statusCode: 201,
                body: {
                    id: '123',
                    clockInTime: new Date().toISOString(),
                    message: 'Clocked in successfully'
                }
            }).as('successfulRetry');

            // Should eventually succeed
            cy.wait('@successfulRetry');
            cy.expectSuccessMessage('Clocked in successfully');
        });
    });

    describe('Data Consistency Issues', () => {
        it('should detect and handle stale data', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            // Mock stale data scenario
            cy.intercept('GET', '/api/employees/1', {
                statusCode: 200,
                body: {
                    id: '1',
                    name: 'John Doe',
                    version: 1,
                    lastModified: '2024-01-01T10:00:00Z'
                }
            }).as('initialData');

            cy.navigateToModule('employees');
            cy.clickTableAction(0, 'edit');

            cy.wait('@initialData');

            // Mock update with stale data conflict
            cy.intercept('PUT', '/api/employees/1', {
                statusCode: 409,
                body: {
                    error: 'Conflict',
                    message: 'Data has been modified by another user',
                    currentVersion: 2,
                    clientVersion: 1
                }
            }).as('staleDataConflict');

            // Try to update
            cy.fillForm({ name: 'John Smith' });
            cy.submitForm();

            // Should show conflict resolution dialog
            cy.wait('@staleDataConflict');
            cy.get('[data-cy="conflict-resolution-dialog"]').should('be.visible');
            cy.get('[data-cy="conflict-message"]')
                .should('contain.text', 'Data has been modified by another user');

            // Should offer resolution options
            cy.get('[data-cy="reload-data-button"]').should('be.visible');
            cy.get('[data-cy="force-update-button"]').should('be.visible');
            cy.get('[data-cy="cancel-update-button"]').should('be.visible');
        });

        it('should handle concurrent modification conflicts', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            // Mock concurrent modification scenario
            cy.intercept('PUT', '/api/employees/1/salary', {
                statusCode: 409,
                body: {
                    error: 'Concurrent modification',
                    message: 'Salary was updated by another user while you were editing',
                    conflictingChanges: {
                        field: 'salary',
                        yourValue: 75000,
                        currentValue: 80000,
                        modifiedBy: 'admin@testcompany.com'
                    }
                }
            }).as('concurrentModification');

            cy.navigateToModule('employees');
            cy.clickTableAction(0, 'edit-salary');

            cy.fillForm({ salary: '75000' });
            cy.submitForm();

            // Should show concurrent modification dialog
            cy.wait('@concurrentModification');
            cy.get('[data-cy="concurrent-modification-dialog"]').should('be.visible');
            cy.get('[data-cy="conflict-details"]').should('be.visible');

            // Should show both values for comparison
            cy.get('[data-cy="your-value"]').should('contain.text', '75000');
            cy.get('[data-cy="current-value"]').should('contain.text', '80000');
            cy.get('[data-cy="modified-by"]').should('contain.text', 'admin@testcompany.com');
        });
    });

    describe('Connection Pool Issues', () => {
        it('should handle connection pool exhaustion', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock connection pool exhaustion
            cy.intercept('GET', '/api/**', {
                statusCode: 503,
                body: {
                    error: 'Connection pool exhausted',
                    message: 'All database connections are in use',
                    retryAfter: 5000
                }
            }).as('poolExhausted');

            cy.navigateToModule('dashboard');

            // Should show connection pool error
            cy.wait('@poolExhausted');
            cy.get('[data-cy="connection-pool-error"]').should('be.visible');
            cy.expectErrorMessage('Database is busy');

            // Should show retry countdown
            cy.get('[data-cy="retry-countdown"]').should('be.visible');
            cy.get('[data-cy="retry-countdown"]').should('contain.text', '5');
        });

        it('should queue requests during connection issues', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock connection issues
            cy.intercept('GET', '/api/employees/profile', {
                statusCode: 503,
                body: { error: 'Connection temporarily unavailable' }
            }).as('connectionIssue');

            // Make multiple requests
            cy.navigateToModule('profile');
            cy.navigateToModule('attendance');
            cy.navigateToModule('leave');

            // Should show request queue
            cy.get('[data-cy="request-queue"]').should('be.visible');
            cy.get('[data-cy="queued-requests-count"]').should('contain.text', '3');

            // Mock connection recovery
            cy.intercept('GET', '/api/**', {
                statusCode: 200,
                body: { message: 'Connection restored' }
            }).as('connectionRestored');

            // Should process queued requests
            cy.get('[data-cy="processing-queue"]').should('be.visible');
            cy.get('[data-cy="request-queue"]').should('not.exist');
        });
    });

    describe('Database Recovery', () => {
        it('should detect database recovery and restore functionality', () => {
            // Start with database down
            cy.intercept('GET', '/api/**', {
                statusCode: 503,
                body: { error: 'Database unavailable' }
            }).as('databaseDown');

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show database offline status
            cy.get('[data-cy="database-offline"]').should('be.visible');

            // Simulate database recovery
            cy.intercept('GET', '/api/**', {
                statusCode: 200,
                body: { message: 'Database connection restored' }
            }).as('databaseRecovered');

            // Should detect recovery
            cy.get('[data-cy="database-recovered"]').should('be.visible');
            cy.expectSuccessMessage('Database connection restored');

            // Should restore full functionality
            cy.navigateToModule('dashboard');
            cy.get('[data-cy="dashboard-content"]').should('be.visible');
        });

        it('should sync offline changes after database recovery', () => {
            // Start in offline mode
            cy.window().then((win) => {
                win.localStorage.setItem('offlineChanges', JSON.stringify([
                    {
                        type: 'attendance',
                        action: 'clock-in',
                        timestamp: new Date().toISOString(),
                        data: { employeeId: '1' }
                    },
                    {
                        type: 'leave',
                        action: 'request',
                        timestamp: new Date().toISOString(),
                        data: { startDate: '2024-01-15', endDate: '2024-01-17' }
                    }
                ]));
            });

            cy.loginAsTenantUser('employee', 'testcompany');

            // Should show offline changes pending
            cy.get('[data-cy="offline-changes-pending"]').should('be.visible');
            cy.get('[data-cy="pending-changes-count"]').should('contain.text', '2');

            // Mock database recovery
            cy.intercept('POST', '/api/sync/offline-changes', {
                statusCode: 200,
                body: {
                    synced: 2,
                    conflicts: 0,
                    message: 'All changes synced successfully'
                }
            }).as('syncChanges');

            // Should sync changes automatically
            cy.wait('@syncChanges');
            cy.expectSuccessMessage('All changes synced successfully');
            cy.get('[data-cy="offline-changes-pending"]').should('not.exist');
        });
    });

    describe('Data Integrity Validation', () => {
        it('should validate data integrity after connection issues', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            // Mock data integrity check
            cy.intercept('GET', '/api/integrity/check', {
                statusCode: 200,
                body: {
                    status: 'warning',
                    issues: [
                        {
                            type: 'orphaned_records',
                            count: 3,
                            description: 'Found orphaned attendance records'
                        },
                        {
                            type: 'missing_references',
                            count: 1,
                            description: 'Missing employee reference in payroll'
                        }
                    ]
                }
            }).as('integrityCheck');

            cy.navigateToModule('admin');
            cy.get('[data-cy="data-integrity-tab"]').click();
            cy.get('[data-cy="run-integrity-check"]').click();

            // Should show integrity issues
            cy.wait('@integrityCheck');
            cy.get('[data-cy="integrity-issues"]').should('be.visible');
            cy.get('[data-cy="issue-count"]').should('contain.text', '4');

            // Should offer repair options
            cy.get('[data-cy="repair-issues-button"]').should('be.visible');
            cy.get('[data-cy="export-issues-button"]').should('be.visible');
        });

        it('should handle data corruption detection', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock corrupted data response
            cy.intercept('GET', '/api/employees/profile', {
                statusCode: 422,
                body: {
                    error: 'Data corruption detected',
                    message: 'Profile data appears to be corrupted',
                    corruptedFields: ['salary', 'department'],
                    backupAvailable: true
                }
            }).as('corruptedData');

            cy.navigateToModule('profile');

            // Should show corruption warning
            cy.wait('@corruptedData');
            cy.get('[data-cy="data-corruption-warning"]').should('be.visible');
            cy.expectErrorMessage('Data corruption detected');

            // Should offer recovery options
            cy.get('[data-cy="restore-from-backup-button"]').should('be.visible');
            cy.get('[data-cy="contact-support-button"]').should('be.visible');
        });
    });
});