import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Holiday from '../../../models/holiday.model.js';
import School from '../../../models/school.model.js';
import User from '../../../models/user.model.js';
import {
  getHolidaySettings,
  updateHolidaySettings,
  addOfficialHolidays,
  removeOfficialHoliday,
  addWeekendWorkDays,
  removeWeekendWorkDay,
  getHolidaySuggestions,
  addFromSuggestions,
  checkWorkingDay,
  parseDateString
} from '../../../controller/holiday.controller.js';

// Import Jest globals explicitly for ES modules
import { jest } from '@jest/globals';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Holiday Controller', () => {
  let testUser;
  let testSchool;
  let testHoliday;

  beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test school with valid enum values according to School model
    testSchool = new School({
      name: 'School of Business',
      schoolCode: 'BUS',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();

    // Create test user with required school field
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
      school: testSchool._id
    });
    await testUser.save();

    // Create test holiday settings
    testHoliday = new Holiday({
      campus: testSchool._id,
      weekendDays: [5, 6], // Friday and Saturday
      officialHolidays: [],
      weekendWorkDays: []
    });
    await testHoliday.save();
  });

  describe('getHolidaySettings', () => {
    it('should get holiday settings for campus', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Holiday.getOrCreateForCampus
      const originalGetOrCreateForCampus = Holiday.getOrCreateForCampus;
      Holiday.getOrCreateForCampus = jest.fn().mockResolvedValue(testHoliday);

      await getHolidaySettings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Holiday.getOrCreateForCampus = originalGetOrCreateForCampus;
    });
  });

  describe('updateHolidaySettings', () => {
    it('should update holiday settings', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        body: {
          weekendDays: [0, 6] // Sunday and Saturday
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Holiday.getOrCreateForCampus
      const originalGetOrCreateForCampus = Holiday.getOrCreateForCampus;
      Holiday.getOrCreateForCampus = jest.fn().mockResolvedValue(testHoliday);

      await updateHolidaySettings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Holiday.getOrCreateForCampus = originalGetOrCreateForCampus;
    });
  });

  describe('addOfficialHolidays', () => {
    it('should add official holidays', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        body: {
          dates: '01-01-2024',
          name: 'New Year'
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Holiday.getOrCreateForCampus
      const originalGetOrCreateForCampus = Holiday.getOrCreateForCampus;
      Holiday.getOrCreateForCampus = jest.fn().mockResolvedValue(testHoliday);

      await addOfficialHolidays(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Holiday.getOrCreateForCampus = originalGetOrCreateForCampus;
    });

    it('should return error when dates are missing', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        body: {
          // Missing dates
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await addOfficialHolidays(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removeOfficialHoliday', () => {
    it('should remove an official holiday', async () => {
      // First create holiday settings for the campus
      let holiday = await Holiday.getOrCreateForCampus(testSchool._id);
      holiday.addOfficialHoliday('01-01-2024', 'Test Holiday');
      await holiday.save();
      
      // Reload to get the assigned _id
      holiday = await Holiday.findById(holiday._id);
      const holidayId = holiday.officialHolidays[0]._id.toString();

      const req = {
        params: {
          campusId: testSchool._id.toString(),
          holidayId: holidayId
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await removeOfficialHoliday(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('addWeekendWorkDays', () => {
    it('should add weekend work days', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        body: {
          dates: '01-01-2024',
          reason: 'Makeup day'
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Holiday.getOrCreateForCampus
      const originalGetOrCreateForCampus = Holiday.getOrCreateForCampus;
      Holiday.getOrCreateForCampus = jest.fn().mockResolvedValue(testHoliday);

      await addWeekendWorkDays(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Holiday.getOrCreateForCampus = originalGetOrCreateForCampus;
    });

    it('should return error when dates are missing', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        body: {
          // Missing dates
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await addWeekendWorkDays(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removeWeekendWorkDay', () => {
    it('should remove a weekend work day', async () => {
      // First create holiday settings for the campus
      let holiday = await Holiday.getOrCreateForCampus(testSchool._id);
      holiday.addWeekendWorkDay('01-01-2024', 'Test Work Day');
      await holiday.save();
      
      // Reload to get the assigned _id
      holiday = await Holiday.findById(holiday._id);
      const workDayId = holiday.weekendWorkDays[0]._id.toString();

      const req = {
        params: {
          campusId: testSchool._id.toString(),
          workDayId: workDayId
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await removeWeekendWorkDay(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getHolidaySuggestions', () => {
    it('should get holiday suggestions', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        query: {
          year: '2024',
          country: 'EG'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Holiday.getOrCreateForCampus
      const originalGetOrCreateForCampus = Holiday.getOrCreateForCampus;
      Holiday.getOrCreateForCampus = jest.fn().mockResolvedValue(testHoliday);

      await getHolidaySuggestions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Holiday.getOrCreateForCampus = originalGetOrCreateForCampus;
    });
  });

  describe('addFromSuggestions', () => {
    it('should add holidays from suggestions', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        body: {
          holidays: [
            {
              date: '2024-01-01',
              name: 'New Year'
            }
          ]
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Holiday.getOrCreateForCampus
      const originalGetOrCreateForCampus = Holiday.getOrCreateForCampus;
      Holiday.getOrCreateForCampus = jest.fn().mockResolvedValue(testHoliday);

      await addFromSuggestions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Holiday.getOrCreateForCampus = originalGetOrCreateForCampus;
    });

    it('should return error when holidays array is missing', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        body: {
          // Missing holidays
        },
        user: {
          _id: testUser._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await addFromSuggestions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('checkWorkingDay', () => {
    it('should check if a date is a working day', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        query: {
          date: '2024-01-01'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock Holiday.getOrCreateForCampus
      const originalGetOrCreateForCampus = Holiday.getOrCreateForCampus;
      Holiday.getOrCreateForCampus = jest.fn().mockResolvedValue(testHoliday);

      await checkWorkingDay(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Restore original implementation
      Holiday.getOrCreateForCampus = originalGetOrCreateForCampus;
    });

    it('should return error when date is missing', async () => {
      const req = {
        params: {
          campusId: testSchool._id.toString()
        },
        query: {
          // Missing date
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await checkWorkingDay(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('parseDateString', () => {
    it('should parse a date string', async () => {
      const req = {
        query: {
          dateString: '01-01-2024'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await parseDateString(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return error when date string is missing', async () => {
      const req = {
        query: {
          // Missing dateString
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await parseDateString(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return error for invalid date format', async () => {
      const req = {
        query: {
          dateString: 'invalid-date'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await parseDateString(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});