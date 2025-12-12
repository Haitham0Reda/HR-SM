import mongoose from 'mongoose';
import ReportConfig from '../../modules/reports/models/reportConfig.model.js';
// organization model removed - not needed for general HR system

// organization variable removed
beforeAll(async () => {
  organization = await organization.create({
    name: 'organization of Engineering'Code: 'ENG',
    arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
  });
});

afterAll(async () => {
  // Clean up test data
});

describe('ReportConfig Model', () => {
  it('should create a new report configuration with default values', async () => {
    const config = await ReportConfig.create({
      organization: 'test-org'
    });

    expect(config.organization).toBe('test-org');
    expect(config.hrMonth.startDay).toBe(21);
    expect(config.hrMonth.endDay).toBe(20);
    expect(config.hrMonth.isDefault).toBe(true);
    expect(config.isActive).toBe(true);
  });

  it('should validate hrMonth startDay range', async () => {
    // Valid start day
    const validConfig = new ReportConfig({
      organization: 'test-org',
      'hrMonth.startDay': 15
    });

    await expect(validConfig.validate()).resolves.toBeUndefined();

    // Invalid start day (too low)
    const invalidLowConfig = new ReportConfig({
      organization: 'test-org',
      'hrMonth.startDay': 0
    });

    await expect(invalidLowConfig.validate()).rejects.toThrow(mongoose.Error.ValidationError);

    // Invalid start day (too high)
    const invalidHighConfig = new ReportConfig({
      organization: 'test-org',
      'hrMonth.startDay': 29
    });

    await expect(invalidHighConfig.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate payroll cycle types', async () => {
    const validTypes = ['monthly', 'bi-weekly', 'weekly', 'custom'];

    for (const type of validTypes) {
      const config = new ReportConfig({
        organization: 'test-org',
        'payrollCycle.type': type
      });

      await expect(config.validate()).resolves.toBeUndefined();
    }

    // Test invalid type
    const invalidConfig = new ReportConfig({
      organization: 'test-org',
      'payrollCycle.type': 'invalid-type'
    });

    await expect(invalidConfig.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate report settings range types', async () => {
    const validRangeTypes = ['hr-month', 'current-month', 'previous-month', 'custom'];

    for (const rangeType of validRangeTypes) {
      const config = new ReportConfig({
        organization: 'test-org',
        'reportSettings.defaultRangeType': rangeType
      });

      await expect(config.validate()).resolves.toBeUndefined();
    }

    // Test invalid range type
    const invalidConfig = new ReportConfig({
      organization: 'test-org',
      'reportSettings.defaultRangeType': 'invalid-range'
    });

    await expect(invalidConfig.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should calculate current HR month range correctly', async () => {
    const config = await ReportConfig.create({
      organization: 'test-org',
      'hrMonth.startDay': 21,
      'hrMonth.endDay': 20
    });

    const currentHRMonth = config.currentHRMonth;

    expect(currentHRMonth.startDate).toBeInstanceOf(Date);
    expect(currentHRMonth.endDate).toBeInstanceOf(Date);
    expect(currentHRMonth.label).toContain('HR Month');
  });

  it('should calculate previous HR month range correctly', async () => {
    const config = await ReportConfig.create({
      organization: 'test-org',
      'hrMonth.startDay': 21,
      'hrMonth.endDay': 20
    });

    const previousHRMonth = config.previousHRMonth;

    expect(previousHRMonth.startDate).toBeInstanceOf(Date);
    expect(previousHRMonth.endDate).toBeInstanceOf(Date);
    expect(previousHRMonth.label).toContain('HR Month');
  });

  it('should calculate HR month with offset', async () => {
    const config = await ReportConfig.create({
      organization: 'test-org',
      'hrMonth.startDay': 15,
      'hrMonth.endDay': 14
    });

    const currentMonth = config.calculateHRMonth(0);
    const previousMonth = config.calculateHRMonth(-1);
    const nextMonth = config.calculateHRMonth(1);

    expect(currentMonth.startDate).toBeInstanceOf(Date);
    expect(previousMonth.startDate).toBeInstanceOf(Date);
    expect(nextMonth.startDate).toBeInstanceOf(Date);

    // Previous month should be before current month
    expect(previousMonth.startDate.getTime()).toBeLessThan(currentMonth.startDate.getTime());

    // Next month should be after current month
    expect(nextMonth.startDate.getTime()).toBeGreaterThan(currentMonth.startDate.getTime());
  });

  it('should calculate current calendar month range', async () => {
    const config = await ReportConfig.create({
      organization: 'test-org'
    });

    const currentMonth = config.calculateCurrentMonth();

    expect(currentMonth.startDate).toBeInstanceOf(Date);
    expect(currentMonth.endDate).toBeInstanceOf(Date);
    expect(currentMonth.label).toContain('Current Month');

    // Start date should be first day of month
    expect(currentMonth.startDate.getDate()).toBe(1);

    // End date should be last day of month
    const nextMonth = new Date(currentMonth.endDate);
    nextMonth.setDate(nextMonth.getDate() + 1);
    expect(nextMonth.getDate()).toBe(1);
  });

  it('should calculate previous calendar month range', async () => {
    const config = await ReportConfig.create({
      organization: 'test-org'
    });

    const previousMonth = config.calculatePreviousMonth();

    expect(previousMonth.startDate).toBeInstanceOf(Date);
    expect(previousMonth.endDate).toBeInstanceOf(Date);
    expect(previousMonth.label).toContain('Previous Month');

    // Start date should be first day of month
    expect(previousMonth.startDate.getDate()).toBe(1);

    // End date should be last day of month
    const nextMonth = new Date(previousMonth.endDate);
    nextMonth.setDate(nextMonth.getDate() + 1);
    expect(nextMonth.getDate()).toBe(1);
  });

  it('should get date range based on range type', async () => {
    const config = await ReportConfig.create({
      organization: 'test-org'
    });

    // Test HR month range
    const hrMonthRange = config.getDateRange('hr-month');
    expect(hrMonthRange.startDate).toBeInstanceOf(Date);
    expect(hrMonthRange.endDate).toBeInstanceOf(Date);
    expect(hrMonthRange.label).toContain('HR Month');

    // Test current month range
    const currentMonthRange = config.getDateRange('current-month');
    expect(currentMonthRange.startDate).toBeInstanceOf(Date);
    expect(currentMonthRange.endDate).toBeInstanceOf(Date);
    expect(currentMonthRange.label).toContain('Current Month');

    // Test previous month range
    const previousMonthRange = config.getDateRange('previous-month');
    expect(previousMonthRange.startDate).toBeInstanceOf(Date);
    expect(previousMonthRange.endDate).toBeInstanceOf(Date);
    expect(previousMonthRange.label).toContain('Previous Month');

    // Test custom range
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const customRange = config.getDateRange('custom', startDate, endDate);
    expect(customRange.startDate.getTime()).toBe(startDate.getTime());
    expect(customRange.endDate.getTime()).toBe(endDate.getTime());
    expect(customRange.label).toContain('Custom Range');
  });


  it('should handle report settings custom date ranges', async () => {
    const config = await ReportConfig.create({
      organization: 'test-org',
      'reportSettings.defaultRangeType': 'custom',
      'reportSettings.customStartDate': new Date('2024-01-01'),
      'reportSettings.customEndDate': new Date('2024-01-31')
    });

    expect(config.reportSettings.defaultRangeType).toBe('custom');
    expect(config.reportSettings.customStartDate).toBeInstanceOf(Date);
    expect(config.reportSettings.customEndDate).toBeInstanceOf(Date);
  });
});