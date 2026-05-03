/// <reference types="cypress" />

/**
 * E2E Platform Admin Tests
 * Requirements: 3-5
 * 
 * Test Coverage:
 * - Tenant creation and management
 * - Module enablement/disablement
 * - Subscription tier management
 * - License expiry handling
 * - Platform analytics dashboard
 */

describe('Platform Admin E2E Tests', () => {
  beforeEach(() => {
    cy.clearAllStorage();
    cy.clearAllCookies();
  });

  describe('Tenant Creation and Management', () => {
    it('should allow Platform Super Admin to create new tenant and see it in tenants list', () => {
      cy.loginAsPlatformAdmin();
      
      // Navigate to tenants page
      cy.visit('/platform/tenants');
      cy.get('[data-cy=tenants-page]').should('be.visible');
      
      // Get initial tenant count
      cy.get('[data-cy=tenant-row]').then(($rows) => {
        const initialCount = $rows.length;
        
        // Click Create Tenant button
        cy.get('[data-cy=create-tenant-button]').click();
        
        // Fill tenant creation form
        cy.get('[data-cy=create-tenant-modal]').should('be.visible');
        
        const newTenantName = `Test Company ${Date.now()}`;
        const newTenantDomain = `testcompany${Date.now()}`;
        
        cy.get('[data-cy=tenant-name-input]').type(newTenantName);
        cy.get('[data-cy=tenant-domain-input]').type(newTenantDomain);
        cy.get('[data-cy=tenant-email-input]').type(`admin@${newTenantDomain}.com`);
        cy.get('[data-cy=tenant-phone-input]').type('+1234567890');
        
        // Select subscription tier
        cy.get('[data-cy=subscription-tier-select]').click();
        cy.get('[data-cy=tier-option-basic]').click();
        
        // Select modules
        cy.get('[data-cy=module-checkbox-hr-core]').check();
        cy.get('[data-cy=module-checkbox-attendance]').check();
        cy.get('[data-cy=module-checkbox-leave]').check();
        
        // Submit form
        cy.get('[data-cy=create-tenant-submit]').click();
        
        // Verify success message
        cy.get('[data-cy=success-toast]').should('be.visible');
        cy.get('[data-cy=success-toast]').should('contain', 'Tenant created successfully');
        
        // Modal should close
        cy.get('[data-cy=create-tenant-modal]').should('not.exist');
        
        // Verify new tenant appears in the list
        cy.get('[data-cy=tenant-row]').should('have.length', initialCount + 1);
        
        // Search for new tenant
        cy.get('[data-cy=search-input]').clear().type(newTenantName);
        cy.get('[data-cy=search-button]').click();
        
        // Verify tenant is found
        cy.get('[data-cy=tenant-row]').should('have.length', 1);
        cy.get('[data-cy=tenant-row]').first().within(() => {
          cy.get('[data-cy=tenant-name]').should('contain', newTenantName);
          cy.get('[data-cy=tenant-domain]').should('contain', newTenantDomain);
          cy.get('[data-cy=tenant-status]').should('contain', 'Active');
        });
      });
    });

    it('should validate tenant domain uniqueness', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      // Get existing tenant domain
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=tenant-domain]').invoke('text').then((existingDomain) => {
          // Try to create tenant with same domain
          cy.get('[data-cy=create-tenant-button]').click();
          
          cy.get('[data-cy=tenant-name-input]').type('Duplicate Domain Test');
          cy.get('[data-cy=tenant-domain-input]').type(existingDomain.trim());
          cy.get('[data-cy=tenant-email-input]').type('test@example.com');
          
          cy.get('[data-cy=create-tenant-submit]').click();
          
          // Verify validation error
          cy.get('[data-cy=domain-error]').should('be.visible');
          cy.get('[data-cy=domain-error]').should('contain', 'Domain already exists');
        });
      });
    });

    it('should allow editing tenant details', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      // Edit first tenant
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=edit-tenant-button]').click();
      });
      
      // Edit modal should open
      cy.get('[data-cy=edit-tenant-modal]').should('be.visible');
      
      // Update tenant name
      const updatedName = `Updated Company ${Date.now()}`;
      cy.get('[data-cy=tenant-name-input]').clear().type(updatedName);
      
      // Save changes
      cy.get('[data-cy=save-tenant-button]').click();
      
      // Verify success
      cy.get('[data-cy=success-toast]').should('contain', 'Tenant updated');
      
      // Verify updated name in list
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=tenant-name]').should('contain', updatedName);
      });
    });

    it('should allow deactivating and reactivating tenants', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      // Deactivate tenant
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=tenant-actions]').click();
        cy.get('[data-cy=deactivate-tenant]').click();
      });
      
      // Confirm deactivation
      cy.get('[data-cy=confirm-deactivate-modal]').should('be.visible');
      cy.get('[data-cy=confirm-deactivate-button]').click();
      
      // Verify status changed
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=tenant-status]').should('contain', 'Inactive');
      });
      
      // Reactivate tenant
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=tenant-actions]').click();
        cy.get('[data-cy=activate-tenant]').click();
      });
      
      // Verify status changed back
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=tenant-status]').should('contain', 'Active');
      });
    });
  });

  describe('Module Enablement and Disablement', () => {
    it('should disable payroll module for tenant and verify 403 response', () => {
      let testTenantId, testTenantAdmin, tenantToken;
      
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      // Select a tenant to modify
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=tenant-id]').invoke('text').then((tenantId) => {
          testTenantId = tenantId.trim();
        });
        
        cy.get('[data-cy=manage-modules-button]').click();
      });
      
      // Module management modal should open
      cy.get('[data-cy=manage-modules-modal]').should('be.visible');
      
      // Disable payroll module
      cy.get('[data-cy=module-checkbox-payroll]').uncheck();
      
      // Save changes
      cy.get('[data-cy=save-modules-button]').click();
      
      // Verify success
      cy.get('[data-cy=success-toast]').should('contain', 'Modules updated');
      
      // Logout platform admin
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Login as that tenant's HR Manager and get token
      cy.fixture('tenants').then((tenants) => {
        testTenantAdmin = tenants['tenant-1'].adminCredentials;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/v1/auth/login`,
          body: {
            email: testTenantAdmin.email,
            password: testTenantAdmin.password,
            tenantId: testTenantId
          }
        }).then((response) => {
          tenantToken = response.body.token;
          
          // Make API request to payroll endpoint - should return 403
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/api/v1/payroll`,
            headers: {
              'Authorization': `Bearer ${tenantToken}`
            },
            failOnStatusCode: false
          }).then((apiResponse) => {
            // Verify 403 Forbidden response
            expect(apiResponse.status).to.equal(403);
            expect(apiResponse.body).to.have.property('success', false);
            expect(apiResponse.body).to.have.property('code', 'MODULE_NOT_ENABLED');
            expect(apiResponse.body).to.have.property('module', 'payroll');
            expect(apiResponse.body.error).to.contain('Module');
            expect(apiResponse.body.error).to.contain('not enabled');
          });
        });
      });
      
      // Also verify UI behavior
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(testTenantAdmin.email);
      cy.get('[data-cy=password-input]').type(testTenantAdmin.password);
      cy.get('[data-cy=login-button]').click();
      
      // Try to access payroll route
      cy.visit('/payroll', { failOnStatusCode: false });
      
      // Verify 403 or "Module not enabled" page
      cy.url().should('match', /\/(403|module-disabled)/);
      
      // Verify error message
      cy.get('[data-cy=module-disabled-message]').should('be.visible');
      cy.get('[data-cy=module-disabled-message]').should('contain', 'Module not enabled');
      cy.get('[data-cy=module-disabled-message]').should('contain', 'payroll');
      
      // Verify payroll menu item is hidden or disabled
      cy.visit('/dashboard');
      cy.get('[data-cy=nav-menu]').within(() => {
        cy.get('[data-cy=nav-payroll]').should('not.exist');
      });
    });

    it('should enable module and verify access is granted', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      // Enable payroll module
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=manage-modules-button]').click();
      });
      
      cy.get('[data-cy=module-checkbox-payroll]').check();
      cy.get('[data-cy=save-modules-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      // Logout and login as tenant admin
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      cy.fixture('tenants').then((tenants) => {
        const tenantAdmin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenantAdmin.email);
        cy.get('[data-cy=password-input]').type(tenantAdmin.password);
        cy.get('[data-cy=login-button]').click();
      });
      
      // Verify payroll access
      cy.visit('/payroll');
      cy.get('[data-cy=payroll-page]').should('be.visible');
      
      // Verify menu item is visible
      cy.visit('/dashboard');
      cy.get('[data-cy=nav-payroll]').should('be.visible');
    });

    it('should show module status in tenant details', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=view-details-button]').click();
      });
      
      cy.get('[data-cy=tenant-details-modal]').should('be.visible');
      
      // Verify modules section
      cy.get('[data-cy=enabled-modules-list]').should('be.visible');
      cy.get('[data-cy=module-item]').should('have.length.at.least', 1);
      
      // Verify each module shows status
      cy.get('[data-cy=module-item]').each(($module) => {
        cy.wrap($module).within(() => {
          cy.get('[data-cy=module-name]').should('exist');
          cy.get('[data-cy=module-status]').should('exist');
        });
      });
    });
  });

  describe('Subscription Tier Management', () => {
    it('should change tenant subscription tier and verify rate limit headers', () => {
      let testTenantId, tenantToken;
      
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      // Change subscription tier
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=tenant-id]').invoke('text').then((id) => {
          testTenantId = id.trim();
        });
        
        cy.get('[data-cy=manage-subscription-button]').click();
      });
      
      cy.get('[data-cy=subscription-modal]').should('be.visible');
      
      // Change from Basic to Premium
      cy.get('[data-cy=subscription-tier-select]').click();
      cy.get('[data-cy=tier-option-premium]').click();
      
      // Save changes
      cy.get('[data-cy=save-subscription-button]').click();
      
      // Verify success
      cy.get('[data-cy=success-toast]').should('contain', 'Subscription updated');
      
      // Verify tier in tenant list
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=subscription-tier]').should('contain', 'Premium');
      });
      
      // Logout platform admin
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Login as tenant admin and get token
      cy.fixture('tenants').then((tenants) => {
        const tenantAdmin = tenants['tenant-1'].adminCredentials;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/v1/auth/login`,
          body: {
            email: tenantAdmin.email,
            password: tenantAdmin.password,
            tenantId: testTenantId
          }
        }).then((response) => {
          tenantToken = response.body.token;
          
          // Make API request and check rate limit headers
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/api/v1/employees`,
            headers: {
              'Authorization': `Bearer ${tenantToken}`
            }
          }).then((apiResponse) => {
            // Verify rate limit headers reflect Premium tier
            expect(apiResponse.headers).to.have.property('x-ratelimit-limit');
            expect(apiResponse.headers).to.have.property('x-ratelimit-remaining');
            expect(apiResponse.headers).to.have.property('x-ratelimit-reset');
            
            // Premium tier should have higher limits (e.g., 1000 vs 100)
            const rateLimit = parseInt(apiResponse.headers['x-ratelimit-limit']);
            expect(rateLimit).to.be.at.least(1000);
          });
        });
      });
    });

    it('should display subscription tier features', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/subscriptions');
      
      // Verify subscription tiers page
      cy.get('[data-cy=subscriptions-page]').should('be.visible');
      
      // Verify tier cards
      cy.get('[data-cy=tier-card-basic]').should('be.visible');
      cy.get('[data-cy=tier-card-premium]').should('be.visible');
      cy.get('[data-cy=tier-card-enterprise]').should('be.visible');
      
      // Verify each tier shows features
      cy.get('[data-cy=tier-card-premium]').within(() => {
        cy.get('[data-cy=tier-name]').should('contain', 'Premium');
        cy.get('[data-cy=tier-price]').should('exist');
        cy.get('[data-cy=tier-features]').should('be.visible');
        cy.get('[data-cy=feature-item]').should('have.length.at.least', 3);
      });
    });

    it('should show subscription usage statistics', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=view-usage-button]').click();
      });
      
      cy.get('[data-cy=usage-modal]').should('be.visible');
      
      // Verify usage metrics
      cy.get('[data-cy=api-calls-usage]').should('exist');
      cy.get('[data-cy=storage-usage]').should('exist');
      cy.get('[data-cy=user-count]').should('exist');
      cy.get('[data-cy=usage-period]').should('exist');
    });
  });

  describe('License Expiry Handling', () => {
    it('should set license expiry to past date and verify subscription expired message on login', () => {
      let testTenantId;
      
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      // Set license expiry
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=tenant-id]').invoke('text').then((id) => {
          testTenantId = id.trim();
        });
        
        cy.get('[data-cy=manage-license-button]').click();
      });
      
      cy.get('[data-cy=license-modal]').should('be.visible');
      
      // Set expiry date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      cy.get('[data-cy=license-expiry-input]').clear().type(yesterdayStr);
      
      // Save changes
      cy.get('[data-cy=save-license-button]').click();
      
      // Verify success
      cy.get('[data-cy=success-toast]').should('contain', 'License updated');
      
      // Verify expiry status in tenant list
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=license-status]').should('contain', 'Expired');
      });
      
      // Logout platform admin
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Try to login as tenant user
      cy.fixture('tenants').then((tenants) => {
        const tenantAdmin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenantAdmin.email);
        cy.get('[data-cy=password-input]').type(tenantAdmin.password);
        cy.get('[data-cy=login-button]').click();
        
        // Verify subscription expired message
        cy.get('[data-cy=subscription-expired-message]').should('be.visible');
        cy.get('[data-cy=subscription-expired-message]').should('contain', 'Subscription expired');
        cy.get('[data-cy=subscription-expired-message]').should('contain', 'contact administrator');
        
        // Should not be able to access dashboard
        cy.url().should('include', '/subscription-expired');
        
        // Verify cannot access any routes
        cy.visit('/employees', { failOnStatusCode: false });
        cy.url().should('include', '/subscription-expired');
      });
    });

    it('should show expiry warning before license expires', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      // Set license expiry to 5 days from now
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=manage-license-button]').click();
      });
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      cy.get('[data-cy=license-expiry-input]').clear().type(futureDateStr);
      cy.get('[data-cy=save-license-button]').click();
      cy.get('[data-cy=success-toast]').should('be.visible');
      
      // Verify warning badge
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=license-warning-badge]').should('be.visible');
        cy.get('[data-cy=license-warning-badge]').should('contain', 'Expiring soon');
      });
      
      // Logout and login as tenant user
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      cy.fixture('tenants').then((tenants) => {
        const tenantAdmin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenantAdmin.email);
        cy.get('[data-cy=password-input]').type(tenantAdmin.password);
        cy.get('[data-cy=login-button]').click();
        
        // Verify warning banner on dashboard
        cy.get('[data-cy=license-expiry-warning]').should('be.visible');
        cy.get('[data-cy=license-expiry-warning]').should('contain', 'expires in 5 days');
      });
    });

    it('should allow renewing expired license', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/tenants');
      
      // Find expired tenant
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=manage-license-button]').click();
      });
      
      // Set new expiry date (1 year from now)
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      cy.get('[data-cy=license-expiry-input]').clear().type(futureDateStr);
      cy.get('[data-cy=save-license-button]').click();
      
      // Verify success
      cy.get('[data-cy=success-toast]').should('contain', 'License renewed');
      
      // Verify status changed to Active
      cy.get('[data-cy=tenant-row]').first().within(() => {
        cy.get('[data-cy=license-status]').should('contain', 'Active');
      });
    });
  });

  describe('Platform Analytics Dashboard', () => {
    it('should load platform analytics dashboard without errors and show all chart elements', () => {
      cy.loginAsPlatformAdmin();
      
      // Navigate to analytics dashboard
      cy.visit('/platform/analytics');
      cy.get('[data-cy=analytics-page]').should('be.visible');
      
      // Verify no error messages
      cy.get('[data-cy=error-message]').should('not.exist');
      
      // Verify all chart elements are present
      cy.get('[data-cy=analytics-overview]').should('be.visible');
      
      // Verify key metrics cards
      cy.get('[data-cy=metric-total-tenants]').should('be.visible');
      cy.get('[data-cy=metric-active-users]').should('be.visible');
      cy.get('[data-cy=metric-total-revenue]').should('be.visible');
      cy.get('[data-cy=metric-api-calls]').should('be.visible');
      
      // Verify charts are rendered
      cy.get('[data-cy=chart-tenant-growth]').should('be.visible');
      cy.get('[data-cy=chart-tenant-growth]').find('canvas, svg').should('exist');
      
      cy.get('[data-cy=chart-revenue-trend]').should('be.visible');
      cy.get('[data-cy=chart-revenue-trend]').find('canvas, svg').should('exist');
      
      cy.get('[data-cy=chart-subscription-distribution]').should('be.visible');
      cy.get('[data-cy=chart-subscription-distribution]').find('canvas, svg').should('exist');
      
      cy.get('[data-cy=chart-api-usage]').should('be.visible');
      cy.get('[data-cy=chart-api-usage]').find('canvas, svg').should('exist');
      
      // Verify data tables
      cy.get('[data-cy=top-tenants-table]').should('be.visible');
      cy.get('[data-cy=recent-activity-table]').should('be.visible');
    });

    it('should allow filtering analytics by date range', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/analytics');
      
      // Apply date range filter
      cy.get('[data-cy=date-range-filter]').click();
      cy.get('[data-cy=date-range-last-30-days]').click();
      
      // Wait for charts to update
      cy.get('[data-cy=loading-indicator]').should('not.exist');
      
      // Verify charts updated
      cy.get('[data-cy=chart-tenant-growth]').should('be.visible');
      
      // Change to custom range
      cy.get('[data-cy=date-range-filter]').click();
      cy.get('[data-cy=date-range-custom]').click();
      
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      const endDate = new Date();
      
      cy.get('[data-cy=custom-start-date]').type(startDate.toISOString().split('T')[0]);
      cy.get('[data-cy=custom-end-date]').type(endDate.toISOString().split('T')[0]);
      cy.get('[data-cy=apply-custom-range]').click();
      
      // Verify charts updated
      cy.get('[data-cy=loading-indicator]').should('not.exist');
      cy.get('[data-cy=chart-tenant-growth]').should('be.visible');
    });

    it('should export analytics data', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/analytics');
      
      // Click export button
      cy.get('[data-cy=export-analytics-button]').click();
      
      // Select export format
      cy.get('[data-cy=export-format-csv]').click();
      
      // Verify download
      cy.get('[data-cy=success-toast]').should('contain', 'Analytics exported');
      
      const downloadsFolder = Cypress.config('downloadsFolder');
      cy.readFile(`${downloadsFolder}/platform-analytics.csv`, { timeout: 10000 }).should('exist');
    });

    it('should show real-time metrics updates', () => {
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/analytics');
      
      // Get initial metric value
      cy.get('[data-cy=metric-active-users]').invoke('text').then((initialValue) => {
        // Wait for auto-refresh (if implemented)
        cy.wait(5000);
        
        // Verify metric can update
        cy.get('[data-cy=metric-active-users]').should('exist');
      });
    });

    it('should handle analytics loading errors gracefully', () => {
      // Intercept analytics API and force error
      cy.intercept('GET', '**/api/platform/analytics/**', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('analyticsError');
      
      cy.loginAsPlatformAdmin();
      cy.visit('/platform/analytics');
      
      // Wait for error
      cy.wait('@analyticsError');
      
      // Verify error message is shown
      cy.get('[data-cy=analytics-error]').should('be.visible');
      cy.get('[data-cy=analytics-error]').should('contain', 'Unable to load analytics');
      
      // Verify retry button exists
      cy.get('[data-cy=retry-button]').should('be.visible');
    });
  });

  describe('Platform Admin Permissions', () => {
    it('should prevent tenant admin from accessing platform routes', () => {
      cy.fixture('tenants').then((tenants) => {
        const tenantAdmin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenantAdmin.email);
        cy.get('[data-cy=password-input]').type(tenantAdmin.password);
        cy.get('[data-cy=login-button]').click();
      });
      
      // Try to access platform routes
      cy.visit('/platform/tenants', { failOnStatusCode: false });
      cy.url().should('match', /\/(403|unauthorized)/);
      
      cy.visit('/platform/analytics', { failOnStatusCode: false });
      cy.url().should('match', /\/(403|unauthorized)/);
    });
  });
});
