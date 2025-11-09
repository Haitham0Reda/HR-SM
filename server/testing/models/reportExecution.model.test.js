import mongoose from 'mongoose';
import ReportExecution from '../../models/reportExecution.model.js';
import Report from '../../models/report.model.js';
import User from '../../models/user.model.js';
import School from '../../models/school.model.js';

let report;
let user;
let school;

beforeEach(async () => {
  // Clear report executions collection
  await ReportExecution.deleteMany({});
  
  // Create school first
  school = await School.create({
    schoolCode: 'ENG',
    name: 'School of Engineering',
    arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
  });

  // Create user for testing
  user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'hr',
    employeeId: 'EMP001',
    school: school._id
  });
  
  // Create report for testing
  report = await Report.create({
    name: 'Test Report',
    reportType: 'attendance',
    createdBy: user._id
  });
});

describe('ReportExecution Model', () => {
  it('should create a new report execution with default values', async () => {
    const execution = await ReportExecution.create({
      report: report._id,
      reportName: 'Test Report',
      executedBy: user._id
    });

    expect(execution.report.toString()).toBe(report._id.toString());
    expect(execution.reportName).toBe('Test Report');
    expect(execution.executedBy.toString()).toBe(user._id.toString());
    expect(execution.executionType).toBe('manual');
    expect(execution.status).toBe('pending');
  });

  it('should validate executionType enum values', async () => {
    const validTypes = ['manual', 'scheduled', 'api'];
    
    for (const type of validTypes) {
      const execution = new ReportExecution({
        report: report._id,
        executionType: type
      });
      
      await expect(execution.validate()).resolves.toBeUndefined();
    }
    
    // Test invalid type
    const invalidExecution = new ReportExecution({
      report: report._id,
      executionType: 'invalid-type'
    });
    
    await expect(invalidExecution.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate status enum values', async () => {
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    
    for (const status of validStatuses) {
      const execution = new ReportExecution({
        report: report._id,
        status: status
      });
      
      await expect(execution.validate()).resolves.toBeUndefined();
    }
    
    // Test invalid status
    const invalidExecution = new ReportExecution({
      report: report._id,
      status: 'invalid-status'
    });
    
    await expect(invalidExecution.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate export format enum values', async () => {
    const validFormats = ['excel', 'pdf', 'csv', 'html', 'json'];
    
    for (const format of validFormats) {
      const execution = new ReportExecution({
        report: report._id,
        exportFormat: format
      });
      
      await expect(execution.validate()).resolves.toBeUndefined();
    }
    
    // Test invalid format
    const invalidExecution = new ReportExecution({
      report: report._id,
      exportFormat: 'invalid-format'
    });
    
    await expect(invalidExecution.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should mark execution as completed', async () => {
    const startTime = new Date();
    const execution = await ReportExecution.create({
      report: report._id,
      startTime: startTime
    });
    
    // Wait a bit to ensure duration calculation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const resultData = { test: 'data', count: 10 };
    const updatedExecution = await execution.markCompleted(100, resultData);
    
    expect(updatedExecution.status).toBe('completed');
    expect(updatedExecution.endTime).toBeDefined();
    expect(updatedExecution.duration).toBeGreaterThan(0);
    expect(updatedExecution.resultCount).toBe(100);
    expect(updatedExecution.resultData).toEqual(resultData);
  });

  it('should mark execution as failed', async () => {
    const startTime = new Date();
    const execution = await ReportExecution.create({
      report: report._id,
      startTime: startTime
    });
    
    // Wait a bit to ensure duration calculation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const error = new Error('Report generation failed');
    error.code = 'REPORT_ERROR';
    error.stack = 'Error stack trace';
    
    const updatedExecution = await execution.markFailed(error);
    
    expect(updatedExecution.status).toBe('failed');
    expect(updatedExecution.endTime).toBeDefined();
    expect(updatedExecution.duration).toBeGreaterThan(0);
    expect(updatedExecution.error.message).toBe('Report generation failed');
    expect(updatedExecution.error.code).toBe('REPORT_ERROR');
    expect(updatedExecution.error.stack).toBe('Error stack trace');
  });

  it('should get execution history for a report', async () => {
    // Create multiple executions
    await ReportExecution.create([
      {
        report: report._id,
        status: 'completed',
        resultCount: 50
      },
      {
        report: report._id,
        status: 'failed'
      },
      {
        report: report._id,
        status: 'completed',
        resultCount: 75
      }
    ]);
    
    const history = await ReportExecution.getHistory(report._id);
    
    expect(history).toHaveLength(3);
    // Should be sorted by createdAt descending (newest first)
    expect(history[0].createdAt.getTime()).toBeGreaterThanOrEqual(history[1].createdAt.getTime());
    
    // Check that executedBy is populated (or undefined if not set)
    expect(history[0].executedBy).toBeUndefined(); // No executedBy set
  });

  it('should get execution history with populated user', async () => {
    // Create execution with executedBy
    await ReportExecution.create({
      report: report._id,
      executedBy: user._id,
      status: 'completed'
    });
    
    const history = await ReportExecution.getHistory(report._id);
    
    expect(history).toHaveLength(1);
    expect(history[0].executedBy).toBeDefined();
    expect(history[0].executedBy.username).toBe('testuser');
    expect(history[0].executedBy.email).toBe('test@example.com');
  });

  it('should get statistics for report executions', async () => {
    // Create multiple executions with different statuses
    await ReportExecution.create([
      {
        report: report._id,
        status: 'completed',
        duration: 1000,
        resultCount: 50
      },
      {
        report: report._id,
        status: 'completed',
        duration: 2000,
        resultCount: 75
      },
      {
        report: report._id,
        status: 'failed',
        duration: 500,
        resultCount: 0
      }
    ]);
    
    const stats = await ReportExecution.getStatistics(report._id);
    
    expect(stats).toHaveLength(2); // completed and failed
    
    const completedStats = stats.find(s => s._id === 'completed');
    const failedStats = stats.find(s => s._id === 'failed');
    
    expect(completedStats.count).toBe(2);
    expect(completedStats.avgDuration).toBe(1500); // (1000 + 2000) / 2
    expect(completedStats.totalRecords).toBe(125); // 50 + 75
    expect(failedStats.count).toBe(1);
    expect(failedStats.totalRecords).toBe(0);
  });

  it('should handle parameters correctly', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    
    const execution = await ReportExecution.create({
      report: report._id,
      parameters: {
        startDate: startDate,
        endDate: endDate,
        filters: { department: 'IT' },
        additionalParams: { format: 'detailed' }
      }
    });

    expect(execution.parameters.startDate.toISOString()).toBe(startDate.toISOString());
    expect(execution.parameters.endDate.toISOString()).toBe(endDate.toISOString());
    expect(execution.parameters.filters).toEqual({ department: 'IT' });
    expect(execution.parameters.additionalParams).toEqual({ format: 'detailed' });
  });

  it('should handle export information', async () => {
    const execution = await ReportExecution.create({
      report: report._id,
      exportFormat: 'excel',
      exportPath: '/reports/test-report.xlsx',
      exportSize: 102400 // 100KB
    });

    expect(execution.exportFormat).toBe('excel');
    expect(execution.exportPath).toBe('/reports/test-report.xlsx');
    expect(execution.exportSize).toBe(102400);
  });

  it('should handle email delivery information', async () => {
    const execution = await ReportExecution.create({
      report: report._id,
      emailSent: true,
      emailRecipients: ['user1@example.com', 'user2@example.com'],
      emailSentAt: new Date()
    });

    expect(execution.emailSent).toBe(true);
    expect(execution.emailRecipients).toEqual(['user1@example.com', 'user2@example.com']);
    expect(execution.emailSentAt).toBeDefined();
  });
});