/**
 * Mixed Vacation Middleware
 * 
 * Validation and business logic for mixed vacation policies
 */
// No mongoose imports needed - this middleware only does validation

/**
 * Validate date range
 */
export const validateDateRange = (req, res, next) => {
    const { startDate, endDate } = req.body;

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Allow same date for single-day policies
        if (end < start) {
            return res.status(400).json({
                success: false,
                message: 'End date cannot be before start date'
            });
        }

        // Check if date range is reasonable (not more than 30 days)
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
        if (diffDays > 30) {
            return res.status(400).json({
                success: false,
                message: 'Mixed vacation period cannot exceed 30 days'
            });
        }
    }

    next();
};

/**
 * Validate total days
 */
export const validateTotalDays = (req, res, next) => {
    const { totalDays } = req.body;

    if (totalDays !== undefined) {
        if (typeof totalDays !== 'number' || totalDays < 1 || totalDays > 30) {
            return res.status(400).json({
                success: false,
                message: 'Total days must be between 1 and 30'
            });
        }
    }

    next();
};

/**
 * Validate deduction strategy
 */
export const validateDeductionStrategy = (req, res, next) => {
    const { deductionStrategy } = req.body;

    if (deductionStrategy) {
        const validStrategies = ['annual-first', 'casual-first', 'proportional', 'auto'];

        if (!validStrategies.includes(deductionStrategy)) {
            return res.status(400).json({
                success: false,
                message: `Invalid deduction strategy. Valid strategies: ${validStrategies.join(', ')}`
            });
        }
    }

    next();
};

/**
 * Validate applicable scope
 */
export const validateApplicableScope = (req, res, next) => {
    const { applicableTo } = req.body;

    if (applicableTo) {
        const { departments, allEmployees } = applicableTo;

        if (!allEmployees && (!departments || departments.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Must specify departments or select all employees'
            });
        }

        // Validate UUIDs for departments (Sequelize uses UUIDs instead of ObjectIds)
        if (departments && departments.length > 0) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const invalidIds = departments.filter(id => !uuidRegex.test(id));
            if (invalidIds.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid department IDs',
                    invalidIds
                });
            }
        }
    }

    next();
};

/**
 * Validate employee ID
 */
export const validateEmployeeId = (req, res, next) => {
    const { employeeId } = req.params;

    if (employeeId) {
        // Validate UUID format (Sequelize uses UUIDs instead of ObjectIds)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(employeeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID'
            });
        }
    }

    next();
};

/**
 * Validate policy status
 */
export const validatePolicyStatus = (req, res, next) => {
    const { status } = req.body;

    if (status) {
        const validStatuses = ['draft', 'active', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
            });
        }
    }

    next();
};

/**
 * Check policy exists
 */
export const checkPolicyExists = async (req, res, next) => {
    try {
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Import the controller's getTenantModels function directly
        const { getTenantModels } = await import('../modules/hr-core/vacations/controllers/mixedVacation.controller.js');

        // Get tenant-specific models using the same function as the controller
        const { MixedVacation } = await getTenantModels(tenantId);

        const policy = await MixedVacation.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: 'Mixed vacation policy not found'
            });
        }

        req.policy = policy;
        next();
    } catch (error) {
        console.error('Error checking policy:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking policy'
        });
    }
};

/**
 * Check employee exists
 */
export const checkEmployeeExists = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        
        // Get tenantId from user context (set by auth middleware)
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Import the controller's getTenantModels function directly
        const { getTenantModels } = await import('../modules/hr-core/vacations/controllers/mixedVacation.controller.js');

        // Get tenant-specific models using the same function as the controller
        const { User } = await getTenantModels(tenantId);

        const employee = await User.findOne({ 
            _id: employeeId,
            tenantId: tenantId 
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        if (!employee.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Employee is not active'
            });
        }

        req.employee = employee;
        next();
    } catch (error) {
        console.error('Error checking employee:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking employee'
        });
    }
};

export default {
    validateDateRange,
    validateTotalDays,
    validateDeductionStrategy,
    validateApplicableScope,
    validateEmployeeId,
    validatePolicyStatus,
    checkPolicyExists,
    checkEmployeeExists
};
