/**
 * ID Card Middleware
 * 
 * Validates ID card operations and batch processing.
 */
import IDCard from '../modules/hr-core/users/models/idCard.model.js';
import User from '../modules/hr-core/users/models/user.model.js';
import { Op } from 'sequelize';

/**
 * Validate ID card expiry middleware
 * Ensures expiry date is in the future
 */
export const validateIDCardExpiry = (req, res, next) => {
    if (req.body.expiry?.expiryDate) {
        const expiryDate = new Date(req.body.expiry.expiryDate);
        const now = new Date();

        if (expiryDate <= now) {
            return res.status(400).json({
                success: false,
                message: 'ID card expiry date must be in the future'
            });
        }

        // Typically ID cards should be valid for at least 30 days
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (expiryDate < thirtyDaysFromNow) {
            return res.status(400).json({
                success: false,
                message: 'ID card must be valid for at least 30 days'
            });
        }
    }
    next();
};

/**
 * Check active ID card middleware
 * Prevents creating duplicate active cards
 */
export const checkActiveIDCard = async (req, res, next) => {
    try {
        if (req.body.employee) {
            const activeCard = await IDCard.findOne({
                where: {
                    employee_id: req.body.employee,
                    status: 'active',
                    is_active: true
                }
            });

            if (activeCard) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee already has an active ID card',
                    existingCard: activeCard.id
                });
            }
        }
        next();
    } catch (error) {
        console.error('Check active ID card error:', error);
        next();
    }
};

/**
 * Generate ID card number middleware
 * Auto-generates unique card number
 */
export const generateCardNumber = async (req, res, next) => {
    try {
        if (!req.body.cardNumber && req.body.employee) {
            const employee = await User.findByPk(req.body.employee, {
                attributes: ['id', 'employee_id']
            });

            if (employee) {
                const year = new Date().getFullYear();
                req.body.cardNumber = `CARD-${employee.employee_id}-${year}`;
            }
        }
        next();
    } catch (error) {
        console.error('Generate card number error:', error);
        next();
    }
};

/**
 * Validate ID card batch middleware
 * Ensures batch has valid cards
 */
export const validateBatchCards = async (req, res, next) => {
    try {
        if (req.body.cards && Array.isArray(req.body.cards)) {
            if (req.body.cards.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Batch must contain at least one card'
                });
            }

            // Limit batch size
            if (req.body.cards.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Batch cannot exceed 100 cards'
                });
            }

            // Verify all cards exist
            const cards = await IDCard.findAll({
                where: {
                    id: {
                        [Op.in]: req.body.cards
                    }
                }
            });

            if (cards.length !== req.body.cards.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Some card IDs are invalid'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Validate batch cards error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating batch cards'
        });
    }
};

/**
 * Generate batch number middleware
 * Auto-generates unique batch number
 */
export const generateBatchNumber = (req, res, next) => {
    if (!req.body.batchNumber) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        req.body.batchNumber = `BATCH-${timestamp}-${random}`;
    }
    next();
};
