import mongoose from 'mongoose';
import ReportExport from '../../modules/reports/models/reportExport.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';
import organization from '../../platform/models/organization.model.js';
import Position from '../../modules/hr-core/users/models/position.model.js';

let user;
let department;
let organization;
let position;

beforeAll(async () => {
  // Create required references
  organization = await organization.create({
    name: 'organization of Engineering',
    organizationCode: 'ENG',
    arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
  });

  department = await Department.create({
      tenantId: 'test_tenant_123',
    name: 'Test Department',
    code: 'TEST',
    organization: organization._id
  });

  position = await Position.create({
    title: 'Test Position',
    code: 'TP001',
    department: department._id
  });

  user = await User.create({
      tenantId: 'test_tenant_123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'hr',
    employeeId: 'EMP001',
    organization: organization._id,
    department: department._id,
    position: position._id
  });
});

beforeEach(async () => {
  await ReportExport.deleteMany({});
});

describe('ReportExport Model', () => {
  it('should create a new report export with required fields', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const reportExport = await ReportExport.create({
      reportType: 'attendance-summary',
      title: 'Attendance Summary Report',
      exportFormat: 'excel',
      dateRange: {
        startDate: startDate,
        endDate: endDate,
        label: 'January 2024'
      },
      generatedBy: user._id,
      organization: 'test-org'
    });

    expect(reportExport.reportType).toBe('attendance-summary');
    expect(reportExport.title).toBe('Attendance Summary Report');
    expect(reportExport.exportFormat).toBe('excel');
    expect(reportExport.dateRange.startDate.toISOString()).toBe(startDate.toISOString());
    expect(reportExport.dateRange.endDate.toISOString()).toBe(endDate.toISOString());
    expect(reportExport.generatedBy.toString()).toBe(user._id.toString());
    expect(reportExport.organization).toBe('test-org');
    expect(reportExport.status).toBe('pending');
  });

  it('should validate reportType enum values', async () => {
    const validTypes = [
      'attendance-summary',
      'attendance-detail',
      'leave-summary',
      'leave-detail',
      'payroll-summary',
      'payroll-detail',
      'employee-roster',
      'vacation-balance',
      'permission-requests',
      'department-summary',
      'comprehensive-hr',
      'custom'
    ];

    for (const type of validTypes) {
      const reportExport = new ReportExport({
        reportType: type,
        title: 'Test Report',
        exportFormat: 'html',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        generatedBy: user._id
      });

      await expect(reportExport.validate()).resolves.toBeUndefined();
    }

    // Test invalid type
    const invalidReport = new ReportExport({
      reportType: 'invalid-type',
      title: 'Invalid Report',
      exportFormat: 'html',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id
    });

    await expect(invalidReport.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate exportFormat enum values', async () => {
    const validFormats = ['html', 'excel', 'pdf'];

    for (const format of validFormats) {
      const reportExport = new ReportExport({
        reportType: 'attendance-summary',
        title: 'Test Report',
        exportFormat: format,
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        generatedBy: user._id
      });

      await expect(reportExport.validate()).resolves.toBeUndefined();
    }

    // Test invalid format
    const invalidReport = new ReportExport({
      reportType: 'attendance-summary',
      title: 'Invalid Report',
      exportFormat: 'invalid-format',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id
    });

    await expect(invalidReport.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate date range types', async () => {
    const validRangeTypes = ['hr-month', 'current-month', 'previous-month', 'custom'];

    for (const rangeType of validRangeTypes) {
      const reportExport = new ReportExport({
        reportType: 'attendance-summary',
        title: 'Test Report',
        exportFormat: 'html',
        dateRange: {
          rangeType: rangeType,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          label: 'Test Range'
        },
        generatedBy: user._id
      });

      await expect(reportExport.validate()).resolves.toBeUndefined();
    }

    // Test invalid range type
    const invalidReport = new ReportExport({
      reportType: 'attendance-summary',
      title: 'Invalid Report',
      exportFormat: 'html',
      dateRange: {
        rangeType: 'invalid-range',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        label: 'Invalid Range'
      },
      generatedBy: user._id
    });

    await expect(invalidReport.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should calculate virtual properties correctly', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

    const reportExport = await ReportExport.create({
      reportType: 'attendance-summary',
      title: 'Test Report',
      exportFormat: 'pdf',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id,
      expiresAt: futureDate
    });

    expect(reportExport.isExpired).toBe(false);
    expect(reportExport.fileExtension).toBe('.pdf');
  });

  it('should handle expired reports', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    const reportExport = await ReportExport.create({
      reportType: 'attendance-summary',
      title: 'Expired Report',
      exportFormat: 'excel',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id,
      expiresAt: pastDate
    });

    expect(reportExport.isExpired).toBe(true);
    expect(reportExport.fileExtension).toBe('.xlsx');
  });

  it('should generate attendance report data', async () => {
    const reportExport = await ReportExport.create({
      reportType: 'attendance-summary',
      title: 'Attendance Report',
      exportFormat: 'html',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id
    });

    // This is a complex method that would require mocking the Attendance model
    // For now, we'll just test that the method exists
    expect(typeof reportExport.generateAttendanceReport).toBe('function');
  });

  it('should generate leave report data', async () => {
    const reportExport = await ReportExport.create({
      reportType: 'leave-summary',
      title: 'Leave Report',
      exportFormat: 'html',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id
    });

    // This is a complex method that would require mocking the Leave model
    // For now, we'll just test that the method exists
    expect(typeof reportExport.generateLeaveReport).toBe('function');
  });

  it('should generate payroll report data', async () => {
    const reportExport = await ReportExport.create({
      reportType: 'payroll-summary',
      title: 'Payroll Report',
      exportFormat: 'html',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id
    });

    // This is a complex method that would require mocking the Payroll model
    // For now, we'll just test that the method exists
    expect(typeof reportExport.generatePayrollReport).toBe('function');
  });

  it('should generate vacation balance report data', async () => {
    const reportExport = await ReportExport.create({
      reportType: 'vacation-balance',
      title: 'Vacation Balance Report',
      exportFormat: 'html',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id
    });

    // This is a complex method that would require mocking the VacationBalance model
    // For now, we'll just test that the method exists
    expect(typeof reportExport.generateVacationBalanceReport).toBe('function');
  });

  it('should mark export as completed', async () => {
    const reportExport = await ReportExport.create({
      reportType: 'attendance-summary',
      title: 'Test Report',
      exportFormat: 'excel',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id,
      'processing.startedAt': new Date(Date.now() - 5000) // 5 seconds ago
    });

    const filePath = '/reports/test-report.xlsx';
    const fileSize = 102400; // 100KB

    const updatedExport = await reportExport.markCompleted(filePath, fileSize);

    expect(updatedExport.status).toBe('completed');
    expect(updatedExport.processing.completedAt).toBeDefined();
    expect(updatedExport.processing.duration).toBeGreaterThan(0);
    expect(updatedExport.exportFile.filePath).toBe(filePath);
    expect(updatedExport.exportFile.fileSize).toBe(fileSize);
    expect(updatedExport.exportFile.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  it('should mark export as failed', async () => {
    const reportExport = await ReportExport.create({
      reportType: 'attendance-summary',
      title: 'Test Report',
      exportFormat: 'html',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id,
      'processing.startedAt': new Date(Date.now() - 3000) // 3 seconds ago
    });

    const errorMessage = 'Failed to generate report due to data error';
    const updatedExport = await reportExport.markFailed(errorMessage);

    expect(updatedExport.status).toBe('failed');
    expect(updatedExport.processing.completedAt).toBeDefined();
    expect(updatedExport.processing.duration).toBeGreaterThan(0);
    expect(updatedExport.processing.errorMessage).toBe(errorMessage);
  });

  it('should log access to the report', async () => {
    const reportExport = await ReportExport.create({
      reportType: 'attendance-summary',
      title: 'Test Report',
      exportFormat: 'pdf',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      generatedBy: user._id
    });

    const updatedExport = await reportExport.logAccess(user._id, 'download');

    expect(updatedExport.accessLog).toHaveLength(1);
    expect(updatedExport.accessLog[0].accessedBy.toString()).toBe(user._id.toString());
    expect(updatedExport.accessLog[0].action).toBe('download');
  });

  it('should create and generate report', async () => {
    const reportData = {
      reportType: 'attendance-summary',
      title: 'Created Report',
      exportFormat: 'excel',
      rangeType: 'current-month',
      organization: 'test-org',
      filters: {
        department: department._id
      }
    };

    const createdReport = await ReportExport.createReport(reportData, user._id);

    expect(createdReport.reportType).toBe('attendance-summary');
    expect(createdReport.title).toBe('Created Report');
    expect(createdReport.exportFormat).toBe('excel');
    expect(createdReport.generatedBy.toString()).toBe(user._id.toString());
    expect(createdReport.status).toBe('generating');
    expect(createdReport.processing.startedAt).toBeDefined();
  });

  it('should get user\'s export history', async () => {
    await ReportExport.create([
      {
        reportType: 'attendance-summary',
        title: 'User Report 1',
        exportFormat: 'html',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        generatedBy: user._id
      },
      {
        reportType: 'leave-summary',
        title: 'User Report 2',
        exportFormat: 'excel',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        generatedBy: user._id
      }
    ]);

    const userExports = await ReportExport.getUserExports(user._id);

    expect(userExports).toHaveLength(2);
    expect(userExports[0].generatedBy.toString()).toBe(user._id.toString());
    expect(userExports[1].generatedBy.toString()).toBe(user._id.toString());

    // Should be sorted by createdAt descending
    expect(userExports[0].createdAt.getTime()).toBeGreaterThanOrEqual(userExports[1].createdAt.getTime());
  });

  it('should get export statistics', async () => {
    await ReportExport.create([
      {
        reportType: 'attendance-summary',
        title: 'Attendance Report',
        exportFormat: 'html',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        generatedBy: user._id,
        status: 'completed',
        'exportFile.fileSize': 102400,
        'processing.duration': 5000
      },
      {
        reportType: 'attendance-summary',
        title: 'Attendance Report 2',
        exportFormat: 'excel',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        generatedBy: user._id,
        status: 'completed',
        'exportFile.fileSize': 204800,
        'processing.duration': 8000
      }
    ]);

    const stats = await ReportExport.getExportStats('default');

    expect(stats).toHaveLength(1);
    expect(stats[0]._id).toBe('attendance-summary');
    expect(stats[0].totalExports).toBe(2);
    expect(stats[0].formats).toHaveLength(2);
  });

  it('should handle filters correctly', async () => {
    const reportExport = await ReportExport.create({
      reportType: 'attendance-summary',
      title: 'Filtered Report',
      exportFormat: 'html',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      filters: {
        department: department._id,
        employee: user._id,
        position: position._id,
        status: ['present', 'absent'],
        leaveType: ['annual', 'casual'],
        customFilters: { test: 'value' }
      },
      generatedBy: user._id
    });

    expect(reportExport.filters.department.toString()).toBe(department._id.toString());
    expect(reportExport.filters.employee.toString()).toBe(user._id.toString());
    expect(reportExport.filters.position.toString()).toBe(position._id.toString());
    expect(reportExport.filters.status).toEqual(['present', 'absent']);
    expect(reportExport.filters.leaveType).toEqual(['annual', 'casual']);
    expect(reportExport.filters.customFilters).toEqual({ test: 'value' });
  });

  it('should handle export settings', async () => {
    const reportExport = await ReportExport.create({
      reportType: 'attendance-summary',
      title: 'Settings Report',
      exportFormat: 'pdf',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      settings: {
        includeCharts: true,
        includeRawData: false,
        pageOrientation: 'landscape',
        excelSettings: {
          includeFilters: true,
          freezeHeader: false,
          autoColumnWidth: true
        },
        pdfSettings: {
          includePageNumbers: true,
          includeHeader: false,
          includeFooter: true
        }
      },
      generatedBy: user._id
    });

    expect(reportExport.settings.includeCharts).toBe(true);
    expect(reportExport.settings.includeRawData).toBe(false);
    expect(reportExport.settings.pageOrientation).toBe('landscape');
    expect(reportExport.settings.excelSettings.includeFilters).toBe(true);
    expect(reportExport.settings.excelSettings.freezeHeader).toBe(false);
    expect(reportExport.settings.pdfSettings.includePageNumbers).toBe(true);
    expect(reportExport.settings.pdfSettings.includeHeader).toBe(false);
  });
});