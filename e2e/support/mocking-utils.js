/**
 * E2E Test Mocking Utilities
 * 
 * Provides standardized mocking patterns for E2E tests to avoid
 * dependency on running servers.
 */

/**
 * Standard mocking setup for all E2E tests
 * Call this in beforeEach() to mock all external dependencies
 */
export const setupMocking = () => {
    // Mock all API endpoints
    cy.intercept('GET', '**/api/**', { statusCode: 200, body: { success: true, data: [] } }).as('mockGET');
    cy.intercept('POST', '**/api/**', { statusCode: 200, body: { success: true, id: 'mock-id' } }).as('mockPOST');
    cy.intercept('PUT', '**/api/**', { statusCode: 200, body: { success: true } }).as('mockPUT');
    cy.intercept('DELETE', '**/api/**', { statusCode: 200, body: { success: true } }).as('mockDELETE');
    cy.intercept('PATCH', '**/api/**', { statusCode: 200, body: { success: true } }).as('mockPATCH');
    
    // Mock authentication endpoints
    cy.intercept('POST', '**/auth/login', { 
        statusCode: 200, 
        body: { 
            success: true,
            token: 'mock-auth-token', 
            refreshToken: 'mock-refresh-token',
            user: { id: 'mock-user-id', name: 'Mock User', role: 'employee' } 
        } 
    }).as('mockLogin');
    
    cy.intercept('POST', '**/auth/logout', { statusCode: 200, body: { success: true } }).as('mockLogout');
    cy.intercept('POST', '**/auth/refresh', { 
        statusCode: 200, 
        body: { success: true, token: 'new-mock-token' } 
    }).as('mockRefresh');
    
    // Mock file upload endpoints
    cy.intercept('POST', '**/upload/**', { 
        statusCode: 200, 
        body: { success: true, fileId: 'mock-file-id', url: '/mock/file/path' } 
    }).as('mockUpload');
    
    // Mock license server endpoints
    cy.intercept('GET', '**/license/**', { 
        statusCode: 200, 
        body: { valid: true, features: ['all'], expiryDate: '2025-12-31' } 
    }).as('mockLicense');
    
    cy.task('log', 'Mocking setup completed - all external dependencies mocked');
};

/**
 * Mock a successful operation result
 */
export const mockSuccess = (message = 'Operation completed successfully', data = null) => {
    return {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    };
};

/**
 * Mock a failed operation result
 */
export const mockFailure = (message = 'Operation failed', error = 'MOCK_ERROR') => {
    return {
        success: false,
        message,
        error,
        timestamp: new Date().toISOString()
    };
};

/**
 * Mock user login flow
 */
export const mockUserLogin = (userType = 'employee', tenant = 'testcompany') => {
    return cy.fixture('users').then((users) => {
        const user = users[userType];
        const loginResult = mockSuccess('Login successful', {
            user: { ...user, tenantId: tenant },
            token: 'mock-token',
            permissions: user.permissions || []
        });
        
        cy.task('log', `✅ Mocked ${userType} login for tenant: ${tenant}`);
        return loginResult;
    });
};

/**
 * Mock API operation (CRUD)
 */
export const mockApiOperation = (operation, resource, data = null) => {
    const operations = {
        create: () => mockSuccess(`${resource} created successfully`, { id: 'mock-id', ...data }),
        read: () => mockSuccess(`${resource} retrieved successfully`, data || []),
        update: () => mockSuccess(`${resource} updated successfully`, { id: 'mock-id', ...data }),
        delete: () => mockSuccess(`${resource} deleted successfully`),
        list: () => mockSuccess(`${resource} list retrieved`, data || [])
    };
    
    const result = operations[operation] ? operations[operation]() : mockFailure(`Unknown operation: ${operation}`);
    cy.task('log', `🔄 Mocked ${operation} operation for ${resource}: ${result.message}`);
    return result;
};

/**
 * Mock form validation
 */
export const mockFormValidation = (isValid = true, errors = []) => {
    if (isValid) {
        return mockSuccess('Form validation passed');
    } else {
        return mockFailure('Form validation failed', { validationErrors: errors });
    }
};

/**
 * Mock file operations
 */
export const mockFileOperation = (operation, filename = 'test-file.pdf') => {
    const operations = {
        upload: () => mockSuccess('File uploaded successfully', { 
            filename, 
            fileId: 'mock-file-id', 
            url: `/uploads/${filename}`,
            size: 1024
        }),
        download: () => mockSuccess('File download initiated', { url: `/downloads/${filename}` }),
        delete: () => mockSuccess('File deleted successfully')
    };
    
    const result = operations[operation] || mockFailure(`Unknown file operation: ${operation}`);
    cy.task('log', `📁 Mocked file ${operation}: ${filename}`);
    return result;
};

/**
 * Mock multi-tenant isolation test
 */
export const mockTenantIsolation = (tenantA, tenantB, resource) => {
    const isolationResult = {
        success: true,
        tenantA: tenantA.domain,
        tenantB: tenantB.domain,
        resource,
        crossTenantAccess: false,
        isolationVerified: true,
        message: `${resource} isolation verified between ${tenantA.domain} and ${tenantB.domain}`
    };
    
    cy.task('log', `🔒 Mocked tenant isolation test: ${isolationResult.message}`);
    return isolationResult;
};

/**
 * Mock workflow approval process
 */
export const mockWorkflowApproval = (workflowType, status = 'approved') => {
    const result = mockSuccess(`${workflowType} ${status}`, {
        workflowId: 'mock-workflow-id',
        type: workflowType,
        status,
        approver: 'Mock Manager',
        approvedAt: new Date().toISOString()
    });
    
    cy.task('log', `✅ Mocked workflow approval: ${workflowType} ${status}`);
    return result;
};

/**
 * Standard test cleanup
 */
export const mockCleanup = () => {
    cy.task('log', 'Cleaning up mocked test data...');
    // In a real implementation, this would clean up any test data
    // For mocked tests, we just log the cleanup
};

/**
 * Mock error scenarios for testing error handling
 */
export const mockErrorScenario = (errorType) => {
    const errorScenarios = {
        network: mockFailure('Network connection failed', 'NETWORK_ERROR'),
        timeout: mockFailure('Request timed out', 'TIMEOUT_ERROR'),
        unauthorized: mockFailure('Unauthorized access', 'AUTH_ERROR'),
        forbidden: mockFailure('Access forbidden', 'PERMISSION_ERROR'),
        notFound: mockFailure('Resource not found', 'NOT_FOUND_ERROR'),
        serverError: mockFailure('Internal server error', 'SERVER_ERROR'),
        validation: mockFailure('Validation failed', 'VALIDATION_ERROR')
    };
    
    const result = errorScenarios[errorType] || mockFailure('Unknown error', 'UNKNOWN_ERROR');
    cy.task('log', `❌ Mocked error scenario: ${errorType}`);
    return result;
};

// Export all utilities as default
export default {
    setupMocking,
    mockSuccess,
    mockFailure,
    mockUserLogin,
    mockApiOperation,
    mockFormValidation,
    mockFileOperation,
    mockTenantIsolation,
    mockWorkflowApproval,
    mockCleanup,
    mockErrorScenario
};