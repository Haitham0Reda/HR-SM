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
import { ROLES } from '../../../shared/constants/modules.js';
import logger from '../../../utils/logger.js';
import multiTenantDB from '../../../config/multiTenant.js';

class EmployeeService {
    /**
     * Get User model for tenant with all required models registered
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<mongoose.Model>} - User model for the tenant
     */
    async getUserModel(tenantId) {
        try {
            const connection = await multiTenantDB.getCompanyConnection(tenantId);
            
            // Import the schemas
            const { default: User } = await import('../../hr-core/users/models/user.model.js');
            
            // Register all required models if they don't exist
            const modelsToRegister = [
                { name: 'Department', path: '../../hr-core/users/models/department.model.js' },
                { name: 'Position', path: '../../hr-core/users/models/position.model.js' },
                { name: 'InsurancePolicy', path: '../models/InsurancePolicy.js' },
                { name: 'FamilyMember', path: '../models/FamilyMember.js' },
                { name: 'Beneficiary', path: '../models/Beneficiary.js' },
                { name: 'InsuranceClaim', path: '../models/InsuranceClaim.js' }
            ];

            for (const modelInfo of modelsToRegister) {
                if (!connection.models[modelInfo.name]) {
                    try {
                        const { default: Model } = await import(modelInfo.path);
                        connection.model(modelInfo.name, Model.schema);
                        console.log(`Registered ${modelInfo.name} model for tenant ${tenantId}`);
                    } catch (error) {
                        console.warn(`Could not import ${modelInfo.name} model:`, error.message);
                    }
                }
            }
            
            // Get the User model for this tenant's database
            return connection.model('User', User.schema);
        } catch (error) {
            console.error('Error getting User model for tenant:', tenantId, error);
            throw error;
        }
    }

