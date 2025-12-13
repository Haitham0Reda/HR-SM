import mongoose from 'mongoose';
import Holiday from '../../modules/hr-core/holidays/models/holiday.model.js';

const TEST_TENANT_ID = 'test_tenant_123';

describe('Holiday Model', () => {
  it('should create a new holiday document with default values', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
    });

    expect(holiday.officialHolidays).toEqual([]);
    expect(holiday.weekendWorkDays).toEqual([]);
    expect(holiday.earlyLeaveDates).toEqual([]);
    expect(holiday.weekendDays).toEqual([5, 6]);
  });

  it('should add an official holiday', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
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
      tenantId: TEST_TENANT_ID
    });

    expect(() => {
      holiday.addOfficialHoliday('invalid-date', 'Test Holiday');
    }).toThrow('Invalid date format: invalid-date. Use DD-MM-YYYY format.');
  });

  it('should prevent adding duplicate holidays', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
    });

    await holiday.addOfficialHoliday('01-01-2024', 'New Year');

    expect(() => {
      holiday.addOfficialHoliday('01-01-2024', 'Another New Year');
    }).toThrow('Holiday already exists for date: 01-01-2024');
  });

  it('should add multiple holidays from comma-separated string', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
    });

    const result = holiday.addMultipleHolidays('01-01-2024,15-01-2024,20-01-2024', 'Official Holiday');

    expect(result.added).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(holiday.officialHolidays).toHaveLength(3);
  });

  it('should handle errors when adding multiple holidays with invalid dates', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
    });

    const result = holiday.addMultipleHolidays('01-01-2024,invalid-date,20-01-2024', 'Official Holiday');

    expect(result.added).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].date).toBe('invalid-date');
    expect(holiday.officialHolidays).toHaveLength(2);
  });

  it('should add a weekend work day', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
    });

    const updatedHoliday = await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day for holiday');

    expect(updatedHoliday.weekendWorkDays).toHaveLength(1);
    expect(updatedHoliday.weekendWorkDays[0].reason).toBe('Makeup day for holiday');
    expect(updatedHoliday.weekendWorkDays[0].dayOfWeek).toBe('Saturday');
  });

  it('should prevent adding duplicate weekend work days', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
    });

    await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day');

    expect(() => {
      holiday.addWeekendWorkDay('06-01-2024', 'Another makeup day');
    }).toThrow('Weekend work day already exists for date: 06-01-2024');
  });

  it('should check if a date is a holiday', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
    });

    await holiday.addOfficialHoliday('01-01-2024', 'New Year');

    expect(holiday.isHoliday(new Date('2024-01-01'))).toBe(true);
    expect(holiday.isHoliday(new Date('2024-01-02'))).toBe(false);
  });

  it('should check if a date is a weekend work day', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
    });

    await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day');

    expect(holiday.isWeekendWorkDay(new Date('2024-01-06'))).toBe(true);
    expect(holiday.isWeekendWorkDay(new Date('2024-01-07'))).toBe(false);
  });

  it('should determine if a date is a working day', async () => {
    const holiday = await Holiday.create({
      tenantId: TEST_TENANT_ID
    });

    await holiday.addOfficialHoliday('01-01-2024', 'New Year');
    await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day');

    const defaultWeekend = new Date('2024-01-05');
    const regularWeekday = new Date('2024-01-02');

    expect(holiday.isWorkingDay(new Date('2024-01-01'))).toBe(false);
    expect(holiday.isWorkingDay(new Date('2024-01-06'))).toBe(true);
    expect(holiday.isWorkingDay(defaultWeekend)).toBe(false);
    expect(holiday.isWorkingDay(regularWeekday)).toBe(true);
  });

  it('should get or create holiday settings for tenant', async () => {
    const holidaySettings = await Holiday.getOrCreateForTenant(TEST_TENANT_ID);

    expect(holidaySettings.tenantId).toBe(TEST_TENANT_ID);
    expect(holidaySettings.officialHolidays).toEqual([]);
    expect(holidaySettings.weekendDays).toEqual([5, 6]);

    const sameSettings = await Holiday.getOrCreateForTenant(TEST_TENANT_ID);

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
