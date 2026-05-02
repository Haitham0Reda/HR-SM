/**
 * Leave Middleware
 * 
 * Business logic and validation for leave requests
 * Extracted from leave.model.js to follow middleware organization pattern
 */
// Note: This middleware needs refactoring - some functions are post-save hooks
// that should be moved to model hooks or service layer

/**
 * Populate department and position from employee before save
 * TODO: This needs to be refactored to use Sequelize
 */
export const populateDepartmentPosition = async (req, res, next) => {
    // Temporarily disabled - needs Sequelize migration
    console.warn('populateDepartmentPosition middleware needs Sequelize migration');
    next();
};

/**
 * Calculate leave duration from start and end dates
 * Excludes Fridays (5) and Saturdays (6) as they are official holidays
 */
export const calculateDuration = (req, res, next) => {
    if (req.body.startDate && req.body.endDate) {
        const start = new Date(req.body.startDate);
        const end = new Date(req.body.endDate);

        let workingDays = 0;
        const current = new Date(start);

        // Loop through each day and count only working days (Sunday-Thursday)
        while (current <= end) {
            const dayOfWeek = current.getDay();
            // 0 = Sunday, 1 = Monday, ..., 4 = Thursday (working days)
            // 5 = Friday, 6 = Saturday (official holidays - excluded)
            if (dayOfWeek !== 5 && dayOfWeek !== 6) {
                workingDays++;
            }
            current.setDate(current.getDate() + 1);
        }

        req.body.duration = workingDays;
    }
    next();
};

/**
 * Set medical documentation requirement for sick leave
 */
export const setMedicalDocRequirement = (req, res, next) => {
    if (req.body.leaveType === 'sick' && req.body.duration > 1) {
        if (!req.body.medicalDocumentation) {
            req.body.medicalDocumentation = {};
        }
        req.body.medicalDocumentation.required = true;
    }
    next();
};

/**
 * Reserve vacation balance for pending leave requests
 * TODO: This needs to be refactored to use Sequelize
 */
export const reserveVacationBalance = async (req, res, next) => {
    // Temporarily disabled - needs Sequelize migration
    console.warn('reserveVacationBalance middleware needs Sequelize migration');
    next();
};

/**
 * Initialize workflow based on leave type
 */
export const initializeWorkflow = (req, res, next) => {
    if (!req.body.workflow) {
        req.body.workflow = {};
    }

    if (req.body.leaveType === 'sick') {
        req.body.workflow.currentStep = 'manager-review';
        req.body.workflow.doctorApprovalStatus = 'pending';
    } else if (req.body.leaveType === 'mission') {
        req.body.workflow.currentStep = 'manager-review';
        req.body.workflow.doctorApprovalStatus = 'not-required';
    } else {
        req.body.workflow.doctorApprovalStatus = 'not-required';
    }

    next();
};

/**
 * Handle vacation balance updates on status change (post-save)
 * TODO: This should be moved to a model hook or service layer
 */
export const handleVacationBalanceUpdate = async (leave) => {
    // Temporarily disabled - needs Sequelize migration and should be a model hook
    console.warn('handleVacationBalanceUpdate needs to be moved to model hooks');
};

/**
 * Create notifications on workflow/status changes (post-save)
 * TODO: This should be moved to a model hook or service layer
 */
export const createLeaveNotifications = async (leave, previousValues) => {
    // Temporarily disabled - needs Sequelize migration and should be a model hook
    console.warn('createLeaveNotifications needs to be moved to model hooks');
};

export default {
    populateDepartmentPosition,
    calculateDuration,
    setMedicalDocRequirement,
    reserveVacationBalance,
    initializeWorkflow,
    handleVacationBalanceUpdate,
    createLeaveNotifications
};
