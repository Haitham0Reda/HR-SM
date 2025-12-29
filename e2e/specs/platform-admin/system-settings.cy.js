/**
 * E2E Tests for Platform Admin - System Settings
 * Tests system settings and configuration changes
 */

describe('Platform Admin - System Settings', () => {
    beforeEach(() => {
        // Clean up test data before each test
        cy.cleanupTestData();

        // Login as platform admin
        cy.loginAsPlatformAdmin();

        // Navigate to system settings
        cy.navigateToPlatformSection('settings');
        cy.shouldBeOnPage('settings');
    });

    afterEach(() => {
        // Clean up after each test
        cy.cleanupAfterTest();
    });

    describe('General System Settings', () => {
        it('should display current system configuration', () => {
            cy.get('[data-cy="system-info"]').should('be.visible');

            // Verify system information
            cy.get('[data-cy="system-version"]').should('be.visible');
            cy.get('[data-cy="database-status"]').should('contain.text', 'Connected');
            cy.get('[data-cy="license-server-status"]').should('contain.text', 'Online');
            cy.get('[data-cy="uptime"]').should('be.visible');

            // Verify configuration sections
            cy.get('[data-cy="general-settings"]').should('be.visible');
            cy.get('[data-cy="security-settings"]').should('be.visible');
            cy.get('[data-cy="email-settings"]').should('be.visible');
            cy.get('[data-cy="backup-settings"]').should('be.visible');
        });

        it('should update general system settings', () => {
            cy.get('[data-cy="general-settings"]').within(() => {
                cy.get('[data-cy="edit-button"]').click();
            });

            cy.get('[data-cy="general-settings-modal"]').should('be.visible');

            // Update system settings
            const settingsData = {
                systemName: 'HR-SM Enterprise Platform',
                systemDescription: 'Updated system description',
                defaultTimezone: 'America/New_York',
                defaultLanguage: 'en',
                maintenanceMode: false,
                debugMode: false
            };

            cy.fillForm(settingsData);

            // Update session settings
            cy.get('[data-cy="session-timeout"]').clear().type('30');
            cy.get('[data-cy="max-concurrent-sessions"]').clear().type('5');

            // Update file upload settings
            cy.get('[data-cy="max-file-size"]').clear().type('10');
            cy.get('[data-cy="allowed-file-types"]').clear().type('pdf,doc,docx,jpg,png');

            cy.submitForm('[data-cy="general-settings-form"]');

            cy.expectSuccessMessage('General settings updated successfully');

            // Verify settings are saved
            cy.get('[data-cy="system-name"]').should('contain.text', 'HR-SM Enterprise Platform');
            cy.get('[data-cy="default-timezone"]').should('contain.text', 'America/New_York');
        });

        it('should toggle maintenance mode', () => {
            cy.get('[data-cy="maintenance-mode-toggle"]').click();

            cy.get('[data-cy="maintenance-mode-modal"]').should('be.visible');

            // Set maintenance message
            cy.get('[data-cy="maintenance-message"]').type('System maintenance in progress. Please check back later.');

            // Set maintenance duration
            cy.get('[data-cy="maintenance-duration"]').select('2-hours');

            // Enable maintenance mode
            cy.get('[data-cy="enable-maintenance"]').click();

            cy.expectSuccessMessage('Maintenance mode enabled');

            // Verify maintenance mode is active
            cy.get('[data-cy="maintenance-status"]').should('contain.text', 'Active');
            cy.get('[data-cy="maintenance-banner"]').should('be.visible');
        });

        it('should configure system notifications', () => {
            cy.get('[data-cy="notification-settings"]').within(() => {
                cy.get('[data-cy="edit-button"]').click();
            });

            cy.get('[data-cy="notification-settings-modal"]').should('be.visible');

            // Configure email notifications
            cy.get('[data-cy="email-notifications"]').check();
            cy.get('[data-cy="admin-email"]').clear().type('admin@hrms.com');

            // Configure notification types
            cy.get('[data-cy="notify-license-expiry"]').check();
            cy.get('[data-cy="notify-system-errors"]').check();
            cy.get('[data-cy="notify-security-events"]').check();
            cy.get('[data-cy="notify-backup-status"]').check();

            // Set notification frequency
            cy.get('[data-cy="notification-frequency"]').select('daily');

            cy.submitForm('[data-cy="notification-settings-form"]');

            cy.expectSuccessMessage('Notification settings updated successfully');
        });
    });

    describe('Security Settings', () => {
        it('should update password policy', () => {
            cy.get('[data-cy="security-settings"]').within(() => {
                cy.get('[data-cy="password-policy-tab"]').click();
            });

            cy.get('[data-cy="password-policy-form"]').should('be.visible');

            // Update password requirements
            cy.get('[data-cy="min-password-length"]').clear().type('12');
            cy.get('[data-cy="require-uppercase"]').check();
            cy.get('[data-cy="require-lowercase"]').check();
            cy.get('[data-cy="require-numbers"]').check();
            cy.get('[data-cy="require-special-chars"]').check();

            // Set password expiry
            cy.get('[data-cy="password-expiry-days"]').clear().type('90');
            cy.get('[data-cy="password-history-count"]').clear().type('5');

            // Set lockout policy
            cy.get('[data-cy="max-login-attempts"]').clear().type('5');
            cy.get('[data-cy="lockout-duration"]').clear().type('30');

            cy.get('[data-cy="save-password-policy"]').click();

            cy.expectSuccessMessage('Password policy updated successfully');

            // Verify policy is applied
            cy.get('[data-cy="password-policy-summary"]').should('contain.text', '12 characters minimum');
            cy.get('[data-cy="password-policy-summary"]').should('contain.text', 'Expires after 90 days');
        });

        it('should configure two-factor authentication', () => {
            cy.get('[data-cy="security-settings"]').within(() => {
                cy.get('[data-cy="2fa-settings-tab"]').click();
            });

            cy.get('[data-cy="2fa-settings-form"]').should('be.visible');

            // Enable 2FA requirement
            cy.get('[data-cy="require-2fa"]').check();

            // Configure 2FA methods
            cy.get('[data-cy="allow-totp"]').check();
            cy.get('[data-cy="allow-sms"]').check();
            cy.get('[data-cy="allow-email"]').check();

            // Set 2FA enforcement
            cy.get('[data-cy="2fa-grace-period"]').clear().type('7');
            cy.get('[data-cy="enforce-for-admins"]').check();

            cy.get('[data-cy="save-2fa-settings"]').click();

            cy.expectSuccessMessage('Two-factor authentication settings updated successfully');

            // Verify 2FA is required
            cy.get('[data-cy="2fa-status"]').should('contain.text', 'Required');
        });

        it('should configure session security', () => {
            cy.get('[data-cy="security-settings"]').within(() => {
                cy.get('[data-cy="session-security-tab"]').click();
            });

            cy.get('[data-cy="session-security-form"]').should('be.visible');

            // Configure session settings
            cy.get('[data-cy="session-timeout"]').clear().type('60');
            cy.get('[data-cy="idle-timeout"]').clear().type('15');
            cy.get('[data-cy="max-concurrent-sessions"]').clear().type('3');

            // Configure security options
            cy.get('[data-cy="secure-cookies"]').check();
            cy.get('[data-cy="ip-binding"]').check();
            cy.get('[data-cy="user-agent-validation"]').check();

            // Configure logout settings
            cy.get('[data-cy="auto-logout-inactive"]').check();
            cy.get('[data-cy="logout-on-browser-close"]').check();

            cy.get('[data-cy="save-session-security"]').click();

            cy.expectSuccessMessage('Session security settings updated successfully');
        });

        it('should manage API security settings', () => {
            cy.get('[data-cy="security-settings"]').within(() => {
                cy.get('[data-cy="api-security-tab"]').click();
            });

            cy.get('[data-cy="api-security-form"]').should('be.visible');

            // Configure rate limiting
            cy.get('[data-cy="enable-rate-limiting"]').check();
            cy.get('[data-cy="requests-per-minute"]').clear().type('100');
            cy.get('[data-cy="burst-limit"]').clear().type('200');

            // Configure API key settings
            cy.get('[data-cy="api-key-expiry"]').clear().type('365');
            cy.get('[data-cy="require-api-key"]').check();

            // Configure CORS settings
            cy.get('[data-cy="allowed-origins"]').clear().type('https://app.hrms.com,https://admin.hrms.com');
            cy.get('[data-cy="allowed-methods"]').clear().type('GET,POST,PUT,DELETE');

            cy.get('[data-cy="save-api-security"]').click();

            cy.expectSuccessMessage('API security settings updated successfully');
        });
    });

    describe('Email Configuration', () => {
        it('should configure SMTP settings', () => {
            cy.get('[data-cy="email-settings"]').within(() => {
                cy.get('[data-cy="edit-button"]').click();
            });

            cy.get('[data-cy="email-settings-modal"]').should('be.visible');

            // Configure SMTP server
            const smtpSettings = {
                smtpHost: 'smtp.gmail.com',
                smtpPort: '587',
                smtpUsername: 'noreply@hrms.com',
                smtpPassword: 'app-password-123',
                smtpSecure: true,
                fromEmail: 'noreply@hrms.com',
                fromName: 'HR-SM Platform'
            };

            cy.fillForm(smtpSettings);

            // Test email configuration
            cy.get('[data-cy="test-email-button"]').click();
            cy.get('[data-cy="test-email-address"]').type('admin@hrms.com');
            cy.get('[data-cy="send-test-email"]').click();

            cy.expectSuccessMessage('Test email sent successfully');

            // Save email settings
            cy.submitForm('[data-cy="email-settings-form"]');

            cy.expectSuccessMessage('Email settings updated successfully');

            // Verify SMTP status
            cy.get('[data-cy="smtp-status"]').should('contain.text', 'Connected');
        });

        it('should configure email templates', () => {
            cy.get('[data-cy="email-settings"]').within(() => {
                cy.get('[data-cy="templates-tab"]').click();
            });

            cy.get('[data-cy="email-templates"]').should('be.visible');

            // Edit welcome email template
            cy.get('[data-cy="template-welcome"]').within(() => {
                cy.get('[data-cy="edit-template"]').click();
            });

            cy.get('[data-cy="template-editor-modal"]').should('be.visible');

            // Update template content
            cy.get('[data-cy="template-subject"]').clear().type('Welcome to HR-SM Platform');
            cy.get('[data-cy="template-body"]').clear().type('Welcome {{userName}}! Your account has been created successfully.');

            // Preview template
            cy.get('[data-cy="preview-template"]').click();
            cy.get('[data-cy="template-preview"]').should('contain.text', 'Welcome to HR-SM Platform');

            // Save template
            cy.get('[data-cy="save-template"]').click();

            cy.expectSuccessMessage('Email template updated successfully');
        });

        it('should configure email notifications', () => {
            cy.get('[data-cy="email-settings"]').within(() => {
                cy.get('[data-cy="notifications-tab"]').click();
            });

            cy.get('[data-cy="email-notifications-form"]').should('be.visible');

            // Configure notification types
            cy.get('[data-cy="notify-user-registration"]').check();
            cy.get('[data-cy="notify-password-reset"]').check();
            cy.get('[data-cy="notify-license-expiry"]').check();
            cy.get('[data-cy="notify-system-alerts"]').check();

            // Configure notification recipients
            cy.get('[data-cy="admin-notifications"]').clear().type('admin@hrms.com,support@hrms.com');
            cy.get('[data-cy="security-notifications"]').clear().type('security@hrms.com');

            // Configure notification frequency
            cy.get('[data-cy="digest-frequency"]').select('weekly');

            cy.get('[data-cy="save-notification-settings"]').click();

            cy.expectSuccessMessage('Email notification settings updated successfully');
        });
    });

    describe('Backup and Recovery Settings', () => {
        it('should configure automatic backups', () => {
            cy.get('[data-cy="backup-settings"]').within(() => {
                cy.get('[data-cy="edit-button"]').click();
            });

            cy.get('[data-cy="backup-settings-modal"]').should('be.visible');

            // Enable automatic backups
            cy.get('[data-cy="enable-auto-backup"]').check();

            // Configure backup schedule
            cy.get('[data-cy="backup-frequency"]').select('daily');
            cy.get('[data-cy="backup-time"]').clear().type('02:00');

            // Configure backup retention
            cy.get('[data-cy="retention-days"]').clear().type('30');
            cy.get('[data-cy="max-backup-count"]').clear().type('10');

            // Configure backup location
            cy.get('[data-cy="backup-location"]').select('cloud-storage');
            cy.get('[data-cy="cloud-provider"]').select('aws-s3');
            cy.get('[data-cy="s3-bucket"]').clear().type('hrms-backups');
            cy.get('[data-cy="s3-region"]').clear().type('us-east-1');

            cy.submitForm('[data-cy="backup-settings-form"]');

            cy.expectSuccessMessage('Backup settings updated successfully');

            // Verify backup schedule
            cy.get('[data-cy="backup-schedule"]').should('contain.text', 'Daily at 02:00');
        });

        it('should perform manual backup', () => {
            cy.get('[data-cy="manual-backup-button"]').click();

            cy.get('[data-cy="manual-backup-modal"]').should('be.visible');

            // Select backup type
            cy.get('[data-cy="backup-type"]').select('full');

            // Add backup description
            cy.get('[data-cy="backup-description"]').type('Manual backup before system update');

            // Start backup
            cy.get('[data-cy="start-backup"]').click();

            // Show backup progress
            cy.get('[data-cy="backup-progress"]').should('be.visible');
            cy.get('[data-cy="progress-bar"]').should('be.visible');

            // Wait for backup completion
            cy.get('[data-cy="backup-complete"]', { timeout: 60000 }).should('be.visible');

            cy.expectSuccessMessage('Manual backup completed successfully');

            // Verify backup appears in history
            cy.get('[data-cy="backup-history"]').should('contain.text', 'Manual backup before system update');
        });

        it('should test backup restoration', () => {
            cy.get('[data-cy="backup-history"]').should('be.visible');

            // Select recent backup for restoration test
            cy.get('[data-cy="backup-row"]').first().within(() => {
                cy.get('[data-cy="test-restore"]').click();
            });

            cy.get('[data-cy="restore-test-modal"]').should('be.visible');

            // Show restoration warning
            cy.get('[data-cy="restore-warning"]').should('be.visible');
            cy.get('[data-cy="restore-warning"]').should('contain.text', 'This will test restoration in a separate environment');

            // Start restoration test
            cy.get('[data-cy="start-restore-test"]').click();

            // Show restoration progress
            cy.get('[data-cy="restore-progress"]').should('be.visible');

            // Wait for restoration test completion
            cy.get('[data-cy="restore-test-complete"]', { timeout: 120000 }).should('be.visible');

            cy.expectSuccessMessage('Backup restoration test completed successfully');

            // Show test results
            cy.get('[data-cy="restore-test-results"]').should('be.visible');
            cy.get('[data-cy="data-integrity-check"]').should('contain.text', 'Passed');
        });
    });

    describe('System Monitoring', () => {
        it('should display system health metrics', () => {
            cy.get('[data-cy="monitoring-tab"]').click();

            cy.get('[data-cy="system-health"]').should('be.visible');

            // Verify health metrics
            cy.get('[data-cy="cpu-usage"]').should('be.visible');
            cy.get('[data-cy="memory-usage"]').should('be.visible');
            cy.get('[data-cy="disk-usage"]').should('be.visible');
            cy.get('[data-cy="network-usage"]').should('be.visible');

            // Verify service status
            cy.get('[data-cy="service-status"]').should('be.visible');
            cy.get('[data-cy="database-status"]').should('contain.text', 'Healthy');
            cy.get('[data-cy="license-server-status"]').should('contain.text', 'Healthy');
            cy.get('[data-cy="email-service-status"]').should('contain.text', 'Healthy');
        });

        it('should configure monitoring alerts', () => {
            cy.get('[data-cy="monitoring-tab"]').click();
            cy.get('[data-cy="alerts-settings"]').click();

            cy.get('[data-cy="monitoring-alerts-modal"]').should('be.visible');

            // Configure CPU alert
            cy.get('[data-cy="cpu-alert-enabled"]').check();
            cy.get('[data-cy="cpu-threshold"]').clear().type('80');

            // Configure memory alert
            cy.get('[data-cy="memory-alert-enabled"]').check();
            cy.get('[data-cy="memory-threshold"]').clear().type('85');

            // Configure disk space alert
            cy.get('[data-cy="disk-alert-enabled"]').check();
            cy.get('[data-cy="disk-threshold"]').clear().type('90');

            // Configure alert recipients
            cy.get('[data-cy="alert-recipients"]').clear().type('admin@hrms.com,ops@hrms.com');

            cy.get('[data-cy="save-monitoring-alerts"]').click();

            cy.expectSuccessMessage('Monitoring alerts configured successfully');
        });

        it('should view system logs', () => {
            cy.get('[data-cy="monitoring-tab"]').click();
            cy.get('[data-cy="system-logs"]').click();

            cy.get('[data-cy="logs-viewer"]').should('be.visible');

            // Filter logs by level
            cy.get('[data-cy="log-level-filter"]').select('error');
            cy.get('[data-cy="log-entries"]').should('be.visible');

            // Filter logs by date range
            cy.get('[data-cy="log-date-start"]').click();
            cy.selectDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), '[data-cy="log-date-start"]');

            cy.get('[data-cy="log-date-end"]').click();
            cy.selectDate(new Date(), '[data-cy="log-date-end"]');

            cy.get('[data-cy="apply-log-filter"]').click();

            // Export logs
            cy.get('[data-cy="export-logs"]').click();
            cy.get('[data-cy="export-format"]').select('json');
            cy.get('[data-cy="export-logs-submit"]').click();

            cy.expectSuccessMessage('Logs exported successfully');
        });
    });

    describe('Error Handling', () => {
        it('should handle settings update errors', () => {
            cy.intercept('PUT', '**/api/platform/settings', { statusCode: 400, body: { error: 'Invalid settings configuration' } }).as('settingsError');

            cy.get('[data-cy="general-settings"]').within(() => {
                cy.get('[data-cy="edit-button"]').click();
            });

            cy.fillForm({
                systemName: 'Updated System Name'
            });

            cy.submitForm('[data-cy="general-settings-form"]');

            cy.expectErrorMessage('Invalid settings configuration');
        });

        it('should handle backup service errors', () => {
            cy.intercept('POST', '**/api/platform/backup', { statusCode: 503, body: { error: 'Backup service unavailable' } }).as('backupError');

            cy.get('[data-cy="manual-backup-button"]').click();
            cy.get('[data-cy="start-backup"]').click();

            cy.get('[data-cy="backup-error"]').should('be.visible');
            cy.get('[data-cy="backup-error"]').should('contain.text', 'Backup service unavailable');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible', () => {
            cy.checkAccessibility('[data-cy="settings-page"]');
        });

        it('should support keyboard navigation', () => {
            cy.get('[data-cy="general-settings"]').within(() => {
                cy.get('[data-cy="edit-button"]').focus().type('{enter}');
            });

            cy.get('[data-cy="general-settings-modal"]').should('be.visible');

            // Navigate through form with keyboard
            cy.get('[data-cy="systemName-input"]').focus().type('Keyboard Navigation Test');
            cy.get('[data-cy="submit-button"]').focus().type('{enter}');
        });
    });
});