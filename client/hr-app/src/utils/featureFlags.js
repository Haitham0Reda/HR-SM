/**
 * Feature Flags Utility
 * 
 * This utility manages feature flags for enabling/disabling modules
 * in the frontend based on backend configuration.
 */

import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Get feature flags from backend
 * @returns {Promise<object>} Feature flags object
 */
export const getFeatureFlags = async () => {
    try {
        const token = getAuthToken();
        const response = await axios.get(`${API_BASE_URL}/feature-flags`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch feature flags:', error);
        // Return default feature flags if API call fails
        return getDefaultFeatureFlags();
    }
};

/**
 * Get default feature flags
 * @returns {object} Default feature flags
 */
export const getDefaultFeatureFlags = () => {
    return {
        // Core HR module - always enabled
        hrCore: {
            enabled: true,
            description: 'Core HR functionality (authentication, user management, etc.)',
            required: true
        },

        // Sellable modules
        attendance: {
            enabled: true,
            description: 'Attendance & Time Tracking module'
        },

        leave: {
            enabled: true,
            description: 'Leave & Permission Management module'
        },

        payroll: {
            enabled: true,
            description: 'Payroll Management module'
        },

        documents: {
            enabled: true,
            description: 'Document Management module'
        },

        communication: {
            enabled: true,
            description: 'Communication & Notifications module'
        },

        reporting: {
            enabled: true,
            description: 'Reporting & Analytics module'
        },

        tasks: {
            enabled: true,
            description: 'Task & Work Reporting module'
        },

        // Advanced features
        advancedScheduling: {
            enabled: false,
            description: 'Advanced scheduling features'
        },

        aiAnalytics: {
            enabled: false,
            description: 'AI-powered analytics'
        }
    };
};

/**
 * Check if a feature is enabled
 * @param {string} feature - Feature name to check
 * @param {object} featureFlags - Feature flags object (optional)
 * @returns {boolean} Whether feature is enabled
 */
export const isFeatureEnabled = (feature, featureFlags = null) => {
    // If featureFlags not provided, use default
    if (!featureFlags) {
        featureFlags = getDefaultFeatureFlags();
    }

    // Core HR features are always enabled
    if (featureFlags[feature]?.required) {
        return true;
    }

    return featureFlags[feature]?.enabled || false;
};

/**
 * Feature flag hook for React components
 * @returns {object} Feature flags and helper functions
 */
export const useFeatureFlags = () => {
    // In a real implementation, this would use React hooks to manage state
    // For now, we'll just return the utility functions

    return {
        getFeatureFlags,
        isFeatureEnabled
    };
};

export default {
    getFeatureFlags,
    getDefaultFeatureFlags,
    isFeatureEnabled,
    useFeatureFlags
};