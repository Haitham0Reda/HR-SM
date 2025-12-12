/**
 * useFormValidation Hook
 * 
 * Custom hook for managing form validation state and errors
 * Provides utilities for setting, clearing, and displaying validation errors
 * 
 * Usage:
 * const { errors, setError, clearError, clearAllErrors, hasError } = useFormValidation();
 */

import { useState, useCallback } from 'react';

const useFormValidation = (initialErrors = {}) => {
    const [errors, setErrorsState] = useState(initialErrors);

    /**
     * Set an error for a specific field
     * @param {string} field - Field name
     * @param {string} message - Error message
     */
    const setError = useCallback((field, message) => {
        setErrorsState(prev => ({
            ...prev,
            [field]: message
        }));
    }, []);

    /**
     * Set multiple errors at once
     * @param {Object} errorObj - Object with field names as keys and error messages as values
     */
    const setErrors = useCallback((errorObj) => {
        setErrorsState(prev => ({
            ...prev,
            ...errorObj
        }));
    }, []);

    /**
     * Clear error for a specific field
     * @param {string} field - Field name
     */
    const clearError = useCallback((field) => {
        setErrorsState(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    }, []);

    /**
     * Clear all errors
     */
    const clearAllErrors = useCallback(() => {
        setErrorsState({});
    }, []);

    /**
     * Check if a specific field has an error
     * @param {string} field - Field name
     * @returns {boolean}
     */
    const hasError = useCallback((field) => {
        return !!errors[field];
    }, [errors]);

    /**
     * Get error message for a specific field
     * @param {string} field - Field name
     * @returns {string|undefined}
     */
    const getError = useCallback((field) => {
        return errors[field];
    }, [errors]);

    /**
     * Check if there are any errors
     * @returns {boolean}
     */
    const hasAnyError = useCallback(() => {
        return Object.keys(errors).length > 0;
    }, [errors]);

    /**
     * Validate a field with a validation function
     * @param {string} field - Field name
     * @param {any} value - Field value
     * @param {Function} validator - Validation function that returns error message or null
     */
    const validateField = useCallback((field, value, validator) => {
        const errorMessage = validator(value);
        if (errorMessage) {
            setError(field, errorMessage);
            return false;
        } else {
            clearError(field);
            return true;
        }
    }, [setError, clearError]);

    /**
     * Parse and set errors from API response
     * Handles both single error messages and field-specific errors
     * @param {Object} error - Error object from API
     */
    const setApiErrors = useCallback((error) => {
        if (error.data?.errors) {
            // Field-specific errors
            setErrors(error.data.errors);
        } else if (error.data?.details) {
            // Details object with field errors
            setErrors(error.data.details);
        } else if (error.message) {
            // General error message
            setError('general', error.message);
        }
    }, [setError]);

    return {
        errors,
        setError,
        setErrors,
        clearError,
        clearAllErrors,
        hasError,
        getError,
        hasAnyError,
        validateField,
        setApiErrors
    };
};

export default useFormValidation;
