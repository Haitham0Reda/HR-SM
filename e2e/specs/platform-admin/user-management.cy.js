/**
 * E2E Tests for Platform Admin - User Management
 * Tests user management and role assignment workflows
 */

describe('Platform Admin - User Management', () => {
    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Login as platform admin
        cy.loginAsPlatformAdmin();

        // Navigate to user management
        cy.navigateToPlatformSection('users');
        cy.shouldBeOnPage('users');
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    describe('Platform User Management', () => {
        it('should display all platform users', () => {
            cy.get('[data-cy="users-table"]').should('be.visible');

            // Verify table headers
            cy.get('[data-cy="table-header"]').should('contain.text', 'Name');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Email');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Role');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Status');
            cy.get('[data-cy="table-header"]').should('contain.text', 'Last Login');

            // Verify platform admin user exists
            cy.get('[data-cy="table-row"]').should('contain.text', 'Platform Administrator');
            cy.get('[data-cy="table-row"]').should('contain.text', 'platform@hrms.com');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Platform Admin');
        });

        it('should create new platform user', () => {
            cy.get('[data-cy="create-user-button"]').click();
            cy.get('[data-cy="user-creation-modal"]').should('be.visible');

            // Fill user details
            const userData = {
                name: 'New Platform User',
                email: 'newuser@hrms.com',
                role: 'platform_admin',
                password: 'NewUser123!',
                confirmPassword: 'NewUser123!'
            };

            cy.fillForm(userData);

            // Set permissions
            cy.get('[data-cy="permissions-section"]').should('be.visible');
            cy.get('[data-cy="permission-tenant-management"]').check();
            cy.get('[data-cy="permission-license-management"]').check();
            cy.get('[data-cy="permission-system-config"]').check();

            // Submit user creation
            cy.submitForm('[data-cy="user-creation-form"]');

            cy.expectSuccessMessage('Platform user created successfully');

            // Verify user appears in list
            cy.searchInTable('New Platform User');
            cy.get('[data-cy="table-row"]').should('contain.text', 'New Platform User');
            cy.get('[data-cy="table-row"]').should('contain.text', 'newuser@hrms.com');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Platform Admin');
        });

        it('should create support user with limited permissions', () => {
            cy.get('[data-cy="create-user-button"]').click();

            const supportUserData = {
                name: 'Support User',
                email: 'support@hrms.com',
                role: 'support',
                password: 'Support123!',
                confirmPassword: 'Support123!'
            };

            cy.fillForm(supportUserData);

            // Set limited permissions for support role
            cy.get('[data-cy="permission-view-tenants"]').check();
            cy.get('[data-cy="permission-view-licenses"]').check();
            cy.get('[data-cy="permission-generate-reports"]').check();

            // Should not have admin permissions
            cy.get('[data-cy="permission-delete-tenants"]').should('be.disabled');
            cy.get('[data-cy="permission-revoke-licenses"]').should('be.disabled');

            cy.submitForm('[data-cy="user-creation-form"]');

            cy.expectSuccessMessage('Support user created successfully');

            // Verify support user
            cy.searchInTable('Support User');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Support');
        });

        it('should validate user creation inputs', () => {
            cy.get('[data-cy="create-user-button"]').click();

            // Try to submit without required fields
            cy.submitForm('[data-cy="user-creation-form"]');

            // Verify validation errors
            cy.get('[data-cy="name-error"]').should('contain.text', 'Name is required');
            cy.get('[data-cy="email-error"]').should('contain.text', 'Email is required');
            cy.get('[data-cy="password-error"]').should('contain.text', 'Password is required');

            // Test invalid email
            cy.fillForm({
                name: 'Test User',
                email: 'invalid-email',
                password: 'weak'
            });

            cy.submitForm('[data-cy="user-creation-form"]');

            cy.get('[data-cy="email-error"]').should('contain.text', 'Invalid email format');
            cy.get('[data-cy="password-error"]').should('contain.text', 'Password must be at least 8 characters');

            // Test password mismatch
            cy.fillForm({
                password: 'ValidPassword123!',
                confirmPassword: 'DifferentPassword123!'
            });

            cy.submitForm('[data-cy="user-creation-form"]');

            cy.get('[data-cy="confirmPassword-error"]').should('contain.text', 'Passwords do not match');
        });

        it('should prevent duplicate email addresses', () => {
            cy.get('[data-cy="create-user-button"]').click();

            // Try to create user with existing email
            cy.fillForm({
                name: 'Duplicate User',
                email: 'platform@hrms.com', // Already exists
                password: 'ValidPassword123!',
                confirmPassword: 'ValidPassword123!'
            });

            cy.submitForm('[data-cy="user-creation-form"]');

            cy.expectErrorMessage('Email address already exists');
            cy.get('[data-cy="email-input"]').should('have.class', 'error');
        });
    });

    describe('User Role Management', () => {
        it('should update user role and permissions', () => {
            cy.searchInTable('Support User');
            cy.clickTableAction(0, 'edit');

            cy.get('[data-cy="user-edit-modal"]').should('be.visible');

            // Change role from support to platform_admin
            cy.get('[data-cy="role-select"]').select('platform_admin');

            // Permissions should update automatically
            cy.get('[data-cy="permission-tenant-management"]').should('be.enabled');
            cy.get('[data-cy="permission-license-management"]').should('be.enabled');

            // Add additional permissions
            cy.get('[data-cy="permission-system-config"]').check();
            cy.get('[data-cy="permission-audit-logs"]').check();

            cy.submitForm('[data-cy="user-edit-form"]');

            cy.expectSuccessMessage('User updated successfully');

            // Verify role change
            cy.searchInTable('Support User');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Platform Admin');
        });

        it('should manage custom permissions', () => {
            cy.searchInTable('New Platform User');
            cy.clickTableAction(0, 'permissions');

            cy.get('[data-cy="permissions-modal"]').should('be.visible');

            // Show current permissions
            cy.get('[data-cy="current-permissions"]').should('be.visible');

            // Add new permissions
            cy.get('[data-cy="permission-backup-management"]').check();
            cy.get('[data-cy="permission-system-monitoring"]').check();

            // Remove existing permission
            cy.get('[data-cy="permission-license-management"]').uncheck();

            // Save permission changes
            cy.get('[data-cy="save-permissions"]').click();

            cy.expectSuccessMessage('Permissions updated successfully');

            // Verify permission changes
            cy.clickTableAction(0, 'permissions');
            cy.get('[data-cy="permission-backup-management"]').should('be.checked');
            cy.get('[data-cy="permission-license-management"]').should('not.be.checked');
        });

        it('should prevent removing all admin permissions', () => {
            // Try to remove all permissions from the last admin user
            cy.searchInTable('Platform Administrator');
            cy.clickTableAction(0, 'permissions');

            // Try to uncheck all admin permissions
            cy.get('[data-cy="permission-tenant-management"]').uncheck();
            cy.get('[data-cy="permission-license-management"]').uncheck();
            cy.get('[data-cy="permission-system-config"]').uncheck();

            cy.get('[data-cy="save-permissions"]').click();

            // Should show warning
            cy.get('[data-cy="admin-warning"]').should('be.visible');
            cy.get('[data-cy="admin-warning"]').should('contain.text', 'At least one user must have admin permissions');

            // Should not save changes
            cy.get('[data-cy="permissions-modal"]').should('be.visible');
        });
    });

    describe('User Status Management', () => {
        it('should activate and deactivate users', () => {
            cy.searchInTable('New Platform User');

            // Deactivate user
            cy.clickTableAction(0, 'deactivate');
            cy.confirmDialog();

            cy.expectSuccessMessage('User deactivated successfully');

            // Verify status change
            cy.get('[data-cy="table-row"]').should('contain.text', 'Inactive');

            // Reactivate user
            cy.clickTableAction(0, 'activate');
            cy.confirmDialog();

            cy.expectSuccessMessage('User activated successfully');

            // Verify status change
            cy.get('[data-cy="table-row"]').should('contain.text', 'Active');
        });

        it('should handle user session management', () => {
            cy.searchInTable('New Platform User');
            cy.clickTableAction(0, 'sessions');

            cy.get('[data-cy="user-sessions-modal"]').should('be.visible');

            // Show active sessions
            cy.get('[data-cy="active-sessions"]').should('be.visible');
            cy.get('[data-cy="session-list"]').should('be.visible');

            // Terminate specific session
            cy.get('[data-cy="session-row"]').first().within(() => {
                cy.get('[data-cy="terminate-session"]').click();
            });

            cy.confirmDialog();

            cy.expectSuccessMessage('Session terminated successfully');

            // Terminate all sessions
            cy.get('[data-cy="terminate-all-sessions"]').click();
            cy.confirmDialog();

            cy.expectSuccessMessage('All sessions terminated successfully');
        });

        it('should reset user password', () => {
            cy.searchInTable('New Platform User');
            cy.clickTableAction(0, 'reset-password');

            cy.get('[data-cy="password-reset-modal"]').should('be.visible');

            // Option to generate temporary password
            cy.get('[data-cy="generate-temp-password"]').click();

            cy.get('[data-cy="temp-password-display"]').should('be.visible');
            cy.get('[data-cy="temp-password-value"]').should('not.be.empty');

            // Option to send reset email
            cy.get('[data-cy="send-reset-email"]').check();

            cy.get('[data-cy="confirm-password-reset"]').click();

            cy.expectSuccessMessage('Password reset successfully');

            // Verify user must change password on next login
            cy.get('[data-cy="table-row"]').should('contain.text', 'Password Reset Required');
        });
    });

    describe('Tenant User Management', () => {
        it('should view tenant users', () => {
            cy.get('[data-cy="tenant-users-tab"]').click();

            // Select tenant to view users
            cy.get('[data-cy="tenant-select"]').select('testcompany');
            cy.waitForTableLoad();

            // Verify tenant users are displayed
            cy.get('[data-cy="tenant-users-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('contain.text', 'Test Admin');
            cy.get('[data-cy="table-row"]').should('contain.text', 'admin@testcompany.com');
        });

        it('should impersonate tenant user', () => {
            cy.get('[data-cy="tenant-users-tab"]').click();
            cy.get('[data-cy="tenant-select"]').select('testcompany');

            cy.searchInTable('Test Admin');
            cy.clickTableAction(0, 'impersonate');

            cy.get('[data-cy="impersonation-warning"]').should('be.visible');
            cy.get('[data-cy="impersonation-warning"]').should('contain.text', 'You will be logged in as this user');

            cy.get('[data-cy="confirm-impersonation"]').click();

            // Should redirect to tenant application
            cy.url().should('include', '/testcompany');
            cy.get('[data-cy="impersonation-banner"]').should('be.visible');
            cy.get('[data-cy="impersonation-banner"]').should('contain.text', 'Impersonating: Test Admin');

            // Should have option to return to platform admin
            cy.get('[data-cy="return-to-platform"]').should('be.visible');
        });

        it('should manage tenant user roles', () => {
            cy.get('[data-cy="tenant-users-tab"]').click();
            cy.get('[data-cy="tenant-select"]').select('testcompany');

            cy.searchInTable('Test Employee');
            cy.clickTableAction(0, 'edit-role');

            cy.get('[data-cy="tenant-role-modal"]').should('be.visible');

            // Change role from employee to manager
            cy.get('[data-cy="tenant-role-select"]').select('manager');

            // Update permissions
            cy.get('[data-cy="permission-team-management"]').check();
            cy.get('[data-cy="permission-approval"]').check();

            cy.get('[data-cy="save-tenant-role"]').click();

            cy.expectSuccessMessage('Tenant user role updated successfully');

            // Verify role change
            cy.get('[data-cy="table-row"]').should('contain.text', 'Manager');
        });
    });

    describe('User Analytics', () => {
        it('should display user statistics', () => {
            cy.get('[data-cy="user-analytics"]').should('be.visible');

            // Verify key metrics
            cy.get('[data-cy="total-platform-users"]').should('be.visible');
            cy.get('[data-cy="active-platform-users"]').should('be.visible');
            cy.get('[data-cy="total-tenant-users"]').should('be.visible');
            cy.get('[data-cy="user-growth-rate"]').should('be.visible');

            // Verify charts
            cy.get('[data-cy="user-activity-chart"]').should('be.visible');
            cy.get('[data-cy="role-distribution-chart"]').should('be.visible');
        });

        it('should show user activity logs', () => {
            cy.searchInTable('Platform Administrator');
            cy.clickTableAction(0, 'activity');

            cy.get('[data-cy="user-activity-modal"]').should('be.visible');

            // Verify activity log
            cy.get('[data-cy="activity-log"]').should('be.visible');
            cy.get('[data-cy="activity-entry"]').should('contain.text', 'Login');
            cy.get('[data-cy="activity-entry"]').should('contain.text', 'IP Address');
            cy.get('[data-cy="activity-entry"]').should('contain.text', 'User Agent');

            // Filter activity by type
            cy.get('[data-cy="activity-filter"]').select('login');
            cy.get('[data-cy="activity-entry"]').each(($entry) => {
                cy.wrap($entry).should('contain.text', 'Login');
            });
        });

        it('should export user data', () => {
            cy.get('[data-cy="export-users-button"]').click();
            cy.get('[data-cy="export-options-modal"]').should('be.visible');

            // Select export options
            cy.get('[data-cy="export-format"]').select('csv');
            cy.get('[data-cy="include-platform-users"]').check();
            cy.get('[data-cy="include-tenant-users"]').check();
            cy.get('[data-cy="include-activity-logs"]').check();

            // Export data
            cy.get('[data-cy="export-submit"]').click();

            cy.expectSuccessMessage('User data exported successfully');

            // Verify download
            cy.readFile('e2e/downloads/users-export.csv').should('exist');
        });
    });

    describe('Error Handling', () => {
        it('should handle user creation errors', () => {
            cy.intercept('POST', '**/api/platform/users', { statusCode: 400, body: { error: 'Invalid user data' } }).as('userError');

            cy.get('[data-cy="create-user-button"]').click();
            cy.fillForm({
                name: 'Error User',
                email: 'error@hrms.com',
                password: 'ErrorUser123!'
            });
            cy.submitForm('[data-cy="user-creation-form"]');

            cy.expectErrorMessage('Invalid user data');
        });

        it('should handle permission update errors', () => {
            cy.intercept('PUT', '**/api/platform/users/*/permissions', { statusCode: 403, body: { error: 'Insufficient permissions' } }).as('permissionError');

            cy.searchInTable('New Platform User');
            cy.clickTableAction(0, 'permissions');

            cy.get('[data-cy="permission-system-config"]').check();
            cy.get('[data-cy="save-permissions"]').click();

            cy.expectErrorMessage('Insufficient permissions');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible', () => {
            cy.checkAccessibility('[data-cy="users-page"]');
        });

        it('should support keyboard navigation', () => {
            cy.get('[data-cy="create-user-button"]').focus().type('{enter}');
            cy.get('[data-cy="user-creation-modal"]').should('be.visible');

            // Navigate through form with keyboard
            cy.get('[data-cy="name-input"]').focus().type('Keyboard User');
            cy.get('[data-cy="email-input"]').focus().type('keyboard@hrms.com');
            cy.get('[data-cy="password-input"]').focus().type('KeyboardUser123!');

            cy.get('[data-cy="submit-button"]').focus().type('{enter}');
        });
    });
});