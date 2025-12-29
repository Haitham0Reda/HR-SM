/**
 * E2E Tests for Concurrent Request Handling
 * Tests system behavior under concurrent user actions and race conditions
 */

describe('Concurrent Request Handling', () => {
    beforeEach(() => {
        cy.cleanupTestData();
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Race Condition Prevention', () => {
        it('should handle concurrent form submissions', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            let submissionCount = 0;
            cy.intercept('POST', '/api/leave-requests', (req) => {
                submissionCount++;
                // Simulate processing delay
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (submissionCount === 1) {
                            resolve({
                                statusCode: 201,
                                body: {
                                    id: '123',
                                    status: 'pending',
                                    message: 'Leave request submitted'
                                }
                            });
                        } else {
                            resolve({
                                statusCode: 409,
                                body: {
                                    error: 'Duplicate submission',
                                    message: 'Request already submitted'
                                }
                            });
                        }
                    }, 1000);
                });
            }).as('leaveSubmission');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            cy.fillForm({
                'leave-type': 'vacation',
                'start-date': '2024-01-15',
                'end-date': '2024-01-17',
                'reason': 'Family vacation'
            });

            // Simulate rapid double-click (concurrent submissions)
            cy.get('[data-cy="submit-button"]').click();
            cy.get('[data-cy="submit-button"]').click();

            // Should prevent duplicate submission
            cy.get('[data-cy="submit-button"]').should('be.disabled');
            cy.get('[data-cy="submitting-spinner"]').should('be.visible');

            cy.wait('@leaveSubmission');
            cy.expectSuccessMessage('Leave request submitted');

            // Verify only one submission was processed
            cy.then(() => {
                expect(submissionCount).to.equal(1);
            });
        });

        it('should handle concurrent data updates', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            // Mock concurrent update scenario
            cy.intercept('PUT', '/api/employees/1', (req) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            statusCode: 409,
                            body: {
                                error: 'Concurrent modification',
                                message: 'Record was modified by another user',
                                currentVersion: 2,
                                clientVersion: 1
                            }
                        });
                    }, 500);
                });
            }).as('concurrentUpdate');

            cy.navigateToModule('employees');
            cy.clickTableAction(0, 'edit');

            // Simulate concurrent editing
            cy.fillForm({ name: 'Updated Name' });
            cy.submitForm();

            // Should detect concurrent modification
            cy.wait('@concurrentUpdate');
            cy.get('[data-cy="concurrent-modification-dialog"]').should('be.visible');
            cy.expectErrorMessage('Record was modified by another user');

            // Should offer resolution options
            cy.get('[data-cy="reload-and-retry-button"]').should('be.visible');
            cy.get('[data-cy="force-update-button"]').should('be.visible');
        });

        it('should queue concurrent requests to same resource', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            let requestQueue = [];
            cy.intercept('GET', '/api/employees/profile', (req) => {
                requestQueue.push(Date.now());
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            statusCode: 200,
                            body: {
                                id: '1',
                                name: 'Test Employee',
                                requestNumber: requestQueue.length
                            }
                        });
                    }, 1000);
                });
            }).as('profileRequest');

            // Make multiple concurrent requests
            cy.navigateToModule('profile');
            cy.reload();
            cy.reload();

            // Should queue requests and process sequentially
            cy.get('[data-cy="request-queue-indicator"]').should('be.visible');
            cy.wait('@profileRequest');

            // Should show final result
            cy.get('[data-cy="profile-content"]').should('be.visible');

            // Verify requests were queued (not all processed simultaneously)
            cy.then(() => {
                expect(requestQueue.length).to.be.lessThan(4); // Some should be deduplicated
            });
        });
    });

    describe('Resource Locking', () => {
        it('should handle resource locking during edits', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            // Mock resource lock acquisition
            cy.intercept('POST', '/api/employees/1/lock', {
                statusCode: 200,
                body: {
                    locked: true,
                    lockId: 'lock-123',
                    expiresAt: new Date(Date.now() + 300000).toISOString() // 5 minutes
                }
            }).as('acquireLock');

            // Mock lock conflict
            cy.intercept('POST', '/api/employees/1/lock', {
                statusCode: 409,
                body: {
                    error: 'Resource locked',
                    message: 'Employee is being edited by another user',
                    lockedBy: 'admin@testcompany.com',
                    lockedAt: new Date().toISOString()
                }
            }).as('lockConflict');

            cy.navigateToModule('employees');
            cy.clickTableAction(0, 'edit');

            // Should acquire lock successfully first time
            cy.wait('@acquireLock');
            cy.get('[data-cy="edit-form"]').should('be.visible');
            cy.get('[data-cy="lock-indicator"]').should('be.visible');

            // Simulate another user trying to edit
            cy.window().then((win) => {
                // Simulate second browser tab
                win.dispatchEvent(new CustomEvent('attemptEdit', { detail: { employeeId: '1' } }));
            });

            // Should show lock conflict
            cy.get('[data-cy="lock-conflict-warning"]').should('be.visible');
            cy.get('[data-cy="locked-by-user"]').should('contain.text', 'admin@testcompany.com');
        });

        it('should handle lock expiration', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            // Mock lock with short expiration
            cy.intercept('POST', '/api/employees/1/lock', {
                statusCode: 200,
                body: {
                    locked: true,
                    lockId: 'lock-123',
                    expiresAt: new Date(Date.now() + 2000).toISOString() // 2 seconds
                }
            }).as('shortLock');

            cy.navigateToModule('employees');
            cy.clickTableAction(0, 'edit');

            cy.wait('@shortLock');
            cy.get('[data-cy="lock-timer"]').should('be.visible');

            // Wait for lock expiration
            cy.get('[data-cy="lock-expired-warning"]', { timeout: 5000 }).should('be.visible');
            cy.expectErrorMessage('Edit session expired');

            // Should offer to renew lock
            cy.get('[data-cy="renew-lock-button"]').should('be.visible');
        });

        it('should release locks on navigation away', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            cy.intercept('POST', '/api/employees/1/lock', {
                statusCode: 200,
                body: { locked: true, lockId: 'lock-123' }
            }).as('acquireLock');

            cy.intercept('DELETE', '/api/employees/1/lock/lock-123', {
                statusCode: 200,
                body: { released: true }
            }).as('releaseLock');

            cy.navigateToModule('employees');
            cy.clickTableAction(0, 'edit');

            cy.wait('@acquireLock');
            cy.get('[data-cy="lock-indicator"]').should('be.visible');

            // Navigate away
            cy.navigateToModule('dashboard');

            // Should release lock
            cy.wait('@releaseLock');
        });
    });

    describe('Optimistic Locking', () => {
        it('should handle optimistic locking conflicts', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            // Mock initial data with version
            cy.intercept('GET', '/api/employees/1', {
                statusCode: 200,
                body: {
                    id: '1',
                    name: 'John Doe',
                    salary: 70000,
                    version: 1
                }
            }).as('initialData');

            // Mock optimistic lock conflict
            cy.intercept('PUT', '/api/employees/1', {
                statusCode: 409,
                body: {
                    error: 'Version conflict',
                    message: 'Record has been modified since you loaded it',
                    currentVersion: 3,
                    clientVersion: 1,
                    currentData: {
                        id: '1',
                        name: 'John Smith',
                        salary: 75000,
                        version: 3
                    }
                }
            }).as('versionConflict');

            cy.navigateToModule('employees');
            cy.clickTableAction(0, 'edit');

            cy.wait('@initialData');

            // Make changes
            cy.fillForm({ salary: '72000' });
            cy.submitForm();

            // Should detect version conflict
            cy.wait('@versionConflict');
            cy.get('[data-cy="version-conflict-dialog"]').should('be.visible');

            // Should show both versions for comparison
            cy.get('[data-cy="your-changes"]').should('contain.text', '72000');
            cy.get('[data-cy="current-data"]').should('contain.text', '75000');

            // Should offer merge options
            cy.get('[data-cy="accept-current-button"]').should('be.visible');
            cy.get('[data-cy="keep-yours-button"]').should('be.visible');
            cy.get('[data-cy="manual-merge-button"]').should('be.visible');
        });

        it('should handle three-way merge conflicts', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            // Mock complex merge scenario
            cy.intercept('PUT', '/api/employees/1', {
                statusCode: 409,
                body: {
                    error: 'Merge conflict',
                    message: 'Multiple fields have been modified',
                    conflicts: [
                        {
                            field: 'salary',
                            baseValue: 70000,
                            yourValue: 72000,
                            currentValue: 75000
                        },
                        {
                            field: 'department',
                            baseValue: 'Engineering',
                            yourValue: 'Engineering',
                            currentValue: 'Product'
                        }
                    ]
                }
            }).as('mergeConflict');

            cy.navigateToModule('employees');
            cy.clickTableAction(0, 'edit');

            cy.fillForm({
                salary: '72000',
                department: 'Engineering'
            });
            cy.submitForm();

            // Should show merge conflict resolution
            cy.wait('@mergeConflict');
            cy.get('[data-cy="merge-conflict-dialog"]').should('be.visible');

            // Should show field-by-field resolution
            cy.get('[data-cy="conflict-field-salary"]').should('be.visible');
            cy.get('[data-cy="conflict-field-department"]').should('be.visible');

            // Should allow choosing values for each field
            cy.get('[data-cy="salary-choose-yours"]').click();
            cy.get('[data-cy="department-choose-current"]').click();

            cy.get('[data-cy="apply-merge-button"]').should('be.visible');
        });
    });

    describe('Request Throttling and Rate Limiting', () => {
        it('should handle rate limiting gracefully', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock rate limiting response
            cy.intercept('POST', '/api/attendance/clock-in', {
                statusCode: 429,
                body: {
                    error: 'Rate limit exceeded',
                    message: 'Too many requests. Please wait before trying again.',
                    retryAfter: 5000
                }
            }).as('rateLimited');

            cy.navigateToModule('attendance');

            // Rapidly click clock-in multiple times
            cy.get('[data-cy="clock-in-button"]').click();
            cy.get('[data-cy="clock-in-button"]').click();
            cy.get('[data-cy="clock-in-button"]').click();

            // Should show rate limit message
            cy.wait('@rateLimited');
            cy.get('[data-cy="rate-limit-warning"]').should('be.visible');
            cy.expectErrorMessage('Too many requests');

            // Should show countdown timer
            cy.get('[data-cy="retry-countdown"]').should('be.visible');
            cy.get('[data-cy="retry-countdown"]').should('contain.text', '5');

            // Button should be disabled during cooldown
            cy.get('[data-cy="clock-in-button"]').should('be.disabled');
        });

        it('should implement client-side request throttling', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            let requestCount = 0;
            cy.intercept('GET', '/api/employees/search*', (req) => {
                requestCount++;
                return {
                    statusCode: 200,
                    body: {
                        results: [],
                        requestNumber: requestCount
                    }
                };
            }).as('searchRequest');

            cy.navigateToModule('employees');

            // Type rapidly in search box
            cy.get('[data-cy="search-input"]').type('john', { delay: 50 });

            // Should throttle requests (not send one for each keystroke)
            cy.wait('@searchRequest');

            // Verify throttling worked
            cy.then(() => {
                expect(requestCount).to.be.lessThan(4); // Should be throttled
            });
        });

        it('should handle burst request scenarios', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            let burstCount = 0;
            cy.intercept('GET', '/api/employees*', (req) => {
                burstCount++;
                if (burstCount > 10) {
                    return {
                        statusCode: 429,
                        body: { error: 'Burst limit exceeded' }
                    };
                }
                return {
                    statusCode: 200,
                    body: { employees: [], requestNumber: burstCount }
                };
            }).as('burstRequest');

            cy.navigateToModule('employees');

            // Simulate burst of requests (rapid navigation/refresh)
            for (let i = 0; i < 15; i++) {
                cy.get('[data-cy="refresh-button"]').click();
            }

            // Should handle burst limit
            cy.get('[data-cy="burst-limit-warning"]').should('be.visible');
            cy.expectErrorMessage('Too many requests in a short time');
        });
    });

    describe('Concurrent User Sessions', () => {
        it('should handle multiple sessions for same user', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock session conflict detection
            cy.intercept('GET', '/api/auth/session-check', {
                statusCode: 409,
                body: {
                    error: 'Multiple sessions detected',
                    message: 'You are logged in from another location',
                    otherSessions: [
                        {
                            id: 'session-456',
                            location: 'Chrome on Windows',
                            lastActive: new Date().toISOString()
                        }
                    ]
                }
            }).as('sessionConflict');

            // Should detect session conflict
            cy.wait('@sessionConflict');
            cy.get('[data-cy="session-conflict-dialog"]').should('be.visible');

            // Should offer session management options
            cy.get('[data-cy="terminate-other-sessions"]').should('be.visible');
            cy.get('[data-cy="continue-current-session"]').should('be.visible');
        });

        it('should handle session timeout during concurrent operations', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock session timeout
            cy.intercept('POST', '/api/leave-requests', {
                statusCode: 401,
                body: {
                    error: 'Session expired',
                    message: 'Your session has expired. Please log in again.'
                }
            }).as('sessionExpired');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            cy.fillForm({
                'leave-type': 'vacation',
                'start-date': '2024-01-15',
                'end-date': '2024-01-17',
                'reason': 'Family vacation'
            });

            cy.submitForm();

            // Should handle session expiration
            cy.wait('@sessionExpired');
            cy.get('[data-cy="session-expired-dialog"]').should('be.visible');

            // Should preserve form data
            cy.get('[data-cy="form-data-preserved"]').should('be.visible');
            cy.get('[data-cy="relogin-button"]').should('be.visible');
        });
    });

    describe('Background Task Coordination', () => {
        it('should coordinate background sync operations', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock background sync status
            cy.intercept('GET', '/api/sync/status', {
                statusCode: 200,
                body: {
                    syncing: true,
                    operations: [
                        { type: 'attendance', status: 'in-progress' },
                        { type: 'leave-requests', status: 'queued' }
                    ]
                }
            }).as('syncStatus');

            cy.navigateToModule('dashboard');

            // Should show background sync indicator
            cy.wait('@syncStatus');
            cy.get('[data-cy="background-sync-indicator"]').should('be.visible');
            cy.get('[data-cy="sync-operations-count"]').should('contain.text', '2');

            // Should prevent conflicting operations
            cy.navigateToModule('attendance');
            cy.get('[data-cy="sync-in-progress-notice"]').should('be.visible');
            cy.get('[data-cy="clock-in-button"]').should('be.disabled');
        });

        it('should handle background task failures', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock background task failure
            cy.intercept('GET', '/api/sync/status', {
                statusCode: 200,
                body: {
                    syncing: false,
                    lastSync: new Date().toISOString(),
                    errors: [
                        {
                            type: 'attendance',
                            error: 'Sync failed',
                            retryCount: 3,
                            nextRetry: new Date(Date.now() + 60000).toISOString()
                        }
                    ]
                }
            }).as('syncErrors');

            cy.navigateToModule('dashboard');

            // Should show sync error notification
            cy.wait('@syncErrors');
            cy.get('[data-cy="sync-error-notification"]').should('be.visible');
            cy.get('[data-cy="failed-sync-count"]').should('contain.text', '1');

            // Should offer manual retry
            cy.get('[data-cy="retry-sync-button"]').should('be.visible');
        });
    });
});