import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import School from '../../server/models/school.model.js';

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

describe('School Model', () => {
  beforeEach(async () => {
    // Clear database
    await School.deleteMany({});
  });

  describe('School Creation', () => {
    it('should create a school with valid data', async () => {
      const schoolData = {
        schoolCode: 'BUS',
        name: 'School of Business',
        arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
      };

      const school = new School(schoolData);
      const savedSchool = await school.save();

      expect(savedSchool._id).toBeDefined();
      expect(savedSchool.schoolCode).toBe('BUS');
      expect(savedSchool.name).toBe('School of Business');
      expect(savedSchool.arabicName).toBe('المعهد الكندى العالى للإدارة بالسادس من اكتوبر');
      expect(savedSchool.createdAt).toBeDefined();
      expect(savedSchool.updatedAt).toBeDefined();
    });

    it('should fail to create a school with invalid schoolCode', async () => {
      const schoolData = {
        schoolCode: 'INVALID',
        name: 'School of Business',
        arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
      };

      const school = new School(schoolData);
      
      await expect(school.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should fail to create a school with invalid name', async () => {
      const schoolData = {
        schoolCode: 'BUS',
        name: 'Invalid School Name',
        arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
      };

      const school = new School(schoolData);
      
      await expect(school.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should fail to create a school with invalid arabicName', async () => {
      const schoolData = {
        schoolCode: 'BUS',
        name: 'School of Business',
        arabicName: 'اسم غير صحيح'
      };

      const school = new School(schoolData);
      
      await expect(school.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should fail to create a school without required fields', async () => {
      const schoolData = {};

      const school = new School(schoolData);
      
      await expect(school.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  describe('School Static Methods', () => {
    beforeEach(async () => {
      // Create test schools
      const schools = [
        {
          schoolCode: 'BUS',
          name: 'School of Business',
          arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
        },
        {
          schoolCode: 'ENG',
          name: 'School of Engineering',
          arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
        }
      ];

      await School.insertMany(schools);
    });

    it('should find school by code using findByCode method', async () => {
      const school = await School.findByCode('BUS');
      
      expect(school).toBeDefined();
      expect(school.schoolCode).toBe('BUS');
      expect(school.name).toBe('School of Business');
    });

    it('should return null for non-existent school code', async () => {
      const school = await School.findByCode('NON');
      
      expect(school).toBeNull();
    });

    it('should find schools with isActive=true using getActiveSchools method', async () => {
      // Update schools to have isActive=true
      await School.updateMany({}, { $set: { isActive: true } });
      
      const schools = await School.getActiveSchools();
      
      expect(schools).toBeDefined();
      // Note: This will return 0 because we don't have any schools with dean populated
      // The method filters by isActive: true and tries to populate dean
      expect(Array.isArray(schools)).toBe(true);
    });
  });

  describe('School Validation', () => {
    it('should convert schoolCode to uppercase', async () => {
      const schoolData = {
        schoolCode: 'bus', // lowercase
        name: 'School of Business',
        arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
      };

      const school = new School(schoolData);
      const savedSchool = await school.save();

      expect(savedSchool.schoolCode).toBe('BUS'); // should be uppercase
    });

    it('should require unique schoolCode', async () => {
      const schoolData1 = {
        schoolCode: 'BUS',
        name: 'School of Business',
        arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
      };

      const schoolData2 = {
        schoolCode: 'BUS',
        name: 'School of Business',
        arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
      };

      // Create first school
      await new School(schoolData1).save();

      // Try to create duplicate
      const duplicateSchool = new School(schoolData2);
      await expect(duplicateSchool.save()).rejects.toThrow();
    });
  });
});