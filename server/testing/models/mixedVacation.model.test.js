import mongoose from 'mongoose';
import MixedVacation from '../../models/mixedVacation.model.js';
import User from '../../models/user.model.js';
import School from '../../models/school.model.js';
import Department from '../../models/department.model.js';
import VacationBalance from '../../models/vacationBalance.model.js';
import Holiday from '../../models/holiday.model.js';

let user;
let school;
let department;

beforeAll(async () => {
  school = await School.create({
    name: 'School of Engineering',
    schoolCode: 'ENG',
    arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
  });

  department = await Department.create({
    name: 'Test Department',
    code: 'TEST',
    school: school._id
  });

  user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'employee',
    employeeId: 'EMP001',
    school: school._id,
    department: department._id
  });
});

afterEach(async () => {
  await VacationBalance.deleteMany({});
  await Holiday.deleteMany({});
});

describe('MixedVacation Model', () => {
  it('should create a new mixed vacation policy with required fields', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-10');

    const mixedVacation = await MixedVacation.create({
      name: 'Test Mixed Vacation',
      description: 'Test mixed vacation policy',
      startDate: startDate,
      endDate: endDate,
      totalDays: 10,
      personalDaysRequired: 7,
      createdBy: user._id
    });

    expect(mixedVacation.name).toBe('Test Mixed Vacation');
    expect(mixedVacation.startDate.toISOString()).toBe(startDate.toISOString());
    expect(mixedVacation.endDate.toISOString()).toBe(endDate.toISOString());
    expect(mixedVacation.totalDays).toBe(10);
    expect(mixedVacation.personalDaysRequired).toBe(7);
    expect(mixedVacation.status).toBe('draft');
  });

  it('should validate deduction strategy enum values', async () => {
    const validStrategies = ['annual-first', 'casual-first', 'proportional', 'auto'];

    for (const strategy of validStrategies) {
      const mixedVacation = new MixedVacation({
        name: 'Test Policy',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
        totalDays: 10,
        personalDaysRequired: 7,
        deductionStrategy: strategy,
        createdBy: user._id
      });

      await expect(mixedVacation.validate()).resolves.toBeUndefined();
    }

    // Test invalid strategy
    const invalidPolicy = new MixedVacation({
      name: 'Invalid Policy',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-10'),
      totalDays: 10,
      personalDaysRequired: 7,
      deductionStrategy: 'invalid',
      createdBy: user._id
    });

    await expect(invalidPolicy.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate status enum values', async () => {
    const validStatuses = ['draft', 'active', 'completed', 'cancelled'];

    for (const status of validStatuses) {
      const mixedVacation = new MixedVacation({
        name: 'Test Policy',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
        totalDays: 10,
        personalDaysRequired: 7,
        status: status,
        createdBy: user._id
      });

      await expect(mixedVacation.validate()).resolves.toBeUndefined();
    }

    // Test invalid status
    const invalidPolicy = new MixedVacation({
      name: 'Invalid Policy',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-10'),
      totalDays: 10,
      personalDaysRequired: 7,
      status: 'invalid',
      createdBy: user._id
    });

    await expect(invalidPolicy.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should calculate virtual duration days correctly', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-10'); // 10 days including both start and end

    const mixedVacation = await MixedVacation.create({
      name: 'Test Policy',
      startDate: startDate,
      endDate: endDate,
      totalDays: 10,
      personalDaysRequired: 7,
      createdBy: user._id
    });

    // Duration should be 10 days (Jan 1 to Jan 10 inclusive)
    expect(mixedVacation.durationDays).toBe(10);
  });

  it('should calculate personal days required', async () => {
    const mixedVacation = await MixedVacation.create({
      name: 'Test Policy',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-10'),
      totalDays: 10,
      officialHolidayCount: 3,
      personalDaysRequired: 0, // Will be calculated
      createdBy: user._id
    });

    const personalDays = mixedVacation.calculatePersonalDays();

    expect(personalDays).toBe(7); // 10 total - 3 holidays = 7 personal days
    expect(mixedVacation.personalDaysRequired).toBe(7);
  });

  it('should detect official holidays in date range', async () => {
    // Create holiday settings
    const holiday = await Holiday.create({
      campus: school._id,
      officialHolidays: [
        {
          date: new Date('2024-01-05'),
          name: 'Test Holiday',
          dayOfWeek: 'Friday'
        }
      ]
    });

    const mixedVacation = await MixedVacation.create({
      name: 'Test Policy',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-10'),
      totalDays: 10,
      officialHolidayCount: 0,
      personalDaysRequired: 10, // Will be updated
      createdBy: user._id
    });

    const updatedPolicy = await mixedVacation.detectOfficialHolidays(school._id);

    expect(updatedPolicy.officialHolidays).toHaveLength(1);
    expect(updatedPolicy.officialHolidays[0].name).toBe('Test Holiday');
    expect(updatedPolicy.officialHolidayCount).toBe(1);
    expect(updatedPolicy.personalDaysRequired).toBe(9); // 10 total - 1 holiday = 9 personal days
  });
});