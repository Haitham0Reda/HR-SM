import mongoose from 'mongoose';
import PayrollRepository from '../../repositories/modules/PayrollRepository.js';
import Payroll from '../../modules/payroll/models/payroll.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';

describe('PayrollRepository', () => {
    let payrollRepository;
    let testTenantId;
    let testUser;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        payrollRepository = new PayrollRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        await Payroll.deleteMany({});
        await User.deleteMany({ tenantId: testTenantId });

        testUser = await User.create({
            tenantId: testTenantId,
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User'
        });
    });

    afterAll(async () => {
        await Payroll.deleteMany({});
        await User.deleteMany({ tenantId: testTenantId });
    });

    describe('findByEmployee', () => {
        it('should find payroll records by employee', async () => {
            await Payroll.create({
                employee: testUser._id,
                period: '2025-01',
                deductions: [
                    { type: 'tax', amount: 100 }
                ],
                totalDeductions: 100
            });

            await Payroll.create({
                employee: testUser._id,
                period: '2025-02',
                deductions: [
                    { type: 'insurance', amount: 50 }
                ],
                totalDeductions: 50
            });

            const records = await payrollRepository.findByEmployee(testUser._id);

            expect(records).toHaveLength(2);
            expect(records[0].period).toBe('2025-02'); // Should be sorted by period desc
        });
    });

    describe('findByPeriod', () => {
        it('should find payroll records by period', async () => {
            await Payroll.create({
                employee: testUser._id,
                period: '2025-01',
                deductions: [{ type: 'tax', amount: 100 }],
                totalDeductions: 100
            });

            const records = await payrollRepository.findByPeriod('2025-01');

            expect(records).toHaveLength(1);
            expect(records[0].period).toBe('2025-01');
        });
    });

    describe('findByEmployeeAndPeriod', () => {
        it('should find specific payroll record by employee and period', async () => {
            await Payroll.create({
                employee: testUser._id,
                period: '2025-01',
                deductions: [{ type: 'tax', amount: 100 }],
                totalDeductions: 100
            });

            const record = await payrollRepository.findByEmployeeAndPeriod(
                testUser._id,
                '2025-01'
            );

            expect(record).toBeTruthy();
            expect(record.period).toBe('2025-01');
            expect(record.totalDeductions).toBe(100);
        });
    });

    describe('calculateTotalDeductions', () => {
        it('should calculate total deductions correctly', () => {
            const deductions = [
                { type: 'tax', amount: 100 },
                { type: 'insurance', amount: 50 },
                { type: 'loan', amount: 25 }
            ];

            const total = payrollRepository.calculateTotalDeductions(deductions);

            expect(total).toBe(175);
        });

        it('should handle empty deductions array', () => {
            const total = payrollRepository.calculateTotalDeductions([]);
            expect(total).toBe(0);
        });

        it('should handle null deductions', () => {
            const total = payrollRepository.calculateTotalDeductions(null);
            expect(total).toBe(0);
        });
    });

    describe('createOrUpdatePayroll', () => {
        it('should create new payroll record', async () => {
            const payrollData = {
                employee: testUser._id,
                period: '2025-01',
                deductions: [
                    { type: 'tax', amount: 100 },
                    { type: 'insurance', amount: 50 }
                ]
            };

            const record = await payrollRepository.createOrUpdatePayroll(payrollData);

            expect(record).toBeTruthy();
            expect(record.totalDeductions).toBe(150);
        });

        it('should update existing payroll record', async () => {
            // Create initial record
            await Payroll.create({
                employee: testUser._id,
                period: '2025-01',
                deductions: [{ type: 'tax', amount: 100 }],
                totalDeductions: 100
            });

            const payrollData = {
                employee: testUser._id,
                period: '2025-01',
                deductions: [
                    { type: 'tax', amount: 150 },
                    { type: 'insurance', amount: 50 }
                ]
            };

            const record = await payrollRepository.createOrUpdatePayroll(payrollData);

            expect(record.totalDeductions).toBe(200);
        });
    });

    describe('addDeduction', () => {
        it('should add deduction to existing payroll', async () => {
            const payroll = await Payroll.create({
                employee: testUser._id,
                period: '2025-01',
                deductions: [{ type: 'tax', amount: 100 }],
                totalDeductions: 100
            });

            const newDeduction = { type: 'insurance', amount: 50 };
            const updatedRecord = await payrollRepository.addDeduction(
                payroll._id,
                newDeduction
            );

            expect(updatedRecord.deductions).toHaveLength(2);
            expect(updatedRecord.totalDeductions).toBe(150);
        });
    });

    describe('removeDeduction', () => {
        it('should remove deduction from payroll', async () => {
            const payroll = await Payroll.create({
                employee: testUser._id,
                period: '2025-01',
                deductions: [
                    { type: 'tax', amount: 100 },
                    { type: 'insurance', amount: 50 }
                ],
                totalDeductions: 150
            });

            const updatedRecord = await payrollRepository.removeDeduction(
                payroll._id,
                0 // Remove first deduction
            );

            expect(updatedRecord.deductions).toHaveLength(1);
            expect(updatedRecord.deductions[0].type).toBe('insurance');
            expect(updatedRecord.totalDeductions).toBe(50);
        });
    });

    describe('findByDeductionType', () => {
        it('should find payroll records by deduction type', async () => {
            await Payroll.create({
                employee: testUser._id,
                period: '2025-01',
                deductions: [{ type: 'tax', amount: 100 }],
                totalDeductions: 100
            });

            await Payroll.create({
                employee: testUser._id,
                period: '2025-02',
                deductions: [{ type: 'insurance', amount: 50 }],
                totalDeductions: 50
            });

            const records = await payrollRepository.findByDeductionType('tax');

            expect(records).toHaveLength(1);
            expect(records[0].period).toBe('2025-01');
        });
    });

    describe('getEmployeePayrollHistory', () => {
        it('should get employee payroll history', async () => {
            await Payroll.create({
                employee: testUser._id,
                period: '2025-01',
                deductions: [{ type: 'tax', amount: 100 }],
                totalDeductions: 100
            });

            await Payroll.create({
                employee: testUser._id,
                period: '2025-02',
                deductions: [{ type: 'tax', amount: 120 }],
                totalDeductions: 120
            });

            const history = await payrollRepository.getEmployeePayrollHistory(testUser._id);

            expect(history).toHaveLength(2);
            expect(history[0].period).toBe('2025-02'); // Should be sorted desc
        });
    });
});