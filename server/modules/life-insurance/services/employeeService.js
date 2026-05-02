/**
 * Employee Lookup Service for Insurance Module
 *
 * Provides standardized employee lookup functionality with proper tenant scoping
 * and role-based access control for the life insurance module.
 *
 * Features:
 * - Support for UUID employee identifiers
 * - Role-based access filtering (Employee, Manager, HR, Admin)
 * - Consistent employee data population across endpoints
 * - Proper tenant isolation and security
 */

import { Op } from 'sequelize';
import { ROLES } from '../../../shared/constants/modules.js';
import logger from '../../../utils/logger.js';
import User from '../../hr-core/users/models/user.model.js';
import Department from '../../hr-core/users/models/department.model.js';
import Position from '../../hr-core/users/models/position.model.js';

class EmployeeService {
    /**
     * Find employee for policy operations with role-based access control
     * @param {string} employeeIdentifier - Employee ID (UUID string)
     * @param {string} tenantId - Tenant ID for scoping
     * @param {Object} requestingUser - User making the request
     * @returns {Promise<Object|null>} - Employee object or null if not found/accessible
     */
    async findEmployeeForPolicy(employeeIdentifier, tenantId, requestingUser) {
        try {
            console.log('findEmployeeForPolicy called with:', {
                employeeIdentifier,
                tenantId,
                requestingUser: requestingUser ? {
                    id: requestingUser._id || requestingUser.id,
                    role: requestingUser.role,
                    email: requestingUser.email
                } : 'null/undefined'
            });

            // Build base query with tenant isolation
            const baseQuery = { tenantId };

            // employeeIdentifier is now always a UUID string (no ObjectId)
            baseQuery.id = employeeIdentifier;

            console.log('Base query:', baseQuery);
            console.log('User role:', requestingUser?.role);

            // For admin users, use direct query without role filtering
            if (requestingUser?.role === 'admin') {
                console.log('Admin user - using direct query');
                const employee = await User.findOne({
                    where: baseQuery,
                    include: [
                        { model: Department, as: 'department', attributes: ['name', 'code'] },
                        { model: Position, as: 'position', attributes: ['title', 'level'] }
                    ],
                    attributes: [
                        'id', 'employeeId', 'personalInfo', 'email',
                        'departmentId', 'positionId', 'status', 'employment'
                    ]
                });

                console.log('Admin query result:', employee ? 'Found' : 'Not found');
                return employee?.get({ plain: true });
            }

            // For non-admin users, apply role-based filtering
            const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(baseQuery, requestingUser);
            console.log('Role-filtered query:', roleFilteredQuery);

            let employee = await User.findOne({
                where: roleFilteredQuery,
                include: [
                    { model: Department, as: 'department', attributes: ['name', 'code'] },
                    { model: Position, as: 'position', attributes: ['title', 'level'] }
                ],
                attributes: [
                    'id', 'employeeId', 'personalInfo', 'email',
                    'departmentId', 'positionId', 'status', 'employment'
                ]
            });

            console.log('Role-filtered query result:', employee ? 'Found' : 'Not found');
            return employee?.get({ plain: true });
        } catch (error) {
            console.error('Error in findEmployeeForPolicy:', error);
            logger.error('Error finding employee for policy', {
                tenantId,
                employeeIdentifier,
                requestingUser: requestingUser?.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Search employees with role-based filtering for policy assignment
     * @param {string} searchTerm - Search term for employee names, email, or employeeId
     * @param {string} tenantId - Tenant ID for scoping
     * @param {Object} requestingUser - User making the request
     * @param {Object} options - Search options (limit, page, etc.)
     * @returns {Promise<Array>} - Array of matching employees
     */
    async searchEmployeesForPolicy(searchTerm, tenantId, requestingUser, options = {}) {
        try {
            const { limit = 20, page = 1 } = options;

            // Build base search query
            let baseQuery = { tenantId };
            if (searchTerm) {
                baseQuery[Op.or] = [
                    { '$personalInfo.firstName$': { [Op.iLike]: `%${searchTerm}%` } },
                    { '$personalInfo.lastName$': { [Op.iLike]: `%${searchTerm}%` } },
                    { '$personalInfo.fullName$': { [Op.iLike]: `%${searchTerm}%` } },
                    { email: { [Op.iLike]: `%${searchTerm}%` } },
                    { employeeId: { [Op.iLike]: `%${searchTerm}%` } }
                ];
            }

            // Apply role-based filtering
            const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(baseQuery, requestingUser);

            const offset = (page - 1) * limit;
            const employees = await User.findAll({
                where: roleFilteredQuery,
                include: [
                    { model: Department, as: 'department', attributes: ['name', 'code'] },
                    { model: Position, as: 'position', attributes: ['title', 'level'] }
                ],
                attributes: ['id', 'employeeId', 'personalInfo', 'email', 'departmentId', 'positionId', 'status'],
                order: [['personalInfo', 'firstName', 'ASC']],
                limit,
                offset
            });

            return employees.map(e => e.get({ plain: true }));
        } catch (error) {
            logger.error('Error searching employees for policy', {
                tenantId,
                searchTerm,
                requestingUser: requestingUser?.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Check if requesting user can access a specific employee's data
     * @param {Object} requestingUser - User making the request
     * @param {string} targetEmployeeId - Employee ID to check access for
     * @param {string} tenantId - Tenant ID for scoping
     * @returns {Promise<boolean>} - Whether access is allowed
     */
    async canAccessEmployee(requestingUser, targetEmployeeId, tenantId) {
        try {
            switch (requestingUser.role) {
                case ROLES.EMPLOYEE:
                    return requestingUser.id.toString() === targetEmployeeId.toString();

                case ROLES.MANAGER:
                    if (requestingUser.departmentId) {
                        const targetEmployee = await User.findOne({
                            where: { id: targetEmployeeId, departmentId: requestingUser.departmentId, status: 'active' },
                            attributes: ['id']
                        });
                        return !!targetEmployee;
                    }
                    return requestingUser.id.toString() === targetEmployeeId.toString();

                case ROLES.HR:
                case ROLES.ADMIN:
                    return true;

                default:
                    return false;
            }
        } catch (error) {
            logger.error('Error checking employee access', {
                requestingUser: requestingUser?.id,
                targetEmployeeId,
                tenantId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get employees accessible to the requesting user (for dropdowns, etc.)
     * @param {Object} requestingUser - User making the request
     * @param {string} tenantId - Tenant ID for scoping
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Array of accessible employees
     */
    async getAccessibleEmployees(requestingUser, tenantId, options = {}) {
        try {
            const { includeInactive = false, limit = 100 } = options;

            let baseQuery = { tenantId };
            if (!includeInactive) {
                baseQuery.status = 'active';
            }

            // Apply role-based filtering
            const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(baseQuery, requestingUser);

            const employees = await User.findAll({
                where: roleFilteredQuery,
                include: [
                    { model: Department, as: 'department', attributes: ['name', 'code'] },
                    { model: Position, as: 'position', attributes: ['title', 'level'] }
                ],
                attributes: ['id', 'employeeId', 'personalInfo', 'email', 'departmentId', 'positionId', 'status'],
                order: [
                    ['personalInfo', 'firstName', 'ASC'],
                    ['personalInfo', 'lastName', 'ASC']
                ],
                limit
            });

            return employees.map(e => e.get({ plain: true }));
        } catch (error) {
            logger.error('Error getting accessible employees', {
                requestingUser: requestingUser?.id,
                tenantId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Apply role-based filtering to employee queries
     * @param {Object} baseQuery - Base query object
     * @param {Object} requestingUser - User making the request
     * @returns {Promise<Object>} - Query with role-based filtering applied
     */
    async applyRoleBasedEmployeeFilter(baseQuery, requestingUser) {
        const query = { ...baseQuery };

        if (!requestingUser) {
            query.id = null;
            return query;
        }

        switch (requestingUser.role) {
            case ROLES.EMPLOYEE:
                query.id = requestingUser.id;
                break;

            case ROLES.MANAGER:
                if (requestingUser.departmentId) {
                    const departmentEmployees = await User.findAll({
                        where: { departmentId: requestingUser.departmentId, status: 'active' },
                        attributes: ['id']
                    });
                    const employeeIds = departmentEmployees.map(e => e.id);
                    query.id = { [Op.in]: employeeIds };
                } else {
                    query.id = requestingUser.id;
                }
                break;

            case ROLES.HR:
            case ROLES.ADMIN:
                // No additional filtering - access all within tenant
                break;

            default:
                query.id = requestingUser.id;
                break;
        }

        return query;
    }

    /**
     * Format employee data for consistent API responses
     * @param {Object} employee - Raw employee object
     * @returns {Object} - Formatted employee data
     */
    formatEmployeeData(employee) {
        if (!employee) return null;

        return {
            _id: employee.id,
            employeeId: employee.employeeId,
            name: employee.personalInfo?.fullName ||
                  `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim() ||
                  employee.email,
            firstName: employee.personalInfo?.firstName,
            lastName: employee.personalInfo?.lastName,
            fullName: employee.personalInfo?.fullName,
            email: employee.email,
            department: employee.department ? {
                _id: employee.department.id,
                name: employee.department.name,
                code: employee.department.code
            } : null,
            position: employee.position ? {
                _id: employee.position.id,
                title: employee.department.title,
                level: employee.position.level
            } : null,
            status: employee.status,
            employmentStatus: employee.employment?.employmentStatus
        };
    }

    /**
     * Validate employee identifier format
     * @param {string} employeeIdentifier - Employee identifier to validate
     * @returns {Object} - Validation result with type and isValid flag
     */
    validateEmployeeIdentifier(employeeIdentifier) {
        if (!employeeIdentifier) {
            return { isValid: false, type: null, message: 'Employee identifier is required' };
        }

        // UUID v4 validation (36 chars with hyphens)
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (typeof employeeIdentifier === 'string' && uuidPattern.test(employeeIdentifier)) {
            return { isValid: true, type: 'uuid', message: 'Valid UUID' };
        }

        if (typeof employeeIdentifier === 'string' && employeeIdentifier.trim().length > 0) {
            return { isValid: true, type: 'employeeId', message: 'Valid employee ID string' };
        }

        return { isValid: false, type: null, message: 'Invalid employee identifier format' };
    }
}

export default new EmployeeService();
