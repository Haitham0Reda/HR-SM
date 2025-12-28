import BaseRepository from '../BaseRepository.js';
import Department from '../../modules/hr-core/users/models/department.model.js';

/**
 * Repository for Department model operations
 * Provides specialized methods for department management and hierarchical queries
 * 
 * @extends BaseRepository
 */
class DepartmentRepository extends BaseRepository {
    constructor() {
        super(Department);
    }

    /**
     * Find departments by parent department
     * @param {string|null} parentDepartmentId - Parent department ID (null for root departments)
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of departments
     */
    async findByParent(parentDepartmentId, options = {}) {
        try {
            const filter = { parentDepartment: parentDepartmentId };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByParent');
        }
    }

    /**
     * Find root departments (departments with no parent)
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of root departments
     */
    async findRootDepartments(options = {}) {
        try {
            const filter = { 
                $or: [
                    { parentDepartment: null },
                    { parentDepartment: { $exists: false } }
                ]
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findRootDepartments');
        }
    }

    /**
     * Find active departments
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of active departments
     */
    async findActiveDepartments(options = {}) {
        try {
            const filter = { isActive: true };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findActiveDepartments');
        }
    }

    /**
     * Find department by code
     * @param {string} code - Department code
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object|null>} Department document or null
     */
    async findByCode(code, options = {}) {
        try {
            const filter = { code: code.toUpperCase() };
            return await this.findOne(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByCode');
        }
    }

    /**
     * Find departments by manager
     * @param {string} managerId - Manager user ID
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of departments managed by the user
     */
    async findByManager(managerId, options = {}) {
        try {
            const filter = { manager: managerId };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findByManager');
        }
    }

    /**
     * Search departments by name
     * @param {string} searchTerm - Search term
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of matching departments
     */
    async searchByName(searchTerm, options = {}) {
        try {
            const filter = {
                $or: [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { arabicName: { $regex: searchTerm, $options: 'i' } },
                    { code: { $regex: searchTerm, $options: 'i' } }
                ]
            };
            return await this.find(filter, options);
        } catch (error) {
            throw this._handleError(error, 'searchByName');
        }
    }

    /**
     * Get department hierarchy starting from a specific department
     * @param {string|null} [departmentId=null] - Department ID to start from (null for full hierarchy)
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Array>} Hierarchical array of departments
     */
    async getHierarchy(departmentId = null, options = {}) {
        try {
            const { tenantId } = options;
            
            const matchFilter = {
                parentDepartment: departmentId,
                isActive: true
            };
            
            if (tenantId) {
                matchFilter.tenantId = tenantId;
            }
            
            const pipeline = [
                { $match: matchFilter },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'manager',
                        foreignField: '_id',
                        as: 'managerInfo',
                        pipeline: [
                            {
                                $project: {
                                    username: 1,
                                    email: 1,
                                    'personalInfo.fullName': 1,
                                    'personalInfo.firstName': 1,
                                    'personalInfo.lastName': 1
                                }
                            }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'department',
                        as: 'employees',
                        pipeline: [
                            { $match: { isActive: true } },
                            { $count: 'count' }
                        ]
                    }
                },
                {
                    $addFields: {
                        manager: { $arrayElemAt: ['$managerInfo', 0] },
                        employeeCount: { 
                            $ifNull: [{ $arrayElemAt: ['$employees.count', 0] }, 0] 
                        }
                    }
                },
                {
                    $project: {
                        managerInfo: 0,
                        employees: 0
                    }
                },
                { $sort: { name: 1 } }
            ];
            
            const departments = await this.model.aggregate(pipeline);
            
            // Recursively get children for each department
            for (const dept of departments) {
                dept.children = await this.getHierarchy(dept._id, options);
            }
            
            return departments;
        } catch (error) {
            throw this._handleError(error, 'getHierarchy');
        }
    }

    /**
     * Get parent chain for a department
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Array>} Array of parent departments from root to current
     */
    async getParentChain(departmentId, options = {}) {
        try {
            const chain = [];
            let currentDept = await this.findById(departmentId, options);
            
            while (currentDept) {
                chain.unshift(currentDept);
                if (currentDept.parentDepartment) {
                    currentDept = await this.findById(currentDept.parentDepartment, options);
                } else {
                    break;
                }
            }
            
            return chain;
        } catch (error) {
            throw this._handleError(error, 'getParentChain');
        }
    }

    /**
     * Get all descendant departments
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Array>} Array of all descendant departments
     */
    async getAllDescendants(departmentId, options = {}) {
        try {
            const descendants = [];
            
            const getChildren = async (parentId) => {
                const children = await this.findByParent(parentId, options);
                
                for (const child of children) {
                    descendants.push(child);
                    await getChildren(child._id);
                }
            };
            
            await getChildren(departmentId);
            return descendants;
        } catch (error) {
            throw this._handleError(error, 'getAllDescendants');
        }
    }

    /**
     * Check if department has sub-departments
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<boolean>} True if has sub-departments, false otherwise
     */
    async hasSubDepartments(departmentId, options = {}) {
        try {
            const filter = { parentDepartment: departmentId };
            const count = await this.count(filter, options);
            return count > 0;
        } catch (error) {
            throw this._handleError(error, 'hasSubDepartments');
        }
    }

    /**
     * Get department statistics
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object>} Department statistics
     */
    async getDepartmentStats(options = {}) {
        try {
            const { tenantId } = options;
            
            const pipeline = [
                {
                    $match: tenantId ? { tenantId } : {}
                },
                {
                    $group: {
                        _id: null,
                        totalDepartments: { $sum: 1 },
                        activeDepartments: {
                            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                        },
                        rootDepartments: {
                            $sum: { 
                                $cond: [
                                    { 
                                        $or: [
                                            { $eq: ['$parentDepartment', null] },
                                            { $not: ['$parentDepartment'] }
                                        ]
                                    }, 
                                    1, 
                                    0
                                ] 
                            }
                        },
                        departmentsWithManager: {
                            $sum: { 
                                $cond: [
                                    { 
                                        $and: [
                                            { $ifNull: ['$manager', false] },
                                            { $ne: ['$manager', null] }
                                        ]
                                    }, 
                                    1, 
                                    0
                                ] 
                            }
                        }
                    }
                }
            ];
            
            const [stats] = await this.model.aggregate(pipeline);
            
            return stats || {
                totalDepartments: 0,
                activeDepartments: 0,
                rootDepartments: 0,
                departmentsWithManager: 0
            };
        } catch (error) {
            throw this._handleError(error, 'getDepartmentStats');
        }
    }

    /**
     * Get departments with employee counts
     * @param {Object} [options] - Query options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {Object} [options.sort] - Sort criteria
     * @param {number} [options.limit] - Maximum number of results
     * @param {number} [options.skip] - Number of documents to skip
     * @returns {Promise<Array>} Array of departments with employee counts
     */
    async findWithEmployeeCounts(options = {}) {
        try {
            const { tenantId, sort = { name: 1 }, limit, skip } = options;
            
            const pipeline = [
                {
                    $match: tenantId ? { tenantId } : {}
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'department',
                        as: 'employees'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'manager',
                        foreignField: '_id',
                        as: 'managerInfo',
                        pipeline: [
                            {
                                $project: {
                                    username: 1,
                                    email: 1,
                                    'personalInfo.fullName': 1,
                                    'personalInfo.firstName': 1,
                                    'personalInfo.lastName': 1
                                }
                            }
                        ]
                    }
                },
                {
                    $addFields: {
                        employeeCount: { $size: '$employees' },
                        activeEmployeeCount: {
                            $size: {
                                $filter: {
                                    input: '$employees',
                                    cond: { $eq: ['$$this.isActive', true] }
                                }
                            }
                        },
                        manager: { $arrayElemAt: ['$managerInfo', 0] }
                    }
                },
                {
                    $project: {
                        employees: 0,
                        managerInfo: 0
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
     * Update department manager
     * @param {string} departmentId - Department ID
     * @param {string} managerId - New manager user ID
     * @param {Object} [options] - Update options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @returns {Promise<Object|null>} Updated department document
     */
    async updateManager(departmentId, managerId, options = {}) {
        try {
            const updateData = { manager: managerId };
            return await this.update(departmentId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'updateManager');
        }
    }

    /**
     * Deactivate department and all its sub-departments
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Update options
     * @param {string} [options.tenantId] - Tenant ID for multi-tenant operations
     * @param {mongoose.ClientSession} [options.session] - Transaction session
     * @returns {Promise<Object>} Result with count of deactivated departments
     */
    async deactivateWithSubDepartments(departmentId, options = {}) {
        try {
            const { tenantId, session } = options;
            
            // Get all descendants
            const descendants = await this.getAllDescendants(departmentId, { tenantId });
            const departmentIds = [departmentId, ...descendants.map(d => d._id)];
            
            // Deactivate all departments
            const filter = { _id: { $in: departmentIds } };
            if (tenantId) {
                filter.tenantId = tenantId;
            }
            
            const updateData = { isActive: false, updatedAt: new Date() };
            const updateOptions = { runValidators: true };
            
            if (session) {
                updateOptions.session = session;
            }
            
            const result = await this.model.updateMany(filter, updateData, updateOptions);
            
            return {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                deactivatedDepartments: departmentIds
            };
        } catch (error) {
            throw this._handleError(error, 'deactivateWithSubDepartments');
        }
    }
}

export default DepartmentRepository;