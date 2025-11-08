import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Holiday from '../../models/holiday.model.js';
import School from '../../models/school.model.js';

let mongoServer;
let school;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Create a school for reference
  school = await School.create({
    schoolCode: 'ENG',
    name: 'School of Engineering',
    arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
  });
});

afterEach(async () => {
  await Holiday.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Holiday Model', () => {
  it('should create a new holiday document with default values', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    expect(holiday.campus.toString()).toBe(school._id.toString());
    expect(holiday.officialHolidays).toEqual([]);
    expect(holiday.weekendWorkDays).toEqual([]);
    expect(holiday.earlyLeaveDates).toEqual([]);
    expect(holiday.weekendDays).toEqual([5, 6]); // Default Friday and Saturday
  });

  it('should add an official holiday', async () => {
    const holiday = await Holiday.create({
      campus: school._id
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
      campus: school._id
    });

    await expect(holiday.addOfficialHoliday('invalid-date', 'Test Holiday'))
      .rejects.toThrow('Invalid date format: invalid-date. Use DD-MM-YYYY format.');
  });

  it('should prevent adding duplicate holidays', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    await holiday.addOfficialHoliday('01-01-2024', 'New Year');
    
    await expect(holiday.addOfficialHoliday('01-01-2024', 'Another New Year'))
      .rejects.toThrow('Holiday already exists for date: 01-01-2024');
  });

  it('should add multiple holidays from comma-separated string', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    const result = holiday.addMultipleHolidays('01-01-2024,15-01-2024,20-01-2024', 'Official Holiday');
    
    expect(result.added).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(holiday.officialHolidays).toHaveLength(3);
  });

  it('should handle errors when adding multiple holidays with invalid dates', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    const result = holiday.addMultipleHolidays('01-01-2024,invalid-date,20-01-2024', 'Official Holiday');
    
    expect(result.added).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].date).toBe('invalid-date');
    expect(holiday.officialHolidays).toHaveLength(2);
  });

  it('should add a weekend work day', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    const updatedHoliday = await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day for holiday');
    
    expect(updatedHoliday.weekendWorkDays).toHaveLength(1);
    expect(updatedHoliday.weekendWorkDays[0].reason).toBe('Makeup day for holiday');
    expect(updatedHoliday.weekendWorkDays[0].dayOfWeek).toBe('Saturday');
  });

  it('should prevent adding duplicate weekend work days', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day');
    
    await expect(holiday.addWeekendWorkDay('06-01-2024', 'Another makeup day'))
      .rejects.toThrow('Weekend work day already exists for date: 06-01-2024');
  });

  it('should check if a date is a holiday', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    await holiday.addOfficialHoliday('01-01-2024', 'New Year');
    
    expect(holiday.isHoliday(new Date('2024-01-01'))).toBe(true);
    expect(holiday.isHoliday(new Date('2024-01-02'))).toBe(false);
  });

  it('should check if a date is a weekend work day', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day');
    
    expect(holiday.isWeekendWorkDay(new Date('2024-01-06'))).toBe(true);
    expect(holiday.isWeekendWorkDay(new Date('2024-01-07'))).toBe(false);
  });

  it('should determine if a date is a working day', async () => {
    const holiday = await Holiday.create({
      campus: school._id
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

  it('should get or create holiday settings for campus', async () => {
    // First call should create new settings
    const holidaySettings = await Holiday.getOrCreateForCampus(school._id);
    
    expect(holidaySettings.campus.toString()).toBe(school._id.toString());
    expect(holidaySettings.officialHolidays).toEqual([]);
    expect(holidaySettings.weekendDays).toEqual([5, 6]);
    
    // Second call should return existing settings
    const sameSettings = await Holiday.getOrCreateForCampus(school._id);
    
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

  it('should calculate working days between dates', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    // Add holidays
    await holiday.addOfficialHoliday('01-01-2024', 'New Year');
    await holiday.addOfficialHoliday('02-01-2024', 'Day off');
    
    // Add weekend work day
    await holiday.addWeekendWorkDay('06-01-2024', 'Makeup day');
    
    const startDate = new Date('2024-01-01'); // Monday
    const endDate = new Date('2024-01-10');   // Wednesday
    
    // Expected working days:
    // Jan 1: Holiday (not working)
    // Jan 2: Holiday (not working)
    // Jan 3: Wednesday (working)
    // Jan 4: Thursday (working)
    // Jan 5: Friday (weekend, not working)
    // Jan 6: Saturday (weekend work day, working)
    // Jan 7: Sunday (weekend, not working)
    // Jan 8: Monday (working)
    // Jan 9: Tuesday (working)
    // Jan 10: Wednesday (working)
    // Total: 6 working days
    
    const workingDays = holiday.getWorkingDaysBetween(startDate, endDate);
    expect(workingDays).toBe(6);
  });

  it('should add early leave date', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    const updatedHoliday = await holiday.addEarlyLeaveDate('15-01-2024', 'Half day before holiday');
    
    expect(updatedHoliday.earlyLeaveDates).toHaveLength(1);
    expect(updatedHoliday.earlyLeaveDates[0].reason).toBe('Half day before holiday');
    expect(updatedHoliday.earlyLeaveDates[0].dayOfWeek).toBe('Monday');
  });

  it('should prevent adding duplicate early leave dates', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    await holiday.addEarlyLeaveDate('15-01-2024', 'Half day');
    
    await expect(holiday.addEarlyLeaveDate('15-01-2024', 'Another half day'))
      .rejects.toThrow('Early leave date already exists for date: 15-01-2024');
  });

  it('should check if date is early leave date', async () => {
    const holiday = await Holiday.create({
      campus: school._id
    });

    await holiday.addEarlyLeaveDate('15-01-2024', 'Half day');
    
    expect(holiday.isEarlyLeaveDate(new Date('2024-01-15'))).toBe(true);
    expect(holiday.isEarlyLeaveDate(new Date('2024-01-16'))).toBe(false);
  });
});