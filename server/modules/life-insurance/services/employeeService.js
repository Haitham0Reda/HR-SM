/**
 * Employee Lookup Service for Insurance Module
 * 
 * Provides standardized employee lookup functionality with proper tenant scoping
 * and role-based access control for the life insurance module.
 * 
 * Features:
 * - Support for both MongoDB ObjectId and employeeId string formats
 * - Role-based access filtering (Employee, Manager, HR, Admin)
 * - Consistent employee data population across endpoints
 * - Proper tenant isolation and security
 */

import mongoose from 'mongoose';
import User from '../../hr-core/users/models/user.model.js';
import { ROLES } from '../../../shared/constants/modules.js';
import logger from '../../../utils/logger.js';

class EmployeeService {
    /**
     * Find employee for policy operations with role-based access control
     * @param {string|ObjectId} employeeIdentifier - Employee ID (string) or MongoDB ObjectId
     * @param {string} tenantId - Tenant ID for scoping
     * @param {Object} requestingUser - User making the request
     * @returns {Promise<Object|null>} - Employee object or null if not found/accessible
     */
    async findEmployeeForPolicy(employeeIdentifier, tenantId, requestingUser) {
        try {
            // Build base query with tenant scoping
            const query = { tenantId };
            
            // Handle both ObjectId and employeeId string formats
            if (mongoose.Types.ObjectId.isValid(employeeIdentifier)) {
                query._id = employeeIdentifier;
            } else {
                query.employeeId = employeeIdentifier;
            }

            // Apply role-based filtering
            const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(query, requestingUser);
            
            // Find employee with consistent data population
            const employee = await User.withTenant(tenantId).findOne(roleFilteredQuery)
                .populate('department', 'name code')
                .populate('position', 'title level')
                .select('employeeId personalInfo.firstName personalInfo.lastName personalInfo.fullName email department position employment.employmentStatus status')
                .lean();

            if (employee) {
                logger.debug('Employee found for policy operation', {
                    tenantId,
                    employeeId: employee._id,
                    requestedBy: requestingUser._id,
                    requestingRole: requestingUser.role
                });
            }

            return employee;
        } catch (error) {
            logger.error('Error finding employee for policy', {
                tenantId,
                employeeIdentifier,
                requestingUser: requestingUser._id,
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
                baseQuery.$or = [
                    { 'personalInfo.firstName': { $regex: searchTerm, $options: 'i' } },
                    { 'personalInfo.lastName': { $regex: searchTerm, $options: 'i' } },
                    { 'personalInfo.fullName': { $regex: searchTerm, $options: 'i' } },
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { employeeId: { $regex: searchTerm, $options: 'i' } }
                ];
            }

            // Apply role-based filtering
            const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(baseQuery, requestingUser);
            
            // Execute search with pagination
            const skip = (page - 1) * limit;
            const employees = await User.withTenant(tenantId).find(roleFilteredQuery)
                .populate('department', 'name code')
                .populate('position', 'title level')
                .select('employeeId personalInfo.firstName personalInfo.lastName personalInfo.fullName email department position employment.employmentStatus status')
                .sort({ 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 })
                .skip(skip)
                .limit(limit)
                .lean();

            logger.debug('Employee search completed', {
                tenantId,
                searchTerm,
                requestingUser: requestingUser._id,
                requestingRole: requestingUser.role,
                resultsCount: employees.length
            });

            return employees;
        } catch (error) {
            logger.error('Error searching employees for policy', {
                tenantId,
                searchTerm,
                requestingUser: requestingUser._id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Check if requesting user can access a specific employee's data
     * @param {Object} requestingUser - User making the request
     * @param {string|ObjectId} targetEmployeeId - Employee ID to check access for
     * @param {string} tenantId - Tenant ID for scoping
     * @returns {Promise<boolean>} - Whether access is allowed
     */
    async canAccessEmployee(requestingUser, targetEmployeeId, tenantId) {
        try {
            switch (requestingUser.role) {
                case ROLES.EMPLOYEE:
                    // Employees can only access their own data
                    return requestingUser._id.toString() === targetEmployeeId.toString();
                    
                case ROLES.MANAGER:
                    // Managers can access employees in their department
                    if (requestingUser.department) {
                        const targetEmployee = await User.withTenant(tenantId).findOne({
                            _id: targetEmployeeId,
                            department: requestingUser.department,
                            status: 'active'
                        }).select('_id').lean();
                        return !!targetEmployee;
                    }
                    // If manager has no department, only own data
                    return requestingUser._id.toString() === targetEmployeeId.toString();
                    
                case ROLES.HR:
                case ROLES.ADMIN:
                    // HR and Admin can access all employees within tenant
                    return true;
                    
                default:
                    // Unknown role - no access
                    return false;
            }
        } catch (error) {
            logger.error('Error checking employee access', {
                requestingUser: requestingUser._id,
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
            
            // Build base query
            let baseQuery = { tenantId };
            
            if (!includeInactive) {
                baseQuery.status = 'active';
            }

            // Apply role-based filtering
            const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(baseQuery, requestingUser);
            
            // Get employees
            const employees = await User.withTenant(tenantId).find(roleFilteredQuery)
                .populate('department', 'name code')
                .populate('position', 'title level')
                .select('employeeId personalInfo.firstName personalInfo.lastName personalInfo.fullName email department position status')
                .sort({ 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 })
                .limit(limit)
                .lean();

            return employees;
        } catch (error) {
            logger.error('Error getting accessible employees', {
                requestingUser: requestingUser._id,
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

        switch (requestingUser.role) {
            case ROLES.EMPLOYEE:
                // Employees can only access their own data
                query._id = requestingUser._id;
                break;
                
            case ROLES.MANAGER:
                // Managers can access employees in their department
                if (requestingUser.department) {
                    // Get all employees in the manager's department
                    const departmentEmployees = await User.withTenant(requestingUser.tenantId || requestingUser._tenantId).find({
                        department: requestingUser.department,
                        status: 'active'
                    }).select('_id').lean();
                    
                    const employeeIds = departmentEmployees.map(emp => emp._id);
                    query._id = { $in: employeeIds };
                } else {
                    // If manager has no department, only show their own data
                    query._id = requestingUser._id;
                }
                break;
                
            case ROLES.HR:
            case ROLES.ADMIN:
                // HR and Admin can access all employees within tenant (no additional filtering)
                break;
                
            default:
                // Unknown role - restrict to own data only
                query._id = requestingUser._id;
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
            _id: employee._id,
            employeeId: employee.employeeId,
            name: employee.personalInfo?.fullName || 
                  `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim() ||
                  employee.email,
            firstName: employee.personalInfo?.firstName,
            lastName: employee.personalInfo?.lastName,
            fullName: employee.personalInfo?.fullName,
            email: employee.email,
            department: employee.department ? {
                _id: employee.department._id,
                name: employee.department.name,
                code: employee.department.code
            } : null,
            position: employee.position ? {
                _id: employee.position._id,
                title: employee.position.title,
                level: employee.position.level
            } : null,
            status: employee.status,
            employmentStatus: employee.employment?.employmentStatus
        };
    }

    /**
     * Validate employee identifier format
     * @param {string|ObjectId} employeeIdentifier - Employee identifier to validate
     * @returns {Object} - Validation result with type and isValid flag
     */
    validateEmployeeIdentifier(employeeIdentifier) {
        if (!employeeIdentifier) {
            return { isValid: false, type: null, message: 'Employee identifier is required' };
        }

        if (mongoose.Types.ObjectId.isValid(employeeIdentifier)) {
            return { isValid: true, type: 'objectId', message: 'Valid MongoDB ObjectId' };
        }

        if (typeof employeeIdentifier === 'string' && employeeIdentifier.trim().length > 0) {
            return { isValid: true, type: 'employeeId', message: 'Valid employee ID string' };
        }

        return { isValid: false, type: null, message: 'Invalid employee identifier format' };
    }
}

export default new EmployeeService();