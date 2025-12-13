/**
 * Example: Integrating Company Logging into Existing Routes
 * 
 * This file shows how to add company logging to your existing HR module routes
 */

import { getLoggerForTenant } from '../utils/companyLogger.js';

// Example 1: Update existing employee controller
export async function createEmployee(req, res) {
    try {
        // Your existing logic
        const employee = await Employee.create(req.body);
        
        // Add company logging
        if (req.companyLogger) {
            req.companyLogger.audit('Employee created', {
                employeeId: employee._id,
                createdBy: req.user?.email,
                department: employee.department,
                position: employee.position
            });
        }
        
        res.json({ success: true, data: employee });
    } catch (error) {
        // Log the error with company context
        if (req.companyLogger) {
            req.companyLogger.error('Failed to create employee', {
                error: error.message,
                stack: error.stack,
                requestData: req.body,
                userId: req.user?.id
            });
        }
        
        res.status(500).json({ success: false, message: error.message });
    }
}

// Example 2: Add logging to authentication
export function authenticateToken(req, res, next) {
    // Your existing auth logic...
    
    // Add audit logging after successful authentication
    if (req.user && req.tenantId) {
        const companyLogger = getLoggerForTenant(req.tenantId);
        companyLogger.audit('User authenticated', {
            userId: req.user.id,
            userEmail: req.user.email,
            endpoint: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    }
    
    next();
}

// Example 3: Add security logging to sensitive operations
export async function updateSalary(req, res) {
    try {
        const { employeeId, newSalary } = req.body;
        
        // Log security event for salary changes
        if (req.companyLogger) {
            req.companyLogger.security('Salary modification attempted', {
                targetEmployeeId: employeeId,
                modifiedBy: req.user?.email,
                endpoint: req.originalUrl,
                ip: req.ip
            });
        }
        
        // Your existing logic
        const employee = await Employee.findByIdAndUpdate(
            employeeId, 
            { salary: newSalary },
            { new: true }
        );
        
        // Log successful change
        if (req.companyLogger) {
            req.companyLogger.audit('Salary updated', {
                employeeId: employee._id,
                updatedBy: req.user?.email,
                // Don't log actual salary values for privacy
                salaryChanged: true
            });
        }
        
        res.json({ success: true, data: employee });
    } catch (error) {
        if (req.companyLogger) {
            req.companyLogger.error('Salary update failed', {
                error: error.message,
                employeeId: req.body.employeeId,
                userId: req.user?.id
            });
        }
        
        res.status(500).json({ success: false, message: error.message });
    }
}

// Example 4: Batch operation logging
export async function bulkUpdateEmployees(req, res) {
    const { updates } = req.body;
    const results = [];
    
    if (req.companyLogger) {
        req.companyLogger.info('Bulk employee update started', {
            updateCount: updates.length,
            initiatedBy: req.user?.email,
            batchId: req.headers['x-batch-id']
        });
    }
    
    for (const update of updates) {
        try {
            const employee = await Employee.findByIdAndUpdate(update.id, update.data);
            results.push({ id: update.id, success: true });
            
            if (req.companyLogger) {
                req.companyLogger.audit('Employee updated in batch', {
                    employeeId: update.id,
                    batchId: req.headers['x-batch-id'],
                    updatedFields: Object.keys(update.data)
                });
            }
        } catch (error) {
            results.push({ id: update.id, success: false, error: error.message });
            
            if (req.companyLogger) {
                req.companyLogger.error('Batch update failed for employee', {
                    employeeId: update.id,
                    error: error.message,
                    batchId: req.headers['x-batch-id']
                });
            }
        }
    }
    
    if (req.companyLogger) {
        const successCount = results.filter(r => r.success).length;
        req.companyLogger.info('Bulk employee update completed', {
            totalUpdates: updates.length,
            successful: successCount,
            failed: updates.length - successCount,
            batchId: req.headers['x-batch-id']
        });
    }
    
    res.json({ success: true, results });
}
