/// <reference types="cypress" />

/**
 * E2E Multi-Tenant Data Isolation Tests
 * Requirements: 3-4
 * 
 * Test Coverage:
 * - Tenant data isolation in UI
 * - Tenant data isolation in API
 * - Cross-tenant data access prevention
 * - Platform admin cross-tenant visibility
 * - Empty results vs forbidden errors
 */

describe('Multi-Tenant Data Isolation E2E Tests', () => {
  let tenant1Id, tenant2Id;
  let tenant1EmployeeId, tenant2EmployeeId;

  before(() => {
    // Load tenant fixture data
    cy.fixture('tenants').then((tenants) => {
      tenant1Id = tenants['tenant-1'].id;
      tenant2Id = tenants['tenant-2'].id;
      
      // Seed both tenants with test data
      cy.seedTenant(tenant1Id);
      cy.seedTenant(tenant2Id);
    });
  });

  after(() => {
    // Cleanup both tenants
    cy.cleanupTenant(tenant1Id);
    cy.cleanupTenant(tenant2Id);
  });

  beforeEach(() => {
    cy.clearAllStorage();
    cy.clearAllCookies();
  });

  describe('UI Data Isolation', () => {
    it('should NOT show Tenant-2 employees in Tenant-1 admin employee list', () => {
      // Login as Tenant-1 admin
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenant1Admin.email);
        cy.get('[data-cy=password-input]').type(tenant1Admin.password);
        cy.get('[data-cy=login-button]').click();
        
        cy.url().should('include', '/dashboard');
      });
      
      // Navigate to employees page
      cy.visit('/employees');
      cy.get('[data-cy=employees-page]').should('be.visible');
      
      // Wait for employee list to load
      cy.get('[data-cy=table-loading]').should('not.exist');
      cy.get('[data-cy=employee-list]').should('be.visible');
      
      // Get all employee rows
      cy.get('[data-cy=employee-row]').then(($rows) => {
        // Store Tenant-1 employee IDs for later verification
        const tenant1EmployeeIds = [];
        
        $rows.each((index, row) => {
          const employeeId = Cypress.$(row).find('[data-cy=employee-id]').text();
          tenant1EmployeeIds.push(employeeId);
        });
        
        // Verify we have some employees
        expect(tenant1EmployeeIds.length).to.be.at.least(1);
        
        // Store first employee ID for later use
        tenant1EmployeeId = tenant1EmployeeIds[0];
      });
      
      // Search for a Tenant-2 employee name (if we know it)
      cy.fixture('tenants').then((tenants) => {
        const tenant2EmployeeName = 'Tenant2Employee'; // Example name
        
        cy.get('[data-cy=search-input]').clear().type(tenant2EmployeeName);
        cy.get('[data-cy=search-button]').click();
        
        // Wait for search results
        cy.get('[data-cy=table-loading]').should('not.exist');
        
        // Should show no results or empty state
        cy.get('[data-cy=employee-row]').should('have.length', 0);
        cy.get('[data-cy=no-results-message]').should('be.visible');
        cy.get('[data-cy=no-results-message]').should('contain', 'No employees found');
      });
    });

    it('should NOT show Tenant-2 data in Tenant-1 attendance records', () => {
      // Login as Tenant-1 admin
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenant1Admin.email);
        cy.get('[data-cy=password-input]').type(tenant1Admin.password);
        cy.get('[data-cy=login-button]').click();
      });
      
      // Navigate to attendance reports
      cy.visit('/attendance/reports');
      cy.get('[data-cy=attendance-reports-page]').should('be.visible');
      
      // Wait for data to load
      cy.get('[data-cy=table-loading]').should('not.exist');
      
      // Get all attendance records
      cy.get('[data-cy=attendance-row]').then(($rows) => {
        // Verify all records belong to Tenant-1
        $rows.each((index, row) => {
          cy.wrap(row).within(() => {
            cy.get('[data-cy=employee-name]').should('exist');
            // Employee names should not contain Tenant-2 identifiers
            cy.get('[data-cy=employee-name]').invoke('text').should('not.contain', 'Tenant2');
          });
        });
      });
    });

    it('should NOT show Tenant-2 data in Tenant-1 leave requests', () => {
      // Login as Tenant-1 manager
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenant1Admin.email);
        cy.get('[data-cy=password-input]').type(tenant1Admin.password);
        cy.get('[data-cy=login-button]').click();
      });
      
      // Navigate to leave approvals
      cy.visit('/leave/approvals');
      cy.get('[data-cy=pending-leaves-page]').should('be.visible');
      
      // Wait for data to load
      cy.get('[data-cy=table-loading]').should('not.exist');
      
      // Verify all leave requests belong to Tenant-1
      cy.get('[data-cy=pending-leave-row]').then(($rows) => {
        if ($rows.length > 0) {
          $rows.each((index, row) => {
            cy.wrap(row).within(() => {
              cy.get('[data-cy=employee-name]').invoke('text').should('not.contain', 'Tenant2');
            });
          });
        }
      });
    });
  });

  describe('API Data Isolation', () => {
    it('should return 404 when Tenant-1 JWT tries to access Tenant-2 employee', () => {
      // Login as Tenant-1 admin and get JWT
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/v1/auth/login`,
          body: {
            email: tenant1Admin.email,
            password: tenant1Admin.password,
            tenantId: tenant1Id
          }
        }).then((loginResponse) => {
          expect(loginResponse.status).to.eq(200);
          const tenant1Token = loginResponse.body.token;
          
          // Get a Tenant-2 employee ID (seed data should provide this)
          const tenant2EmployeeId = 'tenant2-employee-id-123'; // From seed data
          
          // Try to access Tenant-2 employee with Tenant-1 JWT
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/api/v1/users/${tenant2EmployeeId}`,
            headers: {
              'Authorization': `Bearer ${tenant1Token}`
            },
            failOnStatusCode: false
          }).then((response) => {
            // Should return 404 (not found) not 403 (forbidden)
            expect(response.status).to.eq(404);
            expect(response.body).to.have.property('error');
            expect(response.body.error).to.match(/not found|does not exist/i);
          });
        });
      });
    });

    it('should return empty results for Tenant-1 attendance when data belongs to Tenant-2', () => {
      // Login as Tenant-1 admin
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/v1/auth/login`,
          body: {
            email: tenant1Admin.email,
            password: tenant1Admin.password,
            tenantId: tenant1Id
          }
        }).then((loginResponse) => {
          const tenant1Token = loginResponse.body.token;
          
          // Request attendance records
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/api/v1/attendance`,
            headers: {
              'Authorization': `Bearer ${tenant1Token}`
            },
            qs: {
              // Try to filter by Tenant-2 employee (should return empty)
              employeeId: 'tenant2-employee-id-123'
            }
          }).then((response) => {
            // Should return 200 with empty results, not 403
            expect(response.status).to.eq(200);
            expect(response.body).to.have.property('data');
            expect(response.body.data).to.be.an('array');
            expect(response.body.data).to.have.length(0);
          });
        });
      });
    });

    it('should return empty results for Tenant-1 payroll when data belongs to Tenant-2', () => {
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/v1/auth/login`,
          body: {
            email: tenant1Admin.email,
            password: tenant1Admin.password,
            tenantId: tenant1Id
          }
        }).then((loginResponse) => {
          const tenant1Token = loginResponse.body.token;
          
          // Request payroll records
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/api/v1/payroll`,
            headers: {
              'Authorization': `Bearer ${tenant1Token}`
            }
          }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.have.property('data');
            
            // Verify no Tenant-2 data in results
            const payrollRecords = response.body.data;
            payrollRecords.forEach((record) => {
              expect(record.company_id || record.tenantId).to.eq(tenant1Id);
            });
          });
        });
      });
    });

    it('should return empty results for Tenant-1 documents when data belongs to Tenant-2', () => {
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/v1/auth/login`,
          body: {
            email: tenant1Admin.email,
            password: tenant1Admin.password,
            tenantId: tenant1Id
          }
        }).then((loginResponse) => {
          const tenant1Token = loginResponse.body.token;
          
          // Request documents
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/api/v1/documents`,
            headers: {
              'Authorization': `Bearer ${tenant1Token}`
            }
          }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.have.property('data');
            
            // Verify all documents belong to Tenant-1
            const documents = response.body.data;
            documents.forEach((doc) => {
              expect(doc.company_id || doc.tenantId).to.eq(tenant1Id);
            });
          });
        });
      });
    });

    it('should prevent Tenant-1 from creating data with Tenant-2 employee ID', () => {
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/v1/auth/login`,
          body: {
            email: tenant1Admin.email,
            password: tenant1Admin.password,
            tenantId: tenant1Id
          }
        }).then((loginResponse) => {
          const tenant1Token = loginResponse.body.token;
          
          // Try to create leave request for Tenant-2 employee
          cy.request({
            method: 'POST',
            url: `${Cypress.env('API_URL')}/api/v1/leave/request`,
            headers: {
              'Authorization': `Bearer ${tenant1Token}`
            },
            body: {
              employeeId: 'tenant2-employee-id-123',
              leaveType: 'annual',
              startDate: '2026-06-01',
              endDate: '2026-06-03',
              reason: 'Vacation'
            },
            failOnStatusCode: false
          }).then((response) => {
            // Should return 404 or 400, not create the record
            expect(response.status).to.be.oneOf([400, 404]);
            expect(response.body).to.have.property('error');
          });
        });
      });
    });

    it('should prevent Tenant-1 from updating Tenant-2 data', () => {
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/v1/auth/login`,
          body: {
            email: tenant1Admin.email,
            password: tenant1Admin.password,
            tenantId: tenant1Id
          }
        }).then((loginResponse) => {
          const tenant1Token = loginResponse.body.token;
          
          // Try to update Tenant-2 employee
          cy.request({
            method: 'PUT',
            url: `${Cypress.env('API_URL')}/api/v1/users/tenant2-employee-id-123`,
            headers: {
              'Authorization': `Bearer ${tenant1Token}`
            },
            body: {
              name: 'Hacked Name'
            },
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(404);
          });
        });
      });
    });

    it('should prevent Tenant-1 from deleting Tenant-2 data', () => {
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/v1/auth/login`,
          body: {
            email: tenant1Admin.email,
            password: tenant1Admin.password,
            tenantId: tenant1Id
          }
        }).then((loginResponse) => {
          const tenant1Token = loginResponse.body.token;
          
          // Try to delete Tenant-2 employee
          cy.request({
            method: 'DELETE',
            url: `${Cypress.env('API_URL')}/api/v1/users/tenant2-employee-id-123`,
            headers: {
              'Authorization': `Bearer ${tenant1Token}`
            },
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(404);
          });
        });
      });
    });
  });

  describe('Platform Admin Cross-Tenant Visibility', () => {
    it('should allow platform admin to see both Tenant-1 and Tenant-2 employees', () => {
      // Login as platform admin
      cy.fixture('users').then((users) => {
        const platformAdmin = users.platformAdmin;
        
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/api/platform/auth/login`,
          body: {
            email: platformAdmin.email,
            password: platformAdmin.password
          }
        }).then((loginResponse) => {
          expect(loginResponse.status).to.eq(200);
          const platformToken = loginResponse.body.token;
          
          // Get all tenants
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/api/platform/tenants`,
            headers: {
              'Authorization': `Bearer ${platformToken}`
            }
          }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.have.property('data');
            
            const tenants = response.body.data;
            
            // Verify both tenants are present
            const tenant1 = tenants.find(t => t.id === tenant1Id);
            const tenant2 = tenants.find(t => t.id === tenant2Id);
            
            expect(tenant1).to.exist;
            expect(tenant2).to.exist;
          });
          
          // Get employees from Tenant-1
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/api/platform/tenants/${tenant1Id}/users`,
            headers: {
              'Authorization': `Bearer ${platformToken}`
            }
          }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body.data).to.be.an('array');
            expect(response.body.data.length).to.be.at.least(1);
          });
          
          // Get employees from Tenant-2
          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/api/platform/tenants/${tenant2Id}/users`,
            headers: {
              'Authorization': `Bearer ${platformToken}`
            }
          }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body.data).to.be.an('array');
            expect(response.body.data.length).to.be.at.least(1);
          });
        });
      });
    });

    it('should show both tenants in platform admin UI', () => {
      cy.loginAsPlatformAdmin();
      
      // Navigate to tenants page
      cy.visit('/platform/tenants');
      cy.get('[data-cy=tenants-page]').should('be.visible');
      
      // Wait for tenants to load
      cy.get('[data-cy=table-loading]').should('not.exist');
      
      // Verify both tenants are visible
      cy.get('[data-cy=tenant-row]').should('have.length.at.least', 2);
      
      // Search for Tenant-1
      cy.get('[data-cy=search-input]').clear().type('tenant-1');
      cy.get('[data-cy=search-button]').click();
      cy.get('[data-cy=tenant-row]').should('have.length.at.least', 1);
      
      // Clear search
      cy.get('[data-cy=clear-search-button]').click();
      
      // Search for Tenant-2
      cy.get('[data-cy=search-input]').clear().type('tenant-2');
      cy.get('[data-cy=search-button]').click();
      cy.get('[data-cy=tenant-row]').should('have.length.at.least', 1);
    });

    it('should allow platform admin to view tenant-specific analytics', () => {
      cy.loginAsPlatformAdmin();
      
      // Navigate to analytics
      cy.visit('/platform/analytics');
      cy.get('[data-cy=analytics-page]').should('be.visible');
      
      // Filter by Tenant-1
      cy.get('[data-cy=tenant-filter]').click();
      cy.get(`[data-cy=tenant-option-${tenant1Id}]`).click();
      
      // Verify analytics data loads
      cy.get('[data-cy=analytics-chart]').should('be.visible');
      cy.get('[data-cy=tenant-stats]').should('be.visible');
      
      // Switch to Tenant-2
      cy.get('[data-cy=tenant-filter]').click();
      cy.get(`[data-cy=tenant-option-${tenant2Id}]`).click();
      
      // Verify analytics updates
      cy.get('[data-cy=analytics-chart]').should('be.visible');
    });
  });

  describe('Tenant Isolation Edge Cases', () => {
    it('should not leak tenant data through search functionality', () => {
      // Login as Tenant-1 admin
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenant1Admin.email);
        cy.get('[data-cy=password-input]').type(tenant1Admin.password);
        cy.get('[data-cy=login-button]').click();
      });
      
      // Global search
      cy.get('[data-cy=global-search]').type('tenant2');
      cy.get('[data-cy=search-results]').should('be.visible');
      
      // Verify no Tenant-2 results
      cy.get('[data-cy=search-result-item]').should('have.length', 0);
    });

    it('should not leak tenant data through autocomplete', () => {
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenant1Admin.email);
        cy.get('[data-cy=password-input]').type(tenant1Admin.password);
        cy.get('[data-cy=login-button]').click();
      });
      
      // Navigate to a page with autocomplete (e.g., assign task)
      cy.visit('/tasks/create');
      
      // Type in employee autocomplete
      cy.get('[data-cy=assign-to-input]').type('tenant2');
      
      // Verify no Tenant-2 employees in suggestions
      cy.get('[data-cy=autocomplete-option]').should('have.length', 0);
    });

    it('should maintain isolation after tenant switch (if multi-tenant user)', () => {
      // This test is for users who have access to multiple tenants
      cy.fixture('users').then((users) => {
        const multiTenantUser = users.multiTenantUser;
        
        if (multiTenantUser) {
          cy.visit('/login');
          cy.get('[data-cy=email-input]').type(multiTenantUser.email);
          cy.get('[data-cy=password-input]').type(multiTenantUser.password);
          cy.get('[data-cy=login-button]').click();
          
          // Switch to Tenant-1
          cy.get('[data-cy=tenant-switcher]').click();
          cy.get(`[data-cy=tenant-option-${tenant1Id}]`).click();
          
          // Verify Tenant-1 data
          cy.visit('/employees');
          cy.get('[data-cy=employee-row]').first().invoke('attr', 'data-tenant-id').should('eq', tenant1Id);
          
          // Switch to Tenant-2
          cy.get('[data-cy=tenant-switcher]').click();
          cy.get(`[data-cy=tenant-option-${tenant2Id}]`).click();
          
          // Verify Tenant-2 data (different employees)
          cy.visit('/employees');
          cy.get('[data-cy=employee-row]').first().invoke('attr', 'data-tenant-id').should('eq', tenant2Id);
        }
      });
    });
  });

  describe('Tenant Isolation in Reports', () => {
    it('should only show Tenant-1 data in exported reports', () => {
      cy.fixture('tenants').then((tenants) => {
        const tenant1Admin = tenants['tenant-1'].adminCredentials;
        
        cy.visit('/login');
        cy.get('[data-cy=email-input]').type(tenant1Admin.email);
        cy.get('[data-cy=password-input]').type(tenant1Admin.password);
        cy.get('[data-cy=login-button]').click();
      });
      
      // Export employee report
      cy.visit('/employees');
      cy.get('[data-cy=export-button]').click();
      
      // Verify download
      const downloadsFolder = Cypress.config('downloadsFolder');
      cy.readFile(`${downloadsFolder}/employees-report.csv`, { timeout: 10000 }).then((content) => {
        // Verify no Tenant-2 data in CSV
        expect(content).to.not.contain('tenant2');
        expect(content).to.not.contain('Tenant2');
      });
    });
  });
});
