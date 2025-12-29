/**
 * E2E Tests for Task Assignment and Completion Tracking
 * Tests task creation, assignment, and completion workflows
 */

describe('Task Assignment and Completion Tracking', () => {
    beforeEach(() => {
        // Clean up and seed test data
        cy.cleanupTestData();

        // Seed employee, manager, and team lead users
        cy.seedTestData('user', [
            {
                email: 'employee@testcompany.com',
                name: 'Test Employee',
                role: 'employee',
                managerId: 'manager-id-123',
                department: 'Engineering'
            },
            {
                email: 'manager@testcompany.com',
                name: 'Test Manager',
                role: 'manager',
                department: 'Engineering'
            },
            {
                email: 'teamlead@testcompany.com',
                name: 'Team Lead',
                role: 'team_lead',
                department: 'Engineering'
            }
        ]);

        // Seed projects and task categories
        cy.seedTestData('project', [
            {
                id: 'proj-001',
                name: 'Website Redesign',
                status: 'active',
                department: 'Engineering'
            },
            {
                id: 'proj-002',
                name: 'Mobile App Development',
                status: 'active',
                department: 'Engineering'
            }
        ]);

        cy.seedTestData('taskCategories', [
            { name: 'Development', color: '#3498db' },
            { name: 'Testing', color: '#e74c3c' },
            { name: 'Documentation', color: '#f39c12' },
            { name: 'Review', color: '#9b59b6' }
        ]);
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Task Creation and Assignment', () => {
        it('should allow manager to create and assign task to employee', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            // Click new task button
            cy.get('[data-cy="new-task-button"]').click();
            cy.get('[data-cy="task-creation-form"]').should('be.visible');

            // Fill task creation form
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

            cy.fillForm({
                'task-title': 'Implement user authentication module',
                'task-description': 'Create secure login and registration functionality with JWT tokens',
                'assigned-to': 'Test Employee',
                'project': 'Website Redesign',
                'category': 'Development',
                'priority': 'High',
                'due-date': dueDate.toISOString().split('T')[0],
                'estimated-hours': '16',
                'tags': ['authentication', 'security', 'backend']
            });

            // Submit task
            cy.submitForm('[data-cy="task-creation-form"]');

            cy.expectSuccessMessage('Task created and assigned successfully');

            // Verify task appears in task list
            cy.get('[data-cy="tasks-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-title"]').should('contain.text', 'Implement user authentication module');
                cy.get('[data-cy="assigned-to"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="task-status"]').should('contain.text', 'Assigned');
                cy.get('[data-cy="task-priority"]').should('contain.text', 'High');
            });
        });

        it('should validate task creation form fields', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="new-task-button"]').click();

            // Try to submit empty form
            cy.submitForm('[data-cy="task-creation-form"]');

            // Verify validation errors
            cy.get('[data-cy="task-title-error"]').should('be.visible');
            cy.get('[data-cy="task-description-error"]').should('be.visible');
            cy.get('[data-cy="assigned-to-error"]').should('be.visible');
            cy.get('[data-cy="due-date-error"]').should('be.visible');
        });

        it('should not allow due date in the past', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="new-task-button"]').click();

            // Set due date to yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            cy.fillForm({
                'task-title': 'Test Task',
                'task-description': 'Test description',
                'assigned-to': 'Test Employee',
                'due-date': yesterday.toISOString().split('T')[0]
            });

            cy.submitForm('[data-cy="task-creation-form"]');

            cy.expectErrorMessage('Due date cannot be in the past');
        });

        it('should allow bulk task assignment', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            // Click bulk assignment button
            cy.get('[data-cy="bulk-assignment-button"]').click();
            cy.get('[data-cy="bulk-assignment-modal"]').should('be.visible');

            // Upload CSV file with task data
            cy.uploadFile('bulk-tasks.csv', '[data-cy="bulk-file-input"]');

            // Preview tasks
            cy.get('[data-cy="preview-tasks-button"]').click();
            cy.get('[data-cy="task-preview-table"]').should('be.visible');
            cy.get('[data-cy="preview-row"]').should('have.length.at.least', 1);

            // Confirm bulk assignment
            cy.get('[data-cy="confirm-bulk-assignment-button"]').click();

            cy.expectSuccessMessage('5 tasks created and assigned successfully');

            // Verify tasks appear in list
            cy.get('[data-cy="tasks-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 5);
        });

        it('should send notification to assigned employee', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="new-task-button"]').click();

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 3);

            cy.fillForm({
                'task-title': 'Code review for authentication module',
                'task-description': 'Review and provide feedback on authentication implementation',
                'assigned-to': 'Test Employee',
                'due-date': dueDate.toISOString().split('T')[0],
                'notify-assignee': true
            });

            cy.submitForm('[data-cy="task-creation-form"]');

            // Switch to employee account to verify notification
            cy.logout();
            cy.loginAsTenantUser('employee', 'testcompany');

            // Check notifications
            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'New task assigned');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Code review for authentication module');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Test Manager');
        });
    });

    describe('Task Management and Updates', () => {
        beforeEach(() => {
            // Create assigned task
            cy.seedTestData('task', {
                id: 'task-001',
                title: 'Implement user authentication module',
                description: 'Create secure login and registration functionality',
                assignedTo: 'employee-id-123',
                assignedBy: 'manager-id-123',
                assigneeName: 'Test Employee',
                assignerName: 'Test Manager',
                project: 'Website Redesign',
                category: 'Development',
                priority: 'High',
                status: 'assigned',
                dueDate: '2024-02-20',
                estimatedHours: 16,
                tags: ['authentication', 'security']
            });
        });

        it('should allow employee to view assigned tasks', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('tasks');

            // Verify assigned task is visible
            cy.get('[data-cy="my-tasks-tab"]').click();
            cy.get('[data-cy="tasks-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-title"]').should('contain.text', 'Implement user authentication module');
                cy.get('[data-cy="task-status"]').should('contain.text', 'Assigned');
                cy.get('[data-cy="task-priority"]').should('contain.text', 'High');
                cy.get('[data-cy="due-date"]').should('contain.text', '2024-02-20');
            });
        });

        it('should allow employee to start working on task', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="my-tasks-tab"]').click();

            // Start task
            cy.clickTableAction(0, 'start');

            cy.expectSuccessMessage('Task started successfully');

            // Verify status update
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-status"]').should('contain.text', 'In Progress');
                cy.get('[data-cy="start-time"]').should('be.visible');
            });

            // Verify task appears in active tasks section
            cy.get('[data-cy="active-tasks-section"]').should('be.visible');
            cy.get('[data-cy="active-task-item"]').should('contain.text', 'Implement user authentication module');
        });

        it('should allow employee to log time on task', () => {
            // Seed task in progress
            cy.seedTestData('task', {
                id: 'task-001',
                status: 'in_progress',
                startedAt: new Date().toISOString()
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="my-tasks-tab"]').click();

            // Click log time button
            cy.clickTableAction(0, 'log-time');

            cy.get('[data-cy="time-log-modal"]').should('be.visible');
            cy.fillForm({
                'hours-worked': '4',
                'work-description': 'Implemented JWT token generation and validation',
                'completion-percentage': '25'
            });

            cy.get('[data-cy="log-time-button"]').click();

            cy.expectSuccessMessage('Time logged successfully');

            // Verify time log appears
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="logged-hours"]').should('contain.text', '4.0');
                cy.get('[data-cy="completion-percentage"]').should('contain.text', '25%');
            });
        });

        it('should allow employee to add comments and updates', () => {
            cy.seedTestData('task', {
                id: 'task-001',
                status: 'in_progress'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="my-tasks-tab"]').click();

            // Click on task to view details
            cy.get('[data-cy="table-row"]').first().click();
            cy.get('[data-cy="task-details-modal"]').should('be.visible');

            // Add comment
            cy.get('[data-cy="add-comment-tab"]').click();
            cy.fillForm({
                'comment-text': 'Making good progress on the authentication module. JWT implementation is complete.'
            });

            cy.get('[data-cy="add-comment-button"]').click();

            cy.expectSuccessMessage('Comment added successfully');

            // Verify comment appears
            cy.get('[data-cy="comments-section"]').should('be.visible');
            cy.get('[data-cy="comment-item"]').should('contain.text', 'Making good progress');
            cy.get('[data-cy="comment-author"]').should('contain.text', 'Test Employee');
        });

        it('should allow employee to request task extension', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="my-tasks-tab"]').click();

            // Request extension
            cy.clickTableAction(0, 'request-extension');

            cy.get('[data-cy="extension-request-modal"]').should('be.visible');
            cy.fillForm({
                'new-due-date': '2024-02-25',
                'extension-reason': 'Additional requirements discovered during implementation',
                'additional-hours': '8'
            });

            cy.get('[data-cy="submit-extension-request-button"]').click();

            cy.expectSuccessMessage('Extension request submitted successfully');

            // Verify extension request status
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="extension-requested-badge"]').should('be.visible');
            });
        });
    });

    describe('Task Completion and Review', () => {
        beforeEach(() => {
            // Create task in progress
            cy.seedTestData('task', {
                id: 'task-001',
                title: 'Implement user authentication module',
                assignedTo: 'employee-id-123',
                assignedBy: 'manager-id-123',
                status: 'in_progress',
                loggedHours: 14,
                estimatedHours: 16,
                completionPercentage: 90
            });
        });

        it('should allow employee to mark task as completed', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="my-tasks-tab"]').click();

            // Mark as completed
            cy.clickTableAction(0, 'complete');

            cy.get('[data-cy="task-completion-modal"]').should('be.visible');
            cy.fillForm({
                'completion-notes': 'Authentication module implemented with JWT tokens, password hashing, and session management',
                'final-hours': '16',
                'deliverables': 'Login/register endpoints, middleware, tests'
            });

            cy.get('[data-cy="mark-complete-button"]').click();

            cy.expectSuccessMessage('Task marked as completed');

            // Verify status update
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-status"]').should('contain.text', 'Completed');
                cy.get('[data-cy="completion-date"]').should('be.visible');
            });
        });

        it('should require manager review for completed tasks', () => {
            // Seed completed task pending review
            cy.seedTestData('task', {
                id: 'task-001',
                status: 'completed_pending_review',
                completedAt: new Date().toISOString(),
                completionNotes: 'Authentication module completed',
                finalHours: 16
            });

            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            // Navigate to review tab
            cy.get('[data-cy="pending-review-tab"]').click();

            // Verify task appears for review
            cy.get('[data-cy="review-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-title"]').should('contain.text', 'Implement user authentication module');
                cy.get('[data-cy="task-status"]').should('contain.text', 'Pending Review');
            });
        });

        it('should allow manager to approve completed task', () => {
            cy.seedTestData('task', {
                id: 'task-001',
                status: 'completed_pending_review',
                completedAt: new Date().toISOString(),
                completionNotes: 'Authentication module completed'
            });

            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="pending-review-tab"]').click();

            // Approve task
            cy.clickTableAction(0, 'approve');

            cy.get('[data-cy="task-approval-modal"]').should('be.visible');
            cy.fillForm({
                'review-comments': 'Excellent work! Authentication module meets all requirements.',
                'quality-rating': '5'
            });

            cy.get('[data-cy="approve-task-button"]').click();

            cy.expectSuccessMessage('Task approved successfully');

            // Verify task moves to approved section
            cy.get('[data-cy="approved-tasks-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-status"]').should('contain.text', 'Approved');
                cy.get('[data-cy="quality-rating"]').should('contain.text', '5/5');
            });
        });

        it('should allow manager to request revisions', () => {
            cy.seedTestData('task', {
                id: 'task-001',
                status: 'completed_pending_review'
            });

            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="pending-review-tab"]').click();

            // Request revisions
            cy.clickTableAction(0, 'request-revisions');

            cy.get('[data-cy="revision-request-modal"]').should('be.visible');
            cy.fillForm({
                'revision-comments': 'Please add input validation and improve error handling',
                'revision-priority': 'Medium',
                'revision-due-date': '2024-02-22'
            });

            cy.get('[data-cy="request-revisions-button"]').click();

            cy.expectSuccessMessage('Revision request sent successfully');

            // Verify task status update
            cy.get('[data-cy="revision-requested-tab"]').click();
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-status"]').should('contain.text', 'Revision Requested');
            });
        });

        it('should send notification to employee after review', () => {
            cy.seedTestData('task', {
                id: 'task-001',
                status: 'completed_pending_review'
            });

            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="pending-review-tab"]').click();
            cy.clickTableAction(0, 'approve');

            cy.get('[data-cy="task-approval-modal"]').should('be.visible');
            cy.fillForm({ 'review-comments': 'Great work!' });
            cy.get('[data-cy="approve-task-button"]').click();

            // Switch to employee account to verify notification
            cy.logout();
            cy.loginAsTenantUser('employee', 'testcompany');

            // Check notifications
            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Task approved');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Test Manager');
        });
    });

    describe('Task Reports and Analytics', () => {
        beforeEach(() => {
            // Seed multiple tasks for reporting
            cy.seedTestData('task', [
                {
                    id: 'task-001',
                    title: 'Authentication Module',
                    assignedTo: 'employee-id-123',
                    status: 'approved',
                    estimatedHours: 16,
                    loggedHours: 18,
                    completedAt: '2024-01-15T10:00:00Z',
                    category: 'Development'
                },
                {
                    id: 'task-002',
                    title: 'API Testing',
                    assignedTo: 'employee-id-123',
                    status: 'approved',
                    estimatedHours: 8,
                    loggedHours: 6,
                    completedAt: '2024-01-20T15:00:00Z',
                    category: 'Testing'
                },
                {
                    id: 'task-003',
                    title: 'Documentation Update',
                    assignedTo: 'employee-id-123',
                    status: 'in_progress',
                    estimatedHours: 4,
                    loggedHours: 2,
                    category: 'Documentation'
                }
            ]);
        });

        it('should display task completion reports for managers', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('reports');

            // Navigate to task reports
            cy.get('[data-cy="task-reports-tab"]').click();

            // Verify team task summary
            cy.get('[data-cy="team-task-summary"]').should('be.visible');
            cy.get('[data-cy="total-tasks-completed"]').should('contain.text', '2');
            cy.get('[data-cy="total-hours-logged"]').should('contain.text', '24'); // 18 + 6
            cy.get('[data-cy="average-completion-time"]').should('be.visible');

            // Verify individual employee performance
            cy.get('[data-cy="employee-task-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length.at.least', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="completed-tasks"]').should('contain.text', '2');
                cy.get('[data-cy="in-progress-tasks"]').should('contain.text', '1');
            });
        });

        it('should show task productivity analytics', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('analytics');

            // Navigate to productivity analytics
            cy.get('[data-cy="productivity-analytics-tab"]').click();

            // Verify productivity metrics
            cy.get('[data-cy="productivity-charts"]').should('be.visible');
            cy.get('[data-cy="estimated-vs-actual-chart"]').should('be.visible');
            cy.get('[data-cy="task-category-breakdown"]').should('be.visible');
            cy.get('[data-cy="completion-rate-trend"]').should('be.visible');

            // Verify key performance indicators
            cy.get('[data-cy="estimation-accuracy"]').should('be.visible');
            cy.get('[data-cy="average-task-duration"]').should('be.visible');
            cy.get('[data-cy="on-time-completion-rate"]').should('be.visible');
        });

        it('should allow filtering reports by date range and category', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('reports');

            cy.get('[data-cy="task-reports-tab"]').click();

            // Apply filters
            cy.get('[data-cy="date-filter-from"]').type('2024-01-15');
            cy.get('[data-cy="date-filter-to"]').type('2024-01-15');
            cy.get('[data-cy="category-filter"]').select('Development');
            cy.get('[data-cy="apply-filter-button"]').click();

            // Verify filtered results
            cy.get('[data-cy="filtered-results"]').should('be.visible');
            cy.get('[data-cy="total-tasks-completed"]').should('contain.text', '1');
        });

        it('should display employee task dashboard', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('tasks');

            // Navigate to dashboard tab
            cy.get('[data-cy="task-dashboard-tab"]').click();

            // Verify personal task metrics
            cy.get('[data-cy="personal-task-summary"]').should('be.visible');
            cy.get('[data-cy="my-completed-tasks"]').should('contain.text', '2');
            cy.get('[data-cy="my-active-tasks"]').should('contain.text', '1');
            cy.get('[data-cy="my-total-hours"]').should('contain.text', '26'); // 18 + 6 + 2

            // Verify task progress charts
            cy.get('[data-cy="task-progress-chart"]').should('be.visible');
            cy.get('[data-cy="category-distribution"]').should('be.visible');
            cy.get('[data-cy="weekly-productivity"]').should('be.visible');
        });
    });

    describe('Task Collaboration and Dependencies', () => {
        it('should allow setting task dependencies', () => {
            // Seed prerequisite task
            cy.seedTestData('task', {
                id: 'task-prereq',
                title: 'Database Schema Design',
                status: 'approved'
            });

            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="new-task-button"]').click();

            // Create task with dependency
            cy.fillForm({
                'task-title': 'User Registration Implementation',
                'task-description': 'Implement user registration based on approved schema',
                'assigned-to': 'Test Employee',
                'dependencies': ['Database Schema Design']
            });

            cy.submitForm('[data-cy="task-creation-form"]');

            cy.expectSuccessMessage('Task created with dependencies');

            // Verify dependency is shown
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="dependency-badge"]').should('be.visible');
                cy.get('[data-cy="dependency-count"]').should('contain.text', '1');
            });
        });

        it('should prevent starting tasks with incomplete dependencies', () => {
            // Seed task with incomplete dependency
            cy.seedTestData('task', [
                {
                    id: 'task-prereq',
                    title: 'Database Schema Design',
                    status: 'in_progress'
                },
                {
                    id: 'task-dependent',
                    title: 'User Registration Implementation',
                    assignedTo: 'employee-id-123',
                    status: 'assigned',
                    dependencies: ['task-prereq']
                }
            ]);

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="my-tasks-tab"]').click();

            // Try to start task with incomplete dependency
            cy.clickTableAction(0, 'start');

            cy.expectErrorMessage('Cannot start task: dependency "Database Schema Design" is not completed');

            // Verify task remains in assigned status
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="task-status"]').should('contain.text', 'Assigned');
            });
        });

        it('should allow task collaboration and mentions', () => {
            cy.seedTestData('task', {
                id: 'task-001',
                status: 'in_progress',
                assignedTo: 'employee-id-123'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('tasks');

            cy.get('[data-cy="my-tasks-tab"]').click();

            // Open task details
            cy.get('[data-cy="table-row"]').first().click();
            cy.get('[data-cy="task-details-modal"]').should('be.visible');

            // Add comment with mention
            cy.get('[data-cy="add-comment-tab"]').click();
            cy.fillForm({
                'comment-text': 'Need help with authentication logic. @Test Manager can you review the approach?'
            });

            cy.get('[data-cy="add-comment-button"]').click();

            cy.expectSuccessMessage('Comment added and notification sent');

            // Verify mention notification is sent
            cy.logout();
            cy.loginAsTenantUser('manager', 'testcompany');

            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'mentioned you in a task');
        });
    });
});