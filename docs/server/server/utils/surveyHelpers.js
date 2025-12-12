/**
 * Survey Helper Utilities
 * 
 * Shared utility functions for survey operations
 */
import User from '../modules/hr-core/users/models/user.model.js';

/**
 * Get users assigned to a survey
 * @param {Object} survey - Survey document
 * @param {Object} options - Options for user selection
 * @param {String} options.select - Fields to select (default: '_id username email profile')
 * @returns {Promise<Array>} - Array of user documents
 */
export async function getAssignedUsers(survey, options = {}) {
    const selectFields = options.select || '_id username email profile';
    let query = { isActive: true };

    if (survey.assignedTo.allEmployees) {
        return await User.find(query).select(selectFields);
    }

    const filters = [];

    if (survey.assignedTo.specificEmployees?.length > 0) {
        filters.push({ _id: { $in: survey.assignedTo.specificEmployees } });
    }

    if (survey.assignedTo.departments?.length > 0) {
        filters.push({ department: { $in: survey.assignedTo.departments } });
    }

    if (survey.assignedTo.roles?.length > 0) {
        filters.push({ role: { $in: survey.assignedTo.roles } });
    }

    // If no filters are specified, return an empty array
    if (filters.length === 0) {
        return [];
    }

    query.$or = filters;
    return await User.find(query).select(selectFields);
}

/**
 * Calculate total number of assigned users
 * @param {Object} survey - Survey document
 * @returns {Promise<Number>} - Count of assigned users
 */
export async function calculateTotalAssigned(survey) {
    let count = 0;

    if (survey.assignedTo.allEmployees) {
        count = await User.countDocuments({ isActive: true });
    } else {
        const query = { isActive: true, $or: [] };

        if (survey.assignedTo.specificEmployees?.length > 0) {
            query.$or.push({ _id: { $in: survey.assignedTo.specificEmployees } });
        }

        if (survey.assignedTo.departments?.length > 0) {
            query.$or.push({ department: { $in: survey.assignedTo.departments } });
        }

        if (survey.assignedTo.roles?.length > 0) {
            query.$or.push({ role: { $in: survey.assignedTo.roles } });
        }

        if (query.$or.length > 0) {
            count = await User.countDocuments(query);
        }
    }

    return count;
}

/**
 * Convert data to CSV format
 * @param {Array} data - Array of objects to convert
 * @returns {String} - CSV formatted string
 */
export function convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(',')
        )
    ].join('\n');

    return csv;
}

export default {
    getAssignedUsers,
    calculateTotalAssigned,
    convertToCSV
};
