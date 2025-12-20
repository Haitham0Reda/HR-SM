import mongoose from 'mongoose';
import Holiday from '../../modules/hr-core/holidays/models/holiday.model.js';
// organization model removed - not needed for general HR system

// organization variable removed
// beforeAll(async () => {
//   organization = await organization.create({
//     organizationCode: 'ENG',
//     name: 'organization of Engineering',
//     arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
//   });
// });

afterAll(async () => {
  // Clean up test data
});

describe('Holiday Model', () => {
  it('should create a new holiday document with default values', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    expect(holiday.tenantId).toBe('test_tenant_123');
    expect(holiday.officialHolidays).toEqual([]);
    expect(holiday.weekendWorkDays).toEqual([]);
    expect(holiday.earlyLeaveDates).toEqual([]);
    expect(holiday.weekendDays).toEqual([5, 6]); // Default Friday and Saturday
  });

  it('should add an official holiday', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    const updatedHoliday = await holiday.addOfficialHoliday('01-01-2024', 'New Year', 'New Year Celebration');

    expect(updatedHoliday.officialHolidays).toHaveLength(1);
    expect(updatedHoliday.officialHolidays[0].name).toBe('New Year');
    expect(updatedHoliday.officialHolidays[0].description).toBe('New Year Celebration');
    expect(updatedHoliday.officialHolidays[0].dayOfWeek).toBe('Monday');
    expect(updatedHoliday.officialHolidays[0].isWeekend).toBe(false);
  });

  it('should throw error for invalid date format when adding holiday', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    // Test synchronous error throwing
    expect(() => {
      holiday.addOfficialHoliday('invalid-date', 'Test Holiday');
    }).toThrow('Invalid date format: invalid-date. Use DD-MM-YYYY format.');
  });

  it('should prevent adding duplicate holidays', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    await holiday.addOfficialHoliday('01-01-2024', 'New Year');

    // Test synchronous error throwing
    expect(() => {
      holiday.addOfficialHoliday('01-01-2024', 'Another New Year');
    }).toThrow('Holiday already exists for date: 01-01-2024');
  });

  it('should add multiple holidays from comma-separated string', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    const result = holiday.addMultipleHolidays('01-01-2024,15-01-2024,20-01-2024', 'Official Holiday');

    expect(result.added).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(holiday.officialHolidays).toHaveLength(3);
  });

  it('should handle errors when adding multiple holidays with invalid dates', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    const result = holiday.addMultipleHolidays('01-01-2024,invalid-date,20-01-2024', 'Official Holiday');

    expect(result.added).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].date).toBe('invalid-date');
    expect(holiday.officialHolidays).toHaveLength(2);
  });

  it('should add a weekend work day', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    const updatedHoliday = await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day for holiday');

    expect(updatedHoliday.weekendWorkDays).toHaveLength(1);
    expect(updatedHoliday.weekendWorkDays[0].reason).toBe('Makeup day for holiday');
    expect(updatedHoliday.weekendWorkDays[0].dayOfWeek).toBe('Saturday');
  });

  it('should prevent adding duplicate weekend work days', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day');

    // Test synchronous error throwing
    expect(() => {
      holiday.addWeekendWorkDay('06-01-2024', 'Another makeup day');
    }).toThrow('Weekend work day already exists for date: 06-01-2024');
  });

  it('should check if a date is a holiday', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    await holiday.addOfficialHoliday('01-01-2024', 'New Year');

    expect(holiday.isHoliday(new Date('2024-01-01'))).toBe(true);
    expect(holiday.isHoliday(new Date('2024-01-02'))).toBe(false);
  });

  it('should check if a date is a weekend work day', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day');

    expect(holiday.isWeekendWorkDay(new Date('2024-01-06'))).toBe(true);
    expect(holiday.isWeekendWorkDay(new Date('2024-01-07'))).toBe(false);
  });

  it('should determine if a date is a working day', async () => {
    const holiday = await Holiday.create({
      // location: organization._id
      // Using a placeholder since organization is not defined
      location: 'test-location-id',
      tenantId: 'test_tenant_123'
    });

    // Add a holiday (should not be working day)
    await holiday.addOfficialHoliday('01-01-2024', 'New Year');

    // Add a weekend work day (should be working day)
    await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day');

    // Default weekend day (should not be working day)
    const defaultWeekend = new Date('2024-01-05'); // Friday

    // Regular weekday (should be working day)
    const regularWeekday = new Date('2024-01-02'); // Tuesday

    expect(holiday.isWorkingDay(new Date('2024-01-01'))).toBe(false); // Holiday
    expect(holiday.isWorkingDay(new Date('2024-01-06'))).toBe(true);  // Weekend work day
    expect(holiday.isWorkingDay(defaultWeekend)).toBe(false);         // Default weekend
    expect(holiday.isWorkingDay(regularWeekday)).toBe(true);          // Regular weekday
  });

  it('should get or create holiday settings for location', async () => {
    // First call should create new settings
    const holidaySettings = await Holiday.getOrCreateForTenant('test_tenant_123');

    expect(holidaySettings.tenantId).toBe('test_tenant_123');
    expect(holidaySettings.officialHolidays).toEqual([]);
    expect(holidaySettings.weekendDays).toEqual([5, 6]);

    // Second call should return existing settings
    const sameSettings = await Holiday.getOrCreateForTenant('test_tenant_123');

    expect(sameSettings._id.toString()).toBe(holidaySettings._id.toString());
  });

  it('should identify Islamic holidays', () => {
    const islamicHolidays = [
      'Eid al-Fitr',
      'Eid al-Adha',
      'Ramadan',
      'Muharram',
      'Mawlid al-Nabi'
    ];

    const nonIslamicHolidays = [
      'New Year',
      'Christmas',
      'Independence Day',
      'Labor Day'
    ];

    islamicHolidays.forEach(holidayName => {
      expect(Holiday.isIslamicHoliday(holidayName)).toBe(true);
    });

    nonIslamicHolidays.forEach(holidayName => {
      expect(Holiday.isIslamicHoliday(holidayName)).toBe(false);
    });
  });
});
