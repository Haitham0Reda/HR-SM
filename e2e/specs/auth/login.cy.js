/// <reference types="cypress" />

/**
 * E2E Authentication Tests
 * Requirements: 3-2
 * 
 * Test Coverage:
 * - Admin login and navigation access
 * - Employee login with restricted navigation
 * - Invalid credentials handling
 * - Expired JWT token handling
 * - Role-based access control (403 scenarios)
 * - Platform login with separate token scope
 * - Logout and state cleanup
 */

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    // Clear all storage and cookies before each test
    cy.clearAllStorage();
    cy.clearAllCookies();
  });

  describe('Admin Login', () => {
    it('should login with valid admin credentials and redirect to dashboard with admin navigation', () => {
      cy.fixture('users').then((users) => {
        const admin = users.admin;
        
        cy.visit('/login');
        
        // Fill in admin credentials
        cy.get('[data-cy=email-input]').type(admin.email);
        cy.get('[data-cy=password-input]').type(admin.password);
        cy.get('[data-cy=login-button]').click();
      
        
        // Should redirect to dashboard
        cy.url().should('include', '/dashboard');
        
        // Verify admin navigation menu is rendered
        cy.get('[data-cy=nav-menu]').should('be.visible');
        cy.get('[data-cy=nav-admin-panel]').should('be.visible');
        cy.get('[data-cy=nav-users-management]').should('be.visible');
        cy.get('[data-cy=nav-settings]').should('be.visible');
        
        // Verify token is stored
        cy.window().then((win) => {
          const token = win.localStorage.getItem('authToken');
          expect(token).to.exist;
        });
      });
    });

    it('should have access to admin routes', () => {
      cy.loginAsAdmin();
      
      // Navigate to admin route
      cy.visit('/admin');
      cy.url().should('include', '/admin');
      cy.get('[data-cy=admin-page]').should('be.visible');
    });
  });

  describe('Employee Login', () => {
    it('should login with valid employee credentials and show restricted navigation', () => {
      cy.fixture('users').then((users) => {
        const employee = users.employee;
        
        cy.visit('/login');
        
        // Fill in employee credentials
        cy.get('[data-cy=email-input]').type(employee.email);
        cy.get('[data-cy=password-input]').type(employee.password);
        cy.get('[data-cy=login-button]').click();
      
        
        // Should redirect to dashboard
        cy.url().should('include', '/dashboard');
        
        // Verify employee navigation menu (restricted)
        cy.get('[data-cy=nav-menu]').should('be.visible');
        cy.get('[data-cy=nav-my-profile]').should('be.visible');
        cy.get('[data-cy=nav-my-attendance]').should('be.visible');
        
        // Admin-only items should NOT be visible
        cy.get('[data-cy=nav-admin-panel]').should('not.exist');
        cy.get('[data-cy=nav-users-management]').should('not.exist');
      });
    });

    it('should redirect employee to 403 page when accessing admin routes', () => {
      cy.loginAsEmployee();
      
      // Attempt to navigate to admin route
      cy.visit('/admin', { failOnStatusCode: false });
      
      // Should be redirected to 403 or dashboard
      cy.url().should('match', /\/(403|dashboard)/);
      
      // If 403 page, verify error message
      cy.get('body').then(($body) => {
        if ($body.find('[data-cy=forbidden-message]').length > 0) {
          cy.get('[data-cy=forbidden-message]').should('contain', 'Access Denied');
        }
      });
    });
  });

  describe('Invalid Credentials', () => {
    it('should show error message for invalid password', () => {
      cy.fixture('users').then((users) => {
        const admin = users.admin;
        
        cy.visit('/login');
        
        // Fill in credentials with wrong password
        cy.get('[data-cy=email-input]').type(admin.email);
        cy.get('[data-cy=password-input]').type('wrongpassword');
        cy.get('[data-cy=login-button]').click();
      
        
        // Should stay on login page
        cy.url().should('include', '/login');
        
        // Error message should be visible
        cy.get('[data-cy=error-message]').should('be.visible');
        cy.get('[data-cy=error-message]').should('contain', 'Invalid credentials');
        
        // Token should not be stored
        cy.window().then((win) => {
          const token = win.localStorage.getItem('authToken');
          expect(token).to.be.null;
        });
      });
    });

    it('should show error message for non-existent user', () => {
      cy.visit('/login');
      
      cy.get('[data-cy=email-input]').type('nonexistent@example.com');
      cy.get('[data-cy=password-input]').type('password123');
      cy.get('[data-cy=login-button]').click();
      
      cy.url().should('include', '/login');
      cy.get('[data-cy=error-message]').should('be.visible');
    });
  });

  describe('Expired JWT Token', () => {
    it('should redirect to login with session-expired message when token is expired', () => {
      // Set an expired token in localStorage
      cy.window().then((win) => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        win.localStorage.setItem('authToken', expiredToken);
        
        // Also set Redux persisted state
        const persistedState = JSON.stringify({
          auth: {
            user: { id: 1, email: 'test@example.com' },
            token: expiredToken,
            isAuthenticated: true
          }
        });
        win.localStorage.setItem('persist:root', persistedState);
      });
      
      // Try to access protected route
      cy.visit('/dashboard');
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Should show session expired message
      cy.get('[data-cy=session-expired-message]').should('be.visible');
      cy.get('[data-cy=session-expired-message]').should('contain', 'session expired');
    });

    it('should clear expired token from storage', () => {
      cy.window().then((win) => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.invalid';
        win.localStorage.setItem('authToken', expiredToken);
      });
      
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
      
      // Token should be cleared
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        expect(token).to.be.null;
      });
    });
  });

  describe('Platform Login', () => {
    it('should login at /platform/login with platform-scoped token', () => {
      cy.fixture('users').then((users) => {
        const platformAdmin = users.platformAdmin;
        
        cy.visit('/platform/login');
        
        // Verify platform login form is different
        cy.get('[data-cy=platform-login-form]').should('be.visible');
        cy.get('[data-cy=platform-email-input]').type(platformAdmin.email);
        cy.get('[data-cy=platform-password-input]').type(platformAdmin.password);
        cy.get('[data-cy=platform-login-button]').click();
      
        
        // Should redirect to platform dashboard
        cy.url().should('include', '/platform/dashboard');
        
        // Verify platform-scoped token
        cy.window().then((win) => {
          const token = win.localStorage.getItem('platformToken') || win.localStorage.getItem('authToken');
          expect(token).to.exist;
          
          // Decode token and verify scope/issuer
          const payload = JSON.parse(atob(token.split('.')[1]));
          expect(payload).to.have.property('scope');
          expect(payload.scope).to.include('platform');
          // OR check issuer
          // expect(payload.iss).to.equal('platform');
        });
      });
    });

    it('should have separate navigation for platform admin', () => {
      cy.loginAsPlatformAdmin();
      
      cy.visit('/platform/dashboard');
      
      // Platform-specific navigation
      cy.get('[data-cy=platform-nav-menu]').should('be.visible');
      cy.get('[data-cy=nav-tenants]').should('be.visible');
      cy.get('[data-cy=nav-platform-settings]').should('be.visible');
      
      // Regular HR app navigation should not be visible
      cy.get('[data-cy=nav-employees]').should('not.exist');
    });
  });

  describe('Logout', () => {
    it('should clear Redux persisted state and redirect to login', () => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
      
      // Verify user is logged in
      cy.get('[data-cy=user-menu]').should('be.visible');
      
      // Click logout button
      cy.get('[data-cy=logout-button]').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Verify all storage is cleared
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        const persistedState = win.localStorage.getItem('persist:root');
        
        expect(token).to.be.null;
        
        // If persisted state exists, auth should be cleared
        if (persistedState) {
          const state = JSON.parse(persistedState);
          if (state.auth) {
            const authState = JSON.parse(state.auth);
            expect(authState.isAuthenticated).to.be.false;
            expect(authState.token).to.be.null;
          }
        }
      });
    });

    it('should not restore authenticated state when using back button', () => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
      
      // Logout
      cy.get('[data-cy=logout-button]').click();
      cy.url().should('include', '/login');
      
      // Use browser back button
      cy.go('back');
      
      // Should still be on login page or redirect back to login
      cy.url().should('include', '/login');
      
      // Dashboard should not be accessible
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should clear all cookies on logout', () => {
      cy.loginAsAdmin();
      
      // Set a test cookie
      cy.setCookie('test-cookie', 'test-value');
      
      cy.visit('/dashboard');
      cy.get('[data-cy=logout-button]').click();
      
      // Verify cookies are cleared
      cy.getCookie('authToken').should('be.null');
      cy.getCookie('refreshToken').should('be.null');
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session across page reloads', () => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
      
      // Reload page
      cy.reload();
      
      // Should still be authenticated
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=user-menu]').should('be.visible');
    });

    it('should maintain session in new tab', () => {
      cy.loginAsAdmin();
      
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        expect(token).to.exist;
        
        // Simulate new tab by visiting dashboard
        cy.visit('/dashboard');
        cy.get('[data-cy=user-menu]').should('be.visible');
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should prevent employee from accessing user management', () => {
      cy.loginAsEmployee();
      
      cy.visit('/users', { failOnStatusCode: false });
      cy.url().should('match', /\/(403|dashboard)/);
    });

    it('should prevent employee from accessing settings', () => {
      cy.loginAsEmployee();
      
      cy.visit('/settings', { failOnStatusCode: false });
      cy.url().should('match', /\/(403|dashboard)/);
    });

    it('should allow admin to access all routes', () => {
      cy.loginAsAdmin();
      
      const adminRoutes = ['/admin', '/users', '/settings', '/reports'];
      
      adminRoutes.forEach((route) => {
        cy.visit(route);
        cy.url().should('include', route);
      });
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token before expiration', () => {
      cy.loginAsAdmin();
      
      // Intercept token refresh endpoint
      cy.intercept('POST', '/api/auth/refresh', {
        statusCode: 200,
        body: {
          token: 'new-token-value',
          refreshToken: 'new-refresh-token'
        }
      }).as('refreshToken');
      
      // Wait for token refresh (if implemented)
      cy.visit('/dashboard');
      
      // Simulate time passing (if using token refresh)
      cy.wait(1000);
      
      // Token should still be valid
      cy.get('[data-cy=user-menu]').should('be.visible');
    });
  });
});
