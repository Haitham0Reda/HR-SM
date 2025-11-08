import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Payroll from '../../models/payroll.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Payroll Model', () => {
  it('should create and save a payroll record successfully', async () => {
    const deduction1 = {
      type: 'tax',
      arabicName: 'ضريبة',
      description: 'Income tax deduction',
      amount: 500.00
    };

    const deduction2 = {
      type: 'insurance',
      arabicName: 'تأمين',
      description: 'Health insurance deduction',
      amount: 200.00
    };

    const payrollData = {
      employee: new mongoose.Types.ObjectId(),
      period: '2023-06',
      deductions: [deduction1, deduction2],
      totalDeductions: 700.00
    };

    const payroll = new Payroll(payrollData);
    const savedPayroll = await payroll.save();

    expect(savedPayroll._id).toBeDefined();
    expect(savedPayroll.employee.toString()).toBe(payrollData.employee.toString());
    expect(savedPayroll.period).toBe(payrollData.period);
    expect(savedPayroll.deductions).toHaveLength(2);
    expect(savedPayroll.deductions[0].type).toBe(deduction1.type);
    expect(savedPayroll.deductions[0].arabicName).toBe(deduction1.arabicName);
    expect(savedPayroll.deductions[0].description).toBe(deduction1.description);
    expect(savedPayroll.deductions[0].amount).toBe(deduction1.amount);
    expect(savedPayroll.deductions[1].type).toBe(deduction2.type);
    expect(savedPayroll.deductions[1].arabicName).toBe(deduction2.arabicName);
    expect(savedPayroll.deductions[1].description).toBe(deduction2.description);
    expect(savedPayroll.deductions[1].amount).toBe(deduction2.amount);
    expect(savedPayroll.totalDeductions).toBe(payrollData.totalDeductions);
  });

  it('should fail to create a payroll record without required fields', async () => {
    const payrollData = {
      deductions: []
    };

    const payroll = new Payroll(payrollData);
    
    let err;
    try {
      await payroll.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.employee).toBeDefined();
    expect(err.errors.period).toBeDefined();
  });

  it('should enforce unique employee-period combination', async () => {
    const employeeId = new mongoose.Types.ObjectId();
    const period = '2023-06';

    const payrollData1 = {
      employee: employeeId,
      period: period,
      deductions: [],
      totalDeductions: 0
    };

    const payrollData2 = {
      employee: employeeId,
      period: period,
      deductions: [],
      totalDeductions: 0
    };

    const payroll1 = new Payroll(payrollData1);
    await payroll1.save();

    const payroll2 = new Payroll(payrollData2);
    
    let err;
    try {
      await payroll2.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });
});