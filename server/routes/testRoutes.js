/**
 * Test-only routes for E2E testing
 * These routes are only available when NODE_ENV=test
 */

import express from 'express';
import { mainAppDb } from '../config/database.js';
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Company from '../platform/models/Company.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

/**
 * POST /api/v1/test/seed
 * Seeds baseline test data for a tenant
 */
router.post('/seed', async (req, res) => {
    try {
        const { tenantId } = req.body;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'tenantId is required'
            });
        }

        // Start transaction
        const transaction = await mainAppDb.transaction();

        try {
            // Check if tenant exists
            const tenant = await Company.findByPk(tenantId, { transaction });
            
            if (!tenant) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: `Tenant ${tenantId} not found`
                });
            }

            // Create test departments
            const departments = await Department.bulkCreate([
                {
                    name: 'Engineering',
                    tenantId: tenantId,
                    description: 'Engineering Department',
                    isActive: true
                },
                {
                    name: 'Human Resources',
                    tenantId: tenantId,
                    description: 'HR Department',
                    isActive: true
                },
                {
                    name: 'Sales',
                    tenantId: tenantId,
                    description: 'Sales Department',
                    isActive: true
                }
            ], { transaction });

            // Create test users with different roles
            const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
            
            const users = await User.bulkCreate([
                {
                    username: `admin-${tenantId}`,
                    email: `admin-${tenantId}@test.com`,
                    password: hashedPassword,
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'admin',
                    tenantId: tenantId,
                    isActive: true
                },
                {
                    username: `hr-${tenantId}`,
                    email: `hr-${tenantId}@test.com`,
                    password: hashedPassword,
                    firstName: 'HR',
                    lastName: 'Manager',
                    role: 'hr_manager',
                    tenantId: tenantId,
                    isActive: true
                },
                {
                    username: `manager-${tenantId}`,
                    email: `manager-${tenantId}@test.com`,
                    password: hashedPassword,
                    firstName: 'Team',
                    lastName: 'Manager',
                    role: 'manager',
                    tenantId: tenantId,
                    departmentId: departments[0].id,
                    isActive: true
                },
                {
                    username: `employee-${tenantId}`,
                    email: `employee-${tenantId}@test.com`,
                    password: hashedPassword,
                    firstName: 'Test',
                    lastName: 'Employee',
                    role: 'employee',
                    tenantId: tenantId,
                    departmentId: departments[0].id,
                    isActive: true
                }
            ], { transaction });

            await transaction.commit();

            res.json({
                success: true,
                message: `Tenant ${tenantId} seeded successfully`,
                data: {
                    tenantId,
                    departments: departments.length,
                    users: users.length
                }
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error seeding tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to seed tenant',
            error: error.message
        });
    }
});

/**
 * DELETE /api/v1/test/cleanup
 * Cleans up test data for a tenant
 */
router.delete('/cleanup', async (req, res) => {
    try {
        const { tenantId } = req.body;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'tenantId is required'
            });
        }

        // Start transaction
        const transaction = await mainAppDb.transaction();

        try {
            // Delete users created by seed (identified by email pattern)
            await User.destroy({
                where: {
                    tenantId: tenantId,
                    email: {
                        [mainAppDb.Sequelize.Op.like]: '%-' + tenantId + '@test.com'
                    }
                },
                transaction
            });

            // Delete departments created by seed
            await Department.destroy({
                where: { 
                    tenantId: tenantId,
                    name: {
                        [mainAppDb.Sequelize.Op.in]: ['Engineering', 'Human Resources', 'Sales']
                    }
                },
                transaction
            });

            await transaction.commit();

            res.json({
                success: true,
                message: `Tenant ${tenantId} cleaned up successfully`
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error cleaning up tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup tenant',
            error: error.message
        });
    }
});

/**
 * GET /api/v1/test/health
 * Health check endpoint for test environment
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Test routes are active',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/v1/test/reset-database
 * Resets the entire test database (use with caution)
 */
router.post('/reset-database', async (req, res) => {
    try {
        const { confirm } = req.body;

        if (confirm !== 'RESET_ALL_DATA') {
            return res.status(400).json({
                success: false,
                message: 'Confirmation required. Send { confirm: "RESET_ALL_DATA" }'
            });
        }

        // Sync database (drop and recreate all tables)
        await mainAppDb.sync({ force: true });

        res.json({
            success: true,
            message: 'Database reset successfully'
        });

    } catch (error) {
        console.error('Error resetting database:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset database',
            error: error.message
        });
    }
});

export default router;
