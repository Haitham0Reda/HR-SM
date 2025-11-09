import mongoose from 'mongoose';
import VacationBalance from '../../models/vacationBalance.model.js';

describe('VacationBalance Model', () => {
  it('should create and save a vacation balance record successfully', async () => {
    const vacationBalanceData = {
      employee: new mongoose.Types.ObjectId(),
      year: 2023,
      annual: {
        allocated: 21,
        used: 5,
        pending: 2,
        available: 14,
        carriedOver: 0
      },
      casual: {
        allocated: 7,
        used: 1,
        pending: 1,
        available: 5
      },
      sick: {
        allocated: 10,
        used: 0,
        pending: 0,
        available: 10
      },
      eligibility: {
        isEligible: true,
        eligibleFrom: new Date('2023-01-01'),
        probationEnds: new Date('2023-01-01'),
        tenure: 2.5
      }
    };

    const vacationBalance = new VacationBalance(vacationBalanceData);
    const savedVacationBalance = await vacationBalance.save();

    expect(savedVacationBalance._id).toBeDefined();
    expect(savedVacationBalance.employee.toString()).toBe(vacationBalanceData.employee.toString());
    expect(savedVacationBalance.year).toBe(vacationBalanceData.year);
    expect(savedVacationBalance.annual.allocated).toBe(vacationBalanceData.annual.allocated);
    expect(savedVacationBalance.annual.used).toBe(vacationBalanceData.annual.used);
    expect(savedVacationBalance.annual.pending).toBe(vacationBalanceData.annual.pending);
    expect(savedVacationBalance.annual.available).toBe(vacationBalanceData.annual.available);
    expect(savedVacationBalance.casual.allocated).toBe(vacationBalanceData.casual.allocated);
    expect(savedVacationBalance.casual.used).toBe(vacationBalanceData.casual.used);
    expect(savedVacationBalance.casual.pending).toBe(vacationBalanceData.casual.pending);
    expect(savedVacationBalance.casual.available).toBe(vacationBalanceData.casual.available);
    expect(savedVacationBalance.sick.allocated).toBe(vacationBalanceData.sick.allocated);
    expect(savedVacationBalance.sick.used).toBe(vacationBalanceData.sick.used);
    expect(savedVacationBalance.sick.pending).toBe(vacationBalanceData.sick.pending);
    expect(savedVacationBalance.sick.available).toBe(vacationBalanceData.sick.available);
    expect(savedVacationBalance.eligibility.isEligible).toBe(vacationBalanceData.eligibility.isEligible);
    expect(savedVacationBalance.eligibility.tenure).toBe(vacationBalanceData.eligibility.tenure);
  });

  it('should fail to create a vacation balance without required fields', async () => {
    const vacationBalanceData = {
      year: 2023
    };

    const vacationBalance = new VacationBalance(vacationBalanceData);

    let err;
    try {
      await vacationBalance.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.employee).toBeDefined();
  });

  it('should enforce unique employee-year combination', async () => {
    const employeeId = new mongoose.Types.ObjectId();
    const year = 2023;

    const vacationBalanceData1 = {
      employee: employeeId,
      year: year,
      annual: {
        allocated: 21,
        used: 0,
        pending: 0,
        available: 21
      },
      casual: {
        allocated: 7,
        used: 0,
        pending: 0,
        available: 7
      },
      sick: {
        allocated: 10,
        used: 0,
        pending: 0,
        available: 10
      }
    };

    const vacationBalanceData2 = {
      employee: employeeId,
      year: year,
      annual: {
        allocated: 21,
        used: 0,
        pending: 0,
        available: 21
      },
      casual: {
        allocated: 7,
        used: 0,
        pending: 0,
        available: 7
      },
      sick: {
        allocated: 10,
        used: 0,
        pending: 0,
        available: 10
      }
    };

    const vacationBalance1 = new VacationBalance(vacationBalanceData1);
    await vacationBalance1.save();

    const vacationBalance2 = new VacationBalance(vacationBalanceData2);

    let err;
    try {
      await vacationBalance2.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

  it('should calculate total available days', async () => {
    const vacationBalanceData = {
      employee: new mongoose.Types.ObjectId(),
      year: 2023,
      annual: {
        allocated: 21,
        used: 5,
        pending: 2,
        available: 14
      },
      casual: {
        allocated: 7,
        used: 1,
        pending: 1,
        available: 5
      },
      sick: {
        allocated: 10,
        used: 0,
        pending: 0,
        available: 10
      }
    };

    const vacationBalance = new VacationBalance(vacationBalanceData);
    const savedVacationBalance = await vacationBalance.save();

    expect(savedVacationBalance.totalAvailable).toBe(29); // 14 + 5 + 10
  });

  it('should check sufficient balance', async () => {
    const vacationBalanceData = {
      employee: new mongoose.Types.ObjectId(),
      year: 2023,
      annual: {
        allocated: 21,
        used: 5,
        pending: 2,
        available: 14
      },
      casual: {
        allocated: 7,
        used: 1,
        pending: 1,
        available: 5
      },
      sick: {
        allocated: 10,
        used: 0,
        pending: 0,
        available: 10
      }
    };

    const vacationBalance = new VacationBalance(vacationBalanceData);
    const savedVacationBalance = await vacationBalance.save();

    expect(savedVacationBalance.hasSufficientBalance('annual', 10)).toBe(true);
    expect(savedVacationBalance.hasSufficientBalance('annual', 15)).toBe(false);
    expect(savedVacationBalance.hasSufficientBalance('casual', 5)).toBe(true);
    expect(savedVacationBalance.hasSufficientBalance('casual', 6)).toBe(false);
    expect(savedVacationBalance.hasSufficientBalance('sick', 10)).toBe(true);
    expect(savedVacationBalance.hasSufficientBalance('sick', 11)).toBe(false);
  });

  it('should use vacation days', async () => {
    const vacationBalanceData = {
      employee: new mongoose.Types.ObjectId(),
      year: 2023,
      annual: {
        allocated: 21,
        used: 5,
        pending: 2,
        available: 14
      },
      casual: {
        allocated: 7,
        used: 1,
        pending: 1,
        available: 5
      },
      sick: {
        allocated: 10,
        used: 0,
        pending: 0,
        available: 10
      }
    };

    const vacationBalance = new VacationBalance(vacationBalanceData);
    const savedVacationBalance = await vacationBalance.save();

    // Use annual vacation
    const updatedBalance = await savedVacationBalance.useVacation('annual', 3, 'Test usage');

    expect(updatedBalance.annual.used).toBe(8);
    expect(updatedBalance.annual.available).toBe(11);
    expect(updatedBalance.annual.pending).toBe(2);

    // Check that history was recorded
    expect(updatedBalance.history).toHaveLength(1);
    expect(updatedBalance.history[0].type).toBe('annual');
    expect(updatedBalance.history[0].days).toBe(3);
    expect(updatedBalance.history[0].action).toBe('used');
  });

  it('should return vacation days', async () => {
    const vacationBalanceData = {
      employee: new mongoose.Types.ObjectId(),
      year: 2023,
      annual: {
        allocated: 21,
        used: 5,
        pending: 2,
        available: 14
      },
      casual: {
        allocated: 7,
        used: 1,
        pending: 1,
        available: 5
      },
      sick: {
        allocated: 10,
        used: 0,
        pending: 0,
        available: 10
      },
      history: [{
        type: 'annual',
        days: 3,
        action: 'used',
        date: new Date(),
        reason: 'Test usage'
      }]
    };

    const vacationBalance = new VacationBalance(vacationBalanceData);
    const savedVacationBalance = await vacationBalance.save();

    // Return annual vacation
    const updatedBalance = await savedVacationBalance.returnVacation('annual', 2, 'Test return');

    expect(updatedBalance.annual.used).toBe(3);
    expect(updatedBalance.annual.available).toBe(16);
    expect(updatedBalance.annual.pending).toBe(2);

    // Check that history was recorded
    expect(updatedBalance.history).toHaveLength(2);
    expect(updatedBalance.history[1].type).toBe('annual');
    expect(updatedBalance.history[1].days).toBe(2);
    expect(updatedBalance.history[1].action).toBe('returned');
  });
});