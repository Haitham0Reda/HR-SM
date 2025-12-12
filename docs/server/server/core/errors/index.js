/**
 * Core Errors Module
 * 
 * Central exports for error handling
 */

import AppErrorClass from './AppError.js';
import { ERROR_TYPES, PLATFORM_ERRORS, TENANT_ERRORS, MODULE_ERRORS, AUTH_ERRORS, VALIDATION_ERRORS, GENERAL_ERRORS } from './errorTypes.js';
import { errorHandler, notFound, catchAsync } from './errorHandler.js';

export { AppErrorClass as AppError };
export { ERROR_TYPES, PLATFORM_ERRORS, TENANT_ERRORS, MODULE_ERRORS, AUTH_ERRORS, VALIDATION_ERRORS, GENERAL_ERRORS };
export { errorHandler, notFound, catchAsync };

export default {
    AppError: AppErrorClass,
    ERROR_TYPES,
    errorHandler,
    notFound,
    catchAsync
};
