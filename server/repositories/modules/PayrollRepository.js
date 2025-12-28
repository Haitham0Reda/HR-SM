import BaseRepository from '../BaseRepository.js';
import Payroll from '../../modules/payroll/models/payroll.model.js';
import mongoose from 'mongoose';

/**
 * Repository for Payroll model operations with salary calculations and analytics
 */
class PayrollRepository extends BaseRepository {
    constructor() {
        super(Payroll);
    }

    /**
     * Find payroll records by employee
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Payroll records
     */
    async findByEmployee(employeeId, options = {}) {
        try {
            const filter = { employee: employeeId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.period) {
                filter.period = options.period;
            }

            if (options.periodRange) {
                filter.period = {
                    $gte: options.periodRange.start,
                    $lte: options.periodRange.end
                };
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId department position' }
                ],
                sort: { period: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }

    /**
     * Find payroll records by period
     * @param {string} period - Period (e.g., '2025-10')
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Payroll records
     */
    async findByPeriod(period, options = {}) {
        try {
            const filter = { period };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                // Need to populate employee to filter by department
                const records = await this.find(filter, {
                    ...options,
                    populate: [
                        { 
                            path: 'employee', 
                            select: 'firstName lastName employeeId department position',
                            populate: { path: 'department', select: 'name code' }
                        }
                    ],
                    sort: { 'employee.firstName': 1 }
                });

                return records.filter(record => 
                    record.employee && 
                    record.employee.department && 
                    record.employee.department._id.toString() === options.departmentId
                );
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { 
                        path: 'employee', 
                        select: 'firstName lastName employeeId department position',
                        populate: { path: 'department', select: 'name code' }
                    }
                ],
                sort: { 'employee.firstName': 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByPeriod');
        }
    }

    /**
     * Find payroll record by employee and period
     * @param {string} employeeId - Employee ID
     * @param {string} period - Period (e.g., '2025-10')
     * @param {Object} [options] - Query options
     * @returns {Promise<Object|null>} Payroll record
     */
    async findByEmployeeAndPeriod(employeeId, period, options = {}) {
        try {
            const filter = { employee: employeeId, period };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            return await this.findOne(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId department position' }
                ]
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployeeAndPeriod');
        }
    }

    /**
     * Calculate total deductions for a payroll record
     * @param {Array} deductions - Array of deduction objects
     * @returns {number} Total deductions amount
     */
    calculateTotalDeductions(deductions) {
        if (!Array.isArray(deductions)) {
            return 0;
        }

        return deductions.reduce((total, deduction) => {
            return total + (deduction.amount || 0);
        }, 0);
    }

    /**
     * Create or update payroll record with automatic total calculation
     * @param {Object} payrollData - Payroll data
     * @param {Object} [options] - Creation options
     * @returns {Promise<Object>} Created/updated payroll record
     */
    async createOrUpdatePayroll(payrollData, options = {}) {
        try {
            // Calculate total deductions
            if (payrollData.deductions) {
                payrollData.totalDeductions = this.calculateTotalDeductions(payrollData.deductions);
            }

            // Check if payroll already exists for this employee and period
            const existingPayroll = await this.findByEmployeeAndPeriod(
                payrollData.employee,
                payrollData.period,
                { tenantId: options.tenantId }
            );

            if (existingPayroll) {
                // Update existing record
                return await this.update(existingPayroll._id, payrollData, options);
            } else {
                // Create new record
                return await this.create(payrollData, options);
            }
        } catch (error) {
            throw this._handleError(error, 'createOrUpdatePayroll');
        }
    }

    /**
     * Add deduction to existing payroll record
     * @param {string} payrollId - Payroll record ID
     * @param {Object} deduction - Deduction object
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated payroll record
     */
    async addDeduction(payrollId, deduction, options = {}) {
        try {
            const payroll = await this.findById(payrollId, options);
            if (!payroll) {
                throw new Error('Payroll record not found');
            }

            // Add deduction to array
            payroll.deductions.push(deduction);

            // Recalculate total deductions
            payroll.totalDeductions = this.calculateTotalDeductions(payroll.deductions);

            return await this.update(payrollId, {
                deductions: payroll.deductions,
                totalDeductions: payroll.totalDeductions
            }, options);
        } catch (error) {
            throw this._handleError(error, 'addDeduction');
        }
    }

    /**
     * Remove deduction from payroll record
     * @param {string} payrollId - Payroll record ID
     * @param {number} deductionIndex - Index of deduction to remove
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated payroll record
     */
    async removeDeduction(payrollId, deductionIndex, options = {}) {
        try {
            const payroll = await this.findById(payrollId, options);
            if (!payroll) {
                throw new Error('Payroll record not found');
            }

            if (deductionIndex < 0 || deductionIndex >= payroll.deductions.length) {
                throw new Error('Invalid deduction index');
            }

            // Remove deduction from array
            payroll.deductions.splice(deductionIndex, 1);

            // Recalculate total deductions
            payroll.totalDeductions = this.calculateTotalDeductions(payroll.deductions);

            return await this.update(payrollId, {
                deductions: payroll.deductions,
                totalDeductions: payroll.totalDeductions
            }, options);
        } catch (error) {
            throw this._handleError(error, 'removeDeduction');
        }
    }

    /**
     * Get payroll summary by deduction type
     * @param {Object} filters - Filter criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Payroll summary by deduction type
     */
    async getDeductionSummary(filters = {}, options = {}) {
        try {
            const matchFilter = {};

            if (filters.tenantId) {
                matchFilter.tenantId = filters.tenantId;
            }

            if (filters.period) {
                matchFilter.period = filters.period;
            }

            if (filters.periodRange) {
                matchFilter.period = {
                    $gte: filters.periodRange.start,
                    $lte: filters.periodRange.end
                };
            }

            if (filters.employeeIds && filters.employeeIds.length > 0) {
                matchFilter.employee = {
                    $in: filters.employeeIds.map(id => new mongoose.Types.ObjectId(id))
                };
            }

            const pipeline = [
                { $match: matchFilter },
                { $unwind: '$deductions' },
                {
                    $group: {
                        _id: {
                            type: '$deductions.type',
                            period: '$period'
                        },
                        totalAmount: { $sum: '$deductions.amount' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$deductions.amount' },
                        employees: { $addToSet: '$employee' }
                    }
                },
                {
                    $sort: { '_id.period': -1, '_id.type': 1 }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getDeductionSummary');
        }
    }

    /**
     * Get payroll analytics for reporting
     * @param {Object} filters - Filter criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Payroll analytics
     */
    async getPayrollAnalytics(filters = {}, options = {}) {
        try {
            const matchFilter = {};

            if (filters.tenantId) {
                matchFilter.tenantId = filters.tenantId;
            }

            if (filters.period) {
                matchFilter.period = filters.period;
            }

            if (filters.periodRange) {
                matchFilter.period = {
                    $gte: filters.periodRange.start,
                    $lte: filters.periodRange.end
                };
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$period',
                        totalEmployees: { $sum: 1 },
                        totalDeductions: { $sum: '$totalDeductions' },
                        avgDeductions: { $avg: '$totalDeductions' },
                        maxDeductions: { $max: '$totalDeductions' },
                        minDeductions: { $min: '$totalDeductions' }
                    }
                },
                {
                    $sort: { '_id': -1 }
                }
            ];

            const periodAnalytics = await this.model.aggregate(pipeline);

            // Get deduction type breakdown
            const deductionBreakdown = await this.getDeductionSummary(filters, options);

            return {
                periodAnalytics,
                deductionBreakdown
            };
        } catch (error) {
            throw this._handleError(error, 'getPayrollAnalytics');
        }
    }

    /**
     * Get employee payroll history
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Employee payroll history
     */
    async getEmployeePayrollHistory(employeeId, options = {}) {
        try {
            const filter = { employee: employeeId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.limit) {
                options.limit = parseInt(options.limit);
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' }
                ],
                sort: { period: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'getEmployeePayrollHistory');
        }
    }

    /**
     * Get payroll records by deduction type
     * @param {string} deductionType - Type of deduction
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Payroll records with specified deduction type
     */
    async findByDeductionType(deductionType, options = {}) {
        try {
            const filter = {
                'deductions.type': deductionType
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.period) {
                filter.period = options.period;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { 
                        path: 'employee', 
                        select: 'firstName lastName employeeId department',
                        populate: { path: 'department', select: 'name code' }
                    }
                ],
                sort: { period: -1, 'employee.firstName': 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByDeductionType');
        }
    }

    /**
     * Bulk create payroll records
     * @param {Array} payrollRecords - Array of payroll data objects
     * @param {Object} [options] - Creation options
     * @returns {Promise<Array>} Created payroll records
     */
    async bulkCreatePayroll(payrollRecords, options = {}) {
        try {
            // Calculate total deductions for each record
            const processedRecords = payrollRecords.map(record => ({
                ...record,
                totalDeductions: this.calculateTotalDeductions(record.deductions || [])
            }));

            // Use transaction for bulk operations
            return await this.withTransaction(async (session) => {
                const results = [];
                
                for (const recordData of processedRecords) {
                    const result = await this.create(recordData, { ...options, session });
                    results.push(result);
                }
                
                return results;
            });
        } catch (error) {
            throw this._handleError(error, 'bulkCreatePayroll');
        }
    }
}

export default PayrollRepository;