/**
 * E2E Tests for Vacation Balance Tracking and Updates
 * Tests vacation balance management, accrual, and tracking workflows
 */

describe('Vacation Balance Tracking and Updates', () => {
    beforeEach(() => {
        // Clean up and seed test data
        cy.cleanupTestData();

        // Seed employee, manager, and HR users
        cy.seedTestData('user', [
            {
                email: 'employee@testcompany.com',
                name: 'Test Employee',
                role: 'employee',
                managerId: 'manager-id-123',
                department: 'Engineering',
                startDate: '2023-01-01', // 1+ year tenure
                employmentType: 'full-time'
            },
            {
                email: 'manager@testcompany.com',
                name: 'Test Manager',
                role: 'manager',
                department: 'Engineering'
            },
            {
                email: 'hr@testcompany.com',
                name: 'HR Manager',
                role: 'hr',
                department: 'Human Resources'
            }
        ]);

        // Seed vacation policies and balances
        cy.seedTestData('vacationPolicy', {
            tenantId: 'testcompany',
            policies: [
                {
                    name: 'Annual Leave',
                    type: 'annual',
                    accrualRate: 2.0, // 2 days per month
                    maxBalance: 30,
                    carryOverLimit: 5,
                    probationPeriod: 90, // days
                    eligibleEmploymentTypes: ['full-time', 'part-time']
                },
                {
                    name: 'Sick Leave',
                    type: 'sick',
                    accrualRate: 1.0, // 1 day per month
                    maxBalance: 15,
                    carryOverLimit: 10,
                    probationPeriod: 0
                },
                {
                    name: 'Personal Leave',
                    type: 'personal',
                    accrualRate: 0.5, // 0.5 days per month
                    maxBalance: 8,
                    carryOverLimit: 2,
                    probationPeriod: 180
                }
            ]
        });

        // Seed current vacation balances
        cy.seedTestData('vacationBalance', {
            employeeId: 'employee-id-123',
            balances: [
                {
                    leaveType: 'Annual Leave',
                    currentBalance: 18.5,
                    accrued: 24.0,
                    used: 5.5,
                    pending: 2.0,
                    available: 16.5, // current - pending
                    lastAccrualDate: '2024-01-31'
                },
                {
                    leaveType: 'Sick Leave',
                    currentBalance: 8.0,
                    accrued: 12.0,
                    used: 4.0,
                    pending: 0,
                    available: 8.0,
                    lastAccrualDate: '2024-01-31'
                },
                {
                    leaveType: 'Personal Leave',
                    currentBalance: 3.5,
                    accrued: 6.0,
                    used: 2.5,
                    pending: 1.0,
                    available: 2.5,
                    lastAccrualDate: '2024-01-31'
                }
            ]
        });
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Vacation Balance Display', () => {
        it('should display current vacation balances for employee', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Verify balance cards are visible
            cy.get('[data-cy="vacation-balance-section"]').should('be.visible');
            cy.get('[data-cy="balance-card"]').should('have.length', 3);

            // Verify Annual Leave balance
            cy.get('[data-cy="balance-card-annual-leave"]').within(() => {
                cy.get('[data-cy="leave-type"]').should('contain.text', 'Annual Leave');
                cy.get('[data-cy="current-balance"]').should('contain.text', '18.5');
                cy.get('[data-cy="available-balance"]').should('contain.text', '16.5');
                cy.get('[data-cy="pending-requests"]').should('contain.text', '2.0');
                cy.get('[data-cy="used-this-year"]').should('contain.text', '5.5');
            });

            // Verify Sick Leave balance
            cy.get('[data-cy="balance-card-sick-leave"]').within(() => {
                cy.get('[data-cy="leave-type"]').should('contain.text', 'Sick Leave');
                cy.get('[data-cy="current-balance"]').should('contain.text', '8.0');
                cy.get('[data-cy="available-balance"]').should('contain.text', '8.0');
            });

            // Verify Personal Leave balance
            cy.get('[data-cy="balance-card-personal-leave"]').within(() => {
                cy.get('[data-cy="leave-type"]').should('contain.text', 'Personal Leave');
                cy.get('[data-cy="current-balance"]').should('contain.text', '3.5');
                cy.get('[data-cy="available-balance"]').should('contain.text', '2.5');
            });
        });

        it('should show balance breakdown and accrual information', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Click on balance card to view details
            cy.get('[data-cy="balance-card-annual-leave"]').click();
            cy.get('[data-cy="balance-details-modal"]').should('be.visible');

            // Verify detailed balance information
            cy.get('[data-cy="balance-breakdown"]').should('be.visible');
            cy.get('[data-cy="total-accrued"]').should('contain.text', '24.0 days');
            cy.get('[data-cy="total-used"]').should('contain.text', '5.5 days');
            cy.get('[data-cy="pending-requests"]').should('contain.text', '2.0 days');
            cy.get('[data-cy="current-balance"]').should('contain.text', '18.5 days');

            // Verify accrual information
            cy.get('[data-cy="accrual-info"]').should('be.visible');
            cy.get('[data-cy="accrual-rate"]').should('contain.text', '2.0 days per month');
            cy.get('[data-cy="next-accrual-date"]').should('be.visible');
            cy.get('[data-cy="last-accrual-date"]').should('contain.text', '2024-01-31');
        });

        it('should display balance history and transactions', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            cy.get('[data-cy="balance-card-annual-leave"]').click();
            cy.get('[data-cy="balance-details-modal"]').should('be.visible');

            // Navigate to balance history tab
            cy.get('[data-cy="balance-history-tab"]').click();

            // Verify balance transaction history
            cy.get('[data-cy="balance-history-table"]').should('be.visible');
            cy.get('[data-cy="transaction-row"]').should('have.length.at.least', 1);

            // Verify transaction details
            cy.get('[data-cy="transaction-row"]').first().within(() => {
                cy.get('[data-cy="transaction-date"]').should('be.visible');
                cy.get('[data-cy="transaction-type"]').should('be.visible'); // Accrual, Used, Adjustment
                cy.get('[data-cy="transaction-amount"]').should('be.visible');
                cy.get('[data-cy="balance-after"]').should('be.visible');
                cy.get('[data-cy="transaction-description"]').should('be.visible');
            });
        });

        it('should show balance warnings and alerts', () => {
            // Seed low balance scenario
            cy.seedTestData('vacationBalance', {
                employeeId: 'employee-id-123',
                balances: [
                    {
                        leaveType: 'Annual Leave',
                        currentBalance: 2.0, // Low balance
                        available: 2.0
                    }
                ]
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Verify low balance warning
            cy.get('[data-cy="balance-card-annual-leave"]').within(() => {
                cy.get('[data-cy="low-balance-warning"]').should('be.visible');
                cy.get('[data-cy="warning-message"]').should('contain.text', 'Low balance');
            });

            // Verify balance alert in notifications
            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Annual Leave balance is low');
        });
    });

    describe('Balance Accrual and Updates', () => {
        it('should automatically accrue vacation balances monthly', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('hr-admin');

            // Navigate to balance management
            cy.get('[data-cy="balance-management-tab"]').click();

            // Trigger monthly accrual process
            cy.get('[data-cy="run-accrual-button"]').click();
            cy.get('[data-cy="accrual-confirmation-modal"]').should('be.visible');

            cy.fillForm({
                'accrual-period': 'February 2024',
                'include-all-employees': true
            });

            cy.get('[data-cy="confirm-accrual-button"]').click();

            cy.expectSuccessMessage('Monthly accrual processed successfully');

            // Verify accrual results
            cy.get('[data-cy="accrual-results-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length.at.least', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="annual-leave-accrued"]').should('contain.text', '2.0');
                cy.get('[data-cy="sick-leave-accrued"]').should('contain.text', '1.0');
                cy.get('[data-cy="personal-leave-accrued"]').should('contain.text', '0.5');
            });
        });

        it('should handle balance adjustments by HR', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('hr-admin');

            cy.get('[data-cy="balance-management-tab"]').click();

            // Search for employee
            cy.get('[data-cy="employee-search"]').type('Test Employee');
            cy.get('[data-cy="search-button"]').click();

            // Select employee and adjust balance
            cy.get('[data-cy="employee-row"]').first().within(() => {
                cy.get('[data-cy="adjust-balance-button"]').click();
            });

            cy.get('[data-cy="balance-adjustment-modal"]').should('be.visible');
            cy.fillForm({
                'leave-type': 'Annual Leave',
                'adjustment-type': 'add',
                'adjustment-amount': '5.0',
                'adjustment-reason': 'Bonus vacation days for exceptional performance',
                'effective-date': new Date().toISOString().split('T')[0]
            });

            cy.get('[data-cy="apply-adjustment-button"]').click();

            cy.expectSuccessMessage('Balance adjustment applied successfully');

            // Verify adjustment is recorded
            cy.get('[data-cy="adjustment-history-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="adjustment-amount"]').should('contain.text', '+5.0');
                cy.get('[data-cy="adjustment-reason"]').should('contain.text', 'exceptional performance');
            });
        });

        it('should update balances when leave requests are approved', () => {
            // Seed pending leave request
            cy.seedTestData('leaveRequest', {
                employeeId: 'employee-id-123',
                employeeName: 'Test Employee',
                leaveType: 'Annual Leave',
                startDate: '2024-02-20',
                endDate: '2024-02-22',
                days: 3,
                status: 'pending_manager_approval'
            });

            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('approvals');

            // Approve leave request
            cy.get('[data-cy="leave-approvals-tab"]').click();
            cy.clickTableAction(0, 'approve');

            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.get('[data-cy="confirm-approval-button"]').click();

            cy.expectSuccessMessage('Leave request approved successfully');

            // Switch to employee to verify balance update
            cy.logout();
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Verify balance is updated
            cy.get('[data-cy="balance-card-annual-leave"]').within(() => {
                cy.get('[data-cy="pending-requests"]').should('contain.text', '0'); // No longer pending
                cy.get('[data-cy="available-balance"]').should('contain.text', '15.5'); // 18.5 - 3 = 15.5
            });
        });

        it('should restore balances when leave requests are cancelled', () => {
            // Seed approved leave request
            cy.seedTestData('leaveRequest', {
                employeeId: 'employee-id-123',
                leaveType: 'Annual Leave',
                startDate: '2024-02-25',
                endDate: '2024-02-27',
                days: 3,
                status: 'approved'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Cancel approved leave request
            cy.get('[data-cy="leave-requests-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="cancel-request-button"]').click();
            });

            cy.get('[data-cy="cancellation-modal"]').should('be.visible');
            cy.fillForm({
                'cancellation-reason': 'Plans changed - no longer need time off'
            });

            cy.get('[data-cy="confirm-cancellation-button"]').click();

            cy.expectSuccessMessage('Leave request cancelled and balance restored');

            // Verify balance is restored
            cy.get('[data-cy="balance-card-annual-leave"]').within(() => {
                cy.get('[data-cy="current-balance"]').should('contain.text', '21.5'); // 18.5 + 3 = 21.5
                cy.get('[data-cy="available-balance"]').should('contain.text', '19.5'); // 16.5 + 3 = 19.5
            });
        });
    });

    describe('Balance Policy Enforcement', () => {
        it('should enforce maximum balance limits', () => {
            // Seed employee at maximum balance
            cy.seedTestData('vacationBalance', {
                employeeId: 'employee-id-123',
                balances: [
                    {
                        leaveType: 'Annual Leave',
                        currentBalance: 30.0, // At maximum
                        maxBalance: 30.0
                    }
                ]
            });

            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('hr-admin');

            cy.get('[data-cy="balance-management-tab"]').click();

            // Try to run accrual for employee at max balance
            cy.get('[data-cy="run-accrual-button"]').click();
            cy.get('[data-cy="confirm-accrual-button"]').click();

            // Verify max balance warning
            cy.get('[data-cy="accrual-warnings"]').should('be.visible');
            cy.get('[data-cy="max-balance-warning"]').should('contain.text', 'Test Employee has reached maximum Annual Leave balance');

            // Verify balance remains at maximum
            cy.get('[data-cy="accrual-results-table"]').within(() => {
                cy.get('[data-cy="table-row"]').first().within(() => {
                    cy.get('[data-cy="annual-leave-balance"]').should('contain.text', '30.0');
                    cy.get('[data-cy="max-balance-indicator"]').should('be.visible');
                });
            });
        });

        it('should handle year-end carry over limits', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('hr-admin');

            // Navigate to year-end processing
            cy.get('[data-cy="year-end-processing-tab"]').click();

            // Run year-end carry over process
            cy.get('[data-cy="run-carry-over-button"]').click();
            cy.get('[data-cy="carry-over-modal"]').should('be.visible');

            cy.fillForm({
                'carry-over-year': '2024',
                'apply-carry-over-limits': true
            });

            cy.get('[data-cy="process-carry-over-button"]').click();

            cy.expectSuccessMessage('Year-end carry over processed successfully');

            // Verify carry over results
            cy.get('[data-cy="carry-over-results-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="annual-leave-carried"]').should('contain.text', '5.0'); // Limited by carry over limit
                cy.get('[data-cy="annual-leave-forfeited"]').should('contain.text', '13.5'); // 18.5 - 5.0
            });
        });

        it('should enforce probation period restrictions', () => {
            // Seed new employee still in probation
            cy.seedTestData('user', {
                email: 'newemployee@testcompany.com',
                name: 'New Employee',
                role: 'employee',
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
                employmentType: 'full-time'
            });

            cy.loginAsTenantUser('newemployee', 'testcompany');
            cy.navigateToModule('leave');

            // Verify probation restrictions
            cy.get('[data-cy="probation-notice"]').should('be.visible');
            cy.get('[data-cy="probation-message"]').should('contain.text', 'You are currently in probation period');

            // Verify limited leave types available
            cy.get('[data-cy="balance-card-annual-leave"]').within(() => {
                cy.get('[data-cy="probation-restricted"]').should('be.visible');
                cy.get('[data-cy="available-balance"]').should('contain.text', '0.0');
            });

            // Verify sick leave is available (no probation period)
            cy.get('[data-cy="balance-card-sick-leave"]').within(() => {
                cy.get('[data-cy="probation-restricted"]').should('not.exist');
                cy.get('[data-cy="available-balance"]').should('not.contain.text', '0.0');
            });
        });

        it('should handle different employment types', () => {
            // Seed part-time employee
            cy.seedTestData('user', {
                email: 'parttime@testcompany.com',
                name: 'Part Time Employee',
                role: 'employee',
                employmentType: 'part-time',
                workingHours: 20 // 20 hours per week
            });

            cy.seedTestData('vacationBalance', {
                employeeId: 'parttime-id-123',
                balances: [
                    {
                        leaveType: 'Annual Leave',
                        currentBalance: 9.25, // Pro-rated for part-time
                        accrualRate: 1.0 // 50% of full-time rate
                    }
                ]
            });

            cy.loginAsTenantUser('parttime', 'testcompany');
            cy.navigateToModule('leave');

            // Verify pro-rated balance
            cy.get('[data-cy="balance-card-annual-leave"]').within(() => {
                cy.get('[data-cy="current-balance"]').should('contain.text', '9.25');
                cy.get('[data-cy="employment-type-indicator"]').should('contain.text', 'Part-time');
            });

            // Verify pro-rated accrual information
            cy.get('[data-cy="balance-card-annual-leave"]').click();
            cy.get('[data-cy="balance-details-modal"]').should('be.visible');
            cy.get('[data-cy="accrual-rate"]').should('contain.text', '1.0 days per month');
            cy.get('[data-cy="pro-rated-notice"]').should('contain.text', 'Pro-rated for part-time employment');
        });
    });

    describe('Balance Reports and Analytics', () => {
        beforeEach(() => {
            // Seed multiple employees with different balance scenarios
            cy.seedTestData('vacationBalance', [
                {
                    employeeId: 'employee-id-123',
                    employeeName: 'Test Employee',
                    department: 'Engineering',
                    balances: [
                        { leaveType: 'Annual Leave', currentBalance: 18.5, used: 5.5 },
                        { leaveType: 'Sick Leave', currentBalance: 8.0, used: 4.0 }
                    ]
                },
                {
                    employeeId: 'employee-id-456',
                    employeeName: 'Another Employee',
                    department: 'Marketing',
                    balances: [
                        { leaveType: 'Annual Leave', currentBalance: 12.0, used: 12.0 },
                        { leaveType: 'Sick Leave', currentBalance: 6.5, used: 5.5 }
                    ]
                }
            ]);
        });

        it('should display balance reports for managers', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('reports');

            // Navigate to vacation balance reports
            cy.get('[data-cy="balance-reports-tab"]').click();

            // Verify team balance summary
            cy.get('[data-cy="team-balance-summary"]').should('be.visible');
            cy.get('[data-cy="total-team-balance"]').should('be.visible');
            cy.get('[data-cy="average-balance-per-employee"]').should('be.visible');
            cy.get('[data-cy="total-used-this-year"]').should('be.visible');

            // Verify individual employee balances
            cy.get('[data-cy="employee-balance-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length.at.least', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="annual-leave-balance"]').should('contain.text', '18.5');
                cy.get('[data-cy="sick-leave-balance"]').should('contain.text', '8.0');
            });
        });

        it('should show balance utilization analytics', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('analytics');

            // Navigate to balance analytics
            cy.get('[data-cy="balance-analytics-tab"]').click();

            // Verify analytics charts
            cy.get('[data-cy="balance-utilization-chart"]').should('be.visible');
            cy.get('[data-cy="department-balance-comparison"]').should('be.visible');
            cy.get('[data-cy="balance-trends-chart"]').should('be.visible');

            // Verify key metrics
            cy.get('[data-cy="company-wide-utilization"]').should('be.visible');
            cy.get('[data-cy="high-balance-employees"]').should('be.visible');
            cy.get('[data-cy="low-balance-employees"]').should('be.visible');
        });

        it('should allow filtering balance reports by department and date', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('reports');

            cy.get('[data-cy="balance-reports-tab"]').click();

            // Apply filters
            cy.get('[data-cy="department-filter"]').select('Engineering');
            cy.get('[data-cy="date-filter-from"]').type('2024-01-01');
            cy.get('[data-cy="date-filter-to"]').type('2024-12-31');
            cy.get('[data-cy="apply-filter-button"]').click();

            // Verify filtered results
            cy.get('[data-cy="filtered-results"]').should('be.visible');
            cy.get('[data-cy="employee-balance-table"]').within(() => {
                cy.get('[data-cy="table-row"]').should('have.length', 1);
                cy.get('[data-cy="table-row"]').first().within(() => {
                    cy.get('[data-cy="department"]').should('contain.text', 'Engineering');
                });
            });
        });

        it('should generate balance forecast reports', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('reports');

            cy.get('[data-cy="balance-reports-tab"]').click();

            // Generate forecast report
            cy.get('[data-cy="forecast-report-button"]').click();
            cy.get('[data-cy="forecast-modal"]').should('be.visible');

            cy.fillForm({
                'forecast-period': '6-months',
                'include-planned-leave': true,
                'include-accrual-projections': true
            });

            cy.get('[data-cy="generate-forecast-button"]').click();

            cy.expectSuccessMessage('Balance forecast generated successfully');

            // Verify forecast results
            cy.get('[data-cy="forecast-results"]').should('be.visible');
            cy.get('[data-cy="projected-balances-chart"]').should('be.visible');
            cy.get('[data-cy="forecast-summary-table"]').should('be.visible');
        });

        it('should identify employees at risk of losing vacation days', () => {
            // Seed employee with high balance near year-end
            cy.seedTestData('vacationBalance', {
                employeeId: 'high-balance-employee',
                employeeName: 'High Balance Employee',
                balances: [
                    {
                        leaveType: 'Annual Leave',
                        currentBalance: 28.0, // Close to max of 30
                        maxBalance: 30.0,
                        carryOverLimit: 5.0
                    }
                ]
            });

            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('analytics');

            cy.get('[data-cy="balance-analytics-tab"]').click();

            // Verify at-risk employees section
            cy.get('[data-cy="at-risk-employees"]').should('be.visible');
            cy.get('[data-cy="at-risk-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="employee-name"]').should('contain.text', 'High Balance Employee');
                cy.get('[data-cy="risk-level"]').should('contain.text', 'High');
                cy.get('[data-cy="days-at-risk"]').should('contain.text', '23.0'); // 28 - 5 carry over limit
            });

            // Verify recommendations
            cy.get('[data-cy="recommendations-section"]').should('be.visible');
            cy.get('[data-cy="recommendation-item"]').should('contain.text', 'Encourage High Balance Employee to take vacation');
        });
    });

    describe('Balance Notifications and Alerts', () => {
        it('should send low balance notifications', () => {
            // Seed employee with low balance
            cy.seedTestData('vacationBalance', {
                employeeId: 'employee-id-123',
                balances: [
                    {
                        leaveType: 'Annual Leave',
                        currentBalance: 1.5, // Very low balance
                        available: 1.5
                    }
                ]
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Verify low balance notification
            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Your Annual Leave balance is low');
            cy.get('[data-cy="notification-item"]').should('contain.text', '1.5 days remaining');
        });

        it('should send accrual notifications', () => {
            cy.loginAsTenantUser('employee', 'testcompany');

            // Mock accrual notification
            cy.intercept('GET', '**/notifications', {
                statusCode: 200,
                body: {
                    notifications: [
                        {
                            id: 'accrual-001',
                            type: 'balance_accrual',
                            title: 'Vacation Balance Updated',
                            message: 'Your February vacation balance has been updated. Annual Leave: +2.0 days',
                            timestamp: new Date().toISOString(),
                            read: false
                        }
                    ]
                }
            }).as('getNotifications');

            cy.navigateToModule('leave');

            // Check notifications
            cy.get('[data-cy="notifications-bell"]').click();
            cy.wait('@getNotifications');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Vacation Balance Updated');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Annual Leave: +2.0 days');
        });

        it('should send year-end balance warnings', () => {
            // Mock year-end scenario (November/December)
            cy.clock(new Date(2024, 10, 15).getTime()); // November 15, 2024

            cy.seedTestData('vacationBalance', {
                employeeId: 'employee-id-123',
                balances: [
                    {
                        leaveType: 'Annual Leave',
                        currentBalance: 25.0,
                        carryOverLimit: 5.0
                    }
                ]
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('leave');

            // Verify year-end warning
            cy.get('[data-cy="year-end-warning"]').should('be.visible');
            cy.get('[data-cy="warning-message"]').should('contain.text', 'You may lose 20.0 days of Annual Leave');
            cy.get('[data-cy="use-vacation-reminder"]').should('be.visible');

            // Check notification
            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Year-end vacation reminder');
        });

        it('should send manager notifications for team balance issues', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('dashboard');

            // Mock manager notification for team member with high balance
            cy.intercept('GET', '**/notifications', {
                statusCode: 200,
                body: {
                    notifications: [
                        {
                            id: 'manager-001',
                            type: 'team_balance_alert',
                            title: 'Team Member Balance Alert',
                            message: 'Test Employee has a high vacation balance (25.0 days) and may lose days at year-end',
                            timestamp: new Date().toISOString(),
                            read: false
                        }
                    ]
                }
            }).as('getManagerNotifications');

            // Check notifications
            cy.get('[data-cy="notifications-bell"]').click();
            cy.wait('@getManagerNotifications');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Team Member Balance Alert');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Test Employee has a high vacation balance');
        });
    });
});