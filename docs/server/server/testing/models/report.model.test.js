import mongoose from 'mongoose';
import Report from '../../modules/reports/models/report.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';

let user;

beforeAll(async () => {
  // Create user for testing
  user = await User.create({
    tenantId: 'test_tenant_123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'hr',
    employeeId: 'EMP001'
  });
});

afterAll(async () => {
  // Clean up test data
});

describe('Report Model', () => {
  it('should create a new report with required fields', async () => {
    const report = await Report.create({
      name: 'Employee Attendance Report',
      description: 'Monthly attendance report for all employees',
      reportType: 'attendance',
      createdBy: user._id
    });

    expect(report.name).toBe('Employee Attendance Report');
    expect(report.description).toBe('Monthly attendance report for all employees');
    expect(report.reportType).toBe('attendance');
    expect(report.createdBy.toString()).toBe(user._id.toString());
    expect(report.isActive).toBe(true);
  });

  it('should validate reportType enum values', async () => {
    const validTypes = [
      'employee',
      'attendance',
      'leave',
      'payroll',
      'performance',
      'request',
      'department',
      'custom'
    ];

    for (const type of validTypes) {
      const report = new Report({
        name: 'Test Report',
        reportType: type,
        createdBy: user._id
      });

      await expect(report.validate()).resolves.toBeUndefined();
    }

    // Test invalid type
    const invalidReport = new Report({
      name: 'Invalid Report',
      reportType: 'invalid-type',
      createdBy: user._id
    });

    await expect(invalidReport.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate field data types', async () => {
    const validDataTypes = ['string', 'number', 'date', 'boolean', 'array', 'object'];

    for (const dataType of validDataTypes) {
      const report = new Report({
        name: 'Test Report',
        reportType: 'custom',
        fields: [{
          fieldName: 'testField',
          dataType: dataType
        }],
        createdBy: user._id
      });

      await expect(report.validate()).resolves.toBeUndefined();
    }

    // Test invalid data type
    const invalidReport = new Report({
      name: 'Invalid Report',
      reportType: 'custom',
      fields: [{
        fieldName: 'testField',
        dataType: 'invalid-type'
      }],
      createdBy: user._id
    });

    await expect(invalidReport.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate field aggregation types', async () => {
    const validAggregations = ['sum', 'avg', 'count', 'min', 'max', 'none'];

    for (const aggregation of validAggregations) {
      const report = new Report({
        name: 'Test Report',
        reportType: 'custom',
        fields: [{
          fieldName: 'testField',
          aggregation: aggregation
        }],
        createdBy: user._id
      });

      await expect(report.validate()).resolves.toBeUndefined();
    }

    // Test invalid aggregation
    const invalidReport = new Report({
      name: 'Invalid Report',
      reportType: 'custom',
      fields: [{
        fieldName: 'testField',
        aggregation: 'invalid-aggregation'
      }],
      createdBy: user._id
    });

    await expect(invalidReport.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate filter operators', async () => {
    const validOperators = [
      'equals',
      'notEquals',
      'contains',
      'notContains',
      'startsWith',
      'endsWith',
      'greaterThan',
      'lessThan',
      'greaterThanOrEqual',
      'lessThanOrEqual',
      'between',
      'in',
      'notIn',
      'isNull',
      'isNotNull'
    ];

    for (const operator of validOperators) {
      const report = new Report({
        name: 'Test Report',
        reportType: 'custom',
        filters: [{
          field: 'testField',
          operator: operator,
          value: 'testValue'
        }],
        createdBy: user._id
      });

      await expect(report.validate()).resolves.toBeUndefined();
    }

    // Test invalid operator
    const invalidReport = new Report({
      name: 'Invalid Report',
      reportType: 'custom',
      filters: [{
        field: 'testField',
        operator: 'invalid-operator',
        value: 'testValue'
      }],
      createdBy: user._id
    });

    await expect(invalidReport.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should calculate next run time for scheduled reports', async () => {
    const now = new Date();
    const report = await Report.create({
      name: 'Scheduled Report',
      reportType: 'attendance',
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '09:00'
      },
      createdBy: user._id
    });

    const nextRun = report.calculateNextRun();
    expect(nextRun).toBeDefined();
    expect(nextRun instanceof Date).toBe(true);

    // For daily reports, next run should be today or tomorrow at 9:00 AM
    const expectedTime = new Date(nextRun);
    expectedTime.setHours(9, 0, 0, 0);
    expect(nextRun.getTime()).toBeGreaterThanOrEqual(expectedTime.getTime());
  });

  it('should not calculate next run time for disabled schedules', async () => {
    const report = await Report.create({
      name: 'Disabled Scheduled Report',
      reportType: 'attendance',
      schedule: {
        enabled: false
      },
      createdBy: user._id
    });

    const nextRun = report.calculateNextRun();
    expect(nextRun).toBeNull();
  });

  it('should generate report with filters', async () => {
    const report = await Report.create({
      name: 'Filtered Report',
      reportType: 'custom',
      filters: [{
        field: 'status',
        operator: 'equals',
        value: 'active'
      }],
      createdBy: user._id
    });

    expect(report.filters).toHaveLength(1);
    expect(report.filters[0].field).toBe('status');
    expect(report.filters[0].operator).toBe('equals');
    expect(report.filters[0].value).toBe('active');
  });

  it('should generate report with fields configuration', async () => {
    const report = await Report.create({
      name: 'Field Config Report',
      reportType: 'custom',
      fields: [{
        fieldName: 'employeeName',
        displayName: 'Employee Name',
        dataType: 'string',
        aggregation: 'none'
      }, {
        fieldName: 'salary',
        displayName: 'Salary',
        dataType: 'number',
        aggregation: 'sum'
      }],
      createdBy: user._id
    });

    expect(report.fields).toHaveLength(2);
    expect(report.fields[0].fieldName).toBe('employeeName');
    expect(report.fields[0].displayName).toBe('Employee Name');
    expect(report.fields[0].dataType).toBe('string');
    expect(report.fields[0].aggregation).toBe('none');
    expect(report.fields[1].fieldName).toBe('salary');
    expect(report.fields[1].displayName).toBe('Salary');
    expect(report.fields[1].dataType).toBe('number');
    expect(report.fields[1].aggregation).toBe('sum');
  });
});