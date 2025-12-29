/**
 * E2E Tests for Employee Profile Management
 * Tests employee profile viewing, editing, and updating functionality
 */

describe('Employee Profile Management', () => {
    beforeEach(() => {
        // Clean up test data and seed fresh data
        cy.cleanupTestData();
        cy.seedTestData('user', {
            email: 'test.employee@testcompany.com',
            name: 'Test Employee',
            role: 'employee',
            department: 'Engineering',
            position: 'Software Developer',
            phone: '+1234567890',
            address: '123 Test Street, Test City',
            emergencyContact: {
                name: 'Emergency Contact',
                phone: '+0987654321',
                relationship: 'Spouse'
            }
        });
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Profile Viewing', () => {
        it('should display employee profile information correctly', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            // Verify profile page loads
            cy.shouldBeOnPage('profile');
            cy.get('[data-cy="profile-header"]').should('be.visible');

            // Verify personal information display
            cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
            cy.get('[data-cy="employee-email"]').should('contain.text', 'test.employee@testcompany.com');
            cy.get('[data-cy="employee-department"]').should('contain.text', 'Engineering');
            cy.get('[data-cy="employee-position"]').should('contain.text', 'Software Developer');

            // Verify contact information
            cy.get('[data-cy="employee-phone"]').should('contain.text', '+1234567890');
            cy.get('[data-cy="employee-address"]').should('contain.text', '123 Test Street, Test City');

            // Verify emergency contact information
            cy.get('[data-cy="emergency-contact-name"]').should('contain.text', 'Emergency Contact');
            cy.get('[data-cy="emergency-contact-phone"]').should('contain.text', '+0987654321');
            cy.get('[data-cy="emergency-contact-relationship"]').should('contain.text', 'Spouse');
        });

        it('should display profile picture placeholder when no image uploaded', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            cy.get('[data-cy="profile-picture"]').should('be.visible');
            cy.get('[data-cy="profile-picture-placeholder"]').should('be.visible');
            cy.get('[data-cy="upload-picture-button"]').should('be.visible');
        });
    });

    describe('Profile Editing', () => {
        it('should allow employee to edit personal information', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            // Click edit button
            cy.get('[data-cy="edit-profile-button"]').click();
            cy.get('[data-cy="profile-edit-form"]').should('be.visible');

            // Update personal information
            cy.fillForm({
                'phone': '+1111111111',
                'address': '456 New Street, New City',
                'emergency-contact-name': 'Updated Emergency Contact',
                'emergency-contact-phone': '+2222222222',
                'emergency-contact-relationship': 'Parent'
            });

            // Submit form
            cy.submitForm('[data-cy="profile-edit-form"]');

            // Verify success message
            cy.expectSuccessMessage('Profile updated successfully');

            // Verify updated information is displayed
            cy.get('[data-cy="employee-phone"]').should('contain.text', '+1111111111');
            cy.get('[data-cy="employee-address"]').should('contain.text', '456 New Street, New City');
            cy.get('[data-cy="emergency-contact-name"]').should('contain.text', 'Updated Emergency Contact');
            cy.get('[data-cy="emergency-contact-phone"]').should('contain.text', '+2222222222');
            cy.get('[data-cy="emergency-contact-relationship"]').should('contain.text', 'Parent');
        });

        it('should validate required fields during profile editing', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            cy.get('[data-cy="edit-profile-button"]').click();

            // Clear required fields
            cy.get('[data-cy="phone-input"]').clear();
            cy.get('[data-cy="emergency-contact-name-input"]').clear();

            cy.submitForm('[data-cy="profile-edit-form"]');

            // Verify validation errors
            cy.get('[data-cy="phone-error"]').should('be.visible');
            cy.get('[data-cy="emergency-contact-name-error"]').should('be.visible');

            // Form should not be submitted
            cy.get('[data-cy="profile-edit-form"]').should('be.visible');
        });

        it('should allow canceling profile edit without saving changes', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            const originalPhone = '+1234567890';

            cy.get('[data-cy="edit-profile-button"]').click();
            cy.fillForm({ 'phone': '+9999999999' });

            // Cancel editing
            cy.get('[data-cy="cancel-edit-button"]').click();

            // Verify original data is still displayed
            cy.get('[data-cy="employee-phone"]').should('contain.text', originalPhone);
            cy.get('[data-cy="profile-edit-form"]').should('not.exist');
        });
    });

    describe('Profile Picture Management', () => {
        it('should allow uploading profile picture', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            // Upload profile picture
            cy.get('[data-cy="upload-picture-button"]').click();
            cy.uploadFile('test-profile-picture.jpg', '[data-cy="picture-file-input"]');

            // Confirm upload
            cy.get('[data-cy="confirm-upload-button"]').click();

            cy.expectSuccessMessage('Profile picture updated successfully');

            // Verify picture is displayed
            cy.get('[data-cy="profile-picture-image"]').should('be.visible');
            cy.get('[data-cy="profile-picture-placeholder"]').should('not.exist');
        });

        it('should validate file type for profile picture upload', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            cy.get('[data-cy="upload-picture-button"]').click();
            cy.uploadFile('invalid-file.txt', '[data-cy="picture-file-input"]');

            cy.expectErrorMessage('Please upload a valid image file (JPG, PNG, GIF)');
            cy.get('[data-cy="confirm-upload-button"]').should('be.disabled');
        });
    });

    describe('Profile Security', () => {
        it('should not allow editing restricted fields', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            cy.get('[data-cy="edit-profile-button"]').click();

            // Verify restricted fields are not editable
            cy.get('[data-cy="name-input"]').should('be.disabled');
            cy.get('[data-cy="email-input"]').should('be.disabled');
            cy.get('[data-cy="department-input"]').should('be.disabled');
            cy.get('[data-cy="position-input"]').should('be.disabled');
            cy.get('[data-cy="role-input"]').should('be.disabled');
        });

        it('should allow HR manager to edit employee profiles', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('employees');

            // Search for employee
            cy.searchInTable('test.employee@testcompany.com');
            cy.clickTableAction(0, 'edit');

            // Verify HR can edit restricted fields
            cy.get('[data-cy="name-input"]').should('not.be.disabled');
            cy.get('[data-cy="department-input"]').should('not.be.disabled');
            cy.get('[data-cy="position-input"]').should('not.be.disabled');

            // Update employee information
            cy.fillForm({
                'name': 'Updated Employee Name',
                'department': 'Marketing',
                'position': 'Marketing Specialist'
            });

            cy.submitForm();
            cy.expectSuccessMessage('Employee profile updated successfully');
        });
    });

    describe('Profile History and Audit', () => {
        it('should track profile changes in audit log', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('profile');

            // Make a profile change
            cy.get('[data-cy="edit-profile-button"]').click();
            cy.fillForm({ 'phone': '+5555555555' });
            cy.submitForm('[data-cy="profile-edit-form"]');

            cy.expectSuccessMessage('Profile updated successfully');

            // Check audit log (if available to employee)
            cy.get('[data-cy="profile-history-tab"]').click();
            cy.get('[data-cy="audit-log"]').should('be.visible');
            cy.get('[data-cy="audit-entry"]').should('contain.text', 'Phone number updated');
            cy.get('[data-cy="audit-entry"]').should('contain.text', 'Test Employee');
        });
    });
});