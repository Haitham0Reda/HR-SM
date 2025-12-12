/**
 * Resigned Employee Controller
 * 
 * Manages resigned employees, letters, and penalties
 */
import ResignedEmployee from '../models/resignedEmployee.model.js';
import User from '../models/user.model.js';

/**
 * Get all resigned employees
 */
export const getAllResignedEmployees = async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const resignedEmployees = await ResignedEmployee.findAllResigned({
            status,
            limit: parseInt(limit),
            skip
        });

        const total = await ResignedEmployee.countDocuments(status ? { status } : {});

        // Ensure we return an array
        const employeesArray = Array.isArray(resignedEmployees) ? resignedEmployees : [];

        res.json({
            success: true,
            resignedEmployees: employeesArray,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get resigned employee by ID
 */
export const getResignedEmployeeById = async (req, res) => {
    try {
        const resignedEmployee = await ResignedEmployee.findById(req.params.id)
            .populate('employee', 'profile employeeId department position employment')
            .populate('employee.department', 'name arabicName')
            .populate('employee.position', 'title arabicTitle')
            .populate('processedBy', 'username email')
            .populate('letterGeneratedBy', 'username email')
            .populate('penalties.addedBy', 'username email');

        if (!resignedEmployee) {
            return res.status(404).json({ error: 'Resigned employee not found' });
        }

        res.json({
            success: true,
            resignedEmployee,
            canModify: resignedEmployee.canModify
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create resigned employee record
 */
export const createResignedEmployee = async (req, res) => {
    try {
        const { employeeId, resignationType, resignationDate, lastWorkingDay, reason } = req.body;

        // Check if employee exists
        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Check if already exists
        const existing = await ResignedEmployee.findOne({ employee: employeeId });
        if (existing) {
            return res.status(400).json({ error: 'Employee already in resigned list' });
        }

        // Update employee status
        employee.employment.employmentStatus = 'resigned';
        employee.employment.resignationDate = resignationDate;
        employee.isActive = false;
        await employee.save();

        // Create resigned employee record
        const resignedEmployee = new ResignedEmployee({
            employee: employeeId,
            resignationType,
            resignationDate,
            lastWorkingDay,
            reason,
            processedBy: req.user._id,
            processedDate: new Date()
        });

        await resignedEmployee.save();
        await resignedEmployee.populate('employee', 'profile employeeId department position');

        res.status(201).json({
            success: true,
            message: 'Resigned employee record created successfully',
            resignedEmployee
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update resignation type
 */
export const updateResignationType = async (req, res) => {
    try {
        const { resignationType } = req.body;

        const resignedEmployee = await ResignedEmployee.findById(req.params.id);
        if (!resignedEmployee) {
            return res.status(404).json({ error: 'Resigned employee not found' });
        }

        await resignedEmployee.updateResignationType(resignationType);

        res.json({
            success: true,
            message: 'Resignation type updated successfully',
            resignedEmployee
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Add penalty
 */
export const addPenalty = async (req, res) => {
    try {
        const { description, amount, currency, notes } = req.body;

        const resignedEmployee = await ResignedEmployee.findById(req.params.id);
        if (!resignedEmployee) {
            return res.status(404).json({ error: 'Resigned employee not found' });
        }

        await resignedEmployee.addPenalty(
            { description, amount, currency: currency || 'EGP', notes },
            req.user._id
        );

        await resignedEmployee.populate('penalties.addedBy', 'username email');

        res.json({
            success: true,
            message: 'Penalty added successfully',
            resignedEmployee,
            totalPenalties: resignedEmployee.totalPenalties
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Remove penalty
 */
export const removePenalty = async (req, res) => {
    try {
        const { penaltyId } = req.params;

        const resignedEmployee = await ResignedEmployee.findById(req.params.id);
        if (!resignedEmployee) {
            return res.status(404).json({ error: 'Resigned employee not found' });
        }

        await resignedEmployee.removePenalty(penaltyId);

        res.json({
            success: true,
            message: 'Penalty removed successfully',
            resignedEmployee,
            totalPenalties: resignedEmployee.totalPenalties
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Generate letter
 */
export const generateLetter = async (req, res) => {
    try {
        const resignedEmployee = await ResignedEmployee.findById(req.params.id);
        if (!resignedEmployee) {
            return res.status(404).json({ error: 'Resigned employee not found' });
        }

        await resignedEmployee.generateLetter(req.user._id);
        await resignedEmployee.populate('employee', 'profile employeeId department position employment');

        res.json({
            success: true,
            message: 'Letter generated successfully',
            letter: resignedEmployee.letterContent,
            resignedEmployee
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Generate Arabic disclaimer
 */
export const generateArabicDisclaimer = async (req, res) => {
    try {
        const resignedEmployee = await ResignedEmployee.findById(req.params.id)
            .populate('employee', 'profile employeeId department position employment')
            .populate('employee.department', 'arabicName');

        if (!resignedEmployee) {
            return res.status(404).json({ error: 'Resigned employee not found' });
        }

        const employee = resignedEmployee.employee;
        const isMale = employee.profile.gender === 'male';

        // Generate gender-specific Arabic text
        const disclaimerText = isMale
            ? generateMaleDisclaimer(employee, resignedEmployee)
            : generateFemaleDisclaimer(employee, resignedEmployee);

        resignedEmployee.arabicDisclaimerGenerated = true;
        resignedEmployee.arabicDisclaimerDate = new Date();
        await resignedEmployee.save();

        res.json({
            success: true,
            message: 'Arabic disclaimer generated successfully',
            disclaimer: disclaimerText,
            employee: {
                name: employee.profile.arabicName || `${employee.profile.firstName} ${employee.profile.lastName}`,
                gender: employee.profile.gender,
                department: employee.department?.arabicName,
                organization: employee.organization?.arabicName
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Helper: Generate male Arabic disclaimer
 */
function generateMaleDisclaimer(employee, resignedEmployee) {
    const employeeId = ResignedEmployee.toArabicNumerals(employee.employeeId);
    const name = employee.profile.arabicName || `${employee.profile.firstName} ${employee.profile.lastName}`;
    const department = employee.department?.arabicName || 'القسم';
    const organization = employee.organization?.arabicName || 'المعهد';

    return `
إقرار

أقر أنا الموظف / ${name}
رقم الوظيفة: ${employeeId}
القسم: ${department}
${organization}

بأنني تسلمت جميع مستحقاتي المالية من المعهد وليس لي أي مطالبات مالية أخرى.

كما أقر بأنني قمت بتسليم جميع الممتلكات الخاصة بالمعهد والتي كانت في عهدتي.

وأقر بأنني لن أطالب المعهد بأي مستحقات مالية أو غيرها مستقبلاً.

التوقيع: _______________
التاريخ: ${new Date().toLocaleDateString('ar-EG')}
`;
}

/**
 * Helper: Generate female Arabic disclaimer
 */
function generateFemaleDisclaimer(employee, resignedEmployee) {
    const employeeId = ResignedEmployee.toArabicNumerals(employee.employeeId);
    const name = employee.profile.arabicName || `${employee.profile.firstName} ${employee.profile.lastName}`;
    const department = employee.department?.arabicName || 'القسم';
    const organization = employee.organization?.arabicName || 'المعهد';

    return `
إقرار

أقر أنا الموظفة / ${name}
رقم الوظيفة: ${employeeId}
القسم: ${department}
${organization}

بأنني تسلمت جميع مستحقاتي المالية من المعهد وليس لي أي مطالبات مالية أخرى.

كما أقر بأنني قمت بتسليم جميع الممتلكات الخاصة بالمعهد والتي كانت في عهدتي.

وأقر بأنني لن أطالب المعهد بأي مستحقات مالية أو غيرها مستقبلاً.

التوقيع: _______________
التاريخ: ${new Date().toLocaleDateString('ar-EG')}
`;
}

/**
 * Lock resigned employee record
 */
export const lockResignedEmployee = async (req, res) => {
    try {
        const resignedEmployee = await ResignedEmployee.findById(req.params.id);
        if (!resignedEmployee) {
            return res.status(404).json({ error: 'Resigned employee not found' });
        }

        await resignedEmployee.lock();

        res.json({
            success: true,
            message: 'Resigned employee record locked successfully',
            resignedEmployee
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Update status
 */
export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const resignedEmployee = await ResignedEmployee.findById(req.params.id);
        if (!resignedEmployee) {
            return res.status(404).json({ error: 'Resigned employee not found' });
        }

        resignedEmployee.status = status;
        await resignedEmployee.save();

        res.json({
            success: true,
            message: 'Status updated successfully',
            resignedEmployee
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Delete resigned employee record
 */
export const deleteResignedEmployee = async (req, res) => {
    try {
        const resignedEmployee = await ResignedEmployee.findByIdAndDelete(req.params.id);
        if (!resignedEmployee) {
            return res.status(404).json({ error: 'Resigned employee not found' });
        }

        res.json({
            success: true,
            message: 'Resigned employee record deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
