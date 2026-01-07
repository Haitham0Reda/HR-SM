/**
 * Employee Controller for Insurance Module
 * 
 * Provides employee lookup and search functionality specifically for insurance operations.
 * Uses the standardized employee service for consistent data access and role-based filtering.
 */

import asyncHandler from '../../../core/utils/asyncHandler.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import employeeService from '../services/employeeService.js';
import logger from '../../../utils/logger.js';

/**
 * Search employees for policy assignment
 * @route GET /api/v1/life-insurance/employees/search
 * @access Private
 */
export const searchEmployees = asyncHandler(async (req, res) => {
    const { q: searchTerm, limit = 20, page = 1 } = req.query;

    try {
        const employees = await employeeService.searchEmployeesForPolicy(
            searchTerm,
            req.tenant.id,
            req.user,
            { limit: parseInt(limit), page: parseInt(page) }
        );

        // Format employees for consistent API response
        const formattedEmployees = employees.map(employee => 
            employeeService.formatEmployeeData(employee)
        );

        sendSuccess(res, formattedEmployees, 'Employees retrieved successfully');
    } catch (error) {
        logger.error('Error searching employees for insurance', {
            tenantId: req.tenant.id,
            searchTerm,
            requestingUser: req.user._id,
            error: error.message
        });
        return sendError(res, 'Failed to search employees', 500);
    }
});

/**
 * Get accessible employees for dropdowns
 * @route GET /api/v1/life-insurance/employees
 * @access Private
 */
export const getAccessibleEmployees = asyncHandler(async (req, res) => {
    const { includeInactive = false, limit = 100 } = req.query;

    try {
        const employees = await employeeService.getAccessibleEmployees(
            req.user,
            req.tenant.id,
            { 
                includeInactive: includeInactive === 'true',
                limit: parseInt(limit)
            }
        );

        // Format employees for consistent API response
        const formattedEmployees = employees.map(employee => 
            employeeService.formatEmployeeData(employee)
        );

        sendSuccess(res, formattedEmployees, 'Accessible employees retrieved successfully');
    } catch (error) {
        logger.error('Error getting accessible employees for insurance', {
            tenantId: req.tenant.id,
            requestingUser: req.user._id,
            error: error.message
        });
        return sendError(res, 'Failed to get accessible employees', 500);
    }
});

/**
 * Get employee by ID for policy operations
 * @route GET /api/v1/life-insurance/employees/:id
 * @access Private
 */
export const getEmployeeById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        // Validate employee identifier
        const validation = employeeService.validateEmployeeIdentifier(id);
        if (!validation.isValid) {
            return sendError(res, validation.message, 400);
        }

        const employee = await employeeService.findEmployeeForPolicy(
            id,
            req.tenant.id,
            req.user
        );

        if (!employee) {
            return sendError(res, 'Employee not found or access denied', 404);
        }

        // Format employee for consistent API response
        const formattedEmployee = employeeService.formatEmployeeData(employee);

        sendSuccess(res, formattedEmployee, 'Employee retrieved successfully');
    } catch (error) {
        logger.error('Error getting employee for insurance', {
            tenantId: req.tenant.id,
            employeeId: id,
            requestingUser: req.user._id,
            error: error.message
        });
        return sendError(res, 'Failed to get employee', 500);
    }
});

/**
 * Validate employee identifier format
 * @route POST /api/v1/life-insurance/employees/validate
 * @access Private
 */
export const validateEmployeeIdentifier = asyncHandler(async (req, res) => {
    const { employeeId } = req.body;

    const validation = employeeService.validateEmployeeIdentifier(employeeId);
    
    sendSuccess(res, {
        isValid: validation.isValid,
        type: validation.type,
        message: validation.message
    }, 'Employee identifier validation completed');
});

export default {
    searchEmployees,
    getAccessibleEmployees,
    getEmployeeById,
    validateEmployeeIdentifier
};