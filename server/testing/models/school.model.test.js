import mongoose from 'mongoose';
import School from '../../models/school.model.js';

describe('School Model', () => {
  it('should create and save a school successfully', async () => {
    const schoolData = {
      schoolCode: 'ENG',
      name: 'School of Engineering',
      arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر',
      isActive: true
    };

    const school = new School(schoolData);
    const savedSchool = await school.save();

    expect(savedSchool._id).toBeDefined();
    expect(savedSchool.schoolCode).toBe(schoolData.schoolCode);
    expect(savedSchool.name).toBe(schoolData.name);
    expect(savedSchool.arabicName).toBe(schoolData.arabicName);
    expect(savedSchool.isActive).toBe(schoolData.isActive);
  });

  it('should fail to create a school without required fields', async () => {
    const schoolData = {
      name: 'School without code'
    };

    const school = new School(schoolData);

    let err;
    try {
      await school.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.schoolCode).toBeDefined();
  });

  it('should enforce valid school codes', async () => {
    const schoolData = {
      schoolCode: 'INVALID',
      name: 'School of Business',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    };

    const school = new School(schoolData);

    let err;
    try {
      await school.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    // Expect validation error for enum
    expect(err.errors.schoolCode).toBeDefined();
  });

  it('should enforce unique school code constraint', async () => {
    const schoolCode = 'BUS';
    const schoolData1 = {
      schoolCode: schoolCode,
      name: 'School of Business',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    };

    const schoolData2 = {
      schoolCode: schoolCode,
      name: 'School of Engineering',
      arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
    };

    const school1 = new School(schoolData1);
    await school1.save();

    const school2 = new School(schoolData2);

    let err;
    try {
      await school2.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

  it('should find school by code', async () => {
    const schoolData = {
      schoolCode: 'CS',
      name: 'School of Computer Science',
      arabicName: 'المعهد الكندى العالى للحاسبات والذكاء الاصطناعى بالسادس من اكتوبر'
    };

    const school = new School(schoolData);
    await school.save();

    const foundSchool = await School.findByCode('CS');
    expect(foundSchool).toBeDefined();
    expect(foundSchool.schoolCode).toBe(schoolData.schoolCode);
    expect(foundSchool.name).toBe(schoolData.name);
  });
});