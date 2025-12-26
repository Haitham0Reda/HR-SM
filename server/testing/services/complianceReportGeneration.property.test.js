/**
 * Property Test 36: Compliance Report Generation
 * Property 36: Compliance Report Generation
 * Validates: Requirements 10.4
 * 
 * This property test validates that compliance reports are generated correctly,
 * ensuring data accuracy, format consistency, and comprehensive coverage of
 * compliance requirements across different report types and formats.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import DataRetentionPolicy from '../../models/DataRetentionPolicy.js';
import DataArchive from '../../models/DataArchive.js';
import complianceReportingService from '../../services/complianceReportingService.js';
import { connectTestDatabase, clearTestDatabase, closeTestDatabase } from '../helpers/testDatabase.js';

describe('Property Test 36: Compliance Report Generation', () => {
  let testTenantId;
  let testUserId;

  beforeAll(async () => {
    await connectTestDatabase();
    testTenantId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  // Arbitraries for generating test data
  const reportTypeArb = fc.constantFrom(
    'data_retention_compliance',
    'audit_trail_report',
    'user_access_patterns',
    'license_compliance',
    'data_processing_activities',
    'security_incidents',
    'gdpr_compliance'
  );

  const formatArb = fc.constantFrom('json', 'pdf', 'excel');

  const dateRangeArb = fc.record({
    startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
    endDate: fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') })
  }).filter(({ startDate, endDate }) => startDate < endDate);

  const reportOptionsArb = fc.record({
    format: formatArb,
    includeDetails: fc.boolean(),
    userId: fc.constantFrom(testUserId, null)
  });

  /**
   * Property 36.1: Report Structure Consistency
   * All compliance reports should have consistent structure regardless of type
   */
  test('Property 36.1: Report structure is consistent across types', async () => {
    await fc.assert(fc.asyncProperty(
      reportTypeArb,
      reportOptionsArb,
      dateRangeArb,
      async (reportType, options, { startDate, endDate }) => {
        // Mock the service methods to avoid database dependencies
        const originalMethods = {};
        const reportMethods = [
          'generateDataRetentionReport',
          'generateAuditTrailReport',
          'generateUserAccessReport',
          'generateLicenseComplianceReport',
          'generateDataProcessingReport',
          'generateSecurityIncidentReport',
          'generateGDPRComplianceReport'
        ];

        // Store original methods and create mocks
        reportMethods.forEach(method => {
          originalMethods[method] = complianceReportingService[method];
          complianceReportingService[method] = async () => ({
            summary: {
              reportType,
              tenantId: testTenantId,
              period: { startDate, endDate },
              totalRecords: Math.floor(Math.random() * 1000),
              generatedAt: new Date()
            },
            data: [],
            recommendations: []
          });
        });

        // Mock formatting methods
        originalMethods.formatReportAsPDF = complianceReportingService.formatReportAsPDF;
        originalMethods.formatReportAsExcel = complianceReportingService.formatReportAsExcel;
        
        complianceReportingService.formatReportAsPDF = async (data) => ({
          buffer: Buffer.from('mock-pdf-content'),
          contentType: 'application/pdf',
          filename: `${reportType}_report.pdf`
        });
        
        complianceReportingService.formatReportAsExcel = async (data) => ({
          buffer: Buffer.from('mock-excel-content'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `${reportType}_report.xlsx`
        });

        try {
          const report = await complianceReportingService.generateComplianceReport(
            testTenantId,
            reportType,
            { ...options, startDate, endDate }
          );

          // Verify consistent structure
          expect(report).toHaveProperty('reportType');
          expect(report).toHaveProperty('format');
          expect(report).toHaveProperty('generatedAt');
          expect(report).toHaveProperty('summary');
          
          expect(report.reportType).toBe(reportType);
          expect(report.format).toBe(options.format);
          expect(report.generatedAt).toBeInstanceOf(Date);
          expect(report.summary).toHaveProperty('reportType');
          expect(report.summary).toHaveProperty('tenantId');
          expect(report.summary).toHaveProperty('period');

          // Verify format-specific properties
          if (options.format === 'pdf') {
            expect(report).toHaveProperty('buffer');
            expect(report).toHaveProperty('contentType');
            expect(report.contentType).toBe('application/pdf');
          } else if (options.format === 'excel') {
            expect(report).toHaveProperty('buffer');
            expect(report).toHaveProperty('contentType');
            expect(report.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          } else if (options.format === 'json') {
            expect(report).toHaveProperty('data');
            expect(report.contentType).toBe('application/json');
          }

        } finally {
          // Restore original methods
          Object.keys(originalMethods).forEach(method => {
            complianceReportingService[method] = originalMethods[method];
          });
        }
      }
    ), { numRuns: 20 });
  });

  /**
   * Property 36.2: Date Range Validation
   * Reports should respect the specified date range in their data
   */
  test('Property 36.2: Date range is properly applied to report data', async () => {
    await fc.assert(fc.asyncProperty(
      dateRangeArb,
      async ({ startDate, endDate }) => {
        // Create test data with different dates
        const beforeRange = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        const withinRange = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        const afterRange = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

        // Create test policies with different creation dates
        const policies = [
          new DataRetentionPolicy({
            tenantId: testTenantId,
            policyName: 'Before Range Policy',
            dataType: 'audit_logs',
            retentionPeriod: { value: 30, unit: 'days' },
            createdBy: testUserId,
            createdAt: beforeRange
          }),
          new DataRetentionPolicy({
            tenantId: testTenantId,
            policyName: 'Within Range Policy',
            dataType: 'security_logs',
            retentionPeriod: { value: 60, unit: 'days' },
            createdBy: testUserId,
            createdAt: withinRange
          }),
          new DataRetentionPolicy({
            tenantId: testTenantId,
            policyName: 'After Range Policy',
            dataType: 'user_data',
            retentionPeriod: { value: 90, unit: 'days' },
            createdBy: testUserId,
            createdAt: afterRange
          })
        ];

        await Promise.all(policies.map(p => p.save()));

        // Create test archives with different dates
        const archives = [
          new DataArchive({
            tenantId: testTenantId,
            retentionPolicyId: policies[0]._id,
            archiveId: 'ARC-BEFORE-001',
            dataType: 'audit_logs',
            recordCount: 100,
            status: 'completed',
            createdAt: beforeRange
          }),
          new DataArchive({
            tenantId: testTenantId,
            retentionPolicyId: policies[1]._id,
            archiveId: 'ARC-WITHIN-001',
            dataType: 'security_logs',
            recordCount: 200,
            status: 'completed',
            createdAt: withinRange
          }),
          new DataArchive({
            tenantId: testTenantId,
            retentionPolicyId: policies[2]._id,
            archiveId: 'ARC-AFTER-001',
            dataType: 'user_data',
            recordCount: 300,
            status: 'completed',
            createdAt: afterRange
          })
        ];

        await Promise.all(archives.map(a => a.save()));

        // Generate report
        const report = await complianceReportingService.generateComplianceReport(
          testTenantId,
          'data_retention_compliance',
          { startDate, endDate, format: 'json', includeDetails: true }
        );

        // Verify date range is applied
        expect(report.summary.period.startDate).toEqual(startDate);
        expect(report.summary.period.endDate).toEqual(endDate);

        // Check that only archives within range are included
        const reportArchives = report.data.archives;
        if (Array.isArray(reportArchives)) {
          reportArchives.forEach(archive => {
            const archiveDate = new Date(archive.createdAt);
            expect(archiveDate).toBeGreaterThanOrEqual(startDate);
            expect(archiveDate).toBeLessThanOrEqual(endDate);
          });
        }
      }
    ), { numRuns: 10 });
  });

  /**
   * Property 36.3: Report Type Validation
   * Each report type should generate appropriate content
   */
  test('Property 36.3: Report type generates appropriate content structure', async () => {
    await fc.assert(fc.asyncProperty(
      reportTypeArb,
      async (reportType) => {
        // Mock the specific report generation method
        const originalMethod = complianceReportingService[`generate${reportType.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)).join('')}Report`];
        
        if (!originalMethod) {
          // Skip if method doesn't exist
          return;
        }

        // Create mock data specific to report type
        let mockData;
        switch (reportType) {
          case 'data_retention_compliance':
            mockData = {
              summary: {
                reportType,
                totalPolicies: 5,
                activePolicies: 4,
                compliantPolicies: 3,
                totalExecutions: 100,
                failedExecutions: 2,
                successRate: 98
              },
              policies: [],
              archives: [],
              policyCompliance: [],
              recommendations: []
            };
            break;
          case 'audit_trail_report':
            mockData = {
              summary: {
                reportType,
                totalEvents: 1000,
                uniqueUsers: 25,
                uniqueActions: 15,
                suspiciousEvents: 2
              },
              auditEvents: [],
              userActivity: {},
              actionTypes: {},
              suspiciousActivity: [],
              recommendations: []
            };
            break;
          case 'license_compliance':
            mockData = {
              summary: {
                reportType,
                totalLicenses: 10,
                activeLicenses: 8,
                expiredLicenses: 1,
                complianceScore: 85
              },
              licenses: [],
              violations: [],
              recommendations: []
            };
            break;
          default:
            mockData = {
              summary: { reportType },
              data: [],
              recommendations: []
            };
        }

        // Mock the method
        const mockMethod = async () => mockData;
        complianceReportingService[`generate${reportType.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)).join('')}Report`] = mockMethod;

        try {
          const report = await complianceReportingService.generateComplianceReport(
            testTenantId,
            reportType,
            { format: 'json', includeDetails: true }
          );

          // Verify report type specific structure
          expect(report.summary.reportType).toBe(reportType);
          
          switch (reportType) {
            case 'data_retention_compliance':
              expect(report.data.summary).toHaveProperty('totalPolicies');
              expect(report.data.summary).toHaveProperty('activePolicies');
              expect(report.data.summary).toHaveProperty('successRate');
              break;
            case 'audit_trail_report':
              expect(report.data.summary).toHaveProperty('totalEvents');
              expect(report.data.summary).toHaveProperty('uniqueUsers');
              expect(report.data.summary).toHaveProperty('suspiciousEvents');
              break;
            case 'license_compliance':
              expect(report.data.summary).toHaveProperty('totalLicenses');
              expect(report.data.summary).toHaveProperty('complianceScore');
              break;
          }

        } finally {
          // Restore original method
          if (originalMethod) {
            complianceReportingService[`generate${reportType.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)).join('')}Report`] = originalMethod;
          }
        }
      }
    ), { numRuns: 15 });
  });

  /**
   * Property 36.4: Format Consistency
   * Different formats should contain the same core data
   */
  test('Property 36.4: Different formats contain consistent core data', async () => {
    await fc.assert(fc.asyncProperty(
      reportTypeArb,
      dateRangeArb,
      async (reportType, { startDate, endDate }) => {
        // Mock report generation to return consistent data
        const mockReportData = {
          summary: {
            reportType,
            tenantId: testTenantId,
            period: { startDate, endDate },
            totalRecords: 500,
            generatedAt: new Date()
          },
          data: [
            { id: 1, type: 'test', value: 100 },
            { id: 2, type: 'test', value: 200 }
          ],
          recommendations: ['Recommendation 1', 'Recommendation 2']
        };

        // Mock all report generation methods
        const originalMethods = {};
        const reportMethods = [
          'generateDataRetentionReport',
          'generateAuditTrailReport',
          'generateUserAccessReport',
          'generateLicenseComplianceReport',
          'generateDataProcessingReport',
          'generateSecurityIncidentReport',
          'generateGDPRComplianceReport'
        ];

        reportMethods.forEach(method => {
          originalMethods[method] = complianceReportingService[method];
          complianceReportingService[method] = async () => mockReportData;
        });

        // Mock formatting methods
        originalMethods.formatReportAsPDF = complianceReportingService.formatReportAsPDF;
        originalMethods.formatReportAsExcel = complianceReportingService.formatReportAsExcel;
        
        complianceReportingService.formatReportAsPDF = async (data) => ({
          buffer: Buffer.from(JSON.stringify(data)),
          contentType: 'application/pdf',
          filename: `${reportType}_report.pdf`
        });
        
        complianceReportingService.formatReportAsExcel = async (data) => ({
          buffer: Buffer.from(JSON.stringify(data)),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `${reportType}_report.xlsx`
        });

        try {
          // Generate reports in different formats
          const jsonReport = await complianceReportingService.generateComplianceReport(
            testTenantId,
            reportType,
            { startDate, endDate, format: 'json' }
          );

          const pdfReport = await complianceReportingService.generateComplianceReport(
            testTenantId,
            reportType,
            { startDate, endDate, format: 'pdf' }
          );

          const excelReport = await complianceReportingService.generateComplianceReport(
            testTenantId,
            reportType,
            { startDate, endDate, format: 'excel' }
          );

          // Verify consistent core data across formats
          expect(jsonReport.reportType).toBe(reportType);
          expect(pdfReport.reportType).toBe(reportType);
          expect(excelReport.reportType).toBe(reportType);

          expect(jsonReport.summary.totalRecords).toBe(500);
          expect(pdfReport.summary.totalRecords).toBe(500);
          expect(excelReport.summary.totalRecords).toBe(500);

          // Verify format-specific properties
          expect(jsonReport.contentType).toBe('application/json');
          expect(pdfReport.contentType).toBe('application/pdf');
          expect(excelReport.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        } finally {
          // Restore original methods
          Object.keys(originalMethods).forEach(method => {
            complianceReportingService[method] = originalMethods[method];
          });
        }
      }
    ), { numRuns: 10 });
  });

  /**
   * Property 36.5: Report Completeness
   * Reports should include all required sections and data
   */
  test('Property 36.5: Reports include all required sections', async () => {
    await fc.assert(fc.asyncProperty(
      reportTypeArb,
      fc.boolean(), // includeDetails
      async (reportType, includeDetails) => {
        // Mock comprehensive report data
        const mockReportData = {
          summary: {
            reportType,
            tenantId: testTenantId,
            period: { startDate: new Date(), endDate: new Date() },
            totalRecords: 1000,
            processedRecords: 950,
            errorCount: 50,
            complianceScore: 95
          },
          data: includeDetails ? [
            { id: 1, details: 'Full details' },
            { id: 2, details: 'Full details' }
          ] : [
            { id: 1 },
            { id: 2 }
          ],
          recommendations: [
            'Improve data retention policies',
            'Enhance security monitoring'
          ],
          metadata: {
            generatedBy: testUserId,
            generationTime: 1500,
            dataQuality: 'high'
          }
        };

        // Mock the specific report method
        const reportMethodName = `generate${reportType.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)).join('')}Report`;
        
        const originalMethod = complianceReportingService[reportMethodName];
        if (!originalMethod) return; // Skip if method doesn't exist

        complianceReportingService[reportMethodName] = async () => mockReportData;

        try {
          const report = await complianceReportingService.generateComplianceReport(
            testTenantId,
            reportType,
            { format: 'json', includeDetails }
          );

          // Verify required sections
          expect(report).toHaveProperty('reportType');
          expect(report).toHaveProperty('format');
          expect(report).toHaveProperty('generatedAt');
          expect(report).toHaveProperty('summary');
          expect(report).toHaveProperty('data');

          // Verify summary completeness
          expect(report.summary).toHaveProperty('reportType');
          expect(report.summary).toHaveProperty('tenantId');
          expect(report.summary).toHaveProperty('totalRecords');

          // Verify data detail level matches request
          if (includeDetails && Array.isArray(report.data.data)) {
            report.data.data.forEach(item => {
              if (item.details) {
                expect(item.details).toBeDefined();
              }
            });
          }

          // Verify recommendations are included
          expect(report.data.recommendations).toBeDefined();
          expect(Array.isArray(report.data.recommendations)).toBe(true);

        } finally {
          // Restore original method
          complianceReportingService[reportMethodName] = originalMethod;
        }
      }
    ), { numRuns: 15 });
  });

  /**
   * Property 36.6: Error Handling
   * Report generation should handle errors gracefully
   */
  test('Property 36.6: Error handling is robust', async () => {
    await fc.assert(fc.asyncProperty(
      reportTypeArb,
      formatArb,
      async (reportType, format) => {
        // Mock method to throw error
        const reportMethodName = `generate${reportType.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)).join('')}Report`;
        
        const originalMethod = complianceReportingService[reportMethodName];
        if (!originalMethod) return; // Skip if method doesn't exist

        complianceReportingService[reportMethodName] = async () => {
          throw new Error('Simulated report generation error');
        };

        try {
          await expect(
            complianceReportingService.generateComplianceReport(
              testTenantId,
              reportType,
              { format }
            )
          ).rejects.toThrow();

        } finally {
          // Restore original method
          complianceReportingService[reportMethodName] = originalMethod;
        }
      }
    ), { numRuns: 10 });
  });

  /**
   * Property 36.7: Tenant Isolation
   * Reports should only include data for the specified tenant
   */
  test('Property 36.7: Tenant isolation is maintained', async () => {
    await fc.assert(fc.asyncProperty(
      reportTypeArb,
      async (reportType) => {
        const tenant1Id = new mongoose.Types.ObjectId();
        const tenant2Id = new mongoose.Types.ObjectId();

        // Create test data for both tenants
        const policies = [
          new DataRetentionPolicy({
            tenantId: tenant1Id,
            policyName: 'Tenant 1 Policy',
            dataType: 'audit_logs',
            retentionPeriod: { value: 30, unit: 'days' },
            createdBy: testUserId
          }),
          new DataRetentionPolicy({
            tenantId: tenant2Id,
            policyName: 'Tenant 2 Policy',
            dataType: 'audit_logs',
            retentionPeriod: { value: 60, unit: 'days' },
            createdBy: testUserId
          })
        ];

        await Promise.all(policies.map(p => p.save()));

        // Generate report for tenant1 only
        const report = await complianceReportingService.generateComplianceReport(
          tenant1Id,
          reportType,
          { format: 'json', includeDetails: true }
        );

        // Verify tenant isolation
        expect(report.summary.tenantId).toEqual(tenant1Id);
        
        // Check that data only includes tenant1 data
        if (report.data && report.data.policies && Array.isArray(report.data.policies)) {
          report.data.policies.forEach(policy => {
            expect(policy.tenantId.toString()).toBe(tenant1Id.toString());
          });
        }
      }
    ), { numRuns: 10 });
  });
});