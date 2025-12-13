/**
 * Multi-Tenant Route Example
 * 
 * This example shows how to update existing routes to work with the multi-tenant system
 */

import express from 'express';
import mongoose from 'mongoose';
import { tenantMiddleware, requireCompany, getCompanyModel } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Employee Schema (same for all companies)
const employeeSchema = new mongoose.Schema({
    employeeId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    position: { type: String, required: true },
    salary: { type: Number },
    hireDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Apply tenant middleware to all routes
router.use(tenantMiddleware);

// Routes that require a valid company
router.use(requireCompany);

// GET /api/employees - List all employees for the company
router.get('/employees', async (req, res) => {
    try {
        // Get Employee model for the current company's database
        const Employee = getCompanyModel(req, 'Employee', employeeSchema);
        
        const employees = await Employee.find({ isActive: true })
            .select('-__v')
            .sort({ lastName: 1, firstName: 1 });

        res.json({
            success: true,
            company: req.company.name,
            count: employees.length,
            data: employees
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employees',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// POST /api/employees - Create new employee
router.post('/employees', async (req, res) => {
    try {
        const Employee = getCompanyModel(req, 'Employee', employeeSchema);
        
        // Generate employee ID if not provided
        if (!req.body.employeeId) {
            const count = await Employee.countDocuments();
            req.body.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
        }

        const employee = new Employee(req.body);
        await employee.save();

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            company: req.company.name,
            data: employee
        });
    } catch (error) {
        console.error('Error creating employee:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID or email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating employee',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/employees/:id - Get specific employee
router.get('/employees/:id', async (req, res) => {
    try {
        const Employee = getCompanyModel(req, 'Employee', employeeSchema);
        
        const employee = await Employee.findById(req.params.id).select('-__v');
        
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            company: req.company.name,
            data: employee
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employee'
        });
    }
});

// PUT /api/employees/:id - Update employee
router.put('/employees/:id', async (req, res) => {
    try {
        const Employee = getCompanyModel(req, 'Employee', employeeSchema);
        
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select('-__v');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            message: 'Employee updated successfully',
            company: req.company.name,
            data: employee
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating employee'
        });
    }
});

// DELETE /api/employees/:id - Soft delete employee
router.delete('/employees/:id', async (req, res) => {
    try {
        const Employee = getCompanyModel(req, 'Employee', employeeSchema);
        
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { isActive: false, updatedAt: new Date() },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            message: 'Employee deactivated successfully',
            company: req.company.name
        });
    } catch (error) {
        console.error('Error deactivating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error deactivating employee'
        });
    }
});

// GET /api/company/info - Get current company information
router.get('/company/info', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                name: req.company.name,
                sanitizedName: req.company.sanitizedName,
                backupPath: req.company.backupPath,
                uploadPath: req.company.uploadPath,
                companyData: req.companyData
            }
        });
    } catch (error) {
        console.error('Error fetching company info:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company information'
        });
    }
});

// GET /api/company/stats - Get company statistics
router.get('/company/stats', async (req, res) => {
    try {
        const Employee = getCompanyModel(req, 'Employee', employeeSchema);
        
        const stats = await Employee.aggregate([
            {
                $group: {
                    _id: null,
                    totalEmployees: { $sum: 1 },
                    activeEmployees: {
                        $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                    },
                    inactiveEmployees: {
                        $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
                    }
                }
            }
        ]);

        const departmentStats = await Employee.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            company: req.company.name,
            data: {
                overview: stats[0] || { totalEmployees: 0, activeEmployees: 0, inactiveEmployees: 0 },
                departmentBreakdown: departmentStats
            }
        });
    } catch (error) {
        console.error('Error fetching company stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching company statistics'
        });
    }
});

export default router;

/*
Usage Example:

1. In your main app.js:
   import multiTenantRoutes from './examples/multiTenantRouteExample.js';
   app.use('/api', multiTenantRoutes);

2. Making requests:
   
   // With header
   curl -H "x-company-id: acme_corporation" http://localhost:5000/api/employees
   
   // With query parameter
   curl http://localhost:5000/api/employees?company=acme_corporation
   
   // With JWT token (include company in token payload)
   curl -H "Authorization: Bearer your_jwt_token" http://localhost:5000/api/employees

3. Creating a new employee:
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "x-company-id: acme_corporation" \
     -d '{
       "firstName": "John",
       "lastName": "Doe",
       "email": "john.doe@acme.com",
       "department": "Engineering",
       "position": "Software Developer",
       "salary": 75000
     }' \
     http://localhost:5000/api/employees
*/