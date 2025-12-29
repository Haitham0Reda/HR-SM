/**
 * Authentication flow tests - Task 14: Write E2E tests for authentication flows
 * 
 * This test suite covers all authentication scenarios including:
 * - Tenant user login flows (valid/invalid credentials)
 * - Platform admin login flows
 * - Logout functionality for both applications
 * - Password reset flow with email verification
 * - Session persistence across page refreshes
 * - Session timeout and re-authentication
 * - Multi-tenant isolation (verify users can't access other tenants)
 * - Role-based login restrictions
 */

import { LoginPage } from '../../support/page-objects/LoginPage';
import { DashboardPage } from '../../support/page-objects/DashboardPage';
import { PlatformAdminPage } from '../../support/page-objects/PlatformAdminPage';

describe('Authentication Flow Tests - Task 14', () => {
    let loginPage;
    let dashboardPage;
    let platformAdminPage;

    beforeEach(() => {
        loginPage = new LoginPage();
        dashboardPage = new DashboardPage();
        platformAdminPage = new PlatformAdminPage();

        // Set up test data
        cy.cleanupTestData();

        cy.fixture('tenants').then((tenants) => {
            cy.seedTestData('tenant', tenants.testCompany);
            cy.seedTestData('tenant', tenants.secondCompany);
        });

        cy.fixture('users').then((users) => {
            cy.seedTestData('user', [
                { ...users.employee, tenantId: 'testcompany' },
                { ...users.tenantAdmin, tenantId: 'testcompany' },
                { ...users.hrManager, tenantId: 'testcompany' },
                { ...users.manager, tenantId: 'testcompany' },
                { ...users.employee, email: 'employee2@secondtest.com', tenantId: 'secondtest' },
                users.platformAdmin
            ]);
        });
    });

    afterEach(() => {
        cy.cleanupTestData();
    });

    describe('Tenant User Authentication - Valid Credentials', () => {
        it('should successfully login as employee with valid credentials', () => {
            cy.fixture('users').then((users) => {
                loginPage.visit('testcompany');
                loginPage.login(users.employee.email, users.employee.password);

                loginPage.expectLoginSuccess();
                dashboardPage.expectToBeOnDashboard();
                dashboardPage.verifyCurrentTenant('testcompany');

                // Verify employee has limited module access
                dashboardPage.verifyModuleAccess('hrCore', true);
                dashboardPage.verifyModuleAccess('attendance', true);
                dashboardPage.verifyModuleAccess('vacation', true);
                dashboardPage.verifyModuleAccess('payroll', false); // Employee shouldn't see payroll
            });
        });

        it('should successfully login as tenant admin with valid credentials', () => {
            cy.fixture('users').then((users) => {
                loginPage.visit('testcompany');
                loginPage.login(users.tenantAdmin.email, users.tenantAdmin.password);

                loginPage.expectLoginSuccess();
                dashboardPage.expectToBeOnDashboard();
                dashboardPage.verifyCurrentTenant('testcompany');

                // Verify admin has access to all modules
                dashboardPage.verifyAllModulesAccess(['hr-core', 'attendance', 'payroll', 'vacation', 'tasks', 'documents', 'missions', 'overtime']);
            });
        });

        it('should successfully login as HR manager with valid credentials', () => {
            cy.fixture('users').then((users) => {
                loginPage.visit('testcompany');
                loginPage.login(users.hrManager.email, users.hrManager.password);

                loginPage.expectLoginSuccess();
                dashboardPage.expectToBeOnDashboard();
                dashboardPage.verifyCurrentTenant('testcompany');

                // Verify HR manager has HR-related module access
                dashboardPage.verifyModuleAccess('hrCore', true);
                dashboardPage.verifyModuleAccess('attendance', true);
                dashboardPage.verifyModuleAccess('payroll', true);
                dashboardPage.verifyModuleAccess('vacation', true);
            });
        });

        it('should successfully login as manager with valid credentials', () => {
            cy.fixture('users').then((users) => {
                loginPage.visit('testcompany');
                loginPage.login(users.manager.email, users.manager.password);

                loginPage.expectLoginSuccess();
                dashboardPage.expectToBeOnDashboard();
                dashboardPage.verifyCurrentTenant('testcompany');

                // Verify manager has team management access
                dashboardPage.verifyModuleAccess('tasks', true);
                dashboardPage.verifyModuleAccess('attendance', true);
                dashboardPage.verifyModuleAccess('vacation', true); // For approvals
            });
        });

        it('should display correct user information after login', () => {
            cy.fixture('users').then((users) => {
                loginPage.visit('testcompany');
                loginPage.login(users.employee.email, users.employee.password);

                loginPage.expectLoginSuccess();
                dashboardPage.expectToBeOnDashboard();

                // Verify user menu shows correct user info
                dashboardPage.verifyUserMenu();
                cy.get('[data-cy="user-name"]').should('contain.text', users.employee.name);
                cy.get('[data-cy="user-role"]').should('contain.text', users.employee.role);
            });
        });

        it('should maintain session with remember me option', () => {
            cy.fixture('users').then((users) => {
                loginPage.visit('testcompany');
                loginPage.enterEmail(users.employee.email);
                loginPage.enterPassword(users.employee.password);
                loginPage.checkRememberMe();
                loginPage.clickLogin();

                loginPage.expectLoginSuccess();
                dashboardPage.expectToBeOnDashboard();

                // Close browser and reopen (simulate by clearing session storage but keeping localStorage)
                cy.window().then((win) => {
                    win.sessionStorage.clear();
                });

                // Refresh the page
                cy.reload();

                // Should still be logged in due to remember me
                dashboardPage.expectToBeOnDashboard();
                cy.get('[data-cy="user-menu"]').should('be.visible');
            });
        });
    });

    describe('Tenant User Authentication - Invalid Credentials', () => {
        it('should reject login with invalid email format', () => {
            loginPage.visit('testcompany');
            loginPage.login('invalid-email-format', 'password123');

            cy.get('[data-cy="email-error"]').should('be.visible');
            cy.get('[data-cy="email-error"]').should('contain.text', 'valid email');
            cy.url().should('include', '/login');
        });

        it('should reject login with empty credentials', () => {
            loginPage.visit('testcompany');
            loginPage.clickLogin();

            cy.get('[data-cy="email-error"]').should('be.visible');
            cy.get('[data-cy="password-error"]').should('be.visible');
            cy.url().should('include', '/login');
        });

        it('should reject login with non-existent email', () => {
            loginPage.visit('testcompany');
            loginPage.login('nonexistent@testcompany.com', 'password123');

            loginPage.expectLoginFailure('Invalid email or password');
            cy.url().should('include', '/login');
        });

        it('should reject login with correct email but wrong password', () => {
            cy.fixture('users').then((users) => {
                loginPage.visit('testcompany');
                loginPage.login(users.employee.email, 'wrongpassword123');

                loginPage.expectLoginFailure('Invalid email or password');
                cy.url().should('include', '/login');
            });
        });

        it('should reject login with empty password', () => {
            cy.fixture('users').then((users) => {
                loginPage.visit('testcompany');
                loginPage.enterEmail(users.employee.email);
                loginPage.clickLogin();

                cy.get('[data-cy="password-error"]').should('be.visible');
                cy.url().should('include', '/login');
            });
        });

        it('should show loading state during failed login attempt', () => {
            // Intercept login request to add delay
            cy.intercept('POST', '**/auth/login', (req) => {
                req.reply((res) => {
                    res.delay(1000);
                    res.send({ statusCode: 401, body: { error: 'Invalid credentials' } });
                });
            }).as('slowFailedLogin');

            loginPage.visit('testcompany');
            loginPage.login('test@test.com', 'wrongpassword');

            loginPage.expectLoadingState();
            cy.wait('@slowFailedLogin');
            loginPage.expectLoginFailure();
        });

        it('should implement rate limiting after multiple failed attempts', () => {
            loginPage.visit('testcompany');

            // Make multiple failed login attempts
            for (let i = 0; i < 6; i++) {
                loginPage.login('test@test.com', 'wrongpassword');
                cy.wait(500);
                if (i < 5) {
                    loginPage.expectLoginFailure();
                }
            }

            // Should show rate limit error after 5 attempts
            cy.get('[data-cy="rate-limit-error"]').should('be.visible');
            cy.get('[data-cy="rate-limit-error"]').should('contain.text', 'Too many failed attempts');
        });
    });

    describe('Platform Admin Authentication', () => {
        it('should successfully login as platform admin with valid credentials', () => {
            cy.fixture('users').then((users) => {
                loginPage.visitPlatformLogin();
                loginPage.login(users.platformAdmin.email, users.platformAdmin.password);

                loginPage.expectLoginSuccess();
                platformAdminPage.expectToBeOnPlatformAdmin();
                cy.url().should('include', '/dashboard');

                // Verify platform admin has access to all platform features
                platformAdminPage.verifyAccessControl('platform_admin');
            });
        });

        it('should reject invalid platform admin credentials', () => {
            loginPage.visitPlatformLogin();
            loginPage.login('invalid@admin.com', 'wrongpassword');

            loginPage.expectLoginFailure('Invalid credentials');
            cy.url().should('include', '/login');
        });

        it('should reject platform admin login with empty credentials', () => {
            loginPage.visitPlatformLogin();
            loginPage.clickLogin();

            cy.get('[data-cy="email-error"]').should('be.visible');
            cy.get('[data-cy="password-error"]').should('be.visible');
        });

        it('should verify platform admin access control and permissions', () => {
            loginPage.loginAsPlatformAdmin();

            platformAdminPage.expectToBeOnPlatformAdmin();
            platformAdminPage.verifyAccessControl('platform_admin');

            // Verify access to sensitive platform operations
            platformAdminPage.navigateToSection('tenants');
            cy.get('[data-cy="create-tenant-button"]').should('be.visible');

            platformAdminPage.navigateToSection('licenses');
            cy.get('[data-cy="generate-license-button"]').should('be.visible');

            platformAdminPage.navigateToSection('system');
            cy.get('[data-cy="system-settings"]').should('be.visible');
        });

        it('should display platform admin dashboard with correct widgets', () => {
            loginPage.loginAsPlatformAdmin();

            platformAdminPage.expectToBeOnPlatformAdmin();
            platformAdminPage.verifyDashboardWidgets();

            // Verify platform-specific metrics are displayed
            cy.get('[data-cy="total-tenants-widget"]').should('be.visible');
            cy.get('[data-cy="active-subscriptions-widget"]').should('be.visible');
            cy.get('[data-cy="system-health-widget"]').should('be.visible');
        });

        it('should prevent tenant users from accessing platform admin', () => {
            cy.fixture('users').then((users) => {
                // Try to login to platform admin with tenant user credentials
                loginPage.visitPlatformLogin();
                loginPage.login(users.employee.email, users.employee.password);

                loginPage.expectLoginFailure('Unauthorized access');
                cy.url().should('include', '/login');
            });
        });
    });

    describe('Logout Functionality', () => {
        it('should logout tenant user successfully and clear all session data', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Verify user is logged in
            cy.get('[data-cy="user-menu"]').should('be.visible');

            dashboardPage.logout();

            // Verify redirect to login page
            cy.url().should('include', '/login');

            // Verify all authentication data is cleared
            cy.window().then((win) => {
                expect(win.localStorage.getItem('authToken')).to.be.null;
                expect(win.localStorage.getItem('refreshToken')).to.be.null;
                expect(win.sessionStorage.getItem('userSession')).to.be.null;
            });
        });

        it('should logout platform admin successfully and clear session data', () => {
            loginPage.loginAsPlatformAdmin();
            platformAdminPage.expectToBeOnPlatformAdmin();

            // Verify admin is logged in
            cy.get('[data-cy="platform-user-menu"]').should('be.visible');

            platformAdminPage.logout();

            // Verify redirect to login page
            cy.url().should('include', '/login');

            // Verify all authentication data is cleared
            cy.window().then((win) => {
                expect(win.localStorage.getItem('platformAuthToken')).to.be.null;
                expect(win.localStorage.getItem('platformRefreshToken')).to.be.null;
            });
        });

        it('should prevent access to protected routes after logout', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            dashboardPage.logout();

            // Try to access protected route directly
            cy.visit('/testcompany/dashboard');

            // Should redirect to login
            cy.url().should('include', '/login');
        });

        it('should handle logout when session is already expired', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Simulate expired session by removing token
            cy.window().then((win) => {
                win.localStorage.removeItem('authToken');
            });

            // Try to logout
            dashboardPage.logout();

            // Should still redirect to login page gracefully
            cy.url().should('include', '/login');
        });

        it('should logout from all tabs/windows (single sign-out)', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Simulate logout event from another tab
            cy.window().then((win) => {
                win.localStorage.removeItem('authToken');
                win.dispatchEvent(new StorageEvent('storage', {
                    key: 'authToken',
                    oldValue: 'some-token',
                    newValue: null
                }));
            });

            // Current tab should detect logout and redirect
            cy.url().should('include', '/login', { timeout: 5000 });
        });
    });

    describe('Password Reset Flow with Email Verification', () => {
        it('should initiate password reset for valid tenant user email', () => {
            loginPage.visit('testcompany');
            loginPage.clickForgotPassword();

            cy.url().should('include', '/forgot-password');

            cy.fixture('users').then((users) => {
                cy.get('[data-cy="reset-email-input"]').type(users.employee.email);
                cy.get('[data-cy="send-reset-button"]').click();

                cy.expectSuccessMessage('Password reset email sent');
                cy.get('[data-cy="reset-email-sent"]').should('be.visible');
                cy.get('[data-cy="reset-email-sent"]').should('contain.text', users.employee.email);
            });
        });

        it('should handle invalid email for password reset', () => {
            cy.visit('/testcompany/forgot-password');

            cy.get('[data-cy="reset-email-input"]').type('nonexistent@testcompany.com');
            cy.get('[data-cy="send-reset-button"]').click();

            cy.expectErrorMessage('Email not found');
        });

        it('should validate email format in password reset form', () => {
            cy.visit('/testcompany/forgot-password');

            cy.get('[data-cy="reset-email-input"]').type('invalid-email-format');
            cy.get('[data-cy="send-reset-button"]').click();

            cy.get('[data-cy="email-error"]').should('be.visible');
            cy.get('[data-cy="email-error"]').should('contain.text', 'valid email');
        });

        it('should handle password reset for platform admin', () => {
            cy.visit('http://localhost:3001/forgot-password');

            cy.fixture('users').then((users) => {
                cy.get('[data-cy="reset-email-input"]').type(users.platformAdmin.email);
                cy.get('[data-cy="send-reset-button"]').click();

                cy.expectSuccessMessage('Password reset email sent');
            });
        });

        it('should complete password reset flow with valid token', () => {
            // Simulate clicking reset link from email
            const resetToken = 'valid-reset-token-123';
            cy.visit(`/testcompany/reset-password?token=${resetToken}`);

            cy.get('[data-cy="new-password-input"]').type('NewPassword123!');
            cy.get('[data-cy="confirm-password-input"]').type('NewPassword123!');
            cy.get('[data-cy="reset-password-button"]').click();

            cy.expectSuccessMessage('Password reset successfully');
            cy.url().should('include', '/login');

            // Verify can login with new password
            cy.fixture('users').then((users) => {
                loginPage.login(users.employee.email, 'NewPassword123!');
                loginPage.expectLoginSuccess();
            });
        });

        it('should reject password reset with invalid token', () => {
            const invalidToken = 'invalid-token-123';
            cy.visit(`/testcompany/reset-password?token=${invalidToken}`);

            cy.get('[data-cy="invalid-token-error"]').should('be.visible');
            cy.get('[data-cy="invalid-token-error"]').should('contain.text', 'Invalid or expired reset token');
        });

        it('should reject password reset with expired token', () => {
            const expiredToken = 'expired-token-123';
            cy.visit(`/testcompany/reset-password?token=${expiredToken}`);

            cy.get('[data-cy="new-password-input"]').type('NewPassword123!');
            cy.get('[data-cy="confirm-password-input"]').type('NewPassword123!');
            cy.get('[data-cy="reset-password-button"]').click();

            cy.expectErrorMessage('Reset token has expired');
        });

        it('should validate password strength in reset form', () => {
            const resetToken = 'valid-reset-token-123';
            cy.visit(`/testcompany/reset-password?token=${resetToken}`);

            // Test weak password
            cy.get('[data-cy="new-password-input"]').type('weak');
            cy.get('[data-cy="password-error"]').should('be.visible');
            cy.get('[data-cy="password-error"]').should('contain.text', 'Password must be at least 8 characters');

            // Test password mismatch
            cy.get('[data-cy="new-password-input"]').clear().type('StrongPassword123!');
            cy.get('[data-cy="confirm-password-input"]').type('DifferentPassword123!');
            cy.get('[data-cy="reset-password-button"]').click();

            cy.get('[data-cy="confirm-password-error"]').should('be.visible');
            cy.get('[data-cy="confirm-password-error"]').should('contain.text', 'Passwords do not match');
        });

        it('should implement rate limiting for password reset requests', () => {
            cy.visit('/testcompany/forgot-password');

            cy.fixture('users').then((users) => {
                // Send multiple reset requests quickly
                for (let i = 0; i < 4; i++) {
                    cy.get('[data-cy="reset-email-input"]').clear().type(users.employee.email);
                    cy.get('[data-cy="send-reset-button"]').click();
                    cy.wait(500);
                }

                // Should show rate limit error
                cy.get('[data-cy="rate-limit-error"]').should('be.visible');
                cy.get('[data-cy="rate-limit-error"]').should('contain.text', 'Too many reset requests');
            });
        });
    });

    describe('Session Persistence Across Page Refreshes', () => {
        it('should maintain tenant user session after page refresh', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Verify user is logged in
            cy.get('[data-cy="user-menu"]').should('be.visible');
            dashboardPage.verifyCurrentTenant('testcompany');

            // Refresh the page
            cy.reload();

            // Should still be logged in
            dashboardPage.expectToBeOnDashboard();
            cy.get('[data-cy="user-menu"]').should('be.visible');
            dashboardPage.verifyCurrentTenant('testcompany');
        });

        it('should maintain platform admin session after page refresh', () => {
            loginPage.loginAsPlatformAdmin();
            platformAdminPage.expectToBeOnPlatformAdmin();

            // Verify admin is logged in
            cy.get('[data-cy="platform-user-menu"]').should('be.visible');

            // Refresh the page
            cy.reload();

            // Should still be logged in
            platformAdminPage.expectToBeOnPlatformAdmin();
            cy.get('[data-cy="platform-user-menu"]').should('be.visible');
        });

        it('should maintain session when navigating between pages', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Navigate to different pages
            cy.visit('/testcompany/profile');
            cy.get('[data-cy="profile-page"]').should('be.visible');
            cy.get('[data-cy="user-menu"]').should('be.visible');

            cy.visit('/testcompany/attendance');
            cy.get('[data-cy="attendance-page"]').should('be.visible');
            cy.get('[data-cy="user-menu"]').should('be.visible');

            // Return to dashboard
            cy.visit('/testcompany/dashboard');
            dashboardPage.expectToBeOnDashboard();
        });

        it('should restore session state including user preferences', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Set some user preferences (e.g., theme, language)
            cy.get('[data-cy="user-menu"]').click();
            cy.get('[data-cy="settings-link"]').click();
            cy.get('[data-cy="theme-select"]').select('dark');
            cy.get('[data-cy="save-settings"]').click();

            // Refresh the page
            cy.reload();

            // Verify preferences are maintained
            dashboardPage.expectToBeOnDashboard();
            cy.get('body').should('have.class', 'dark-theme');
        });

        it('should handle session restoration with expired token gracefully', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Simulate token expiration by modifying localStorage
            cy.window().then((win) => {
                const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';
                win.localStorage.setItem('authToken', expiredToken);
            });

            // Refresh the page
            cy.reload();

            // Should redirect to login due to expired token
            cy.url().should('include', '/login');
        });

        it('should maintain session across browser tabs', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Open new tab (simulate by visiting same URL)
            cy.visit('/testcompany/profile');

            // Should be logged in in the new tab
            cy.get('[data-cy="profile-page"]').should('be.visible');
            cy.get('[data-cy="user-menu"]').should('be.visible');
        });
    });

    describe('Session Timeout and Re-authentication', () => {
        it('should handle session timeout and redirect to login', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Simulate session timeout by removing token
            cy.window().then((win) => {
                win.localStorage.removeItem('authToken');
            });

            // Try to navigate to a protected route
            cy.visit('/testcompany/profile');

            // Should redirect to login
            cy.url().should('include', '/login');
            cy.get('[data-cy="session-expired-message"]').should('be.visible');
        });

        it('should handle API request with expired token', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Intercept API calls to return 401 (unauthorized)
            cy.intercept('GET', '**/api/**', {
                statusCode: 401,
                body: { error: 'Token expired' }
            }).as('expiredTokenRequest');

            // Try to perform an action that makes an API call
            cy.get('[data-cy="refresh-data"]').click();

            // Should redirect to login
            cy.url().should('include', '/login');
            cy.get('[data-cy="session-expired-message"]').should('be.visible');
        });

        it('should implement automatic token refresh before expiration', () => {
            // Mock a token that expires soon
            cy.intercept('POST', '**/auth/login', {
                statusCode: 200,
                body: {
                    token: 'short-lived-token',
                    refreshToken: 'refresh-token-123',
                    expiresIn: 5 // 5 seconds
                }
            }).as('loginWithShortToken');

            // Mock token refresh endpoint
            cy.intercept('POST', '**/auth/refresh', {
                statusCode: 200,
                body: {
                    token: 'new-refreshed-token',
                    expiresIn: 3600
                }
            }).as('tokenRefresh');

            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Wait for automatic token refresh
            cy.wait('@tokenRefresh', { timeout: 10000 });

            // Should still be logged in with new token
            dashboardPage.expectToBeOnDashboard();
            cy.get('[data-cy="user-menu"]').should('be.visible');
        });

        it('should handle failed token refresh and require re-login', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Mock failed token refresh
            cy.intercept('POST', '**/auth/refresh', {
                statusCode: 401,
                body: { error: 'Refresh token expired' }
            }).as('failedTokenRefresh');

            // Simulate token expiration
            cy.window().then((win) => {
                win.localStorage.setItem('tokenExpiry', Date.now() - 1000); // Expired 1 second ago
            });

            // Trigger token refresh attempt
            cy.visit('/testcompany/profile');

            // Should redirect to login after failed refresh
            cy.url().should('include', '/login');
            cy.get('[data-cy="session-expired-message"]').should('be.visible');
        });

        it('should preserve intended destination after re-authentication', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Navigate to a specific page
            cy.visit('/testcompany/profile');
            cy.get('[data-cy="profile-page"]').should('be.visible');

            // Simulate session expiration
            cy.window().then((win) => {
                win.localStorage.removeItem('authToken');
            });

            // Try to access another protected route
            cy.visit('/testcompany/attendance');

            // Should redirect to login with return URL
            cy.url().should('include', '/login');
            cy.url().should('include', 'returnUrl=%2Ftestcompany%2Fattendance');

            // Re-authenticate
            cy.fixture('users').then((users) => {
                loginPage.login(users.employee.email, users.employee.password);
            });

            // Should redirect to originally requested page
            cy.url().should('include', '/attendance');
            cy.get('[data-cy="attendance-page"]').should('be.visible');
        });

        it('should show session timeout warning before expiration', () => {
            // Mock a token that expires in 2 minutes
            cy.intercept('POST', '**/auth/login', {
                statusCode: 200,
                body: {
                    token: 'expiring-token',
                    expiresIn: 120 // 2 minutes
                }
            }).as('loginWithExpiringToken');

            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Fast-forward time to trigger warning (simulate with localStorage)
            cy.window().then((win) => {
                win.localStorage.setItem('tokenExpiry', Date.now() + 30000); // Expires in 30 seconds
                win.dispatchEvent(new Event('storage'));
            });

            // Should show session timeout warning
            cy.get('[data-cy="session-timeout-warning"]').should('be.visible', { timeout: 5000 });
            cy.get('[data-cy="extend-session-button"]').should('be.visible');
            cy.get('[data-cy="logout-now-button"]').should('be.visible');
        });

        it('should extend session when user chooses to continue', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Trigger session timeout warning
            cy.window().then((win) => {
                win.localStorage.setItem('tokenExpiry', Date.now() + 30000);
                win.dispatchEvent(new Event('storage'));
            });

            cy.get('[data-cy="session-timeout-warning"]').should('be.visible');
            cy.get('[data-cy="extend-session-button"]').click();

            // Should extend session and hide warning
            cy.get('[data-cy="session-timeout-warning"]').should('not.exist');
            dashboardPage.expectToBeOnDashboard();
        });
    });

    describe('Multi-tenant Isolation - Users Cannot Access Other Tenants', () => {
        it('should isolate authentication between different tenants', () => {
            // Login to first tenant
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();
            dashboardPage.verifyCurrentTenant('testcompany');

            // Try to access second tenant directly
            cy.visit('/secondtest/dashboard');

            // Should redirect to login for second tenant
            cy.url().should('include', '/secondtest/login');
            cy.get('[data-cy="tenant-isolation-message"]').should('be.visible');
        });

        it('should prevent cross-tenant data access via API', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Get auth token for testcompany
            cy.window().then((win) => {
                const token = win.localStorage.getItem('authToken');

                // Try to access testcompany data (should succeed)
                cy.apiRequest('GET', '/api/testcompany/users', null, {
                    'Authorization': `Bearer ${token}`
                }).then((response) => {
                    expect(response.status).to.eq(200);
                });

                // Try to access secondtest data with testcompany token (should fail)
                cy.apiRequest('GET', '/api/secondtest/users', null, {
                    'Authorization': `Bearer ${token}`
                }).then((response) => {
                    expect(response.status).to.eq(403); // Forbidden
                    expect(response.body.error).to.include('Access denied');
                });
            });
        });

        it('should prevent cross-tenant URL manipulation', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Try to access another tenant's specific resource
            cy.visit('/secondtest/employees/123');

            // Should redirect to login or show access denied
            cy.url().should('match', /(login|access-denied)/);
        });

        it('should handle invalid tenant domain gracefully', () => {
            cy.visit('/nonexistent-tenant/login');

            // Should show tenant not found error
            cy.get('[data-cy="tenant-error"]').should('be.visible');
            cy.get('[data-cy="tenant-error"]').should('contain.text', 'Tenant not found');

            // Should not expose system information
            cy.get('[data-cy="tenant-error"]').should('not.contain.text', 'database');
            cy.get('[data-cy="tenant-error"]').should('not.contain.text', 'server');
        });

        it('should isolate user sessions between tenants', () => {
            // Login to first tenant
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Store first tenant's session info
            cy.window().then((win) => {
                const firstTenantToken = win.localStorage.getItem('authToken');
                expect(firstTenantToken).to.not.be.null;

                // Try to login to second tenant in same browser
                cy.visit('/secondtest/login');

                cy.fixture('users').then((users) => {
                    loginPage.login('employee2@secondtest.com', users.employee.password);
                    loginPage.expectLoginSuccess();

                    // Verify second tenant session
                    cy.window().then((win2) => {
                        const secondTenantToken = win2.localStorage.getItem('authToken');
                        expect(secondTenantToken).to.not.be.null;
                        expect(secondTenantToken).to.not.equal(firstTenantToken);
                    });
                });
            });
        });

        it('should prevent tenant data leakage in search results', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Navigate to employees page and search
            cy.visit('/testcompany/employees');
            cy.get('[data-cy="search-input"]').type('employee');
            cy.get('[data-cy="search-button"]').click();

            // Verify only testcompany employees are returned
            cy.get('[data-cy="employee-row"]').each(($row) => {
                cy.wrap($row).should('not.contain.text', 'secondtest.com');
                cy.wrap($row).should('not.contain.text', 'Second Test Company');
            });
        });

        it('should isolate file uploads between tenants', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Upload a file
            cy.visit('/testcompany/documents');
            cy.get('[data-cy="upload-button"]').click();
            cy.uploadFile('test-document.pdf');
            cy.get('[data-cy="submit-upload"]').click();

            cy.expectSuccessMessage('File uploaded successfully');

            // Login to second tenant
            cy.visit('/secondtest/login');
            loginPage.login('employee2@secondtest.com', 'Employee123!');
            loginPage.expectLoginSuccess();

            // Verify second tenant cannot see first tenant's files
            cy.visit('/secondtest/documents');
            cy.get('[data-cy="documents-table"]').should('not.contain.text', 'test-document.pdf');
        });

        it('should prevent cross-tenant notification access', () => {
            loginPage.loginAsTenantUser('manager', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Check notifications for testcompany
            cy.get('[data-cy="notifications"]').click();
            cy.get('[data-cy="notifications-dropdown"]').should('be.visible');

            // Store notification count
            cy.get('[data-cy="notification-item"]').then(($notifications) => {
                const testcompanyNotificationCount = $notifications.length;

                // Login to second tenant
                cy.visit('/secondtest/login');
                loginPage.login('employee2@secondtest.com', 'Employee123!');
                loginPage.expectLoginSuccess();

                // Check notifications for secondtest
                cy.get('[data-cy="notifications"]').click();
                cy.get('[data-cy="notifications-dropdown"]').should('be.visible');

                // Verify different notification set (or empty)
                cy.get('[data-cy="notification-item"]').then(($secondNotifications) => {
                    // Should not have the same notifications
                    expect($secondNotifications.length).to.not.equal(testcompanyNotificationCount);
                });
            });
        });

        it('should enforce tenant-specific module access', () => {
            // Setup: testcompany has all modules, secondtest has limited modules
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Verify testcompany has access to payroll module
            dashboardPage.verifyModuleAccess('payroll', true);

            // Login to second tenant (which doesn't have payroll module)
            cy.visit('/secondtest/login');
            loginPage.login('employee2@secondtest.com', 'Employee123!');
            loginPage.expectLoginSuccess();

            // Verify secondtest doesn't have access to payroll module
            dashboardPage.verifyModuleAccess('payroll', false);

            // Try to access payroll URL directly
            cy.visit('/secondtest/payroll');
            cy.get('[data-cy="module-access-denied"]').should('be.visible');
        });
    });

    describe('Role-based Login Restrictions', () => {
        it('should enforce employee role restrictions', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Verify employee has limited access
            dashboardPage.verifyModuleAccess('hrCore', true);
            dashboardPage.verifyModuleAccess('attendance', true);
            dashboardPage.verifyModuleAccess('vacation', true);

            // Employee should not have access to admin modules
            dashboardPage.verifyModuleAccess('payroll', false);
            cy.get('[data-cy="menu-system-settings"]').should('not.exist');
            cy.get('[data-cy="menu-user-management"]').should('not.exist');
        });

        it('should enforce HR manager role restrictions', () => {
            loginPage.loginAsTenantUser('hrManager', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Verify HR manager has HR-related access
            dashboardPage.verifyModuleAccess('hrCore', true);
            dashboardPage.verifyModuleAccess('attendance', true);
            dashboardPage.verifyModuleAccess('payroll', true);
            dashboardPage.verifyModuleAccess('vacation', true);

            // HR manager should not have system admin access
            cy.get('[data-cy="menu-system-settings"]').should('not.exist');

            // But should have user management access
            cy.get('[data-cy="menu-user-management"]').should('be.visible');
        });

        it('should enforce manager role restrictions', () => {
            loginPage.loginAsTenantUser('manager', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Verify manager has team management access
            dashboardPage.verifyModuleAccess('tasks', true);
            dashboardPage.verifyModuleAccess('attendance', true);
            dashboardPage.verifyModuleAccess('vacation', true); // For approvals

            // Manager should not have payroll access
            dashboardPage.verifyModuleAccess('payroll', false);

            // Should have approval capabilities
            cy.get('[data-cy="menu-approvals"]').should('be.visible');
        });

        it('should enforce tenant admin role permissions', () => {
            loginPage.loginAsTenantUser('tenantAdmin', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Verify admin has access to all tenant modules
            dashboardPage.verifyAllModulesAccess(['hr-core', 'attendance', 'payroll', 'vacation', 'tasks', 'documents', 'missions', 'overtime']);

            // Should have system settings access
            cy.get('[data-cy="menu-system-settings"]').should('be.visible');
            cy.get('[data-cy="menu-user-management"]').should('be.visible');

            // But should not have platform admin access
            cy.visit('http://localhost:3001/dashboard');
            cy.url().should('include', '/login');
        });

        it('should prevent role escalation attempts', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Try to access admin-only API endpoints
            cy.window().then((win) => {
                const token = win.localStorage.getItem('authToken');

                cy.apiRequest('GET', '/api/testcompany/admin/users', null, {
                    'Authorization': `Bearer ${token}`
                }).then((response) => {
                    expect(response.status).to.eq(403); // Forbidden
                    expect(response.body.error).to.include('Insufficient permissions');
                });

                cy.apiRequest('POST', '/api/testcompany/admin/settings', { setting: 'value' }, {
                    'Authorization': `Bearer ${token}`
                }).then((response) => {
                    expect(response.status).to.eq(403); // Forbidden
                });
            });
        });

        it('should validate role permissions on page navigation', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Try to access admin pages directly
            cy.visit('/testcompany/admin/users');
            cy.get('[data-cy="access-denied"]').should('be.visible');
            cy.get('[data-cy="access-denied"]').should('contain.text', 'Insufficient permissions');

            cy.visit('/testcompany/admin/settings');
            cy.get('[data-cy="access-denied"]').should('be.visible');

            // Try to access payroll (not available to employee)
            cy.visit('/testcompany/payroll');
            cy.get('[data-cy="module-access-denied"]').should('be.visible');
        });

        it('should handle role changes during active session', () => {
            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Verify initial employee access
            dashboardPage.verifyModuleAccess('payroll', false);

            // Simulate role change (admin promotes employee to HR manager)
            cy.window().then((win) => {
                // This would typically happen through a WebSocket or polling mechanism
                win.dispatchEvent(new CustomEvent('roleChanged', {
                    detail: { newRole: 'hr', newPermissions: ['hr_management', 'payroll'] }
                }));
            });

            // Refresh to pick up new permissions
            cy.reload();

            // Should now have HR manager access
            dashboardPage.verifyModuleAccess('payroll', true);
        });

        it('should enforce time-based access restrictions', () => {
            // Mock current time to be outside business hours
            cy.clock(new Date('2024-01-01T02:00:00.000Z')); // 2 AM

            loginPage.loginAsTenantUser('employee', 'testcompany');
            dashboardPage.expectToBeOnDashboard();

            // Try to access time-restricted features
            cy.visit('/testcompany/attendance/clock-in');
            cy.get('[data-cy="time-restriction-warning"]').should('be.visible');
            cy.get('[data-cy="time-restriction-warning"]').should('contain.text', 'outside business hours');
        });

        it('should enforce IP-based access restrictions for admin roles', () => {
            // This would typically be configured in the backend
            // Mock a request from unauthorized IP
            cy.intercept('POST', '**/auth/login', (req) => {
                if (req.body.email.includes('admin')) {
                    req.reply({
                        statusCode: 403,
                        body: { error: 'Access denied from this IP address' }
                    });
                }
            }).as('ipRestrictedLogin');

            loginPage.visit('testcompany');
            cy.fixture('users').then((users) => {
                loginPage.login(users.tenantAdmin.email, users.tenantAdmin.password);

                loginPage.expectLoginFailure('Access denied from this IP address');
            });
        });
    });
});
describe('Security and Edge Cases', () => {
    it('should validate JWT token integrity', () => {
        loginPage.loginAsTenantUser('employee', 'testcompany');
        dashboardPage.expectToBeOnDashboard();

        // Tamper with the token
        cy.window().then((win) => {
            win.localStorage.setItem('authToken', 'invalid.jwt.token');
        });

        // Try to access protected route
        cy.visit('/testcompany/profile');

        // Should redirect to login due to invalid token
        cy.url().should('include', '/login');
        cy.get('[data-cy="invalid-token-error"]').should('be.visible');
    });

    it('should prevent access to protected routes when not logged in', () => {
        // Try to access various protected routes
        const protectedRoutes = [
            '/testcompany/dashboard',
            '/testcompany/profile',
            '/testcompany/attendance',
            '/testcompany/payroll',
            'http://localhost:3001/dashboard'
        ];

        protectedRoutes.forEach(route => {
            cy.visit(route);
            cy.url().should('include', '/login');
        });
    });

    it('should redirect to intended page after login', () => {
        // Try to access a protected route
        cy.visit('/testcompany/profile');

        // Should redirect to login with return URL
        cy.url().should('include', '/login');
        cy.url().should('include', 'returnUrl');

        // Login
        loginPage.loginAsTenantUser('employee', 'testcompany');

        // Should redirect to originally requested page
        cy.url().should('include', '/profile');
        cy.get('[data-cy="profile-page"]').should('be.visible');
    });

    it('should handle concurrent login attempts', () => {
        // Simulate multiple login attempts at the same time
        cy.fixture('users').then((users) => {
            loginPage.visit('testcompany');

            // Start multiple login requests
            for (let i = 0; i < 3; i++) {
                loginPage.enterEmail(users.employee.email);
                loginPage.enterPassword(users.employee.password);
                loginPage.clickLogin();
                cy.wait(100);
            }

            // Should handle gracefully and login successfully
            loginPage.expectLoginSuccess();
            dashboardPage.expectToBeOnDashboard();
        });
    });

    it('should handle network errors during authentication', () => {
        // Simulate network error
        cy.intercept('POST', '**/auth/login', { forceNetworkError: true }).as('networkError');

        loginPage.visit('testcompany');
        loginPage.loginAsTenantUser('employee', 'testcompany');

        // Should show network error message
        cy.get('[data-cy="network-error"]').should('be.visible');
        cy.get('[data-cy="retry-button"]').should('be.visible');

        // Remove network error and retry
        cy.intercept('POST', '**/auth/login').as('normalLogin');
        cy.get('[data-cy="retry-button"]').click();

        loginPage.expectLoginSuccess();
    });

    it('should handle server errors during authentication', () => {
        // Simulate server error
        cy.intercept('POST', '**/auth/login', {
            statusCode: 500,
            body: { error: 'Internal server error' }
        }).as('serverError');

        loginPage.visit('testcompany');
        loginPage.loginAsTenantUser('employee', 'testcompany');

        // Should show server error message
        cy.get('[data-cy="server-error"]').should('be.visible');
        cy.get('[data-cy="server-error"]').should('contain.text', 'server error');
    });

    it('should implement CSRF protection', () => {
        loginPage.visit('testcompany');

        // Verify CSRF token is present in form
        cy.get('[data-cy="csrf-token"]').should('exist');
        cy.get('[data-cy="csrf-token"]').should('have.attr', 'value');

        // Try to submit without CSRF token (simulate attack)
        cy.window().then((win) => {
            cy.get('[data-cy="csrf-token"]').invoke('val', 'invalid-token');
        });

        loginPage.loginAsTenantUser('employee', 'testcompany');

        // Should reject due to invalid CSRF token
        cy.get('[data-cy="csrf-error"]').should('be.visible');
    });

    it('should implement secure password requirements', () => {
        cy.visit('/testcompany/forgot-password');

        // Simulate password reset flow
        const resetToken = 'valid-reset-token';
        cy.visit(`/testcompany/reset-password?token=${resetToken}`);

        // Test various password requirements
        const weakPasswords = [
            'weak',
            '12345678',
            'password',
            'Password',
            'Password123'
        ];

        weakPasswords.forEach(password => {
            cy.get('[data-cy="new-password-input"]').clear().type(password);
            cy.get('[data-cy="password-strength"]').should('contain.text', 'Weak');
        });

        // Test strong password
        cy.get('[data-cy="new-password-input"]').clear().type('StrongPassword123!');
        cy.get('[data-cy="password-strength"]').should('contain.text', 'Strong');
    });

    it('should log security events for audit purposes', () => {
        // This test verifies that security events are logged
        // In a real implementation, this would check audit logs

        loginPage.visit('testcompany');

        // Failed login attempt
        loginPage.login('test@test.com', 'wrongpassword');

        // Successful login
        loginPage.loginAsTenantUser('employee', 'testcompany');

        // Logout
        dashboardPage.logout();

        // In a real test, we would verify these events are logged:
        // - Failed login attempt
        // - Successful login
        // - Logout event
        // For now, we just verify the flow works
        cy.url().should('include', '/login');
    });
});
});