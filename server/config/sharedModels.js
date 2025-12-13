/**
 * Shared Models Configuration
 * 
 * Ensures all models are available across all company databases
 * Creates a centralized model registry for multi-tenant usage
 */

import mongoose from 'mongoose';

// HR Core Models
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Position from '../modules/hr-core/users/models/position.model.js';
import Role from '../modules/hr-core/users/models/role.model.js';

// Attendance Models
import Attendance from '../modules/hr-core/attendance/models/attendance.model.js';
import ForgetCheck from '../modules/hr-core/attendance/models/forgetCheck.model.js';

// Holiday Models
import Holiday from '../modules/hr-core/holidays/models/holiday.model.js';

// Vacation Models
import Vacation from '../modules/hr-core/vacations/models/vacation.model.js';
import SickLeave from '../modules/hr-core/vacations/models/sickLeave.model.js';
import MixedVacation from '../modules/hr-core/vacations/models/mixedVacation.model.js';
import VacationBalance from '../modules/hr-core/vacations/models/vacationBalance.model.js';

// Mission Models
import Mission from '../modules/hr-core/missions/models/mission.model.js';

// Request Models
import Request from '../modules/hr-core/requests/models/request.model.js';
import Permission from '../modules/hr-core/requests/models/permission.model.js';
import RequestControl from '../modules/hr-core/requests/models/requestControl.model.js';

// Document Models
import Document from '../modules/documents/models/document.model.js';
import DocumentTemplate from '../modules/documents/models/documentTemplate.model.js';
import Hardcopy from '../modules/documents/models/hardcopy.model.js';

// Event Models
import Event from '../modules/events/models/event.model.js';

// Announcement Models
import Announcement from '../modules/announcements/models/announcement.model.js';

// Notification Models
import Notification from '../modules/notifications/models/notification.model.js';

// Payroll Models
import Payroll from '../modules/payroll/models/payroll.model.js';

// Report Models
import Report from '../modules/reports/models/report.model.js';
import ReportConfig from '../modules/reports/models/reportConfig.model.js';
import ReportExecution from '../modules/reports/models/reportExecution.model.js';
import ReportExport from '../modules/reports/models/reportExport.model.js';

// Survey Models
import Survey from '../modules/surveys/models/survey.model.js';
import SurveyNotification from '../modules/surveys/models/surveyNotification.model.js';

// Dashboard Models
import DashboardConfig from '../modules/dashboard/models/dashboardConfig.model.js';

// Theme Models
import ThemeConfig from '../modules/theme/models/themeConfig.model.js';

// Model Registry - Maps model names to their schemas and imports
export const MODEL_REGISTRY = {
    // HR Core Models
    'User': { model: User, schema: User.schema },
    'Department': { model: Department, schema: Department.schema },
    'Position': { model: Position, schema: Position.schema },
    'Role': { model: Role, schema: Role.schema },
    
    // Attendance Models
    'Attendance': { model: Attendance, schema: Attendance.schema },
    'ForgetCheck': { model: ForgetCheck, schema: ForgetCheck.schema },
    
    // Holiday Models
    'Holiday': { model: Holiday, schema: Holiday.schema },
    
    // Vacation Models
    'Vacation': { model: Vacation, schema: Vacation.schema },
    'SickLeave': { model: SickLeave, schema: SickLeave.schema },
    'MixedVacation': { model: MixedVacation, schema: MixedVacation.schema },
    'VacationBalance': { model: VacationBalance, schema: VacationBalance.schema },
    
    // Mission Models
    'Mission': { model: Mission, schema: Mission.schema },
    
    // Request Models
    'Request': { model: Request, schema: Request.schema },
    'Permission': { model: Permission, schema: Permission.schema },
    'RequestControl': { model: RequestControl, schema: RequestControl.schema },
    
    // Document Models
    'Document': { model: Document, schema: Document.schema },
    'DocumentTemplate': { model: DocumentTemplate, schema: DocumentTemplate.schema },
    'Hardcopy': { model: Hardcopy, schema: Hardcopy.schema },
    
    // Event Models
    'Event': { model: Event, schema: Event.schema },
    
    // Announcement Models
    'Announcement': { model: Announcement, schema: Announcement.schema },
    
    // Notification Models
    'Notification': { model: Notification, schema: Notification.schema },
    
    // Payroll Models
    'Payroll': { model: Payroll, schema: Payroll.schema },
    
    // Report Models
    'Report': { model: Report, schema: Report.schema },
    'ReportConfig': { model: ReportConfig, schema: ReportConfig.schema },
    'ReportExecution': { model: ReportExecution, schema: ReportExecution.schema },
    'ReportExport': { model: ReportExport, schema: ReportExport.schema },
    
    // Survey Models
    'Survey': { model: Survey, schema: Survey.schema },
    'SurveyNotification': { model: SurveyNotification, schema: SurveyNotification.schema },
    
    // Dashboard Models
    'DashboardConfig': { model: DashboardConfig, schema: DashboardConfig.schema },
    
    // Theme Models
    'ThemeConfig': { model: ThemeConfig, schema: ThemeConfig.schema }
};

/**
 * Get a model for a specific connection
 * @param {mongoose.Connection} connection - Database connection
 * @param {string} modelName - Name of the model
 * @returns {mongoose.Model} - Model instance for the connection
 */
export function getModelForConnection(connection, modelName) {
    if (!MODEL_REGISTRY[modelName]) {
        throw new Error(`Model '${modelName}' not found in registry`);
    }

    // Check if model already exists on this connection
    if (connection.models[modelName]) {
        return connection.models[modelName];
    }

    // Create model on this connection
    const { schema } = MODEL_REGISTRY[modelName];
    return connection.model(modelName, schema);
}

/**
 * Initialize all models for a connection
 * @param {mongoose.Connection} connection - Database connection
 * @returns {Object} - Object containing all models
 */
export function initializeAllModels(connection) {
    const models = {};
    
    for (const [modelName, { schema }] of Object.entries(MODEL_REGISTRY)) {
        try {
            models[modelName] = getModelForConnection(connection, modelName);
        } catch (error) {
            console.warn(`Warning: Could not initialize model '${modelName}':`, error.message);
        }
    }
    
    return models;
}

/**
 * Get available model names
 * @returns {string[]} - Array of model names
 */
export function getAvailableModels() {
    return Object.keys(MODEL_REGISTRY);
}

/**
 * Check if a model exists in the registry
 * @param {string} modelName - Name of the model
 * @returns {boolean} - True if model exists
 */
export function modelExists(modelName) {
    return MODEL_REGISTRY.hasOwnProperty(modelName);
}

/**
 * Safe model getter - returns null if model doesn't exist
 * @param {mongoose.Connection} connection - Database connection
 * @param {string} modelName - Name of the model
 * @returns {mongoose.Model|null} - Model instance or null
 */
export function safeGetModel(connection, modelName) {
    try {
        return getModelForConnection(connection, modelName);
    } catch (error) {
        console.warn(`Model '${modelName}' not available:`, error.message);
        return null;
    }
}

export default {
    MODEL_REGISTRY,
    getModelForConnection,
    initializeAllModels,
    getAvailableModels,
    modelExists,
    safeGetModel
};