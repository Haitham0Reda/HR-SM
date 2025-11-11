/**
 * Middleware to map frontend field names to backend model field names
 * This must run BEFORE other leave middleware
 */
export const mapLeaveFields = (req, res, next) => {
    // Map 'user' to 'employee'
    if (req.body.user) {
        req.body.employee = req.body.user;
        delete req.body.user;
    }

    // Map 'type' to 'leaveType'
    if (req.body.type) {
        req.body.leaveType = req.body.type;
        delete req.body.type;
    }

    next();
};

export default mapLeaveFields;
