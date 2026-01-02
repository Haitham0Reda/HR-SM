/**
 * Accessibility Utilities
 * 
 * Helper functions to ensure proper accessibility in forms and components
 */

/**
 * Generates a unique ID for form fields to ensure proper label association
 * @param {string} prefix - A descriptive prefix for the ID
 * @param {string} fieldName - The field name or identifier
 * @returns {string} A unique ID string
 */
export const generateFieldId = (prefix, fieldName) => {
    return `${prefix}-${fieldName}`.toLowerCase().replace(/\s+/g, '-');
};

/**
 * Creates proper props for TextField components to ensure accessibility
 * @param {string} id - The unique ID for the field
 * @param {string} label - The label text
 * @param {Object} additionalProps - Any additional props to merge
 * @returns {Object} Props object with proper accessibility attributes
 */
export const createAccessibleTextFieldProps = (id, label, additionalProps = {}) => {
    return {
        id,
        label,
        'aria-label': label,
        'aria-describedby': additionalProps.helperText ? `${id}-helper-text` : undefined,
        ...additionalProps
    };
};

/**
 * Accessibility checklist for forms:
 * 
 * 1. ✅ All TextField components should have unique `id` attributes
 * 2. ✅ Labels should be properly associated with form controls
 * 3. ✅ Use `aria-label` for additional context when needed
 * 4. ✅ Use `aria-describedby` to associate helper text with fields
 * 5. ✅ Ensure proper tab order with `tabIndex` if needed
 * 6. ✅ Use semantic HTML elements (form, fieldset, legend)
 * 7. ✅ Provide clear error messages with `aria-invalid` and `aria-describedby`
 * 8. ✅ Use `required` attribute for mandatory fields
 * 9. ✅ Ensure sufficient color contrast for text and backgrounds
 * 10. ✅ Test with screen readers and keyboard navigation
 */

/**
 * Common ID prefixes for different page types
 */
export const ID_PREFIXES = {
    LOGIN: 'login',
    REGISTER: 'register',
    PROFILE: 'profile',
    CREATE_USER: 'create-user',
    EDIT_USER: 'edit-user',
    VACATION: 'vacation',
    EDIT_VACATION: 'edit-vacation',
    FORGOT_PASSWORD: 'forgot-password',
    RESET_PASSWORD: 'reset-password',
    DEPARTMENT: 'department',
    POSITION: 'position',
    DOCUMENT: 'document',
    EVENT: 'event',
    ANNOUNCEMENT: 'announcement'
};

/**
 * Example usage:
 * 
 * import { generateFieldId, createAccessibleTextFieldProps, ID_PREFIXES } from '../utils/accessibility';
 * 
 * // In your component:
 * const emailFieldProps = createAccessibleTextFieldProps(
 *     generateFieldId(ID_PREFIXES.LOGIN, 'email'),
 *     'Email Address',
 *     { type: 'email', required: true }
 * );
 * 
 * <TextField {...emailFieldProps} />
 */