    /**
     * Find employee for policy operations with role-based access control
     * @param {string|ObjectId} employeeIdentifier - Employee ID (string) or MongoDB ObjectId
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

            // Get the User model for this tenant
            const User = await this.getUserModel(tenantId);

            // Debug: Test if we can find ANY users in the tenant database
            const totalUsers = await User.countDocuments();
            console.log('Total users in tenant database:', totalUsers);

            // Build base query (no need for tenantId since we're using tenant-specific database)
            const query = {};
            
            // Handle both ObjectId and employeeId string formats
            if (mongoose.Types.ObjectId.isValid(employeeIdentifier)) {
                query._id = employeeIdentifier;
            } else {
                query.employeeId = employeeIdentifier;
            }

            console.log('Base query:', query);
            console.log('User role:', requestingUser?.role);

            // For admin users, use direct query without role filtering
            if (requestingUser?.role === 'admin') {
                console.log('Admin user - using direct query');
                console.log('Query being executed:', JSON.stringify(query));
                
                // First, let's try to find ANY user with this ID
                const anyUser = await User.findById(employeeIdentifier);
                console.log('Any user lookup result:', anyUser ? 'Found' : 'Not found');
                if (anyUser) {
                    console.log('Any user details:', {
                        id: anyUser._id,
                        tenantId: anyUser.tenantId,
                        email: anyUser.email,
                        employeeId: anyUser.employeeId,
                        role: anyUser.role
                    });
                }
                
                // Now try with the query
                let employee;
                try {
                    employee = await User.findOne(query)
                        .populate('department', 'name code')
                        .populate('position', 'title level')
                        .select('employeeId personalInfo.firstName personalInfo.lastName personalInfo.fullName email department position employment.employmentStatus status')
                        .lean();
                } catch (populateError) {
                    console.warn('Populate failed, trying without populate:', populateError.message);
                    // Fallback: query without populate
                    employee = await User.findOne(query)
                        .select('employeeId personalInfo.firstName personalInfo.lastName personalInfo.fullName email department position employment.employmentStatus status')
                        .lean();
                }

                console.log('Admin query result:', employee ? 'Found' : 'Not found');
                if (employee) {
                    console.log('Found employee details:', {
                        id: employee._id,
                        tenantId: employee.tenantId,
                        email: employee.email,
                        employeeId: employee.employeeId,
                        name: employee.personalInfo?.fullName
                    });
                }
                return employee;
            }

            // For non-admin users, apply role-based filtering
            const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(query, requestingUser, User);
            console.log('Role-filtered query:', roleFilteredQuery);

            let employee;
            try {
                employee = await User.findOne(roleFilteredQuery)
                    .populate('department', 'name code')
                    .populate('position', 'title level')
                    .select('employeeId personalInfo.firstName personalInfo.lastName personalInfo.fullName email department position employment.employmentStatus status')
                    .lean();
            } catch (populateError) {
                console.warn('Populate failed, trying without populate:', populateError.message);
                // Fallback: query without populate
                employee = await User.findOne(roleFilteredQuery)
                    .select('employeeId personalInfo.firstName personalInfo.lastName personalInfo.fullName email department position employment.employmentStatus status')
                    .lean();
            }

            console.log('Role-filtered query result:', employee ? 'Found' : 'Not found');

            if (employee) {
                console.log('Found employee details:', {
                    id: employee._id,
                    tenantId: employee.tenantId,
                    email: employee.email,
                    employeeId: employee.employeeId,
                    name: employee.personalInfo?.fullName
                });

                logger.debug('Employee found for policy operation', {
                    tenantId,
                    employeeId: employee._id,
                    requestedBy: requestingUser?._id || requestingUser?.id,
                    requestingRole: requestingUser?.role
                });
            }

            return employee;
        } catch (error) {
            console.error('Error in findEmployeeForPolicy:', error);
            logger.error('Error finding employee for policy', {
                tenantId,
                employeeIdentifier,
                requestingUser: requestingUser?._id || requestingUser?.id,
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
            
            // Get the User model for this tenant
            const User = await this.getUserModel(tenantId);
            
            // Build base search query (no tenantId needed since using tenant-specific database)
            let baseQuery = {};
            
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
            const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(baseQuery, requestingUser, User);
            
            // Execute search with pagination
            const skip = (page - 1) * limit;
            const employees = await User.find(roleFilteredQuery)
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
            // Get the User model for this tenant
            const User = await this.getUserModel(tenantId);
            
            switch (requestingUser.role) {
                case ROLES.EMPLOYEE:
                    // Employees can only access their own data
                    return requestingUser._id.toString() === targetEmployeeId.toString();
                    
                case ROLES.MANAGER:
                    // Managers can access employees in their department
                    if (requestingUser.department) {
                        const targetEmployee = await User.findOne({
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
            
            // Get the User model for this tenant
            const User = await this.getUserModel(tenantId);
            
            // Build base query (no tenantId needed since using tenant-specific database)
            let baseQuery = {};
            
            if (!includeInactive) {
                baseQuery.status = 'active';
            }

            // Apply role-based filtering
            const roleFilteredQuery = await this.applyRoleBasedEmployeeFilter(baseQuery, requestingUser, User);
            
            // Get employees
            const employees = await User.find(roleFilteredQuery)
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
     * @param {mongoose.Model} User - User model for the tenant
     * @returns {Promise<Object>} - Query with role-based filtering applied
     */
    async applyRoleBasedEmployeeFilter(baseQuery, requestingUser, User) {
        const query = { ...baseQuery };

        if (!requestingUser) {
            // No user context - restrict to nothing
            query._id = null;
            return query;
        }

        switch (requestingUser.role) {
            case ROLES.EMPLOYEE:
                // Employees can only access their own data
                query._id = requestingUser._id || requestingUser.id;
                break;
                
            case ROLES.MANAGER:
                // Managers can access employees in their department
                if (requestingUser.department) {
                    // Get all employees in the manager's department
                    const departmentEmployees = await User.find({
                        department: requestingUser.department,
                        status: 'active'
                    }).select('_id').lean();
                    
                    const employeeIds = departmentEmployees.map(emp => emp._id);
                    query._id = { $in: employeeIds };
                } else {
                    // If manager has no department, only show their own data
                    query._id = requestingUser._id || requestingUser.id;
                }
                break;
                
            case ROLES.HR:
            case ROLES.ADMIN:
                // HR and Admin can access all employees within tenant (no additional filtering)
                break;
                
            default:
                // Unknown role - restrict to own data only
                query._id = requestingUser._id || requestingUser.id;
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