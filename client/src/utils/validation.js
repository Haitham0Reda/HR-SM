/**
 * Frontend validation using Zod
 * Provides schema validation for forms and data
 */
import { z } from 'zod';

/**
 * User validation schemas
 */
export const userSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
            'Password must contain uppercase, lowercase, and number'),
    firstName: z.string()
        .min(2, 'First name must be at least 2 characters')
        .max(100, 'First name must not exceed 100 characters'),
    lastName: z.string()
        .min(2, 'Last name must be at least 2 characters')
        .max(100, 'Last name must not exceed 100 characters'),
    phone: z.string()
        .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number')
        .optional(),
    role: z.enum(['employee', 'manager', 'hr', 'admin'])
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
});

export const updateUserSchema = userSchema.partial().omit({ password: true });

/**
 * Leave validation schemas
 */
export const leaveSchema = z.object({
    leaveType: z.enum(['sick', 'annual', 'personal', 'maternity', 'paternity', 'unpaid']),
    startDate: z.string().datetime('Invalid start date'),
    endDate: z.string().datetime('Invalid end date'),
    reason: z.string()
        .min(10, 'Reason must be at least 10 characters')
        .max(500, 'Reason must not exceed 500 characters')
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate']
});

/**
 * Announcement validation schemas
 */
export const announcementSchema = z.object({
    title: z.string()
        .min(5, 'Title must be at least 5 characters')
        .max(200, 'Title must not exceed 200 characters'),
    content: z.string()
        .min(10, 'Content must be at least 10 characters')
        .max(5000, 'Content must not exceed 5000 characters'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
});

/**
 * Department validation schemas
 */
export const departmentSchema = z.object({
    name: z.string()
        .min(2, 'Department name must be at least 2 characters')
        .max(100, 'Department name must not exceed 100 characters'),
    description: z.string()
        .max(500, 'Description must not exceed 500 characters')
        .optional()
});

/**
 * Attendance validation schemas
 */
export const attendanceSchema = z.object({
    date: z.string().datetime('Invalid date'),
    checkIn: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    checkOut: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
    status: z.enum(['present', 'absent', 'late', 'half-day'])
});

/**
 * Payroll validation schemas
 */
export const payrollSchema = z.object({
    basicSalary: z.number().positive('Basic salary must be positive'),
    allowances: z.number().nonnegative('Allowances cannot be negative').optional(),
    deductions: z.number().nonnegative('Deductions cannot be negative').optional(),
    bonus: z.number().nonnegative('Bonus cannot be negative').optional(),
    month: z.number().min(1).max(12, 'Invalid month'),
    year: z.number().min(2000).max(2100, 'Invalid year')
});

/**
 * Document validation schemas
 */
export const documentSchema = z.object({
    title: z.string()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must not exceed 200 characters'),
    description: z.string()
        .max(1000, 'Description must not exceed 1000 characters')
        .optional(),
    category: z.string().min(1, 'Category is required'),
    file: z.instanceof(File).optional()
});

/**
 * Survey validation schemas
 */
export const surveySchema = z.object({
    title: z.string()
        .min(5, 'Title must be at least 5 characters')
        .max(200, 'Title must not exceed 200 characters'),
    description: z.string()
        .max(1000, 'Description must not exceed 1000 characters')
        .optional(),
    questions: z.array(z.object({
        question: z.string().min(5, 'Question must be at least 5 characters'),
        type: z.enum(['text', 'multiple-choice', 'rating', 'yes-no']),
        options: z.array(z.string()).optional()
    })).min(1, 'At least one question is required')
});

/**
 * Validate data against a schema
 */
export const validateData = (schema, data) => {
    try {
        const result = schema.parse(data);
        return { success: true, data: result };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                errors: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            };
        }
        return { success: false, errors: [{ message: 'Validation failed' }] };
    }
};

/**
 * Validate data and return only errors
 */
export const getValidationErrors = (schema, data) => {
    const result = validateData(schema, data);
    return result.success ? null : result.errors;
};

export default {
    userSchema,
    loginSchema,
    updateUserSchema,
    leaveSchema,
    announcementSchema,
    departmentSchema,
    attendanceSchema,
    payrollSchema,
    documentSchema,
    surveySchema,
    validateData,
    getValidationErrors
};
