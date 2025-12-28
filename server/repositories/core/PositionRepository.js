import BaseRepository from '../BaseRepository.js';
import Position from '../../modules/hr-core/users/models/position.model.js';

/**
 * Repository for Position model operations
 * Provides specialized methods for position management and department-based queries
 * 
 * @extends BaseRepository
 */
class PositionRepository extends BaseRepository {
    constructor() {
        super(Position);
    }

    /**
     * Find positions by department
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of positions in the department
     */
    async findByDepartment(departmentId, options = {}) {
        try {
            const filter = { department: departmentId };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    /**
     * Find active positions
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of active positions
     */
    async findActivePositions(options = {}) {
        try {
            const filter = { isActive: true };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findActivePositions');
        }
    }

    /**
     * Find position by code
     * @param {string} code - Position code
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object|null>} Position document or null
     */
    async findByCode(code, options = {}) {
        try {
            const filter = { code };
            return await this.findOne(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByCode');
        }
    }

    /**
     * Search positions by title
     * @param {string} searchTerm - Search term
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of matching positions
     */
    async searchByTitle(searchTerm, options = {}) {
        try {
            const filter = {
                $or: [
                    { title: { $regex: searchTerm, $options: 'i' } },
                    { arabicTitle: { $regex: searchTerm, $options: 'i' } },
                    { code: { $regex: searchTerm, $options: 'i' } }
                ]
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'searchByTitle');
        }
    }

    /**
     * Get positions with department information
     * @param {Object} [filter] - Query filter
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of positions with populated department
     */
    async findWithDepartment(filter = {}, options = {}) {
        try {
            const populateOptions = {
                path: 'department',
                select: 'name code arabicName'
            };
            
            return await this.find(filter, {
                ...options,
                populate: populateOptions
            });
        } catch (error) {
            throw this._handleError(error, 'findWithDepartment');
        }
    }

    /**
     * Get positions with employee counts
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of positions with employee counts
     */
    async findWithEmployeeCounts(options = {}) {
        try {
            const { tenantId, sort = { title: 1 }, limit, skip } = options;
            
            const pipeline = [
                {
                    $match: tenantId ? { tenantId } : {}
                },
                {
                    $lookup: {
                        from: 'departments',
                        localField: 'department',
                        foreignField: '_id',
                        as: 'departmentInfo'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'position',
                        as: 'employees'
                    }
                },
                {
                    $addFields: {
                        department: { $arrayElemAt: ['$departmentInfo', 0] },
                        employeeCount: { $size: '$employees' },
                        activeEmployeeCount: {
                            $size: {
                                $filter: {
                                    input: '$employees',
                                    cond: { $eq: ['$$this.isActive', true] }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        departmentInfo: 0,
                        employees: 0
                    }
                },
                { $sort: sort }
            ];
            
            if (skip) {
                pipeline.push({ $skip: skip });
            }
            
            if (limit) {
                pipeline.push({ $limit: limit });
            }
            
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'findWithEmployeeCounts');
        }
    }

    /**
     * Get position statistics by department
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Array>} Array of department position statistics
     */
    async getPositionStatsByDepartment(options = {}) {
        try {
            const { tenantId } = options;
            
            const pipeline = [
                {
                    $match: tenantId ? { tenantId } : {}
                },
                {
                    $group: {
                        _id: '$department',
                        totalPositions: { $sum: 1 },
                        activePositions: {
                            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'departments',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'department'
                    }
                },
                {
                    $unwind: {
                        path: '$department',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        departmentId: '$_id',
                        departmentName: '$department.name',
                        departmentCode: '$department.code',
                        totalPositions: 1,
                        activePositions: 1
                    }
                },
                {
                    $sort: { departmentName: 1 }
                }
            ];
            
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getPositionStatsByDepartment');
        }
    }

    /**
     * Get overall position statistics
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object>} Position statistics
     */
    async getPositionStats(options = {}) {
        try {
            const { tenantId } = options;
            
            const pipeline = [
                {
                    $match: tenantId ? { tenantId } : {}
                },
                {
                    $group: {
                        _id: null,
                        totalPositions: { $sum: 1 },
                        activePositions: {
                            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                        },
                        inactivePositions: {
                            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
                        }
                    }
                }
            ];
            
            const [stats] = await this.model.aggregate(pipeline);
            
            return stats || {
                totalPositions: 0,
                activePositions: 0,
                inactivePositions: 0
            };
        } catch (error) {
            throw this._handleError(error, 'getPositionStats');
        }
    }

    /**
     * Find positions available for assignment (active positions with low employee count)
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {number} [options.maxEmployees=5] - Maximum employee count to consider position available
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of available positions
     */
    async findAvailablePositions(options = {}) {
        try {
            const { tenantId, maxEmployees = 5, sort = { title: 1 }, limit, skip } = options;
            
            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        ...(tenantId ? { tenantId } : {})
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'position',
                        as: 'employees',
                        pipeline: [
                            { $match: { isActive: true } }
                        ]
                    }
                },
                {
                    $addFields: {
                        employeeCount: { $size: '$employees' }
                    }
                },
                {
                    $match: {
                        employeeCount: { $lte: maxEmployees }
                    }
                },
                {
                    $lookup: {
                        from: 'departments',
                        localField: 'department',
                        foreignField: '_id',
                        as: 'departmentInfo'
                    }
                },
                {
                    $addFields: {
                        department: { $arrayElemAt: ['$departmentInfo', 0] }
                    }
                },
                {
                    $project: {
                        employees: 0,
                        departmentInfo: 0
                    }
                },
                { $sort: sort }
            ];
            
            if (skip) {
                pipeline.push({ $skip: skip });
            }
            
            if (limit) {
                pipeline.push({ $limit: limit });
            }
            
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'findAvailablePositions');
        }
    }

    /**
     * Bulk update positions by department
     * @param {string} departmentId - Department ID
     * @param {Object} updateData - Update data
     * @param {Object} [options] - Update options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @returns {Promise<Object>} Update result
     */
    async bulkUpdateByDepartment(departmentId, updateData, options = {}) {
        try {
            const { tenantId, session } = options;
            
            const filter = { department: departmentId };
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            // Add updatedAt timestamp
            updateData.updatedAt = new Date();
            
            const updateOptions = { runValidators: true };
            if (session) {
                updateOptions.session = session;
            }
            
            const result = await this.model.updateMany(filter, updateData, updateOptions);
            
            return {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                acknowledged: result.acknowledged
            };
        } catch (error) {
            throw this._handleError(error, 'bulkUpdateByDepartment');
        }
    }

    /**
     * Deactivate positions by department
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Update options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @returns {Promise<Object>} Update result
     */
    async deactivateByDepartment(departmentId, options = {}) {
        try {
            const updateData = { isActive: false };
            return await this.bulkUpdateByDepartment(departmentId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'deactivateByDepartment');
        }
    }

    /**
     * Get next available position code
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<string>} Next available position code
     */
    async getNextPositionCode(options = {}) {
        try {
            const { tenantId } = options;
            
            const filter = tenantId ? { tenantId } : {};
            
            // Find all positions and get the highest code number
            const positions = await this.find(filter, {
                select: 'code',
                sort: { code: -1 },
                limit: 100 // Limit to avoid memory issues with large datasets
            });
            
            let nextNumber = 1;
            const existingNumbers = new Set();
            
            // Extract all existing numbers
            for (const pos of positions) {
                if (pos.code) {
                    const match = pos.code.match(/\d+$/);
                    if (match) {
                        const num = parseInt(match[0]);
                        if (!isNaN(num)) {
                            existingNumbers.add(num);
                        }
                    }
                }
            }
            
            // Find the next available number
            while (existingNumbers.has(nextNumber)) {
                nextNumber++;
            }
            
            return 'POS' + nextNumber.toString().padStart(3, '0');
        } catch (error) {
            throw this._handleError(error, 'getNextPositionCode');
        }
    }

    /**
     * Validate position code uniqueness
     * @param {string} code - Position code to validate
     * @param {string} [excludeId] - Position ID to exclude from check (for updates)
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<boolean>} True if code is unique, false otherwise
     */
    async isCodeUnique(code, excludeId = null, options = {}) {
        try {
            const filter = { code };
            
            if (excludeId) {
                filter._id = { $ne: excludeId };
            }
            
            const existing = await this.findOne(filter, options);
            return !existing;
        } catch (error) {
            throw this._handleError(error, 'isCodeUnique');
        }
    }
}

export default PositionRepository;