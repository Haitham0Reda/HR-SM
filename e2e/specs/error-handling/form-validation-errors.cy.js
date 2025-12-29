/**
 * E2E Tests for Form Validation and Error Messages
 * Tests client-side and server-side validation, error display, and user guidance
 */

describe('Form Validation and Error Messages', () => {
    beforeEach(() => {
        cy.cleanupTestData();
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Client-Side Validation', () => {
        it('should validate required fields before submission', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            // Try to submit without filling required fields
            cy.submitForm();

            // Should show client-side validation errors
            cy.get('[data-cy="validation-error"]').should('be.visible');
            cy.get('[data-cy="field-error-leave-type"]').should('contain.text', 'Leave type is required');
            cy.get('[data-cy="field-error-start-date"]').should('contain.text', 'Start date is required');
            cy.get('[data-cy="field-error-end-date"]').should('contain.text', 'End date is required');
            cy.get('[data-cy="field-error-reason"]').should('contain.text', 'Reason is required');

            // Form should not be submitted
            cy.get('[data-cy="form-submitted"]').should('not.exist');
        });

        it('should validate email format in real-time', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            cy.navigateToModule('employees');
            cy.get('[data-cy="add-employee-button"]').click();

            // Type invalid email
            cy.get('[data-cy="email-input"]').type('invalid-email');

            // Should show format error immediately
            cy.get('[data-cy="field-error-email"]').should('be.visible');
            cy.get('[data-cy="field-error-email"]').should('contain.text', 'Please enter a valid email address');

            // Email field should have error styling
            cy.get('[data-cy="email-input"]').should('have.class', 'error');

            // Type valid email
            cy.get('[data-cy="email-input"]').clear().type('valid@testcompany.com');

            // Error should disappear
            cy.get('[data-cy="field-error-email"]').should('not.exist');
            cy.get('[data-cy="email-input"]').should('not.have.class', 'error');
        });

        it('should validate date ranges', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            // Set end date before start date
            cy.get('[data-cy="start-date-input"]').type('2024-01-15');
            cy.get('[data-cy="end-date-input"]').type('2024-01-10');

            // Should show date range error
            cy.get('[data-cy="field-error-end-date"]').should('be.visible');
            cy.get('[data-cy="field-error-end-date"]').should('contain.text', 'End date must be after start date');

            // Fix the date range
            cy.get('[data-cy="end-date-input"]').clear().type('2024-01-17');

            // Error should disappear
            cy.get('[data-cy="field-error-end-date"]').should('not.exist');
        });

        it('should validate numeric fields with min/max constraints', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            cy.navigateToModule('employees');
            cy.get('[data-cy="add-employee-button"]').click();

            // Test salary field validation
            cy.get('[data-cy="salary-input"]').type('-1000');

            // Should show minimum value error
            cy.get('[data-cy="field-error-salary"]').should('be.visible');
            cy.get('[data-cy="field-error-salary"]').should('contain.text', 'Salary must be greater than 0');

            // Test maximum value
            cy.get('[data-cy="salary-input"]').clear().type('10000000');

            // Should show maximum value error
            cy.get('[data-cy="field-error-salary"]').should('be.visible');
            cy.get('[data-cy="field-error-salary"]').should('contain.text', 'Salary cannot exceed $1,000,000');

            // Enter valid value
            cy.get('[data-cy="salary-input"]').clear().type('75000');

            // Error should disappear
            cy.get('[data-cy="field-error-salary"]').should('not.exist');
        });

        it('should validate password strength', () => {
            cy.loginAsPlatformAdmin();

            cy.navigateToPlatformSection('users');
            cy.get('[data-cy="add-user-button"]').click();

            // Test weak password
            cy.get('[data-cy="password-input"]').type('123');

            // Should show password strength indicator
            cy.get('[data-cy="password-strength"]').should('be.visible');
            cy.get('[data-cy="password-strength"]').should('contain.text', 'Weak');
            cy.get('[data-cy="password-requirements"]').should('be.visible');

            // Should show specific requirements
            cy.get('[data-cy="requirement-length"]').should('have.class', 'invalid');
            cy.get('[data-cy="requirement-uppercase"]').should('have.class', 'invalid');
            cy.get('[data-cy="requirement-lowercase"]').should('have.class', 'invalid');
            cy.get('[data-cy="requirement-number"]').should('have.class', 'valid');
            cy.get('[data-cy="requirement-special"]').should('have.class', 'invalid');

            // Enter strong password
            cy.get('[data-cy="password-input"]').clear().type('StrongP@ssw0rd123');

            // Should show strong password
            cy.get('[data-cy="password-strength"]').should('contain.text', 'Strong');
            cy.get('[data-cy="requirement-length"]').should('have.class', 'valid');
            cy.get('[data-cy="requirement-uppercase"]').should('have.class', 'valid');
            cy.get('[data-cy="requirement-lowercase"]').should('have.class', 'valid');
            cy.get('[data-cy="requirement-number"]').should('have.class', 'valid');
            cy.get('[data-cy="requirement-special"]').should('have.class', 'valid');
        });
    });

    describe('Server-Side Validation', () => {
        it('should handle server-side validation errors', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            // Mock server validation error
            cy.intercept('POST', '/api/employees', {
                statusCode: 422,
                body: {
                    error: 'Validation failed',
                    message: 'The provided data is invalid',
                    validationErrors: {
                        email: ['Email address is already in use'],
                        employeeId: ['Employee ID must be unique'],
                        department: ['Selected department does not exist']
                    }
                }
            }).as('validationError');

            cy.navigateToModule('employees');
            cy.get('[data-cy="add-employee-button"]').click();

            cy.fillForm({
                'first-name': 'John',
                'last-name': 'Doe',
                'email': 'existing@testcompany.com',
                'employee-id': 'EMP001',
                'department': 'NonExistent'
            });

            cy.submitForm();

            // Should show server validation errors
            cy.wait('@validationError');
            cy.get('[data-cy="server-validation-errors"]').should('be.visible');
            cy.get('[data-cy="field-error-email"]').should('contain.text', 'Email address is already in use');
            cy.get('[data-cy="field-error-employee-id"]').should('contain.text', 'Employee ID must be unique');
            cy.get('[data-cy="field-error-department"]').should('contain.text', 'Selected department does not exist');

            // Form should remain in edit mode
            cy.get('[data-cy="form-edit-mode"]').should('be.visible');
        });

        it('should handle business logic validation errors', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock business logic error
            cy.intercept('POST', '/api/leave-requests', {
                statusCode: 422,
                body: {
                    error: 'Business rule violation',
                    message: 'Leave request violates company policies',
                    businessErrors: [
                        {
                            code: 'INSUFFICIENT_BALANCE',
                            message: 'You have insufficient leave balance for this request',
                            details: {
                                requested: 5,
                                available: 3,
                                leaveType: 'vacation'
                            }
                        },
                        {
                            code: 'BLACKOUT_PERIOD',
                            message: 'Leave requests are not allowed during blackout periods',
                            details: {
                                blackoutStart: '2024-12-20',
                                blackoutEnd: '2024-01-05',
                                reason: 'Year-end closing'
                            }
                        }
                    ]
                }
            }).as('businessLogicError');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            cy.fillForm({
                'leave-type': 'vacation',
                'start-date': '2024-12-25',
                'end-date': '2024-12-29',
                'reason': 'Holiday vacation'
            });

            cy.submitForm();

            // Should show business logic errors
            cy.wait('@businessLogicError');
            cy.get('[data-cy="business-logic-errors"]').should('be.visible');

            // Should show balance error with details
            cy.get('[data-cy="error-insufficient-balance"]').should('be.visible');
            cy.get('[data-cy="requested-days"]').should('contain.text', '5');
            cy.get('[data-cy="available-days"]').should('contain.text', '3');

            // Should show blackout period error
            cy.get('[data-cy="error-blackout-period"]').should('be.visible');
            cy.get('[data-cy="blackout-dates"]').should('contain.text', 'Dec 20, 2024 - Jan 5, 2025');
            cy.get('[data-cy="blackout-reason"]').should('contain.text', 'Year-end closing');
        });

        it('should handle concurrent modification errors', () => {
            cy.loginAsTenantUser('manager', 'testcompany');

            // Mock concurrent modification error
            cy.intercept('PUT', '/api/employees/1', {
                statusCode: 409,
                body: {
                    error: 'Concurrent modification',
                    message: 'The record has been modified by another user',
                    conflictDetails: {
                        field: 'salary',
                        yourValue: 75000,
                        currentValue: 80000,
                        modifiedBy: 'hr@testcompany.com',
                        modifiedAt: '2024-01-15T10:30:00Z'
                    }
                }
            }).as('concurrentModification');

            cy.navigateToModule('employees');
            cy.clickTableAction(0, 'edit');

            cy.fillForm({ salary: '75000' });
            cy.submitForm();

            // Should show concurrent modification error
            cy.wait('@concurrentModification');
            cy.get('[data-cy="concurrent-modification-error"]').should('be.visible');
            cy.get('[data-cy="conflict-message"]').should('contain.text', 'The record has been modified by another user');

            // Should show conflict resolution options
            cy.get('[data-cy="your-value"]').should('contain.text', '$75,000');
            cy.get('[data-cy="current-value"]').should('contain.text', '$80,000');
            cy.get('[data-cy="modified-by"]').should('contain.text', 'hr@testcompany.com');

            // Should offer resolution options
            cy.get('[data-cy="keep-your-changes"]').should('be.visible');
            cy.get('[data-cy="accept-current-changes"]').should('be.visible');
            cy.get('[data-cy="reload-and-edit"]').should('be.visible');
        });
    });

    describe('Error Message Display', () => {
        it('should display field-level error messages clearly', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            cy.navigateToModule('profile');
            cy.get('[data-cy="edit-profile-button"]').click();

            // Clear required field
            cy.get('[data-cy="first-name-input"]').clear();

            // Should show inline error message
            cy.get('[data-cy="field-error-first-name"]').should('be.visible');
            cy.get('[data-cy="field-error-first-name"]').should('contain.text', 'First name is required');

            // Error message should be properly associated with field
            cy.get('[data-cy="first-name-input"]').should('have.attr', 'aria-describedby');
            cy.get('[data-cy="first-name-input"]').should('have.attr', 'aria-invalid', 'true');

            // Error styling should be applied
            cy.get('[data-cy="first-name-input"]').should('have.class', 'error');
            cy.get('[data-cy="first-name-field"]').should('have.class', 'has-error');
        });

        it('should display form-level error summaries', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            // Mock multiple validation errors
            cy.intercept('POST', '/api/employees', {
                statusCode: 422,
                body: {
                    error: 'Multiple validation errors',
                    message: 'Please correct the following errors',
                    validationErrors: {
                        email: ['Email is required', 'Email format is invalid'],
                        phone: ['Phone number is required'],
                        department: ['Department is required'],
                        salary: ['Salary must be a positive number']
                    }
                }
            }).as('multipleErrors');

            cy.navigateToModule('employees');
            cy.get('[data-cy="add-employee-button"]').click();

            cy.fillForm({
                'first-name': 'John',
                'last-name': 'Doe'
            });

            cy.submitForm();

            // Should show error summary at top of form
            cy.wait('@multipleErrors');
            cy.get('[data-cy="form-error-summary"]').should('be.visible');
            cy.get('[data-cy="error-count"]').should('contain.text', '5 errors');

            // Should list all errors with links to fields
            cy.get('[data-cy="error-list"]').should('be.visible');
            cy.get('[data-cy="error-link-email"]').should('contain.text', 'Email is required');
            cy.get('[data-cy="error-link-phone"]').should('contain.text', 'Phone number is required');

            // Clicking error link should focus field
            cy.get('[data-cy="error-link-email"]').click();
            cy.get('[data-cy="email-input"]').should('be.focused');
        });

        it('should show contextual help for validation errors', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            // Trigger validation error with help text
            cy.get('[data-cy="start-date-input"]').type('2024-01-01'); // Past date

            // Should show error with contextual help
            cy.get('[data-cy="field-error-start-date"]').should('be.visible');
            cy.get('[data-cy="field-error-start-date"]').should('contain.text', 'Start date cannot be in the past');

            // Should show help text
            cy.get('[data-cy="field-help-start-date"]').should('be.visible');
            cy.get('[data-cy="field-help-start-date"]').should('contain.text', 'Leave requests must be submitted at least 24 hours in advance');

            // Should show suggestion
            cy.get('[data-cy="field-suggestion-start-date"]').should('be.visible');
            cy.get('[data-cy="field-suggestion-start-date"]').should('contain.text', 'Try selecting tomorrow or later');
        });

        it('should handle error message internationalization', () => {
            // Set language preference
            cy.window().then((win) => {
                win.localStorage.setItem('language', 'es');
            });

            cy.loginAsTenantUser('employee', 'testcompany');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            // Try to submit without required fields
            cy.submitForm();

            // Should show localized error messages
            cy.get('[data-cy="field-error-leave-type"]').should('contain.text', 'El tipo de permiso es obligatorio');
            cy.get('[data-cy="field-error-start-date"]').should('contain.text', 'La fecha de inicio es obligatoria');
            cy.get('[data-cy="field-error-reason"]').should('contain.text', 'La razón es obligatoria');
        });
    });

    describe('Error Recovery and Guidance', () => {
        it('should provide suggestions for fixing validation errors', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            cy.navigateToModule('employees');
            cy.get('[data-cy="add-employee-button"]').click();

            // Enter invalid email
            cy.get('[data-cy="email-input"]').type('invalid.email');

            // Should show suggestion
            cy.get('[data-cy="field-suggestion-email"]').should('be.visible');
            cy.get('[data-cy="field-suggestion-email"]').should('contain.text', 'Email should include @ and domain (e.g., user@company.com)');

            // Should offer auto-correction
            cy.get('[data-cy="auto-correct-email"]').should('be.visible');
            cy.get('[data-cy="auto-correct-email"]').click();

            // Should auto-correct to valid format
            cy.get('[data-cy="email-input"]').should('have.value', 'invalid.email@testcompany.com');
        });

        it('should preserve form data during validation errors', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock server error
            cy.intercept('POST', '/api/leave-requests', {
                statusCode: 500,
                body: { error: 'Server error' }
            }).as('serverError');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            const formData = {
                'leave-type': 'vacation',
                'start-date': '2024-01-15',
                'end-date': '2024-01-17',
                'reason': 'Family vacation'
            };

            cy.fillForm(formData);
            cy.submitForm();

            // Should show error but preserve form data
            cy.wait('@serverError');
            cy.expectErrorMessage('Server error');

            // Form data should be preserved
            cy.get('[data-cy="leave-type-input"]').should('have.value', 'vacation');
            cy.get('[data-cy="start-date-input"]').should('have.value', '2024-01-15');
            cy.get('[data-cy="end-date-input"]').should('have.value', '2024-01-17');
            cy.get('[data-cy="reason-input"]').should('have.value', 'Family vacation');
        });

        it('should provide progressive validation feedback', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            cy.navigateToModule('employees');
            cy.get('[data-cy="add-employee-button"]').click();

            // Start typing email
            cy.get('[data-cy="email-input"]').type('j');

            // Should show progressive feedback
            cy.get('[data-cy="validation-progress-email"]').should('be.visible');
            cy.get('[data-cy="validation-status-email"]').should('contain.text', 'Keep typing...');

            // Continue typing
            cy.get('[data-cy="email-input"]').type('ohn@');

            // Should show improved status
            cy.get('[data-cy="validation-status-email"]').should('contain.text', 'Almost there...');

            // Complete valid email
            cy.get('[data-cy="email-input"]').type('testcompany.com');

            // Should show success
            cy.get('[data-cy="validation-status-email"]').should('contain.text', 'Valid email');
            cy.get('[data-cy="validation-success-email"]').should('be.visible');
        });

        it('should handle form auto-save during validation errors', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            cy.navigateToModule('profile');
            cy.get('[data-cy="edit-profile-button"]').click();

            // Enable auto-save
            cy.get('[data-cy="auto-save-toggle"]').check();

            // Make changes
            cy.get('[data-cy="bio-input"]').type('Updated bio information');

            // Should show auto-save indicator
            cy.get('[data-cy="auto-save-indicator"]').should('be.visible');
            cy.get('[data-cy="auto-save-status"]').should('contain.text', 'Saving...');

            // Should complete auto-save
            cy.get('[data-cy="auto-save-status"]').should('contain.text', 'Saved');

            // Create validation error
            cy.get('[data-cy="email-input"]').clear().type('invalid-email');

            // Should show validation error but preserve auto-saved data
            cy.get('[data-cy="field-error-email"]').should('be.visible');
            cy.get('[data-cy="bio-input"]').should('have.value', 'Updated bio information');
            cy.get('[data-cy="auto-save-conflict"]').should('be.visible');
        });
    });

    describe('Accessibility and Usability', () => {
        it('should provide accessible error messages', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            // Submit form to trigger validation
            cy.submitForm();

            // Should have proper ARIA attributes
            cy.get('[data-cy="field-error-leave-type"]').should('have.attr', 'role', 'alert');
            cy.get('[data-cy="field-error-leave-type"]').should('have.attr', 'aria-live', 'polite');

            // Field should reference error message
            cy.get('[data-cy="leave-type-input"]').should('have.attr', 'aria-describedby');
            cy.get('[data-cy="leave-type-input"]').should('have.attr', 'aria-invalid', 'true');

            // Error summary should be announced
            cy.get('[data-cy="form-error-summary"]').should('have.attr', 'role', 'alert');
            cy.get('[data-cy="form-error-summary"]').should('have.attr', 'tabindex', '-1');
        });

        it('should support keyboard navigation for error correction', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            cy.navigateToModule('leave');
            cy.get('[data-cy="new-leave-request"]').click();

            // Submit to trigger validation
            cy.submitForm();

            // Should focus first error field
            cy.get('[data-cy="leave-type-input"]').should('be.focused');

            // Should be able to navigate between error fields with Tab
            cy.get('[data-cy="leave-type-input"]').tab();
            cy.get('[data-cy="start-date-input"]').should('be.focused');

            // Should be able to navigate to error summary with Shift+Tab
            cy.get('[data-cy="start-date-input"]').tab({ shift: true });
            cy.get('[data-cy="leave-type-input"]').should('be.focused');
        });

        it('should provide clear visual hierarchy for errors', () => {
            cy.loginAsTenantUser('hr', 'testcompany');

            cy.navigateToModule('employees');
            cy.get('[data-cy="add-employee-button"]').click();

            // Submit to trigger multiple validation errors
            cy.submitForm();

            // Should have proper visual hierarchy
            cy.get('[data-cy="form-error-summary"]').should('have.css', 'border-color', 'rgb(220, 53, 69)'); // Red border
            cy.get('[data-cy="form-error-summary"]').should('have.css', 'background-color', 'rgb(248, 215, 218)'); // Light red background

            // Error fields should have error styling
            cy.get('[data-cy="email-input"]').should('have.css', 'border-color', 'rgb(220, 53, 69)');
            cy.get('[data-cy="field-error-email"]').should('have.css', 'color', 'rgb(220, 53, 69)');

            // Error icons should be visible
            cy.get('[data-cy="error-icon-email"]').should('be.visible');
            cy.get('[data-cy="error-icon-email"]').should('have.attr', 'aria-hidden', 'true');
        });
    });
});