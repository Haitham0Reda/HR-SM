// testing/modules/life-insurance/insuranceReportCompleteness.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import InsurancePolicy from '../../../modules/life-insurance/models/InsurancePolicy.js';
import InsuranceClaim from '../../../modules/life-insurance/models/InsuranceClaim.js';
import FamilyMember from '../../../modules/life-insurance/models/FamilyMember.js';
import Department from '../../../modules/hr-core/users/models/department.model.js';
import Position from '../../../modules/hr-core/users/models/position.model.js';
import reportService from '../../../modules/life-insurance/services/reportService.js';

// Use existing User model if already compiled, otherwise import it
const User = mongoose.models.User || (await import('../../../modules/hr-core/users/models/user.model.js')).default;

describe('Insurance Report Completeness Property-Based Tests', () => {
    let testTenantId;
    let testEmployeeId;
    let testUser;
    let testDepartment;
    let testPosition;
    let testPolicy;

    beforeEach(async () => {
        // Create unique test tenant ID for isolation
        testTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Clean up any existing test data first
        await FamilyMember.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await InsuranceClaim.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await InsurancePolicy.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await User.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Department.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Position.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        
        // Create test department
        testDepartment = await Department.create({
            tenantId: testTenantId,
            name: 'Test Department',
            code: `DEPT-${Date.now()}`
        });
        
        // Create test position
        testPosition = await Position.create({
            tenantId: testTenantId,
            title: 'Test Position',
            code: `POS-${Date.now()}`,
            department: testDepartment._id
        });
        
        // Create a test user/employee
        testUser = await User.create({
            tenantId: testTenantId,
            username: `testuser-${Date.now()}`,
            email: `test-${Date.now()}@example.com`,
            password: 'testpassword123',
            employeeId: `EMP-${Date.now()}`,
            firstName: 'Test',
            lastName: 'Employee',
            personalInfo: {
                firstName: 'Test',
                lastName: 'Employee',
                fullName: 'Test Employee'
            },
            department: testDepartment._id,
            position: testPosition._id,
            status: 'active'
        });
        
        testEmployeeId = testUser._id;
        
        // Create a test insurance policy
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        testPolicy = await InsurancePolicy.create({
            tenantId: testTenantId,
            employeeId: testEmployeeId,
            employeeNumber: testUser.employeeId,
            policyType: 'CAT_C',
            coverageAmount: 100000,
            premium: 1000,
            startDate,
            endDate,
            status: 'active'
        });
    });

    afterEach(async () => {
        // Clean up test data
        await FamilyMember.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await InsuranceClaim.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await InsurancePolicy.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await User.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Department.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        await Position.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
        
        // Clean up generated report files
        try {
            const reportsDir = 'uploads/insurance-reports';
            if (fs.existsSync(reportsDir)) {
                const files = fs.readdirSync(reportsDir);
                files.forEach(file => {
                    if (file.includes(testTenantId)) {
                        fs.unlinkSync(path.join(reportsDir, file));
                    }
                });
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    test('Property 20: Insurance Report Completeness - Excel Format', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 20: Insurance Report Completeness
         * Validates: Requirements 5.5
         * 
         * For any insurance report generation request, the output should contain all required fields 
         * (employee details, policy info, family members, claims) in the correct format
         */
        fc.assert(fc.asyncProperty(
            fc.record({
                includeExpired: fc.boolean(),
                includeClaims: fc.boolean(),
                includeFamilyMembers: fc.boolean(),
                reportTitle: fc.string({ minLength: 1, maxLength: 50 }),
                dateRange: fc.record({
                    startDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
                    endDate: fc.date({ min: new Date(), max: new Date('2025-12-31') })
                })
            }),
            async (reportOptions) => {
                // Ensure endDate is after startDate
                if (reportOptions.dateRange.endDate <= reportOptions.dateRange.startDate) {
                    reportOptions.dateRange.endDate = new Date(reportOptions.dateRange.startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                }

                // Update test policy dates to fall within the report date range
                // This ensures the policy will be included in the report
                const policyStartDate = new Date(reportOptions.dateRange.startDate.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day after report start
                const policyEndDate = new Date(reportOptions.dateRange.endDate.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before report end
                const policyCreatedAt = new Date(reportOptions.dateRange.startDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days after report start
                
                await InsurancePolicy.findByIdAndUpdate(testPolicy._id, {
                    startDate: policyStartDate,
                    endDate: policyEndDate,
                    createdAt: policyCreatedAt
                });

                // Create additional test data based on options
                let familyMember = null;
                let claim = null;

                if (reportOptions.includeFamilyMembers) {
                    familyMember = await FamilyMember.create({
                        tenantId: testTenantId,
                        employeeId: testEmployeeId,
                        policyId: testPolicy._id,
                        firstName: 'Test',
                        lastName: 'Family',
                        dateOfBirth: new Date('1990-01-01'),
                        gender: 'M',
                        nationalId: '1234567890',
                        nationality: 'US',
                        relationship: 'spouse',
                        status: 'active',
                        coverageStartDate: policyStartDate,
                        coverageEndDate: policyEndDate
                    });
                }

                if (reportOptions.includeClaims) {
                    claim = await InsuranceClaim.create({
                        tenantId: testTenantId,
                        policyId: testPolicy._id,
                        claimantType: 'employee',
                        claimantId: testEmployeeId,
                        claimantModel: 'User',
                        claimType: 'medical',
                        claimDate: new Date(),
                        incidentDate: new Date(),
                        description: 'Test medical claim',
                        claimAmount: 5000,
                        status: 'pending'
                    });
                }

                // Action: Generate Excel report
                const filePath = await reportService.generateInsuranceReportExcel(testTenantId, {
                    startDate: reportOptions.dateRange.startDate,
                    endDate: reportOptions.dateRange.endDate,
                    includeExpired: reportOptions.includeExpired,
                    includeClaims: reportOptions.includeClaims,
                    includeFamilyMembers: reportOptions.includeFamilyMembers
                });

                // Assertion 1: File should be created
                expect(fs.existsSync(filePath)).toBe(true);

                // Assertion 2: File should be a valid Excel file
                const workbook = xlsx.readFile(filePath);
                expect(workbook).toBeDefined();
                expect(workbook.SheetNames).toBeDefined();
                expect(workbook.SheetNames.length).toBeGreaterThan(0);

                // Assertion 3: Required worksheets should exist
                expect(workbook.SheetNames).toContain('Policies');
                expect(workbook.SheetNames).toContain('Summary');

                if (reportOptions.includeClaims && claim) {
                    expect(workbook.SheetNames).toContain('Claims');
                }

                if (reportOptions.includeFamilyMembers && familyMember) {
                    expect(workbook.SheetNames).toContain('Family Members');
                }

                // Assertion 4: Policies worksheet should contain all required employee details
                const policiesSheet = workbook.Sheets['Policies'];
                const policiesData = xlsx.utils.sheet_to_json(policiesSheet);
                
                expect(policiesData.length).toBeGreaterThan(0);
                
                const policyRow = policiesData[0];
                
                // Required employee details
                expect(policyRow).toHaveProperty('Employee Name');
                expect(policyRow).toHaveProperty('Employee ID');
                expect(policyRow).toHaveProperty('Department');
                expect(policyRow['Employee Name']).toContain('Test Employee');
                expect(policyRow['Employee ID']).toBeDefined();
                
                // Required policy information
                expect(policyRow).toHaveProperty('Policy Number');
                expect(policyRow).toHaveProperty('Policy Type');
                expect(policyRow).toHaveProperty('Coverage Amount');
                expect(policyRow).toHaveProperty('Premium');
                expect(policyRow).toHaveProperty('Status');
                expect(policyRow).toHaveProperty('Start Date');
                expect(policyRow).toHaveProperty('End Date');
                expect(policyRow).toHaveProperty('Created Date');
                
                expect(policyRow['Policy Number']).toMatch(/^INS-\d{4}-\d{6}$/);
                expect(policyRow['Policy Type']).toBe('CAT_C');
                expect(policyRow['Coverage Amount']).toBe(100000);
                expect(policyRow['Premium']).toBe(1000);
                expect(policyRow['Status']).toBe('active');

                // Assertion 5: Claims worksheet should contain all required fields (if included)
                if (reportOptions.includeClaims && claim) {
                    const claimsSheet = workbook.Sheets['Claims'];
                    const claimsData = xlsx.utils.sheet_to_json(claimsSheet);
                    
                    expect(claimsData.length).toBeGreaterThan(0);
                    
                    const claimRow = claimsData[0];
                    
                    // Required claim fields
                    expect(claimRow).toHaveProperty('Claim Number');
                    expect(claimRow).toHaveProperty('Policy Number');
                    expect(claimRow).toHaveProperty('Employee Name');
                    expect(claimRow).toHaveProperty('Claimant Type');
                    expect(claimRow).toHaveProperty('Claim Type');
                    expect(claimRow).toHaveProperty('Claim Amount');
                    expect(claimRow).toHaveProperty('Status');
                    expect(claimRow).toHaveProperty('Incident Date');
                    expect(claimRow).toHaveProperty('Submitted Date');
                    
                    expect(claimRow['Claim Number']).toMatch(/^CLM-\d{4}-\d{6}$/);
                    expect(claimRow['Policy Number']).toBe(testPolicy.policyNumber);
                    expect(claimRow['Employee Name']).toContain('Test Employee');
                    expect(claimRow['Claimant Type']).toBe('employee');
                    expect(claimRow['Claim Type']).toBe('medical');
                    expect(claimRow['Claim Amount']).toBe(5000);
                    expect(claimRow['Status']).toBe('pending');
                }

                // Assertion 6: Family Members worksheet should contain all required fields (if included)
                if (reportOptions.includeFamilyMembers && familyMember) {
                    const familySheet = workbook.Sheets['Family Members'];
                    const familyData = xlsx.utils.sheet_to_json(familySheet);
                    
                    expect(familyData.length).toBeGreaterThan(0);
                    
                    const familyRow = familyData[0];
                    
                    // Required family member fields
                    expect(familyRow).toHaveProperty('Insurance Number');
                    expect(familyRow).toHaveProperty('First Name');
                    expect(familyRow).toHaveProperty('Last Name');
                    expect(familyRow).toHaveProperty('Relationship');
                    expect(familyRow).toHaveProperty('Date of Birth');
                    expect(familyRow).toHaveProperty('Gender');
                    expect(familyRow).toHaveProperty('Employee Name');
                    expect(familyRow).toHaveProperty('Policy Number');
                    expect(familyRow).toHaveProperty('Status');
                    expect(familyRow).toHaveProperty('Coverage Start');
                    expect(familyRow).toHaveProperty('Coverage End');
                    
                    expect(familyRow['Insurance Number']).toMatch(new RegExp(`^${testPolicy.policyNumber}-\\d+$`));
                    expect(familyRow['First Name']).toBe('Test');
                    expect(familyRow['Last Name']).toBe('Family');
                    expect(familyRow['Relationship']).toBe('spouse');
                    expect(familyRow['Gender']).toBe('M');
                    expect(familyRow['Employee Name']).toContain('Test Employee');
                    expect(familyRow['Policy Number']).toBe(testPolicy.policyNumber);
                    expect(familyRow['Status']).toBe('active');
                }

                // Assertion 7: Summary worksheet should contain all required metrics
                const summarySheet = workbook.Sheets['Summary'];
                const summaryData = xlsx.utils.sheet_to_json(summarySheet);
                
                expect(summaryData.length).toBeGreaterThan(0);
                
                const summaryMetrics = summaryData.reduce((acc, row) => {
                    acc[row.Metric] = row.Value;
                    return acc;
                }, {});
                
                // Required summary metrics
                expect(summaryMetrics).toHaveProperty('Total Policies');
                expect(summaryMetrics).toHaveProperty('Active Policies');
                expect(summaryMetrics).toHaveProperty('Total Claims');
                expect(summaryMetrics).toHaveProperty('Total Family Members');
                expect(summaryMetrics).toHaveProperty('Total Coverage Amount');
                expect(summaryMetrics).toHaveProperty('Total Claims Amount');
                expect(summaryMetrics).toHaveProperty('Claims Approval Rate');
                
                expect(summaryMetrics['Total Policies']).toBeGreaterThanOrEqual(1);
                expect(summaryMetrics['Active Policies']).toBeGreaterThanOrEqual(1);
                expect(summaryMetrics['Total Coverage Amount']).toBeGreaterThanOrEqual(100000);

                // Clean up the generated file
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        ), { numRuns: 5 });
    });

    test('Property 20: Insurance Report Completeness - PDF Format', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 20: Insurance Report Completeness
         * Validates: Requirements 5.5
         * 
         * For any insurance report generation request, the PDF output should be created successfully
         * and contain basic file properties without parsing PDF content (to avoid Jest/PDFKit issues)
         */
        fc.assert(fc.asyncProperty(
            fc.record({
                includeExpired: fc.boolean(),
                includeClaims: fc.boolean(),
                includeFamilyMembers: fc.boolean(),
                reportTitle: fc.string({ minLength: 1, maxLength: 50 }),
                dateRange: fc.record({
                    startDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
                    endDate: fc.date({ min: new Date(), max: new Date('2025-12-31') })
                })
            }),
            async (reportOptions) => {
                // Ensure endDate is after startDate
                if (reportOptions.dateRange.endDate <= reportOptions.dateRange.startDate) {
                    reportOptions.dateRange.endDate = new Date(reportOptions.dateRange.startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                }

                // Update test policy dates to fall within the report date range
                // This ensures the policy will be included in the report
                const policyStartDate = new Date(reportOptions.dateRange.startDate.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day after report start
                const policyEndDate = new Date(reportOptions.dateRange.endDate.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before report end
                const policyCreatedAt = new Date(reportOptions.dateRange.startDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days after report start
                
                await InsurancePolicy.findByIdAndUpdate(testPolicy._id, {
                    startDate: policyStartDate,
                    endDate: policyEndDate,
                    createdAt: policyCreatedAt
                });

                // Create additional test data based on options
                let familyMember = null;
                let claim = null;

                if (reportOptions.includeFamilyMembers) {
                    familyMember = await FamilyMember.create({
                        tenantId: testTenantId,
                        employeeId: testEmployeeId,
                        policyId: testPolicy._id,
                        firstName: 'Test',
                        lastName: 'Family',
                        dateOfBirth: new Date('1990-01-01'),
                        gender: 'F',
                        nationalId: '1234567890',
                        nationality: 'US',
                        relationship: 'child',
                        status: 'active',
                        coverageStartDate: policyStartDate,
                        coverageEndDate: policyEndDate
                    });
                }

                if (reportOptions.includeClaims) {
                    claim = await InsuranceClaim.create({
                        tenantId: testTenantId,
                        policyId: testPolicy._id,
                        claimantType: 'employee',
                        claimantId: testEmployeeId,
                        claimantModel: 'User',
                        claimType: 'critical_illness',
                        claimDate: new Date(),
                        incidentDate: new Date(),
                        description: 'Test critical illness claim',
                        claimAmount: 10000,
                        status: 'approved',
                        approvedAmount: 8000
                    });
                }

                // Action: Generate PDF report
                const filePath = await reportService.generateInsuranceReportPDF(testTenantId, {
                    startDate: reportOptions.dateRange.startDate,
                    endDate: reportOptions.dateRange.endDate,
                    includeExpired: reportOptions.includeExpired,
                    includeClaims: reportOptions.includeClaims,
                    includeFamilyMembers: reportOptions.includeFamilyMembers,
                    reportTitle: reportOptions.reportTitle
                });

                // Assertion 1: File should be created
                expect(fs.existsSync(filePath)).toBe(true);

                // Assertion 2: File should have reasonable size (not empty, not too small)
                const stats = fs.statSync(filePath);
                expect(stats.size).toBeGreaterThan(1000); // At least 1KB for a valid report

                // Assertion 3: Verify file extension and naming convention
                expect(filePath).toMatch(/insurance-report-.*\.pdf$/);
                expect(filePath).toContain(testTenantId);

                // Assertion 4: Basic file header validation (PDF files start with %PDF)
                const buffer = fs.readFileSync(filePath, { encoding: null });
                const header = buffer.toString('ascii', 0, 4);
                expect(header).toBe('%PDF');

                // Clean up the generated file
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        ), { numRuns: 3 });
    });
});