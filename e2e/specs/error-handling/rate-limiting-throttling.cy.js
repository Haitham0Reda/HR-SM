/**
 * E2E Tests for Rate Limiting and Throttling
 * Tests API rate limits, request throttling, and system protection mechanisms
 */

describe('Rate Limiting and Throttling', () => {
    beforeEach(() => {
        cy.cleanupTestData();
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('API Rate Limiting', () => {
        it('should handle API rate limit exceeded', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock rate limit exceeded response
            cy.intercept('GET', '/api/employees/profile', {
                statusCode: 429,
                headers: {
                    'X-RateLimit-Limit': '100',
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 300, // 5 minutes
                    'Retry-After': '300'
                },
                body: {
                    error: 'Rate limit exceeded',
                    message: 'Too many requests. Please try again later.',
                    retryAfter: 300
                }
            }).as('rateLimitExceeded');

            cy.navigateToModule('profile');

            // Should show rate limit error
            cy.wait('@rateLimitExceeded');
            cy.get('[data-cy="rate-limit-error"]').should('be.visible');
            cy.expectErrorMessage('Too many requests. Please try again later.');

            // Should show rate limit details
            cy.get('[data-cy="rate-limit-details"]').should('be.visible');
            cy.get('[data-cy="requests-remaining"]').should('contain.text', '0');
            cy.get('[data-cy="rate-limit-reset"]').should('be.visible');

            // Should show countdown timer
            cy.get('[data-cy="retry-countdown"]').should('be.visible');
            cy.get('[data-cy="retry-countdown"]').should('contain.text', '5:00');

            // Should disable actions during rate limit
            cy.get('[data-cy="refresh-button"]').should('be.disabled');
        });

        it('should show rate limit warnings before hitting limit', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock approaching rate limit
            cy.intercept('GET', '/api/employees/profile', {
                statusCode: 200,
                headers: {
                    'X-RateLimit-Limit': '100',
                    'X-RateLimit-Remaining': '5',
                    'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 300
                },
                body: {
                    id: '1',
                    name: 'Test Employee',
                    email: 'test@testcompany.com'
                }
            }).as('approachingLimit');

            cy.navigateToModule('profile');

            // Should show rate limit warning
            cy.wait('@approachingLimit');
            cy.get('[data-cy="rate-limit-warning"]').should('be.visible');
            cy.get('[data-cy="requests-remaining"]').should('contain.text', '5');
            cy.get('[data-cy="rate-limit-warning"]').should('contain.text', 'You are approaching your request limit');

            // Should suggest reducing request frequency
            cy.get('[data-cy="rate-limit-suggestion"]').should('be.visible');
            cy.get('[data-cy="rate-limit-suggestion"]').should('contain.text', 'Consider reducing page refreshes');
        });

        it('should handle different rate limits for different endpoints', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock different rate limits
            cy.intercept('GET', '/api/employees/profile', {
                statusCode: 200,
                headers: {
                    'X-RateLimit-Limit': '100',
                    'X-RateLimit-Remaining': '95'
                },
                body: { id: '1', name: 'Test Employee' }
            }).as('profileRequest');

            cy.intercept('POST', '/api/attendance/clock-in', {
                statusCode: 429,
                headers: {
                    'X-RateLimit-Limit': '10',
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 60
                },
                body: {
                    error: 'Rate limit exceeded',
                    message: 'Clock-in attempts limited to 10 per minute'
                }
            }).as('clockInRateLimit');

            // Profile request should work
            cy.navigateToModule('profile');
            cy.wait('@profileRequest');
            cy.get('[data-cy="profile-content"]').should('be.visible');

            // Clock-in should be rate limited
            cy.navigateToModule('attendance');
            cy.get('[data-cy="clock-in-button"]').click();

            cy.wait('@clockInRateLimit');
            cy.get('[data-cy="clock-in-rate-limit"]').should('be.visible');
            cy.expectErrorMessage('Clock-in attempts limited to 10 per minute');

            // Should show specific rate limit for this endpoint
            cy.get('[data-cy="endpoint-rate-limit"]').should('contain.text', '10 per minute');
        });
    });

    describe('Request Throttling', () => {
        it('should throttle search requests', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            let searchRequestCount = 0;
            cy.intercept('GET', '/api/employees/search*', (req) => {
                searchRequestCount++;
                return {
                    statusCode: 200,
                    body: {
                        results: [],
                        query: req.url.searchParams.get('q'),
                        requestNumber: searchRequestCount
                    }
                };
            }).as('searchRequest');

            cy.navigateToModule('employees');

            // Type rapidly in search box
            const searchTerm = 'john doe';
            cy.get('[data-cy="search-input"]').type(searchTerm, { delay: 50 });

            // Should throttle requests (not send one for each keystroke)
            cy.wait('@searchRequest');

            // Verify throttling worked
            cy.then(() => {
                expect(searchRequestCount).to.be.lessThan(searchTerm.length);
            });

            // Should show throttling indicator
            cy.get('[data-cy="search-throttling"]').should('be.visible');
            cy.get('[data-cy="search-throttling"]').should('contain.text', 'Searching...');
        });

        it('should throttle auto-save operations', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            let saveRequestCount = 0;
            cy.intercept('PUT', '/api/employees/profile', (req) => {
                saveRequestCount++;
                return {
                    statusCode: 200,
                    body: {
                        id: '1',
                        message: 'Profile updated',
                        saveNumber: saveRequestCount
                    }
                };
            }).as('autoSave');

            cy.navigateToModule('profile');
            cy.get('[data-cy="edit-profile-button"]').click();

            // Enable auto-save
            cy.get('[data-cy="auto-save-toggle"]').check();

            // Type rapidly in bio field
            const bioText = 'This is my updated bio with lots of text to trigger multiple auto-saves';
            cy.get('[data-cy="bio-input"]').type(bioText, { delay: 100 });

            // Should show auto-save throttling
            cy.get('[data-cy="auto-save-throttling"]').should('be.visible');

            // Wait for throttled save
            cy.wait('@autoSave');

            // Verify throttling worked (should be much less than character count)
            cy.then(() => {
                expect(saveRequestCount).to.be.lessThan(5);
            });
        });

        it('should handle burst request throttling', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            let requestCount = 0;
            cy.intercept('GET', '/api/dashboard/stats', (req) => {
                requestCount++;
                if (requestCount > 5) {
                    return {
                        statusCode: 429,
                        body: {
                            error: 'Burst limit exceeded',
                            message: 'Too many requests in a short time'
                        }
                    };
                }
                return {
                    statusCode: 200,
                    body: { stats: {}, requestNumber: requestCount }
                };
            }).as('dashboardStats');

            cy.navigateToModule('dashboard');

            // Rapidly refresh dashboard multiple times
            for (let i = 0; i < 8; i++) {
                cy.get('[data-cy="refresh-dashboard"]').click();
            }

            // Should hit burst limit
            cy.get('[data-cy="burst-limit-error"]').should('be.visible');
            cy.expectErrorMessage('Too many requests in a short time');

            // Should show burst protection message
            cy.get('[data-cy="burst-protection"]').should('be.visible');
            cy.get('[data-cy="burst-protection"]').should('contain.text', 'Please wait before refreshing again');
        });
    });

    describe('User-Specific Rate Limiting', () => {
        it('should handle per-user rate limits', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock user-specific rate limit
            cy.intercept('POST', '/api/leave-requests', {
                statusCode: 429,
                headers: {
                    'X-RateLimit-Limit-User': '5',
                    'X-RateLimit-Remaining-User': '0',
                    'X-RateLimit-Reset-User': Math.floor(Date.now() / 1000) + 3600
                },
                body: {
                    error: 'User rate limit exceeded',
                    message: 'You can only submit 5 leave requests per hour',
                    userLimit: true
                }
            }).as('userRateLimit');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            cy.fillForm({
                'leave-type': 'vacation',
                'start-date': '2024-01-15',
                'end-date': '2024-01-17',
                'reason': 'Family vacation'
            });

            cy.submitForm();

            // Should show user-specific rate limit error
            cy.wait('@userRateLimit');
            cy.get('[data-cy="user-rate-limit-error"]').should('be.visible');
            cy.expectErrorMessage('You can only submit 5 leave requests per hour');

            // Should show user-specific limit details
            cy.get('[data-cy="user-limit-details"]').should('be.visible');
            cy.get('[data-cy="user-requests-remaining"]').should('contain.text', '0');
            cy.get('[data-cy="user-limit-reset"]').should('contain.text', '1 hour');
        });

        it('should handle role-based rate limits', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            // Mock role-based rate limit (managers have higher limits)
            cy.intercept('GET', '/api/employees*', {
                statusCode: 200,
                headers: {
                    'X-RateLimit-Limit': '500', // Higher limit for managers
                    'X-RateLimit-Remaining': '495',
                    'X-RateLimit-Role': 'manager'
                },
                body: { employees: [] }
            }).as('managerRateLimit');

            cy.navigateToModule('employees');

            // Should show role-based rate limit info
            cy.wait('@managerRateLimit');
            cy.get('[data-cy="rate-limit-info"]').should('be.visible');
            cy.get('[data-cy="role-based-limit"]').should('contain.text', 'Manager: 500 requests/hour');
            cy.get('[data-cy="requests-remaining"]').should('contain.text', '495');
        });

        it('should handle tenant-wide rate limits', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock tenant-wide rate limit exceeded
            cy.intercept('GET', '/api/**', {
                statusCode: 429,
                headers: {
                    'X-RateLimit-Tenant': 'testcompany',
                    'X-RateLimit-Tenant-Limit': '10000',
                    'X-RateLimit-Tenant-Remaining': '0'
                },
                body: {
                    error: 'Tenant rate limit exceeded',
                    message: 'Your organization has exceeded its API usage limit',
                    tenantLimit: true,
                    upgradeRequired: true
                }
            }).as('tenantRateLimit');

            cy.navigateToModule('dashboard');

            // Should show tenant-wide rate limit error
            cy.wait('@tenantRateLimit');
            cy.get('[data-cy="tenant-rate-limit-error"]').should('be.visible');
            cy.expectErrorMessage('Your organization has exceeded its API usage limit');

            // Should show upgrade suggestion
            cy.get('[data-cy="upgrade-suggestion"]').should('be.visible');
            cy.get('[data-cy="upgrade-plan-button"]').should('be.visible');

            // Should show tenant limit details
            cy.get('[data-cy="tenant-limit-details"]').should('be.visible');
            cy.get('[data-cy="tenant-name"]').should('contain.text', 'testcompany');
        });
    });

    describe('Rate Limit Recovery', () => {
        it('should automatically retry after rate limit expires', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            let rateLimitExpired = false;
            cy.intercept('GET', '/api/employees/profile', (req) => {
                if (!rateLimitExpired) {
                    rateLimitExpired = true;
                    return {
                        statusCode: 429,
                        headers: {
                            'Retry-After': '2'
                        },
                        body: {
                            error: 'Rate limit exceeded',
                            retryAfter: 2
                        }
                    };
                } else {
                    return {
                        statusCode: 200,
                        body: {
                            id: '1',
                            name: 'Test Employee'
                        }
                    };
                }
            }).as('rateLimitRecovery');

            cy.navigateToModule('profile');

            // Should show rate limit error initially
            cy.get('[data-cy="rate-limit-error"]').should('be.visible');

            // Should show auto-retry countdown
            cy.get('[data-cy="auto-retry-countdown"]').should('be.visible');
            cy.get('[data-cy="auto-retry-countdown"]').should('contain.text', '2');

            // Should automatically retry and succeed
            cy.wait('@rateLimitRecovery');
            cy.get('[data-cy="profile-content"]').should('be.visible');
            cy.get('[data-cy="rate-limit-error"]').should('not.exist');
        });

        it('should allow manual retry after rate limit', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock rate limit then success
            let retryAttempted = false;
            cy.intercept('POST', '/api/attendance/clock-in', (req) => {
                if (!retryAttempted) {
                    return {
                        statusCode: 429,
                        body: {
                            error: 'Rate limit exceeded',
                            message: 'Please wait before trying again'
                        }
                    };
                } else {
                    return {
                        statusCode: 201,
                        body: {
                            id: '123',
                            clockInTime: new Date().toISOString(),
                            message: 'Clocked in successfully'
                        }
                    };
                }
            }).as('clockInRetry');

            cy.navigateToModule('attendance');
            cy.get('[data-cy="clock-in-button"]').click();

            // Should show rate limit error
            cy.get('[data-cy="rate-limit-error"]').should('be.visible');

            // Should show manual retry button
            cy.get('[data-cy="manual-retry-button"]').should('be.visible');

            // Click retry
            retryAttempted = true;
            cy.get('[data-cy="manual-retry-button"]').click();

            // Should succeed on retry
            cy.wait('@clockInRetry');
            cy.expectSuccessMessage('Clocked in successfully');
        });

        it('should show rate limit recovery status', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock rate limit recovery
            cy.intercept('GET', '/api/rate-limit/status', {
                statusCode: 200,
                body: {
                    rateLimitActive: false,
                    requestsRemaining: 95,
                    resetTime: Math.floor(Date.now() / 1000) + 3600,
                    recoveredAt: new Date().toISOString()
                }
            }).as('rateLimitStatus');

            cy.navigateToModule('dashboard');

            // Should show recovery status
            cy.wait('@rateLimitStatus');
            cy.get('[data-cy="rate-limit-recovered"]').should('be.visible');
            cy.get('[data-cy="rate-limit-recovered"]').should('contain.text', 'Rate limit has been reset');

            // Should show current status
            cy.get('[data-cy="current-rate-limit-status"]').should('be.visible');
            cy.get('[data-cy="requests-remaining"]').should('contain.text', '95');
        });
    });

    describe('Rate Limit Monitoring and Analytics', () => {
        it('should display rate limit usage analytics', () => {
            cy.loginAsPlatformAdmin();

            // Mock rate limit analytics
            cy.intercept('GET', '/api/platform/rate-limits/analytics', {
                statusCode: 200,
                body: {
                    totalRequests: 50000,
                    rateLimitHits: 150,
                    topEndpoints: [
                        { endpoint: '/api/employees', requests: 15000, rateLimitHits: 50 },
                        { endpoint: '/api/attendance', requests: 12000, rateLimitHits: 30 },
                        { endpoint: '/api/leave-requests', requests: 8000, rateLimitHits: 20 }
                    ],
                    tenantUsage: [
                        { tenant: 'testcompany', requests: 25000, rateLimitHits: 75 },
                        { tenant: 'company2', requests: 15000, rateLimitHits: 45 }
                    ]
                }
            }).as('rateLimitAnalytics');

            cy.navigateToPlatformSection('analytics');
            cy.get('[data-cy="rate-limits-tab"]').click();

            // Should show rate limit analytics
            cy.wait('@rateLimitAnalytics');
            cy.get('[data-cy="rate-limit-analytics"]').should('be.visible');

            // Should show total statistics
            cy.get('[data-cy="total-requests"]').should('contain.text', '50,000');
            cy.get('[data-cy="rate-limit-hits"]').should('contain.text', '150');

            // Should show top endpoints
            cy.get('[data-cy="top-endpoints"]').should('be.visible');
            cy.get('[data-cy="endpoint-employees"]').should('contain.text', '15,000 requests');

            // Should show tenant usage
            cy.get('[data-cy="tenant-usage"]').should('be.visible');
            cy.get('[data-cy="tenant-testcompany"]').should('contain.text', '25,000 requests');
        });

        it('should show rate limit configuration options', () => {
            cy.loginAsPlatformAdmin();

            cy.navigateToPlatformSection('settings');
            cy.get('[data-cy="rate-limits-tab"]').click();

            // Should show rate limit configuration
            cy.get('[data-cy="rate-limit-config"]').should('be.visible');

            // Should show different limit types
            cy.get('[data-cy="global-rate-limit"]').should('be.visible');
            cy.get('[data-cy="tenant-rate-limit"]').should('be.visible');
            cy.get('[data-cy="user-rate-limit"]').should('be.visible');
            cy.get('[data-cy="endpoint-rate-limits"]').should('be.visible');

            // Should allow configuration changes
            cy.get('[data-cy="global-limit-input"]').should('be.visible');
            cy.get('[data-cy="update-rate-limits-button"]').should('be.visible');
        });

        it('should handle rate limit alerts and notifications', () => {
            cy.loginAsPlatformAdmin();

            // Mock rate limit alert
            cy.intercept('GET', '/api/platform/alerts', {
                statusCode: 200,
                body: {
                    alerts: [
                        {
                            id: 'alert-1',
                            type: 'rate-limit',
                            severity: 'warning',
                            message: 'Tenant "testcompany" approaching rate limit',
                            details: {
                                tenant: 'testcompany',
                                currentUsage: 8500,
                                limit: 10000,
                                percentage: 85
                            },
                            timestamp: new Date().toISOString()
                        }
                    ]
                }
            }).as('rateLimitAlerts');

            cy.navigateToPlatformSection('dashboard');

            // Should show rate limit alerts
            cy.wait('@rateLimitAlerts');
            cy.get('[data-cy="rate-limit-alerts"]').should('be.visible');
            cy.get('[data-cy="alert-rate-limit"]').should('be.visible');

            // Should show alert details
            cy.get('[data-cy="alert-tenant"]').should('contain.text', 'testcompany');
            cy.get('[data-cy="alert-usage"]').should('contain.text', '85%');

            // Should offer alert actions
            cy.get('[data-cy="increase-limit-button"]').should('be.visible');
            cy.get('[data-cy="contact-tenant-button"]').should('be.visible');
        });
    });
});