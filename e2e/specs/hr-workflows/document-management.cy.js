/**
 * E2E Tests for Document Upload and Access
 * Tests document management, upload, and access control workflows
 */

describe('Document Management', () => {
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
                department: 'Engineering'
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

        // Seed document categories and policies
        cy.seedTestData('documentCategories', [
            { name: 'Personal Documents', accessLevel: 'employee', maxFileSize: '10MB' },
            { name: 'HR Documents', accessLevel: 'hr', maxFileSize: '50MB' },
            { name: 'Project Documents', accessLevel: 'team', maxFileSize: '100MB' },
            { name: 'Company Policies', accessLevel: 'public', maxFileSize: '25MB' }
        ]);

        cy.seedTestData('tenant', {
            domain: 'testcompany',
            settings: {
                documentPolicy: {
                    allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png'],
                    maxFileSize: '50MB',
                    virusScanEnabled: true,
                    retentionPeriod: 2555, // 7 years in days
                    encryptionEnabled: true
                }
            }
        });
    });

    afterEach(() => {
        cy.cleanupAfterTest();
    });

    describe('Document Upload', () => {
        it('should allow employee to upload personal documents', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Click upload document button
            cy.get('[data-cy="upload-document-button"]').click();
            cy.get('[data-cy="document-upload-modal"]').should('be.visible');

            // Fill document upload form
            cy.fillForm({
                'document-title': 'Employee ID Card',
                'document-description': 'Copy of government-issued employee identification',
                'document-category': 'Personal Documents',
                'access-level': 'Private',
                'tags': ['identification', 'personal', 'official']
            });

            // Upload file
            cy.uploadFile('employee-id.pdf', '[data-cy="file-input"]');

            // Submit upload
            cy.get('[data-cy="upload-button"]').click();

            cy.expectSuccessMessage('Document uploaded successfully');

            // Verify document appears in list
            cy.get('[data-cy="documents-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="document-title"]').should('contain.text', 'Employee ID Card');
                cy.get('[data-cy="document-category"]').should('contain.text', 'Personal Documents');
                cy.get('[data-cy="upload-status"]').should('contain.text', 'Uploaded');
                cy.get('[data-cy="file-size"]').should('be.visible');
            });
        });

        it('should validate document upload form fields', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            cy.get('[data-cy="upload-document-button"]').click();

            // Try to submit empty form
            cy.get('[data-cy="upload-button"]').click();

            // Verify validation errors
            cy.get('[data-cy="document-title-error"]').should('be.visible');
            cy.get('[data-cy="document-category-error"]').should('be.visible');
            cy.get('[data-cy="file-input-error"]').should('be.visible');
        });

        it('should validate file type restrictions', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            cy.get('[data-cy="upload-document-button"]').click();

            // Try to upload unsupported file type
            cy.uploadFile('malicious-file.exe', '[data-cy="file-input"]');

            cy.expectErrorMessage('File type .exe is not allowed. Supported types: .pdf, .doc, .docx, .txt, .jpg, .png');
            cy.get('[data-cy="upload-button"]').should('be.disabled');
        });

        it('should validate file size limits', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            cy.get('[data-cy="upload-document-button"]').click();

            // Mock large file upload
            cy.intercept('POST', '**/documents/upload', {
                statusCode: 413,
                body: { error: 'File size exceeds limit of 50MB' }
            }).as('largeFileUpload');

            cy.fillForm({
                'document-title': 'Large Document',
                'document-category': 'Personal Documents'
            });

            cy.uploadFile('large-document.pdf', '[data-cy="file-input"]');
            cy.get('[data-cy="upload-button"]').click();

            cy.wait('@largeFileUpload');
            cy.expectErrorMessage('File size exceeds limit of 50MB');
        });

        it('should show virus scan results', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            cy.get('[data-cy="upload-document-button"]').click();

            cy.fillForm({
                'document-title': 'Clean Document',
                'document-category': 'Personal Documents'
            });

            cy.uploadFile('clean-document.pdf', '[data-cy="file-input"]');
            cy.get('[data-cy="upload-button"]').click();

            // Verify virus scan status
            cy.get('[data-cy="virus-scan-status"]').should('be.visible');
            cy.get('[data-cy="scan-progress"]').should('be.visible');

            // Wait for scan completion
            cy.get('[data-cy="scan-complete"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-cy="scan-result"]').should('contain.text', 'Clean');

            cy.expectSuccessMessage('Document uploaded and scanned successfully');
        });

        it('should allow bulk document upload', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Click bulk upload button
            cy.get('[data-cy="bulk-upload-button"]').click();
            cy.get('[data-cy="bulk-upload-modal"]').should('be.visible');

            // Select multiple files
            cy.get('[data-cy="bulk-file-input"]').selectFile([
                'cypress/fixtures/document1.pdf',
                'cypress/fixtures/document2.pdf',
                'cypress/fixtures/document3.pdf'
            ], { force: true });

            // Set bulk upload settings
            cy.fillForm({
                'bulk-category': 'Personal Documents',
                'bulk-access-level': 'Private',
                'bulk-tags': 'bulk-upload, personal'
            });

            cy.get('[data-cy="start-bulk-upload-button"]').click();

            // Verify upload progress
            cy.get('[data-cy="bulk-upload-progress"]').should('be.visible');
            cy.get('[data-cy="upload-progress-bar"]').should('be.visible');

            // Wait for completion
            cy.get('[data-cy="bulk-upload-complete"]', { timeout: 30000 }).should('be.visible');
            cy.expectSuccessMessage('3 documents uploaded successfully');

            // Verify documents appear in list
            cy.get('[data-cy="documents-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 3);
        });
    });

    describe('Document Access and Viewing', () => {
        beforeEach(() => {
            // Seed various documents with different access levels
            cy.seedTestData('document', [
                {
                    id: 'doc-001',
                    title: 'Employee Handbook',
                    category: 'Company Policies',
                    accessLevel: 'public',
                    uploadedBy: 'hr-id-123',
                    uploaderName: 'HR Manager',
                    fileType: 'pdf',
                    fileSize: '2.5MB'
                },
                {
                    id: 'doc-002',
                    title: 'Personal Contract',
                    category: 'HR Documents',
                    accessLevel: 'employee',
                    uploadedBy: 'hr-id-123',
                    uploaderName: 'HR Manager',
                    employeeId: 'employee-id-123',
                    fileType: 'pdf',
                    fileSize: '1.2MB'
                },
                {
                    id: 'doc-003',
                    title: 'Project Specifications',
                    category: 'Project Documents',
                    accessLevel: 'team',
                    uploadedBy: 'manager-id-123',
                    uploaderName: 'Test Manager',
                    department: 'Engineering',
                    fileType: 'docx',
                    fileSize: '5.8MB'
                }
            ]);
        });

        it('should display documents based on access permissions', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Verify employee can see public and personal documents
            cy.get('[data-cy="documents-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 3);

            // Verify document details
            cy.get('[data-cy="table-row"]').each(($row) => {
                cy.wrap($row).within(() => {
                    cy.get('[data-cy="document-title"]').should('be.visible');
                    cy.get('[data-cy="document-category"]').should('be.visible');
                    cy.get('[data-cy="view-button"]').should('be.visible');
                });
            });
        });

        it('should allow viewing document details', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Click on first document
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="view-button"]').click();
            });

            // Verify document details modal
            cy.get('[data-cy="document-details-modal"]').should('be.visible');
            cy.get('[data-cy="document-title"]').should('contain.text', 'Employee Handbook');
            cy.get('[data-cy="document-category"]').should('contain.text', 'Company Policies');
            cy.get('[data-cy="uploaded-by"]').should('contain.text', 'HR Manager');
            cy.get('[data-cy="upload-date"]').should('be.visible');
            cy.get('[data-cy="file-size"]').should('contain.text', '2.5MB');
            cy.get('[data-cy="download-button"]').should('be.visible');
        });

        it('should allow downloading documents', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Download document
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="download-button"]').click();
            });

            // Verify download initiated
            cy.get('[data-cy="download-progress"]').should('be.visible');
            cy.expectSuccessMessage('Download started');

            // Verify download tracking
            cy.get('[data-cy="download-history-tab"]').click();
            cy.get('[data-cy="download-history-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="downloaded-document"]').should('contain.text', 'Employee Handbook');
                cy.get('[data-cy="download-date"]').should('be.visible');
            });
        });

        it('should support document preview for supported file types', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Preview PDF document
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="preview-button"]').click();
            });

            // Verify preview modal
            cy.get('[data-cy="document-preview-modal"]').should('be.visible');
            cy.get('[data-cy="pdf-viewer"]').should('be.visible');
            cy.get('[data-cy="preview-controls"]').should('be.visible');

            // Test preview controls
            cy.get('[data-cy="zoom-in-button"]').click();
            cy.get('[data-cy="zoom-out-button"]').click();
            cy.get('[data-cy="next-page-button"]').click();
            cy.get('[data-cy="previous-page-button"]').click();
        });

        it('should enforce access restrictions', () => {
            // Seed restricted document
            cy.seedTestData('document', {
                id: 'doc-restricted',
                title: 'Confidential HR Report',
                category: 'HR Documents',
                accessLevel: 'hr_only',
                uploadedBy: 'hr-id-123'
            });

            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Verify restricted document is not visible
            cy.get('[data-cy="documents-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('not.contain.text', 'Confidential HR Report');

            // Try to access directly via URL
            cy.visit('/testcompany/documents/doc-restricted', { failOnStatusCode: false });
            cy.get('[data-cy="access-denied"]').should('be.visible');
            cy.get('[data-cy="error-message"]').should('contain.text', 'You do not have permission to access this document');
        });
    });

    describe('Document Organization and Search', () => {
        beforeEach(() => {
            // Seed multiple documents for search testing
            cy.seedTestData('document', [
                {
                    id: 'doc-001',
                    title: 'Employee Onboarding Guide',
                    category: 'HR Documents',
                    tags: ['onboarding', 'new-hire', 'guide'],
                    uploadedBy: 'hr-id-123'
                },
                {
                    id: 'doc-002',
                    title: 'Project Alpha Requirements',
                    category: 'Project Documents',
                    tags: ['project-alpha', 'requirements', 'specifications'],
                    uploadedBy: 'manager-id-123'
                },
                {
                    id: 'doc-003',
                    title: 'Security Policy 2024',
                    category: 'Company Policies',
                    tags: ['security', 'policy', '2024'],
                    uploadedBy: 'hr-id-123'
                }
            ]);
        });

        it('should allow searching documents by title', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Search by title
            cy.get('[data-cy="search-input"]').type('Onboarding');
            cy.get('[data-cy="search-button"]').click();

            // Verify search results
            cy.get('[data-cy="search-results"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="document-title"]').should('contain.text', 'Employee Onboarding Guide');
            });
        });

        it('should allow filtering documents by category', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Filter by category
            cy.get('[data-cy="category-filter"]').select('Project Documents');
            cy.get('[data-cy="apply-filter-button"]').click();

            // Verify filtered results
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="document-category"]').should('contain.text', 'Project Documents');
            });
        });

        it('should allow searching by tags', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Search by tag
            cy.get('[data-cy="tag-search-input"]').type('security');
            cy.get('[data-cy="search-button"]').click();

            // Verify tag search results
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="document-title"]').should('contain.text', 'Security Policy 2024');
                cy.get('[data-cy="document-tags"]').should('contain.text', 'security');
            });
        });

        it('should allow sorting documents', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Sort by upload date (newest first)
            cy.get('[data-cy="sort-dropdown"]').select('Upload Date (Newest)');

            // Verify sorting
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="upload-date"]').should('be.visible');
            });

            // Sort by title (A-Z)
            cy.get('[data-cy="sort-dropdown"]').select('Title (A-Z)');

            // Verify alphabetical sorting
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="document-title"]').should('contain.text', 'Employee Onboarding Guide');
            });
        });

        it('should support advanced search with multiple criteria', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // Open advanced search
            cy.get('[data-cy="advanced-search-button"]').click();
            cy.get('[data-cy="advanced-search-modal"]').should('be.visible');

            // Fill advanced search criteria
            cy.fillForm({
                'title-contains': 'Policy',
                'category': 'Company Policies',
                'uploaded-by': 'HR Manager',
                'date-from': '2024-01-01',
                'date-to': '2024-12-31',
                'file-type': 'pdf'
            });

            cy.get('[data-cy="advanced-search-button"]').click();

            // Verify advanced search results
            cy.get('[data-cy="search-results"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="document-title"]').should('contain.text', 'Security Policy 2024');
            });
        });
    });

    describe('Document Version Control', () => {
        beforeEach(() => {
            // Seed document with versions
            cy.seedTestData('document', {
                id: 'doc-versioned',
                title: 'Employee Handbook',
                category: 'Company Policies',
                version: '2.1',
                uploadedBy: 'hr-id-123',
                versions: [
                    { version: '1.0', uploadDate: '2024-01-01', uploadedBy: 'hr-id-123' },
                    { version: '2.0', uploadDate: '2024-02-01', uploadedBy: 'hr-id-123' },
                    { version: '2.1', uploadDate: '2024-02-15', uploadedBy: 'hr-id-123', current: true }
                ]
            });
        });

        it('should allow uploading new version of existing document', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('documents');

            // Select existing document
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="upload-new-version-button"]').click();
            });

            // Upload new version
            cy.get('[data-cy="version-upload-modal"]').should('be.visible');
            cy.fillForm({
                'version-notes': 'Updated policies for remote work guidelines',
                'version-number': '2.2'
            });

            cy.uploadFile('employee-handbook-v2.2.pdf', '[data-cy="version-file-input"]');
            cy.get('[data-cy="upload-version-button"]').click();

            cy.expectSuccessMessage('New version uploaded successfully');

            // Verify version update
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="document-version"]').should('contain.text', 'v2.2');
                cy.get('[data-cy="version-badge"]').should('be.visible');
            });
        });

        it('should display version history', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            // View document details
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="view-button"]').click();
            });

            // Navigate to version history tab
            cy.get('[data-cy="version-history-tab"]').click();

            // Verify version history
            cy.get('[data-cy="version-history-table"]').should('be.visible');
            cy.get('[data-cy="version-row"]').should('have.length', 3);

            // Verify current version is marked
            cy.get('[data-cy="version-row"]').first().within(() => {
                cy.get('[data-cy="current-version-badge"]').should('be.visible');
                cy.get('[data-cy="version-number"]').should('contain.text', '2.1');
            });
        });

        it('should allow downloading previous versions', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="view-button"]').click();
            });

            cy.get('[data-cy="version-history-tab"]').click();

            // Download previous version
            cy.get('[data-cy="version-row"]').eq(1).within(() => {
                cy.get('[data-cy="download-version-button"]').click();
            });

            cy.expectSuccessMessage('Version 2.0 download started');
        });

        it('should allow comparing document versions', () => {
            cy.loginAsTenantUser('employee', 'testcompany');
            cy.navigateToModule('documents');

            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="view-button"]').click();
            });

            cy.get('[data-cy="version-history-tab"]').click();

            // Select versions to compare
            cy.get('[data-cy="version-row"]').eq(0).within(() => {
                cy.get('[data-cy="compare-checkbox"]').check();
            });
            cy.get('[data-cy="version-row"]').eq(1).within(() => {
                cy.get('[data-cy="compare-checkbox"]').check();
            });

            cy.get('[data-cy="compare-versions-button"]').click();

            // Verify comparison view
            cy.get('[data-cy="version-comparison-modal"]').should('be.visible');
            cy.get('[data-cy="version-diff-viewer"]').should('be.visible');
            cy.get('[data-cy="changes-summary"]').should('be.visible');
        });
    });

    describe('Document Approval Workflow', () => {
        beforeEach(() => {
            // Seed document pending approval
            cy.seedTestData('document', {
                id: 'doc-pending',
                title: 'New Company Policy Draft',
                category: 'Company Policies',
                status: 'pending_approval',
                uploadedBy: 'manager-id-123',
                uploaderName: 'Test Manager',
                requiresApproval: true,
                approvers: ['hr-id-123']
            });
        });

        it('should require approval for certain document categories', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('documents');

            cy.get('[data-cy="upload-document-button"]').click();

            // Select category that requires approval
            cy.fillForm({
                'document-title': 'Updated Safety Guidelines',
                'document-category': 'Company Policies'
            });

            // Verify approval requirement notice
            cy.get('[data-cy="approval-required-notice"]').should('be.visible');
            cy.get('[data-cy="approver-list"]').should('contain.text', 'HR Manager');

            cy.uploadFile('safety-guidelines.pdf', '[data-cy="file-input"]');
            cy.get('[data-cy="upload-button"]').click();

            cy.expectSuccessMessage('Document uploaded and sent for approval');

            // Verify document status
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="approval-status"]').should('contain.text', 'Pending Approval');
            });
        });

        it('should allow approver to review and approve documents', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('documents');

            // Navigate to pending approvals
            cy.get('[data-cy="pending-approvals-tab"]').click();

            // Verify pending document
            cy.get('[data-cy="approval-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="document-title"]').should('contain.text', 'New Company Policy Draft');
                cy.get('[data-cy="uploaded-by"]').should('contain.text', 'Test Manager');
            });

            // Approve document
            cy.clickTableAction(0, 'approve');

            cy.get('[data-cy="approval-modal"]').should('be.visible');
            cy.fillForm({
                'approval-comments': 'Policy reviewed and approved. Effective immediately.'
            });

            cy.get('[data-cy="approve-document-button"]').click();

            cy.expectSuccessMessage('Document approved successfully');

            // Verify document is now available
            cy.get('[data-cy="all-documents-tab"]').click();
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="approval-status"]').should('contain.text', 'Approved');
            });
        });

        it('should allow approver to reject documents', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('documents');

            cy.get('[data-cy="pending-approvals-tab"]').click();

            // Reject document
            cy.clickTableAction(0, 'reject');

            cy.get('[data-cy="rejection-modal"]').should('be.visible');
            cy.fillForm({
                'rejection-reason': 'Policy needs revision to comply with new regulations'
            });

            cy.get('[data-cy="reject-document-button"]').click();

            cy.expectSuccessMessage('Document rejected');

            // Verify rejection notification sent to uploader
            cy.logout();
            cy.loginAsTenantUser('manager', 'testcompany');

            cy.get('[data-cy="notifications-bell"]').click();
            cy.get('[data-cy="notification-item"]').should('contain.text', 'Document rejected');
            cy.get('[data-cy="notification-item"]').should('contain.text', 'needs revision');
        });
    });

    describe('Document Analytics and Reporting', () => {
        beforeEach(() => {
            // Seed document access logs
            cy.seedTestData('documentAccess', [
                {
                    documentId: 'doc-001',
                    documentTitle: 'Employee Handbook',
                    userId: 'employee-id-123',
                    userName: 'Test Employee',
                    action: 'view',
                    timestamp: '2024-01-15T10:00:00Z'
                },
                {
                    documentId: 'doc-001',
                    documentTitle: 'Employee Handbook',
                    userId: 'employee-id-123',
                    userName: 'Test Employee',
                    action: 'download',
                    timestamp: '2024-01-15T10:05:00Z'
                },
                {
                    documentId: 'doc-002',
                    documentTitle: 'Project Specifications',
                    userId: 'employee-id-123',
                    userName: 'Test Employee',
                    action: 'view',
                    timestamp: '2024-01-16T14:30:00Z'
                }
            ]);
        });

        it('should display document usage analytics for managers', () => {
            cy.loginAsTenantUser('manager', 'testcompany');
            cy.navigateToModule('reports');

            // Navigate to document reports
            cy.get('[data-cy="document-reports-tab"]').click();

            // Verify document usage metrics
            cy.get('[data-cy="document-usage-summary"]').should('be.visible');
            cy.get('[data-cy="total-documents"]').should('be.visible');
            cy.get('[data-cy="total-downloads"]').should('be.visible');
            cy.get('[data-cy="most-accessed-documents"]').should('be.visible');

            // Verify usage charts
            cy.get('[data-cy="usage-trends-chart"]').should('be.visible');
            cy.get('[data-cy="category-usage-chart"]').should('be.visible');
        });

        it('should show document access logs', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('documents');

            // Navigate to access logs
            cy.get('[data-cy="access-logs-tab"]').click();

            // Verify access log table
            cy.get('[data-cy="access-logs-table"]').should('be.visible');
            cy.get('[data-cy="table-row"]').should('have.length', 3);

            // Verify log details
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="document-title"]').should('contain.text', 'Employee Handbook');
                cy.get('[data-cy="user-name"]').should('contain.text', 'Test Employee');
                cy.get('[data-cy="action"]').should('contain.text', 'view');
                cy.get('[data-cy="timestamp"]').should('be.visible');
            });
        });

        it('should allow filtering access logs', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('documents');

            cy.get('[data-cy="access-logs-tab"]').click();

            // Apply filters
            cy.get('[data-cy="user-filter"]').select('Test Employee');
            cy.get('[data-cy="action-filter"]').select('download');
            cy.get('[data-cy="apply-filter-button"]').click();

            // Verify filtered results
            cy.get('[data-cy="table-row"]').should('have.length', 1);
            cy.get('[data-cy="table-row"]').first().within(() => {
                cy.get('[data-cy="action"]').should('contain.text', 'download');
            });
        });

        it('should generate document compliance reports', () => {
            cy.loginAsTenantUser('hrManager', 'testcompany');
            cy.navigateToModule('reports');

            cy.get('[data-cy="document-reports-tab"]').click();

            // Generate compliance report
            cy.get('[data-cy="compliance-report-button"]').click();
            cy.get('[data-cy="compliance-report-modal"]').should('be.visible');

            cy.fillForm({
                'report-period': 'last-30-days',
                'include-categories': ['HR Documents', 'Company Policies']
            });

            cy.get('[data-cy="generate-report-button"]').click();

            cy.expectSuccessMessage('Compliance report generated successfully');

            // Verify report download
            cy.get('[data-cy="download-report-button"]').should('be.visible');
            cy.get('[data-cy="report-summary"]').should('be.visible');
        });
    });
});